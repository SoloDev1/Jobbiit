import { Packer } from 'docx';
import { generateCVDocx } from '../templates/cv/cv-docx.template';
import { generateGrantDocx } from '../templates/grant/grant-docx.template';
import { generateScholarshipDocx } from '../templates/scholarship/scholarship-docx.template';
import { generateCoverLetterDocx } from '../templates/cover_letter/cover-letter-docx.template';
import { DocumentDataInput, AIEnhancedOutput } from '../document-generator.types';

/**
 * Orchestrates creating the appropriate docx Document and compiling it to a Buffer.
 */
export async function generateDOCX(
  type: 'cv' | 'grant' | 'scholarship' | 'cover_letter',
  originalData: DocumentDataInput,
  enhancedData: AIEnhancedOutput | null
): Promise<Buffer> {
  let doc;

  if (type === 'cv') {
    doc = generateCVDocx(originalData as any, enhancedData as any);
  } else if (type === 'grant') {
    doc = generateGrantDocx(originalData as any, enhancedData as any);
  } else if (type === 'scholarship') {
    doc = generateScholarshipDocx(originalData as any, enhancedData as any);
  } else if (type === 'cover_letter') {
    doc = generateCoverLetterDocx(originalData as any);
  } else {
    throw new Error(`Invalid document type: ${type}`);
  }

  return Packer.toBuffer(doc);
}
