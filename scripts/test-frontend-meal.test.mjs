import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  ALLOWED_IMAGE_TYPES,
  computeScaledDimensions,
  stripDataUrlPrefix,
  validateImageFileMeta,
} from "../frontend/src/lib/imageUtils.js";

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
