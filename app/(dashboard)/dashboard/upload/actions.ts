// actions.ts
"use server";

import { z } from "zod";
import { Configuration, OpenAIApi } from "openai";

// Initialize OpenAI API
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

// Function to generate context using OpenAI
export const generateContext = async (headers: string[]): Promise<string> => {
  const prompt = `Given the following table headers: ${headers.join(", ")}, provide a brief context (less than 5 sentences) explaining the potential content of the table and guidelines for analyzing the data.`;
  const response = await openai.createCompletion({
    model: "text-davinci-003",
    prompt: prompt,
    max_tokens: 150,
  });
  return response.data.choices[0].text?.trim() || "";
};

// Function to generate sample questions using OpenAI
export const generateSampleQuestions = async (
  headers: string[]
): Promise<string[]> => {
  const prompt = `Based on the following table headers: ${headers.join(", ")}, generate 5 relevant sample questions that an analyst might ask about the data.`;
  const response = await openai.createCompletion({
    model: "text-davinci-003",
    prompt: prompt,
    max_tokens: 150,
    n: 5,
  });
  return response.data.choices.map((choice) => choice.text?.trim() || "");
};
