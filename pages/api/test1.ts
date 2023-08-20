// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'

type Data = {
  name: string
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  const inputText = req.query.inputText as string; // Retrieve inputText from query parameters
  if (!inputText) {
    res.status(400).json({ error: 'Missing inputText parameter' });
    return;
  }

  try {
    const output = await testOpenaiApiKeyOutputingJson(inputText);
    res.status(200).json(output);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'An error occurred' });
  }
}

async function testOpenaiApiKeyOutputingJson(inputText = "") {
  const systemPrompt = `
  # 命令
  あなたは心理学を用いて、欲望を分解するAPIです。
  以下の制約条件を厳密に守って、 [入力された欲望] に内包されている欲望を8〜15件リストアップして下さい。
  
  ## 制約
  - できるだけ簡潔に言い切り系で
  - JSON形式で出力すること
  
  ## Output JSON Format
  {"output":[{title:〇〇欲求,content:〇〇したい}]}
  
  ## 参考
  
  1. ブッダの7つの欲求
  食欲、睡眠欲、性欲、承認欲、生存欲、怠惰欲、感楽欲
  
  2. マズローの5段階欲求
  生理的欲求→安全欲求→社会的欲求（所属と愛の欲求）→自己実現欲求承認欲求（尊重の欲求）→自己超越欲求
  
  3. ヘンリー・マレーの28種類を荻野・齊藤によって更に細分化された59種類の分類
  生理的欲求（臓器発生的欲求）
  - 摂取欲求：吸気欲求、飲水欲求、食物欲求、感性欲求
  - 排泄欲求：呼気欲求、排泄欲求、性的欲求、授乳欲求
  - 回避欲求：暑熱回避欲求、寒冷回避欲求、毒性回避欲求、障害回避欲求
  社会的欲求（心理発生的欲求）
  - 優越支配欲求（能動的 - 権勢的)：自尊欲求、競争欲求、優越欲求、攻撃欲求、反発欲求、 - 流行欲求、自己顕示欲求、指導欲求、名誉欲求、支配欲求、権力欲求
  - 情的支配欲求（能動的 - 権勢的)：愛情欲求、恋愛欲求、愉楽欲求、自由欲求、自己表現欲求、不満解消欲求
  - 積極的活動欲求（能動的 - 非権勢的)：達成欲求、内罰欲求、自己成長欲求、持続欲求、自己実現欲求、知識欲求、自己主張欲求、批判欲求、趣味欲求、感性欲求、理解欲求、他者認知欲求、好奇欲求
  - 関係形成欲求（能動的 - 非権勢的)：秩序欲求 、援助欲求 、集団貢献欲求 、社会貢献欲求 、教授欲求 、自己認知欲求 、承認欲求 
  - 自己開示 -保身的回避需（受動的)：屈辱回避需 、 同調回避需 、嫌悪回避需 、批判回避需 、服従回避需 、優位回避需 、譲歩回避需 、安心回避需 、気楽回避需 、挑戦回避需 、安全回避需 、拒否回避需 、金銭回避需 、生活安定回避需
  - 協調性に関する需要（受動的)：依存協調需 、親和協調需 、協力協調需 、孤立協調需 、恭順協調需 、自己規制協調需、迷惑回避協調需
    `;

  const messages = [
    { "role": "system", "content": systemPrompt },
    { "role": "user", "content": inputText },
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
  // console.log(options)
  const rawResponse = await fetch("https://api.openai.com/v1/chat/completions", options);
  const jsonResponse = await rawResponse.json();
  const response = JSON.parse(jsonResponse.choices[0].message.content);
  response.input = inputText;
  response.count = response.output.length;
  console.log(response)

  return response;
}