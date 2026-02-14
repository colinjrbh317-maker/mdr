import { defineType, defineField } from 'sanity'
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
