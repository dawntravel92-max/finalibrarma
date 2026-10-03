const baseUrl = process.env.PHASE8_BASE_URL ?? "http://localhost:3001";
const targets = JSON.parse(
  await (await fetch("http://127.0.0.1:9222/json/list")).text()
);
const target = targets.find(item => item.type === "page");
if (!target) throw new Error("No Chromium page target found");

const socket = new WebSocket(target.webSocketDebuggerUrl);
let nextId = 1;
const pending = new Map();
const consoleErrors = [];
socket.addEventListener("message", event => {
  const payload = JSON.parse(event.data);
  if (
    payload.method === "Runtime.consoleAPICalled" &&
    ["error", "assert"].includes(payload.params.type)
  ) {
    const text =
      payload.params.args
        ?.map(arg => arg.value ?? arg.description ?? "")
        .join(" ") ?? payload.params.type;
    consoleErrors.push(text);
  }
  if (
    payload.method === "Log.entryAdded" &&
    ["error", "assert"].includes(payload.params.entry.level)
  ) {
    consoleErrors.push(payload.params.entry.text);
  }
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
  if (result.exceptionDetails)
    throw new Error(
      result.exceptionDetails.text ?? "Browser evaluation failed"
    );
  return result.result?.value;
}
async function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

await command("Runtime.enable");
await command("Log.enable");
const routes = [
  "/",
  "/matches",
  "/match/espn-401882912",
  "/competitions",
  "/competition/laliga",
  "/team/real-madrid",
  "/player/vinicius-junior",
  "/calendar",
  "/search",
  "/data-center",
];
const results = [];
for (const viewport of [
  { name: "desktop", width: 1366, height: 768, mobile: false },
  { name: "tablet", width: 820, height: 1180, mobile: false },
  { name: "mobile", width: 390, height: 844, mobile: true },
]) {
  await command("Emulation.setDeviceMetricsOverride", {
    ...viewport,
    deviceScaleFactor: 1,
  });
  for (const route of routes) {
    const errorStart = consoleErrors.length;
    await command("Page.navigate", { url: `${baseUrl}${route}` });
    await wait(1300);
    const state = await evaluate(`(() => ({
      path: location.pathname,
      title: document.title,
      root: Boolean(document.getElementById('root')),
      horizontalOverflow: document.documentElement.scrollWidth > innerWidth || document.body.scrollWidth > innerWidth,
      navCount: document.querySelectorAll('nav a, nav button').length,
      interactiveCount: document.querySelectorAll('a,button,input,select,textarea,[tabindex]').length,
      criticalText: document.body.innerText.includes('Application error') || document.body.innerText.includes('Internal Server Error')
    }))()`);
    results.push({
      viewport: viewport.name,
      route,
      state,
      consoleErrors: consoleErrors.slice(errorStart),
    });
  }
}

await command("Emulation.clearDeviceMetricsOverride");
await command("Page.navigate", { url: `${baseUrl}/matches` });
await wait(1000);
const beforeNavigation = await evaluate("location.pathname");
await command("Page.navigate", { url: `${baseUrl}/calendar` });
await wait(1000);
const afterForward = await evaluate("location.pathname");
await command("Runtime.evaluate", { expression: "history.back()" });
await wait(1000);
const afterBack = await evaluate("location.pathname");
await command("Page.reload", { ignoreCache: false });
await wait(1200);
const afterRefresh = await evaluate("location.pathname");

const summary = {
  baseUrl,
  routeCount: routes.length,
  viewportCount: 3,
  results,
  navigation: { beforeNavigation, afterForward, afterBack, afterRefresh },
  consoleErrors,
  failures: results.filter(
    item =>
      item.state.path !== item.route ||
      !item.state.root ||
      !item.state.title ||
      item.state.horizontalOverflow ||
      item.state.criticalText ||
      item.consoleErrors.length > 0
  ),
};
console.log(JSON.stringify(summary, null, 2));
socket.close();
if (
  summary.failures.length ||
  summary.consoleErrors.length ||
  summary.navigation.afterForward !== "/calendar" ||
  summary.navigation.afterBack !== "/matches" ||
  summary.navigation.afterRefresh !== "/matches"
)
  process.exitCode = 1;
