import { readFileSync } from "node:fs";

const targets = JSON.parse(
  await (await fetch("http://127.0.0.1:9222/json/list")).text()
);
const target = targets.find(item => item.type === "page");
if (!target) throw new Error("No Chromium page target found");

const socket = new WebSocket(target.webSocketDebuggerUrl);
let nextId = 1;
const pending = new Map();
socket.addEventListener("message", event => {
  const payload = JSON.parse(event.data);
  if (payload.id && pending.has(payload.id)) {
    pending.get(payload.id)(payload);
    pending.delete(payload.id);
  }
});
await new Promise((resolve, reject) => {
  socket.addEventListener("open", resolve, { once: true });
  socket.addEventListener("error", reject, { once: true });
});

function command(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = nextId++;
    pending.set(id, payload =>
      payload.error
        ? reject(new Error(JSON.stringify(payload.error)))
        : resolve(payload.result)
    );
    socket.send(JSON.stringify({ id, method, params }));
  });
}

async function evaluate(expression) {
  const result = await command("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  return result.result?.value;
}

const checks = [];
for (const viewport of [
  { name: "desktop", width: 1366, height: 768 },
  { name: "tablet", width: 820, height: 1180 },
  { name: "mobile", width: 390, height: 844 },
]) {
  await command("Emulation.setDeviceMetricsOverride", {
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: 1,
    mobile: viewport.name === "mobile",
  });
  await command("Page.navigate", { url: "http://localhost:3000/matches" });
  await new Promise(resolve => setTimeout(resolve, 1200));
  checks.push({
    viewport,
    state: await evaluate(
      `(() => ({ width: innerWidth, height: innerHeight, title: document.title, horizontalOverflow: document.documentElement.scrollWidth > innerWidth, focusableCount: document.querySelectorAll('a,button,input,select,[tabindex]').length, navLinks: document.querySelectorAll('nav a, nav button').length }))()`
    ),
  });
}

await command("Emulation.clearDeviceMetricsOverride");
console.log(JSON.stringify(checks, null, 2));
socket.close();
