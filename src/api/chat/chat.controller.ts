import { Request, Response } from 'express';
import { chatService } from './chat.service';
import { asyncHandler } from '../../utils/helpers/asyncHandler';
import { generateResponseSchema, getChatDetailSchema } from './chat.schema';
import { ErrorBuilder } from '../../utils/errors/ErrorBuilder';
import { ResponseFormatter } from '../../utils/errors/ResponseFormatter';
import { IUser } from '../../models/interfaces/UserInterface';

export const chatController = {
    generateResponse: asyncHandler(async (req: Request, res: Response) => {
        const {value, error} = generateResponseSchema.validate(req.body)
        if(error) throw ErrorBuilder.badRequest(error.details[0].message)
        const {message, chatId} = value
    
        const user = req.user as IUser;
        const visitorId = (req as Express.Request & { visitor?: { id: string } }).visitor?.id;
        console.log('chat controller =>', (req.user as IUser)._id)
        const response = await chatService.generateResponse(message, chatId, user._id, visitorId)
        ResponseFormatter.success(res, response, 'Response generated successfully')
    }), 
    
    getChatHistory: asyncHandler(async (req: Request, res: Response) => {
        const user = req.user as IUser;
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;

        const chats = await chatService.getHistory(user._id, page, limit);
        ResponseFormatter.success(res, chats, 'Chat history retrieved successfully');
    }),

    getChatDetail: asyncHandler(async (req: Request, res: Response) => {
        const {value, error} = getChatDetailSchema.validate(req.query)
        if(error) throw ErrorBuilder.badRequest(error.details[0].message)

        const user = req.user as IUser;
        const visitorId = (req as Express.Request & { visitor?: { id: string } }).visitor?.id;
        const chatId  = req.query.chatId as string;

        const chat = await chatService.getChatDetail(chatId, user._id, visitorId);
        ResponseFormatter.success(res, chat, 'Chat details retrieved successfully');
    })
}
