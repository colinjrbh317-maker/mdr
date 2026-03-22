import { defineType, defineField, defineArrayMember } from 'sanity'
import { PinIcon } from '@sanity/icons'

export default defineType({
  name: 'serviceArea',
  title: 'Service Area',
  type: 'document',
  icon: PinIcon,
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
      name: 'isHubPage',
      title: 'Is Hub Page',
      type: 'boolean',
      description: 'Mark this as a hub page (parent area)',
      initialValue: false,
    }),
    defineField({
      name: 'parentHub',
      title: 'Parent Hub',
      type: 'reference',
      to: [{ type: 'serviceArea' }],
      hidden: ({ parent }) => parent?.isHubPage === true,
      description: 'Select the parent hub page for this service area',
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 4,
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
      description: 'Main area description (target 500+ words for SEO)',
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
      name: 'mapEmbedUrl',
      title: 'Google Maps Embed URL',
      type: 'url',
      description: 'Google Maps embed src URL (must be https)',
      validation: (rule) =>
        rule.uri({
          scheme: ['https'],
        }),
    }),
    defineField({
      name: 'servicesOffered',
      title: 'Services Offered',
      type: 'array',
      of: [defineArrayMember({ type: 'reference', to: [{ type: 'service' }] })],
      description: 'Services available in this area',
    }),
    defineField({
      name: 'sortOrder',
      title: 'Sort Order',
      type: 'number',
      initialValue: 10,
      description: 'Controls display order on areas listing page (lower = first)',
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
      isHub: 'isHubPage',
      parent: 'parentHub.name',
      media: 'featuredImage',
    },
    prepare({ title, isHub, parent, media }) {
      const subtitle = isHub ? 'Hub Page' : parent ? `Under: ${parent}` : ''
      return {
        title: title || 'Untitled Area',
        subtitle,
        media,
      }
    },
  },
})
