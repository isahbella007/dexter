import express, {Request, Response} from "express"
import { ResponseFormatter } from "../utils/errors/ResponseFormatter";
import subscriptionRoutes from "../api/subscription/subscription.routes";
import authRouter from "../api/auth/auth.route";
import { authenticate } from "../middleware/auth.middleware";
import chatRoutes from "../api/chat/chat.routes";
import blogPostRoutes from "../api/blog/blog.routes";
import settingsRoutes from "../api/settings";
import contactRoutes from "../api/contacts/contacts.routes";
import publishRoutes from "../api/publish/publish.routes";
import analyticsRouter from "../api/analytics/analytics.routes";
const router = express()

router.use('/auth', authRouter)
router.use('/subscription', authenticate, subscriptionRoutes)
router.use('/chat', chatRoutes)
router.use('/blog', authenticate, blogPostRoutes)
router.use('/settings', authenticate, settingsRoutes)
router.use('/contact', contactRoutes)
router.use('/publish', authenticate, publishRoutes)
router.use('/analytics', authenticate, analyticsRouter)

router.get('/health', (req: Request, res: Response) =>
    ResponseFormatter.success(res, 'Server is healthy', 'UP')
);
  
export default router;