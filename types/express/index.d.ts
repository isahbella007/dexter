import { IUser } from "../../src/models/interfaces/UserInterface";

declare global {
    namespace Express {
        interface Request {
            user?: IUser; 
            visitor?: {
                id: string;
                isVisitor: boolean;
                ip: string;
            }
        }
    }
}
export {}; // Important: add this to make it a module