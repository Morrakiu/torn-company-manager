'use strict';
// Rebuild Torn_Company_Manager.min.user.js. Requires terser: npm install terser
const fs = require('fs');
const { minify } = require('terser');

const root = require('path').join(__dirname, '..');
const srcPath = process.argv[2] || require('path').join(root, 'Torn_Company_Manager.user.js');
const outPath = process.argv[3] || require('path').join(root, 'Torn_Company_Manager.min.user.js');
const src = fs.readFileSync(srcPath, 'utf8');
const marker = '// ==/UserScript==';
const cut = src.indexOf(marker);
if (cut < 0) throw new Error('header missing');
let header = src.slice(0, cut + marker.length);
const body = src.slice(cut + marker.length);
header = header
  .replace(/Torn_Company_Manager\.user\.js/g, 'Torn_Company_Manager.min.user.js')
  .replace('@name         TCM ALPHA', '@name         TCM ALPHA (min)');

(async () => {
  const result = await minify(body, {
    compress: { passes: 2, drop_debugger: true, ecma: 2020 },
    mangle: { toplevel: false },
    ecma: 2020,
    format: { comments: false, ecma: 2020 }
  });
  if (!result.code) throw new Error('terser produced no code');
  const out = header + '\n' + result.code + '\n';
  fs.writeFileSync(outPath, out);
  console.log(JSON.stringify({
    inBytes: Buffer.byteLength(src),
    outBytes: Buffer.byteLength(out),
    outLines: out.split('\n').length
  }));
})().catch(e => { console.error(e); process.exit(1); });
