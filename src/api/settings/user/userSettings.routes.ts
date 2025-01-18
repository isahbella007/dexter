import { Router } from "express"
import { UserSettingsController } from "./userSettings.controller"

const userSettingsRouter = Router()

userSettingsRouter.put('/business', UserSettingsController.addBusinessDetails)
userSettingsRouter.get('/me', UserSettingsController.getCurrentData)
export default userSettingsRouter
