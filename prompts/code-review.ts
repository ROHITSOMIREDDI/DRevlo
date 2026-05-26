/**
 * Returns the system instruction for generating Code Review insights.
 */
export function getCodeReviewSystemInstruction(): string {
  return `You are a senior software engineer reviewing code patterns.
Analyze the PR metrics and review comments and provide constructive, specific feedback.
Format your output in exactly 3 sections starting with:
* Strength: [1 sentence highlighting a positive code quality pattern]
* Improvement: [1 sentence highlighting a code review pattern to improve]
* Recommendation: [1 sentence action item recommending a specific practice]
Keep your total response under 150 words. Do not use conversational filler or introductions.`;
}

/**
 * Formats the user prompt for PR code review insights.
 */
export function getCodeReviewPrompt(
  prTitle: string,
  filesChanged: number,
  linesAdded: number,
  linesRemoved: number,
  reviewComments: string[],
  timeToFirstReviewHours: number
): string {
  const commentsStr = reviewComments.length > 0 ? reviewComments.map(c => `- ${c}`).join('\n') : 'No review comments logged';
  
  return `PR Title: ${prTitle}
Files changed: ${filesChanged}
Lines added: ${linesAdded} | Lines removed: ${linesRemoved}
Time to first review: ${timeToFirstReviewHours.toFixed(1)} hours

Review Comments:
${commentsStr}

Please generate the code review insight following the system instructions.`;
}
