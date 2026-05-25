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

export async function signJWT(payload: JWTPayload): Promise<string> {
  return await new SignJWT({ ...payload })
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
    console.error('JWT validation failed:', error);
    return null;
  }
}
