import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '@/lib/jwt';

export async function POST(request: NextRequest) {
  const refreshCookie = request.cookies.get('drevlo_refresh');

  if (!refreshCookie) {
    return NextResponse.json({ error: 'Refresh token missing' }, { status: 401 });
  }

  const tokenValue = refreshCookie.value;

  // 1. Verify the JWT signature and expiration
  const payload = await verifyRefreshToken(tokenValue);
  if (!payload) {
    return NextResponse.json({ error: 'Invalid or expired refresh token' }, { status: 401 });
  }

  try {
    // 2. Query the database to find the token record
    const dbToken = await prisma.refreshToken.findUnique({
      where: { token: tokenValue },
      include: { user: true },
    });

    if (!dbToken) {
      return NextResponse.json({ error: 'Refresh token not registered' }, { status: 401 });
    }

    // 3. Check for reuse/revocation
    if (dbToken.revoked) {
      console.warn(`Revoked refresh token reuse detected for user ${dbToken.userId}! Revoking all user tokens.`);
      // As a security measure, revoke ALL tokens for this user
      await prisma.refreshToken.updateMany({
        where: { userId: dbToken.userId },
        data: { revoked: true },
      });
      
      const response = NextResponse.json({ error: 'Token has been revoked' }, { status: 401 });
      response.cookies.delete('drevlo_access');
      response.cookies.delete('drevlo_refresh');
      return response;
    }

    // 4. Check expiration
    if (dbToken.expiresAt < new Date()) {
      return NextResponse.json({ error: 'Refresh token expired' }, { status: 401 });
    }

    // 5. Rotate token: revoke current token and issue a new pair
    await prisma.refreshToken.update({
      where: { id: dbToken.id },
      data: { revoked: true },
    });

    const newAccessToken = await signAccessToken({
      userId: dbToken.user.id,
      email: dbToken.user.email,
      name: dbToken.user.name,
      githubId: dbToken.user.githubId,
    });

    const newRefreshToken = await signRefreshToken(dbToken.user.id);

    // Save the new refresh token in the database
    await prisma.refreshToken.create({
      data: {
        token: newRefreshToken,
        userId: dbToken.user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    // 6. Return response setting the updated cookies
    const response = NextResponse.json({ success: true });
    
    response.cookies.set('drevlo_access', newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 15 * 60, // 15 minutes
    });

    response.cookies.set('drevlo_refresh', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return response;
  } catch (error) {
    console.error('Failed to rotate refresh token:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
