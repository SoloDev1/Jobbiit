import { Document, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle } from 'docx';
import { CVInput, CVEnhancedData } from '../../document-generator.types';

/**
 * Creates a section title paragraph with a teal bottom border.
 */
function createSectionTitle(title: string): Paragraph {
  return new Paragraph({
    text: title.toUpperCase(),
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 240, after: 120 },
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

export function generateCVDocx(originalData: CVInput, enhancedData: CVEnhancedData): Document {
  const children: any[] = [];

  // Name
  children.push(
    new Paragraph({
      alignment: AlignmentType.LEFT,
      spacing: { after: 120 },
      children: [
        new TextRun({
          text: originalData.fullName,
          bold: true,
          size: 36, // 18pt
          color: '1E293B',
          font: 'Calibri',
        }),
      ],
    })
  );

  // Contact Info
  const contactText = [
    originalData.email,
    originalData.phone,
    originalData.location,
  ].filter(Boolean).join('   |   ');

  children.push(
    new Paragraph({
      spacing: { after: 360 },
      children: [
        new TextRun({
          text: contactText,
          size: 19, // 9.5pt
          color: '64748b',
          font: 'Calibri',
        }),
      ],
    })
  );

  // Professional Summary
  if (enhancedData.summary) {
    children.push(createSectionTitle('Professional Summary'));
    children.push(
      new Paragraph({
        spacing: { after: 200 },
        children: [
          new TextRun({
            text: enhancedData.summary,
            size: 21, // 10.5pt
            color: '334155',
            font: 'Calibri',
          }),
        ],
      })
    );
  }

  // Work Experience
  if (enhancedData.experience && enhancedData.experience.length > 0) {
    children.push(createSectionTitle('Work Experience'));
    for (const exp of enhancedData.experience) {
      children.push(
        new Paragraph({
          spacing: { before: 120, after: 40 },
          children: [
            new TextRun({
              text: exp.title,
              bold: true,
              size: 22, // 11pt
              color: '1E293B',
              font: 'Calibri',
            }),
            new TextRun({
              text: `   at ${exp.company}`,
              bold: true,
              size: 22,
              color: '475569',
              font: 'Calibri',
            }),
            new TextRun({
              text: `\t${exp.startDate} - ${exp.endDate || 'Present'}`,
              size: 20, // 10pt
              color: '64748b',
              font: 'Calibri',
            }),
          ],
        })
      );

      if (exp.description) {
        children.push(
          new Paragraph({
            spacing: { after: 120 },
            children: [
              new TextRun({
                text: exp.description,
                size: 20, // 10pt
                color: '475569',
                font: 'Calibri',
              }),
            ],
          })
        );
      }
    }
  }

  // Education
  if (originalData.education && originalData.education.length > 0) {
    children.push(createSectionTitle('Education'));
    for (const edu of originalData.education) {
      const degreeText = [edu.degree, edu.field].filter(Boolean).join(' in ');
      children.push(
        new Paragraph({
          spacing: { before: 120, after: 40 },
          children: [
            new TextRun({
              text: edu.school,
              bold: true,
              size: 22, // 11pt
              color: '1E293B',
              font: 'Calibri',
            }),
            new TextRun({
              text: `\t${edu.startDate} - ${edu.endDate || 'Present'}`,
              size: 20, // 10pt
              color: '64748b',
              font: 'Calibri',
            }),
          ],
        })
      );

      if (degreeText) {
        children.push(
          new Paragraph({
            spacing: { after: 120 },
            children: [
              new TextRun({
                text: degreeText,
                size: 20,
                color: '475569',
                font: 'Calibri',
              }),
            ],
          })
        );
      }
    }
  }

  // Skills
  if (enhancedData.skills && enhancedData.skills.length > 0) {
    children.push(createSectionTitle('Skills'));
    children.push(
      new Paragraph({
        spacing: { after: 200 },
        children: [
          new TextRun({
            text: enhancedData.skills.join(', '),
            size: 21, // 10.5pt
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
