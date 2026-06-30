import { Document, Paragraph, TextRun, HeadingLevel, BorderStyle } from 'docx';
import { ScholarshipInput, ScholarshipEnhancedData } from '../../document-generator.types';

function createSectionTitle(title: string): Paragraph {
  return new Paragraph({
    text: title.toUpperCase(),
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 300, after: 120 },
    border: {
      bottom: {
        color: '0F766E',
        space: 4,
        style: BorderStyle.SINGLE,
        size: 12,
      },
    },
  });
}

export function generateScholarshipDocx(originalData: ScholarshipInput, enhancedData: ScholarshipEnhancedData): Document {
  const children: any[] = [];

  // Title
  children.push(
    new Paragraph({
      spacing: { after: 120 },
      children: [
        new TextRun({
          text: 'SCHOLARSHIP APPLICATION ESSAY',
          bold: true,
          size: 32, // 16pt
          color: '1E293B',
          font: 'Calibri',
        }),
      ],
    })
  );

  // Subtitle / Scholarship Name
  children.push(
    new Paragraph({
      spacing: { after: 240 },
      children: [
        new TextRun({
          text: originalData.scholarshipName,
          italics: true,
          size: 24, // 12pt
          color: '475569',
          font: 'Calibri',
        }),
      ],
    })
  );

  // Metadata block
  children.push(
    new Paragraph({
      spacing: { after: 360 },
      children: [
        new TextRun({
          text: `Applicant: `,
          bold: true,
          size: 20, // 10pt
          color: '334155',
          font: 'Calibri',
        }),
        new TextRun({
          text: originalData.applicantName,
          size: 20,
          color: '334155',
          font: 'Calibri',
        }),
        originalData.institution ? new TextRun({
          text: `   |   Target Institution: ${originalData.institution}`,
          size: 20,
          color: '334155',
          font: 'Calibri',
        }) : null,
      ].filter(Boolean) as TextRun[]
    })
  );

  // Personal Statement
  children.push(createSectionTitle('Personal Statement'));
  children.push(
    new Paragraph({
      spacing: { after: 180 },
      children: [
        new TextRun({
          text: enhancedData.personalStatement,
          size: 21, // 10.5pt
          color: '334155',
          font: 'Calibri',
        }),
      ],
    })
  );

  // Financial Need
  if (enhancedData.financialNeed) {
    children.push(createSectionTitle('Statement of Financial Need'));
    children.push(
      new Paragraph({
        spacing: { after: 180 },
        children: [
          new TextRun({
            text: enhancedData.financialNeed,
            size: 21,
            color: '334155',
            font: 'Calibri',
          }),
        ],
      })
    );
  }

  // Career Goals
  if (enhancedData.careerGoals) {
    children.push(createSectionTitle('Future Career Aspirations & Goals'));
    children.push(
      new Paragraph({
        spacing: { after: 180 },
        children: [
          new TextRun({
            text: enhancedData.careerGoals,
            size: 21,
            color: '334155',
            font: 'Calibri',
          }),
        ],
      })
    );
  }

  // Achievements
  if (enhancedData.achievements && enhancedData.achievements.length > 0) {
    children.push(createSectionTitle('Key Academic & Personal Achievements'));
    for (const ach of enhancedData.achievements) {
      children.push(
        new Paragraph({
          bullet: {
            level: 0,
          },
          spacing: { before: 40, after: 40 },
          children: [
            new TextRun({
              text: ach,
              size: 20,
              color: '334155',
              font: 'Calibri',
            }),
          ],
        })
      );
    }
  }

  return new Document({
    sections: [
      {
        properties: {},
        children,
      },
    ],
  });
}
