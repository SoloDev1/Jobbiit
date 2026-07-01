import { z } from 'zod';

const cvSchema = z.object({
  type: z.literal('cv'),
  fullName: z.string().min(1, 'Full name is required'),
  email: z.string().email('Must be a valid email address'),
  phone: z.string().optional(),
  location: z.string().optional(),
  summary: z.string().optional(),
  experience: z.array(
    z.object({
      title: z.string().min(1, 'Job title is required'),
      company: z.string().min(1, 'Company name is required'),
      startDate: z.string().min(1, 'Start date is required'),
      endDate: z.string().optional(),
      description: z.string().optional(),
    })
  ),
  education: z.array(
    z.object({
      school: z.string().min(1, 'School name is required'),
      degree: z.string().optional(),
      field: z.string().optional(),
      startDate: z.string().min(1, 'Start date is required'),
      endDate: z.string().optional(),
    })
  ),
  skills: z.array(z.string().min(1)),
});

const grantSchema = z.object({
  type: z.literal('grant'),
  applicantName: z.string().min(1, 'Applicant name is required'),
  organisation: z.string().optional(),
  grantName: z.string().min(1, 'Grant name is required'),
  amount: z.string().optional(),
  objective: z.string().min(1, 'Objective is required'),
  background: z.string().min(1, 'Background is required'),
  methodology: z.string().optional(),
  impact: z.string().optional(),
});

const scholarshipSchema = z.object({
  type: z.literal('scholarship'),
  applicantName: z.string().min(1, 'Applicant name is required'),
  scholarshipName: z.string().min(1, 'Scholarship name is required'),
  institution: z.string().optional(),
  personalStatement: z.string().min(1, 'Personal statement is required'),
  achievements: z.array(z.string()).optional(),
  financialNeed: z.string().optional(),
  careerGoals: z.string().optional(),
});

export const generateDocumentSchema = z.object({
  type: z.enum(['cv', 'grant', 'scholarship'] as const, { required_error: 'Type must be cv, grant, or scholarship', invalid_type_error: 'Type must be cv, grant, or scholarship' }),
  format: z.enum(['pdf', 'docx', 'both'] as const, { required_error: 'Format must be pdf, docx, or both', invalid_type_error: 'Format must be pdf, docx, or both' }),
  data: z.discriminatedUnion('type', [
    cvSchema,
    grantSchema,
    scholarshipSchema,
  ]),
}).refine(val => val.type === val.data.type, {
  message: "Root type must match data.type",
  path: ["type"]
});

export type GenerateDocumentInput = z.infer<typeof generateDocumentSchema>;
