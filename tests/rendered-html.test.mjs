import assert from "node:assert/strict";
import test from "node:test";

const developmentPreviewMeta =
  /<meta(?=[^>]*\bname=["']codex-preview["'])(?=[^>]*\bcontent=["']development["'])[^>]*>/i;

async function loadWorker() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${Math.random()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker;
}

const env = {
  ASSETS: {
    fetch: async () => new Response("Not found", { status: 404 }),
  },
};

const context = {
  waitUntil() {},
  passThroughOnException() {},
};

test("renders development preview metadata", async () => {
  const worker = await loadWorker();

  const response = await worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    env,
    context,
  );

  assert.equal(response.status, 200);
  assert.match(
    response.headers.get("content-type") ?? "",
    /^text\/html\b/i,
  );
  assert.match(await response.text(), developmentPreviewMeta);
});

test("keeps paid AI analysis disabled without explicit runtime settings", async () => {
  const worker = await loadWorker();
  const statusResponse = await worker.fetch(
    new Request("http://localhost/api/analyze"),
    env,
    context,
  );
  assert.equal(statusResponse.status, 200);
  assert.deepEqual(await statusResponse.json(), {
    enabled: false,
    mode: "accuracy-first",
    detail: "high",
    billing_guard: "ENABLE_PAID_AI must be explicitly set to true",
  });

  const analyzeResponse = await worker.fetch(
    new Request("http://localhost/api/analyze", { method: "POST" }),
    env,
    context,
  );
  assert.equal(analyzeResponse.status, 503);
  assert.equal((await analyzeResponse.json()).code, "AI_DISABLED");
});
