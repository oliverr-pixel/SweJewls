// Packs the production build into one self-contained page (CSS + JS inlined, media copied next to it).
// Used for the shareable preview; the normal site is just `npm run build` → dist/.
import { readFileSync, writeFileSync, mkdirSync, cpSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const dist = 'dist';
const out = 'dist-artifact';
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

const html = readFileSync(join(dist, 'index.html'), 'utf8');
const assets = readdirSync(join(dist, 'assets'));
const css = assets.filter((f) => f.endsWith('.css')).map((f) => readFileSync(join(dist, 'assets', f), 'utf8')).join('\n');
const js = assets.filter((f) => f.endsWith('.js')).map((f) => readFileSync(join(dist, 'assets', f), 'utf8')).join('\n');

const body = html.split('<!--SWJ:BODY-START-->')[1].split('<!--SWJ:BODY-END-->')[0];
const fonts = html.match(/<link rel="stylesheet" href="https:\/\/fonts\.googleapis\.com[^>]+>/)[0];

const page = `<title>SweJewls</title>
<meta name="description" content="Iced Cuban-kedjor och armband. Silverarmband 250 kr, guldarmband 300 kr, halsband 350 kr.">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
${fonts}
<style>${css}</style>
${body}
<script type="module">${js.replace(/<\/script/gi, '<\\/script')}</script>
`;
writeFileSync(join(out, 'index.html'), page);
cpSync(join(dist, 'media'), join(out, 'media'), { recursive: true });
console.log(`artifact page: ${(page.length / 1024).toFixed(0)} KB`);
