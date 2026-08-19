import { NextResponse } from "next/server";
import { logout } from "@/lib/server-api";

export async function POST() {
  await logout();
  return new NextResponse(null, { status: 204 });
}
