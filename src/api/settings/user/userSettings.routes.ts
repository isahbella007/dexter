import { Router } from "express"
import { UserSettingsController } from "./userSettings.controller"

const userSettingsRouter = Router()

userSettingsRouter.put('/business', UserSettingsController.addBusinessDetails)

export default userSettingsRouter
