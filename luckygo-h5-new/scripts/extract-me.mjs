import fs from 'fs';

const jsonl = fs.readFileSync(
  'C:/Users/9527/.cursor/projects/c-Users-9527-Desktop-yiyuango-go/agent-transcripts/15bc91ac-d8f8-450a-9f24-b820a715aaf6/15bc91ac-d8f8-450a-9f24-b820a715aaf6.jsonl',
  'utf8',
);

const rel = 'src/pages/Me.tsx';
const writes = new Map();
const replaces = [];

function relPath(p) {
  const n = p.replace(/\\/g, '/');
  const idx = n.toLowerCase().indexOf('luckygo-h5-new/');
  return idx >= 0 ? n.slice(idx + 'luckygo-h5-new/'.length) : null;
}

for (const line of jsonl.split('\n')) {
  try {
    const obj = JSON.parse(line);
    for (const c of obj?.message?.content ?? []) {
      const input = c?.input;
      if (!input?.path) continue;
      const r = relPath(input.path);
      if (r !== rel) continue;
      if (c.name === 'Write' && typeof input.contents === 'string') {
        const prev = writes.get(r);
        if (!prev || input.contents.length >= prev.length) writes.set(r, input.contents);
      } else if (c.name === 'StrReplace') {
        replaces.push({ old: input.old_string, neu: input.new_string });
      }
    }
  } catch {
    // skip
  }
}

console.log('writes', [...writes.entries()].map(([k, v]) => [k, v.length]));
console.log('replaces', replaces.length);

// Try replay on largest write base
let content = writes.get(rel) ?? '';
for (const { old, neu } of replaces) {
  if (content && old && content.includes(old)) {
    content = content.replace(old, neu);
  }
}

// Also try: find any replace where new_string looks like full component file
let largestNeu = '';
for (const { neu } of replaces) {
  if (typeof neu === 'string' && neu.includes('meGuestTitle') && neu.length > largestNeu.length) {
    largestNeu = neu;
  }
}
console.log('largest neu with meGuestTitle', largestNeu.length);

if (content.length > 1000 && content.trimStart().startsWith('import')) {
  fs.writeFileSync('C:/Users/9527/Desktop/yiyuango/go/luckygo-h5-new/src/pages/Me.tsx', content);
  console.log('WROTE replay', content.length);
} else if (largestNeu.trimStart().startsWith('import')) {
  fs.writeFileSync('C:/Users/9527/Desktop/yiyuango/go/luckygo-h5-new/src/pages/Me.tsx', largestNeu);
  console.log('WROTE largestNeu', largestNeu.length);
} else {
  // Find line with biggest new_string for Me.tsx
  let best = '';
  for (const line of jsonl.split('\n')) {
    if (!line.includes('Me.tsx')) continue;
    try {
      const obj = JSON.parse(line);
      for (const c of obj?.message?.content ?? []) {
        if (!c?.input?.path?.includes('Me.tsx')) continue;
        const neu = c?.input?.new_string;
        if (typeof neu === 'string' && neu.length > best.length) best = neu;
      }
    } catch {
      // skip
    }
  }
  console.log('overall best new_string', best.length, best.slice(0, 80));
  if (best.length > 5000) {
    fs.writeFileSync('C:/Users/9527/Desktop/yiyuango/go/luckygo-h5-new/me-chunk.txt', best);
  }
}
