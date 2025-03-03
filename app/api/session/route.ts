import { NextRequest, NextResponse } from 'next/server';
import { parse } from 'cookie';
import jwt from 'jsonwebtoken';

// Define the session API route
export async function GET(req: NextRequest) {
  try {
    // Retrieve cookies from the request
    const cookieHeader = req.headers.get('cookie') || "";
    const cookies = parse(cookieHeader);
    const sessionCookie = cookies.session;

    if (!sessionCookie) {
      return NextResponse.json({ error: 'Session not found' }, { status: 401 });
    }

    // Verify JWT token
    const decodedToken = jwt.verify(sessionCookie, process.env.JWT_SECRET);

    // Return only the session data (user info or payload) from the decoded token
    return NextResponse.json({ session: decodedToken });
  } catch (error) {
    // Check for specific JWT errors like token expiration
    if (error instanceof jwt.TokenExpiredError) {
      return NextResponse.json({ error: 'Session expired' }, { status: 401 });
    }

    // Generic error handling
    return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
  }
}
