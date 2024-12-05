import { openai } from "../../config/openai";
import { SYSTEM_PROMPT } from "../../constant/systemPrompt";
import { Chat } from "../../models/Chat";
import { ChatCompletionMessageParam } from 'openai/resources/chat';
import { ErrorBuilder } from "../../utils/errors/ErrorBuilder";
import { dateUtils } from "../../utils/helpers/date";
import { subscriptionFeatureService } from "../../utils/subscription/subscriptionService";

export class ChatService{ 
    

    async generateResponse(message: string, chatId?:string, userId?:string, visitorId?:string){ 
        // check the user usage limit
        console.log('chat service =>', userId)
        const canUseDexterAI = await subscriptionFeatureService.canUseDexterAI(userId, visitorId)
        if(!canUseDexterAI.canUseDexterAI){
            throw ErrorBuilder.forbidden(canUseDexterAI.message)
        }

        const model = await subscriptionFeatureService.getAIModel(userId, visitorId)

        let chat
        
        if(chatId){ 
            chat = await Chat.findById(chatId)
        }
        if(!chat){ 
            const title = await this.generateChatTitle(message)
            chat = await Chat.create({
                userId,
                visitorId,
                title,
                messages: []
            })
        }

        // add user message 
        chat.messages.push({
            role: 'user',
            content: message,
            timestamp: dateUtils.getCurrentUTCDate()
        })

        // generate response 
        const completion = await this.generateAIResponse(chat.messages.map(m => ({
            role: m.role,
            content: m.content
        })),
        model)

        // add ai response 
        const aiResponse = completion.choices[0].message.content || 'Something went wrong'
        chat.messages.push({
            role: 'assistant',
            content: aiResponse,
            timestamp: dateUtils.getCurrentUTCDate()
        })

        chat.lastUpdated = dateUtils.getCurrentUTCDate()
        await chat.save()

        await subscriptionFeatureService.incrementUsage(userId, visitorId)
        // Return only the latest message for immediate display
        return { 
            chatId: chat._id,
            chatTitle: chat.title,
            latestMessage: {
                role: 'assistant',
                content: aiResponse,
                timestamp: chat.messages[chat.messages.length - 1].timestamp
            }
        };
    }

    async getHistory(userId: string, page: number, limit: number){ 
        return Chat.find({ userId })
        .sort({ lastUpdated: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .select('-messages');
    }

    async getChatDetail(chatId: string, userId?: string, visitorId?: string){ 
        const chat = await Chat.findOne({
            _id: chatId,
            $or: [
                { userId },
                { visitorId }
            ]
        });
        
        if (!chat) {
            throw ErrorBuilder.notFound('Chat not found');
        }
        
        return chat;
    }
    // private methods 
    private async generateChatTitle(message: string): Promise<string> {
        try {
            const completion = await openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [
                    {
                        role: 'system',
                        content: SYSTEM_PROMPT.CHAT_TOPIC
                    },
                    {
                        role: 'user',
                        content: message
                    }
                ],
                max_tokens: 20,
                temperature: 0.3
            });
            return completion.choices[0].message?.content || 'New Chat';
        } catch (error) {
            return 'New Chat';
        }
    }

    private async generateAIResponse(messages: Array<{ role: string; content: string }>, model: string) {
        try {
            const formattedMessages: ChatCompletionMessageParam[] = [
                {
                    role: 'system',
                    content: SYSTEM_PROMPT.OPEN_AI
                },
                ...messages.map(m => ({
                    role: m.role as 'user' | 'assistant' | 'system',
                    content: m.content
                }))
            ];
    
            const completion = await openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: formattedMessages,
                max_tokens: 1000,
                temperature: 0.7
            });
            // max_tokens controls the maximum length of the AI's response
            // Setting it to 2000 ensures responses don't exceed ~1500 words
            // This is different from the user's input limit which we handle in the schema
            return completion;
        } catch (error) {
            console.error('OpenAI API Error:', error);
            throw ErrorBuilder.internal('Failed to generate AI response');
        }
    } 
}
export const chatService = new ChatService();