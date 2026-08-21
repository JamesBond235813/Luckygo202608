import fs from 'fs';

const jsonl = fs.readFileSync(
  'C:/Users/9527/.cursor/projects/c-Users-9527-Desktop-yiyuango-go/agent-transcripts/15bc91ac-d8f8-450a-9f24-b820a715aaf6/15bc91ac-d8f8-450a-9f24-b820a715aaf6.jsonl',
  'utf8',
);

const target = process.argv[2] || 'Me.tsx';
let last = null;

for (const line of jsonl.split('\n')) {
  if (!line.includes(target)) continue;
  try {
    const obj = JSON.parse(line);
    for (const c of obj?.message?.content ?? []) {
      const p = c?.input?.path ?? '';
      if (p.includes(target) && c?.input?.contents) {
        last = { path: p, contents: c.input.contents };
      }
    }
  } catch {
    // skip
  }
}

if (last) {
  const out = last.path.replace(/^c:[\\/]/i, 'C:/Users/9527/Desktop/yiyuango/go/').replace(/\//g, '\\');
  const normalized = last.path.includes('Me.tsx')
    ? 'C:/Users/9527/Desktop/yiyuango/go/luckygo-h5-new/src/pages/Me.tsx'
    : last.path;
  fs.writeFileSync(normalized, last.contents);
  console.log('WROTE', normalized, last.contents.length);
} else {
  console.log('NOT FOUND', target);
}
