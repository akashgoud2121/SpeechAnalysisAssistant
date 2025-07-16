import { z } from 'genkit';

/**
 * Schema for a single evaluation parameter:
 * - score: A numerical rating (0–10)
 * - evaluation: A qualitative summary of performance
 * - feedback: Actionable advice for improvement
 */
export const EvaluationCriterionSchema = z.object({
  score: z.number().min(0).max(10),
  evaluation: z.string(),
  feedback: z.string(),
});

const DeliveryCriteriaSchema = z.object({
    fluency: EvaluationCriterionSchema,
    pacing: EvaluationCriterionSchema,
    clarity: EvaluationCriterionSchema,
    confidence: EvaluationCriterionSchema,
    emotionalTone: EvaluationCriterionSchema,
});

const LanguageCriteriaSchema = z.object({
    grammar: EvaluationCriterionSchema,
    vocabulary: EvaluationCriterionSchema,
    wordChoice: EvaluationCriterionSchema,
    conciseness: EvaluationCriterionSchema,
    fillerWords: EvaluationCriterionSchema,
});

const ContentCriteriaSchema = z.object({
    relevance: EvaluationCriterionSchema,
    organization: EvaluationCriterionSchema,
    accuracy: EvaluationCriterionSchema,
    depth: EvaluationCriterionSchema,
    persuasiveness: EvaluationCriterionSchema,
});

const MetadataSchema = z.object({
  wordCount: z.number(),
  fillerWordCount: z.number(),
  speechRateWPM: z.number(),
  averagePauseDurationMs: z.number(),
  pitchVariance: z.number(),
  audioDurationSeconds: z.number(),
});


/**
 * Full schema for speech analysis results:
 * Includes general metadata and all evaluation parameters, grouped by category.
 */
export const AnalyzeSpeechOutputSchema = MetadataSchema.extend({
    totalScore: EvaluationCriterionSchema,
    delivery: DeliveryCriteriaSchema,
    language: LanguageCriteriaSchema,
    content: ContentCriteriaSchema,
    transcription: z.string().optional(),
});

export const AnalyzeInputSchema = z.object({
  audioDataUri: z.string().optional(),
  transcription: z.string().optional(),
  mode: z.enum(['interview', 'presentation', 'practice']),
  question: z.string().optional(),
  perfectAnswer: z.string().optional(),
});
export type AnalyzeInput = z.infer<typeof AnalyzeInputSchema>;

export type AnalyzeSpeechOutput = z.infer<typeof AnalyzeSpeechOutputSchema>;
export type EvaluationCriterion = z.infer<typeof EvaluationCriterionSchema>;
