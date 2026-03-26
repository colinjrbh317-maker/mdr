import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'fs';

const BASE = 'http://localhost:4321';
const SCREENSHOT_DIR = './audit-screenshots';
mkdirSync(SCREENSHOT_DIR, { recursive: true });

const PAGES = [
  { name: 'homepage', path: '/' },
  { name: 'about', path: '/about' },
  { name: 'contact', path: '/contact' },
  { name: 'financing', path: '/financing' },
  { name: 'gallery', path: '/gallery' },
  { name: 'privacy', path: '/privacy' },
  { name: 'terms', path: '/terms' },
  { name: 'services-listing', path: '/services' },
  { name: 'service-roof-replacement', path: '/services/roof-replacement' },
  { name: 'service-roof-repair', path: '/services/roof-repair' },
  { name: 'areas-listing', path: '/areas' },
  { name: 'area-roanoke', path: '/areas/roanoke' },
  { name: 'blog-listing', path: '/blog' },
];

const MOBILE_VIEWPORT = { width: 375, height: 812 };
const DESKTOP_VIEWPORT = { width: 1440, height: 900 };

const findings = [];

function log(type, page, message) {
  findings.push({ type, page, message });
  const icon = type === 'ERROR' ? '❌' : type === 'WARNING' ? '⚠️' : '✅';
  console.log(`${icon} [${page}] ${message}`);
}

async function auditPage(page, browser, name, path) {
  const url = `${BASE}${path}`;
  const errors = [];
  const warnings = [];

  // Capture console errors
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', err => errors.push(err.message));

  try {
    const response = await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    const status = response?.status();

    if (status !== 200) {
      log('ERROR', name, `HTTP ${status} — page returned non-200 status`);
      return;
    }
    log('PASS', name, `HTTP 200 OK`);

    // Wait for content to settle
    await page.waitForTimeout(1000);

    // Desktop screenshot
    await page.setViewportSize(DESKTOP_VIEWPORT);
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/${name}-desktop.png`, fullPage: true });

    // Mobile screenshot
    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/${name}-mobile.png`, fullPage: true });
    log('PASS', name, `Screenshots captured (desktop + mobile)`);

    // Reset to desktop for analysis
    await page.setViewportSize(DESKTOP_VIEWPORT);
    await page.waitForTimeout(300);

    // Check title
    const title = await page.title();
    if (!title || title.length < 5) {
      log('WARNING', name, `Page title is missing or too short: "${title}"`);
    } else {
      log('PASS', name, `Title: "${title}"`);
    }

    // Check meta description
    const metaDesc = await page.$eval('meta[name="description"]', el => el.content).catch(() => null);
    if (!metaDesc) {
      log('WARNING', name, `Missing meta description`);
    } else if (metaDesc.length < 50) {
      log('WARNING', name, `Meta description too short (${metaDesc.length} chars): "${metaDesc}"`);
    } else {
      log('PASS', name, `Meta description present (${metaDesc.length} chars)`);
    }

    // Check H1
    const h1s = await page.$$eval('h1', els => els.map(e => e.textContent?.trim()));
    if (h1s.length === 0) {
      log('WARNING', name, `No H1 tag found`);
    } else if (h1s.length > 1) {
      log('WARNING', name, `Multiple H1 tags found (${h1s.length}): ${h1s.join(', ')}`);
    } else {
      log('PASS', name, `H1: "${h1s[0]}"`);
    }

    // Check images for alt text
    const images = await page.$$eval('img', els => els.map(e => ({
      src: e.src?.slice(-60),
      alt: e.alt,
      width: e.naturalWidth,
      height: e.naturalHeight,
    })));
    const missingAlt = images.filter(i => !i.alt || i.alt.trim() === '');
    if (missingAlt.length > 0) {
      log('WARNING', name, `${missingAlt.length}/${images.length} images missing alt text`);
    } else if (images.length > 0) {
      log('PASS', name, `All ${images.length} images have alt text`);
    }

    // Check broken images (zero dimensions)
    const brokenImgs = images.filter(i => i.width === 0 || i.height === 0);
    if (brokenImgs.length > 0) {
      log('ERROR', name, `${brokenImgs.length} broken images (0 dimensions): ${brokenImgs.map(i => i.src).join(', ')}`);
    }

    // Check internal links
    const links = await page.$$eval('a[href]', els => els.map(e => ({
      href: e.getAttribute('href'),
      text: e.textContent?.trim()?.slice(0, 40),
    })));
    const internalLinks = links.filter(l => l.href?.startsWith('/') || l.href?.startsWith(BASE));
    log('PASS', name, `${internalLinks.length} internal links, ${links.length - internalLinks.length} external links`);

    // Check for empty links
    const emptyLinks = links.filter(l => !l.text && !l.href?.startsWith('#'));
    if (emptyLinks.length > 0) {
      log('WARNING', name, `${emptyLinks.length} links with no visible text (accessibility issue)`);
    }

    // Check for CTA buttons
    const buttons = await page.$$('button, a.btn, a[class*="button"], a[class*="cta"], [role="button"]');
    if (buttons.length === 0 && name !== 'privacy' && name !== 'terms') {
      log('WARNING', name, `No CTA buttons found`);
    }

    // Check console errors
    if (errors.length > 0) {
      const uniqueErrors = [...new Set(errors)];
      uniqueErrors.forEach(e => log('ERROR', name, `Console error: ${e.slice(0, 200)}`));
    }

    // Check for JSON-LD structured data
    const jsonLd = await page.$$eval('script[type="application/ld+json"]', els => els.map(e => {
      try { return JSON.parse(e.textContent); } catch { return null; }
    }));
    if (jsonLd.length > 0) {
      const types = jsonLd.filter(Boolean).map(j => j['@type'] || 'unknown');
      log('PASS', name, `JSON-LD schema: ${types.join(', ')}`);
    } else if (['homepage', 'service-roof-replacement', 'area-roanoke'].includes(name)) {
      log('WARNING', name, `No JSON-LD structured data found`);
    }

    // Check viewport meta tag (mobile)
    const viewportMeta = await page.$('meta[name="viewport"]');
    if (!viewportMeta) {
      log('ERROR', name, `Missing viewport meta tag`);
    }

    // Check for Open Graph tags
    const ogTitle = await page.$('meta[property="og:title"]');
    const ogImage = await page.$('meta[property="og:image"]');
    if (!ogTitle) log('WARNING', name, `Missing og:title`);
    if (!ogImage) log('WARNING', name, `Missing og:image`);

  } catch (err) {
    log('ERROR', name, `Page failed to load: ${err.message}`);
  }
}

async function checkBrokenLinks(page) {
  console.log('\n🔗 CHECKING INTERNAL LINKS FOR BROKEN URLS...\n');
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });

  const allLinks = await page.$$eval('a[href]', els =>
    [...new Set(els.map(e => e.getAttribute('href')).filter(h => h?.startsWith('/')))]
  );

  let broken = 0;
  for (const link of allLinks) {
    try {
      const resp = await page.goto(`${BASE}${link}`, { waitUntil: 'domcontentloaded', timeout: 10000 });
      if (resp?.status() >= 400) {
        log('ERROR', 'links', `Broken link: ${link} → HTTP ${resp.status()}`);
        broken++;
      }
    } catch {
      log('ERROR', 'links', `Broken link (timeout): ${link}`);
      broken++;
    }
  }

  if (broken === 0) {
    log('PASS', 'links', `All ${allLinks.length} internal links from homepage are valid`);
  } else {
    log('ERROR', 'links', `${broken}/${allLinks.length} broken internal links found`);
  }
}

async function testContactForm(page) {
  console.log('\n📝 TESTING CONTACT FORM...\n');
  await page.goto(`${BASE}/contact`, { waitUntil: 'networkidle' });

  const form = await page.$('form');
  if (!form) {
    log('WARNING', 'contact-form', 'No form element found on contact page');
    return;
  }

  // Check form fields exist
  const fields = await page.$$eval('form input, form textarea, form select', els =>
    els.map(e => ({ type: e.type || e.tagName.toLowerCase(), name: e.name, required: e.required }))
  );
  log('PASS', 'contact-form', `Form has ${fields.length} fields: ${fields.map(f => f.name || f.type).join(', ')}`);

  // Check submit button
  const submitBtn = await page.$('form button[type="submit"], form input[type="submit"], form button:not([type])');
  if (!submitBtn) {
    log('WARNING', 'contact-form', 'No submit button found in form');
  } else {
    log('PASS', 'contact-form', 'Submit button present');
  }
}

async function main() {
  console.log('🔍 MDR WEBSITE CRITICAL AUDIT\n');
  console.log('='.repeat(60));

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: DESKTOP_VIEWPORT });
  const page = await context.newPage();

  // Audit each page
  for (const p of PAGES) {
    console.log(`\n--- ${p.name.toUpperCase()} (${p.path}) ---`);
    // Clear console listeners from previous page
    page.removeAllListeners('console');
    page.removeAllListeners('pageerror');
    await auditPage(page, browser, p.name, p.path);
  }

  // Check broken links
  await checkBrokenLinks(page);

  // Test contact form
  await testContactForm(page);

  await browser.close();

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 AUDIT SUMMARY\n');

  const errors = findings.filter(f => f.type === 'ERROR');
  const warnings = findings.filter(f => f.type === 'WARNING');
  const passes = findings.filter(f => f.type === 'PASS');

  console.log(`✅ PASSES:   ${passes.length}`);
  console.log(`⚠️  WARNINGS: ${warnings.length}`);
  console.log(`❌ ERRORS:   ${errors.length}`);

  if (errors.length > 0) {
    console.log('\n--- ERRORS ---');
    errors.forEach(e => console.log(`  ❌ [${e.page}] ${e.message}`));
  }
  if (warnings.length > 0) {
    console.log('\n--- WARNINGS ---');
    warnings.forEach(w => console.log(`  ⚠️  [${w.page}] ${w.message}`));
  }

  // Write report
  const report = { timestamp: new Date().toISOString(), findings, summary: { passes: passes.length, warnings: warnings.length, errors: errors.length } };
  writeFileSync('./audit-report.json', JSON.stringify(report, null, 2));
  console.log('\n📄 Full report saved to audit-report.json');
  console.log(`📸 Screenshots saved to ${SCREENSHOT_DIR}/`);
}

main().catch(console.error);
