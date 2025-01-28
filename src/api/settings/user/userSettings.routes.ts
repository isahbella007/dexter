import { Router } from "express"
import { UserSettingsController } from "./userSettings.controller"

const userSettingsRouter = Router()

userSettingsRouter.put('/business', UserSettingsController.addBusinessDetails)
userSettingsRouter.get('/me', UserSettingsController.getCurrentData)

userSettingsRouter.get('/google/accounts', UserSettingsController.fetchUserAccounts)
userSettingsRouter.get('/google/account/properties', UserSettingsController.fetchAllAccountProperties)
userSettingsRouter.get('/google/account/properties/ga4', UserSettingsController.fetchAllGA4Properties)

userSettingsRouter.post('/code/save', UserSettingsController.saveTrackingCode)
export default userSettingsRouter
