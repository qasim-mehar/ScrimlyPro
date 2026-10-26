// Minimal dependency-free CDP client for the C7.1 acceptance passes.
// Launches headless Chrome, talks the DevTools protocol over WebSocket.
// Node >= 22 (global WebSocket + fetch).
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export const CHROME_CANDIDATES = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
];

export class CdpError extends Error {}

export class CdpSession {
  constructor(ws, url) {
    this.ws = ws;
    this.url = url;
    this.nextId = 1;
    this.pending = new Map();
    this.listeners = new Map();
    ws.addEventListener("message", (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id !== undefined) {
        const resolve = this.pending.get(msg.id);
        if (resolve) {
          this.pending.delete(msg.id);
          if (msg.error) {
            resolve.reject(new CdpError(`${msg.error.message} (${msg.error.data ?? ""})`));
          } else {
            resolve.resolve(msg.result);
          }
        }
        return;
      }
      for (const fn of this.listeners.get(msg.method) ?? []) {
        try {
          fn(msg.params);
        } catch {
          // listener errors must not break the pump
        }
      }
    });
  }

  on(method, fn) {
    if (!this.listeners.has(method)) this.listeners.set(method, []);
    this.listeners.get(method).push(fn);
  }

  send(method, params = {}) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  close() {
    try {
      this.ws.close();
    } catch {
      // already closed
    }
  }
}

/** Launch headless Chrome with CDP; resolves { browser, wsUrl, userDataDir }. */
export async function launchChrome({
  port = 9223,
  chromePath,
  headless = true,
} = {}) {
  const exe = chromePath ?? CHROME_CANDIDATES.find((p) => existsSync(p));
  if (!exe) throw new CdpError("chrome.exe not found");
  const userDataDir = mkdtempSync(join(tmpdir(), "scrimly-cdp-"));
  const args = [
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userDataDir}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-gpu",
    "--window-size=1400,900",
  ];
  if (headless) args.push("--headless=new");
  const proc = spawn(exe, args, { stdio: "ignore" });

  // Poll /json/version until the debugger answers.
  let version = null;
  for (let i = 0; i < 100; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (res.ok) {
        version = await res.json();
        break;
      }
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 150));
  }
  if (!version) {
    proc.kill();
    throw new CdpError("Chrome debugger did not come up");
  }
  const ws = new WebSocket(version.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener("open", resolve);
    ws.addEventListener("error", () => reject(new CdpError("ws connect failed")));
  });
  return {
    browser: new CdpSession(ws, version.webSocketDebuggerUrl),
    wsUrl: version.webSocketDebuggerUrl,
    userDataDir,
    proc,
  };
}

/** launchChrome with one retry — headless Chrome occasionally flaps on Windows. */
export async function launchChromeRetry(opts = {}) {
  let lastErr;
  for (let i = 0; i < 3; i++) {
    try {
      return await launchChrome(opts);
    } catch (err) {
      lastErr = err;
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  throw lastErr;
}

/** Attach to (or create) a page target and return a Page-bound CdpSession. */
export async function openPage(browser, url) {
  const { targetId } = await browser.send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await browser.send("Target.attachToTarget", {
    targetId,
    flatten: true,
  });
  const page = new CdpSession(browser.ws, null);
  // Flatten mode: sessionId rides along each message.
  const origSend = page.send.bind(page);
  page.send = (method, params) => {
    const id = page.nextId++;
    return new Promise((resolve, reject) => {
      page.pending.set(id, { resolve, reject });
      browser.ws.send(JSON.stringify({ id, method, params, sessionId }));
    });
  };
  page.targetId = targetId;
  await page.send("Page.enable");
  await page.send("Runtime.enable");
  if (url) {
    await page.send("Page.navigate", { url });
    await page.waitLoaded();
  }
  return page;
}

CdpSession.prototype.waitLoaded = async function waitLoaded(timeoutMs = 30000) {
  await new Promise((resolve) => {
    const timer = setTimeout(done, timeoutMs);
    const onLoaded = () => {
      clearTimeout(timer);
      resolve();
    };
    const onEvent = (p) => {
      if (p) onLoaded();
    };
    this.on("Page.loadEventFired", onEvent);
    function done() {
      onEvent(null);
    }
  });
};

/** Evaluate an expression (async OK); returns the JSON value. */
CdpSession.prototype.evaluate = async function evaluate(expression) {
  const res = await this.send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (res.exceptionDetails) {
    const detail = res.exceptionDetails;
    throw new CdpError(
      `evaluate failed: ${detail.text} ${detail.exception?.description ?? ""}`,
    );
  }
  return res.result?.value;
};

/** Wait until the predicate (evaluated in page) is truthy. */
CdpSession.prototype.waitFor = async function waitFor(
  expression,
  timeoutMs = 15000,
  intervalMs = 100,
) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    let value = null;
    try {
      value = await this.evaluate(expression);
    } catch {
      // page mid-transition — retry
    }
    if (value) return value;
    if (Date.now() > deadline) {
      throw new CdpError(`waitFor timeout: ${expression}`);
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
};

/** Current page URL via Runtime (works through SPA navigations). */
CdpSession.prototype.getLocation = function getLocation() {
  return this.evaluate("location.href");
};

/** Wait until the page contains the given text. */
CdpSession.prototype.waitForText = function waitForText(text, timeoutMs = 15000) {
  return this.waitFor(
    `document.body !== null && document.body.textContent.includes(${JSON.stringify(text)})`,
    timeoutMs,
  );
};

/** Click a button by visible text, retrying until the sentinel text appears. */
CdpSession.prototype.clickTextAndWait = async function clickTextAndWait(
  text,
  sentinel,
  timeoutMs = 15000,
) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    try {
      await this.clickText(text);
    } catch {
      // element not in DOM yet
    }
    try {
      await this.waitForText(sentinel, 2000);
      return true;
    } catch {
      if (Date.now() > deadline) {
        throw new CdpError(`clickTextAndWait: sentinel "${sentinel}" never appeared`);
      }
      await new Promise((r) => setTimeout(r, 300));
    }
  }
};

/**
 * Text-sentinel variant of setFilesUntil — sentinel is page TEXT.
 */
CdpSession.prototype.setFilesAndWait = function setFilesAndWait(
  filePaths,
  text,
  inputIndex = 0,
  timeoutMs = 20000,
) {
  return this.setFilesUntil(
    filePaths,
    `document.body !== null && document.body.textContent.includes(${JSON.stringify(text)})`,
    inputIndex,
    timeoutMs,
  );
};

/**
 * Set files on the Nth file input, retrying until the sentinel EXPRESSION
 * (evaluated in page, must be truthy) holds. CDP fires the native change
 * event, which is lost if hydration hasn't attached listeners yet — hence
 * the retry.
 */
CdpSession.prototype.setFilesUntil = async function setFilesUntil(
  filePaths,
  expression,
  inputIndex = 0,
  timeoutMs = 20000,
) {
  const deadline = Date.now() + timeoutMs;
  const paths = Array.isArray(filePaths) ? filePaths : [filePaths];
  let hydrated = false;
  for (;;) {
    if (!hydrated) {
      // Wait for React fiber attachment on the input — change events fired
      // before this are lost (pre-hydration).
      hydrated = await this.waitFor(
        `(() => { const el = document.querySelectorAll('input[type=file]')[${inputIndex}]; return el ? Object.keys(el).some(k => k.startsWith('__react')) : false; })()`,
        timeoutMs,
        250,
      ).catch(() => false);
    }
    await this.setFiles(paths, inputIndex);
    try {
      await this.waitFor(expression, 2000);
      return true;
    } catch {
      if (Date.now() > deadline) {
        throw new CdpError(`setFilesUntil: sentinel never appeared: ${expression}`);
      }
      await new Promise((r) => setTimeout(r, 300));
    }
  }
};

/** Click the first element matching a CSS selector. */
CdpSession.prototype.click = function click(selector) {
  return this.evaluate(`(() => {
    const el = document.querySelector(${JSON.stringify(selector)});
    if (!el) throw new Error("no element: ${selector.replace(/"/g, "")}");
    el.click();
    return true;
  })()`);
};

/** Click a button by visible text (exact or regex-ish contains). */
CdpSession.prototype.clickText = function clickText(text) {
  return this.evaluate(
    `(() => {
      const wanted = ${JSON.stringify(text)};
      const els = [...document.querySelectorAll('button, a, [role="tab"]')];
      const el = els.find(e => e.textContent.trim() === wanted)
        ?? els.find(e => e.textContent.trim().includes(wanted));
      if (!el) throw new Error("no button with text: " + wanted);
      el.click();
      return el.textContent.trim();
    })()`,
  );
};

/**
 * Set files on the Nth file input (0-based) — fires change automatically.
 * Uses DOM.setFileInputFiles, the only way real files enter a page.
 */
CdpSession.prototype.setFiles = async function setFiles(filePathOrPaths, inputIndex = 0) {
  await this.send("DOM.enable");
  const { root } = await this.send("DOM.getDocument");
  const { nodeIds } = await this.send("DOM.querySelectorAll", {
    nodeId: root.nodeId,
    selector: 'input[type="file"]',
  });
  const nodeId = nodeIds[inputIndex];
  if (!nodeId) throw new CdpError(`no file input at index ${inputIndex} (found ${nodeIds.length})`);
  await this.send("DOM.setFileInputFiles", {
    nodeId,
    files: Array.isArray(filePathOrPaths) ? filePathOrPaths : [filePathOrPaths],
  });
  return nodeIds.length;
};

/** Emulate a mobile viewport (375×667 @2x by default). */
CdpSession.prototype.setViewport = function setViewport(
  width = 375,
  height = 667,
) {
  return this.send("Emulation.setDeviceMetricsOverride", {
    width,
    height,
    deviceScaleFactor: 2,
    mobile: true,
  });
};

CdpSession.prototype.clearViewport = function clearViewport() {
  return this.send("Emulation.clearDeviceMetricsOverride");
};

/** PNG screenshot of the current viewport → Buffer. */
CdpSession.prototype.screenshot = async function screenshot() {
  const res = await this.send("Page.captureScreenshot", { format: "png" });
  return Buffer.from(res.data, "base64");
};
