/**
 * Returns the system instruction for the Standup Summary prompt.
 */
export function getStandupSystemInstruction(): string {
  return `You are a developer productivity assistant for a software team.
Your task is to write a concise daily standup summary for a developer based on their activity data.
Format your output exactly in 3 bullet points starting with:
* Yesterday: [Brief description]
* Today: [Brief description]
* Blockers: [Brief description, or "None" if no blockers]
Keep it professional, specific, and under 60 words total. Do not add any conversational filler or introductions.`;
}

/**
 * Formats the user prompt for standup generation.
 */
export function getStandupPrompt(
  devName: string,
  commits: string[],
  prs: string[],
  manualNote: string
): string {
  const commitMessages = commits.length > 0 ? commits.map(m => `- ${m}`).join('\n') : 'No commits recorded';
  const prTitles = prs.length > 0 ? prs.map(t => `- ${t}`).join('\n') : 'No PR activity recorded';
  const note = manualNote || 'None provided';

  return `Developer: ${devName}
Activity over the last 24 hours:

Commits:
${commitMessages}

Pull Requests:
${prTitles}

Manual Standup Note:
${note}

Please generate the 3-bullet-point standup summary following the system instructions.`;
}
