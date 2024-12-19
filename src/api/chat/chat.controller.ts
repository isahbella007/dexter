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
    
        let user:IUser | null = null;
        let visitorId:string | undefined = undefined;

        // Modified visitor ID check
        if(req.user as IUser){ 
            user = req.user as IUser;
        } else {
            visitorId = (req as any).visitor?.id;
            if (!visitorId) {
                throw ErrorBuilder.badRequest('No visitor ID found. Please ensure cookies are enabled.');
            }
        }
        
        console.log('chat controller user =>', user?._id)
        console.log('chat controller visitorId =>', visitorId)
        const response = await chatService.generateResponse(message, chatId, user?._id, visitorId)
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

        let user:IUser | null = null;
        let visitorId:string | undefined = undefined;
        if(req.user as IUser){ 
            user = req.user as IUser;
        } else {
            visitorId = (req as any).visitor?.id;
            if (!visitorId) {
                throw ErrorBuilder.badRequest('No visitor ID found. Please ensure cookies are enabled.');
            }
        }
        
        const chatId  = req.query.chatId as string;

        const chat = await chatService.getChatDetail(chatId, user?._id, visitorId);
        ResponseFormatter.success(res, chat, 'Chat details retrieved successfully');
    }),

    archiveChat: asyncHandler(async (req: Request, res: Response) => {
        const chatId  = req.query.chatId as string;

        await chatService.archiveChat(chatId, (req.user as IUser)._id);
        ResponseFormatter.success(res, null, 'Chat archived successfully');
    }),

    archiveAllChats: asyncHandler(async (req: Request, res: Response) => {
        await chatService.archiveAllChats((req.user as IUser)._id);
        ResponseFormatter.success(res, null, 'All chats archived successfully');
    }),

    restoreArchivedChats: asyncHandler(async (req: Request, res: Response) => {
        await chatService.restoreArchivedChats((req.user as IUser)._id);
        ResponseFormatter.success(res, null, 'All chats restored successfully');
    }),

    deleteAllChats: asyncHandler(async (req: Request, res: Response) => {
        await chatService.deleteAllChats((req.user as IUser)._id);
        ResponseFormatter.success(res, null, 'All chats deleted successfully');
    }),

    exportChatData: asyncHandler(async (req: Request, res: Response) => {
        const format = 'csv';
        const data = await chatService.exportChatData((req.user as IUser)._id, format);
        // Set headers to prompt file download
        res.setHeader('Content-Disposition', 'attachment; filename="chats.csv"');
        res.setHeader('Content-Type', 'text/csv');

        res.send(data);
    }),

    createShareLink: asyncHandler(async (req: Request, res: Response) => {
        const chatId  = req.query.chatId as string;
        const expiresIn = parseInt(req.query.expiresIn as string) || 7;

        const shareToken = await chatService.createShareLink(chatId, (req.user as IUser)._id, expiresIn);
        ResponseFormatter.success(res, { shareToken }, 'Share link created successfully');
    }),

    getSharedChat: asyncHandler(async (req: Request, res: Response) => {
        const shareToken  = req.query.shareToken as string;

        const chat = await chatService.getSharedChat(shareToken);
        ResponseFormatter.success(res, chat, 'Shared chat retrieved successfully');
    }),

    revokeShareLink: asyncHandler(async (req: Request, res: Response) => {
        const shareToken  = req.query.shareToken as string;

        await chatService.revokeShareLink(shareToken, (req.user as IUser)._id);
        ResponseFormatter.success(res, null, 'Share link revoked successfully');
    })

}
