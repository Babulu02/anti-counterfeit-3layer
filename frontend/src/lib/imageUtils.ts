/**
 * src/lib/imageUtils.ts
 * =====================
 * Client-side image resizing and compression utility.
 * Prevents multi-megabyte camera/screenshot uploads from exhausting cloud
 * memory limits (e.g. Render 512MB RAM free tier) and eliminates network
 * disconnects / "Failed to fetch" errors.
 */

export interface ResizedImageResult {
  dataUrl: string;
  base64:  string;
  blob:    Blob;
}

export async function resizeImageFile(
  file: File,
  maxDim = 512,
  quality = 0.82
): Promise<ResizedImageResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read image file"));
    reader.onload = (e) => {
      const rawDataUrl = e.target?.result as string;
      const img = new Image();
      img.onerror = () => reject(new Error("Failed to decode image data"));
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, width);
        canvas.height = Math.max(1, height);

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          const rawBase64 = rawDataUrl.includes(",") ? rawDataUrl.split(",")[1] : rawDataUrl;
          resolve({ dataUrl: rawDataUrl, base64: rawBase64, blob: file });
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        const base64 = dataUrl.split(",")[1];

        canvas.toBlob(
          (blob) => {
            resolve({
              dataUrl,
              base64,
              blob: blob || file,
            });
          },
          "image/jpeg",
          quality
        );
      };
      img.src = rawDataUrl;
    };
    reader.readAsDataURL(file);
  });
}
