import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NewUser } from '@/lib/db/schema';

const key = new TextEncoder().encode(process.env.AUTH_SECRET);
const SALT_LENGTH = 16;
const KEY_LENGTH = 32;
const ITERATIONS = 100000;
const DIGEST = 'SHA-256';

export function hashPassword(password: string): string {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const derivedKey = scryptSync(password, salt, KEY_LENGTH, { N: ITERATIONS, r: 8, p: 1 });
  return `${Buffer.from(salt).toString('hex')}:${Buffer.from(derivedKey).toString('hex')}`;
}

export function comparePasswords(plainTextPassword: string, hashedPassword: string): boolean {
  const [saltHex, storedHashHex] = hashedPassword.split(':');
  const salt = Buffer.from(saltHex, 'hex');
  const storedHash = Buffer.from(storedHashHex, 'hex');
  const derivedKey = scryptSync(plainTextPassword, salt, KEY_LENGTH, { N: ITERATIONS, r: 8, p: 1 });
  return timingSafeEqual(derivedKey, storedHash);
}

type SessionData = {
  user: { id: number };
  expires: string;
};

export async function signToken(payload: SessionData): Promise<string> {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1 day from now')
    .sign(key);
}

export async function verifyToken(input: string): Promise<SessionData> {
  const { payload } = await jwtVerify(input, key, {
    algorithms: ['HS256'],
  });
  return payload as SessionData;
}

export async function getSession() {
  const session = (await cookies()).get('session')?.value;
  if (!session) return null;
  return await verifyToken(session);
}

export async function setSession(user: NewUser) {
  const expiresInOneDay = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const session: SessionData = {
    user: { id: user.id! },
    expires: expiresInOneDay.toISOString(),
  };
  const encryptedSession = await signToken(session);
  (await cookies()).set('session', encryptedSession, {
    expires: expiresInOneDay,
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
  });
}
