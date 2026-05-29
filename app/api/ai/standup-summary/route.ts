import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getLocalDateInTimezone } from '@/lib/timezone';
import { generateText } from '@/lib/ai';
import { getStandupPrompt, getStandupSystemInstruction } from '@/prompts/standup';
import { getSessionUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const cronToken = searchParams.get('token');
  const configuredToken = process.env.CRON_SECRET;
  const teamIdParam = searchParams.get('teamId');
  const force = searchParams.get('force') === 'true';

  // Authenticate & Authorize
  const user = await getSessionUser(request);
  let isAuthorized = false;

  // Case A: Valid Cron Secret provided
  if (configuredToken && cronToken === configuredToken) {
    isAuthorized = true;
  }

  // Case B: Logged-in session user with workspace membership
  if (!isAuthorized && user && teamIdParam) {
    const membership = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId: teamIdParam,
          userId: user.userId,
        },
      },
    });
    if (membership) {
      isAuthorized = true;
    }
  }

  if (!isAuthorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 1. Fetch target teams
    const teams = await prisma.team.findMany({
      where: teamIdParam ? { id: teamIdParam } : undefined,
    });

    const processedStandups: Array<{ teamId: string; userId: string; summary: string }> = [];
    const skippedStandups: Array<{ teamId: string; userId: string; reason: string }> = [];

    const now = new Date();

    for (const team of teams) {
      const timezone = team.timezone || 'UTC';
      let is9AMWindow = false;

      if (force || teamIdParam) {
        is9AMWindow = true;
      } else {
        const formatter = new Intl.DateTimeFormat('en-US', {
          timeZone: timezone,
          hour: '2-digit',
          minute: '2-digit',
          hourCycle: 'h23',
        });
        const formatted = formatter.format(now);
        const [hourStr, minuteStr] = formatted.split(':');
        const hour = parseInt(hourStr, 10);
        const minute = parseInt(minuteStr, 10);

        // 9:00 AM window: hour is 9, minute is between 0 and 14
        is9AMWindow = (hour === 9 && minute >= 0 && minute < 15);
      }

      if (!is9AMWindow) {
        continue;
      }

      // 2. Fetch standup records for today in team timezone
      const localMidnightDate = getLocalDateInTimezone(now, timezone);
      const standups = await prisma.standup.findMany({
        where: {
          teamId: team.id,
          date: localMidnightDate,
        },
      });

      if (standups.length === 0) {
        continue;
      }

      // Get user profiles to match commits
      const userIds = standups.map((s) => s.userId);
      const users = await prisma.user.findMany({
        where: { id: { in: userIds } },
      });

      for (const standup of standups) {
        // Enforce database caching: skip if aiSummary is already set and not forced
        if (standup.aiSummary && !force) {
          skippedStandups.push({
            teamId: team.id,
            userId: standup.userId,
            reason: 'Already summarized',
          });
          continue;
        }

        const user = users.find((u) => u.id === standup.userId);
        const devName = user?.name || 'Developer';

        // Parse standup content
        let yesterday = '';
        let today = '';
        let blockers = '';
        try {
          const parsed = JSON.parse(standup.content);
          yesterday = parsed.yesterday || '';
          today = parsed.today || '';
          blockers = parsed.blockers || '';
        } catch {
          yesterday = standup.content;
        }

        // Fetch recent commits (last 24 hours) for this developer
        const usernameParts = [
          user?.name,
          user?.email?.split('@')[0],
        ].filter(Boolean) as string[];

        const commits = await prisma.commit.findMany({
          where: {
            repository: {
              teamId: team.id,
            },
            timestamp: {
              gte: new Date(now.getTime() - 24 * 60 * 60 * 1000),
            },
            OR: usernameParts.map((part) => ({
              authorId: {
                equals: part,
                mode: 'insensitive',
              },
            })),
          },
          take: 5,
        });

        const commitsList = commits.map((c) => c.message);

        // Fetch team PRs (last 24 hours) to include in the context
        const prs = await prisma.pullRequest.findMany({
          where: {
            repository: {
              teamId: team.id,
            },
            createdAt: {
              gte: new Date(now.getTime() - 24 * 60 * 60 * 1000),
            },
          },
          take: 5,
        });

        const prTitles = prs.map((pr) => pr.title);

        // Call Gemini AI Wrapper
        const systemInstruction = getStandupSystemInstruction();
        const manualNote = `Yesterday: ${yesterday}. Today: ${today}. Blockers: ${blockers}.`;
        const prompt = getStandupPrompt(devName, commitsList, prTitles, manualNote);

        try {
          const aiSummary = await generateText(prompt, systemInstruction);

          // Update standup record with AI Summary
          await prisma.standup.update({
            where: { id: standup.id },
            data: { aiSummary },
          });

          // Also log to the AI Reports historical archive
          await prisma.aiReport.create({
            data: {
              teamId: team.id,
              type: 'standup',
              content: JSON.stringify({
                userId: standup.userId,
                userName: devName,
                summary: aiSummary,
                date: localMidnightDate.toISOString(),
              }),
            },
          });

          processedStandups.push({
            teamId: team.id,
            userId: standup.userId,
            summary: aiSummary,
          });
        } catch (aiErr) {
          console.error(`AI Summary generation failed for user ${standup.userId}:`, aiErr);
        }
      }
    }

    return NextResponse.json({
      success: true,
      processed: processedStandups.length,
      skipped: skippedStandups.length,
      processedDetails: processedStandups,
      skippedDetails: skippedStandups,
    });
  } catch (error) {
    console.error('Failed to run standup summary cron:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
