import groq from "groq";

// ─── Site Settings ──────────────────────────────────────────
export const SITE_SETTINGS_QUERY = groq`
  *[_type == "siteSettings"][0]{
    companyName,
    tagline,
    phone,
    email,
    address,
    logo,
    socialLinks[]{
      platform,
      url
    }
  }
`;

// ─── Navigation ─────────────────────────────────────────────
export const NAVIGATION_QUERY = groq`
  *[_type == "navigation"][0]{
    title,
    items[]{
      _key,
      label,
      link {
        linkType,
        externalUrl,
        openInNewTab,
        internalLink->{
          _type,
          "slug": slug.current
        }
      },
      children[]{
        _key,
        label,
        link {
          linkType,
          externalUrl,
          openInNewTab,
          internalLink->{
            _type,
            "slug": slug.current
          }
        }
      }
    },
    ctaText,
    ctaLink
  }
`;

// ─── Pages ──────────────────────────────────────────────────
export const PAGE_BY_SLUG_QUERY = groq`
  *[_type == "page" && slug.current == $slug][0]{
    _id,
    title,
    "slug": slug.current,
    seo {
      metaTitle,
      metaDescription,
      ogImage
    },
    pageBuilder[]{
      ...,
      _type == "servicesGrid" => {
        heading,
        subheading,
        services[]->{
          _id,
          name,
          "slug": slug.current,
          description,
          featuredImage
        }
      },
      _type == "testimonials" => {
        heading,
        testimonials[]->{
          _id,
          name,
          location,
          rating,
          text,
          date,
          image
        }
      }
    }
  }
`;

export const ALL_PAGES_QUERY = groq`
  *[_type == "page" && defined(slug.current)]{
    "slug": slug.current
  }
`;

// ─── Blog ───────────────────────────────────────────────────
export const BLOG_POSTS_QUERY = groq`
  *[_type == "blogPost"] | order(publishedAt desc) {
    _id,
    title,
    "slug": slug.current,
    publishedAt,
    author,
    featuredImage,
    category->{
      _id,
      title,
      "slug": slug.current
    },
    tags,
    seo {
      metaTitle,
      metaDescription
    }
  }
`;

export const BLOG_POST_BY_SLUG_QUERY = groq`
  *[_type == "blogPost" && slug.current == $slug][0]{
    _id,
    title,
    "slug": slug.current,
    publishedAt,
    author,
    featuredImage,
    body,
    category->{
      _id,
      title,
      "slug": slug.current
    },
    tags,
    seo {
      metaTitle,
      metaDescription,
      ogImage
    }
  }
`;

export const ALL_BLOG_SLUGS_QUERY = groq`
  *[_type == "blogPost" && defined(slug.current)]{
    "slug": slug.current
  }
`;

// ─── Blog Categories ────────────────────────────────────────
export const BLOG_CATEGORIES_QUERY = groq`
  *[_type == "blogCategory"] | order(title asc) {
    _id,
    title,
    "slug": slug.current,
    description
  }
`;

export const ALL_BLOG_CATEGORY_SLUGS_QUERY = groq`
  *[_type == "blogCategory" && defined(slug.current)]{
    "slug": slug.current
  }
`;

export const BLOG_POSTS_BY_CATEGORY_QUERY = groq`
  *[_type == "blogPost" && category->slug.current == $categorySlug] | order(publishedAt desc) {
    _id,
    title,
    "slug": slug.current,
    publishedAt,
    author,
    featuredImage,
    category->{
      _id,
      title,
      "slug": slug.current
    },
    tags
  }
`;

export const RELATED_POSTS_QUERY = groq`
  *[_type == "blogPost" && category._ref == $categoryId && slug.current != $currentSlug] | order(publishedAt desc) [0...3] {
    _id,
    title,
    "slug": slug.current,
    publishedAt,
    featuredImage,
    category->{
      _id,
      title
    }
  }
`;

// ─── Services ───────────────────────────────────────────────
export const SERVICES_QUERY = groq`
  *[_type == "service"] | order(sortOrder asc, name asc) {
    _id,
    name,
    "slug": slug.current,
    description,
    icon,
    featuredImage,
    sortOrder,
    "isParent": !defined(parentService),
    parentService->{
      _id,
      name,
      "slug": slug.current
    }
  }
`;

export const SERVICE_BY_SLUG_QUERY = groq`
  *[_type == "service" && slug.current == $slug][0]{
    _id,
    name,
    "slug": slug.current,
    description,
    icon,
    featuredImage,
    body,
    parentService->{
      _id,
      name,
      "slug": slug.current
    },
    pageBuilder[]{
      ...,
      _type == "servicesGrid" => {
        heading,
        subheading,
        services[]->{
          _id,
          name,
          "slug": slug.current,
          description,
          featuredImage
        }
      },
      _type == "testimonials" => {
        heading,
        testimonials[]->{
          _id,
          name,
          location,
          rating,
          text,
          date,
          image
        }
      }
    },
    relatedServices[]->{
      _id,
      name,
      "slug": slug.current,
      description,
      featuredImage
    },
    "childServices": *[_type == "service" && parentService._ref == ^._id] | order(sortOrder asc) {
      _id,
      name,
      "slug": slug.current,
      description,
      featuredImage
    },
    seo {
      metaTitle,
      metaDescription,
      ogImage
    }
  }
`;

export const ALL_SERVICE_SLUGS_QUERY = groq`
  *[_type == "service" && defined(slug.current)]{
    "slug": slug.current
  }
`;

// ─── Testimonials ───────────────────────────────────────────
export const TESTIMONIALS_QUERY = groq`
  *[_type == "testimonial"] | order(date desc) {
    _id,
    name,
    location,
    rating,
    text,
    date,
    image
  }
`;

// ─── Service Areas ──────────────────────────────────────────
export const SERVICE_AREAS_QUERY = groq`
  *[_type == "serviceArea"] | order(sortOrder asc, name asc) {
    _id,
    name,
    "slug": slug.current,
    isHubPage,
    description,
    featuredImage,
    sortOrder,
    parentHub->{
      _id,
      name,
      "slug": slug.current
    }
  }
`;

export const SERVICE_AREA_BY_SLUG_QUERY = groq`
  *[_type == "serviceArea" && slug.current == $slug][0]{
    _id,
    name,
    "slug": slug.current,
    isHubPage,
    description,
    featuredImage,
    body,
    mapEmbedUrl,
    sortOrder,
    parentHub->{
      _id,
      name,
      "slug": slug.current
    },
    pageBuilder[]{
      ...,
      _type == "servicesGrid" => {
        heading,
        subheading,
        services[]->{
          _id,
          name,
          "slug": slug.current,
          description,
          featuredImage
        }
      },
      _type == "testimonials" => {
        heading,
        testimonials[]->{
          _id,
          name,
          location,
          rating,
          text,
          date,
          image
        }
      }
    },
    servicesOffered[]->{
      _id,
      name,
      "slug": slug.current,
      description,
      featuredImage
    },
    "childAreas": *[_type == "serviceArea" && parentHub._ref == ^._id] | order(sortOrder asc, name asc) {
      _id,
      name,
      "slug": slug.current,
      description,
      featuredImage
    },
    "siblingAreas": *[_type == "serviceArea" && parentHub._ref == ^.parentHub._ref && slug.current != $slug] | order(sortOrder asc, name asc) {
      _id,
      name,
      "slug": slug.current
    },
    seo {
      metaTitle,
      metaDescription,
      ogImage
    }
  }
`;

export const ALL_SERVICE_AREA_SLUGS_QUERY = groq`
  *[_type == "serviceArea" && defined(slug.current)]{
    "slug": slug.current
  }
`;

// ─── Area + Service Combo Pages ─────────────────────────────
export const AREA_SERVICE_COMBO_QUERY = groq`{
  "area": *[_type == "serviceArea" && slug.current == $areaSlug][0]{
    _id, name, "slug": slug.current, isHubPage, description, mapEmbedUrl, featuredImage,
    parentHub->{ _id, name, "slug": slug.current }
  },
  "service": *[_type == "service" && slug.current == $serviceSlug][0]{
    _id, name, "slug": slug.current, description, featuredImage, icon,
    parentService->{ _id, name, "slug": slug.current }
  },
  "otherServicesInArea": *[_type == "service" && slug.current != $serviceSlug] | order(sortOrder asc, name asc) [0...6] {
    _id, name, "slug": slug.current, description, featuredImage
  },
  "otherAreasForService": *[_type == "serviceArea" && !isHubPage && slug.current != $areaSlug] | order(sortOrder asc, name asc) {
    _id, name, "slug": slug.current,
    parentHub->{ name, "slug": slug.current }
  }
}`;

export const ALL_AREA_SERVICE_COMBOS_QUERY = groq`{
  "areas": *[_type == "serviceArea" && !isHubPage]{ "slug": slug.current },
  "services": *[_type == "service"]{ "slug": slug.current }
}`;

// ─── Before & After Gallery ─────────────────────────────────
export const BEFORE_AFTER_PROJECTS_QUERY = groq`
  *[_type == "beforeAfterProject"] | order(_createdAt desc) {
    _id,
    title,
    category,
    beforeImage,
    afterImage,
    description,
    location
  }
`;
