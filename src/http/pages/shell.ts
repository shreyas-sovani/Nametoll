import { escapeHtml } from "./escape.ts";

export type ProductPath = "/" | "/landing" | "/app" | "/desks" | "/register" | "/docs";

export type ShellOptions = {
  title: string;
  description: string;
  path: ProductPath;
  body: string;
};

const FAVICON = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="7" fill="#faf9f5"/><circle cx="16" cy="16" r="8.5" fill="none" stroke="#c96442" stroke-width="2.5"/><circle cx="16" cy="16" r="3.4" fill="#c96442"/></svg>`,
)}`;

export const PRODUCT_CSS = `
:root {
  --bone: #faf9f5;
  --ivory: #f0eee6;
  --paper: #ffffff;
  --ink: #1f1e1d;
  --mute: #6e6b64;
  --faint: #9b978c;
  --line: #e5e1d8;
  --line-2: #d6d1c4;
  --clay: #c96442;
  --clay-deep: #a84e33;
  --clay-dim: rgba(201,100,66,0.09);
  --sage: #2e7d4f;
  --sage-dim: rgba(46,125,79,0.09);
  --rust: #c25445;
  --rust-dim: rgba(194,84,69,0.08);
  --display: "Newsreader", Georgia, "Times New Roman", serif;
  --body: "Instrument Sans", "Segoe UI", sans-serif;
  --mono: "IBM Plex Mono", ui-monospace, Menlo, monospace;
  --shadow: 0 1px 2px rgba(31,30,29,0.04), 0 8px 24px rgba(31,30,29,0.05);
  --shadow-lg: 0 1px 2px rgba(31,30,29,0.05), 0 20px 48px rgba(31,30,29,0.09);
}
*, *::before, *::after { box-sizing: border-box; }
html { color-scheme: light; scroll-behavior: smooth; }
body {
  margin: 0;
  min-height: 100vh;
  background: var(--bone);
  color: var(--ink);
  font-family: var(--body);
  font-size: 1rem;
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
}
body::before {
  content: "";
  position: fixed;
  inset: 0;
  z-index: -1;
  background:
    radial-gradient(1000px 460px at 16% -14%, rgba(201,100,66,0.055), transparent 62%),
    radial-gradient(760px 520px at 96% 6%, rgba(46,125,79,0.035), transparent 58%);
  pointer-events: none;
}
a { color: var(--ink); }
::selection { background: rgba(201,100,66,0.22); }
code, kbd { font-family: var(--mono); font-size: 0.85em; color: var(--clay-deep); background: var(--ivory); padding: 0.08em 0.35em; border-radius: 0.3em; }
.skip {
  position: absolute;
  left: 0.75rem;
  top: -3rem;
  background: var(--clay);
  color: #fff;
  padding: 0.4rem 0.7rem;
  z-index: 30;
  transition: top 0.15s ease;
}
.skip:focus { top: 0.75rem; }

/* ---------- chrome ---------- */
.top {
  position: sticky;
  top: 0;
  z-index: 20;
  background: rgba(250,249,245,0.85);
  -webkit-backdrop-filter: blur(12px);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--line);
}
.top-inner {
  width: min(76rem, calc(100% - 2rem));
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  min-height: 4rem;
}
.brand {
  font-family: var(--display);
  font-size: 1.4rem;
  letter-spacing: 0.005em;
  color: var(--ink);
  text-decoration: none;
  display: flex;
  align-items: center;
  gap: 0.6rem;
}
.brand:hover { color: var(--clay-deep); }
.brand .mark {
  width: 1.1rem;
  height: 1.1rem;
  border-radius: 50%;
  border: 2.5px solid var(--clay);
  display: inline-block;
  position: relative;
  flex: 0 0 auto;
}
.brand .mark::after {
  content: "";
  position: absolute;
  inset: 3.5px;
  border-radius: 50%;
  background: var(--clay);
}
.nav {
  display: flex;
  align-items: center;
  gap: 0.35rem 1.5rem;
  font-size: 0.93rem;
}
.nav a {
  color: var(--mute);
  text-decoration: none;
  padding: 0.25rem 0;
  position: relative;
  transition: color 0.18s ease;
}
.nav a::after {
  content: "";
  position: absolute;
  left: 0;
  right: 100%;
  bottom: 0;
  height: 1.5px;
  background: var(--clay);
  transition: right 0.22s cubic-bezier(0.22,1,0.36,1);
}
.nav a:hover, .nav a[aria-current="page"] { color: var(--ink); }
.nav a:hover::after, .nav a[aria-current="page"]::after { right: 0; }
.nav-cta {
  display: inline-flex;
  align-items: center;
  background: var(--clay);
  color: #fff !important;
  font-weight: 600;
  padding: 0.45rem 1rem;
  border-radius: 999px;
  text-decoration: none;
  transition: transform 0.15s ease, box-shadow 0.2s ease, background 0.2s ease;
}
.nav-cta::after { display: none; }
.nav-cta:hover {
  color: #fff !important;
  background: var(--clay-deep);
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(201,100,66,0.28);
}
.wrap {
  width: min(76rem, calc(100% - 2rem));
  margin: 0 auto;
  padding: 3rem 0 4.5rem;
}
.site-foot {
  border-top: 1px solid var(--line);
  padding: 1.5rem 0 2.4rem;
  color: var(--faint);
  font-size: 0.85rem;
  font-family: var(--mono);
}
.site-foot .wrap {
  padding: 0;
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}
.site-foot a { color: var(--mute); text-decoration: none; border-bottom: 1px dotted var(--line-2); }
.site-foot a:hover { color: var(--clay-deep); border-bottom-color: var(--clay); }

/* ---------- lamps ---------- */
.lamp {
  width: 0.75rem;
  height: 0.75rem;
  border-radius: 50%;
  background: var(--line-2);
  display: inline-block;
  flex: 0 0 auto;
  transition: background 0.25s ease, box-shadow 0.25s ease;
}
.lamp[data-state="allow"], .lamp[data-state="settled"] {
  background: var(--sage);
  box-shadow: 0 0 0 3px var(--sage-dim);
}
.lamp[data-state="deny"], .lamp[data-state="error"] {
  background: var(--rust);
  box-shadow: 0 0 0 3px var(--rust-dim);
}
.lamp[data-state="busy"], .lamp[data-state="unpaid"], .lamp.hero-lamp {
  background: var(--clay);
  box-shadow: 0 0 0 3px var(--clay-dim);
}
.lamp[data-state="busy"] { animation: lamp-pulse 1.05s ease-in-out infinite; }
@keyframes lamp-pulse { 50% { opacity: 0.35; } }

/* ---------- controls ---------- */
button, .btn {
  font-family: var(--body);
  font-size: 0.92rem;
  font-weight: 600;
  border: 0;
  cursor: pointer;
  padding: 0.55rem 1.1rem;
  background: var(--ink);
  color: var(--bone);
  border-radius: 999px;
  transition: transform 0.15s ease, box-shadow 0.2s ease, background 0.2s ease;
}
button:hover, .btn:hover { transform: translateY(-1px); background: #33312e; box-shadow: var(--shadow); }
button:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }
button.pay { background: var(--clay); color: #fff; }
button.pay:hover { background: var(--clay-deep); box-shadow: 0 6px 20px rgba(201,100,66,0.3); }
button.ghost, .btn.ghost {
  background: transparent;
  color: var(--ink);
  box-shadow: inset 0 0 0 1px var(--line-2);
}
button.ghost:hover, .btn.ghost:hover { box-shadow: inset 0 0 0 1px var(--clay); color: var(--clay-deep); background: transparent; }
button[aria-busy="true"] { opacity: 0.75; }
button:focus-visible, a:focus-visible, input:focus-visible, select:focus-visible {
  outline: 2px solid var(--clay);
  outline-offset: 2px;
}

/* ---------- type ---------- */
.eyebrow {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  font-family: var(--mono);
  font-size: 0.72rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--faint);
  margin: 0 0 1rem;
}
h1 {
  font-family: var(--display);
  font-weight: 400;
  font-size: clamp(2.7rem, 6.4vw, 4.8rem);
  line-height: 0.98;
  letter-spacing: -0.015em;
  margin: 0 0 1.1rem;
  color: var(--ink);
}
h1 em, .it { font-style: italic; color: var(--clay-deep); }
h2 {
  font-family: var(--display);
  font-weight: 400;
  font-size: 1.9rem;
  letter-spacing: -0.01em;
  margin: 0 0 0.55rem;
}
h3 {
  font-family: var(--mono);
  font-size: 0.72rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--faint);
  margin: 0 0 0.55rem;
  font-weight: 500;
}
.lede {
  font-size: 1.15rem;
  max-width: 40rem;
  margin: 0 0 1.7rem;
  color: var(--mute);
}

/* ---------- reveals ---------- */
html.js .reveal {
  opacity: 0;
  transform: translateY(14px);
  transition: opacity 0.6s cubic-bezier(0.22,1,0.36,1), transform 0.6s cubic-bezier(0.22,1,0.36,1);
  transition-delay: var(--d, 0s);
}
html.js .reveal.in { opacity: 1; transform: none; }
.rise { animation: rise 0.7s cubic-bezier(0.22,1,0.36,1) both; }
@keyframes rise {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: none; }
}

/* ---------- hero ---------- */
.hero {
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(0, 0.95fr);
  gap: 3rem;
  align-items: center;
  padding: 1.5rem 0 3rem;
}
.hero-copy > * { animation: rise 0.7s cubic-bezier(0.22,1,0.36,1) both; }
.hero-copy .eyebrow { animation-delay: 0.05s; }
.hero-copy h1 { animation-delay: 0.12s; }
.hero-copy .lede { animation-delay: 0.22s; }
.hero-copy .hero-actions { animation-delay: 0.3s; }
.hero-actions { display: flex; gap: 0.75rem; flex-wrap: wrap; margin: 0 0 2.6rem; }
.hero-actions .btn { text-decoration: none; }
.btn-solid { background: var(--clay); color: #fff !important; }
.btn-solid:hover {
  background: var(--clay-deep);
  box-shadow: 0 8px 26px rgba(201,100,66,0.32);
}
.hero-card {
  position: relative;
  background: var(--paper);
  border: 1px solid var(--line);
  border-radius: 1.1rem;
  padding: 1.6rem 1.6rem 1.4rem;
  box-shadow: var(--shadow-lg);
  animation: rise 0.8s 0.25s cubic-bezier(0.22,1,0.36,1) both;
}
.hero-card .stamp {
  position: absolute;
  top: -1.1rem;
  right: 1.2rem;
  font-family: var(--mono);
  font-weight: 600;
  font-size: 0.78rem;
  letter-spacing: 0.14em;
  color: var(--clay-deep);
  border: 1.5px solid var(--clay);
  border-radius: 0.4rem;
  padding: 0.3rem 0.6rem;
  transform: rotate(5deg);
  background: var(--bone);
  box-shadow: var(--shadow);
}
.flow { position: relative; margin: 1.1rem 0 0; padding-left: 1.5rem; list-style: none; }
.flow::before {
  content: "";
  position: absolute;
  left: 0.35rem;
  top: 0.8rem;
  bottom: 0.8rem;
  width: 1px;
  background: var(--line-2);
}
.flow::after {
  content: "";
  position: absolute;
  left: 0.1rem;
  top: 0.8rem;
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
  background: var(--clay);
  box-shadow: 0 0 0 4px var(--clay-dim);
  animation: flow-travel 7.5s cubic-bezier(0.45,0,0.55,1) infinite;
}
@keyframes flow-travel {
  0% { top: 0.8rem; opacity: 0; }
  6% { opacity: 1; }
  22% { top: calc(0.8rem + 0 * var(--flow-step)); }
  78% { top: calc(0.8rem + 4 * var(--flow-step)); opacity: 1; }
  92% { opacity: 0; }
  100% { top: calc(0.8rem + 4 * var(--flow-step)); opacity: 0; }
}
.flow-step {
  display: flex;
  align-items: baseline;
  gap: 0.8rem;
  padding: 0.68rem 0;
  border-bottom: 1px dashed var(--line);
  animation: step-glow 7.5s infinite;
}
.flow-step:last-child { border-bottom: 0; }
.flow-step .k {
  font-family: var(--mono);
  font-size: 0.7rem;
  color: var(--faint);
  width: 2.6rem;
  flex: 0 0 auto;
}
.flow-step .t { font-weight: 600; font-size: 0.95rem; }
.flow-step .v { margin-left: auto; font-family: var(--mono); font-size: 0.78rem; color: var(--faint); }
@keyframes step-glow {
  0%, 14%, 100% { color: inherit; }
  18%, 30% { color: var(--clay-deep); }
}
.flow-step:nth-child(1) { animation-delay: 0.35s; }
.flow-step:nth-child(2) { animation-delay: 1.85s; }
.flow-step:nth-child(3) { animation-delay: 3.35s; }
.flow-step:nth-child(4) { animation-delay: 4.85s; }
.flow-step:nth-child(5) { animation-delay: 6.35s; }

/* ---------- facts strip ---------- */
.strip {
  border-block: 1px solid var(--line);
  padding: 0.9rem 0;
  margin: 0 0 3.2rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 1.6rem;
  justify-content: center;
  font-family: var(--mono);
  font-size: 0.76rem;
  letter-spacing: 0.06em;
  color: var(--faint);
}
.strip span::before { content: "·"; margin-right: 1.6rem; color: var(--line-2); }
.strip span:first-child::before { content: ""; margin-right: 0; }
.strip b { color: var(--mute); font-weight: 500; }

/* ---------- steps / lane ---------- */
.lane {
  list-style: none;
  counter-reset: step;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 0.75rem;
}
.lane li {
  counter-increment: step;
  position: relative;
  background: var(--paper);
  border: 1px solid var(--line);
  border-radius: 0.75rem;
  padding: 1rem 1rem 1.1rem;
  box-shadow: var(--shadow);
  transition: transform 0.2s ease, box-shadow 0.25s ease, border-color 0.2s ease;
}
.lane li:hover {
  transform: translateY(-3px);
  border-color: var(--line-2);
  box-shadow: var(--shadow-lg);
}
.lane li::before {
  content: "0" counter(step);
  font-family: var(--mono);
  font-size: 0.72rem;
  color: var(--clay);
  display: block;
  margin-bottom: 0.6rem;
}
.lane b {
  font-family: var(--display);
  font-weight: 400;
  font-size: 1.2rem;
  display: block;
  margin-bottom: 0.3rem;
  color: var(--ink);
}
.lane span { color: var(--mute); font-size: 0.86rem; line-height: 1.45; }

/* ---------- bands ---------- */
.band {
  margin: 3.2rem 0 0;
  background: var(--paper);
  border: 1px solid var(--line);
  border-radius: 1rem;
  padding: 1.7rem 1.8rem 1.8rem;
  box-shadow: var(--shadow);
}
.band > h2 { margin-bottom: 0.4rem; }
.band > p { color: var(--mute); max-width: 46rem; margin: 0 0 1.2rem; }
.band-grid, .status-grid, .catalog {
  display: grid;
  gap: 1.1rem 1.5rem;
}
.band-grid { grid-template-columns: repeat(3, 1fr); }
.band-grid > div {
  background: var(--bone);
  border: 1px solid var(--line);
  border-radius: 0.75rem;
  padding: 1.1rem 1.2rem;
  transition: border-color 0.2s ease, transform 0.2s ease;
}
.band-grid > div:hover { border-color: var(--line-2); transform: translateY(-2px); }
.band-grid p { color: var(--mute); font-size: 0.9rem; margin: 0; }
.status-grid {
  grid-template-columns: 9.5rem 1fr;
  font-family: var(--mono);
  font-size: 0.84rem;
  row-gap: 0.55rem;
}
.status-grid dt { color: var(--faint); }
.status-grid dd { margin: 0; word-break: break-all; color: var(--ink); }
.status-grid dd a { color: var(--clay-deep); text-decoration: none; border-bottom: 1px dotted var(--clay); }
.status-grid dd a:hover { border-bottom-style: solid; }
.catalog { grid-template-columns: 1fr 1fr; margin: 0; }
.rail-card .catalog { grid-template-columns: 1fr; }
.catalog div {
  background: var(--bone);
  border: 1px solid var(--line);
  border-radius: 0.7rem;
  padding: 0.75rem 0.95rem;
  font-size: 0.9rem;
}
.catalog div strong { display: block; }
.catalog code { font-size: 0.78rem; }

/* ---------- desk page ---------- */
.desk {
  display: grid;
  grid-template-columns: 19.5rem minmax(0, 1fr);
  gap: 1.5rem;
  align-items: start;
}
.rail-card, .console, .station, .doc-card {
  background: var(--paper);
  border: 1px solid var(--line);
  border-radius: 1rem;
}
.rail-card { padding: 1.2rem 1.25rem; box-shadow: var(--shadow); }
.rail-card + .rail-card { margin-top: 1rem; }
.console {
  padding: 1.6rem 1.7rem 1.8rem;
  box-shadow: var(--shadow-lg);
}
.console h1, .doc-card h1 {
  font-size: clamp(2rem, 3.4vw, 2.7rem);
  margin-bottom: 0.4rem;
}
.console .lede { font-size: 1rem; margin-bottom: 1.2rem; }
form.drive {
  display: grid;
  grid-template-columns: 1fr auto auto auto;
  gap: 0.6rem 0.65rem;
  align-items: end;
  margin: 0 0 1.1rem;
}
form.drive label { font-size: 0.82rem; color: var(--faint); display: grid; gap: 0.35rem; }
form.drive .name-field { grid-column: 1 / -1; }
form.side {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 0.6rem 0.65rem;
  align-items: end;
  margin: 0 0 0.6rem;
}
form.side label { font-size: 0.82rem; color: var(--faint); display: grid; gap: 0.35rem; }
input[name="name"], input[name="parent"], input[name="label"], input[name="endpoint"], input[name="schedule"], select {
  width: 100%;
  border: 1px solid var(--line-2);
  background: var(--bone);
  color: var(--ink);
  padding: 0.6rem 0.75rem;
  font: inherit;
  font-family: var(--mono);
  font-size: 0.9rem;
  border-radius: 0.6rem;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}
input[name="name"]::placeholder, input[name="parent"]::placeholder, input[name="label"]::placeholder,
input[name="endpoint"]::placeholder, input[name="schedule"]::placeholder { color: var(--faint); }
input[name="name"]:focus, input[name="parent"]:focus, input[name="label"]:focus,
input[name="endpoint"]:focus, input[name="schedule"]:focus, select:focus {
  border-color: var(--clay);
  box-shadow: 0 0 0 3px var(--clay-dim);
  outline: none;
}
select { appearance: none; }
.banner {
  margin: 0 0 0.9rem;
  padding: 0.65rem 0.85rem;
  border-left: 3px solid var(--line-2);
  background: var(--ivory);
  border-radius: 0 0.5rem 0.5rem 0;
  font-size: 0.92rem;
  color: var(--mute);
}
.banner[hidden], .station[hidden] { display: none; }
.banner.err, .banner.deny { border-left-color: var(--rust); color: var(--rust); background: var(--rust-dim); }
.banner.ok { border-left-color: var(--sage); color: var(--sage); background: var(--sage-dim); }
.stations {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.8rem;
}
.station {
  padding: 1rem 1.05rem 1.1rem;
  min-height: 7.6rem;
  box-shadow: var(--shadow);
  animation: rise 0.6s cubic-bezier(0.22,1,0.36,1) both;
}
.station:nth-child(1) { animation-delay: 0.08s; }
.station:nth-child(2) { animation-delay: 0.14s; }
.station:nth-child(3) { animation-delay: 0.2s; }
.station:nth-child(4) { animation-delay: 0.26s; }
.station:nth-child(5) { animation-delay: 0.32s; }
.station:nth-child(6) { animation-delay: 0.38s; }
.station:nth-child(7) { animation-delay: 0.44s; }
.station h3 { display: flex; align-items: center; gap: 0.5rem; }
.station h3::after { content: ""; height: 1px; flex: 1; background: var(--line); order: 1; }
.station dl {
  display: grid;
  grid-template-columns: 7.4rem 1fr;
  gap: 0.4rem 0.7rem;
  margin: 0;
  font-family: var(--mono);
  font-size: 0.77rem;
}
.station dt { color: var(--faint); }
.station dd {
  margin: 0;
  word-break: break-all;
  max-height: 7rem;
  overflow: auto;
  cursor: copy;
  border-radius: 0.3rem;
}
.station dd:hover { background: var(--ivory); color: var(--clay-deep); }
.station dd a { color: var(--clay-deep); }
.station[data-status="live"] { border-color: rgba(46,125,79,0.35); }
.station[data-status="unreachable"], .station[data-status="unresolved"] { border-color: rgba(194,84,69,0.3); }

/* ---------- docs ---------- */
.docs {
  display: grid;
  grid-template-columns: 14rem minmax(0, 1fr);
  gap: 1.8rem;
  align-items: start;
}
.doc-toc {
  position: sticky;
  top: 4.5rem;
  font-size: 0.9rem;
  font-family: var(--mono);
}
.doc-toc a {
  display: block;
  text-decoration: none;
  color: var(--faint);
  padding: 0.32rem 0;
  border-left: 1px solid var(--line);
  padding-left: 0.85rem;
  transition: color 0.15s ease, border-color 0.2s ease;
}
.doc-toc a:hover { color: var(--clay-deep); border-left-color: var(--clay); }
.doc-card { padding: 1.4rem 1.55rem 1.6rem; margin: 0 0 1.1rem; box-shadow: var(--shadow); }
.doc-card h2 { scroll-margin-top: 4.5rem; }
.doc-card p, .doc-card li { color: var(--mute); }
.doc-card a { color: var(--clay-deep); }
.doc-card pre {
  overflow: auto;
  background: var(--bone);
  border: 1px solid var(--line);
  border-radius: 0.6rem;
  color: var(--ink);
  padding: 0.9rem 1.05rem;
  font-family: var(--mono);
  font-size: 0.79rem;
  line-height: 1.5;
}
.doc-card table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
.doc-card th, .doc-card td {
  text-align: left;
  padding: 0.45rem 0.5rem 0.45rem 0;
  border-bottom: 1px solid var(--line);
  vertical-align: top;
}
.doc-card th { color: var(--faint); font-weight: 500; font-family: var(--mono); font-size: 0.78rem; letter-spacing: 0.06em; text-transform: uppercase; }

@media (max-width: 900px) {
  .hero { grid-template-columns: 1fr; gap: 2.2rem; }
  .top-inner { flex-wrap: wrap; padding: 0.7rem 0; }
  .lane, .band-grid, .catalog, .desk, .docs, form.drive, form.side, .stations {
    grid-template-columns: 1fr;
  }
  .strip span::before { content: ""; margin-right: 0; }
  .strip span:not(:first-child)::before { content: "·"; margin-right: 1.6rem; }
  .nav { width: 100%; justify-content: space-between; }
}
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation: none !important; transition: none !important; }
  html.js .reveal { opacity: 1; transform: none; }
}
`.trim();

const REVEAL_SCRIPT = `(function () {
  var nodes = document.querySelectorAll(".reveal");
  if (!nodes.length || !("IntersectionObserver" in window)) return;
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add("in");
        io.unobserve(entry.target);
      }
    });
  }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
  nodes.forEach(function (node) { io.observe(node); });
})();`;

export function renderShell(options: ShellOptions): string {
  const productCurrent = options.path === "/" || options.path === "/landing";
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(options.title)}</title>
  <meta name="description" content="${escapeHtml(options.description)}" />
  <meta property="og:title" content="${escapeHtml(options.title)}" />
  <meta property="og:description" content="${escapeHtml(options.description)}" />
  <meta name="theme-color" content="#faf9f5" />
  <link rel="icon" href="${FAVICON}" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&amp;family=Instrument+Sans:wght@400;500;600&amp;family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;1,6..72,400&amp;display=swap" rel="stylesheet" />
  <script>document.documentElement.classList.add("js");</script>
  <style>${PRODUCT_CSS}</style>
</head>
<body>
  <a class="skip" href="#main">Skip to content</a>
  <header class="top">
    <div class="top-inner">
      <a class="brand" href="/"><span class="mark" aria-hidden="true"></span>Nametoll</a>
      <nav class="nav" aria-label="Product">
        <a href="/landing"${productCurrent ? ' aria-current="page"' : ""}>Product</a>
        <a href="/desks"${options.path === "/desks" ? ' aria-current="page"' : ""}>Desks</a>
        <a href="/register"${options.path === "/register" ? ' aria-current="page"' : ""}>Register</a>
        <a href="/app"${options.path === "/app" ? ' aria-current="page"' : ""}>Desk</a>
        <a href="/docs"${options.path === "/docs" ? ' aria-current="page"' : ""}>Docs</a>
        ${options.path === "/app" ? "" : `<a class="nav-cta" href="/app">Open desk</a>`}
      </nav>
    </div>
  </header>
  <div class="wrap" id="main">
    ${options.body}
  </div>
  <footer class="site-foot">
    <div class="wrap">
      <span>Nametoll · named pay desk · HTTP 402</span>
      <span>
        <a href="/health"><code>/health</code></a>
        · <a href="/docs">Manual</a>
        · resource server holds no facilitator key
      </span>
    </div>
  </footer>
  <script>${REVEAL_SCRIPT}</script>
</body>
</html>`;
}
