import assert from "node:assert/strict";
import { after, beforeEach, test } from "node:test";
import { LeafAnalysisError, leafAnalysisErrorMessage, predictLeaf } from "../src/lib/leafAnalysisApi.ts";
import type { LeafContentType } from "../src/lib/leafMedia.ts";

const tokenKey = "teasmart_access_token";
const storage = new Map<string, string>();
const originalStorage = Object.getOwnPropertyDescriptor(globalThis, "sessionStorage");
Object.defineProperty(globalThis, "sessionStorage", {
  configurable: true,
  value: {
    getItem: (key: string) => storage.get(key) ?? null,
    removeItem: (key: string) => storage.delete(key),
  },
});
beforeEach(() => {
  storage.clear();
  storage.set(tokenKey, "test-token");
});
after(() => {
  if (originalStorage) Object.defineProperty(globalThis, "sessionStorage", originalStorage);
  else Reflect.deleteProperty(globalThis, "sessionStorage");
});

function prediction(media_type: "image" | "video") {
  return {
    media_type, model_id: "mobilenetv2-epoch20", class_index: 0, label: "Nhãn 0", prediction_score: 0.7,
    class_probabilities: Array.from({ length: 7 }, (_, i) => ({
      class_index: i, label: `Nhãn ${i}`, probability: i === 0 ? 0.7 : 0.05,
    })),
    video: media_type === "video" ? { sampled_frames: 8, agreeing_frames: 4, agreement_ratio: 0.5 } : null,
    warnings: media_type === "video" ? ["INCONSISTENT_VIDEO_PREDICTIONS"] : [],
    notice: "Kết quả chỉ mang tính tham khảo.",
  };
}
const jpeg = new File(["sample"], "leaf.jpg", { type: "image/jpeg" });

test("leaf sends JPEG, PNG and MP4 directly as raw File to Spring using the current Bearer token", async t => {
  for (const type of ["image/jpeg", "image/png", "video/mp4"] as const satisfies readonly LeafContentType[]) {
    await t.test(type, async t => {
      const file = new File(["sample bytes"], "sample", { type });
      const expected = prediction(type === "video/mp4" ? "video" : "image");
      const mocked = t.mock.method(globalThis, "fetch", async (url: string, init: RequestInit) => {
        assert.equal(url, "/api/leaf-classifications/predict");
        assert.equal(init.method, "POST");
        assert.equal(init.body, file);
        const headers = new Headers(init.headers);
        assert.equal(headers.get("Content-Type"), type);
        assert.equal(headers.get("Authorization"), "Bearer test-token");
        return Response.json(expected);
      });
      assert.deepEqual(await predictLeaf(file, type, new AbortController().signal), expected);
      assert.equal(mocked.mock.callCount(), 1);
    });
  }
});

test("leaf requires login before making any network request", async t => {
  storage.clear();
  const mocked = t.mock.method(globalThis, "fetch");
  await assert.rejects(predictLeaf(jpeg, "image/jpeg", new AbortController().signal), (error: unknown) =>
    error instanceof LeafAnalysisError && error.status === 401 && /đăng nhập/.test(error.message));
  assert.equal(mocked.mock.callCount(), 0);
});

test("leaf distinguishes each HTTP failure without displaying upstream details", async t => {
  const statuses = [400, 401, 403, 413, 415, 422, 429, 502, 503, 504];
  const messages = new Set<string>();
  for (const status of statuses) {
    await t.test(String(status), async t => {
      storage.set(tokenKey, "test-token");
      t.mock.method(globalThis, "fetch", async () =>
        Response.json({ message: "private-internal-details", code: "PRIVATE" }, { status }));
      await assert.rejects(predictLeaf(jpeg, "image/jpeg", new AbortController().signal), (error: unknown) => {
        assert.ok(error instanceof LeafAnalysisError);
        assert.equal(error.status, status);
        const message = leafAnalysisErrorMessage(error);
        assert.doesNotMatch(message, /private|PRIVATE|test-token/);
        messages.add(message);
        return true;
      });
      assert.equal(storage.has(tokenKey), status !== 401);
    });
  }
  assert.equal(messages.size, statuses.length);
});

test("a late 401 from an old request preserves a newly issued token", async t => {
  t.mock.method(globalThis, "fetch", async () => {
    storage.set(tokenKey, "new-session");
    return new Response(null, { status: 401 });
  });
  await assert.rejects(predictLeaf(jpeg, "image/jpeg", new AbortController().signal));
  assert.equal(storage.get(tokenKey), "new-session");
});

test("leaf times out after a separate 90-second deadline and supports caller cancellation", async t => {
  const deadline = new AbortController();
  t.mock.method(AbortSignal, "timeout", (milliseconds: number) => {
    assert.equal(milliseconds, 90_000);
    return deadline.signal;
  });
  t.mock.method(globalThis, "fetch", (_url: string, init: RequestInit) => new Promise((_resolve, reject) => {
    const signal = init.signal!;
    signal.addEventListener("abort", () => reject(signal.reason), { once: true });
  }));
  const caller = new AbortController();
  const cancelled = predictLeaf(jpeg, "image/jpeg", caller.signal);
  caller.abort();
  await assert.rejects(cancelled, { name: "AbortError" });
  assert.equal(deadline.signal.aborted, false);

  const remaining = new AbortController();
  const timedOut = predictLeaf(jpeg, "image/jpeg", remaining.signal);
  deadline.abort(new DOMException("private details", "TimeoutError"));
  await assert.rejects(timedOut, error =>
    /quá thời gian chờ/.test(leafAnalysisErrorMessage(error)) && !remaining.signal.aborted);
});

test("leaf rejects malformed and wrong-media predictions as a safe 502", async t => {
  const responses = [
    new Response("<html>Unexpected server page</html>"),
    Response.json(prediction("video")),
    Response.json({ ...prediction("image"), class_probabilities: [] }),
  ];
  t.mock.method(globalThis, "fetch", async () => responses.shift()!);
  for (let i = 0; i < 3; i++) {
    await assert.rejects(predictLeaf(jpeg, "image/jpeg", new AbortController().signal), { status: 502 });
  }
});
