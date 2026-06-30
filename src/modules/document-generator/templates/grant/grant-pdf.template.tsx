import React from 'react';
import { GrantInput, GrantEnhancedData } from '../../document-generator.types';

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
} as const;

interface GrantTemplateProps {
  originalData: GrantInput;
  enhancedData: GrantEnhancedData;
  pdf: any;
}

export const GrantPdfTemplate: React.FC<GrantTemplateProps> = ({ originalData, enhancedData, pdf }) => {
  const { Document, Page, Text, View, StyleSheet } = pdf;
  const styles = StyleSheet.create(rawStyles);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Grant Application Proposal</Text>
          <Text style={styles.subtitle}>{originalData.grantName}</Text>

          <View style={styles.metaContainer}>
            <View style={styles.metaCol}>
              <Text style={styles.metaLabel}>Applicant</Text>
              <Text style={styles.metaVal}>{originalData.applicantName}</Text>
            </View>
            {originalData.organisation && (
              <View style={styles.metaCol}>
                <Text style={styles.metaLabel}>Organisation</Text>
                <Text style={styles.metaVal}>{originalData.organisation}</Text>
              </View>
            )}
            {originalData.amount && (
              <View style={styles.metaCol}>
                <Text style={styles.metaLabel}>Requested Amount</Text>
                <Text style={styles.metaVal}>{originalData.amount}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Objective */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Project Objective</Text>
          <Text style={styles.bodyText}>{enhancedData.objective}</Text>
        </View>

        {/* Background */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Background & Need Statement</Text>
          <Text style={styles.bodyText}>{enhancedData.background}</Text>
        </View>

        {/* Methodology */}
        {enhancedData.methodology && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Methodology & Implementation Plan</Text>
            <Text style={styles.bodyText}>{enhancedData.methodology}</Text>
          </View>
        )}

        {/* Impact */}
        {enhancedData.impact && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Expected Impact & Outcomes</Text>
            <Text style={styles.bodyText}>{enhancedData.impact}</Text>
          </View>
        )}
      </Page>
    </Document>
  );
};
