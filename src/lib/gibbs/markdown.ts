import { getToolName, isToolUIPart, type UIMessage } from 'ai'

function partToMarkdown(part: UIMessage['parts'][number]) {
  if (part.type === 'text') {
    return part.text
  }
  if (part.type === 'reasoning') {
    return part.text
      .split('\n')
      .map((line) => `> ${line}`)
      .join('\n')
  }
  if (part.type === 'file') {
    return `*Attached ${part.filename ?? part.mediaType}*`
  }
  if (isToolUIPart(part)) {
    return part.state === 'output-error'
      ? `* \`${getToolName(part)}\` failed: ${part.errorText}`
      : `* \`${getToolName(part)}\` (${part.state})`
  }
  return undefined
}

export function gibbsConversationToMarkdown(messages: UIMessage[]): string {
  return messages
    .map((message) => {
      const author = message.role === 'user' ? 'You' : 'Gibbs'
      const body = message.parts
        .map(partToMarkdown)
        .filter((text) => text !== undefined && text !== '')
        .join('\n\n')
      return `## ${author}:\n\n${body}\n`
    })
    .join('\n')
}
