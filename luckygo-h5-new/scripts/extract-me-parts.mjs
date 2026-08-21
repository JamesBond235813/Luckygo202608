import fs from 'fs';

const jsonl = fs.readFileSync(
  'C:/Users/9527/.cursor/projects/c-Users-9527-Desktop-yiyuango-go/agent-transcripts/15bc91ac-d8f8-450a-9f24-b820a715aaf6/15bc91ac-d8f8-450a-9f24-b820a715aaf6.jsonl',
  'utf8',
);

const out = [];
for (const line of jsonl.split('\n')) {
  if (!line.includes('Me.tsx')) continue;
  try {
    const obj = JSON.parse(line);
    for (const c of obj?.message?.content ?? []) {
      if (!c?.input?.path?.includes('Me.tsx')) continue;
      for (const field of ['new_string', 'old_string', 'contents']) {
        const text = c?.input?.[field];
        if (typeof text !== 'string') continue;
        if (text.includes('const Me: React.FC') || text.includes('changeLanguage')) {
          out.push(`--- ${c.name} ${field} len=${text.length} ---\n${text}\n`);
        }
      }
    }
  } catch {
    // skip
  }
}

fs.writeFileSync('C:/Users/9527/Desktop/yiyuango/go/luckygo-h5-new/me-parts.txt', out.join('\n'));
console.log('parts', out.length, 'bytes', out.join('').length);
