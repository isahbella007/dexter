import { Router } from "express";
import { blogSettingsController } from "./blogSettings.controller";

const blogSettingsRouter = Router()

blogSettingsRouter.patch('/', blogSettingsController.updateSettings)

blogSettingsRouter.get('/fetch-sites', blogSettingsController.fetchWordPressSites)
blogSettingsRouter.get('/fetch-posts', blogSettingsController.getWordPressPosts)
export default blogSettingsRouter