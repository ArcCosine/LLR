import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "URL is required" }, { status: 400 });
  }

  try {
    const response = await fetch(url);
    const data = await response.text();
    return new NextResponse(data, {
      headers: { "Content-Type": "application/xml" },
    });
  } catch (_error) {
    return NextResponse.json({ error: "Failed to fetch RSS" }, { status: 500 });
  }
}
