import OpenAI from 'openai';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import { z } from 'zod';
import { zodResponseFormat } from 'openai/helpers/zod';
import { env } from '../config/env';

const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
});

// Resume schema representing structured CV details
const ResumeSchema = z.object({
  personal: z.object({
    fullName: z.string(),
    email: z.string().optional(),
    phone: z.string().optional(),
    location: z.string().optional(),
    summary: z.string().optional(),
  }),
  skills: z.array(z.string()),
  experience: z.array(z.object({
    title: z.string(),
    company: z.string(),
    startDate: z.string(),
    endDate: z.string().optional(),
    description: z.string().optional(),
  })),
  education: z.array(z.object({
    school: z.string(),
    degree: z.string().optional(),
    field: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
  })),
});

/**
 * Extracts raw plain text from PDF or DOCX buffer
 */
export async function extractTextFromBuffer(buffer: Buffer, mimeType: string): Promise<string> {
  if (mimeType === 'application/pdf') {
    const data = await pdfParse(buffer);
    return data.text;
  } else if (
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    mimeType === 'application/msword'
  ) {
    const data = await mammoth.extractRawText({ buffer });
    return data.value;
  }
  throw new Error('Unsupported file format. Please upload a PDF or DOCX file.');
}

/**
 * Parses raw CV text into structured profile JSON
 */
export async function parseResumeText(rawText: string) {
  const response = await openai.beta.chat.completions.parse({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: 'You are an expert ATS resume parsing assistant. Extract profile details from the raw CV text accurately into the requested JSON schema.',
      },
      {
        role: 'user',
        content: rawText,
      },
    ],
    response_format: zodResponseFormat(ResumeSchema, 'resume'),
    temperature: 0.1,
  });

  return response.choices[0].message.parsed;
}
