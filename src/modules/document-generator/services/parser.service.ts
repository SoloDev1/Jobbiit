import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import { logger } from '../../../config/logger';

/**
 * Parses a PDF buffer and returns a cleaned, trimmed, and length-controlled string representation.
 */
export async function parsePdf(buffer: Buffer): Promise<string> {
  try {
    const data = await pdfParse(buffer);
    return cleanText(data.text);
  } catch (error) {
    logger.error({ error }, 'Failed to parse PDF file');
    throw new Error('Failed to parse PDF document');
  }
}

/**
 * Parses a DOCX buffer and returns a cleaned, trimmed, and length-controlled string representation.
 */
export async function parseDocx(buffer: Buffer): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ buffer });
    return cleanText(result.value);
  } catch (error) {
    logger.error({ error }, 'Failed to parse DOCX file');
    throw new Error('Failed to parse DOCX document');
  }
}

/**
 * Pre-processes, compresses spacing, and truncates text to keep LLM context token counts minimal.
 */
function cleanText(text: string): string {
  let cleaned = text
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n')
    .trim();

  // Truncate at 8000 characters (approx. 1800-2000 tokens maximum)
  if (cleaned.length > 8000) {
    cleaned = cleaned.substring(0, 8000) + '... [CV text truncated for optimization]';
  }
  return cleaned;
}
