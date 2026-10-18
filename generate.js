// Builds assets/contribution-heatmap.svg in the neon blue/red threat theme.
// Live:   GH_USER=<username> GH_TOKEN=<token> node generate.js
// Sample: node generate.js --sample   (synthetic data, clearly labelled)
const fs = require('fs');
const path = require('path');

const BLUE = '#1BF59B', RED = '#FF5C72', GREEN = '#B9FFDD', INK = '#EFFFF7', GREY = '#8FB8A5';
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

function rng(seed){let s=seed;return()=>(s=(s*16807)%2147483647)/2147483647;}

function build(weeks) {
  const days = weeks.flat();
  const total = days.reduce((a, d) => a + d.contributionCount, 0);
  const active = days.filter(d => d.contributionCount > 0).length;
  let best = 0, run = 0;
  for (const d of days) { run = d.contributionCount ? run + 1 : 0; best = Math.max(best, run); }
  const busiest = days.reduce((a, d) => (d.contributionCount > a.contributionCount ? d : a), days[0]);
  const max = Math.max(1, busiest.contributionCount);
  const level = c => (c === 0 ? 0 : Math.min(4, Math.ceil((c / max) * 4)));
  const fills = ['#0E1F17', '#0B5E41', '#10A474', BLUE, '#E2FFF1'];
  const W = 1200, H = 450, x0 = 70, y0 = 150, cell = 16, gap = 4, step = cell + gap;
  const R = rng(13);
  // volumetric blue rays
  let rays = '';
  const sx = 820;
  for (let i = 0; i < 7; i++) {
    const xe = sx + (i - 3) * 280, hw = 30 + R() * 40, d = 5 + R() * 5;
    rays += `<polygon points="${sx - 5},-20 ${sx + 5},-20 ${xe + hw},${H} ${xe - hw},${H}" fill="url(#rb)" opacity="0"><animate attributeName="opacity" values="0;.7;.2;.55;0" dur="${d.toFixed(1)}s" begin="-${(R() * d).toFixed(1)}s" repeatCount="indefinite"/></polygon>`;
  }
  // matrix rain
  let rain = '';
  const chars = 'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ0123456789ABCDEF/{}$#=+*';
  for (let i = 0; i < 24; i++) {
    const x = Math.round((i + .5) * W / 24 + (R() - .5) * 20), L = 9 + Math.floor(R() * 10), dur = 7 + R() * 9;
    let t = '';
    for (let j = 0; j < L; j++) t += `<tspan x="${x}" dy="14" fill-opacity="${(.04 + .5 * Math.pow(j / L, 2)).toFixed(2)}"${j === L - 1 ? ' fill="#EFFFF3"' : ''}>${chars[Math.floor(R() * chars.length)].replace('<', '&lt;')}</tspan>`;
    rain += `<g class="rain" style="animation-duration:${dur.toFixed(1)}s;animation-delay:-${(R() * dur).toFixed(1)}s"><text class="rt" x="${x}" y="0" font-size="12" fill="${GREEN}">${t}</text></g>`;
  }
  // moving cells
  let cells = '';
  weeks.forEach((wk, i) => wk.forEach((d, j) => {
    const l = level(d.contributionCount);
    const pd = (i * .035 + j * .01).toFixed(2);
    const bd = (3 + R() * 3.5).toFixed(1), bdel = (parseFloat(pd) + .7 + R() * 2).toFixed(2);
    cells += `<rect class="c l${l}" style="animation-delay:${pd}s,${bdel}s;animation-duration:.6s,${bd}s" x="${x0 + i * step}" y="${y0 + j * step}" width="${cell}" height="${cell}" rx="3" fill="${fills[l]}"${l >= 3 ? ` filter="url(#g)"` : ''}><title>${d.date}: ${d.contributionCount}</title></rect>`;
  }));
  const gridW = weeks.length * step, gridH = 7 * step;
  // serpentine packet-snake crawling the grid
  let pth = `M${x0 + 8} ${y0 + 8}`;
  weeks.forEach((_, i) => { const x = x0 + i * step + 8; pth += i % 2 === 0 ? ` H${x} V${y0 + 6 * step + 8}` : ` H${x} V${y0 + 8}`; });
  const plen = weeks.length * 6 * step + weeks.length * step, sdur = Math.round(plen / 240);
  let snake = '';
  for (let k = 0; k < 14; k++) {
    const sz = 15 - k * .6, col = k === 0 ? '#F2FFF5' : (k < 6 ? BLUE : '#10C48A'), op = Math.max(.15, 1 - k * .07);
    snake += `<rect x="${-sz / 2}" y="${-sz / 2}" width="${sz}" height="${sz}" rx="3" fill="${col}" opacity="${op.toFixed(2)}"${k < 4 ? ` filter="url(#g)"` : ''}><animateMotion dur="${sdur}s" begin="-${(k * .09).toFixed(2)}s" repeatCount="indefinite" path="${pth}"/></rect>`;
  }
  const mono = `class="m"`;
  const sy = y0 + gridH + 56;
  const stat = (x, n, l, c) => `<text ${mono} x="${x}" y="${sy}" font-size="32" font-weight="bold" fill="${c}" filter="url(#g)">${n}</text><text ${mono} x="${x}" y="${sy + 22}" font-size="11" letter-spacing="1.5" fill="${GREY}">${l}</text>`;
  const note = SAMPLE ? `<text ${mono} x="1152" y="50" text-anchor="end" font-size="11" letter-spacing="2" fill="${RED}">SAMPLE DATA · REPLACED BY WORKFLOW</text>` : `<text ${mono} x="1152" y="50" text-anchor="end" font-size="11" letter-spacing="2" fill="${GREY}">SOURCE: GITHUB CONTRIBUTION CALENDAR</text>`;
  const legend = [0, 1, 2, 3, 4].map((l, i) => `<rect x="${960 + i * 22}" y="${sy - 16}" width="16" height="16" rx="3" fill="${fills[l]}"/>`).join('') + `<text ${mono} x="940" y="${sy - 3}" text-anchor="end" font-size="11" fill="${GREY}">LOW</text><text ${mono} x="1080" y="${sy - 3}" font-size="11" fill="${GREY}">HIGH</text>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="GitHub contributions: ${total} in the last year, ${active} active days, longest streak ${best} days">
<title>Contribution heatmap for ${USER}</title>
<defs>
<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#07271B"/><stop offset=".55" stop-color="#04130D"/><stop offset="1" stop-color="#020A07"/></linearGradient>
<radialGradient id="gb" cx="10%" cy="10%" r="60%"><stop offset="0" stop-color="${BLUE}" stop-opacity=".22"/><stop offset="1" stop-color="${BLUE}" stop-opacity="0"/></radialGradient>
<radialGradient id="gr" cx="92%" cy="95%" r="55%"><stop offset="0" stop-color="#10C48A" stop-opacity=".22"/><stop offset="1" stop-color="#10C48A" stop-opacity="0"/></radialGradient>
<linearGradient id="rb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7DFFC0" stop-opacity=".24"/><stop offset=".6" stop-color="${BLUE}" stop-opacity=".06"/><stop offset="1" stop-color="${BLUE}" stop-opacity="0"/></linearGradient>
<linearGradient id="gl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".13"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
<linearGradient id="sh" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#D8FFE4" stop-opacity=".2"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
<linearGradient id="tg" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff"/><stop offset=".6" stop-color="#B8FFC9"/><stop offset="1" stop-color="${BLUE}"/></linearGradient>
<linearGradient id="sw" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${GREEN}" stop-opacity="0"/><stop offset="1" stop-color="${GREEN}" stop-opacity=".3"/></linearGradient>
<linearGradient id="glass" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#12301D"/><stop offset="1" stop-color="#061009"/></linearGradient>
<pattern id="scan" width="4" height="4" patternUnits="userSpaceOnUse"><rect width="4" height="1" fill="#fff" opacity=".035"/></pattern>
<filter id="g" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="2.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
<filter id="nz" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" seed="7" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter>
<clipPath id="r"><rect width="${W}" height="${H}" rx="18"/></clipPath>
</defs>
<style>
.sf{font-family:Georgia,'Times New Roman','Noto Serif','DejaVu Serif',serif}
.m{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;paint-order:stroke;stroke:#03060A;stroke-opacity:.9;stroke-width:2.6px;stroke-linejoin:round}
.rt{font-family:'MS Gothic','Hiragino Kaku Gothic ProN','Noto Sans Mono CJK JP','Noto Sans CJK JP',ui-monospace,Menlo,Consolas,monospace}
.rain{animation:rain linear infinite}@keyframes rain{from{transform:translateY(-320px)}to{transform:translateY(${H}px)}}
.c{transform-box:fill-box;transform-origin:center;animation-name:pop,bob;animation-fill-mode:backwards,none;animation-timing-function:cubic-bezier(.34,1.56,.64,1),ease-in-out;animation-iteration-count:1,infinite}
@keyframes pop{from{opacity:0;transform:scale(.2)}to{opacity:1;transform:none}}
@keyframes bob{0%,100%{transform:translateY(0) scale(1);opacity:.85}50%{transform:translateY(-3px) scale(1.12);opacity:1}}
.l0{animation-name:pop,bob0}@keyframes bob0{0%,100%{opacity:.55}50%{opacity:1}}
@media (prefers-reduced-motion:reduce){.c,.rain{animation:none}}
</style>
<g clip-path="url(#r)">
<rect width="${W}" height="${H}" fill="url(#bg)"/><rect width="${W}" height="${H}" fill="url(#gb)"/><rect width="${W}" height="${H}" fill="url(#gr)"/>
${rays}<g opacity=".4">${rain}</g>
<line x1="48" y1="46" x2="78" y2="46" stroke="${BLUE}" stroke-opacity=".7"/><text ${mono} x="90" y="50" font-size="12" letter-spacing="4" fill="${GREY}">ACTIVITY LOG</text>
<text class="sf" x="48" y="96" font-size="44" fill="#EFFFF7">Commit <tspan font-style="italic" fill="url(#tg)">heatmap.</tspan></text>
${note}
<rect x="${x0 - 14}" y="${y0 - 14}" width="${gridW + 22}" height="${gridH + 22}" rx="12" fill="url(#glass)" fill-opacity=".8" stroke="${BLUE}" stroke-opacity=".35"/>
${cells}
${snake}
${stat(70, total, 'CONTRIBUTIONS / 12 MO', BLUE)}${stat(330, active, 'ACTIVE DAYS', GREEN)}${stat(530, best, 'LONGEST STREAK (DAYS)', BLUE)}${stat(790, busiest.contributionCount, 'BUSIEST DAY · ' + busiest.date, GREEN)}${legend}
<rect width="${W}" height="${H * .45}" fill="url(#gl)"/>
<rect width="${W}" height="${H}" filter="url(#nz)" opacity=".035"/>
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
