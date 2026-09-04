export {
  generateSquads,
  GeminiError,
  OCR_PROMPT_TEMPLATE,
  RESPONSE_SCHEMA,
} from "./client";
export type { CallModel, GeminiErrorCode, ImageInput } from "./client";
export { validateSquads } from "./validate";
export type { ValidationFailure, ValidationResult } from "./validate";
export { parseMatchSquads } from "./parse";
