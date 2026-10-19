"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { cloudinaryFetchImage, type CloudinaryImageMode } from "@/lib/cloudinaryFetchImage";

type ProductImageProps = {
  src?: string;
  alt: string;
  className?: string;
  priority?: boolean;
  sizes?: string;
  quality?: number;
  cloudinaryWidth?: number;
  imageMode?: CloudinaryImageMode;
};

export function ProductImage({
  src,
  alt,
  className = "",
  priority = false,
  sizes = "(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 320px",
  quality = 75,
  cloudinaryWidth = 700,
  imageMode = "normal",
}: ProductImageProps) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [usingFallback, setUsingFallback] = useState(false);
  const hasImage = Boolean(src) && !failed;
  const activeImageMode = usingFallback ? "clean-product-fallback" : imageMode;
  const imageSrc = src ? cloudinaryFetchImage(src, cloudinaryWidth, activeImageMode) : undefined;
  const isRemoteImage = Boolean(imageSrc && /^https?:\/\//i.test(imageSrc));
  const canUseOriginalFallback = Boolean(src && imageSrc && src !== imageSrc);

  useEffect(() => {
    queueMicrotask(() => {
      setFailed(false);
      setLoaded(false);
      setUsingFallback(false);
    });
  }, [src, imageMode]);

  return (
    <div
      className={`group relative z-0 aspect-square w-full overflow-hidden rounded-2xl bg-white ${className}`}
    >
      {hasImage ? (
        <>
          {!loaded && (
            <div className="absolute inset-2 z-10 rounded-xl bg-gradient-to-br from-gray-50 via-gray-100 to-gray-50" />
          )}

          <Image
            src={imageSrc as string}
            alt={alt}
            fill
            quality={quality}
            priority={priority}
            loading={priority ? undefined : "lazy"}
            fetchPriority={priority ? "high" : "auto"}
            decoding="async"
            unoptimized={isRemoteImage}
            sizes={sizes}
            onError={() => {
              if (canUseOriginalFallback && !usingFallback) {
                setLoaded(false);
                setUsingFallback(true);
                return;
              }

              setFailed(true);
            }}
            onLoad={() => setLoaded(true)}
            className={`relative z-0 object-contain p-2 transition duration-200 motion-safe:group-hover:scale-105 sm:p-3 ${
              loaded ? "opacity-100" : "opacity-0"
            }`}
          />
        </>
      ) : (
        <div className="relative z-10 flex h-full w-full items-center justify-center p-4 text-center">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
              Image unavailable
            </p>
            <p className="mt-1 line-clamp-2 text-xs font-bold text-gray-500">
              {alt}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
