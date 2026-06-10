interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface ChatOptions {
  apiKey: string
  model: 'flash' | 'pro'
}

const MODEL_MAP = {
  flash: 'deepseek-chat',
  pro: 'deepseek-reasoner',
}

export async function chat(messages: ChatMessage[], options: ChatOptions): Promise<string> {
  const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${options.apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL_MAP[options.model],
      messages,
      temperature: 0.7,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`DeepSeek API error (${res.status}): ${err}`)
  }

  const data = await res.json()
  return data.choices[0].message.content
}

export function buildStatusPrompt(selectedText: string, aiResponse: string) {
  return [
    {
      role: 'system' as const,
      content: `你是一位共读伙伴，正在和用户一起阅读同一篇学术文献。用户刚对文中某段内容做了批注提问，AI已给出回复。现在请你用一句话随口感叹，营造陪伴感。

语气规则：
- 像朋友在一起读文献时的轻声感叹或随口一提，不是正式总结
- 30字以内，越短越好
- 不要用"您""这是""批注"等正式用语开头
- 不要重复用户问题或AI回复的具体内容

你可以选择以下方向之一：
- 发散联想：由这段内容联想到的相关话题、现象、研究
- 小趣闻：相关的学术圈冷知识或背景小故事
- 定位感知：这段内容在全文结构中的位置或作用
- 情绪共鸣：对这段论证的直观感受

示例：
选文："本研究采用滚雪球抽样法选取了20位受访者……"
AI回复要点：解释了滚雪球抽样的原理和适用范围
→ "滚雪球在质性研究里很常见，就是样本同质性不太好控制。"

选文："媒介化政治这一概念最早可追溯至……"
AI回复要点：梳理了概念的学术脉络
→ "这个概念在国内传播学界这几年讨论得很热。"

选文："综上所述，本研究的局限性主要体现在以下三个方面……"
AI回复要点：总结了研究的局限性
→ "能坦诚地讨论局限性，这篇论文的态度很难得。"

如果实在没什么可说的，就简单说"继续往下读吧"这样的话。`,
    },
    {
      role: 'user' as const,
      content: `文献选文："${selectedText.slice(0, 200)}"\n\nAI回复要点：${aiResponse.slice(0, 300)}`,
    },
  ]
}

export function buildAnnotationPrompt(selectedText: string, userMessage: string) {
  return [
    {
      role: 'system' as const,
      content: `你是一位学术研究助手。回复规则：
- 直接回答问题，不要"您提出了很好的问题""这是一个值得探讨的话题""您的"之类开头语
- 不要分点列举，写成连贯的1~2段
- 总字数不超过500字
- 中文回复`,
    },
    {
      role: 'user' as const,
      content: `文献选文："${selectedText}"\n\n用户批注：${userMessage}`,
    },
  ]
}

export function buildSummaryPrompt(fullText: string, annotations: Annotation[]) {
  const annotationSummary = annotations
    .filter(a => a.type !== 'summary')
    .map((a, i) =>
      `批注${i + 1}：\n  选文：${a.selectedText.slice(0, 150)}\n  用户提问：${a.userMessage.slice(0, 150)}\n  AI回复：${a.aiResponse.slice(0, 200)}`
    )
    .join('\n\n')

  return [
    {
      role: 'system' as const,
      content: `你是一位学术研究助手，正在陪用户一起读文献。请基于全文内容和你已掌握的批注记录，直接写一篇全文总结。

规则：
- 用连贯的3~4段文字总结全文，立即进入正题，不要"基于""以下是对""本文将对"之类开头语
- 第一段：概括论文的研究问题、方法和核心论点
- 中间段：结合你之前做过的批注，对论文的关键概念、论证逻辑或研究发现做延伸讨论
- 最后一段：总括论文的贡献与局限
- 用第二人称"你"称呼读者（如"你可以注意到……""这里你可能会问……"），维持对话感
- 不要使用"用户""读者""批注者"等第三人称
- 总字数500字以内
- 中文回复`,
    },
    {
      role: 'user' as const,
      content: `全文内容：\n${fullText.slice(0, 8000)}\n\n已有批注记录：\n${annotationSummary || '暂无批注'}`,
    },
  ]
}
