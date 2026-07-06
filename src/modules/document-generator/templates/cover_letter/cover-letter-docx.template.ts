import { Document, Paragraph, TextRun, AlignmentType, BorderStyle } from 'docx';
import { CoverLetterInput } from '../../document-generator.types';

export function generateCoverLetterDocx(data: CoverLetterInput): Document {
  const children: Paragraph[] = [];
  const selectedStyle = data.style || 'classic-formal';
  const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  const nameParts = (data.applicantName || 'Your Name').split(' ');
  const firstName = nameParts[0];
  const restName = nameParts.slice(1).join(' ');

  if (selectedStyle === 'modern-accent') {
    // Header: Large bold name, gold first name
    children.push(new Paragraph({
      spacing: { after: 60 },
      children: [
        new TextRun({ text: firstName.toUpperCase() + ' ', bold: true, size: 44, color: 'F59E0B', font: 'Calibri' }),
        new TextRun({ text: restName.toUpperCase(), bold: true, size: 44, color: '1A1A1A', font: 'Calibri' }),
      ],
    }));

    // Contact line
    const contactParts = [data.applicantAddress, data.applicantPhone, data.applicantEmail].filter(Boolean);
    children.push(new Paragraph({
      spacing: { after: 200 },
      children: [new TextRun({ text: contactParts.join('  •  '), size: 18, color: '555555', font: 'Calibri' })],
    }));

    // Horizontal rule (simulated via bottom border)
    children.push(new Paragraph({
      spacing: { after: 200 },
      border: { bottom: { color: 'CCCCCC', space: 4, style: BorderStyle.SINGLE, size: 6 } },
      children: [],
    }));
  } else {
    // CLASSIC FORMAL: Sender block top-left
    children.push(new Paragraph({ children: [new TextRun({ text: data.applicantName, bold: true, size: 22, font: 'Times New Roman' })] }));
    if (data.applicantAddress) children.push(new Paragraph({ children: [new TextRun({ text: data.applicantAddress, size: 20, font: 'Times New Roman' })] }));
    if (data.applicantEmail) children.push(new Paragraph({ children: [new TextRun({ text: data.applicantEmail, size: 20, font: 'Times New Roman' })] }));
    children.push(new Paragraph({ spacing: { after: 240 }, children: [] }));
  }

  // Date
  children.push(new Paragraph({
    spacing: { after: 240 },
    children: [new TextRun({ text: today, size: 20, font: selectedStyle === 'modern-accent' ? 'Calibri' : 'Times New Roman' })],
  }));

  // Recipient block
  if (data.recipientName) children.push(new Paragraph({ children: [new TextRun({ text: data.recipientName + (data.recipientTitle ? `, ${data.recipientTitle}` : ''), size: 20, font: selectedStyle === 'modern-accent' ? 'Calibri' : 'Times New Roman' })] }));
  if (data.recipientCompany) children.push(new Paragraph({ children: [new TextRun({ text: data.recipientCompany, size: 20, font: selectedStyle === 'modern-accent' ? 'Calibri' : 'Times New Roman' })] }));
  if (data.recipientAddress) children.push(new Paragraph({ children: [new TextRun({ text: data.recipientAddress, size: 20, font: selectedStyle === 'modern-accent' ? 'Calibri' : 'Times New Roman' })] }));

  children.push(new Paragraph({ spacing: { after: 240 }, children: [] }));

  // Greeting
  const font = selectedStyle === 'modern-accent' ? 'Calibri' : 'Times New Roman';
  children.push(new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: `Dear ${data.recipientName || 'Hiring Manager'},`, size: 20, font })] }));

  // Body paragraphs
  if (data.bodyParagraph1) children.push(new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: data.bodyParagraph1, size: 20, font })] }));
  if (data.bodyParagraph2) children.push(new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: data.bodyParagraph2, size: 20, font })] }));
  if (data.bodyParagraph3) children.push(new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: data.bodyParagraph3, size: 20, font })] }));

  // Closing
  const closingText = selectedStyle === 'modern-accent' ? 'Thank you for your consideration.\n\nSincerely,' : 'Sincerely (or Respectfully Yours),';
  children.push(new Paragraph({ spacing: { after: 600 }, children: [new TextRun({ text: closingText, size: 20, font })] }));

  // Signature name
  children.push(new Paragraph({ children: [new TextRun({ text: data.applicantName, bold: true, size: 22, font })] }));
  if (data.applicantTitle) children.push(new Paragraph({ children: [new TextRun({ text: data.applicantTitle, size: 19, color: '555555', font })] }));

  return new Document({
    sections: [{ properties: {}, children }],
  });
}
