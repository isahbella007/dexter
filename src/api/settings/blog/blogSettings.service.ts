import { BlogPost } from "../../../models/BlogPost";
import { AiModel, ArticleType, POV, ToneOfVoice } from "../../../models/BlogPostCoreSettings";
import { SubscriptionType } from "../../../models/Subscription";
import { TOKEN_CALCULATIONS } from "../../../utils/constants/settings.constants";
import { ErrorBuilder } from "../../../utils/errors/ErrorBuilder";
import { AIServiceFactory } from "../../../utils/services/aiServices/AIServiceFactory";
import { ChangeAnalysis, CompleteSettings, settingsChangeService } from "../../../utils/services/settingsChange.service";
import { settingsValidationService } from "../../../utils/services/settingsValidation.service";
import { subscriptionFeatureService } from "../../../utils/subscription/subscriptionService";

export class BlogPostSettingsService {
    analyzeSettingsChange(
        originalSettings: CompleteSettings,
        newSettings: Partial<CompleteSettings>
    ): ChangeAnalysis {
        // Validate new settings if provided
        if (newSettings.settings) {
            settingsValidationService.validateSettings(newSettings.settings);
        }

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
        const aiService = AIServiceFactory.createService(analysisCheck.settings?.aiModel as AiModel || AiModel.GPT_3_5, analysisCheck.settings?.customAPIKey || '');
        if (!blogPost) {
            throw ErrorBuilder.notFound('Blog post does not belong to the user');
        }

        const analysis = this.analyzeSettingsChange(
            {
                settings: blogPost.settings,
                mediaSettings: blogPost.mediaSettings,
                structure: blogPost.structure
            },
            analysisCheck
        );

        if (analysis.changeType === 'full') {
            // get user subscription plan
            const userTier = await subscriptionFeatureService.getUserPlan(userId);

            // if it is full, it means they want to change the content of the post
            const config = {
                language: analysisCheck.settings?.language || 'en',
                articleSize: analysisCheck.settings?.articleSize || ArticleType.MEDIUM,
                toneOfVoice: analysisCheck.settings?.toneOfVoice || ToneOfVoice.FRIENDLY,
                pointOfView: analysisCheck.settings?.pointOfView || POV.FIRST,
            };

            let aiModel;
            let customAPIKey: string | undefined;

            if (analysisCheck.settings?.aiModel && analysisCheck.settings.customAPIKey) {
                // Note: API key validation will be implemented per provider later
                aiModel = analysisCheck.settings.aiModel;
                customAPIKey = analysisCheck.settings.customAPIKey;
            } else {
                aiModel = await subscriptionFeatureService.getAIModel(userId);
            }

            // calculate token requirements with buffer
            const tokenConfig = this.calculateTokenRequirements(config.articleSize, aiModel);

            if (config.articleSize === ArticleType.LARGE && !customAPIKey && userTier !== SubscriptionType.PRO) {
                throw ErrorBuilder.badRequest("Large articles are only available for pro users and people who provide their API keys");
            }

            const data = {
                ...config,
                aiModel,
                customAPIKey,
                tokenConfig,
                mainKeyword: blogPost.mainKeyword,
                title: blogPost.title,
            };

            // Regenerate content with new configuration
            return await aiService.regenerateBlogContent(data);

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
