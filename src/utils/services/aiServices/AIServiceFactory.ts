import { AiModel } from "../../../models/BlogPostCoreSettings";
import { BaseAIService } from "../../../models/interfaces/AIServiceInterfaces";
import { AnthropicService } from "./anthropicService";
import { OpenAIService } from "./openAIService";

export class AIServiceFactory {
    static createService(model: AiModel, apiKey?: string): BaseAIService {
        if (model.startsWith('claude')) {
            return new AnthropicService(apiKey);
        }
        return new OpenAIService();
    }
} 