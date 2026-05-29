import { describe, it, expect } from 'vitest';
import { generateText } from '../lib/ai';
import { getStandupPrompt } from '../prompts/standup';
import { getHealthScorePrompt } from '../prompts/health-score';
import { getCodeReviewPrompt } from '../prompts/code-review';
import { getRetroPrompt } from '../prompts/retro';

describe('Gemini AI Provider & Prompts', () => {
  describe('Mock AI Text Generator', () => {
    it('should return mock standup summary when prompt contains standup keyword', async () => {
      // Set AI_PROVIDER to mock to guarantee mock responses
      process.env.AI_PROVIDER = 'mock';
      const prompt = 'Generate a standup summary for Developer Bob';
      const response = await generateText(prompt);
      expect(response).toContain('Yesterday:');
      expect(response).toContain('Today:');
      expect(response).toContain('Blockers:');
    });

    it('should return mock health score when prompt contains health score keyword', async () => {
      process.env.AI_PROVIDER = 'mock';
      const prompt = 'Please calculate a team health score';
      const response = await generateText(prompt);
      const parsed = JSON.parse(response);
      expect(parsed.score).toBeDefined();
      expect(typeof parsed.score).toBe('number');
      expect(parsed.explanation).toBeDefined();
      expect(Array.isArray(parsed.risks)).toBe(true);
    });

    it('should return mock code review when prompt contains code review keyword', async () => {
      process.env.AI_PROVIDER = 'mock';
      const prompt = 'Give me some code review comments';
      const response = await generateText(prompt);
      expect(response).toContain('Strength:');
      expect(response).toContain('Improvement:');
      expect(response).toContain('Recommendation:');
    });

    it('should return mock sprint retro when prompt contains retro keyword', async () => {
      process.env.AI_PROVIDER = 'mock';
      const prompt = 'Generate a sprint retrospective report';
      const response = await generateText(prompt);
      expect(response).toContain('What Shipped:');
      expect(response).toContain('Highlights:');
      expect(response).toContain('Blockers:');
      expect(response).toContain('Recommendations:');
    });
  });

  describe('Prompt Templates Formatter', () => {
    it('should format standup prompt correctly', () => {
      const devName = 'John Doe';
      const commits = ['feat: first commit', 'fix: fix syntax'];
      const prs = ['PR #1: Setup auth'];
      const note = 'Worked on auth';

      const prompt = getStandupPrompt(devName, commits, prs, note);
      expect(prompt).toContain('Developer: John Doe');
      expect(prompt).toContain('- feat: first commit');
      expect(prompt).toContain('- PR #1: Setup auth');
      expect(prompt).toContain('Worked on auth');
    });

    it('should format health score prompt correctly', () => {
      const prompt = getHealthScorePrompt(24.5, 3.2, 12.1, 85, 4);
      expect(prompt).toContain('PR Cycle Time: 24.5 hours');
      expect(prompt).toContain('Commits per developer per day: 3.2');
      expect(prompt).toContain('PR review turnaround: 12.1 hours');
      expect(prompt).toContain('Standup completion rate: 85%');
      expect(prompt).toContain('PRs merged this week: 4');
    });

    it('should format code review prompt correctly', () => {
      const prompt = getCodeReviewPrompt('Update README', 2, 10, 5, ['Reviewer: Alice, Action: approved'], 2.5);
      expect(prompt).toContain('PR Title:');
      expect(prompt).toContain('<pr_title>\nUpdate README\n</pr_title>');
      expect(prompt).toContain('Files changed: 2');
      expect(prompt).toContain('Lines added: 10');
      expect(prompt).toContain('Time to first review: 2.5 hours');
      expect(prompt).toContain('Reviewer: Alice, Action: approved');
    });

    it('should format sprint retro prompt correctly', () => {
      const prompt = getRetroPrompt('Sprint 3', ['PR 1', 'PR 2'], ['App credential delay'], 8, 1);
      expect(prompt).toContain('Sprint: Sprint 3');
      expect(prompt).toContain('Sprint Velocity: 8 merged PRs');
      expect(prompt).toContain('PRs closed without merge: 1');
      expect(prompt).toContain('- PR 1');
      expect(prompt).toContain('- App credential delay');
    });
  });
});
