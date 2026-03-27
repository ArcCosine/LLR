import fs from 'fs';
import { parse } from 'node-html-parser';

const INPUT_FILE = 'public/export.xml';
const OUTPUT_FILE = 'public/export-cleaned.xml';
const FILTER_YEAR = 2020;

async function fetchLatestDate(url: string): Promise<Date | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;

    const buffer = await response.arrayBuffer();
    
    // Simple encoding detection
    const peekDecoder = new TextDecoder("utf-8");
    const peekString = peekDecoder.decode(new Uint8Array(buffer.slice(0, 1024)));
    const encodingMatch = peekString.match(/<\?xml[^?>]+encoding=["']([^"']+)["']/i);
    const charset = encodingMatch ? encodingMatch[1] : "utf-8";

    const decoder = new TextDecoder(charset);
    const xmlText = decoder.decode(buffer);
    const root = parse(xmlText);

    // Try various date tags
    const dates = [
      ...root.querySelectorAll('pubDate'),
      ...root.querySelectorAll('published'),
      ...root.querySelectorAll('updated'),
      ...root.querySelectorAll('lastBuildDate'),
      ...root.querySelectorAll('dc\\:date'), // handle dc:date
      ...root.querySelectorAll('date'),
    ];

    let latest: Date | null = null;
    for (const d of dates) {
      const parsed = new Date(d.textContent);
      if (!isNaN(parsed.getTime())) {
        if (!latest || parsed > latest) latest = parsed;
      }
    }

    // Fallback: If no date tags found, check individual items
    if (!latest) {
       const items = [...root.querySelectorAll('item'), ...root.querySelectorAll('entry')];
       for (const item of items) {
           const itemDates = [
               ...item.querySelectorAll('pubDate'),
               ...item.querySelectorAll('published'),
               ...item.querySelectorAll('updated'),
               ...item.querySelectorAll('dc\\:date'),
               ...item.querySelectorAll('date'),
           ];
           for (const id of itemDates) {
               const parsed = new Date(id.textContent);
               if (!isNaN(parsed.getTime())) {
                   if (!latest || parsed > latest) latest = parsed;
               }
           }
       }
    }

    return latest;
  } catch (e) {
    // console.warn(`Failed to fetch/parse ${url}:`, e);
    return null;
  }
}

async function run() {
  console.log(`Reading ${INPUT_FILE}...`);
  const opmlText = fs.readFileSync(INPUT_FILE, 'utf-8');
  const root = parse(opmlText);
  const outlines = root.querySelectorAll('outline[xmlUrl]');

  console.log(`Found ${outlines.length} subscriptions. Checking update dates...`);

  const activeOutlines: string[] = [];
  const removedOutlines: string[] = [];
  const errorOutlines: string[] = [];

  // Use a pool to avoid hitting rate limits too hard
  const concurrency = 10;
  for (let i = 0; i < outlines.length; i += concurrency) {
    const chunk = outlines.slice(i, i + concurrency);
    await Promise.all(chunk.map(async (outline) => {
      const xmlUrl = outline.getAttribute('xmlUrl');
      const title = outline.getAttribute('title') || outline.getAttribute('text');
      
      if (!xmlUrl) return;

      const latestDate = await fetchLatestDate(xmlUrl);
      
      if (!latestDate) {
        // If we can't get a date, we'll keep it for now but mark it as suspicious
        // Or we could decide to remove it. Let's keep it but log it.
        errorOutlines.push(`${title} (${xmlUrl})`);
        activeOutlines.push(outline.toString());
      } else if (latestDate.getFullYear() < FILTER_YEAR) {
        removedOutlines.push(`${title} [Last updated: ${latestDate.getFullYear()}] (${xmlUrl})`);
      } else {
        activeOutlines.push(outline.toString());
      }
    }));
    console.log(`Progress: ${Math.min(i + concurrency, outlines.length)}/${outlines.length}`);
  }

  console.log(`\nResults:`);
  console.log(`- Kept: ${activeOutlines.length}`);
  console.log(`- Removed (Pre-${FILTER_YEAR}): ${removedOutlines.length}`);
  console.log(`- Errors (Kept): ${errorOutlines.length}`);

  // Construct new OPML
  const newOpml = `<?xml version="1.0" encoding="utf-8"?>
<opml version="1.0">
<head>
    <title>Filtered Subscriptions</title>
    <dateCreated>${new Date().toISOString()}</dateCreated>
</head>
<body>
<outline title="Subscriptions">
    ${activeOutlines.join('\n    ')}
</outline>
</body>
</opml>`;

  fs.writeFileSync(OUTPUT_FILE, newOpml);
  console.log(`\nFiltered OPML saved to ${OUTPUT_FILE}`);
  
  if (removedOutlines.length > 0) {
    console.log("\nSample removed blogs:");
    removedOutlines.slice(0, 10).forEach(o => console.log(`  - ${o}`));
  }
}

run();
