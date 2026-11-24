import { accessToken } from '@src/lib/accessToken'
import { DEFAULT_GIBBS_MODE } from '@src/lib/constants'
import type {
  GibbsChatRequestBody,
  GibbsConversation,
  GibbsConversationStore,
} from '@src/lib/gibbs/types'
import { type ChatTransport, DefaultChatTransport, type UIMessage } from 'ai'

async function authorizationHeader() {
  const token = await accessToken.get()
  if (!token) {
    return Promise.reject(new Error('Gibbs request requires a signed-in user'))
  }
  return { Authorization: `Bearer ${token}` }
}

export function createGibbsChatTransport(
  apiUrl: string
): ChatTransport<UIMessage> {
  return new DefaultChatTransport<UIMessage>({
    api: `${apiUrl}/api/chat`,
    headers: authorizationHeader,
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
          `${apiUrl}/api/projects/${encodeURIComponent(projectId)}/conversation`,
          { headers: await authorizationHeader() }
        )
      ),
    create: async (projectId) =>
      readConversation(
        await fetch(`${apiUrl}/api/conversations`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(await authorizationHeader()),
          },
          body: JSON.stringify({ projectId }),
        })
      ),
  }
}
