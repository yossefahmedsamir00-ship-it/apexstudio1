import {
  assertAllowedOrigin,
  correlationId,
  FlowRequestError,
  readJsonBody,
  requireEnum,
  requireInteger,
  requireString,
  toFlowError,
} from "./flow-engine-contracts.ts";

Deno.test("readJsonBody accepts a bounded JSON object", async () => {
  const request = new Request("https://local.test", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action: "create", prompt: "Make a storyboard" }),
  });
  const body = await readJsonBody(request);
  if (body.action !== "create") throw new Error("Expected parsed action");
});

Deno.test("readJsonBody rejects oversized bodies", async () => {
  const request = new Request("https://local.test", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ prompt: "x".repeat(500) }),
  });
  try {
    await readJsonBody(request, 100);
  } catch (error) {
    if (!(error instanceof FlowRequestError) || error.status !== 413) throw error;
    return;
  }
  throw new Error("Expected oversized request rejection");
});

Deno.test("readJsonBody rejects non-object or malformed JSON", async () => {
  const request = new Request("https://local.test", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "[]",
  });
  try {
    await readJsonBody(request);
  } catch (error) {
    if (!(error instanceof FlowRequestError) || error.code !== "validation_error") throw error;
    return;
  }
  throw new Error("Expected JSON object validation error");
});

Deno.test("assertAllowedOrigin allows native requests and rejects unknown browser origins", () => {
  assertAllowedOrigin(new Request("https://local.test", { method: "POST" }));
  try {
    assertAllowedOrigin(new Request("https://local.test", {
      method: "POST",
      headers: { origin: "https://untrusted.example" },
    }));
  } catch (error) {
    if (!(error instanceof FlowRequestError) || error.status !== 403) throw error;
    return;
  }
  throw new Error("Expected untrusted origin rejection");
});

Deno.test("validators enforce operation input bounds", () => {
  if (requireString("  hello  ", "title", 20) !== "hello") {
    throw new Error("Expected trimmed safe string");
  }
  if (requireEnum("draft", "status", ["draft", "queued"] as const) !== "draft") {
    throw new Error("Expected supported enum value");
  }
  if (requireInteger(5, 0, 10) !== 5) throw new Error("Expected bounded integer");
});

Deno.test("safe errors hide raw implementation data and have correlation IDs", () => {
  const id = correlationId();
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new Error("Expected UUID correlation ID");
  const safe = toFlowError(new Error("Bearer service_role secret"));
  if (safe.message.includes("secret") || safe.message.includes("Bearer")) {
    throw new Error("Raw error data leaked");
  }
});
