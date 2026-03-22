// Documents
import page from "./documents/page";
import siteSettings from "./documents/site-settings";
import navigation from "./documents/navigation";
import blogPost from "./documents/blog-post";
import blogCategory from "./documents/blog-category";
import testimonial from "./documents/testimonial";
import serviceArea from "./documents/service-area";
import service from "./documents/service";
import beforeAfterProject from "./documents/before-after-project";

// Objects
import { seo } from "./objects/seo";
import { link } from "./objects/link";
import { navItem } from "./objects/nav-item";
import { portableText } from "./objects/portable-text";

// Blocks
import { hero } from "./blocks/hero";
import { trustBar } from "./blocks/trust-bar";
import { statsCounter } from "./blocks/stats-counter";
import { servicesGrid } from "./blocks/services-grid";
import { testimonials } from "./blocks/testimonials";
import { ctaSection } from "./blocks/cta-section";
import { textWithImage } from "./blocks/text-with-image";
import { faqSection } from "./blocks/faq-section";
import { gallerySection } from "./blocks/gallery-section";
import { videoSection } from "./blocks/video-section";
import { richText } from "./blocks/rich-text";
import { formSection } from "./blocks/form-section";

export const schemaTypes = [
  // Documents
  page,
  siteSettings,
  navigation,
  blogPost,
  blogCategory,
  testimonial,
  serviceArea,
  service,
  beforeAfterProject,
  // Objects
  seo,
  link,
  navItem,
  portableText,
  // Blocks
  hero,
  trustBar,
  statsCounter,
  servicesGrid,
  testimonials,
  ctaSection,
  textWithImage,
  faqSection,
  gallerySection,
  videoSection,
  richText,
  formSection,
];
