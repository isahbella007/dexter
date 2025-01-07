import { Router } from "express";
import { contactController } from "./contacts.controller";

const contactRoutes = Router()

contactRoutes.post('/add', contactController.addContact)

export default contactRoutes
