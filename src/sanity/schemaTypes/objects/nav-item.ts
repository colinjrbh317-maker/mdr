import { defineType, defineField, defineArrayMember } from 'sanity'

export const navItem = defineType({
  name: 'navItem',
  title: 'Navigation Item',
  type: 'object',
  fields: [
    defineField({
      name: 'label',
      title: 'Label',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'link',
      title: 'Link',
      type: 'link',
    }),
    defineField({
      name: 'children',
      title: 'Child Items',
      type: 'array',
      of: [defineArrayMember({ type: 'navItem' })],
    }),
  ],
  preview: {
    select: {
      title: 'label',
    },
  },
})
