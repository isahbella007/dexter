// here we are going to add the admin user to the db. Auto generated 
import { User } from "../../models/User"
import bcrypt from 'bcrypt';
import { hashPassword } from "./passwordUtils";

export const insertAdminUser = async ()=> {
    // encrypt the password
    const {hash: passwordHash, salt} = await hashPassword('password1!')
    await User.create({
        name: 'Admin',
        email: 'admin@admin.com',
        password: passwordHash,
        role: 'admin'
    })
    console.log('Admin user inserted successfully')
}