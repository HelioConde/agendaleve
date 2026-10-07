import { chromium } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";

const baseUrl = process.env.SCREENSHOT_BASE_URL || "http://127.0.0.1:4173/";
const outputDir = process.env.SCREENSHOT_DIR || "screenshots";
await fs.mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({ headless: true });

async function capture(name, viewport) {
  const page = await browser.newPage({ viewport });
  const consoleErrors = [];
  const failedRequests = [];

  page.on("console", message => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("requestfailed", request => {
    const url = request.url();
    if (!url.startsWith("data:")) {
      failedRequests.push({ url, error: request.failure()?.errorText || "request failed" });
    }
  });

  await page.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(1800);

  const audit = await page.evaluate(() => {
    const visible = element => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity || 1) > 0 && rect.width > 0 && rect.height > 0;
    };

    const overflow = [...document.querySelectorAll("body *")].filter(element => {
      if (!visible(element)) return false;
      const rect = element.getBoundingClientRect();
      if (rect.left < -2 || rect.right > document.documentElement.clientWidth + 2) {
        let parent = element.parentElement;
        while (parent && parent !== document.body) {
          const style = getComputedStyle(parent);
          if ((style.overflowX === "auto" || style.overflowX === "scroll") && parent.scrollWidth > parent.clientWidth) return false;
          parent = parent.parentElement;
        }
        return true;
      }
      return false;
    }).slice(0, 30).map(element => {
      const rect = element.getBoundingClientRect();
      return {
        tag: element.tagName.toLowerCase(),
        id: element.id || "",
        className: String(element.className || "").slice(0, 120),
        left: Math.round(rect.left),
        right: Math.round(rect.right),
        width: Math.round(rect.width)
      };
    });

    const smallTapTargets = [...document.querySelectorAll("button,a,input,select,textarea,[role='button']")]
      .filter(element => visible(element))
      .filter(element => {
        if (element instanceof HTMLInputElement && (element.type === "checkbox" || element.type === "radio")) {
          const label = element.closest("label");
          if (label && visible(label)) {
            const rect = label.getBoundingClientRect();
            if (rect.width >= 36 && rect.height >= 36) return false;
          }
        }
        return true;
      })
      .map(element => {
        const rect = element.getBoundingClientRect();
        return {
          tag: element.tagName.toLowerCase(),
          id: element.id || "",
          className: String(element.className || "").slice(0, 120),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          text: String(element.textContent || element.getAttribute("aria-label") || "").trim().slice(0, 80)
        };
      })
      .filter(item => item.width < 36 || item.height < 36)
      .slice(0, 30);

    const tinyText = [...document.querySelectorAll("body *")]
      .filter(element => visible(element) && element.children.length === 0 && String(element.textContent || "").trim())
      .map(element => ({
        text: String(element.textContent || "").trim().slice(0, 90),
        fontSize: Number.parseFloat(getComputedStyle(element).fontSize)
      }))
      .filter(item => item.fontSize > 0 && item.fontSize < 10)
      .slice(0, 30);

    const brokenImages = [...document.images]
      .filter(image => visible(image) && image.complete && image.naturalWidth === 0)
      .map(image => image.currentSrc || image.src)
      .slice(0, 30);

    return {
      title: document.title,
      width: document.documentElement.scrollWidth,
      height: document.documentElement.scrollHeight,
      viewportWidth: innerWidth,
      viewportHeight: innerHeight,
      overflow,
      smallTapTargets,
      tinyText,
      brokenImages
    };
  });

  await page.screenshot({ path: path.join(outputDir, name), fullPage: true });
  await page.close();

  return {
    name,
    viewport,
    ...audit,
    consoleErrors: consoleErrors.slice(0, 20),
    failedRequests: failedRequests.slice(0, 20)
  };
}

const captures = [
  await capture("desktop-full.png", { width: 1440, height: 1000 }),
  await capture("mobile-full.png", { width: 390, height: 844 })
];

await browser.close();

const generatedAt = new Date().toISOString();
const failures = [];
for (const capture of captures) {
  if (capture.overflow.length) failures.push(`${capture.name}: ${capture.overflow.length} unintended overflow element(s)`);
  if (capture.consoleErrors.length) failures.push(`${capture.name}: ${capture.consoleErrors.length} console error(s)`);
  if (capture.failedRequests.length) failures.push(`${capture.name}: ${capture.failedRequests.length} failed request(s)`);
  if (capture.brokenImages.length) failures.push(`${capture.name}: ${capture.brokenImages.length} broken image(s)`);
  if (capture.viewportWidth <= 420 && capture.smallTapTargets.length) failures.push(`${capture.name}: ${capture.smallTapTargets.length} small tap target(s)`);
}

await fs.writeFile(path.join(outputDir, "metadata.json"), JSON.stringify({ generatedAt, baseUrl, captures }, null, 2));
await fs.writeFile(path.join(outputDir, "visual-quality.json"), JSON.stringify({ generatedAt, passed: failures.length === 0, failures }, null, 2));

const lines = ["# Visual audit", "", `Generated: ${generatedAt}`, ""];
for (const capture of captures) {
  lines.push(`## ${capture.name}`, "");
  lines.push(`- Viewport: ${capture.viewportWidth}×${capture.viewportHeight}`);
  lines.push(`- Page: ${capture.width}×${capture.height}`);
  lines.push(`- Overflow elements: ${capture.overflow.length}`);
  lines.push(`- Small tap targets: ${capture.smallTapTargets.length}`);
  lines.push(`- Tiny text nodes (<10px): ${capture.tinyText.length}`);
  lines.push(`- Console errors: ${capture.consoleErrors.length}`);
  lines.push(`- Failed requests: ${capture.failedRequests.length}`);
  lines.push(`- Broken images: ${capture.brokenImages.length}`, "");
  if (capture.overflow.length) lines.push("### Overflow", ...capture.overflow.map(item => `- ${item.tag}#${item.id}.${item.className}: ${item.left}.. ${item.right}px`), "");
  if (capture.smallTapTargets.length) lines.push("### Small tap targets", ...capture.smallTapTargets.map(item => `- ${item.tag}#${item.id}.${item.className}: ${item.width}×${item.height}px — ${item.text}`), "");
  if (capture.tinyText.length) lines.push("### Tiny text", ...capture.tinyText.map(item => `- ${item.fontSize}px — ${item.text}`), "");
}
await fs.writeFile(path.join(outputDir, "visual-audit.md"), lines.join("\n"));

if (failures.length) console.error("Visual quality issues detected:\n" + failures.map(item => "- " + item).join("\n"));
else console.log("Visual quality gate passed.");
