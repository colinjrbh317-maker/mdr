import { defineType, defineField, defineArrayMember } from 'sanity'
import { BarChartIcon } from '@sanity/icons'

export const statsCounter = defineType({
  name: 'statsCounter',
  title: 'Stats Counter',
  type: 'object',
  icon: BarChartIcon,
  fields: [
    defineField({
      name: 'stats',
      title: 'Stats',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          fields: [
            defineField({
              name: 'value',
              title: 'Value',
              type: 'number',
              validation: (rule) => rule.required(),
            }),
            defineField({
              name: 'suffix',
              title: 'Suffix',
              type: 'string',
              description: 'e.g. "+", "%", "k"',
            }),
            defineField({
              name: 'label',
              title: 'Label',
              type: 'string',
              validation: (rule) => rule.required(),
            }),
          ],
          preview: {
            select: {
              value: 'value',
              suffix: 'suffix',
              label: 'label',
            },
            prepare({ value, suffix, label }) {
              return {
                title: `${value ?? ''}${suffix ?? ''}`,
                subtitle: label,
              }
            },
          },
        }),
      ],
    }),
  ],
  preview: {
    select: {
      stats: 'stats',
    },
    prepare({ stats }) {
      const count = stats ? stats.length : 0
      return {
        title: 'Stats Counter',
        subtitle: `${count} stat${count === 1 ? '' : 's'}`,
      }
    },
  },
})
