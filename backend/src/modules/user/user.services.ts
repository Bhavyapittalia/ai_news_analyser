import { db } from "../../prisma/db.ts";

export const getAllUser = async () => {
    try {
        console.log("coming...")
        const result =  db.orm.public.users.all()  
        console.log("coming...")
        return {
            success: true,
            result
        }
    }
    catch (error: any) {
        console.log("hii" ,error.message)
    }
}