// const checkEnvs = (variable: any) => {

import { ALLENVS } from "./env.config.js";

//     const value = process.env[variable]

//     if (!value) {
//         return "undifined"
//     }

//     return value
// }

export const envValidation = () => {
    (() => {    
       const allEnvs = ['DB_HOST', 'DB_USER']
    
      allEnvs.map((envs) =>
        {
            console.log("checking all envs", process.env[envs])
            if (!process.env[envs]) {
                return `this ${envs} is not found or invalid Syntax`
            } 
        })
    
    })();
}