import { Router } from "express";
import { domainController } from "./domain.controller";

const domainRoutes =  Router()

domainRoutes.post('/', domainController.createDomain)
domainRoutes.get('/', domainController.getAllDomain)

export default domainRoutes