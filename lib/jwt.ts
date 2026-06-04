import { SignJWT, jwtVerify } from 'jose';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET must be defined and at least 32 characters long');
}

const secretKey = new TextEncoder().encode(JWT_SECRET);
const ALGORITHM = 'HS256';

export interface JWTPayload {
  userId: string;
  email: string;
  name?: string | null;
  githubId: string;
}

export async function signAccessToken(payload: JWTPayload): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: ALGORITHM })
    .setIssuedAt()
    .setExpirationTime('15m')
    .sign(secretKey);
}

export async function signRefreshToken(userId: string): Promise<string> {
  return await new SignJWT({ userId })
    .setProtectedHeader({ alg: ALGORITHM })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secretKey);
}

export async function verifyJWT(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey, {
      algorithms: [ALGORITHM],
    });
    return payload as unknown as JWTPayload;
  } catch (error) {
    console.error('Access JWT validation failed:', error);
    return null;
  }
}

export async function verifyRefreshToken(token: string): Promise<{ userId: string } | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey, {
      algorithms: [ALGORITHM],
    });
    return payload as unknown as { userId: string };
  } catch (error) {
    console.error('Refresh JWT validation failed:', error);
    return null;
  }
}
