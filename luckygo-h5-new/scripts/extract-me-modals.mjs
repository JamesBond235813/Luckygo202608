import fs from 'fs';

const jsonl = fs.readFileSync(
  'C:/Users/9527/.cursor/projects/c-Users-9527-Desktop-yiyuango-go/agent-transcripts/15bc91ac-d8f8-450a-9f24-b820a715aaf6/15bc91ac-d8f8-450a-9f24-b820a715aaf6.jsonl',
  'utf8',
);

const needle = "modal === 'profile'";
let best = '';
for (const line of jsonl.split('\n')) {
  if (!line.includes('Me.tsx') || !line.includes(needle)) continue;
  try {
    const obj = JSON.parse(line);
    for (const c of obj?.message?.content ?? []) {
      for (const field of ['new_string', 'old_string', 'contents']) {
        const text = c?.input?.[field];
        if (typeof text === 'string' && text.includes(needle) && text.length > best.length) {
          best = text;
        }
      }
    }
  } catch {
    // skip
  }
}
console.log('len', best.length);
if (best) fs.writeFileSync('C:/Users/9527/Desktop/yiyuango/go/luckygo-h5-new/me-modals.txt', best);
