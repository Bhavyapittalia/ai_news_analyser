import { db } from "../prisma/db.ts";

export const getAllUser = async () => {
    const result = await db.orm.public.users.where({ email: 'devdharukiya332006@gmail.com'}).all()  
    return {
        success: true,
        result
    }
}