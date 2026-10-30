import fs from "node:fs";
import path from "node:path";
import { Resvg } from "@resvg/resvg-js";

const outDir = path.resolve(process.cwd(), "docs/images");
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

function renderSvgToPng(svgStr: string, outFileName: string, width = 1280, height = 800) {
  const resvg = new Resvg(svgStr, {
    fitTo: { mode: "width", value: width },
    font: {
      loadSystemFonts: true,
      defaultFontFamily: "sans-serif",
    },
  });
  const pngData = resvg.render();
  const pngBuffer = pngData.asPng();
  fs.writeFileSync(path.join(outDir, outFileName), pngBuffer);
  console.log(`Generated docs/images/${outFileName} (${width}x${height})`);
}

// 1. Landing Page Asset (landing.png)
const landingSvg = `
<svg width="1280" height="800" viewBox="0 0 1280 800" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="1280" height="800" fill="#0B0C10"/>
  <!-- Subtle Glow -->
  <circle cx="640" cy="180" r="320" fill="#00E5FF" opacity="0.07" filter="blur(80px)"/>
  <circle cx="780" cy="240" r="280" fill="#6A11FF" opacity="0.08" filter="blur(90px)"/>

  <!-- Top Navigation -->
  <rect width="1280" height="64" fill="#0B0C10" fill-opacity="0.9"/>
  <line x1="0" y1="64" x2="1280" y2="64" stroke="#232734" stroke-width="1"/>
  <!-- Logo -->
  <rect x="48" y="18" width="28" height="28" rx="6" fill="#12141A" stroke="#232734"/>
  <path d="M54 32 L58 32 L61 24 L65 38 L68 32 L72 32" stroke="#00E5FF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  <text x="86" y="37" fill="#E6E8EE" font-size="18" font-weight="700" font-family="system-ui, sans-serif" letter-spacing="1">PULSE</text>
  
  <text x="1000" y="38" fill="#8A90A2" font-size="14" font-family="system-ui, sans-serif">Docs</text>
  <rect x="1080" y="16" width="150" height="34" rx="8" fill="#00E5FF"/>
  <text x="1115" y="38" fill="#0B0C10" font-size="13" font-weight="600" font-family="system-ui, sans-serif">Go to Dashboard</text>

  <!-- Hero Section -->
  <!-- Chip -->
  <rect x="520" y="110" width="240" height="28" rx="14" fill="#181B23" stroke="#232734"/>
  <circle cx="536" cy="124" r="4" fill="#2FD28A"/>
  <text x="548" y="128" fill="#E6E8EE" font-size="11" font-weight="600" font-family="monospace">PULSE 2.0 LIVE ON ENGINE</text>

  <!-- Headline -->
  <text x="640" y="180" text-anchor="middle" fill="#E6E8EE" font-size="44" font-weight="800" font-family="system-ui, sans-serif">
    Production errors detected &amp; diagnosed
  </text>
  <text x="640" y="235" text-anchor="middle" fill="#00E5FF" font-size="44" font-weight="800" font-family="system-ui, sans-serif">
    in real time on Telegram
  </text>
  <text x="640" y="280" text-anchor="middle" fill="#8A90A2" font-size="16" font-family="system-ui, sans-serif">
    Zero noise. AI root cause analysis. Native Express middleware. Direct engineer alerts.
  </text>

  <!-- CTAs -->
  <rect x="500" y="315" width="130" height="42" rx="8" fill="#00E5FF"/>
  <text x="525" y="341" fill="#0B0C10" font-size="14" font-weight="700" font-family="system-ui, sans-serif">Get Started</text>
  <rect x="645" y="315" width="135" height="42" rx="8" fill="#181B23" stroke="#232734"/>
  <text x="670" y="341" fill="#E6E8EE" font-size="14" font-weight="600" font-family="system-ui, sans-serif">Documentation</text>

  <!-- Telegram Alert Mockup Card (Centered) -->
  <rect x="340" y="390" width="600" height="370" rx="16" fill="#12141A" stroke="#232734"/>
  
  <!-- Alert Header -->
  <rect x="360" y="415" width="28" height="28" rx="14" fill="#181B23"/>
  <path d="M370 429 L374 429 L376 423 L379 433 L382 429 L385 429" stroke="#FF5C6C" stroke-width="2" stroke-linecap="round"/>
  <text x="396" y="433" fill="#E6E8EE" font-size="14" font-weight="700" font-family="system-ui, sans-serif">Pulse Bot</text>
  <text x="470" y="433" fill="#8A90A2" font-size="12" font-family="system-ui, sans-serif">14:02</text>

  <!-- Telegram Message Bubble -->
  <rect x="360" y="455" width="560" height="280" rx="12" fill="#181B23" stroke="#232734"/>
  
  <text x="380" y="485" fill="#FF5C6C" font-size="15" font-weight="700" font-family="system-ui, sans-serif">🚨 CRITICAL INCIDENT DETECTED</text>
  <text x="380" y="512" fill="#E6E8EE" font-size="14" font-family="system-ui, sans-serif"><b>Project:</b> e-commerce-backend</text>
  <text x="380" y="534" fill="#E6E8EE" font-size="14" font-family="system-ui, sans-serif"><b>Error:</b> DatabaseConnectionTimeout: pool exhausted</text>
  <text x="380" y="556" fill="#8A90A2" font-size="13" font-family="system-ui, sans-serif"><b>Occurrences:</b> 14 events in 60s (Burst detected)</text>

  <!-- AI Diagnosis Block -->
  <rect x="380" y="575" width="520" height="95" rx="8" fill="#12141A" stroke="#232734"/>
  <text x="395" y="600" fill="#00E5FF" font-size="12" font-weight="700" font-family="system-ui, sans-serif">🧠 AI ROOT CAUSE DIAGNOSIS</text>
  <text x="395" y="622" fill="#E6E8EE" font-size="12" font-family="system-ui, sans-serif">Connection pool connection leak in checkout transaction handler.</text>
  <text x="395" y="640" fill="#8A90A2" font-size="12" font-family="system-ui, sans-serif">Ensure client.$disconnect() or release() inside finally block.</text>

  <!-- Telegram Inline Button -->
  <rect x="380" y="685" width="520" height="36" rx="8" fill="#232734"/>
  <text x="640" y="708" text-anchor="middle" fill="#00E5FF" font-size="13" font-weight="600" font-family="system-ui, sans-serif">View Incident in Dashboard ↗</text>
</svg>
`;

// 2. Projects Overview (projects.png)
const projectsSvg = `
<svg width="1280" height="800" viewBox="0 0 1280 800" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="1280" height="800" fill="#0B0C10"/>
  <!-- Sidebar -->
  <rect width="240" height="800" fill="#12141A"/>
  <line x1="240" y1="0" x2="240" y2="800" stroke="#232734" stroke-width="1"/>

  <!-- Logo in Sidebar -->
  <rect x="24" y="24" width="28" height="28" rx="6" fill="#181B23" stroke="#232734"/>
  <path d="M30 38 L34 38 L37 30 L41 44 L44 38 L48 38" stroke="#00E5FF" stroke-width="2" stroke-linecap="round"/>
  <text x="60" y="43" fill="#E6E8EE" font-size="16" font-weight="700" font-family="system-ui, sans-serif" letter-spacing="1">PULSE</text>

  <!-- Sidebar Nav items -->
  <rect x="16" y="80" width="208" height="38" rx="8" fill="#181B23" stroke="#232734"/>
  <text x="36" y="104" fill="#00E5FF" font-size="13" font-weight="600" font-family="system-ui, sans-serif">▦  Projects</text>
  
  <text x="36" y="148" fill="#8A90A2" font-size="13" font-weight="500" font-family="system-ui, sans-serif">⚙  Account Settings</text>
  <text x="36" y="188" fill="#8A90A2" font-size="13" font-weight="500" font-family="system-ui, sans-serif">📖 Documentation</text>

  <!-- Main Content Area -->
  <text x="280" y="60" fill="#E6E8EE" font-size="24" font-weight="700" font-family="system-ui, sans-serif">Projects</text>
  <text x="280" y="84" fill="#8A90A2" font-size="14" font-family="system-ui, sans-serif">Monitor errors and live incident streams across your services.</text>

  <rect x="1110" y="44" width="130" height="36" rx="8" fill="#00E5FF"/>
  <text x="1140" y="67" fill="#0B0C10" font-size="13" font-weight="600" font-family="system-ui, sans-serif">+ New Project</text>

  <!-- Project Cards Grid -->
  <!-- Card 1 -->
  <rect x="280" y="120" width="460" height="190" rx="12" fill="#12141A" stroke="#232734"/>
  <text x="304" y="156" fill="#E6E8EE" font-size="18" font-weight="700" font-family="system-ui, sans-serif">production-api</text>
  <rect x="620" y="140" width="95" height="24" rx="12" fill="#181B23" stroke="#232734"/>
  <circle cx="632" cy="152" r="4" fill="#2FD28A"/>
  <text x="642" y="156" fill="#2FD28A" font-size="11" font-weight="600" font-family="system-ui, sans-serif">Connected</text>

  <text x="304" y="185" fill="#8A90A2" font-size="12" font-family="monospace">api.pulse.dev • 2 active keys</text>

  <line x1="304" y1="210" x2="716" y2="210" stroke="#232734" stroke-width="1"/>
  
  <text x="304" y="245" fill="#FF5C6C" font-size="20" font-weight="700" font-family="system-ui, sans-serif">2</text>
  <text x="304" y="265" fill="#8A90A2" font-size="12" font-family="system-ui, sans-serif">Open Incidents</text>

  <text x="420" y="245" fill="#E6E8EE" font-size="20" font-weight="700" font-family="system-ui, sans-serif">1,482</text>
  <text x="420" y="265" fill="#8A90A2" font-size="12" font-family="system-ui, sans-serif">Total Events (24h)</text>

  <text x="560" y="245" fill="#00E5FF" font-size="20" font-weight="700" font-family="system-ui, sans-serif">1 chat</text>
  <text x="560" y="265" fill="#8A90A2" font-size="12" font-family="system-ui, sans-serif">Telegram Alerts</text>

  <!-- Card 2 -->
  <rect x="760" y="120" width="460" height="190" rx="12" fill="#12141A" stroke="#232734"/>
  <text x="784" y="156" fill="#E6E8EE" font-size="18" font-weight="700" font-family="system-ui, sans-serif">worker-pipeline</text>
  <rect x="1100" y="140" width="95" height="24" rx="12" fill="#181B23" stroke="#232734"/>
  <circle cx="1112" cy="152" r="4" fill="#2FD28A"/>
  <text x="1122" y="156" fill="#2FD28A" font-size="11" font-weight="600" font-family="system-ui, sans-serif">Connected</text>

  <text x="784" y="185" fill="#8A90A2" font-size="12" font-family="monospace">worker-pipeline • 1 active key</text>

  <line x1="784" y1="210" x2="1196" y2="210" stroke="#232734" stroke-width="1"/>

  <text x="784" y="245" fill="#2FD28A" font-size="20" font-weight="700" font-family="system-ui, sans-serif">0</text>
  <text x="784" y="265" fill="#8A90A2" font-size="12" font-family="system-ui, sans-serif">Open Incidents</text>

  <text x="900" y="245" fill="#E6E8EE" font-size="20" font-weight="700" font-family="system-ui, sans-serif">340</text>
  <text x="900" y="265" fill="#8A90A2" font-size="12" font-family="system-ui, sans-serif">Total Events (24h)</text>

  <text x="1040" y="245" fill="#8A90A2" font-size="20" font-weight="700" font-family="system-ui, sans-serif">None</text>
  <text x="1040" y="265" fill="#8A90A2" font-size="12" font-family="system-ui, sans-serif">Telegram Alerts</text>
</svg>
`;

// 3. Incidents Tab (incidents.png)
const incidentsSvg = `
<svg width="1280" height="800" viewBox="0 0 1280 800" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="1280" height="800" fill="#0B0C10"/>
  <!-- Top Bar -->
  <rect width="1280" height="56" fill="#12141A"/>
  <line x1="0" y1="56" x2="1280" y2="56" stroke="#232734" stroke-width="1"/>
  <text x="32" y="34" fill="#8A90A2" font-size="14" font-family="system-ui, sans-serif">Projects / <tspan fill="#E6E8EE" font-weight="600">production-api</tspan></text>

  <!-- Project Header -->
  <text x="32" y="100" fill="#E6E8EE" font-size="24" font-weight="700" font-family="system-ui, sans-serif">production-api</text>
  
  <!-- Tabs Bar -->
  <line x1="32" y1="135" x2="1248" y2="135" stroke="#232734" stroke-width="1"/>
  <text x="32" y="125" fill="#00E5FF" font-size="14" font-weight="600" font-family="system-ui, sans-serif">Incidents (3)</text>
  <line x1="32" y1="134" x2="115" y2="134" stroke="#00E5FF" stroke-width="2"/>
  <text x="145" y="125" fill="#8A90A2" font-size="14" font-family="system-ui, sans-serif">Setup</text>
  <text x="215" y="125" fill="#8A90A2" font-size="14" font-family="system-ui, sans-serif">Alerts</text>
  <text x="285" y="125" fill="#8A90A2" font-size="14" font-family="system-ui, sans-serif">Settings</text>

  <!-- Filter Bar -->
  <rect x="32" y="155" width="400" height="38" rx="8" fill="#12141A" stroke="#232734"/>
  <text x="48" y="179" fill="#8A90A2" font-size="13" font-family="system-ui, sans-serif">🔍  Search by error or message...</text>

  <rect x="445" y="155" width="70" height="38" rx="8" fill="#181B23" stroke="#00E5FF"/>
  <text x="465" y="179" fill="#00E5FF" font-size="13" font-weight="600" font-family="system-ui, sans-serif">All</text>
  
  <rect x="525" y="155" width="80" height="38" rx="8" fill="#12141A" stroke="#232734"/>
  <text x="545" y="179" fill="#8A90A2" font-size="13" font-family="system-ui, sans-serif">Open</text>

  <rect x="615" y="155" width="95" height="38" rx="8" fill="#12141A" stroke="#232734"/>
  <text x="630" y="179" fill="#8A90A2" font-size="13" font-family="system-ui, sans-serif">Resolved</text>

  <!-- Incident Row 1 -->
  <rect x="32" y="210" width="1216" height="88" rx="10" fill="#12141A" stroke="#232734"/>
  <rect x="52" y="234" width="70" height="22" rx="11" fill="#FF5C6C" fill-opacity="0.15" stroke="#FF5C6C" stroke-width="0.5"/>
  <text x="66" y="249" fill="#FF5C6C" font-size="11" font-weight="700" font-family="system-ui, sans-serif">OPEN</text>
  <text x="140" y="246" fill="#E6E8EE" font-size="15" font-weight="700" font-family="system-ui, sans-serif">DatabaseConnectionTimeout: pool exhausted</text>
  <text x="140" y="268" fill="#8A90A2" font-size="12" font-family="monospace">Fingerprint: e83a9f01bc44 • e-commerce-backend/src/db.ts:42</text>
  <text x="960" y="252" fill="#E6E8EE" font-size="13" font-weight="600" font-family="system-ui, sans-serif">48 events</text>
  <text x="1100" y="252" fill="#8A90A2" font-size="13" font-family="system-ui, sans-serif">2m ago</text>

  <!-- Incident Row 2 -->
  <rect x="32" y="310" width="1216" height="88" rx="10" fill="#12141A" stroke="#232734"/>
  <rect x="52" y="334" width="70" height="22" rx="11" fill="#FF5C6C" fill-opacity="0.15" stroke="#FF5C6C" stroke-width="0.5"/>
  <text x="66" y="349" fill="#FF5C6C" font-size="11" font-weight="700" font-family="system-ui, sans-serif">OPEN</text>
  <text x="140" y="346" fill="#E6E8EE" font-size="15" font-weight="700" font-family="system-ui, sans-serif">TypeError: Cannot read properties of undefined (reading 'userId')</text>
  <text x="140" y="368" fill="#8A90A2" font-size="12" font-family="monospace">Fingerprint: 10d48123ab09 • src/middleware/auth.ts:18</text>
  <text x="960" y="352" fill="#E6E8EE" font-size="13" font-weight="600" font-family="system-ui, sans-serif">12 events</text>
  <text x="1100" y="352" fill="#8A90A2" font-size="13" font-family="system-ui, sans-serif">14m ago</text>

  <!-- Incident Row 3 -->
  <rect x="32" y="410" width="1216" height="88" rx="10" fill="#12141A" stroke="#232734"/>
  <rect x="52" y="434" width="85" height="22" rx="11" fill="#2FD28A" fill-opacity="0.15" stroke="#2FD28A" stroke-width="0.5"/>
  <text x="64" y="449" fill="#2FD28A" font-size="11" font-weight="700" font-family="system-ui, sans-serif">RESOLVED</text>
  <text x="155" y="446" fill="#8A90A2" font-size="15" font-weight="600" font-family="system-ui, sans-serif">StripeInvalidRequestError: No such customer: 'cus_984'</text>
  <text x="155" y="468" fill="#8A90A2" font-size="12" font-family="monospace">Fingerprint: 77a112fc03e9 • src/billing/webhook.ts:88</text>
  <text x="960" y="452" fill="#8A90A2" font-size="13" font-family="system-ui, sans-serif">1 event</text>
  <text x="1100" y="452" fill="#8A90A2" font-size="13" font-family="system-ui, sans-serif">2d ago</text>
</svg>
`;

// 4. Incident Detail (incident-detail.png)
const incidentDetailSvg = `
<svg width="1280" height="900" viewBox="0 0 1280 900" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="1280" height="900" fill="#0B0C10"/>
  <!-- Top Bar -->
  <rect width="1280" height="56" fill="#12141A"/>
  <line x1="0" y1="56" x2="1280" y2="56" stroke="#232734" stroke-width="1"/>
  <text x="32" y="34" fill="#8A90A2" font-size="14" font-family="system-ui, sans-serif">Projects / production-api / Incidents / <tspan fill="#E6E8EE">inc_e83a9f01</tspan></text>

  <!-- Incident Title Header -->
  <text x="32" y="100" fill="#E6E8EE" font-size="22" font-weight="700" font-family="system-ui, sans-serif">DatabaseConnectionTimeout: pool exhausted</text>
  <rect x="32" y="115" width="70" height="22" rx="11" fill="#FF5C6C" fill-opacity="0.15" stroke="#FF5C6C" stroke-width="0.5"/>
  <text x="46" y="130" fill="#FF5C6C" font-size="11" font-weight="700" font-family="system-ui, sans-serif">OPEN</text>
  <text x="115" y="130" fill="#8A90A2" font-size="12" font-family="monospace">First seen: 2026-10-30 14:02:11 UTC • 48 occurrences</text>

  <!-- AI Diagnosis Card -->
  <rect x="32" y="160" width="1216" height="150" rx="12" fill="#12141A" stroke="#00E5FF" stroke-width="1"/>
  <text x="56" y="192" fill="#00E5FF" font-size="13" font-weight="700" font-family="system-ui, sans-serif">🧠 AI ROOT CAUSE ANALYSIS &amp; FIX RECOMMENDATION</text>
  <text x="56" y="222" fill="#E6E8EE" font-size="14" font-family="system-ui, sans-serif">The database connection pool is exhausting its maximum capacity (20) under load due to an unhandled promise rejection in the transaction checkout handler.</text>
  <rect x="56" y="242" width="1168" height="46" rx="6" fill="#181B23"/>
  <text x="72" y="270" fill="#2FD28A" font-size="13" font-family="monospace">Fix: Ensure client.release() is wrapped inside a finally block in checkout.ts line 84.</text>

  <!-- 24h Occurrences Chart -->
  <rect x="32" y="330" width="1216" height="140" rx="12" fill="#12141A" stroke="#232734"/>
  <text x="56" y="360" fill="#E6E8EE" font-size="14" font-weight="600" font-family="system-ui, sans-serif">Occurrences (Last 24 Hours)</text>
  <!-- Chart Bars -->
  ${Array.from({ length: 24 })
    .map((_, i) => {
      const height = i === 22 ? 55 : i === 21 ? 30 : i === 20 ? 15 : Math.floor(Math.random() * 8) + 2;
      const x = 56 + i * 48;
      const y = 430 - height;
      return `<rect x="${x}" y="${y}" width="28" height="${height}" rx="3" fill="${i >= 21 ? "#FF5C6C" : "#232734"}"/>`;
    })
    .join("\n")}

  <!-- Stack Trace Card -->
  <rect x="32" y="490" width="1216" height="370" rx="12" fill="#12141A" stroke="#232734"/>
  <text x="56" y="522" fill="#E6E8EE" font-size="14" font-weight="600" font-family="system-ui, sans-serif">Stack Trace</text>

  <!-- Frames -->
  <rect x="56" y="540" width="1168" height="60" rx="8" fill="#181B23" stroke="#00E5FF" stroke-width="0.7"/>
  <text x="76" y="565" fill="#00E5FF" font-size="13" font-weight="600" font-family="monospace">src/services/checkout.ts:84</text>
  <text x="76" y="585" fill="#E6E8EE" font-size="12" font-family="monospace">in executeTransaction (App Code)</text>

  <rect x="56" y="610" width="1168" height="60" rx="8" fill="#181B23" stroke="#00E5FF" stroke-width="0.7"/>
  <text x="76" y="635" fill="#00E5FF" font-size="13" font-weight="600" font-family="monospace">src/controllers/order.ts:31</text>
  <text x="76" y="655" fill="#E6E8EE" font-size="12" font-family="monospace">in handleCreateOrder (App Code)</text>

  <rect x="56" y="680" width="1168" height="40" rx="6" fill="#12141A"/>
  <text x="76" y="705" fill="#8A90A2" font-size="12" font-family="monospace">node_modules/express/lib/router/layer.js:95 (Library Frame)</text>

  <rect x="56" y="730" width="1168" height="40" rx="6" fill="#12141A"/>
  <text x="76" y="755" fill="#8A90A2" font-size="12" font-family="monospace">node_modules/pg-pool/index.js:142 (Library Frame)</text>
</svg>
`;

// 5. Setup & Key Rotation (setup.png)
const setupSvg = `
<svg width="1280" height="800" viewBox="0 0 1280 800" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="1280" height="800" fill="#0B0C10"/>
  <!-- Top Bar -->
  <rect width="1280" height="56" fill="#12141A"/>
  <line x1="0" y1="56" x2="1280" y2="56" stroke="#232734" stroke-width="1"/>
  <text x="32" y="34" fill="#8A90A2" font-size="14" font-family="system-ui, sans-serif">Projects / production-api / <tspan fill="#E6E8EE">Setup</tspan></text>

  <text x="32" y="100" fill="#E6E8EE" font-size="24" font-weight="700" font-family="system-ui, sans-serif">SDK Setup &amp; Ingestion Keys</text>
  <text x="32" y="125" fill="#8A90A2" font-size="14" font-family="system-ui, sans-serif">Configure the Pulse SDK in your Node.js or Express service.</text>

  <!-- API Keys Card -->
  <rect x="32" y="150" width="1216" height="240" rx="12" fill="#12141A" stroke="#232734"/>
  <text x="56" y="185" fill="#E6E8EE" font-size="16" font-weight="700" font-family="system-ui, sans-serif">Active Ingestion Keys</text>
  <text x="56" y="208" fill="#8A90A2" font-size="13" font-family="system-ui, sans-serif">Keys are hashed using SHA-256 before storage. Full secret keys are displayed only once at creation or rotation.</text>

  <rect x="1100" y="165" width="120" height="34" rx="8" fill="#00E5FF"/>
  <text x="1120" y="187" fill="#0B0C10" font-size="12" font-weight="700" font-family="system-ui, sans-serif">🔄 Rotate Key</text>

  <!-- Key Row -->
  <rect x="56" y="235" width="1168" height="60" rx="8" fill="#181B23" stroke="#232734"/>
  <text x="80" y="270" fill="#E6E8EE" font-size="14" font-weight="600" font-family="monospace">pulse_live_948f2b••••••••••••••••••••••••</text>
  <rect x="420" y="254" width="60" height="22" rx="11" fill="#2FD28A" fill-opacity="0.15"/>
  <text x="432" y="269" fill="#2FD28A" font-size="11" font-weight="700" font-family="system-ui, sans-serif">ACTIVE</text>
  <text x="510" y="270" fill="#8A90A2" font-size="12" font-family="system-ui, sans-serif">Created Oct 30, 2026</text>
  <text x="700" y="270" fill="#8A90A2" font-size="12" font-family="system-ui, sans-serif">Last used: 2 minutes ago</text>

  <!-- Express Code Snippet Card -->
  <rect x="32" y="415" width="1216" height="340" rx="12" fill="#12141A" stroke="#232734"/>
  <text x="56" y="450" fill="#E6E8EE" font-size="16" font-weight="700" font-family="system-ui, sans-serif">Express Integration (3 lines of code)</text>
  <rect x="56" y="475" width="1168" height="250" rx="8" fill="#181B23" stroke="#232734"/>
  <text x="80" y="515" fill="#8A90A2" font-size="13" font-family="monospace">// 1. Install SDK</text>
  <text x="80" y="535" fill="#00E5FF" font-size="13" font-family="monospace">pnpm add @samkiel/pulse</text>
  <text x="80" y="575" fill="#8A90A2" font-size="13" font-family="monospace">// 2. Initialize in server.ts</text>
  <text x="80" y="595" fill="#E6E8EE" font-size="13" font-family="monospace"><tspan fill="#6A11FF">import</tspan> { pulse } <tspan fill="#6A11FF">from</tspan> <tspan fill="#00E5FF">"@samkiel/pulse"</tspan>;</text>
  <text x="80" y="625" fill="#E6E8EE" font-size="13" font-family="monospace">pulse.init({ apiKey: process.env.PULSE_API_KEY, endpoint: <tspan fill="#00E5FF">"https://api.pulse.dev"</tspan> });</text>
  <text x="80" y="655" fill="#8A90A2" font-size="13" font-family="monospace">// 3. Mount error handler</text>
  <text x="80" y="675" fill="#E6E8EE" font-size="13" font-family="monospace">app.use(pulse.errorHandler());</text>
</svg>
`;

// 6. Alerts Configuration (alerts.png)
const alertsSvg = `
<svg width="1280" height="800" viewBox="0 0 1280 800" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="1280" height="800" fill="#0B0C10"/>
  <!-- Top Bar -->
  <rect width="1280" height="56" fill="#12141A"/>
  <line x1="0" y1="56" x2="1280" y2="56" stroke="#232734" stroke-width="1"/>
  <text x="32" y="34" fill="#8A90A2" font-size="14" font-family="system-ui, sans-serif">Projects / production-api / <tspan fill="#E6E8EE">Alerts</tspan></text>

  <text x="32" y="100" fill="#E6E8EE" font-size="24" font-weight="700" font-family="system-ui, sans-serif">Telegram Alert Destinations</text>
  <text x="32" y="125" fill="#8A90A2" font-size="14" font-family="system-ui, sans-serif">Link your private chats, engineering channels, and incident groups.</text>

  <!-- Connect New Telegram Chat Card -->
  <rect x="32" y="150" width="1216" height="230" rx="12" fill="#12141A" stroke="#232734"/>
  <text x="56" y="185" fill="#E6E8EE" font-size="16" font-weight="700" font-family="system-ui, sans-serif">Link New Telegram Destination</text>
  
  <text x="56" y="218" fill="#8A90A2" font-size="13" font-family="system-ui, sans-serif">1. Open our Telegram Bot: <tspan fill="#00E5FF">@PulseAlertBot</tspan></text>
  <text x="56" y="242" fill="#8A90A2" font-size="13" font-family="system-ui, sans-serif">2. Add the bot to your group or DM, then send the one-time deep-link token:</text>

  <rect x="56" y="260" width="800" height="42" rx="6" fill="#181B23" stroke="#232734"/>
  <text x="76" y="286" fill="#00E5FF" font-size="13" font-family="monospace">/start plink_e9921bc08412</text>
  <rect x="760" y="267" width="85" height="28" rx="4" fill="#232734"/>
  <text x="785" y="285" fill="#E6E8EE" font-size="11" font-weight="600" font-family="system-ui, sans-serif">Copy</text>

  <rect x="56" y="320" width="170" height="36" rx="8" fill="#00E5FF"/>
  <text x="80" y="343" fill="#0B0C10" font-size="13" font-weight="700" font-family="system-ui, sans-serif">Open in Telegram ↗</text>

  <!-- Connected Destinations List -->
  <rect x="32" y="405" width="1216" height="340" rx="12" fill="#12141A" stroke="#232734"/>
  <text x="56" y="440" fill="#E6E8EE" font-size="16" font-weight="700" font-family="system-ui, sans-serif">Connected Chats (2)</text>

  <!-- Chat 1 -->
  <rect x="56" y="465" width="1168" height="66" rx="8" fill="#181B23" stroke="#232734"/>
  <text x="80" y="495" fill="#E6E8EE" font-size="14" font-weight="700" font-family="system-ui, sans-serif">#core-infrastructure-alerts</text>
  <text x="80" y="515" fill="#8A90A2" font-size="12" font-family="system-ui, sans-serif">Chat ID: -1008291039 • Supergroup • Linked Oct 28, 2026</text>
  <rect x="1100" y="482" width="100" height="32" rx="6" fill="#232734"/>
  <text x="1130" y="502" fill="#FF5C6C" font-size="12" font-weight="600" font-family="system-ui, sans-serif">Unlink</text>

  <!-- Chat 2 -->
  <rect x="56" y="545" width="1168" height="66" rx="8" fill="#181B23" stroke="#232734"/>
  <text x="80" y="575" fill="#E6E8EE" font-size="14" font-weight="700" font-family="system-ui, sans-serif">Samkiel (Personal On-Call DM)</text>
  <text x="80" y="595" fill="#8A90A2" font-size="12" font-family="system-ui, sans-serif">Chat ID: 91823719 • Private Chat • Linked Oct 30, 2026</text>
  <rect x="1100" y="562" width="100" height="32" rx="6" fill="#232734"/>
  <text x="1130" y="582" fill="#FF5C6C" font-size="12" font-weight="600" font-family="system-ui, sans-serif">Unlink</text>
</svg>
`;

renderSvgToPng(landingSvg, "landing.png", 1280, 800);
renderSvgToPng(projectsSvg, "projects.png", 1280, 800);
renderSvgToPng(incidentsSvg, "incidents.png", 1280, 800);
renderSvgToPng(incidentDetailSvg, "incident-detail.png", 1280, 900);
renderSvgToPng(setupSvg, "setup.png", 1280, 800);
renderSvgToPng(alertsSvg, "alerts.png", 1280, 800);
console.log("All 6 visual documentation assets successfully rendered.");
