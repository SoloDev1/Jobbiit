import React from 'react';
import { Document as DocxDocument, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';
import { StudioDocument } from '@prisma/client';

export class ExportService {
  /**
   * Generates a PDF Buffer for a Studio Document using @react-pdf/renderer
   * Dynamically formats output based on templateId (classic_executive, professional, modern, minimal)
   */
  static async generatePdf(documentData: StudioDocument): Promise<Buffer> {
    const { renderToBuffer, Document, Page, Text, View, StyleSheet } = await (eval('import("@react-pdf/renderer")') as Promise<any>);

    const sections = (documentData.sections as any[]) || [];
    const settings = (documentData.settings as any) || {};
    const templateId = documentData.templateId || 'classic_executive';

    const isCentered = templateId === 'classic_executive';
    const isMinimal = templateId === 'minimal';
    const isModern = templateId === 'modern';

    const primaryColor = isModern
      ? '#007AFF'
      : isMinimal
      ? '#111827'
      : settings.primaryColor || '#1F2A44';

    const styles = StyleSheet.create({
      page: {
        padding: 36,
        backgroundColor: '#FFFFFF',
        fontFamily: 'Helvetica',
      },
      nameHeader: {
        fontSize: 22,
        fontWeight: 'bold',
        color: primaryColor,
        textAlign: isCentered ? 'center' : 'left',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 4,
      },
      contactLine: {
        fontSize: 9.5,
        color: '#44546A',
        textAlign: isCentered ? 'center' : 'left',
        marginBottom: 8,
      },
      headerDivider: {
        borderBottomWidth: isMinimal ? 0 : 1.5,
        borderBottomColor: primaryColor,
        marginBottom: 14,
      },
      sectionTitle: {
        fontSize: 12,
        fontWeight: 'bold',
        textAlign: isCentered ? 'center' : 'left',
        color: primaryColor,
        marginTop: 10,
        marginBottom: 2,
      },
      sectionDivider: {
        borderBottomWidth: isMinimal ? 0 : 1,
        borderBottomColor: '#C9CFDA',
        marginBottom: 6,
      },
      content: {
        fontSize: 10,
        color: '#2B2B2B',
        lineHeight: 1.4,
        marginBottom: 10,
      },
    });

    const contactText = (documentData as any).contactLine || '32 Swancote Drive, Wolverhampton WV4 4RN | 0790-0188-208 | bayointheuk@gmail.com';

    const sectionElements = sections
      .filter((s) => !s.isHidden)
      .map((s) =>
        React.createElement(
          View,
          { key: s.id },
          React.createElement(Text, { style: styles.sectionTitle }, s.title),
          !isMinimal && React.createElement(View, { style: styles.sectionDivider }),
          React.createElement(
            Text,
            { style: styles.content },
            Array.isArray(s.content) ? s.content.map((bullet: string) => `• ${bullet}`).join('\n') : s.content
          )
        )
      );

    const pdfElement = React.createElement(
      Document,
      null,
      React.createElement(
        Page,
        { size: 'A4', style: styles.page },
        React.createElement(Text, { style: styles.nameHeader }, documentData.title),
        React.createElement(Text, { style: styles.contactLine }, contactText),
        !isMinimal && React.createElement(View, { style: styles.headerDivider }),
        ...sectionElements
      )
    );

    const pdfBuffer = await renderToBuffer(pdfElement as any);
    return pdfBuffer;
  }

  /**
   * Generates a DOCX Buffer for a Studio Document using docx
   * Dynamically formats alignment and headers based on templateId
   */
  static async generateDocx(documentData: StudioDocument): Promise<Buffer> {
    const sections = (documentData.sections as any[]) || [];
    const templateId = documentData.templateId || 'classic_executive';
    const isCentered = templateId === 'classic_executive';
    const contactText = (documentData as any).contactLine || '32 Swancote Drive, Wolverhampton WV4 4RN | 0790-0188-208 | bayointheuk@gmail.com';

    const docxChildren: Paragraph[] = [
      new Paragraph({
        text: documentData.title.toUpperCase(),
        heading: HeadingLevel.TITLE,
        alignment: isCentered ? AlignmentType.CENTER : AlignmentType.LEFT,
        spacing: { after: 60 },
      }),
      new Paragraph({
        children: [new TextRun({ text: contactText, size: 19, color: '44546A' })],
        alignment: isCentered ? AlignmentType.CENTER : AlignmentType.LEFT,
        spacing: { after: 200 },
      }),
    ];

    sections
      .filter((s) => !s.isHidden)
      .forEach((s) => {
        docxChildren.push(
          new Paragraph({
            text: s.title.toUpperCase(),
            heading: HeadingLevel.HEADING_2,
            alignment: isCentered ? AlignmentType.CENTER : AlignmentType.LEFT,
            spacing: { before: 200, after: 80 },
          })
        );

        const contentText = Array.isArray(s.content) ? s.content.map((b: string) => `• ${b}`).join('\n') : s.content;
        docxChildren.push(
          new Paragraph({
            children: [new TextRun({ text: contentText, size: 20, color: '2B2B2B' })],
            spacing: { after: 160 },
          })
        );
      });

    const doc = new DocxDocument({
      sections: [{ children: docxChildren }],
    });

    const buffer = await Packer.toBuffer(doc);
    return buffer;
  }
}
