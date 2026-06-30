import React from 'react';
import { CVInput, CVEnhancedData } from '../../document-generator.types';

const rawStyles = {
  page: {
    padding: 40,
    fontSize: 10,
    color: '#334155',
    fontFamily: 'Helvetica',
    lineHeight: 1.5,
  },
  header: {
    borderBottomWidth: 2,
    borderBottomColor: '#0f766e',
    paddingBottom: 12,
    marginBottom: 15,
  },
  name: {
    fontSize: 22,
    color: '#1e293b',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  contactRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    color: '#64748b',
    fontSize: 9,
  },
  contactItem: {
    marginRight: 15,
  },
  sectionTitle: {
    fontSize: 12,
    color: '#0f766e',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 15,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingBottom: 3,
  },
  summaryText: {
    marginBottom: 10,
  },
  entry: {
    marginBottom: 10,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    color: '#1e293b',
    fontWeight: 'bold',
    marginBottom: 2,
  },
  entrySub: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    color: '#64748b',
    fontSize: 9,
    marginBottom: 4,
  },
  entryDescription: {
    fontSize: 9.5,
    color: '#475569',
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 5,
  },
  skillBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 6,
    marginBottom: 6,
    fontSize: 8.5,
    color: '#334155',
  },
} as const;

interface CVTemplateProps {
  originalData: CVInput;
  enhancedData: CVEnhancedData;
  pdf: any;
}

export const CVPdfTemplate: React.FC<CVTemplateProps> = ({ originalData, enhancedData, pdf }) => {
  const { Document, Page, Text, View, StyleSheet } = pdf;
  const styles = StyleSheet.create(rawStyles);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.name}>{originalData.fullName}</Text>
          <View style={styles.contactRow}>
            <Text style={styles.contactItem}>{originalData.email}</Text>
            {originalData.phone && <Text style={styles.contactItem}>|  {originalData.phone}</Text>}
            {originalData.location && <Text style={styles.contactItem}>|  {originalData.location}</Text>}
          </View>
        </View>

        {/* Professional Summary */}
        {enhancedData.summary && (
          <View>
            <Text style={styles.sectionTitle}>Professional Summary</Text>
            <Text style={styles.summaryText}>{enhancedData.summary}</Text>
          </View>
        )}

        {/* Experience */}
        {enhancedData.experience && enhancedData.experience.length > 0 && (
          <View>
            <Text style={styles.sectionTitle}>Work Experience</Text>
            {enhancedData.experience.map((exp, idx) => (
              <View key={idx} style={styles.entry}>
                <View style={styles.entryHeader}>
                  <Text style={{ fontWeight: 'bold' }}>{exp.title}</Text>
                  <Text style={{ fontWeight: 'bold' }}>{exp.company}</Text>
                </View>
                <View style={styles.entrySub}>
                  <Text>{exp.startDate} - {exp.endDate || 'Present'}</Text>
                </View>
                {exp.description && (
                  <Text style={styles.entryDescription}>{exp.description}</Text>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Education */}
        {originalData.education && originalData.education.length > 0 && (
          <View>
            <Text style={styles.sectionTitle}>Education</Text>
            {originalData.education.map((edu, idx) => (
              <View key={idx} style={styles.entry}>
                <View style={styles.entryHeader}>
                  <Text style={{ fontWeight: 'bold' }}>{edu.school}</Text>
                  <Text>{edu.startDate} - {edu.endDate || 'Present'}</Text>
                </View>
                <View style={styles.entrySub}>
                  <Text>{edu.degree || ''} {edu.field ? `in ${edu.field}` : ''}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Skills */}
        {enhancedData.skills && enhancedData.skills.length > 0 && (
          <View>
            <Text style={styles.sectionTitle}>Skills</Text>
            <View style={styles.skillsContainer}>
              {enhancedData.skills.map((skill, idx) => (
                <Text key={idx} style={styles.skillBadge}>{skill}</Text>
              ))}
            </View>
          </View>
        )}
      </Page>
    </Document>
  );
};
