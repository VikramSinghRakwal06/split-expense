import { NextResponse } from "next/server";
import { register } from "@/lib/server-api";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json(
      {
        timestamp: new Date().toISOString(),
        status: 400,
        error: "Bad Request",
        message: "Malformed request body",
        path: "/api/auth/register",
      },
      { status: 400 },
    );
  }

  const result = await register({
    email: body.email,
    password: body.password,
    fullName: body.fullName,
    phoneNumber: body.phoneNumber || undefined,
  });

  if (!result.ok) {
    return NextResponse.json(result.error, { status: result.status });
  }

  // Registration does not log the user in (auth-service's contract) — the
  // register page follows up with its own /api/auth/login call.
  return NextResponse.json(result.data, { status: 201 });
}
