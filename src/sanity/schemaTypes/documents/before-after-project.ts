import { defineType, defineField } from 'sanity'
import { ImagesIcon } from '@sanity/icons'

export default defineType({
  name: 'beforeAfterProject',
  title: 'Before & After Project',
  type: 'document',
  icon: ImagesIcon,
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'category',
      title: 'Category',
      type: 'string',
      options: {
        list: [
          { title: 'Shingle', value: 'shingle' },
          { title: 'Metal', value: 'metal' },
          { title: 'Repair', value: 'repair' },
          { title: 'Storm Damage', value: 'storm-damage' },
          { title: 'Gutters', value: 'gutters' },
        ],
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'beforeImage',
      title: 'Before Image',
      type: 'image',
      options: { hotspot: true },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'afterImage',
      title: 'After Image',
      type: 'image',
      options: { hotspot: true },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 3,
    }),
    defineField({
      name: 'location',
      title: 'Location',
      type: 'string',
      description: 'e.g. "Christiansburg, VA"',
    }),
  ],
  preview: {
    select: {
      title: 'title',
      category: 'category',
      media: 'afterImage',
    },
    prepare({ title, category, media }) {
      return {
        title: title || 'Untitled Project',
        subtitle: category ? category.charAt(0).toUpperCase() + category.slice(1) : '',
        media,
      }
    },
  },
})
