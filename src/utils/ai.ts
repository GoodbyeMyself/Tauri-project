const DEFAULT_API_BASE = 'https://api.siliconflow.cn/v1'
const DEFAULT_MODEL = 'deepseek-ai/DeepSeek-V3'

export const API_PRESETS = [
  { label: '硅基流动（推荐，有免费模型）', url: 'https://api.siliconflow.cn/v1' },
  { label: 'Groq（免费，速度快）', url: 'https://api.groq.com/openai/v1' },
  { label: 'Google Gemini（免费）', url: 'https://generativelanguage.googleapis.com/v1beta/openai' },
  { label: 'DeepSeek', url: 'https://api.deepseek.com/v1' },
  { label: '豆包（火山引擎）', url: 'https://ark.cn-beijing.volces.com/api/v3' },
  { label: 'OpenRouter', url: 'https://openrouter.ai/api/v1' },
  { label: 'HiCaspian', url: 'https://llm.hicaspian.com' },
  { label: 'OpenAI', url: 'https://api.openai.com/v1' },
]

const SYSTEM_PROMPT = `你是 Desktop Notepad 的 AI 助手，一个桌面记事本应用的智能助理。
你擅长：任务管理建议、文章写作辅助、数据整理、使用帮助。
回答简洁实用，使用中文。支持 Markdown 格式。`

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export const AI_MODELS = [
  { id: 'deepseek-ai/DeepSeek-V3', name: 'DeepSeek V3（硅基流动免费）' },
  { id: 'deepseek-ai/DeepSeek-R1-0528', name: 'DeepSeek R1（硅基流动免费）' },
  { id: 'Qwen/Qwen3-8B', name: 'Qwen3 8B（硅基流动免费）' },
  { id: 'THUDM/GLM-4-9B-0414', name: 'GLM-4 9B（硅基流动免费）' },
  { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B（Groq 免费）' },
  { id: 'gemma2-9b-it', name: 'Gemma2 9B（Groq 免费）' },
  { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash（Google 免费）' },
  { id: 'deepseek-chat', name: 'DeepSeek Chat（DeepSeek 官方）' },
  { id: 'openrouter/anthropic/claude-sonnet-4.5', name: 'claude-sonnet-4.5' }
]

export function getAiConfig() {
  return {
    apiKey: localStorage.getItem('ai-api-key') || '',
    apiBase: localStorage.getItem('ai-api-base') || DEFAULT_API_BASE,
    model: localStorage.getItem('ai-model') || DEFAULT_MODEL,
  }
}

export async function chatStream(
  messages: ChatMessage[],
  onChunk: (text: string) => void,
  onDone: () => void,
  onError: (err: string) => void,
) {
  const { apiKey, apiBase, model } = getAiConfig()
  if (!apiKey) {
    onError('请先在设置页配置 API Key')
    onDone()
    return
  }

  const allMessages: ChatMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...messages,
  ]

  try {
    const res = await fetch(`${apiBase}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: allMessages,
        stream: true,
        max_tokens: 2048,
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      onError(`请求失败 (${res.status}): ${err}`)
      onDone()
      return
    }

    const reader = res.body?.getReader()
    if (!reader) {
      onError('无法读取响应流')
      onDone()
      return
    }

    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed || !trimmed.startsWith('data: ')) continue
        const data = trimmed.slice(6)
        if (data === '[DONE]') {
          onDone()
          return
        }

        try {
          const json = JSON.parse(data)
          const content = json.choices?.[0]?.delta?.content
          if (content) onChunk(content)
        } catch {
          // skip malformed JSON
        }
      }
    }

    onDone()
  } catch (err) {
    onError(`网络错误: ${(err as Error).message}`)
    onDone()
  }
}
