/**
 * Returns the system instruction for the Sprint Retrospective report.
 */
export function getRetroSystemInstruction(): string {
  return `You are a software engineering delivery manager.
Your task is to write a sprint retrospective report based on the sprint metadata, shipped features, and blockers.
Format your output in exactly 4 sections:
1. Shipped Features: [2-3 bullet points of what got completed and merged]
2. Highlights: [1-2 bullet points highlighting velocity or key accomplishments]
3. Blockers & Risks: [1-2 bullet points of delay drivers or blockers faced]
4. AI Recommendations: [2-3 bullet points of actionable suggestions for the next sprint]
Keep the entire report concise, objective, professional, and under 300 words.`;
}

/**
 * Formats the user prompt for sprint retrospective generation.
 */
export function getRetroPrompt(
  sprintName: string,
  shippedPrTitles: string[],
  blockerNotes: string[],
  sprintVelocity: number,
  prsClosedNoMerge: number
): string {
  const prsStr = shippedPrTitles.length > 0 ? shippedPrTitles.map(t => `- ${t}`).join('\n') : 'No pull requests merged';
  const blockersStr = blockerNotes.length > 0 ? blockerNotes.map(b => `- ${b}`).join('\n') : 'No blockers reported';

  return `Sprint: ${sprintName}
Sprint Velocity: ${sprintVelocity} merged PRs
PRs closed without merge: ${prsClosedNoMerge}

Merged PR Titles (Shipped work):
${prsStr}

Blockers reported during standups:
${blockersStr}

Please generate the sprint retrospective report based on these metrics following the system instructions.`;
}
