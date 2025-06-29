'use server';

/**
 * @fileOverview An AI agent for generating high-quality datasets in JSON or CSV format.
 *
 * - dataGeneratorTool - A function that handles the data generation process.
 * - DataGeneratorInput - The input type for the dataGeneratorTool function.
 * - DataGeneratorOutput - The return type for the dataGeneratorTool function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const DataGeneratorInputSchema = z.object({
  prompt: z.string().describe('A detailed prompt describing the data to be generated.'),
  format: z.enum(['json', 'csv']).describe('The desired output format for the data.'),
});
export type DataGeneratorInput = z.infer<typeof DataGeneratorInputSchema>;

const DataGeneratorOutputSchema = z.object({
  data: z.string().describe('The generated data, as a string in the specified format (JSON or CSV).'),
});
export type DataGeneratorOutput = z.infer<typeof DataGeneratorOutputSchema>;

export async function dataGeneratorTool(input: DataGeneratorInput): Promise<DataGeneratorOutput> {
  return dataGeneratorFlow(input);
}

const prompt = ai.definePrompt({
  name: 'dataGeneratorPrompt',
  input: {schema: DataGeneratorInputSchema},
  output: {schema: DataGeneratorOutputSchema},
  prompt: `You are an expert data generation engine. Your task is to generate an elaborate, detailed, and realistic dataset based on the user's prompt. Create a substantial amount of data, at least 50 records, unless the user specifies a different number.

The output format must be {{format}}.

User Prompt:
"{{{prompt}}}"

Your generated data must:
1.  Be a valid, well-formatted string in the requested format ({{format}}).
2.  For JSON, produce an array of objects.
3.  For CSV, produce a header row followed by comma-separated values. Ensure values with commas are properly quoted.
4.  Strictly adhere to the user's description for structure, content, and tone.
5.  Be returned as a single raw string without any markdown fences (\`\`\`) or explanatory text.
6.  Contain rich, diverse, and plausible values for each field.`,
  config: {
    maxOutputTokens: 8192,
  },
});

const dataGeneratorFlow = ai.defineFlow(
  {
    name: 'dataGeneratorFlow',
    inputSchema: DataGeneratorInputSchema,
    outputSchema: DataGeneratorOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
