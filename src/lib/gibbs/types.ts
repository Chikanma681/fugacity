import type { UIMessage } from 'ai'

export type GibbsMode = 'fast' | 'thoughtful'

export type GibbsConversation = {
  id: string
  messages: UIMessage[]
}

export interface GibbsConversationStore {
  load: (projectId: string) => Promise<GibbsConversation>
  create: (projectId: string) => Promise<GibbsConversation>
}

export type GibbsToolSpec = {
  name: string
  description: string
  inputSchema: Record<string, unknown>
}

export type GibbsChatRequestBody = {
  conversationId: string
  message: UIMessage | undefined
  tools: GibbsToolSpec[]
  mode: GibbsMode
}
