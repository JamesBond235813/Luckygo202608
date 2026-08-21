import fs from 'fs';

const chunk = fs.readFileSync('C:/Users/9527/Desktop/yiyuango/go/luckygo-h5-new/me-chunk.txt', 'utf8');
const profileModal = fs
  .readFileSync('C:/Users/9527/Desktop/yiyuango/go/luckygo-h5-new/me-modals.txt', 'utf8')
  .replace(/motion\.div/g, 'motion.div'.replace('motion.', '') || 'motion.div')
  .replace(/<motion\.motion.div/g, '<motion.div')
  .replace(/motion\.motion/g, 'motion');

// fix accidental bad replace - read raw and fix motion.div -> div
const profileBlock = fs
  .readFileSync('C:/Users/9527/Desktop/yiyuango/go/luckygo-h5-new/me-modals.txt', 'utf8')
  .replace(/<\/?motion\.motion.div>/g, (m) => m.replace('motion.', ''))
  .replace(/motion\.motion\.div/g, 'motion.div')
  .replace(/<\/?motion\.motion.div/g, (m) => m.replace('motion.', ''))
  .replace(/motion\.div/g, 'motion.div');

const profileFixed = fs.readFileSync('C:/Users/9527/Desktop/yiyuango/go/luckygo-h5-new/me-modals.txt', 'utf8').replace(/motion\.motion.div/g, 'motion.div').replace(/motion\.motion.div/g, 'motion.div').replace(/motion\.div/g, 'motion.div');

console.log('chunk', chunk.length);
