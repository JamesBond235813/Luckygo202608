import fs from 'fs';

const jsonl = fs.readFileSync(
  'C:/Users/9527/.cursor/projects/c-Users-9527-Desktop-yiyuango-go/agent-transcripts/15bc91ac-d8f8-450a-9f24-b820a715aaf6/15bc91ac-d8f8-450a-9f24-b820a715aaf6.jsonl',
  'utf8',
);

const target = process.argv[2] || 'Home.tsx';
let best = '';

for (const line of jsonl.split('\n')) {
  if (!line.includes(target)) continue;
  try {
    const obj = JSON.parse(line);
    const text = JSON.stringify(obj);
    // Read tool results often embed file contents in user message
    const chunks = obj?.message?.content ?? [];
    for (const c of chunks) {
      if (c.type === 'text' && typeof c.text === 'string' && c.text.includes('import ') && c.text.includes(target)) {
        if (c.text.length > best.length) best = c.text;
      }
    }
  } catch {
    // skip
  }
}

console.log('best len', best.length);
if (best.length > 500) {
  // strip markdown fences if present
  const m = best.match(/```(?:tsx|typescript|ts)?\n([\s\S]*?)```/);
  const body = m ? m[1] : best;
  fs.writeFileSync(`C:/Users/9527/Desktop/yiyuango/go/luckygo-h5-new/src/pages/${target}`, body);
  console.log('wrote', target);
}
