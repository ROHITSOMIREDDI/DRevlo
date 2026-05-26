import { NextResponse } from 'next/server';

export async function GET() {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const redirectUri = `${appUrl}/api/auth/callback`;

  if (!clientId) {
    return NextResponse.json(
      { error: 'GITHUB_CLIENT_ID is not configured' },
      { status: 500 }
    );
  }

  // Developer mock login bypass for local testing
  if (clientId === 'mock-client-id') {
    return NextResponse.redirect(`${appUrl}/api/auth/callback?code=mock-code`);
  }

  const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&scope=user:email`;

  return NextResponse.redirect(githubAuthUrl);
}
