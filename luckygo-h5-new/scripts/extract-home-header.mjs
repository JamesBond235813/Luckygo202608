import fs from 'fs';
const lines = fs.readFileSync(process.argv[2], 'utf8').split('\n');
const o = JSON.parse(lines[3672]);
const w = o.message.content.find((c) => c.name === 'Write' && c.input.path.includes('Home.tsx'));
const s = w.input.contents;
const i = s.indexOf('<header');
console.log(s.slice(i, i + 500));
const j = s.indexOf('<motion.div className="space-y-5');
if (j < 0) {
  const k = s.indexOf('<motion.div className="space-y-5 px-4 pt-3');
  console.log('---content---');
  console.log(s.slice(k, k + 200));
}
const k2 = s.indexOf('space-y-5 px-4');
console.log('---content2---');
console.log(s.slice(k2 - 50, k2 + 150));
