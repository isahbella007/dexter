import { openai } from "../../config/openai";
import { SYSTEM_PROMPT } from "../../constant/systemPrompt";
import { Chat } from "../../models/Chat";
import { ChatCompletionMessageParam } from 'openai/resources/chat';
import { ErrorBuilder } from "../../utils/errors/ErrorBuilder";
import { dateUtils } from "../../utils/helpers/date";
import { subscriptionFeatureService } from "../../utils/subscription/subscriptionService";
import { ChatShare } from "../../models/ChatShare";
import { config } from "../../config";
import crypto from 'crypto';

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
            // const title = await this.generateChatTitle(message)
            const title = "Testing without title"
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
        // const aiResponse = completion.choices[0].message.content || 'Something went wrong'

        // dummy response 
        const aiResponse = "This is a dummy response to manage tokens "
        chat.messages.push({
            role: 'assistant',
            content: aiResponse,
            timestamp: dateUtils.getCurrentUTCDate()
        })

        chat.lastUpdated = dateUtils.getCurrentUTCDate()
        await chat.save()

        const remainingUsage = await subscriptionFeatureService.incrementUsage(userId, visitorId)
        // Return only the latest message for immediate display
        return { 
            chatId: chat._id,
            chatTitle: chat.title,
            latestMessage: {
                role: 'assistant',
                message: message,
                content: aiResponse,
                timestamp: chat.messages[chat.messages.length - 1].timestamp
            }, 
            usage: {
                dailyUsage: remainingUsage,
                dailyLimit: canUseDexterAI.dailyLimit
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

    async archiveChat(chatId: string, userId: string): Promise<void> {
        const chat = await Chat.findOne({ _id: chatId, userId });
        if (!chat) {
            throw ErrorBuilder.notFound('Chat not found');
        }
        
        chat.isArchived = true;
        chat.archivedAt = new Date();
        await chat.save();
    }

    async archiveAllChats(userId: string): Promise<void> {
        const now = new Date();
        await Chat.updateMany(
            { userId, isArchived: false },
            { 
                $set: { 
                    isArchived: true,
                    archivedAt: now
                }
            }
        );
    }

    async restoreArchivedChats(userId: string): Promise<void> {
        const now = new Date();
        await Chat.updateMany(
            { userId, isArchived: true },
            { 
                $set: { 
                    isArchived: false,
                    archivedAt: now
                }
            }
        );
    }

    async deleteAllChats(userId: string): Promise<void> {
        await Chat.deleteMany({ userId });
    }

    async exportChatData(userId: string, format: 'json' | 'csv' = 'json'): Promise<any> {
        const chats = await Chat.find({ userId })
            .sort({ createdAt: -1 });

        if (format === 'csv') {
            return this.convertChatsToCSV(chats);
        }

        return chats.map(chat => ({
            id: chat._id,
            title: chat.title,
            messages: chat.messages.map(msg => ({
                role: msg.role,
                content: msg.content,
                timestamp: msg.timestamp
            }))
        }));
    }

    async createShareLink(chatId: string, userId: string, expiresIn: number = 7): Promise<string> {
        const chat = await Chat.findOne({ _id: chatId, userId });
        if (!chat) {
            throw ErrorBuilder.notFound('Chat not found');
        }
    
        const shareToken = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + expiresIn);
    
        await ChatShare.create({
            chatId,
            userId,
            shareToken,
            expiresAt
        });
    
        return shareToken;
    }

    async getSharedChat(shareToken: string): Promise<any> {
        const share = await ChatShare.findOne({
            shareToken,
            expiresAt: { $gt: new Date() },
            isRevoked: false
        });
    
        if (!share) {
            throw ErrorBuilder.notFound('Shared chat not found or link expired');
        }
    
        share.accessCount += 1;
        await share.save();
    
        const chat = await Chat.findById(share.chatId);
        return chat;
    }

    async revokeShareLink(shareToken: string, userId: string): Promise<void> {
        const share = await ChatShare.findOne({ shareToken, userId });
        if (!share) {
            throw ErrorBuilder.notFound('Share link not found');
        }
    
        share.isRevoked = true;
        await share.save();
    }

    private convertChatsToCSV(chats: any[]): string {
        const headers = ['Chat ID', 'Title', 'Created At', 'Message Role', 'Message Content', 'Message Time'];
        const rows: any[][] = [];

        chats.forEach(chat => {
            chat.messages.forEach((msg: any) => {
                rows.push([
                    chat._id,
                    chat.title,
                    chat.lastUpdated,
                    msg.role,
                    msg.content,
                    msg.timestamp
                ]);
            });
        });

        return [headers, ...rows]
            .map(row => row.join(','))
            .join('\n');
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