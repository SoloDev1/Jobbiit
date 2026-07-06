import React from 'react';
import { CoverLetterInput } from '../../document-generator.types';

interface CoverLetterTemplateProps {
  data: CoverLetterInput;
  pdf: any;
}

export const CoverLetterPdfTemplate: React.FC<CoverLetterTemplateProps> = ({ data, pdf }) => {
  const { Document, Page, Text, View, StyleSheet } = pdf;
  const selectedStyle = data.style || 'classic-formal';

  // CLASSIC FORMAL style (Vertex42 inspired — traditional block letter)
  if (selectedStyle === 'classic-formal') {
    const styles = StyleSheet.create({
      page: { padding: 60, fontSize: 10, fontFamily: 'Times-Roman', color: '#1a1a1a', lineHeight: 1.5 },
      senderBlock: { marginBottom: 20 },
      senderLine: { fontSize: 10, color: '#1a1a1a', marginBottom: 2 },
      dateText: { fontSize: 10, marginBottom: 20 },
      recipientBlock: { marginBottom: 20 },
      recipientLine: { fontSize: 10, color: '#1a1a1a', marginBottom: 2 },
      greeting: { fontSize: 10, marginBottom: 14, fontFamily: 'Times-Roman' },
      paragraph: { fontSize: 10, color: '#333333', marginBottom: 12, lineHeight: 1.6 },
      closing: { fontSize: 10, marginBottom: 50 },
      signatureName: { fontSize: 10, fontFamily: 'Times-Bold' },
      footer: { fontSize: 8, color: '#777777', marginTop: 20 },
    });

    const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

    return (
      <Document>
        <Page size="A4" style={styles.page}>
          {/* Sender block */}
          <View style={styles.senderBlock}>
            <Text style={styles.senderLine}>{data.applicantName}</Text>
            {data.applicantAddress && <Text style={styles.senderLine}>{data.applicantAddress}</Text>}
            {data.applicantEmail && <Text style={styles.senderLine}>{data.applicantEmail}</Text>}
          </View>

          <Text style={styles.dateText}>{today}</Text>

          {/* Recipient block */}
          <View style={styles.recipientBlock}>
            {data.recipientName && <Text style={styles.recipientLine}>{data.recipientName}</Text>}
            {data.recipientTitle && <Text style={styles.recipientLine}>{data.recipientTitle}</Text>}
            {data.recipientCompany && <Text style={styles.recipientLine}>{data.recipientCompany}</Text>}
            {data.recipientAddress && <Text style={styles.recipientLine}>{data.recipientAddress}</Text>}
          </View>

          <Text style={styles.greeting}>Dear {data.recipientName || 'Hiring Manager'},</Text>

          {data.bodyParagraph1 && <Text style={styles.paragraph}>{data.bodyParagraph1}</Text>}
          {data.bodyParagraph2 && <Text style={styles.paragraph}>{data.bodyParagraph2}</Text>}
          {data.bodyParagraph3 && <Text style={styles.paragraph}>{data.bodyParagraph3}</Text>}

          <Text style={styles.closing}>Sincerely (or Respectfully Yours),</Text>
          <Text style={styles.signatureName}>{data.applicantName}</Text>
          {data.applicantTitle && <Text style={{ fontSize: 10, color: '#444444', marginTop: 2 }}>{data.applicantTitle}</Text>}
        </Page>
      </Document>
    );
  }

  // MODERN ACCENT style (Keelan Ho inspired — bold name with gold accent, clean layout)
  const accentColor = '#f59e0b'; // gold accent
  const styles = StyleSheet.create({
    page: { padding: 50, fontSize: 10, fontFamily: 'Helvetica', color: '#1a1a1a', lineHeight: 1.5 },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
    nameBlock: { flexDirection: 'row' },
    firstName: { fontSize: 22, fontFamily: 'Helvetica-Bold', color: accentColor },
    lastName: { fontSize: 22, fontFamily: 'Helvetica-Bold', color: '#1a1a1a', marginLeft: 6 },
    contactBlock: { alignItems: 'flex-end' },
    contactLine: { fontSize: 9, color: '#444444', marginBottom: 2 },
    emailLine: { fontSize: 9, color: accentColor },
    rule: { height: 1, backgroundColor: '#cccccc', marginVertical: 12 },
    recipientBlock: { marginBottom: 16 },
    recipientDate: { fontSize: 10, color: '#333333', marginBottom: 10 },
    recipientLine: { fontSize: 10, color: '#1a1a1a', marginBottom: 2 },
    greeting: { fontSize: 10, marginBottom: 14 },
    paragraph: { fontSize: 10, color: '#333333', marginBottom: 12, lineHeight: 1.6 },
    closing: { fontSize: 10, marginBottom: 40 },
    signatureName: { fontSize: 11, fontFamily: 'Helvetica-Bold' },
  });

  const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const nameParts = (data.applicantName || 'Your Name').split(' ');
  const firstName = nameParts[0];
  const restName = nameParts.slice(1).join(' ');

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.headerRow}>
          <View style={styles.nameBlock}>
            <Text style={styles.firstName}>{firstName.toUpperCase()}</Text>
            <Text style={styles.lastName}>{restName.toUpperCase()}</Text>
          </View>
          <View style={styles.contactBlock}>
            {data.applicantAddress && <Text style={styles.contactLine}>{data.applicantAddress}</Text>}
            {data.applicantPhone && <Text style={styles.contactLine}>{data.applicantPhone}</Text>}
            {data.applicantEmail && <Text style={styles.emailLine}>{data.applicantEmail}</Text>}
          </View>
        </View>

        <View style={styles.rule} />

        {/* Date and Recipient */}
        <View style={styles.recipientBlock}>
          <Text style={styles.recipientDate}>{today}</Text>
          {data.recipientName && <Text style={styles.recipientLine}>{data.recipientName}{data.recipientTitle ? `, ${data.recipientTitle}` : ''}</Text>}
          {data.recipientCompany && <Text style={styles.recipientLine}>{data.recipientCompany}</Text>}
          {data.recipientAddress && <Text style={styles.recipientLine}>{data.recipientAddress}</Text>}
        </View>

        <Text style={styles.greeting}>Dear {data.recipientName || 'Hiring Manager'},</Text>

        {data.bodyParagraph1 && <Text style={styles.paragraph}>{data.bodyParagraph1}</Text>}
        {data.bodyParagraph2 && <Text style={styles.paragraph}>{data.bodyParagraph2}</Text>}
        {data.bodyParagraph3 && <Text style={styles.paragraph}>{data.bodyParagraph3}</Text>}

        <Text style={styles.closing}>Thank you for your consideration.</Text>
        <Text style={{ fontSize: 10, marginBottom: 36 }}>Sincerely,</Text>
        <Text style={styles.signatureName}>{data.applicantName}</Text>
        {data.applicantTitle && <Text style={{ fontSize: 9, color: '#555555', marginTop: 2 }}>{data.applicantTitle}</Text>}
      </Page>
    </Document>
  );
};
