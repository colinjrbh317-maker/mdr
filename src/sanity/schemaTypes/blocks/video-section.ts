import { defineType, defineField } from 'sanity'
import { PlayIcon } from '@sanity/icons'

export const videoSection = defineType({
  name: 'videoSection',
  title: 'Video Section',
  type: 'object',
  icon: PlayIcon,
  fields: [
    defineField({
      name: 'heading',
      title: 'Heading',
      type: 'string',
    }),
    defineField({
      name: 'videoUrl',
      title: 'Video URL',
      type: 'url',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'posterImage',
      title: 'Poster Image',
      type: 'image',
    }),
    defineField({
      name: 'autoplay',
      title: 'Autoplay',
      type: 'boolean',
      initialValue: false,
    }),
  ],
  preview: {
    select: {
      title: 'heading',
      media: 'posterImage',
    },
    prepare({ title, media }) {
      return {
        title: title || 'Video Section',
        subtitle: 'Video Section',
        media,
      }
    },
  },
})
