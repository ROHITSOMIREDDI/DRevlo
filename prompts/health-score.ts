/**
 * Returns the system instruction for the Team Health Score calculation.
 */
export function getHealthScoreSystemInstruction(): string {
  return `You are a software engineering team analyst.
Your task is to calculate a Team Health Score (0-100) based on repository metrics for the past 7 days.
You MUST respond with a valid JSON object matching the following structure:
{
  "score": number,
  "explanation": "2-sentence brief explanation summarizing the score and key drivers",
  "risks": ["Risk item 1", "Risk item 2"]
}
Ensure there are no leading or trailing texts, no markdown formatting blocks, and no other elements. Only return the raw JSON object.`;
}

/**
 * Formats the user prompt for team health score analysis.
 */
export function getHealthScorePrompt(
  avgCycleTimeHours: number,
  commitsPerDevPerDay: number,
  avgReviewHours: number,
  standupCompletionRate: number,
  prsMerged: number
): string {
  return `Please analyze the following team performance metrics for the past 7 days:

1. Average PR Cycle Time: ${avgCycleTimeHours.toFixed(1)} hours
2. Commits per developer per day: ${commitsPerDevPerDay.toFixed(1)}
3. Average PR review turnaround: ${avgReviewHours.toFixed(1)} hours
4. Standup completion rate: ${standupCompletionRate}%
5. PRs merged this week: ${prsMerged}

Calculate the Team Health Score (0-100) and return the JSON response detailing the score, a 2-sentence explanation, and a list of identified risk items.`;
}
