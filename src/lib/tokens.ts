import { encode } from "gpt-tokenizer";

export function estimateTokens(text: string): number {
  if (!text) return 0;
  return encode(text).length;
}
