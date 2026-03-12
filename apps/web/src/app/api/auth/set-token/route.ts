import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  const { token } = await req.json();

  if (!token) {
    return NextResponse.json({ error: "No token provided" }, { status: 400 });
  }

  const response = NextResponse.json({ ok: true });

  response.cookies.set("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });

  return response;
}

export async function GET() {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;
  
    if (!token) {
      return NextResponse.json({ authenticated: false, token: null });
    }
    console.log(token);
    return NextResponse.json({
      authenticated: true,
      token,
    });
  }
  
  