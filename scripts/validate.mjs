// Checks content/ without building. Run with: npm run validate
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadContent } from './lib/content.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { collections, errors } = loadContent(root);
if (errors.length) {
  console.error(`\nFound ${errors.length} problem(s) in your content:\n`);
  for (const e of errors) console.error(`  - ${e}`);
  console.error('\nFix these, then run "npm run validate" again.\n');
  process.exit(1);
}
const n = (k) => collections[k].length;
console.log(`Content OK: ${n('theory-of-the-mind')} Theory of the Mind pictures, ${n('postcards')} postcards, ${n('postcard-options')} postcard picture options published.`);
