import { AppError } from "../../lib/errors.ts";
import { db } from "../../prisma/db.ts";

export const getAllUser = async () => {
    console.log("coming...")
    // const result = await db.orm.public.users.all()
    const result = await db.orm.public.users.all();

    console.log(result)

    if (result.length == 0) {
        console.log("length is 0")
        return {
            success: false
        }
    }
    console.log("coming ture...")
    return {
        success: true,
        result
    }
}