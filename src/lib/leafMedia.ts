export type LeafMediaMode = "image" | "video";
export type LeafContentType = "image/jpeg" | "image/png" | "video/mp4";

export const IMAGE_LIMIT = 10 * 1024 * 1024;
export const VIDEO_LIMIT = 30_000_000;
export const VIDEO_DURATION_LIMIT = 15;

export function validateLeafMedia(
  file: Pick<File, "name" | "type" | "size">,
  mode: LeafMediaMode,
): { contentType: LeafContentType } | { error: string } {
  if (file.size === 0) return { error: "Tệp rỗng. Vui lòng chọn tệp khác." };

  const type = file.type.toLowerCase();
  if (mode === "video") {
    if (!/\.mp4$/i.test(file.name) || (type && type !== "video/mp4")) {
      return { error: "Chỉ hỗ trợ video MP4." };
    }
    if (file.size > VIDEO_LIMIT) return { error: "Video không được vượt quá 30 MB." };
    return { contentType: "video/mp4" };
  }

  const contentType = /\.jpe?g$/i.test(file.name) ? "image/jpeg"
    : /\.png$/i.test(file.name) ? "image/png" : null;
  if (!contentType || (type && type !== contentType)) {
    return { error: "Chỉ hỗ trợ ảnh JPG, JPEG hoặc PNG." };
  }
  if (file.size > IMAGE_LIMIT) return { error: "Ảnh không được vượt quá 10 MiB." };
  return { contentType };
}

export function isLeafVideoDurationValid(seconds: number): boolean {
  return Number.isFinite(seconds) && seconds > 0 && seconds <= VIDEO_DURATION_LIMIT;
}
