import express, {Request, Response} from "express"
import { ResponseFormatter } from "../utils/errors/ResponseFormatter";
import subscriptionRoutes from "../api/subscription/subscription.routes";
import authRouter from "../api/auth/auth.route";
import { authenticate } from "../middleware/auth.middleware";
import domainRoutes from "../api/domain/domain.routes";
import chatRoutes from "../api/chat/chat.routes";
const router = express()

router.use('/auth', authRouter)
router.use('/subscription', authenticate, subscriptionRoutes)
router.use('/domain', domainRoutes)
router.use('/chat', chatRoutes)

router.get('/health', (req: Request, res: Response) =>
    ResponseFormatter.success(res, 'Server is healthy', 'UP')
);
  
export default router;