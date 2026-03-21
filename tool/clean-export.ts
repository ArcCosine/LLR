import fs from 'node:fs';
import path from 'node:path';

const inputFile = path.join(process.cwd(), 'public/export.xml');
const outputFile = path.join(process.cwd(), 'public/export.xml'); // Overwriting as requested to generate "new" version

async function checkUrl(url: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 10000);
    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
    });
    clearTimeout(id);
    // 2xx and 3xx are considered OK for our purpose (feeds might redirect)
    return response.status < 400;
  } catch (e) {
    try {
      // Fallback to GET for servers that block HEAD or other errors
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 10000);
      const response = await fetch(url, {
        method: 'GET',
        headers: { Range: 'bytes=0-0' },
        signal: controller.signal,
      });
      clearTimeout(id);
      return response.status < 400;
    } catch (e2) {
      return false;
    }
  }
}

async function main() {
  if (!fs.existsSync(inputFile)) {
    console.error(`Input file not found: ${inputFile}`);
    process.exit(1);
  }

  console.log(`Reading ${inputFile}...`);
  const content = fs.readFileSync(inputFile, 'utf-8');
  const lines = content.split('\n');
  
  const urlRegex = /xmlUrl="([^"]+)"/;
  const tasks: { index: number; url: string }[] = [];
  const results = new Map<number, boolean>();
  const excludeKeywords = ['twitter', 'favotter', 'twilog.org', 'hateblo','hatena']; // Add keywords here
  
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(urlRegex);
    if (match) {
      const url = match[1];
      const shouldExclude = excludeKeywords.some(keyword => url.toLowerCase().includes(keyword.toLowerCase()));
      if (shouldExclude) {
        // console.log(`Excluding URL by keyword: ${url}`);
        results.set(i, false);
      } else {
        tasks.push({ index: i, url });
      }
    }
  }
  
  console.log(`Found ${tasks.length} URLs to check after keyword filtering.`);
  
  const concurrency = 50; // Increased concurrency for speed
  
  for (let i = 0; i < tasks.length; i += concurrency) {
    const chunk = tasks.slice(i, i + concurrency);
    await Promise.all(chunk.map(async (task) => {
      const ok = await checkUrl(task.url);
      results.set(task.index, ok);
    }));
    
    const progress = Math.min(i + concurrency, tasks.length);
    const percent = ((progress / tasks.length) * 100).toFixed(1);
    process.stdout.write(`\rProgress: ${progress}/${tasks.length} (${percent}%)`);
  }
  console.log('\nFinished checking URLs.');
  
  const filteredLines = lines.filter((line, index) => {
    if (results.has(index)) {
      const ok = results.get(index);
      if (!ok) {
        // Log removed URLs for information
        // const url = line.match(urlRegex)?.[1];
        // console.log(`Removing inaccessible URL: ${url}`);
      }
      return ok;
    }
    return true; // Keep lines without xmlUrl (header, categories, footer)
  });

  // Also remove empty categories if needed. 
  // For now, just removing invalid leaf nodes as requested.
  
  console.log(`Original lines: ${lines.length}, New lines: ${filteredLines.length}`);
  
  // Backup old file just in case
  const backupFile = `${inputFile}.bak`;
  fs.copyFileSync(inputFile, backupFile);
  console.log(`Backup created: ${backupFile}`);
  
  fs.writeFileSync(outputFile, filteredLines.join('\n'));
  console.log(`Updated ${outputFile}`);
}

main().catch(console.error);
