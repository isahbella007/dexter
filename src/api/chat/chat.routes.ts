import { Router } from "express";
import { chatController } from "./chat.controller";
import { authenticate } from "../../middleware/auth.middleware";
import { chatAuth } from "../../middleware/chat.middleware";
const chatRoutes = Router()

chatRoutes.post('/message', chatAuth, chatController.generateResponse)
chatRoutes.get('/history', authenticate, chatController.getChatHistory)
chatRoutes.get('/detail', chatAuth, chatController.getChatDetail)

chatRoutes.post('/archive', authenticate, chatController.archiveChat);
chatRoutes.post('/archive-all', authenticate, chatController.archiveAllChats);
chatRoutes.post('/restore-all', authenticate, chatController.restoreArchivedChats);
chatRoutes.delete('/delete-all', authenticate, chatController.deleteAllChats);

chatRoutes.get('/export', authenticate, chatController.exportChatData);

chatRoutes.post('/share', authenticate, chatController.createShareLink);
chatRoutes.get('/share', chatController.getSharedChat);
chatRoutes.post('/revoke', authenticate, chatController.revokeShareLink);

export default chatRoutes