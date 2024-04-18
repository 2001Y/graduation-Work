import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    const core_desire = req.query.core_desire as string;
    const input = req.query.input as string;

    if (!core_desire || !input) {
        res.status(400).json({ error: 'core_desireとinputパラメータが必要です' });
        return;
    }

    try {
        let generatedText: string;

        while (true) {
            const prompt = `You are an AI assistant specializing in emotional analysis. Please analyze the following input text from the perspective of "${core_desire}", and infer the inner need and requested action.

            Input: ${input}
            Respond JSON: {
            inner_need: {推測される内なる欲求}
            requested_action: {推測される求められる行動}
            }
`;

            const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
                    "HTTP-Referer": "https://2001y.me", // Optional, for including your app on openrouter.ai rankings.
                    "X-Title": "2001Y", // Optional. Shows in rankings on openrouter.ai.
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    "model": "anthropic/claude-3-sonnet-20240229",
                    // "model": "openai/gpt-3.5-turbo",
                    "max_tokens": 1024,
                    "messages": [
                        { "role": "user", "content": prompt },
                    ],
                })
            });
            const data = await response.json();
            generatedText = data.choices[0].message.content;

            try {
                const parsedText = JSON.parse(generatedText);
                if (parsedText.inner_need && parsedText.requested_action) {
                    break;
                }
            } catch (e) {
                // JSON parseに失敗した場合は再度リクエスト
            }
        }

        const emotional_patterns = {
            [core_desire]: JSON.parse(generatedText)
        };

        res.status(200).json({ emotional_patterns });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: `OpenRouter APIエラー: ${JSON.stringify(error)}` });
    }
}