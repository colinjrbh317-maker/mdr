import {
  defineLocations,
  type DocumentLocationResolver,
} from "sanity/presentation";

export const resolve: DocumentLocationResolver = (params) => {
  if (params.type === "page") {
    return defineLocations({
      select: { title: "title", slug: "slug.current" },
      resolve: (doc) =>
        doc?.slug
          ? {
              locations: [
                { title: doc.title || "Page", href: `/${doc.slug}` },
              ],
            }
          : undefined,
    });
  }

  if (params.type === "blogPost") {
    return defineLocations({
      select: { title: "title", slug: "slug.current" },
      resolve: (doc) =>
        doc?.slug
          ? {
              locations: [
                {
                  title: doc.title || "Blog Post",
                  href: `/blog/${doc.slug}`,
                },
              ],
            }
          : undefined,
    });
  }

  if (params.type === "service") {
    return defineLocations({
      select: { title: "name", slug: "slug.current" },
      resolve: (doc) =>
        doc?.slug
          ? {
              locations: [
                {
                  title: doc.title || "Service",
                  href: `/services/${doc.slug}`,
                },
              ],
            }
          : undefined,
    });
  }

  if (params.type === "serviceArea") {
    return defineLocations({
      select: { title: "name", slug: "slug.current" },
      resolve: (doc) =>
        doc?.slug
          ? {
              locations: [
                {
                  title: doc.title || "Service Area",
                  href: `/areas/${doc.slug}`,
                },
              ],
            }
          : undefined,
    });
  }

  return undefined;
};
