import { defineType, defineField, defineArrayMember } from 'sanity'
import { WrenchIcon } from '@sanity/icons'

export default defineType({
  name: 'service',
  title: 'Service',
  type: 'document',
  icon: WrenchIcon,
  fields: [
    defineField({
      name: 'name',
      title: 'Name',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: {
        source: 'name',
        maxLength: 96,
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'parentService',
      title: 'Parent Service',
      type: 'reference',
      to: [{ type: 'service' }],
      description: 'Select a parent service to create a sub-service',
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 4,
    }),
    defineField({
      name: 'icon',
      title: 'Icon',
      type: 'string',
      description: 'Icon identifier (e.g. a Lucide icon name)',
    }),
    defineField({
      name: 'featuredImage',
      title: 'Featured Image',
      type: 'image',
      options: {
        hotspot: true,
      },
    }),
    defineField({
      name: 'body',
      title: 'Body Content',
      type: 'portableText',
      description: 'Main service description (target 500+ words for SEO)',
    }),
    defineField({
      name: 'pageBuilder',
      title: 'Page Builder',
      type: 'array',
      description: 'Optional additional sections below the body content',
      of: [
        defineArrayMember({ type: 'hero' }),
        defineArrayMember({ type: 'trustBar' }),
        defineArrayMember({ type: 'statsCounter' }),
        defineArrayMember({ type: 'servicesGrid' }),
        defineArrayMember({ type: 'testimonials' }),
        defineArrayMember({ type: 'ctaSection' }),
        defineArrayMember({ type: 'textWithImage' }),
        defineArrayMember({ type: 'faqSection' }),
        defineArrayMember({ type: 'gallerySection' }),
        defineArrayMember({ type: 'videoSection' }),
        defineArrayMember({ type: 'richText' }),
        defineArrayMember({ type: 'formSection' }),
      ],
    }),
    defineField({
      name: 'relatedServices',
      title: 'Related Services',
      type: 'array',
      of: [defineArrayMember({ type: 'reference', to: [{ type: 'service' }] })],
      validation: (rule) => rule.max(4),
      description: 'Cross-link to related services (max 4)',
    }),
    defineField({
      name: 'sortOrder',
      title: 'Sort Order',
      type: 'number',
      initialValue: 10,
      description: 'Controls display order on services listing page (lower = first)',
    }),
    defineField({
      name: 'seo',
      title: 'SEO',
      type: 'seo',
    }),
  ],
  preview: {
    select: {
      title: 'name',
      parent: 'parentService.name',
      media: 'featuredImage',
    },
    prepare({ title, parent, media }) {
      return {
        title: title || 'Untitled Service',
        subtitle: parent ? `Sub-service of: ${parent}` : 'Top-level service',
        media,
      }
    },
  },
})
