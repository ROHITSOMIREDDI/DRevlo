import { NextRequest } from 'next/server';
import { verifyJWT, JWTPayload } from './jwt';

export async function getSessionUser(request: NextRequest): Promise<JWTPayload | null> {
  const sessionCookie = request.cookies.get('drevlo_session');
  if (!sessionCookie) return null;
  return await verifyJWT(sessionCookie.value);
}
