"use client";

import { useCallback, type CSSProperties, type ReactNode } from "react";
import { DEFAULT_CARD_ASPECT } from "@/lib/games";

type Props = {
  src: string | null | undefined;
  alt: string;
  /** CSS aspect-ratio of the frame, e.g. "63 / 88". The frame is this shape from the first paint. */
  aspect?: string;
  className?: string;
  style?: CSSProperties;
  /** Classes for the <img> itself (object-fit, hover zoom, ...). */
  imgClassName?: string;
  /** Load right away instead of waiting until the image is near the screen. */
  priority?: boolean;
  /** Shown when there is no image or it fails to load. Defaults to the card's name. */
  fallback?: ReactNode;
  /** Extra classes for the fallback's own box (padding, background). */
  fallbackClassName?: string;
  /** Overlays (badges, buttons, scrims) that sit on top of the image. */
  children?: ReactNode;
};

// A card picture that never pops in.
//
// The frame reserves its final size up front (aspect-ratio), a shimmering
// skeleton fills it while the file downloads, and the image then fades in on
// top. State lives in a data attribute on the <img> instead of React state:
// that avoids a re-render per image, which matters in grids of dozens of cards.
export function CardImage({
  src,
  alt,
  aspect = DEFAULT_CARD_ASPECT,
  className = "",
  style,
  imgClassName = "",
  priority = false,
  fallback,
  fallbackClassName = "",
  children,
}: Props) {
  // A cached image can finish before React attaches onLoad, so check once on mount.
  const attach = useCallback((img: HTMLImageElement | null) => {
    if (img?.complete) {
      img.dataset.state = img.naturalWidth > 0 ? "loaded" : "error";
    }
  }, []);

  const fallbackContent = fallback ?? (
    <span className="line-clamp-4 text-xs font-medium text-neutral-300">{alt}</span>
  );

  return (
    <div
      className={`card-image skeleton relative overflow-hidden ${className}`}
      style={{ aspectRatio: aspect, ...style }}
    >
      {src ? (
        <>
          {/* A new src remounts the <img>, so its state starts from "loading" again. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={src}
            ref={attach}
            src={src}
            alt={alt}
            data-state="loading"
            loading={priority ? "eager" : "lazy"}
            decoding="async"
            draggable={false}
            onLoad={(e) => {
              e.currentTarget.dataset.state = "loaded";
            }}
            onError={(e) => {
              e.currentTarget.dataset.state = "error";
            }}
            className={`peer card-image-img ${imgClassName}`}
          />
          <div
            className={`card-image-fallback hidden peer-data-[state=error]:flex ${fallbackClassName}`}
          >
            {fallbackContent}
          </div>
        </>
      ) : (
        <div className={`card-image-fallback flex ${fallbackClassName}`}>{fallbackContent}</div>
      )}
      {children}
    </div>
  );
}
