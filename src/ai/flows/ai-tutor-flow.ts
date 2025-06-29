'use server';

/**
 * @fileOverview An AI tutor agent that answers questions about machine learning concepts.
 *
 * - aiTutor - A function that handles the AI tutoring process.
 * - AiTutorInput - The input type for the aiTutor function.
 * - AiTutorOutput - The return type for the aiTutor function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AiTutorInputSchema = z.object({
  query: z.string().describe('The question to ask the AI tutor about machine learning.'),
  context: z.string().optional().describe('The context of the user, such as the current task.'),
});
export type AiTutorInput = z.infer<typeof AiTutorInputSchema>;

const AiTutorOutputSchema = z.object({
  response: z.string().describe('The AI tutor\'s response to the question.'),
});
export type AiTutorOutput = z.infer<typeof AiTutorOutputSchema>;

export async function aiTutor(input: AiTutorInput): Promise<AiTutorOutput> {
  return aiTutorFlow(input);
}

const prompt = ai.definePrompt({
  name: 'aiTutorPrompt',
  input: {schema: AiTutorInputSchema},
  output: {schema: AiTutorOutputSchema},
  prompt: `You are an expert machine learning tutor. Your tone should be encouraging, clear, and helpful. The user is learning ML from scratch using an interactive toolkit.

The user is currently working on: {{context}}.

User's Question: "{{query}}"

Provide a clear, educational response. Use markdown for formatting when it helps with clarity (like for code blocks or lists). Explain concepts simply and provide practical examples where appropriate.`,
});

const aiTutorFlow = ai.defineFlow(
  {
    name: 'aiTutorFlow',
    inputSchema: AiTutorInputSchema,
    outputSchema: AiTutorOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
