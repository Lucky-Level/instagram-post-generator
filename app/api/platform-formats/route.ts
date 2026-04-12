import { NextResponse } from "next/server";
import { getPlatformFormats } from "@/lib/platform-formats";

export async function GET() {
  return NextResponse.json(getPlatformFormats());
}
