"use server";

import { aiTutor, type AiTutorInput } from '@/ai/flows/ai-tutor-flow';
import { dataGeneratorTool, type DataGeneratorInput } from '@/ai/flows/code-implementation-tool';

export async function handleAiTutorQuery(input: AiTutorInput) {
  try {
    const result = await aiTutor(input);
    if (!result || !result.response) {
      throw new Error("Invalid response from AI tutor.");
    }
    return { success: true, response: result.response };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    console.error("AI Tutor Error:", errorMessage);
    return { success: false, error: `Failed to get response from AI tutor: ${errorMessage}` };
  }
}

export async function handleDataGeneration(input: DataGeneratorInput) {
  try {
    const result = await dataGeneratorTool(input);
    if (!result || !result.data) {
      throw new Error("Invalid response from data generation tool.");
    }
    return { success: true, data: result.data };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    console.error("Data Generation Error:", errorMessage);
    return { success: false, error: `Failed to generate data: ${errorMessage}` };
  }
}
