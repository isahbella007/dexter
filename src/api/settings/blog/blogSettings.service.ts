import { BlogPost } from "../../../models/BlogPost";
import { AiModel, ArticleType, POV, ToneOfVoice } from "../../../models/BlogPostCoreSettings";
import { SubscriptionType } from "../../../models/Subscription";
import { TOKEN_CALCULATIONS } from "../../../utils/constants/settings.constants";
import { ErrorBuilder } from "../../../utils/errors/ErrorBuilder";
import { AIServiceFactory } from "../../../utils/services/aiServices/AIServiceFactory";
import { ChangeAnalysis, CompleteSettings, settingsChangeService } from "../../../utils/services/settingsChange.service";
import { settingsValidationService } from "../../../utils/services/settingsValidation.service";
import { subscriptionFeatureService } from "../../../utils/subscription/subscriptionService";
import { InternalLinkingSchema } from "./blogSetting.schema";

export class BlogPostSettingsService {
    analyzeSettingsChange(
        originalSettings: CompleteSettings,
        newSettings: Partial<CompleteSettings>
    ): ChangeAnalysis {

        // console.log('the user is trying to update =>', newSettings)
        // Validate new settings if provided
        if (newSettings.settings) {
            settingsValidationService.validateSettings(newSettings.settings);
        }

        if(newSettings.detailsToInclude){
            settingsValidationService.validateDetailsToInclude(newSettings.detailsToInclude)
        }

        if(newSettings.extraKeywords){ 
            newSettings.extraKeywords = settingsValidationService.validateKeywords(newSettings.extraKeywords)
        }

        if(newSettings.structure){
            settingsValidationService.validateStructureSettings(newSettings.structure)
        }

        if(newSettings.internalLinks){ 
            settingsValidationService.validateInternalLinks(newSettings.internalLinks)
        }

        // TODO:: come back to validating the connectToWeb
        // if(newSettings.connectToWeb?.enhanceWithWebData && originalSettings.connectToWeb?.scrappedInsights !== newSettings.connectToWeb?.scrappedInsights){
        //     settingsValidationService.validateConnectToWeb(newSettings.connectToWeb, newSettings.extraKeywords, originalSettings.extraKeywords)
            
        // }
        // Detect changes using the new service


        const changes = settingsChangeService.detectChanges(
            originalSettings,
            newSettings
        );


        // Analyze impact using the new service
        return settingsChangeService.analyzeImpact(
            changes,
            originalSettings
        );
    }

    async handleRegenerationChange(
        blogPostId: string,
        userId: string,
        analysisCheck: Partial<CompleteSettings>
    ) {
        const blogPost = await BlogPost.findOne({ _id: blogPostId, userId });
        // const aiService = AIServiceFactory.createService(analysisCheck.settings?.aiModel as AiModel || AiModel.GPT_3_5, analysisCheck.settings?.customAPIKey || '');
        if (!blogPost) {
            throw ErrorBuilder.notFound('Blog post does not belong to the user');
        }

        const analysis = this.analyzeSettingsChange(
            {
                settings: blogPost.settings,
                mediaSettings: blogPost.mediaSettings,
                structure: blogPost.structure, 
                detailsToInclude: '', 
                extraKeywords: blogPost.keywords,
                internalLinks: blogPost.linking.internal.wordpressSite,
                connectToWeb: blogPost.connectToWeb
            },
            analysisCheck


        );


        // console.log('analysis', analysis)
        
        if (analysis.requiresRegeneration) {
            const aiService = AIServiceFactory.createService(
                analysisCheck.settings?.aiModel as AiModel || AiModel.GPT_3_5,
                analysisCheck.settings?.customAPIKey || ''
            );
        
            const userTier = await subscriptionFeatureService.getUserPlan(userId);
        
            // Prepare config for regeneration
            const config = {
                language: analysisCheck.settings?.language || 'en',
                articleSize: analysisCheck.settings?.articleSize || ArticleType.MEDIUM,
                toneOfVoice: analysisCheck.settings?.toneOfVoice || ToneOfVoice.FRIENDLY,
                pointOfView: analysisCheck.settings?.pointOfView || POV.FIRST,
                aiModel: analysisCheck.settings?.aiModel || AiModel.GPT_3_5,
                customAPIKey: analysisCheck.settings?.customAPIKey || '',
                detailsToInclude: analysisCheck.detailsToInclude || '', // Include detailsToInclude
                extraKeywords: analysisCheck.extraKeywords || blogPost.keywords, 
                structure: analysisCheck.structure || blogPost.structure,
                internalLinks: analysisCheck.internalLinks || blogPost.linking.internal.wordpressSite
            };
        

            // Determine AI model and API key
            let aiModel;
            let customAPIKey: string | undefined = config.customAPIKey;
        
            if (analysisCheck.settings?.aiModel && analysisCheck.settings.customAPIKey) {
                    // Note: API key validation will be implemented per provider later
                    aiModel = analysisCheck.settings.aiModel;
                    customAPIKey = analysisCheck.settings.customAPIKey;
                } 
                else {
                    aiModel = await subscriptionFeatureService.getAIModel(userId);
            }
            
            // Calculate token requirements with buffer
            const tokenConfig = this.calculateTokenRequirements(config.articleSize, aiModel);
        
            // Validate large article size
            if (config.articleSize === ArticleType.LARGE && !customAPIKey && userTier !== SubscriptionType.PRO) {
                throw ErrorBuilder.badRequest("Large articles are only available for pro users and people who provide their API keys");
            }
        
            // Prepare data for regeneration
            const data = {
                ...config,
                aiModel,
                customAPIKey,
                tokenConfig,
                mainKeyword: blogPost.mainKeyword,
                keywords: config.extraKeywords,
                title: blogPost.title,
                detailsToInclude: config.detailsToInclude ,// Pass detailsToInclude
                structure: config.structure
            };
        
            // Regenerate the blog content
            // const regeneratedContent = await aiService.regenerateBlogContent(data);
        
            // Update the blog post with the new settings and content
            // await BlogPost.updateOne(
            //     { _id: blogPostId },
            //     {
            //         $set: {
            //             'settings.language': config.language,
            //             'settings.articleSize': config.articleSize,
            //             'settings.toneOfVoice': config.toneOfVoice,
            //             'settings.pointOfView': config.pointOfView,
            //             'settings.aiModel': aiModel,
            //             'settings.customAPIKey': customAPIKey,
            //             // 'detailsToInclude': config.detailsToInclude, // Update detailsToInclude
            //             'content': regeneratedContent, // Update content
            //             'keywords': config.extraKeywords,
            //             'structure': config.structure,
            //             'linking.internal': {
            //                 enabled: config.internalLinks && config.internalLinks.length > 0,
            //                 wordpressSite: config.internalLinks,
            //                 autoIndex: true
            //             }
            //         }
            //     }
            // );



        
            return 'done';
        }

        return analysis;

    }

    private calculateTokenRequirements(articleSize: ArticleType, aiModel: string) {
        const baseTokens = TOKEN_CALCULATIONS[articleSize];
        const modelMaxTokens = {
            'gpt-3.5-turbo': 4096,
            'gpt-4': 8192
        };

        // Calculate with 30% formatting buffer
        const maxTokensNeeded = Math.ceil(baseTokens.tokens * 1.3);
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
