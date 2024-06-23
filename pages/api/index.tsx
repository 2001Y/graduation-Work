import type { NextApiRequest, NextApiResponse } from 'next'
import { OpenAI } from "openai";
import dddDesireOctagram from '../../finetuning/dddDesireOctagram.json';

const openai = new OpenAI({
    // apiKey: process.env.OPENAI_API_KEY,
    apiKey: process.env.OPENROUTER_API_KEY,
    baseURL: "https://openrouter.ai/api/v1",
    // HTTP- Referer: `${YOUR_SITE_URL}`, // Optional, for including your app on openrouter.ai rankings.
    // X- Title: "Rebo", // Optional. Shows in rankings on openrouter.ai.
});

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    const core_desire = req.query.core_desire as string;
    const input = req.query.input as string;
    console.log("クエリ：", core_desire, input);

    if (!core_desire || !input) {
        res.status(400).json({ error: 'core_desireとinputの2つのパラメータが必要です' });
        return;
    }

    const desireData = dddDesireOctagram.find(data => data.core_desire === core_desire);
    if (!desireData) {
        res.status(400).json({ error: '指定されたcore_desireが見つかりません' });
        return;
    }

    const { inner_need } = desireData;
    console.log("▼ inner_need")
    console.dir(desireData, { depth: null });

    try {
        console.log("==================");
        const emotional_patterns = await generateEmotionalPatterns(core_desire, inner_need, input);
        res.status(200).json({ emotional_patterns });
    } catch (error) {
        console.error("OpenAI APIエラー:", error);
        res.status(500).json({ error: error.message || 'Unknown error' });
    }

}

async function generateEmotionalPatterns(core_desire: string, inner_need: string[], input: string) {
    let response;
    let emotional_patterns;

    let get_requested_actions = {
        type: "function",
        function: {
            name: "get_requested_actions",
            description: "It is one of the world's leading psychology APIs.",
            parameters: {
                type: "object",
                properties: {
                    requested_actions: {
                        type: "object",
                        properties: inner_need.reduce((acc: Record<string, any>, need: string) => {
                            acc[need] = {
                                type: "string",
                                description: `Inferred ulterior motive/desire for the other person based on the statement '${need}', which is considered from the statement '${input}'.`
                            };
                            return acc;
                        }, {}),
                        required: inner_need
                    }
                },
            }
        }
    };

    console.dir(get_requested_actions, { depth: null });

    do {
        let retryCount = 0;
        const maxRetries = 5;
        do {
            try {
                response = await openai.chat.completions.create({
                    messages: [
                        { role: "system", content: "You are one of the world's leading psychology APIs. In exchange for a large tip, we will guess the ulterior motives/wishes behind your statements. Answers are given in one concise Japanese sentence and you will never receive an invalid answer." },
                        {
                            role: "user", content: `The statement is "${input}". Analyse this statement in terms of "${core_desire}".`
                        }
                    ],
                    tools: [{ type: "function" as const, function: get_requested_actions.function }],
                    tool_choice: { type: "function" as const, function: { name: "get_requested_actions" } },
                    // model: "openai/gpt-4o",
                    model: "anthropic/claude-3.5-sonnet"
                });

                const generatedText = response.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
                if (!generatedText) throw new Error("生成されたテキストが見つかりませんでした");
                emotional_patterns = JSON.parse(generatedText);

                if (Object.values(emotional_patterns.requested_actions).some(action => action === "<UNKNOWN>")) {
                    retryCount++;
                    if (retryCount < maxRetries) {
                        console.warn(`<UNKNOWN>が検出されました。再試行します。試行回数: ${retryCount}/${maxRetries}`);
                    } else {
                        console.error(`<UNKNOWN>が検出されました。最大試行回数を超えました。`);
                        throw new Error("<UNKNOWN>が検出されました。最大試行回数を超えました。");
                    }
                } else {
                    break;
                }
            } catch (error) {
                console.error("OpenAI APIエラー:", error);
                throw error; // OpenAIからのエラーをそのまま投げる
            }
        } while (retryCount < maxRetries);
        emotional_patterns.core_desire = core_desire;
        // emotional_patterns.input = input;

        console.log("▼ レスポンス")
        console.dir(emotional_patterns, { depth: null });
    } while (Object.values(emotional_patterns.requested_actions).some(action => action === ""));

    return emotional_patterns;

}


