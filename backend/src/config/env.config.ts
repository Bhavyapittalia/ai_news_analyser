import { configDotenv } from "dotenv";

const stringNarrow = (variable: string): string => {

    const value = process.env[variable]

    if (!value) {
        throw new Error(`${variable} does not found in .env file`)
    }

    return value
}

const numberNarrow = (variable: string): number => {

    const value = process.env[variable]
        
    if (!value) {
        throw new Error(`${variable} does not found in .env file`)
    }

    return parseInt(value)
}

export const ALLENVS = {
    POSTGRES_USER: stringNarrow("DB_USER"),
    POSTGRES_HOST: stringNarrow("DB_HOST"),
    POSTGRES_NAME: stringNarrow("DB_NAME"),
    POSTGRES_PASSWORD: stringNarrow("DB_PASSWORD"),
    POSTGRES_PORT: numberNarrow("DB_PORT"),
    PUTER_TOKEN: stringNarrow("PUTER_AUTH_TOKEN"),
    PORT: numberNarrow("PORT"),
    DB_URL: stringNarrow("DB_URL"),
    NODE_ENV: stringNarrow("NODE_ENV")  
} 



// import 'dotenv/config';
// import { z } from 'zod';

// const schema = z.object({
//   NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
//   PORT: z.coerce.number().default(1000),
//   DATABASE_URL: z.string().min(1),
//   DB_PORT: z.number().default(3000),
//   INGEST_INTERVAL_MINUTES: z.coerce.number().default(5),
//   ALERT_MIN_IMPACT: z.coerce.number().default(70),
//   ALERT_MIN_CONFIDENCE: z.coerce.number().default(60),
// });

// export const ALLENVS = schema.parse(process.env);
