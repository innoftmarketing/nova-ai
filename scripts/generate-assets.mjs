// Generate brand illustrations via Kie GPT Image 2 (transparent PNGs).
// Usage: KIE_API_KEY=... node scripts/generate-assets.mjs
import { writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";

const API = "https://api.kie.ai";
const KEY = process.env.KIE_API_KEY;
if (!KEY) { console.error("KIE_API_KEY missing"); process.exit(1); }

const STYLE =
  "soft 3D clay render style, matte finish, electric blue #0B24FA as dominant color with light blue #C3CCFF, white and deep navy #0D1136 accents, subtle gradients, floating composition, soft studio shadow, premium tech illustration, high detail, without background, transparent background";

const ASSETS = [
  {
    id: "hero-visual",
    out: "public/generated/hero-visual.png",
    size: "1:1",
    prompt:
      `Isometric 3D illustration of a modern intelligent website: a floating browser window showing a clean abstract business landing page, next to it a smartphone showing a green chat conversation with abstract message bubbles, a rising analytics arrow chart and a small magnifying glass, all elements floating together as one composition. STRICTLY NO TEXT, NO LETTERS, NO WORDS, NO TYPOGRAPHY anywhere - all interface text represented only as abstract rounded placeholder bars and blocks. The image MUST be an isolated cutout on a fully transparent background (PNG alpha channel): no backdrop, no background color, no gradient behind the objects, no glow halo. ${STYLE}`,
  },
  {
    id: "illu-strategie",
    out: "public/generated/illu-strategie.png",
    size: "1:1",
    prompt:
      `Minimal 3D icon illustration: a chess knight piece standing on a target bullseye with a small compass beside it, symbolizing business strategy and positioning. ${STYLE}`,
  },
  {
    id: "illu-site",
    out: "public/generated/illu-site.png",
    size: "1:1",
    prompt:
      `Minimal 3D icon illustration: a floating browser window with a sparkle/AI star on its corner and a small chat bubble, symbolizing an intelligent self-updating website. ${STYLE}`,
  },
  {
    id: "illu-acquisition",
    out: "public/generated/illu-acquisition.png",
    size: "1:1",
    prompt:
      `Minimal 3D icon illustration: a megaphone launching small user-profile icons toward a rising bar chart with an upward arrow, symbolizing client acquisition through targeted advertising. ${STYLE}`,
  },
];

async function createTask(asset) {
  const res = await fetch(`${API}/api/v1/jobs/createTask`, {
    method: "POST",
    headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-image-2-text-to-image",
      input: { prompt: asset.prompt, size: asset.size },
    }),
  });
  const data = await res.json();
  if (data.code !== 200) throw new Error(`${asset.id} createTask: ${JSON.stringify(data)}`);
  return data.data.taskId;
}

async function poll(taskId, id) {
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 8000));
    const res = await fetch(`${API}/api/v1/jobs/recordInfo?taskId=${taskId}`, {
      headers: { Authorization: `Bearer ${KEY}` },
    });
    const data = await res.json();
    const state = data?.data?.state;
    if (state === "success") {
      const result = JSON.parse(data.data.resultJson || "{}");
      const url = result?.resultUrls?.[0];
      if (!url) throw new Error(`${id}: success but no url`);
      return url;
    }
    if (state === "fail") throw new Error(`${id} failed: ${data.data.failMsg}`);
    process.stdout.write(`\r${id}: ${state || "waiting"} (${i * 8}s)`);
  }
  throw new Error(`${id}: timeout`);
}

async function generate(asset) {
  if (existsSync(asset.out)) { console.log(`${asset.id}: exists, skip`); return; }
  const taskId = await createTask(asset);
  console.log(`${asset.id}: task ${taskId}`);
  const url = await poll(taskId, asset.id);
  const img = await fetch(url);
  await writeFile(asset.out, Buffer.from(await img.arrayBuffer()));
  await writeFile(asset.out + ".url.txt", url);
  console.log(`\n${asset.id}: saved -> ${asset.out}`);
}

const results = await Promise.allSettled(ASSETS.map(generate));
results.forEach((r, i) => {
  if (r.status === "rejected") console.error(`FAILED ${ASSETS[i].id}:`, r.reason?.message);
});
