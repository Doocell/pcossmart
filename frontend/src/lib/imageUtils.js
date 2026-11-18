export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const MAX_RAW_FILE_BYTES = 20 * 1024 * 1024; // 20 MB before client resize
const MAX_DIMENSION_PX = 1024;
const MAX_BASE64_LENGTH = 1_900_000;

/**
 * Validates file MIME type and size before reading into memory.
 */
export function validateImageFileMeta(file) {
  if (!file || typeof file !== "object") {
    throw new Error("Pilih file foto makanan terlebih dahulu.");
  }
  const mime = String(file.type || "").toLowerCase();
  if (!ALLOWED_IMAGE_TYPES.includes(mime)) {
    throw new Error(
      "Format foto belum didukung. Pilih gambar JPEG, PNG, atau WebP."
    );
  }
  if (typeof file.size === "number" && file.size > MAX_RAW_FILE_BYTES) {
    throw new Error("Ukuran file foto terlalu besar (maksimal 20 MB sebelum diperkecil).");
  }
}

/**
 * Computes aspect-preserving dimensions capped at maxDim on the longest edge.
 */
export function computeScaledDimensions(width, height, maxDim = MAX_DIMENSION_PX) {
  if (!width || !height || width <= 0 || height <= 0) {
    return { width: maxDim, height: maxDim };
  }
  const longest = Math.max(width, height);
  if (longest <= maxDim) {
    return { width: Math.round(width), height: Math.round(height) };
  }
  const scale = maxDim / longest;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

/**
 * Strips the data URI prefix (e.g. "data:image/jpeg;base64,") to raw base64.
 */
export function stripDataUrlPrefix(dataUrl) {
  const str = String(dataUrl || "");
  const commaIdx = str.indexOf(",");
  return commaIdx >= 0 ? str.slice(commaIdx + 1) : str;
}

function loadImageElementFromFile(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(
        new Error(
          "Foto gagal dibaca oleh browser. Pastikan formatnya JPEG, PNG, atau WebP yang valid."
        )
      );
    };
    img.src = url;
  });
}

/**
 * Compresses an uploaded meal photo client-side to JPEG (<= 1024px longest edge)
 * ready for multimodal Edge Function payloads.
 */
export async function compressMealImageFile(file) {
  validateImageFileMeta(file);

  const img = await loadImageElementFromFile(file);
  const { width, height } = computeScaledDimensions(
    img.naturalWidth || img.width,
    img.naturalHeight || img.height,
    MAX_DIMENSION_PX
  );

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Browser tidak mendukung pemrosesan gambar.");
  }

  // Paint white backdrop so transparent PNGs convert cleanly to JPEG
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);

  let previewDataUrl = canvas.toDataURL("image/jpeg", 0.8);
  let data = stripDataUrlPrefix(previewDataUrl);

  if (data.length > MAX_BASE64_LENGTH) {
    previewDataUrl = canvas.toDataURL("image/jpeg", 0.6);
    data = stripDataUrlPrefix(previewDataUrl);
  }

  if (!data || data.length > MAX_BASE64_LENGTH) {
    throw new Error("Ukuran foto setelah kompresi masih terlalu besar. Coba pilih foto lain.");
  }

  return {
    mime_type: "image/jpeg",
    data,
    previewDataUrl,
    fileName: file.name || "foto-makanan.jpg",
    byteSize: Math.round((data.length * 3) / 4),
  };
}
