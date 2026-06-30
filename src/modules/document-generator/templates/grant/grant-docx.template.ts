import { Document, Paragraph, TextRun, HeadingLevel, BorderStyle } from 'docx';
import { GrantInput, GrantEnhancedData } from '../../document-generator.types';

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

export function generateGrantDocx(originalData: GrantInput, enhancedData: GrantEnhancedData): Document {
  const children: any[] = [];

  // Title
  children.push(
    new Paragraph({
      spacing: { after: 120 },
      children: [
        new TextRun({
          text: 'GRANT APPLICATION PROPOSAL',
          bold: true,
          size: 32, // 16pt
          color: '1E293B',
          font: 'Calibri',
        }),
      ],
    })
  );

  // Subtitle / Grant Name
  children.push(
    new Paragraph({
      spacing: { after: 240 },
      children: [
        new TextRun({
          text: originalData.grantName,
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
        originalData.organisation ? new TextRun({
          text: `   |   Organisation: ${originalData.organisation}`,
          size: 20,
          color: '334155',
          font: 'Calibri',
        }) : null,
        originalData.amount ? new TextRun({
          text: `   |   Requested Amount: ${originalData.amount}`,
          bold: true,
          size: 20,
          color: '0F766E',
          font: 'Calibri',
        }) : null,
      ].filter(Boolean) as TextRun[]
    })
  );

  // Objective
  children.push(createSectionTitle('Project Objective'));
  children.push(
    new Paragraph({
      spacing: { after: 180 },
      children: [
        new TextRun({
          text: enhancedData.objective,
          size: 21, // 10.5pt
          color: '334155',
          font: 'Calibri',
        }),
      ],
    })
  );

  // Background
  children.push(createSectionTitle('Background & Need Statement'));
  children.push(
    new Paragraph({
      spacing: { after: 180 },
      children: [
        new TextRun({
          text: enhancedData.background,
          size: 21,
          color: '334155',
          font: 'Calibri',
        }),
      ],
    })
  );

  // Methodology
  if (enhancedData.methodology) {
    children.push(createSectionTitle('Methodology & Implementation Plan'));
    children.push(
      new Paragraph({
        spacing: { after: 180 },
        children: [
          new TextRun({
            text: enhancedData.methodology,
            size: 21,
            color: '334155',
            font: 'Calibri',
          }),
        ],
      })
    );
  }

  // Impact
  if (enhancedData.impact) {
    children.push(createSectionTitle('Expected Impact & Outcomes'));
    children.push(
      new Paragraph({
        spacing: { after: 180 },
        children: [
          new TextRun({
            text: enhancedData.impact,
            size: 21,
            color: '334155',
            font: 'Calibri',
          }),
        ],
      })
    );
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
