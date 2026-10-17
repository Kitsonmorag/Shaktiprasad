// Builds assets/contribution-heatmap.svg in the neon blue/red threat theme.
// Live:   GH_USER=<username> GH_TOKEN=<token> node generate.js
// Sample: node generate.js --sample   (synthetic data, clearly labelled)
const fs = require('fs');
const path = require('path');

const BLUE = '#00E5FF', RED = '#FF2D55', GREEN = '#00FF9C', INK = '#E6EDF3', GREY = '#8B949E';
const SAMPLE = process.argv.includes('--sample');
const USER = process.env.GH_USER || 'your-github-username';
const OUT = path.join(__dirname, 'assets', 'contribution-heatmap.svg');

async function fetchDays() {
  const token = process.env.GH_TOKEN;
  if (!token) throw new Error('GH_TOKEN is required (or run with --sample)');
  const query = `query($u:String!){user(login:$u){contributionsCollection{contributionCalendar{totalContributions weeks{contributionDays{date contributionCount}}}}}}`;
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: { Authorization: `bearer ${token}`, 'Content-Type': 'application/json', 'User-Agent': 'heatmap-gen' },
    body: JSON.stringify({ query, variables: { u: USER } }),
  });
  const j = await res.json();
  if (!j.data || !j.data.user) throw new Error('GitHub API error: ' + JSON.stringify(j.errors || j));
  return j.data.user.contributionsCollection.contributionCalendar.weeks.map(w => w.contributionDays);
}

function sampleDays() {
  let s = 7; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const start = new Date(); start.setUTCDate(start.getUTCDate() - 52 * 7 - start.getUTCDay());
  return Array.from({ length: 53 }, (_, w) => Array.from({ length: 7 }, (_, d) => {
    const dt = new Date(start); dt.setUTCDate(start.getUTCDate() + w * 7 + d);
    return { date: dt.toISOString().slice(0, 10), contributionCount: rnd() < .45 ? 0 : Math.floor(rnd() * rnd() * 14) };
  }));
}

function build(weeks) {
  const days = weeks.flat();
  const total = days.reduce((a, d) => a + d.contributionCount, 0);
  const active = days.filter(d => d.contributionCount > 0).length;
  let best = 0, run = 0;
  for (const d of days) { run = d.contributionCount ? run + 1 : 0; best = Math.max(best, run); }
  const busiest = days.reduce((a, d) => (d.contributionCount > a.contributionCount ? d : a), days[0]);
  const max = Math.max(1, busiest.contributionCount);
  const level = c => (c === 0 ? 0 : Math.min(4, Math.ceil((c / max) * 4)));
  const fills = ['#141A22', '#0B4F5C', '#0795AB', BLUE, RED];
  const W = 1200, H = 410, x0 = 70, y0 = 140, cell = 16, gap = 4;
  let cells = '';
  weeks.forEach((wk, i) => wk.forEach((d, j) => {
    const l = level(d.contributionCount);
    cells += `<rect class="c" style="animation-delay:${(i * .035 + j * .01).toFixed(2)}s" x="${x0 + i * (cell + gap)}" y="${y0 + j * (cell + gap)}" width="${cell}" height="${cell}" rx="3" fill="${fills[l]}"${l >= 3 ? ` filter="url(#g)"` : ''}><title>${d.date}: ${d.contributionCount}</title></rect>`;
  }));
  const gridW = weeks.length * (cell + gap);
  const mono = `font-family="ui-monospace,SFMono-Regular,Menlo,Consolas,monospace"`;
  const stat = (x, n, l, c) => `<text ${mono} x="${x}" y="${y0 + 7 * (cell + gap) + 52}" font-size="30" font-weight="bold" fill="${c}">${n}</text><text ${mono} x="${x}" y="${y0 + 7 * (cell + gap) + 72}" font-size="11" letter-spacing="1.5" fill="${GREY}">${l}</text>`;
  const note = SAMPLE ? `<text ${mono} x="1152" y="50" text-anchor="end" font-size="11" letter-spacing="2" fill="${RED}">SAMPLE DATA · REPLACED BY WORKFLOW</text>` : `<text ${mono} x="1152" y="50" text-anchor="end" font-size="11" letter-spacing="2" fill="${GREY}">SOURCE: GITHUB CONTRIBUTION CALENDAR</text>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="GitHub contributions: ${total} in the last year, ${active} active days, longest streak ${best} days">
<title>Contribution heatmap for ${USER}</title>
<defs>
<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0D1218"/><stop offset="1" stop-color="#05070A"/></linearGradient>
<radialGradient id="gb" cx="10%" cy="10%" r="60%"><stop offset="0" stop-color="${BLUE}" stop-opacity=".2"/><stop offset="1" stop-color="${BLUE}" stop-opacity="0"/></radialGradient>
<radialGradient id="gr" cx="92%" cy="95%" r="55%"><stop offset="0" stop-color="${RED}" stop-opacity=".2"/><stop offset="1" stop-color="${RED}" stop-opacity="0"/></radialGradient>
<linearGradient id="sw" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${GREEN}" stop-opacity="0"/><stop offset="1" stop-color="${GREEN}" stop-opacity=".35"/></linearGradient>
<pattern id="scan" width="4" height="4" patternUnits="userSpaceOnUse"><rect width="4" height="1" fill="#fff" opacity=".035"/></pattern>
<filter id="g" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="2.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
<clipPath id="r"><rect width="${W}" height="${H}" rx="18"/></clipPath>
</defs>
<style>.c{transform-box:fill-box;transform-origin:center;animation:pop .6s cubic-bezier(.34,1.56,.64,1) both}@keyframes pop{from{opacity:0;transform:scale(.2)}to{opacity:1;transform:none}}@media (prefers-reduced-motion:reduce){.c{animation:none}}</style>
<g clip-path="url(#r)">
<rect width="${W}" height="${H}" fill="url(#bg)"/><rect width="${W}" height="${H}" fill="url(#gb)"/><rect width="${W}" height="${H}" fill="url(#gr)"/>
<text ${mono} x="48" y="50" font-size="12" letter-spacing="4" fill="${GREEN}">// 07 · ACTIVITY LOG</text>
<text ${mono} x="48" y="92" font-size="30" font-weight="bold" fill="${INK}">Commit heatmap</text>
<rect x="48" y="104" width="64" height="3" fill="${RED}"/><rect x="112" y="104" width="120" height="3" fill="${BLUE}"/>${note}
${cells}
<rect y="${y0 - 6}" width="90" height="${7 * (cell + gap) + 8}" fill="url(#sw)"><animate attributeName="x" values="${x0 - 90};${x0 + gridW};${x0 - 90}" dur="7s" repeatCount="indefinite"/></rect>
${stat(70, total, 'CONTRIBUTIONS / 12 MO', BLUE)}${stat(330, active, 'ACTIVE DAYS', RED)}${stat(530, best, 'LONGEST STREAK (DAYS)', BLUE)}${stat(790, busiest.contributionCount, 'BUSIEST DAY · ' + busiest.date, RED)}
<rect width="${W}" height="${H}" fill="url(#scan)"/>
</g>
<rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="17.5" fill="none" stroke="${GREY}" stroke-opacity=".25"/>
</svg>
`;
}

(async () => {
  const weeks = SAMPLE ? sampleDays() : await fetchDays();
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, build(weeks));
  console.log('wrote', OUT);
})().catch(e => { console.error(e.message); process.exit(1); });
