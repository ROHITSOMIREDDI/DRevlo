import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY;
const provider = process.env.AI_PROVIDER || 'gemini';

// Initialize the Google Generative AI client
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

/**
 * High-level helper to generate text using the configured AI provider.
 * Falls back to structured mock text in development if keys are not set.
 */
export async function generateText(
  prompt: string,
  systemInstruction?: string,
  responseMimeType?: 'application/json' | 'text/plain'
): Promise<string> {
  // If provider is set to mock or API keys are missing, return mock data helper
  if (provider === 'mock' || !genAI) {
    console.log('Using Mock AI Provider. Prompt:', prompt);
    return getMockResponse(prompt);
  }

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: systemInstruction,
      generationConfig: responseMimeType ? { responseMimeType } : undefined,
    });

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    return text;
  } catch (error) {
    console.error('Gemini text generation failed:', error);
    throw error;
  }
}

/**
 * Returns mock responses based on prompt keywords to facilitate local testing
 * when API keys are not provided.
 */
function getMockResponse(prompt: string): string {
  const lowercasePrompt = prompt.toLowerCase();

  // 1. Mock Standup Summary
  if (lowercasePrompt.includes('standup summary') || lowercasePrompt.includes('manual standup')) {
    return `- Yesterday: Completed JWT session middleware verification and added login auth routes.\n- Today: Building Recharts graphics for commits and PR cycle time analytics.\n- Blockers: None.`;
  }

  // 2. Mock Team Health Score
  if (lowercasePrompt.includes('health score') || lowercasePrompt.includes('calculate a team health score')) {
    return JSON.stringify({
      score: 82,
      explanation: 'The team shows stable commit frequency and good standup participation. However, PR review latency is averaging 28 hours, which slightly slows down the velocity.',
      risks: [
        'PR review turnaround time exceeds 24-hour target.',
        'High dependency on a single developer for reviews.',
      ],
    });
  }

  // 3. Mock Code Review Insights
  if (lowercasePrompt.includes('review comments') || lowercasePrompt.includes('code review')) {
    return `### Code Review Insights\n* **Strength:** Great modularization of routes and robust validation schema rules.\n* **Improvement:** Some database queries in api routes could benefit from connection pooling handles.\n* **Recommendation:** Ensure all prisma connections reuse the client singleton defined in lib/db.`;
  }

  // 4. Mock Sprint Retrospective
  if (lowercasePrompt.includes('sprint') || lowercasePrompt.includes('retrospective')) {
    return `### Sprint Retrospective Report\n* **What Shipped:** Completed the foundation workspace features, GitHub oauth, real-time webhooks, and analytics dashboards.\n* **Highlights:** Webhook updates verify signatures and propagate state changes within 5 seconds.\n* **Blockers:** GitHub App credentials required manual configuration from settings.\n* **Recommendations:** Schedule safety-net cron updates off-peak hours to conserve token limits.`;
  }

  return 'Mock AI Text Response';
}
