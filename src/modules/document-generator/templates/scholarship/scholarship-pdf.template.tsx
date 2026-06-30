import React from 'react';
import { ScholarshipInput, ScholarshipEnhancedData } from '../../document-generator.types';

const rawStyles = {
  page: {
    padding: 50,
    fontSize: 10,
    color: '#334155',
    fontFamily: 'Helvetica',
    lineHeight: 1.6,
  },
  header: {
    borderBottomWidth: 3,
    borderBottomColor: '#0f766e',
    paddingBottom: 15,
    marginBottom: 25,
  },
  title: {
    fontSize: 20,
    color: '#1e293b',
    fontWeight: 'bold',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  subtitle: {
    fontSize: 11,
    color: '#64748b',
    marginBottom: 10,
  },
  metaContainer: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginTop: 5,
  },
  metaCol: {
    flex: 1,
  },
  metaLabel: {
    fontSize: 8,
    color: '#64748b',
    textTransform: 'uppercase',
    fontWeight: 'bold',
    marginBottom: 2,
  },
  metaVal: {
    fontSize: 10,
    color: '#1e293b',
    fontWeight: 'bold',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 12,
    color: '#0f766e',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingBottom: 3,
  },
  bodyText: {
    fontSize: 9.5,
    color: '#334155',
    textAlign: 'justify',
  },
  bulletsContainer: {
    marginTop: 5,
  },
  bulletRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  bulletPoint: {
    width: 15,
    fontSize: 10,
    color: '#0f766e',
  },
  bulletText: {
    flex: 1,
    fontSize: 9.5,
  },
} as const;

interface ScholarshipTemplateProps {
  originalData: ScholarshipInput;
  enhancedData: ScholarshipEnhancedData;
  pdf: any;
}

export const ScholarshipPdfTemplate: React.FC<ScholarshipTemplateProps> = ({ originalData, enhancedData, pdf }) => {
  const { Document, Page, Text, View, StyleSheet } = pdf;
  const styles = StyleSheet.create(rawStyles);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Scholarship Application Essay</Text>
          <Text style={styles.subtitle}>{originalData.scholarshipName}</Text>

          <View style={styles.metaContainer}>
            <View style={styles.metaCol}>
              <Text style={styles.metaLabel}>Applicant</Text>
              <Text style={styles.metaVal}>{originalData.applicantName}</Text>
            </View>
            {originalData.institution && (
              <View style={styles.metaCol}>
                <Text style={styles.metaLabel}>Target Institution</Text>
                <Text style={styles.metaVal}>{originalData.institution}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Personal Statement */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Statement</Text>
          <Text style={styles.bodyText}>{enhancedData.personalStatement}</Text>
        </View>

        {/* Financial Need */}
        {enhancedData.financialNeed && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Statement of Financial Need</Text>
            <Text style={styles.bodyText}>{enhancedData.financialNeed}</Text>
          </View>
        )}

        {/* Career Goals */}
        {enhancedData.careerGoals && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Future Career Aspirations & Goals</Text>
            <Text style={styles.bodyText}>{enhancedData.careerGoals}</Text>
          </View>
        )}

        {/* Achievements */}
        {enhancedData.achievements && enhancedData.achievements.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Key Academic & Personal Achievements</Text>
            <View style={styles.bulletsContainer}>
              {enhancedData.achievements.map((ach, idx) => (
                <View key={idx} style={styles.bulletRow}>
                  <Text style={styles.bulletPoint}>•</Text>
                  <Text style={styles.bulletText}>{ach}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </Page>
    </Document>
  );
};
