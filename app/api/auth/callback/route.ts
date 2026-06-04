import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { signAccessToken, signRefreshToken } from '@/lib/jwt';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  if (!code) {
    return NextResponse.redirect(`${appUrl}/login?error=no_code`);
  }

  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { error: 'GitHub client credentials are not configured' },
      { status: 500 }
    );
  }

  // Developer mock login bypass for local testing
  if (clientId === 'mock-client-id' && code === 'mock-code') {
    const user = await prisma.user.upsert({
      where: { githubId: 'mock-github-id-12345' },
      update: {
        email: 'bob@example.com',
        name: 'Developer Bob',
      },
      create: {
        githubId: 'mock-github-id-12345',
        email: 'bob@example.com',
        name: 'Developer Bob',
      },
    });

    const sessionToken = await signAccessToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      githubId: user.githubId,
    });

    const refreshToken = await signRefreshToken(user.id);

    // Save the refresh token in the database
    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    const response = NextResponse.redirect(appUrl);
    response.cookies.set('drevlo_access', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 15 * 60, // 15 minutes
    });
    response.cookies.set('drevlo_refresh', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return response;
  }

  try {
    // 1. Exchange code for access token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: `${appUrl}/api/auth/callback`,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      console.error('GitHub token exchange error:', tokenData.error_description || tokenData.error);
      return NextResponse.redirect(`${appUrl}/login?error=token_exchange_failed`);
    }

    const accessToken = tokenData.access_token;

    // 2. Fetch user profile from GitHub
    const userProfileResponse = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'User-Agent': 'Drevlo',
      },
    });

    if (!userProfileResponse.ok) {
      console.error('Failed to fetch GitHub user profile');
      return NextResponse.redirect(`${appUrl}/login?error=profile_fetch_failed`);
    }

    const githubUser = await userProfileResponse.json();

    // 3. Fetch user emails from GitHub (handles private emails)
    let email = githubUser.email;
    if (!email) {
      const emailsResponse = await fetch('https://api.github.com/user/emails', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'User-Agent': 'Drevlo',
        },
      });

      if (emailsResponse.ok) {
        const emails = await emailsResponse.json() as Array<{ email: string; primary: boolean; verified: boolean }>;
        const primaryEmail = emails.find((e) => e.primary && e.verified) || emails[0];
        if (primaryEmail) {
          email = primaryEmail.email;
        }
      }
    }

    if (!email) {
      console.error('No email found for GitHub user');
      return NextResponse.redirect(`${appUrl}/login?error=no_email_found`);
    }

    // 4. Create or update user in database
    const githubIdStr = String(githubUser.id);
    const user = await prisma.user.upsert({
      where: { githubId: githubIdStr },
      update: {
        email,
        name: githubUser.name || githubUser.login,
      },
      create: {
        githubId: githubIdStr,
        email,
        name: githubUser.name || githubUser.login,
      },
    });

    // 5. Sign JWT session token
    const sessionToken = await signAccessToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      githubId: user.githubId,
    });

    const refreshToken = await signRefreshToken(user.id);

    // Save the refresh token in the database
    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    // 6. Set JWT cookies and redirect to dashboard
    const response = NextResponse.redirect(appUrl);
    response.cookies.set('drevlo_access', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 15 * 60, // 15 minutes
    });
    response.cookies.set('drevlo_refresh', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return response;
  } catch (error) {
    console.error('GitHub authentication callback failed:', error);
    return NextResponse.redirect(`${appUrl}/login?error=auth_internal_error`);
  }
}
