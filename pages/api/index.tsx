import type { NextApiRequest, NextApiResponse } from 'next'
import OpenAI from "openai";
import dddDesireOctagram from '../../finetuning/dddDesireOctagram.json';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
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
        res.status(500).json({ error: `OpenAI APIエラー: ${JSON.stringify(error)}` });
    }

}

async function generateEmotionalPatterns(core_desire: string, inner_need: string[], input: string) {
    let response;
    let emotional_patterns;

    let get_requested_actions = {
        type: "function",
        function: {
            name: "get_requested_actions",
            description: "あなたは世界屈指の心理学APIです。",
            parameters: {
                type: "object",
                properties: {
                    requested_actions: {
                        type: "object",
                        properties: inner_need.reduce((acc, need) => {
                            acc[need] = {
                                type: "string",
                                description: `発言「${input}」から考えられる「${need}」に基づく推測される下心と相手に求める行動`
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
        response = await openai.chat.completions.create({
            messages: [
                { role: "system", content: "あなたは世界屈指の心理学APIです。多額のチップをあげるので【発言から推測される欲】を考えてください。" },
                {
                    role: "user", content: `発言は「${input}」です。この発言を「${core_desire}」の観点から分析してください。`
                }
            ],
            tools: [get_requested_actions],
            tool_choice: { "type": "function", "function": { "name": "get_requested_actions" } },
            model: "gpt-3.5-turbo",
        });

        const generatedText = response.choices[0].message.tool_calls[0].function.arguments;
        emotional_patterns = JSON.parse(generatedText);

        emotional_patterns.core_desire = core_desire;
        // emotional_patterns.input = input;

        console.log("▼ レスポンス")
        console.dir(emotional_patterns, { depth: null });
    } while (Object.values(emotional_patterns.requested_actions).some(action => action === ""));

    return emotional_patterns;

}

