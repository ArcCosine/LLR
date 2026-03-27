import fs from 'fs';
import { parse } from 'node-html-parser';

const INPUT_FILE = 'public/export.xml';
const OUTPUT_FILE = 'public/export-cleaned-v2.xml';

// 無条件で削除するドメイン
const BLACKLIST_DOMAINS = [
  'blog.excite.co.jp',
  'my.opera.com',
  'd.hatena.ne.jp',
  'www.nicovideo.jp'
];

async function fetchArticleCount(url: string): Promise<number> {
  try {
    const response = await fetch(url);
    if (!response.ok) return 0;

    const buffer = await response.arrayBuffer();
    
    // エンコーディングの判定
    const peekDecoder = new TextDecoder("utf-8");
    const peekString = peekDecoder.decode(new Uint8Array(buffer.slice(0, 1024)));
    const encodingMatch = peekString.match(/<\?xml[^?>]+encoding=["']([^"']+)["']/i);
    const charset = encodingMatch ? encodingMatch[1] : "utf-8";

    const decoder = new TextDecoder(charset);
    const xmlText = decoder.decode(buffer);
    const root = parse(xmlText);

    // RSS (item) または Atom (entry) の数をカウント
    const items = root.querySelectorAll('item');
    const entries = root.querySelectorAll('entry');
    
    return items.length + entries.length;
  } catch (e) {
    return 0; // 取得失敗も0件扱いとする
  }
}

async function run() {
  console.log(`Reading ${INPUT_FILE}...`);
  const opmlText = fs.readFileSync(INPUT_FILE, 'utf-8');
  const root = parse(opmlText);
  const outlines = root.querySelectorAll('outline[xmlUrl]');

  console.log(`Found ${outlines.length} subscriptions. Cleaning up...`);

  const activeOutlines: string[] = [];
  const removedByDomain: string[] = [];
  const removedByEmpty: string[] = [];

  // 並行実行の制御
  const concurrency = 15;
  for (let i = 0; i < outlines.length; i += concurrency) {
    const chunk = outlines.slice(i, i + concurrency);
    await Promise.all(chunk.map(async (outline) => {
      const xmlUrl = outline.getAttribute('xmlUrl') || '';
      const title = outline.getAttribute('title') || outline.getAttribute('text') || 'No Title';
      
      if (!xmlUrl) return;

      // 1. 無条件削除ドメインのチェック
      const isBlacklisted = BLACKLIST_DOMAINS.some(domain => xmlUrl.includes(domain));
      if (isBlacklisted) {
        removedByDomain.push(`${title} (${xmlUrl})`);
        return;
      }

      // 2. 記事数のチェック
      const count = await fetchArticleCount(xmlUrl);
      if (count === 0) {
        removedByEmpty.push(`${title} (${xmlUrl})`);
      } else {
        activeOutlines.push(outline.toString());
      }
    }));
    console.log(`Progress: ${Math.min(i + concurrency, outlines.length)}/${outlines.length}`);
  }

  console.log(`\nResults:`);
  console.log(`- Kept: ${activeOutlines.length}`);
  console.log(`- Removed (Blacklisted Domain): ${removedByDomain.length}`);
  console.log(`- Removed (0 Articles/Error): ${removedByEmpty.length}`);

  const newOpml = `<?xml version="1.0" encoding="utf-8"?>
<opml version="1.0">
<head>
    <title>Cleaned Subscriptions</title>
    <dateCreated>${new Date().toISOString()}</dateCreated>
</head>
<body>
<outline title="Subscriptions">
    ${activeOutlines.join('\n    ')}
</outline>
</body>
</opml>`;

  fs.writeFileSync(OUTPUT_FILE, newOpml);
  console.log(`\nCleaned OPML saved to ${OUTPUT_FILE}`);
}

run();
