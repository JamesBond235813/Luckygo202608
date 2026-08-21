import fs from 'fs';
import path from 'path';

const jsonlPath =
  'C:/Users/9527/.cursor/projects/c-Users-9527-Desktop-yiyuango-go/agent-transcripts/15bc91ac-d8f8-450a-9f24-b820a715aaf6/15bc91ac-d8f8-450a-9f24-b820a715aaf6.jsonl';
const root = 'C:/Users/9527/Desktop/yiyuango/go/luckygo-h5-new';

function relPath(p) {
  const n = p.replace(/\\/g, '/');
  const marker = 'luckygo-h5-new/';
  const idx = n.toLowerCase().indexOf(marker);
  return idx >= 0 ? n.slice(idx + marker.length) : null;
}

const jsonl = fs.readFileSync(jsonlPath, 'utf8');
const writes = new Map();
const replaces = [];

for (const line of jsonl.split('\n')) {
  try {
    const obj = JSON.parse(line);
    for (const c of obj?.message?.content ?? []) {
      const input = c?.input;
      if (!input?.path) continue;
      const rel = relPath(input.path);
      if (!rel) continue;

      if (c.name === 'Write' && typeof input.contents === 'string') {
        const prev = writes.get(rel);
        if (!prev || input.contents.length >= prev.length) {
          writes.set(rel, input.contents);
        }
      } else if (c.name === 'StrReplace' && input.old_string != null && input.new_string != null) {
        replaces.push({ rel, old_string: input.old_string, new_string: input.new_string });
      }
    }
  } catch {
    // skip
  }
}

function replay(rel) {
  let content = writes.get(rel);
  if (content == null) return null;
  for (const r of replaces) {
    if (r.rel !== rel) continue;
    if (content.includes(r.old_string)) {
      content = content.replace(r.old_string, r.new_string);
    }
  }
  return content;
}

const targets = process.argv.slice(2).length
  ? process.argv.slice(2)
  : [
      'src/lib/localization.ts',
      'src/App.tsx',
      'src/pages/Me.tsx',
      'src/pages/Home.tsx',
      'src/pages/ProductDetails.tsx',
      'src/pages/Transactions.tsx',
      'src/hooks/useInviteRewardsConfig.ts',
    ];

for (const rel of targets) {
  const content = replay(rel);
  if (!content) {
    console.log('MISSING', rel);
    continue;
  }
  const full = path.join(root, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content);
  console.log('RESTORED', rel, content.length);
}
