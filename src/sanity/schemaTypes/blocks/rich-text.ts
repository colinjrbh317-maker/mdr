import { defineType, defineField } from 'sanity'
import { TextIcon } from '@sanity/icons'

export const richText = defineType({
  name: 'richText',
  title: 'Rich Text',
  type: 'object',
  icon: TextIcon,
  fields: [
    defineField({
      name: 'content',
      title: 'Content',
      type: 'portableText',
    }),
  ],
  preview: {
    prepare() {
      return {
        title: 'Rich Text',
        subtitle: 'Rich Text Block',
      }
    },
  },
})
