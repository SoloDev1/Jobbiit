import React from 'react';
import { Document as DocxDocument, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import { StudioDocument } from '@prisma/client';

export class ExportService {
  /**
   * Generates a PDF Buffer for a Studio Document using @react-pdf/renderer
   */
  static async generatePdf(documentData: StudioDocument): Promise<Buffer> {
    const { renderToBuffer, Document, Page, Text, View, StyleSheet } = await (eval('import("@react-pdf/renderer")') as Promise<any>);

    const sections = (documentData.sections as any[]) || [];
    const settings = (documentData.settings as any) || {};

    const primaryColor = settings.primaryColor || '#0F172A';

    const styles = StyleSheet.create({
      page: {
        padding: 40,
        backgroundColor: '#FFFFFF',
        fontFamily: 'Helvetica',
      },
      header: {
        fontSize: 22,
        fontWeight: 'bold',
        color: primaryColor,
        borderBottomWidth: 1.5,
        borderBottomColor: primaryColor,
        paddingBottom: 6,
        marginBottom: 16,
      },
      sectionTitle: {
        fontSize: 12,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        color: primaryColor,
        marginTop: 12,
        marginBottom: 4,
      },
      content: {
        fontSize: 10,
        color: '#334155',
        lineHeight: 1.4,
        marginBottom: 8,
      },
    });

    const sectionElements = sections
      .filter((s) => !s.isHidden)
      .map((s) =>
        React.createElement(
          View,
          { key: s.id },
          React.createElement(Text, { style: styles.sectionTitle }, s.title),
          React.createElement(
            Text,
            { style: styles.content },
            Array.isArray(s.content) ? s.content.join('\n• ') : s.content
          )
        )
      );

    const pdfElement = React.createElement(
      Document,
      null,
      React.createElement(
        Page,
        { size: 'A4', style: styles.page },
        React.createElement(Text, { style: styles.header }, documentData.title),
        ...sectionElements
      )
    );

    const pdfBuffer = await renderToBuffer(pdfElement as any);
    return pdfBuffer;
  }

  /**
   * Generates a DOCX Buffer for a Studio Document using docx
   */
  static async generateDocx(documentData: StudioDocument): Promise<Buffer> {
    const sections = (documentData.sections as any[]) || [];

    const docxChildren: Paragraph[] = [
      new Paragraph({
        text: documentData.title,
        heading: HeadingLevel.TITLE,
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
            spacing: { before: 240, after: 120 },
          })
        );

        const contentText = Array.isArray(s.content) ? s.content.join('\n') : s.content;
        docxChildren.push(
          new Paragraph({
            children: [new TextRun({ text: contentText, size: 22 })],
            spacing: { after: 180 },
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
