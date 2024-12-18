import { Router } from "express"
import userSettingsRouter from "./user/userSettings.routes"
import blogSettingsRouter from "./blog/blogSettings.routes"

const settingsRoutes = Router()

settingsRoutes.use('/user', userSettingsRouter)
settingsRoutes.use('/blog', blogSettingsRouter)

export default settingsRoutes