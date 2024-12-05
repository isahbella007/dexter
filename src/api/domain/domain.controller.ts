import { Request, Response } from 'express';
import { domainService } from './domain.service';
import { asyncHandler } from '../../utils/helpers/asyncHandler';
import { IUser } from '../../models/interfaces/UserInterface';
import { createDomainSchema } from './domain.schema';
import { ResponseFormatter } from '../../utils/errors/ResponseFormatter';
import { ErrorBuilder } from '../../utils/errors/ErrorBuilder';

export const domainController = { 
    createDomain: asyncHandler(async(req:Request, res:Response) => {
        const {value, error} = createDomainSchema.validate(req.body) 
        if(error) throw ErrorBuilder.badRequest(error.details[0].message)
        const domain = await domainService.createDomain((req.user as IUser)._id, value)
        ResponseFormatter.success(res, domain, 'Domain created successfully')
    }), 

    getAllDomain: asyncHandler(async(req:Request, res:Response) => { 
        const result = await domainService.getAllDomain((req.user as IUser)._id)
        ResponseFormatter.success(res, result, 'All domains')
    })
}