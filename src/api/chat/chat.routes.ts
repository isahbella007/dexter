import { Router } from "express";
import { chatController } from "./chat.controller";
import { authenticate } from "../../middleware/auth.middleware";
import { chatAuth } from "../../middleware/chat.middleware";
const chatRoutes = Router()

chatRoutes.post('/message', chatAuth, chatController.generateResponse)
chatRoutes.get('/history', authenticate, chatController.getChatHistory)
chatRoutes.get('/detail', chatAuth, chatController.getChatDetail)
export default chatRoutes