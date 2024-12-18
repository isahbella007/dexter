import { Router } from "express";
import { blogSettingsController } from "./blogSettings.controller";

const blogSettingsRouter = Router()

blogSettingsRouter.patch('/', blogSettingsController.updateSettings)
export default blogSettingsRouter