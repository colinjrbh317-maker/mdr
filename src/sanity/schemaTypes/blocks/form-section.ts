import { defineType, defineField } from 'sanity'
import { EnvelopeIcon } from '@sanity/icons'

export const formSection = defineType({
  name: 'formSection',
  title: 'Form Section',
  type: 'object',
  icon: EnvelopeIcon,
  fields: [
    defineField({
      name: 'heading',
      title: 'Heading',
      type: 'string',
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 3,
    }),
    defineField({
      name: 'formType',
      title: 'Form Type',
      type: 'string',
      options: {
        list: [
          { title: 'Contact', value: 'contact' },
          { title: 'Quote', value: 'quote' },
          { title: 'Callback', value: 'callback' },
        ],
        layout: 'radio',
      },
      initialValue: 'quote',
    }),
    defineField({
      name: 'successMessage',
      title: 'Success Message',
      type: 'string',
    }),
  ],
  preview: {
    select: {
      title: 'heading',
      formType: 'formType',
    },
    prepare({ title, formType }) {
      return {
        title: title || 'Form Section',
        subtitle: `${formType ?? 'quote'} form`,
      }
    },
  },
})
