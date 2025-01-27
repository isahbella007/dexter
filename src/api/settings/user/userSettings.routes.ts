import { Router } from "express"
import { UserSettingsController } from "./userSettings.controller"

const userSettingsRouter = Router()

userSettingsRouter.put('/business', UserSettingsController.addBusinessDetails)
userSettingsRouter.get('/me', UserSettingsController.getCurrentData)

userSettingsRouter.post('/google/ga4', UserSettingsController.fetchAllGA4Properties)
export default userSettingsRouter
