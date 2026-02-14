import { defineType, defineField, defineArrayMember } from 'sanity'
import { DocumentIcon } from '@sanity/icons'

export default defineType({
  name: 'page',
  title: 'Page',
  type: 'document',
  icon: DocumentIcon,
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: {
        source: 'title',
        maxLength: 96,
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'pageBuilder',
      title: 'Page Builder',
      type: 'array',
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
      name: 'seo',
      title: 'SEO',
      type: 'seo',
    }),
  ],
  preview: {
    select: {
      title: 'title',
      slug: 'slug.current',
    },
    prepare({ title, slug }) {
      return {
        title: title || 'Untitled Page',
        subtitle: slug ? `/${slug}` : 'No slug',
      }
    },
  },
})
