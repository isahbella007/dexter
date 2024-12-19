import { Chat } from "../../models/Chat";
import { ErrorBuilder } from "../errors/ErrorBuilder";
import { handleError } from "../helpers/general";

export class MigrationService { 
    static async migrateVisitorChats(userId:string, visitorId:string, ipAddress:string){
        try{ 
            console.log('begin chat migrations')
            // find all chats with the visitorId
            const visitorChats = await Chat.find({ 
                $or: [
                    { visitorId },
                    { visitorIp: ipAddress }
                ]
            });
            console.log('visitor prev chat =>', visitorChats)

            // Update all chats to the new user
            await Chat.updateMany(
                { 
                    $or: [
                        { visitorId },
                        { visitorIp: ipAddress }
                    ]
                },
                { 
                    $set: { 
                        userId,
                        visitorId: null,
                        visitorIp: null
                    }
                }
            );

            // Clear visitor cookie in auth service
            return visitorChats.length;
        }catch(error){ 
            throw handleError(error, 'migrateService');
        }
    }
}