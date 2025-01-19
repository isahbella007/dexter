import { Router } from "express"
import { publishController } from "./publish.controller"

const publishRoutes = Router()

publishRoutes.post('/schedule', publishController.schedulePost)
publishRoutes.post('/wordpress/refresh-sites', publishController.refreshWordPressSites)
publishRoutes.post('/wordpress', publishController.publishBlogPost)

publishRoutes.post('/shopify', publishController.publishShopifyPost)
export default publishRoutes