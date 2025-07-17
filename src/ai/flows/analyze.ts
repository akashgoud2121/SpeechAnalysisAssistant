
'use server';

/**
 * @fileOverview An AI agent that analyzes speech from audio or text.
 *
 * - analyze - A function that handles the speech analysis from audio or text.
 * - AnalyzeInput - The input type for the analyze function.
 * - AnalyzeSpeechOutput - The return type for the analyze function.
 */

import {ai} from '@/ai/genkit';
import { AnalyzeInput, AnalyzeSpeechOutput, AnalyzeSpeechOutputSchema, AnalyzeInputSchema } from './schemas';


export async function analyze(input: AnalyzeInput): Promise<AnalyzeSpeechOutput> {
  return analysisFlow(input);
}

const systemPrompt = `You are a professional speech coach and exam evaluator. 
You will conduct a comprehensive analysis of a user's speech and return a single JSON object with your findings.

The user's speech is provided as either audio or a transcription. If audio is provided, you must transcribe it first. Once you have the transcription, perform your full analysis based on that text.

You must evaluate the speech based on all 15 criteria in the schema and provide metadata.
For each evaluation criteria, you must provide:
- **Score:** A numerical score from 0 to 10, where 10 is excellent.
- **Evaluation:** A brief assessment of the user's performance.
- **Feedback:** Specific, actionable suggestions for improvement.

In addition to the 15 criteria, you must also provide a 'totalScore'. This should be a holistic evaluation of the user's overall performance across all other criteria, providing an overall score, evaluation, and feedback.

In addition to the evaluations, you must provide the following metadata:
- wordCount
- fillerWordCount
- speechRateWPM
- averagePauseDurationMs
- pitchVariance
- audioDurationSeconds
- transcription (if audio was provided)

The user has specified an analysis mode. Use this mode to tailor your feedback.

{{#if isInterview}}
You are in "Interview Mode". The user was answering the question: "{{{question}}}"
All evaluations should be in the context of this question.
{{/if}}
{{#if isPresentation}}
You are in "Presentation Mode". The speech should be evaluated as a general presentation.
{{/if}}
{{#if isPractice}}
You are in "Practice Mode". The user was answering the question: "{{{question}}}"
Their goal is to match the following "perfect answer" as closely as possible in content and meaning.
Perfect Answer: "{{{perfectAnswer}}}"
All content-related evaluations (Relevance, Organization, Accuracy, Depth, Persuasiveness) must be based on how well the user's answer compares to this perfect answer. You must score them on how closely they match the provided perfect answer.
{{/if}}

Now, analyze the following input and provide your complete analysis as a single JSON object.
`;

const analysisFlow = ai.defineFlow(
  {
    name: 'analysisFlow',
    inputSchema: AnalyzeInputSchema,
    outputSchema: AnalyzeSpeechOutputSchema,
  },
  async (input): Promise<AnalyzeSpeechOutput> => {

    const promptData = {
      ...input,
      isInterview: input.mode === 'interview',
      isPresentation: input.mode === 'presentation',
      isPractice: input.mode === 'practice',
    };
    
    const promptParts: (
      | { media: { url: string } }
      | { text: string }
    )[] = [];
    
    if (input.audioDataUri) {
      promptParts.push({ media: { url: input.audioDataUri } });
    }
    if (input.transcription) {
      promptParts.push({text: `Transcription: "${input.transcription}"`});
    }

    const llmResponse = await ai.generate({
        prompt: promptParts,
        model: 'googleai/gemini-1.5-flash',
        system: systemPrompt,
        output: {
            schema: AnalyzeSpeechOutputSchema,
        },
        config: {
          template: {
            input: promptData
          },
          templateFormat: 'handlebars'
        }
    });
    
    const output = llmResponse.output;
    if (!output) {
      throw new Error("Analysis failed: no output from model.");
    }
    return output;
  }
);
