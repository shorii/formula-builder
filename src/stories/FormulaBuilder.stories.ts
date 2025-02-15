import type { Meta, StoryObj } from '@storybook/react';

import { FormulaBuilder } from './FormulaBuilder';

// More on how to set up stories at: https://storybook.js.org/docs/writing-stories#default-export
const meta = {
  title: 'Example/FormulaBuilder',
  component: FormulaBuilder,
} satisfies Meta<typeof FormulaBuilder>;

export default meta;
type Story = StoryObj<typeof meta>;

// More on writing stories with args: https://storybook.js.org/docs/writing-stories/args
export const Primary: Story = {
  args: {
    value: {
      statement: "${column1}+${column2}",
      placeholders: [
        {
          placeholder: "column1",
          value: 1.1,
        },
        {
          placeholder: "column2",
          value: 3,
        }
      ]
    },
  }
};
