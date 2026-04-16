import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const heroPath = path.resolve(projectRoot, 'lp/public/hero.png');
const heroBase64 = fs.readFileSync(heroPath).toString('base64');
const heroDataUrl = `data:image/png;base64,${heroBase64}`;

const iconPath = path.resolve(projectRoot, 'src-tauri/icons/icon.svg');
const iconSvg = fs.readFileSync(iconPath, 'utf-8');
const iconDataUrl = `data:image/svg+xml;base64,${Buffer.from(iconSvg).toString('base64')}`;

const html = `
<!DOCTYPE html>
<html>
<head>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: 1280px;
    height: 640px;
    overflow: hidden;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
  }
  .container {
    width: 100%;
    height: 100%;
    background: linear-gradient(135deg, #eef2ff 0%, #f5f3ff 30%, #f0fdfa 70%, #eff6ff 100%);
    position: relative;
    display: flex;
    align-items: center;
    padding: 0 80px;
    gap: 60px;
  }
  /* Decorative orbs like the LP */
  .orb1 {
    position: absolute;
    top: -80px;
    left: 50%;
    transform: translateX(-50%);
    width: 600px;
    height: 400px;
    background: rgba(199, 210, 254, 0.4);
    border-radius: 50%;
    filter: blur(80px);
  }
  .orb2 {
    position: absolute;
    bottom: -60px;
    right: -40px;
    width: 300px;
    height: 300px;
    background: rgba(221, 214, 254, 0.4);
    border-radius: 50%;
    filter: blur(60px);
  }
  .orb3 {
    position: absolute;
    top: 60%;
    left: -40px;
    width: 200px;
    height: 200px;
    background: rgba(204, 251, 241, 0.3);
    border-radius: 50%;
    filter: blur(60px);
  }

  .text-side {
    position: relative;
    z-index: 1;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    gap: 16px;
    white-space: nowrap;
  }
  .icon {
    width: 56px;
    height: 56px;
    border-radius: 12px;
    box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
  }
  .title {
    font-size: 44px;
    font-weight: 800;
    color: #111827;
    letter-spacing: -1px;
    line-height: 1.1;
  }
  .subtitle {
    font-size: 20px;
    color: #6b7280;
    line-height: 1.5;
  }

  .screenshot-side {
    position: relative;
    z-index: 1;
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .screenshot-frame {
    border-radius: 12px;
    box-shadow: 0 20px 60px rgba(0,0,0,0.12), 0 4px 16px rgba(0,0,0,0.08);
    overflow: hidden;
    border: 1px solid rgba(0,0,0,0.06);
    background: white;
  }
  .screenshot-frame img {
    display: block;
    width: 100%;
  }
</style>
</head>
<body>
<div class="container">
  <div class="orb1"></div>
  <div class="orb2"></div>
  <div class="orb3"></div>

  <div class="text-side">
    <img class="icon" src="${iconDataUrl}" />
    <div class="title">Payment Clock</div>
    <div class="subtitle">Visual Stripe Test Clock Manager</div>
  </div>

  <div class="screenshot-side">
    <div class="screenshot-frame">
      <img src="${heroDataUrl}" />
    </div>
  </div>
</div>
</body>
</html>
`;

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage();
await page.setViewportSize({ width: 1280, height: 640 });
await page.setContent(html, { waitUntil: 'networkidle' });

const outputPath = path.resolve(projectRoot, 'social-preview.png');
await page.screenshot({ path: outputPath, type: 'png', clip: { x: 0, y: 0, width: 1280, height: 640 } });
await browser.close();

console.log(`Generated: ${outputPath}`);
