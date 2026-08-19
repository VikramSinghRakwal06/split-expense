import { NextResponse } from "next/server";
import { login } from "@/lib/server-api";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body?.email || !body?.password) {
    return NextResponse.json(
      {
        timestamp: new Date().toISOString(),
        status: 400,
        error: "Bad Request",
        message: "Email and password are required.",
        path: "/api/auth/login",
      },
      { status: 400 },
    );
  }

  const result = await login(body.email, body.password);

  if (!result.ok) {
    return NextResponse.json(result.error, { status: result.status });
  }

  // Only the profile goes to the browser — the tokens themselves were already
  // written as httpOnly cookies inside login(), never touching this response body.
  return NextResponse.json(result.data.user, { status: 200 });
}
