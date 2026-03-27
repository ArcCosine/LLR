import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "URL is required" }, { status: 400 });
  }

  try {
    const response = await fetch(url, {
      next: { revalidate: 300 }, // Cache for 5 minutes in Next.js
    });

    const buffer = await response.arrayBuffer();
    
    // 1. Try to get charset from Content-Type header
    const contentType = response.headers.get("content-type");
    let charsetMatch = contentType?.match(/charset=([^;]+)/i);
    let charset = charsetMatch ? charsetMatch[1] : null;

    // 2. If not in header, peek at the XML declaration
    if (!charset) {
      // Decode a small part of the beginning as UTF-8 (ASCII-compatible) to find the encoding attribute
      const peekDecoder = new TextDecoder("utf-8");
      const peekString = peekDecoder.decode(new Uint8Array(buffer.slice(0, 1024)));
      const encodingMatch = peekString.match(/<\?xml[^?>]+encoding=["']([^"']+)["']/i);
      if (encodingMatch) {
        charset = encodingMatch[1];
      }
    }

    // Default to utf-8
    charset = charset || "utf-8";

    try {
      const decoder = new TextDecoder(charset);
      let data = decoder.decode(buffer);
      
      // If we decoded from a non-utf-8 charset, update the XML declaration to reflect that it's now utf-8
      if (charset.toLowerCase() !== "utf-8" && charset.toLowerCase() !== "utf8") {
        data = data.replace(/(<\?xml[^?>]+encoding=["'])([^"']*)(["'])/i, "$1utf-8$3");
      }

      return new NextResponse(data, {
        headers: { 
          "Content-Type": "application/xml; charset=utf-8",
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        },
      });
    } catch (_decodeError) {
      // Fallback to utf-8 if the detected charset is invalid
      const decoder = new TextDecoder("utf-8");
      const data = decoder.decode(buffer);
      return new NextResponse(data, {
        headers: { 
          "Content-Type": "application/xml; charset=utf-8",
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        },
      });
    }
  } catch (_error) {
    return NextResponse.json({ error: "Failed to fetch RSS" }, { status: 500 });
  }
}
