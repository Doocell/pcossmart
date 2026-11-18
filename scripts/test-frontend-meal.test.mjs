import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  ALLOWED_IMAGE_TYPES,
  computeScaledDimensions,
  stripDataUrlPrefix,
  validateImageFileMeta,
} from "../frontend/src/lib/imageUtils.js";

import {
  formatLocalMealUserContent,
  normalizeMealLocal,
  resolveLocalMealFallbackReply,
} from "../frontend/src/lib/mealFallbackUtils.js";
import { clearConversationHistory } from "../frontend/src/lib/chatHistoryUtils.js";

describe("imageUtils helpers", () => {
  it("scales dimensions proportionally when exceeding maxDim", () => {
    assert.deepEqual(computeScaledDimensions(2400, 1200, 1024), {
      width: 1024,
      height: 512,
    });
    assert.deepEqual(computeScaledDimensions(1000, 2000, 1024), {
      width: 512,
      height: 1024,
    });
  });

  it("preserves original dimensions when within maxDim", () => {
    assert.deepEqual(computeScaledDimensions(800, 600, 1024), {
      width: 800,
      height: 600,
    });
  });

  it("validates supported MIME types and raw file byte limits", () => {
    assert.deepEqual(ALLOWED_IMAGE_TYPES, ["image/jpeg", "image/png", "image/webp"]);
    assert.doesNotThrow(() =>
      validateImageFileMeta({ type: "image/webp", size: 500_000 })
    );
    assert.throws(
      () => validateImageFileMeta({ type: "image/gif", size: 1024 }),
      /JPEG|PNG|WebP/i
    );
    assert.throws(
      () => validateImageFileMeta({ type: "image/jpeg", size: 25 * 1024 * 1024 }),
      /terlalu besar|20 MB/i
    );
  });

  it("strips data URI prefix to raw base64", () => {
    assert.equal(
      stripDataUrlPrefix("data:image/jpeg;base64,/9j/4AAQ"),
      "/9j/4AAQ"
    );
  });
});

describe("mealFallbackUtils", () => {
  it("normalizes non-JSON raw strings as non-food without throwing or fabricating a score", () => {
    for (const raw of ["{oops", "plain text tanpa json", null]) {
      const res = normalizeMealLocal(raw);
      assert.equal(res.is_food, false);
      assert.equal(res.pcos_score, null);
      assert.equal(res.gi_category, null);
      assert.ok(res.assistant_reply.length > 0);
    }
  });

  it("handles pcos_score 0, null, and stringified boolean accurately", () => {
    const zero = normalizeMealLocal({ is_food: true, pcos_score: 0 });
    assert.equal(zero.is_food, true);
    assert.equal(zero.pcos_score, 0);

    const nullScore = normalizeMealLocal({ is_food: true, pcos_score: null });
    assert.equal(nullScore.is_food, true);
    assert.equal(nullScore.pcos_score, 70);

    const strFalse = normalizeMealLocal({ is_food: "false", pcos_score: 80 });
    assert.equal(strFalse.is_food, false);
    assert.equal(strFalse.pcos_score, null);
  });

  it("returns non-food fallback and skips fabricating 74/100 when DEV rawText is malformed", () => {
    const resolved = resolveLocalMealFallbackReply({
      rawText: "Maaf server sibuk",
      flagLevel: "none",
    });
    assert.equal(resolved.mealAnalysis, null);
    assert.match(resolved.replyText, /makanan/i);
  });

  it("formats local user content for non-food and safety short-circuit identically to backend", () => {
    assert.equal(
      formatLocalMealUserContent(null, ""),
      "[Foto Bukan Makanan / Tidak Jelas]"
    );
    assert.equal(
      formatLocalMealUserContent(null, "halo", true),
      "halo"
    );
    assert.equal(
      formatLocalMealUserContent(null, "", true),
      "[Foto Makanan]"
    );
  });

  it("aborts local state reset if Cloud delete returns an error, and resets when Cloud delete succeeds", async () => {
    let resetCalled = 0;
    await assert.rejects(
      () =>
        clearConversationHistory({
          userId: "user-123",
          deleteRemoteMessages: async () => ({ error: { message: "RLS denied" } }),
          onLocalReset: () => {
            resetCalled += 1;
          },
        }),
      /RLS denied/i
    );
    assert.equal(resetCalled, 0);

    let deletedUserId = null;
    await clearConversationHistory({
      userId: "user-123",
      deleteRemoteMessages: async (uid) => {
        deletedUserId = uid;
        return { error: null };
      },
      onLocalReset: () => {
        resetCalled += 1;
      },
    });
    assert.equal(deletedUserId, "user-123");
    assert.equal(resetCalled, 1);
  });
});
