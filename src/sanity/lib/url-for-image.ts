import { createImageUrlBuilder } from "@sanity/image-url";
import { sanityClient } from "sanity:client";
import type { SanityImageSource } from "@sanity/image-url/lib/types/types";

const builder = createImageUrlBuilder(sanityClient);

/**
 * Generate optimized image URLs from Sanity image references.
 * Usage: urlForImage(image).width(800).height(600).url()
 */
export function urlForImage(source: SanityImageSource) {
  return builder.image(source);
}
