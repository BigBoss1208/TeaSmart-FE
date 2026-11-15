export type LeafMediaMode = "image" | "video";
export const IMAGE_LIMIT = 10 * 1024 * 1024;
export const VIDEO_LIMIT = 25 * 1024 * 1024;
export const VIDEO_DURATION_LIMIT = 60;
// Local preview limits only: no classification API/model is present in this source.
export function validateLeafMedia(file: Pick<File,"name"|"type"|"size">, mode: LeafMediaMode): string | null {
 if(!file.size)return "File rỗng. Vui lòng chọn file khác.";
 if(mode==="image"){
  if(!/\.(jpe?g|png)$/i.test(file.name)||!["image/jpeg","image/png"].includes(file.type))return "Chỉ hỗ trợ ảnh JPG, JPEG hoặc PNG.";
  if(file.size>IMAGE_LIMIT)return "Ảnh không được vượt quá 10 MB.";
 }else{
  if(!/\.mp4$/i.test(file.name)||file.type!=="video/mp4")return "Chỉ hỗ trợ preview video MP4.";
  if(file.size>VIDEO_LIMIT)return "Video preview không được vượt quá 25 MB.";
 }
 return null;
}
