import { model, Schema } from "mongoose";
import bcrypt from 'bcrypt';

export interface IUser extends Document{ 
    _id: string;
    email: string;
    password: string;
    isEmailVerified: boolean;
    comparePassword(password:string): Promise<boolean>
}

const userSchema = new Schema<IUser>(
    { 
        email: {type: String, required: true, unique:true}, 
        password: {type:String, required: true},
        isEmailVerified: {type: Boolean, required: false, default: false}
    }
)

userSchema.methods.comparePassword = async function (password: string): Promise<boolean>{ 
    return bcrypt.compare(password, this.password)
}

export const User =  model<IUser>('User', userSchema)