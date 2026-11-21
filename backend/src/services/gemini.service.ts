import { ALLENVS } from "../config/env.config.ts";
import {init} from '@heyputer/puter.js/src/init.cjs'



export const ai_analyses = async (headline: string) => {
    const prompt = `
    You are a Financial News Analytics.
    Analyze the following News Headline and provide a strict, concise response in valid JSON format only.
    
    Rules:
    1. "event": Provide the main event in very short understandble way.
    2. "gemini_confidence": Provide your confidence level in this assessment as a single label ("High", "Medium", "Low") with a brief 5-word maximum justification.
    3. "direct_effect": Must be strictly ONE word—either "Bullish" or "Bearish". Do not use "Neutral", "Mixed", or both.
    4. "direct_impact": State the most immediate, primary impact in 1-2 direct sentences.
    5. "reasoning": provide very short reasoning "why this can lead to this? in understandble way".
    
    Required "JSON Schema":
    {
        "event": "string",
        "gemini_confidence": "string",
        "direct_effect": "Bullish | Bearish",
        "direct_impact": "string",
        "reasoning": "string",
    }

    Provide me this three things in a JSON format ouput.
    Headline: ${headline}`;


    const client = init(ALLENVS.PUTER_TOKEN)

    const response = await client.ai.chat(prompt, {
        model: "gpt-4o-mini"
    })

    // console.log(response.message);

    // const db_result = await 

    console.log("normal", response.message)
    return response.message
}