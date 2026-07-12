import { pipeline, type FeatureExtractionPipeline } from "@huggingface/transformers";

/**
 * In-process embedding model, pinned per chatBot_UserStories_NonDeterministic.md's
 * "Design decisions": onnx-community/all-MiniLM-L6-v2-ONNX @ revision aff7a1d
 * (384-dim, feature-extraction pipeline). No second judge LLM, no external API.
 */
const MODEL_ID = "onnx-community/all-MiniLM-L6-v2-ONNX";
const MODEL_REVISION = "aff7a1d";

let extractorPromise: Promise<FeatureExtractionPipeline> | null = null;

function getExtractor(): Promise<FeatureExtractionPipeline> {
  if (!extractorPromise) {
    extractorPromise = pipeline("feature-extraction", MODEL_ID, {
      revision: MODEL_REVISION,
    });
  }
  return extractorPromise;
}

/** Loads the embedding model once, up front, so it isn't blamed on the first test's timing. */
export async function warmUpEmbeddingModel(): Promise<void> {
  await getExtractor();
}

export async function embed(text: string): Promise<number[]> {
  const extractor = await getExtractor();
  const output = await extractor(text, { pooling: "mean", normalize: true });
  return output.tolist()[0] as number[];
}

/** Vectors from `embed()` are already L2-normalized, but this holds regardless. */
export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}
