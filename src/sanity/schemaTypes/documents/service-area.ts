import { defineType, defineField } from 'sanity'
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
    },
    prepare({ title, isHub, parent }) {
      const subtitle = isHub ? 'Hub Page' : parent ? `Under: ${parent}` : ''
      return {
        title: title || 'Untitled Area',
        subtitle,
      }
    },
  },
})
