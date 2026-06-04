import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function POST(request: NextRequest) {
  const refreshCookie = request.cookies.get('drevlo_refresh');

  if (refreshCookie) {
    try {
      await prisma.refreshToken.update({
        where: { token: refreshCookie.value },
        data: { revoked: true },
      });
    } catch (err) {
      // Ignore if not found or already deleted
      console.error('Failed to revoke refresh token on logout:', err);
    }
  }

  const response = NextResponse.json({ success: true });
  response.cookies.delete('drevlo_access');
  response.cookies.delete('drevlo_refresh');
  return response;
}
