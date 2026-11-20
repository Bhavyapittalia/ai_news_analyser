import "dotenv/config";

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
    GEMINI_KEY: stringNarrow("GEMINI_API_KEY"),
    GPT_KEY: stringNarrow("OPENAI_API_KEY"),
    PUTER_TOKEN: stringNarrow("PUTER_AUTH_TOKEN")
} 


