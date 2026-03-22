import type { StructureResolver } from 'sanity/structure'
import {
  CogIcon,
  MenuIcon,
  DocumentIcon,
  ComposeIcon,
  TagIcon,
  WrenchIcon,
  PinIcon,
  UsersIcon,
  ImagesIcon,
} from '@sanity/icons'

// Singleton document IDs
const SINGLETON_IDS = new Set(['siteSettings', 'navigation'])

// Singleton types that should not appear in generic lists
const SINGLETON_TYPES = new Set(['siteSettings', 'navigation'])

export const structure: StructureResolver = (S) =>
  S.list()
    .title('Content')
    .items([
      // ── Settings (singleton)
      S.listItem()
        .title('Settings')
        .icon(CogIcon)
        .child(
          S.document()
            .schemaType('siteSettings')
            .documentId('siteSettings')
            .title('Site Settings')
        ),

      // ── Navigation (singleton)
      S.listItem()
        .title('Navigation')
        .icon(MenuIcon)
        .child(
          S.document()
            .schemaType('navigation')
            .documentId('navigation')
            .title('Navigation')
        ),

      S.divider(),

      // ── Pages
      S.listItem()
        .title('Pages')
        .icon(DocumentIcon)
        .child(
          S.documentTypeList('page').title('Pages')
        ),

      S.divider(),

      // ── Blog
      S.listItem()
        .title('Blog')
        .icon(ComposeIcon)
        .child(
          S.list()
            .title('Blog')
            .items([
              S.listItem()
                .title('Posts')
                .icon(ComposeIcon)
                .child(
                  S.documentTypeList('blogPost').title('Blog Posts')
                ),
              S.listItem()
                .title('Categories')
                .icon(TagIcon)
                .child(
                  S.documentTypeList('blogCategory').title('Blog Categories')
                ),
            ])
        ),

      // ── Services
      S.listItem()
        .title('Services')
        .icon(WrenchIcon)
        .child(
          S.documentTypeList('service').title('Services')
        ),

      // ── Service Areas
      S.listItem()
        .title('Service Areas')
        .icon(PinIcon)
        .child(
          S.documentTypeList('serviceArea').title('Service Areas')
        ),

      // ── Testimonials
      S.listItem()
        .title('Testimonials')
        .icon(UsersIcon)
        .child(
          S.documentTypeList('testimonial').title('Testimonials')
        ),

      // ── Before & After Gallery
      S.listItem()
        .title('Gallery')
        .icon(ImagesIcon)
        .child(
          S.documentTypeList('beforeAfterProject').title('Before & After Projects')
        ),
    ])
