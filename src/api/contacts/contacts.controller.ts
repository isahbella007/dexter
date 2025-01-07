import { Request, Response } from "express";
import { asyncHandler } from "../../utils/helpers/asyncHandler"
import { contactsService } from "./contacts.service";
import { ResponseFormatter } from "../../utils/errors/ResponseFormatter";

export const contactController={ 
    addContact: asyncHandler(async(req:Request, res:Response) => { 
        const {email} = req.body
        await contactsService.addContact(email)
        ResponseFormatter.success(res, 'Contact added successfully')
    })
}