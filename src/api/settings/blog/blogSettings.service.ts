import { BlogPost } from "../../../models/BlogPost";
import { ArticleType, ArticleTypeMaxWords, POV, ToneOfVoice } from "../../../models/BlogPostCoreSettings";
import { IMediaSettings, IPostSettings, IStructureSettings } from "../../../models/interfaces/BlogPostInterfaces";
import { SubscriptionType } from "../../../models/Subscription";
import { ErrorBuilder } from "../../../utils/errors/ErrorBuilder";
import { openAIService } from "../../../utils/services/openAIService";
import { subscriptionFeatureService } from "../../../utils/subscription/subscriptionService";

type SettingsChangeType = 'full' | 'partial' | 'style' | 'none';

interface SettingsChangeAnalysis {
    changeType: SettingsChangeType;
    affectedSections?: string[];
    changes: {
        field: string;
        from: any;
        to: any;
    }[];
}

interface TokenLimits {
    small: { min: number; max: number; };
    medium: { min: number; max: number; };
    large: { min: number; max: number; };
}

export class BlogPostSettingsService {
    private readonly tokenLimits: TokenLimits = {
        small: { min: 1200, max: 1800 },    // ~2,340 tokens with formatting
        medium: { min: 2400, max: 3000 },   // ~3,900 tokens with formatting (adjusted down from 3600)
        large: { min: 4800, max: 6000 }     // ~7,800 tokens with formatting (adjusted down from 7200)
    };

    private fullRegenerationFields = [
        'settings.language',
        'settings.articleSize',
        'settings.toneOfVoice',
        'settings.pointOfView',
        'settings.aiModel',
        'settings.customAPIKey'
    ];

    private partialRegenerationFields = [
        'targetCountry',
        'structure.hook',
        'structure.conclusion'
    ];

    private styleOnlyFields = [
        'humanizeText',
        'structure.formatting',
        'structure.includeBold',
        'structure.includeItalics'
    ];

    analyzeSettingsChange(
        originalSettings: {
            settings?: IPostSettings,
            mediaSettings?: IMediaSettings,
            structure?: IStructureSettings
        },
        newSettings: {
            settings?: Partial<IPostSettings>,
            mediaSettings?: Partial<IMediaSettings>,
            structure?: Partial<IStructureSettings>
        }
    ): SettingsChangeAnalysis {
        const changes: { field: string; from: any; to: any; }[] = [];
        let highestImpact: SettingsChangeType = 'none';

        // Helper to check nested objects
        const compareSettings = (
            original: any,
            updated: any,
            prefix: string = ''
        ) => {
            if (!updated) return;

            Object.keys(updated).forEach(key => {
                const fullPath = prefix ? `${prefix}.${key}` : key;
                console.log(fullPath)
                
                if (original[key] !== updated[key]) {
                    changes.push({
                        field: fullPath,
                        from: original[key],
                        to: updated[key]
                    });

                    // Determine impact level
                    if (this.fullRegenerationFields.includes(fullPath)) {
                        highestImpact = 'full';
                    } else if (
                        highestImpact !== 'full' && 
                        this.partialRegenerationFields.includes(fullPath)
                    ) {
                        highestImpact = 'partial';
                    } else if (
                        highestImpact !== 'full' && 
                        highestImpact !== 'partial' && 
                        this.styleOnlyFields.includes(fullPath)
                    ) {
                        highestImpact = 'style';
                    }
                }
            });
        };

        // Compare each settings category
        compareSettings(originalSettings.settings || {}, newSettings.settings, 'settings');
        compareSettings(originalSettings.mediaSettings || {}, newSettings.mediaSettings, 'mediaSettings');
        compareSettings(originalSettings.structure || {}, newSettings.structure, 'structure');

        return {
            changeType: highestImpact,
            changes,
            affectedSections: this.getAffectedSections(changes)
        };
    }

    async handleRegenerationChange(blogPostId: string, userId: string, analysisCheck: {settings?: Partial<IPostSettings>, mediaSettings?: Partial<IMediaSettings>, structure?: Partial<IStructureSettings>}) {
        const blogPost = await BlogPost.findOne({ _id: blogPostId, userId });
        if (!blogPost) {
            throw ErrorBuilder.notFound('Blog post does not belong to the user');
        }

        const analysis = await this.analyzeSettingsChange({ settings: blogPost.settings,
            mediaSettings: blogPost.mediaSettings,
            structure: blogPost.structure}, analysisCheck)
            console.log(analysis)

        if (analysis.changeType === 'full') {
            // get user subscription plan
            const userTier = await subscriptionFeatureService.getUserPlan(userId)

            // if it is full, it means they want to change the content of the post. For now at least
            const config = { 
                language: analysisCheck.settings?.language || 'English',
                articleSize: analysisCheck.settings?.articleSize || ArticleType.MEDIUM,
                toneOfVoice: analysisCheck.settings?.toneOfVoice || ToneOfVoice.FRIENDLY,
                pointOfView: analysisCheck.settings?.pointOfView || POV.FIRST,
            }
            
            let aiModel
            let customAPIKey: string | undefined
            if(analysisCheck.settings?.aiModel && analysisCheck.settings.customAPIKey){
                try{ 
                    // TODO: check if the API key is valid
                    // await openAIService.validateAPIKey(
                    //     analysisCheck.settings.customAPIKey,
                    //     analysisCheck.settings.aiModel
                    // );
                }catch(error){ 
                    throw ErrorBuilder.badRequest("Invalid API key or model configuration")
                }
                aiModel = analysisCheck.settings.aiModel
                customAPIKey = analysisCheck.settings.customAPIKey
            }else{ 
                aiModel = await subscriptionFeatureService.getAIModel(userId)
            }

            // calculate token to use 
            const tokenConfig = this.calculateTokenRequirements(config.articleSize, aiModel)
            if(config.articleSize === ArticleType.LARGE && !customAPIKey && userTier !== SubscriptionType.PRO){ 
                throw ErrorBuilder.badRequest("Large articles are only available for pro users and people who provide their API keys")
            }
            const pointOfView = analysisCheck.settings?.pointOfView || POV.FIRST
            const data = { 
                ...config,
                aiModel,
                customAPIKey,
                tokenConfig,
                mainKeyword: blogPost.mainKeyword,
                title: blogPost.title,
            }
           // Regenerate content with new configuration
           const regeneratedContent = await openAIService.regenerateBlogContent(data);
           return regeneratedContent
        }
    }


    private getAffectedSections(changes: { field: string; from: any; to: any; }[]): string[] {
        // Logic to determine which sections need updating based on changes
        // This would be customized based on your content structure
        return changes
            .filter(change => change.field.startsWith('structure.'))
            .map(change => change.field.split('.')[1]);
    }

    private calculateTokenRequirements(articleSize: ArticleType, aiModel: string) {
        const baseTokens = this.tokenLimits[articleSize]
        const modelMaxTokens = {
            'gpt-3.5-turbo': 4096,
            'gpt-4': 8192
        };
    
        // Calculate with 30% formatting buffer
        const maxTokensNeeded = Math.ceil(baseTokens.max * 1.3);
        const modelLimit = modelMaxTokens[aiModel as keyof typeof modelMaxTokens] || 4096;

        // Ensure we don't exceed model limits
        const actualMaxTokens = Math.min(maxTokensNeeded, modelLimit - 300); // Reserve 300 tokens for system prompt

        return {
            minTokens: Math.ceil(baseTokens.min * 1.3),
            maxTokens: actualMaxTokens,
            totalTokens: actualMaxTokens
        };
    }
}

export const blogPostSettingsService = new BlogPostSettingsService();
