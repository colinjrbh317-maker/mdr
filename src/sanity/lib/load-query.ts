import { sanityClient } from "sanity:client";

/**
 * GROQ query wrapper using the Sanity client from @sanity/astro integration.
 * Provides a typed fetch helper for use in .astro component frontmatter.
 */
export async function loadQuery<T = unknown>(
  query: string,
  params?: Record<string, unknown>
): Promise<T> {
  return sanityClient.fetch<T>(query, params ?? {});
}
