import React from 'react';
import { CVPdfTemplate } from '../templates/cv/cv-pdf.template';
import { GrantPdfTemplate } from '../templates/grant/grant-pdf.template';
import { ScholarshipPdfTemplate } from '../templates/scholarship/scholarship-pdf.template';
import { DocumentDataInput, AIEnhancedOutput } from '../document-generator.types';

/**
 * Orchestrates rendering the appropriate JSX template to a PDF Buffer.
 */
export async function generatePDF(
  type: 'cv' | 'grant' | 'scholarship',
  originalData: DocumentDataInput,
  enhancedData: AIEnhancedOutput
): Promise<Buffer> {
  // Dynamically import to prevent compile issues on build
  const { renderToBuffer, Document, Page, Text, View, StyleSheet } = await import('@react-pdf/renderer');
  const pdfComponents = { Document, Page, Text, View, StyleSheet };

  let element: React.ReactElement;

  if (type === 'cv') {
    element = React.createElement(CVPdfTemplate, {
      originalData: originalData as any,
      enhancedData: enhancedData as any,
      pdf: pdfComponents,
    });
  } else if (type === 'grant') {
    element = React.createElement(GrantPdfTemplate, {
      originalData: originalData as any,
      enhancedData: enhancedData as any,
      pdf: pdfComponents,
    });
  } else if (type === 'scholarship') {
    element = React.createElement(ScholarshipPdfTemplate, {
      originalData: originalData as any,
      enhancedData: enhancedData as any,
      pdf: pdfComponents,
    });
  } else {
    throw new Error(`Invalid document type: ${type}`);
  }

  return renderToBuffer(element as any);
}
