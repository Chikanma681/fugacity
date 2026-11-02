import { type ChatTransport, DefaultChatTransport, type UIMessage } from 'ai'
import { DEFAULT_GIBBS_MODE } from '@src/lib/constants'
import type {
  GibbsChatRequestBody,
  GibbsConversation,
  GibbsConversationStore,
} from '@src/lib/gibbs/types'

export function createGibbsChatTransport(
  apiUrl: string
): ChatTransport<UIMessage> {
  return new DefaultChatTransport<UIMessage>({
    api: `${apiUrl}/api/chat`,
    prepareSendMessagesRequest: ({ id, messages, body }) => {
      const requestBody: GibbsChatRequestBody = {
        conversationId: id,
        message: messages.at(-1),
        tools: body?.tools ?? [],
        mode: body?.mode ?? DEFAULT_GIBBS_MODE,
      }
      return { body: requestBody }
    },
  })
}

async function readConversation(response: Response) {
  if (!response.ok) {
    return Promise.reject(
      new Error(
        `Gibbs request failed (${response.status}): ${await response.text()}`
      )
    )
  }
  return (await response.json()) as GibbsConversation
}

export function createGibbsHttpConversationStore(
  apiUrl: string
): GibbsConversationStore {
  return {
    load: async (projectId) =>
      readConversation(
        await fetch(
          `${apiUrl}/api/projects/${encodeURIComponent(projectId)}/conversation`
        )
      ),
    create: async (projectId) =>
      readConversation(
        await fetch(`${apiUrl}/api/conversations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectId }),
        })
      ),
  }
}
