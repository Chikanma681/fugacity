import env from '@src/env'
import { APP_VERSION } from '@src/routes/utils'

export type FeedbackType = 'bug' | 'feature' | 'complaint' | 'other'

export const FEEDBACK_TYPE_LABELS: Record<FeedbackType, string> = {
  bug: '🐛 Bug report',
  feature: '💡 Feature request',
  complaint: '😠 Complaint',
  other: '💬 Other feedback',
}

export type FeedbackUser = {
  name?: string | null
  email?: string | null
}

export type Feedback = {
  type: FeedbackType
  message: string
  user?: FeedbackUser
}

const DISCORD_EMBED_DESCRIPTION_LIMIT = 4096
const FEEDBACK_EMBED_COLOR = 0x4f46e5

export function getFeedbackWebhookUrl() {
  return env().VITE_FUGACITY_FEEDBACK_WEBHOOK_URL
}

function truncate(text: string, limit: number) {
  return text.length > limit ? `${text.slice(0, limit - 1)}…` : text
}

function buildDiscordPayload({ type, message, user }: Feedback) {
  const title = FEEDBACK_TYPE_LABELS[type]
  return {
    content: `New Fugacity feedback: ${title}`,
    embeds: [
      {
        color: FEEDBACK_EMBED_COLOR,
        title,
        description: truncate(message, DISCORD_EMBED_DESCRIPTION_LIMIT),
        fields: [
          { name: 'User', value: user?.name || 'Unknown', inline: true },
          { name: 'Email', value: user?.email || 'Unknown', inline: true },
          {
            name: 'Platform',
            value: window.electron ? 'desktop' : 'web',
            inline: true,
          },
          { name: 'Version', value: APP_VERSION || 'unknown', inline: true },
        ],
        timestamp: new Date().toISOString(),
      },
    ],
  }
}

export async function sendFeedbackToDiscord(
  feedback: Feedback
): Promise<Error | undefined> {
  const webhookUrl = getFeedbackWebhookUrl()
  if (!webhookUrl) {
    return new Error('Feedback is not configured for this build.')
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildDiscordPayload(feedback)),
    })
    if (!response.ok) {
      return new Error(`Feedback request failed with status ${response.status}`)
    }
  } catch {
    return new Error('Could not reach the feedback service.')
  }
}
