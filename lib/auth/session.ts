interface DecodedToken {
  sub: string;
  exp: number;
  iat: number;
  // Add other claims as needed
  user: { id: number }; // Add the user field here
}


'use server'

import { SignJWT, jwtVerify } from 'jose';
//import { cookies } from 'next-cookies';
//import { parseCookies } from "nookies";
import jwt from 'jsonwebtoken';
import { NextApiRequest } from 'next';
import { parse } from 'cookie';
import { NewUser } from '@/lib/db/schema';
import { cookies } from 'next/headers';
// import { verifyToken } from './token'; // Assuming you have a verifyToken function to validate the session


const key = new TextEncoder().encode(process.env.AUTH_SECRET);
const SALT_LENGTH = 16;
const KEY_LENGTH = 32;
const ITERATIONS = 100000;
const DIGEST = 'SHA-256';

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);
  const derivedKey = await crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  ).then(key => crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: ITERATIONS, hash: DIGEST },
    key,
    KEY_LENGTH * 8
  ));
  return `${Buffer.from(salt).toString('hex')}:${Buffer.from(new Uint8Array(derivedKey)).toString('hex')}`;
}

export async function comparePasswords(plainTextPassword: string, hashedPassword: string): Promise<boolean> {
  const [saltHex, storedHashHex] = hashedPassword.split(':');
  const salt = Buffer.from(saltHex, 'hex');
  const storedHash = Buffer.from(storedHashHex, 'hex');
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(plainTextPassword);
  const derivedKey = await crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  ).then(key => crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: ITERATIONS, hash: DIGEST },
    key,
    KEY_LENGTH * 8
  ));
  return timingSafeEqual(new Uint8Array(derivedKey), storedHash);
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

export async function verifyToken(token: string): Promise<DecodedToken | null> {
  try {
    if (!token) throw new Error("Token is missing");
    
    // Simulate token verification (replace with your JWT verification logic)
    const decoded = JSON.parse(atob(token.split(".")[1])); // For JWT tokens
    return decoded;
  } catch (error) {
    console.error("Invalid token:", error);
    return null;
  }
}


export async function getSession(req: NextApiRequest) {

  

  // Retrieve the 'session' cookie
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('session');

    // Log all incoming request headers
console.log('Request Headers:', req.headers);

// Check if the 'cookie' header is present
if (req.headers.cookie) {
  console.log('Cookies:', req.headers.cookie);
} else {
  console.log('No cookies found in the request headers.');
}


  if (!sessionCookie) {
    return null; // No session found
  }

  // Optionally, decode or verify the session cookie here if needed
  return { sessionCookie: sessionCookie.value };
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

async function timingSafeEqual(a: Uint8Array, b: Uint8Array): Promise<boolean> {
  if (a.length !== b.length) {
    return false;
  }
  const result = new Uint8Array(a.length);
  for (let i = 0; i < a.length; i++) {
    result[i] = a[i] ^ b[i];
  }
  // Use a constant-time comparison to prevent timing attacks
  return result.reduce((acc, val) => acc | val, 0) === 0;
}
