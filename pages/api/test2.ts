// @ts-nocheck
import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const inputText = req.query.inputText as string;
  if (!inputText) {
    res.status(400).json({ error: 'inputText パラメータがありません' });
    return;
  }

  try {
    console.log(`Start: ${inputText}`)
    const output = await testOpenaiApiKeyOutputingJson(inputText);
    console.log(output)
    res.status(200).json(output);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'An error occurred' });
  }
}

async function testOpenaiApiKeyOutputingJson(inputText = "", retries = 2): Promise<any> {
  const systemPrompt = `
  心理学を用いて欲を見つけるAPI
  「${inputText}」という言葉に内包された抽象的な欲求を10件程度リストアップせよ
  
  # Constraints
  できるだけ短く言い切り形で、厳密にOutput Formatに従ってJSON出力せよ
  
  # Output Format
  { output:[{title:〇〇欲求,content:〇〇したい}] }
  
  # Reference
  1. ブッダの7つの欲
  食欲,睡眠欲,性欲,承認欲,生存欲,怠惰欲,感楽欲
  2. マズローの5段階欲
  生理的欲→安全欲→社会的欲→自己実現欲,承認欲→自己超越欲
  3. ヘンリー・マレーの欲
  生理的欲(臓器発生的欲),摂取欲(吸気欲,飲水欲,食物欲,感性欲),排泄欲(呼気欲,排泄欲,性的欲,授乳欲),回避欲(暑熱回避欲,寒冷回避欲,毒性回避欲,障害回避欲),社会的欲(心理発生的欲),優越支配欲(自尊欲,競争欲,優越欲,攻撃欲,反発欲),流行欲,自己顕示欲,指導欲,名誉欲,支配欲,権力欲,情的支配欲(愛情欲,恋愛欲,愉楽欲,自由欲,自己表現欲,不満解消欲),積極的活動欲(達成欲,内罰欲,自己成長欲,持続欲,自己実現欲,知識欲,自己主張欲,批判欲,趣味欲,感性欲,理解欲,他者認知欲,好奇欲),関係形成欲(秩序欲,援助欲,集団貢献欲,社会貢献欲,教授欲,自己認知欲,承認欲),自己開示,保身的回避需(屈辱回避需, 同調回避需,嫌悪回避需,批判回避需,服従回避需,優位回避需,譲歩回避需,安心回避需,気楽回避需,挑戦回避需,安全回避需,拒否回避需,金銭回避需,生活安定回避需),協調性に関する欲(依存協調需,親和協調需,協力協調需,孤立協調需,恭順協調需,自己規制協調需,迷惑回避協調需)
`;

  const messages = [
    { "role": "system", "content": systemPrompt }
  ]

  const options = {
    "method": "post",
    "headers": {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + process.env.OPENAI_APIKEY
    },
    "body": JSON.stringify({
      "model": "gpt-3.5-turbo",
      "messages": messages
    })
  }

  try {
    const rawResponse = await fetch("https://api.openai.com/v1/chat/completions", options);
    if (!rawResponse.ok) {
      throw new Error(`OpenAI API ステータス: ${rawResponse.status}`);
    }

    const jsonResponse = await rawResponse.json();
    const response = JSON.parse(jsonResponse.choices[0].message.content);
    response.date = Date.now();
    response.input = inputText;

    try {
      response.count = response.output.length;
      if (response.count < 3) {
        throw new Error(`データが${response.count}個しかありません`);
      }
    } catch (exceptionVar) {
      throw new Error("データが不適切でした");
    }

    return response;

  } catch (error) {
    console.error(error);
    if (retries > 0) {
      console.log(`【失敗】再トライ... 残り${retries - 1}`);
      return await testOpenaiApiKeyOutputingJson(inputText, retries - 1);
    } else {
      throw new Error("OpenAI からのデータ取得に失敗しました");
    }
  }
}
