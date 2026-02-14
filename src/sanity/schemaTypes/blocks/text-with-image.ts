import { defineType, defineField } from 'sanity'
import { ImageIcon } from '@sanity/icons'

export const textWithImage = defineType({
  name: 'textWithImage',
  title: 'Text with Image',
  type: 'object',
  icon: ImageIcon,
  fields: [
    defineField({
      name: 'heading',
      title: 'Heading',
      type: 'string',
    }),
    defineField({
      name: 'text',
      title: 'Text',
      type: 'portableText',
    }),
    defineField({
      name: 'image',
      title: 'Image',
      type: 'image',
      options: {
        hotspot: true,
      },
    }),
    defineField({
      name: 'imagePosition',
      title: 'Image Position',
      type: 'string',
      options: {
        list: [
          { title: 'Left', value: 'left' },
          { title: 'Right', value: 'right' },
        ],
        layout: 'radio',
      },
      initialValue: 'right',
    }),
  ],
  preview: {
    select: {
      title: 'heading',
      media: 'image',
      position: 'imagePosition',
    },
    prepare({ title, media, position }) {
      return {
        title: title || 'Text with Image',
        subtitle: `Image on ${position ?? 'right'}`,
        media,
      }
    },
  },
})
