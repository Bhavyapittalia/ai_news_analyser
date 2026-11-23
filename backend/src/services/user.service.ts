import { db } from "../prisma/db.ts";

export const getAllUser = async () => {
    const result = await db.orm.public.users.where({ email: 'bhavya@gmail.com'}).all()  
    return {
        success: true,
        result
    }
}