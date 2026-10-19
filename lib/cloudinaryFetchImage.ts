const CLOUDINARY_HOSTNAME = "res.cloudinary.com";

export type CloudinaryImageMode = "normal" | "clean-product" | "clean-product-fallback";

function isRemoteImageUrl(url: string) {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.protocol === "https:" || parsedUrl.protocol === "http:";
  } catch {
    return false;
  }
}

function isCloudinaryUrl(url: string) {
  try {
    return new URL(url).hostname === CLOUDINARY_HOSTNAME;
  } catch {
    return false;
  }
}

export function cloudinaryFetchImage(url: string, width = 700, mode: CloudinaryImageMode = "normal") {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;

  // If a transformed fetch fails, retry the original supplier URL instead of
  // sending the same image through a second Cloudinary transformation.
  if (mode === "clean-product-fallback") {
    return url;
  }

  if (!cloudName || !isRemoteImageUrl(url) || isCloudinaryUrl(url)) {
    return url;
  }

  const safeWidth = Math.max(64, Math.min(Math.round(width), 1600));
  const encodedUrl = encodeURIComponent(url);

  if (mode === "clean-product") {
    return `https://${CLOUDINARY_HOSTNAME}/${cloudName}/image/fetch/f_auto,q_auto:good,w_${safeWidth},h_${safeWidth},c_pad,b_white/${encodedUrl}`;
  }

  return `https://${CLOUDINARY_HOSTNAME}/${cloudName}/image/fetch/f_auto,q_auto:good,w_${safeWidth},c_pad,b_white/${encodedUrl}`;
}
