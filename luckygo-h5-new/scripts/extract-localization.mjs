import fs from 'fs';

const jsonl = fs.readFileSync(
  'C:/Users/9527/.cursor/projects/c-Users-9527-Desktop-yiyuango-go/agent-transcripts/15bc91ac-d8f8-450a-9f24-b820a715aaf6/15bc91ac-d8f8-450a-9f24-b820a715aaf6.jsonl',
  'utf8',
);

for (const line of jsonl.split('\n')) {
  if (!line.includes('localization.ts')) continue;
  try {
    const obj = JSON.parse(line);
    const write = obj?.message?.content?.find?.((c) => c?.input?.path?.includes('localization.ts') && c?.input?.contents);
    if (write?.input?.contents) {
      console.log('FOUND', write.input.path, write.input.contents.length);
      fs.writeFileSync('C:/Users/9527/Desktop/yiyuango/go/luckygo-h5-new/src/lib/localization.ts', write.input.contents);
      process.exit(0);
    }
  } catch {
    // skip
  }
}

console.log('NOT FOUND');
