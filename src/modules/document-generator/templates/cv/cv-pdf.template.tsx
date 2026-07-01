import React from 'react';
import { CVInput, CVEnhancedData } from '../../document-generator.types';

const rawStyles = {
  // Common
  entry: { marginBottom: 10 },
  entryHeader: { flexDirection: 'row', justifyContent: 'space-between', color: '#1e293b', fontWeight: 'bold', marginBottom: 2 },
  entrySub: { flexDirection: 'row', justifyContent: 'space-between', color: '#64748b', fontSize: 9, marginBottom: 4 },
  entryDescription: { fontSize: 9, color: '#475569' },
  skillsContainer: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 5 },

  // CELESTIAL
  celestialPage: { flexDirection: 'row', padding: 30, fontSize: 9.5, color: '#334155', fontFamily: 'Helvetica', lineHeight: 1.4 },
  celestialSidebar: { width: '35%', borderRightWidth: 1, borderRightColor: '#e2e8f0', paddingRight: 15, flexDirection: 'column' },
  celestialMain: { flex: 1, paddingLeft: 15 },
  celestialName: { fontSize: 18, color: '#1e293b', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 4 },
  celestialTitle: { fontSize: 9, color: '#64748b', fontWeight: 'bold', marginBottom: 15 },
  celestialSectionTitle: { fontSize: 10, color: '#0f766e', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 15, marginBottom: 6, borderBottomWidth: 1, borderBottomColor: '#e2e8f0', paddingBottom: 2 },
  celestialContactItem: { fontSize: 8, color: '#475569', marginBottom: 5 },
  celestialSkillBadge: { backgroundColor: '#f1f5f9', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 3, marginRight: 4, marginBottom: 4, fontSize: 8, color: '#334155' },

  // GALAXY
  galaxyPage: { padding: 40, fontSize: 9.5, color: '#334155', fontFamily: 'Helvetica', lineHeight: 1.4 },
  galaxyHeader: { alignItems: 'center', marginBottom: 15 },
  galaxyName: { fontSize: 20, color: '#1e293b', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1 },
  galaxyDivider: { height: 1, backgroundColor: '#cbd5e1', width: '100%', marginVertical: 4 },
  galaxyTitle: { fontSize: 9, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 'bold' },
  galaxyContactRow: { flexDirection: 'row', color: '#64748b', fontSize: 8.5, marginTop: 4 },
  galaxyContactItem: { marginHorizontal: 8 },
  galaxySectionTitle: { fontSize: 10.5, color: '#0f766e', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1, marginTop: 15, marginBottom: 8, borderBottomWidth: 1, borderBottomColor: '#e2e8f0', paddingBottom: 3, textAlign: 'center' },

  // ASTRAL
  astralPage: { padding: 35, fontSize: 9.5, color: '#334155', fontFamily: 'Helvetica', lineHeight: 1.4 },
  astralHeader: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', padding: 15, borderRadius: 6, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 15 },
  astralPhotoMock: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#cbd5e1', marginRight: 12, alignItems: 'center', justifyContent: 'center' },
  astralPhotoText: { fontSize: 10, color: '#475569', fontWeight: 'bold' },
  astralName: { fontSize: 16, color: '#0f766e', fontWeight: 'bold' },
  astralTitle: { fontSize: 8.5, color: '#64748b', fontWeight: 'bold', marginTop: 2 },
  astralContactText: { fontSize: 8, color: '#64748b', marginTop: 4 },
  astralColumns: { flexDirection: 'row' },
  astralLeft: { width: '30%', pr: 15 },
  astralRight: { flex: 1, pl: 15 },
  astralSectionTitle: { fontSize: 10, color: '#0f766e', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 15, marginBottom: 6 },
  astralSkillBadge: { backgroundColor: '#f1f5f9', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 3, marginRight: 4, marginBottom: 4, fontSize: 8, color: '#334155' },

  // MONOCHROME
  monoPage: { padding: 45, fontSize: 9.5, color: '#111111', fontFamily: 'Times-Roman', lineHeight: 1.4 },
  monoHeader: { alignItems: 'center', marginBottom: 15 },
  monoName: { fontSize: 20, color: '#000000', fontFamily: 'Times-Bold' },
  monoTitle: { fontSize: 9, fontFamily: 'Times-Italic', color: '#444444', marginTop: 2 },
  monoContactRow: { fontSize: 8.5, color: '#444444', marginTop: 4 },
  monoSectionTitle: { fontSize: 11, fontFamily: 'Times-Bold', textTransform: 'uppercase', borderBottomWidth: 1, borderBottomColor: '#111111', paddingBottom: 2, marginTop: 15, marginBottom: 8 },

  // MODERN BORDER
  borderPage: { padding: 25, fontSize: 9.5, color: '#334155', fontFamily: 'Helvetica', lineHeight: 1.4 },
  borderContainer: { flex: 1, borderWidth: 4, borderColor: '#0f766e', borderRadius: 8, padding: 20 },
  borderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 15 },
  borderNameBadge: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#facc15', alignItems: 'center', justifyContent: 'center' },
  borderNameText: { fontSize: 10, color: '#451a03', fontWeight: 'bold' },
  borderHeaderDetails: { alignItems: 'flex-end' },
  borderName: { fontSize: 16, color: '#1e293b', fontWeight: 'bold', textTransform: 'uppercase' },
  borderContactText: { fontSize: 8, color: '#64748b', marginTop: 2 },
  borderColumns: { flexDirection: 'row', flex: 1 },
  borderLeft: { flex: 2, paddingRight: 15 },
  borderRight: { flex: 1, paddingLeft: 15 },
  borderSectionTitle: { fontSize: 10, color: '#0f766e', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 },
  borderSkillBadge: { backgroundColor: '#0f766e', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 10, marginRight: 4, marginBottom: 4, fontSize: 7.5, color: '#ffffff' },
} as const;

interface CVTemplateProps {
  originalData: CVInput & { style?: string; color?: string };
  enhancedData: CVEnhancedData;
  pdf: any;
}

export const CVPdfTemplate: React.FC<CVTemplateProps> = ({ originalData, enhancedData, pdf }) => {
  const { Document, Page, Text, View, StyleSheet } = pdf;
  
  const selectedStyle = originalData.style || 'celestial';
  const accentColor = originalData.color || '#0f766e';

  // Apply dynamic color accents to the active layout configuration styles
  const dynamicStyles = {
    ...rawStyles,
    celestialSectionTitle: { ...rawStyles.celestialSectionTitle, color: accentColor, borderBottomColor: accentColor },
    galaxySectionTitle: { ...rawStyles.galaxySectionTitle, color: accentColor, borderBottomColor: accentColor },
    astralName: { ...rawStyles.astralName, color: accentColor },
    astralSectionTitle: { ...rawStyles.astralSectionTitle, color: accentColor },
    borderContainer: { ...rawStyles.borderContainer, borderColor: accentColor },
    borderSectionTitle: { ...rawStyles.borderSectionTitle, color: accentColor },
    borderSkillBadge: { ...rawStyles.borderSkillBadge, backgroundColor: accentColor },
    monoSectionTitle: { ...rawStyles.monoSectionTitle, color: accentColor, borderBottomColor: accentColor },
  };

  const styles = StyleSheet.create(dynamicStyles);

  // ───────────────── 1. CELESTIAL STYLE ─────────────────
  if (selectedStyle === 'celestial') {
    return (
      <Document>
        <Page size="A4" style={styles.celestialPage}>
          {/* Left Column */}
          <View style={styles.celestialSidebar}>
            <Text style={styles.celestialName}>{originalData.fullName}</Text>
            <Text style={styles.celestialTitle}>Software Professional</Text>

            <Text style={styles.celestialSectionTitle}>Details</Text>
            <Text style={styles.celestialContactItem}>📧 {originalData.email}</Text>
            {originalData.phone && <Text style={styles.celestialContactItem}>📞 {originalData.phone}</Text>}
            {originalData.location && <Text style={styles.celestialContactItem}>📍 {originalData.location}</Text>}

            {enhancedData.skills && enhancedData.skills.length > 0 && (
              <View>
                <Text style={styles.celestialSectionTitle}>Skills</Text>
                <View style={styles.skillsContainer}>
                  {enhancedData.skills.map((skill, idx) => (
                    <Text key={idx} style={styles.celestialSkillBadge}>{skill}</Text>
                  ))}
                </View>
              </View>
            )}
          </View>

          {/* Right Column */}
          <View style={styles.celestialMain}>
            {enhancedData.summary && (
              <View>
                <Text style={styles.celestialSectionTitle}>Summary</Text>
                <Text style={styles.entryDescription}>{enhancedData.summary}</Text>
              </View>
            )}

            {enhancedData.experience && enhancedData.experience.length > 0 && (
              <View>
                <Text style={styles.celestialSectionTitle}>Experience</Text>
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

            {originalData.education && originalData.education.length > 0 && (
              <View>
                <Text style={styles.celestialSectionTitle}>Education</Text>
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
          </View>
        </Page>
      </Document>
    );
  }

  // ───────────────── 2. GALAXY STYLE ─────────────────
  if (selectedStyle === 'galaxy') {
    return (
      <Document>
        <Page size="A4" style={styles.galaxyPage}>
          <View style={styles.galaxyHeader}>
            <Text style={styles.galaxyName}>{originalData.fullName}</Text>
            <View style={styles.galaxyDivider} />
            <Text style={styles.galaxyTitle}>Specialist Analyst</Text>
            <View style={styles.galaxyDivider} />
            <View style={styles.galaxyContactRow}>
              <Text style={styles.galaxyContactItem}>{originalData.email}</Text>
              {originalData.phone && <Text style={styles.galaxyContactItem}>·  {originalData.phone}</Text>}
              {originalData.location && <Text style={styles.galaxyContactItem}>·  {originalData.location}</Text>}
            </View>
          </View>

          {enhancedData.summary && (
            <View>
              <Text style={styles.galaxySectionTitle}>Professional Summary</Text>
              <Text style={styles.entryDescription}>{enhancedData.summary}</Text>
            </View>
          )}

          {enhancedData.experience && enhancedData.experience.length > 0 && (
            <View>
              <Text style={styles.galaxySectionTitle}>Work History</Text>
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

          {originalData.education && originalData.education.length > 0 && (
            <View>
              <Text style={styles.galaxySectionTitle}>Education</Text>
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
        </Page>
      </Document>
    );
  }

  // ───────────────── 3. ASTRAL STYLE ─────────────────
  if (selectedStyle === 'astral') {
    return (
      <Document>
        <Page size="A4" style={styles.astralPage}>
          <View style={styles.astralHeader}>
            <View style={styles.astralPhotoMock}>
              <Text style={styles.astralPhotoText}>AR</Text>
            </View>
            <View>
              <Text style={styles.astralName}>{originalData.fullName}</Text>
              <Text style={styles.astralTitle}>Creative Specialist</Text>
              <Text style={styles.astralContactText}>{originalData.email}  |  {originalData.phone}  |  {originalData.location}</Text>
            </View>
          </View>

          <View style={styles.astralColumns}>
            {/* Left side details */}
            <View style={styles.astralLeft}>
              {enhancedData.skills && enhancedData.skills.length > 0 && (
                <View>
                  <Text style={styles.astralSectionTitle}>Skills</Text>
                  <View style={styles.skillsContainer}>
                    {enhancedData.skills.map((skill, idx) => (
                      <Text key={idx} style={styles.astralSkillBadge}>{skill}</Text>
                    ))}
                  </View>
                </View>
              )}
            </View>

            {/* Right side body */}
            <View style={styles.astralRight}>
              {enhancedData.summary && (
                <View>
                  <Text style={styles.astralSectionTitle}>Summary</Text>
                  <Text style={styles.entryDescription}>{enhancedData.summary}</Text>
                </View>
              )}

              {enhancedData.experience && enhancedData.experience.length > 0 && (
                <View>
                  <Text style={styles.astralSectionTitle}>Experience</Text>
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
            </View>
          </View>
        </Page>
      </Document>
    );
  }

  // ───────────────── 4. MONOCHROME STYLE ─────────────────
  if (selectedStyle === 'monochrome') {
    return (
      <Document>
        <Page size="A4" style={styles.monoPage}>
          <View style={styles.monoHeader}>
            <Text style={styles.monoName}>{originalData.fullName}</Text>
            <Text style={styles.monoTitle}>Academic Scholar & Researcher</Text>
            <Text style={styles.monoContactRow}>{originalData.email} | {originalData.phone} | {originalData.location}</Text>
          </View>

          {enhancedData.summary && (
            <View>
              <Text style={styles.monoSectionTitle}>Abstract</Text>
              <Text style={{ fontSize: 9.5, lineHeight: 1.4 }}>{enhancedData.summary}</Text>
            </View>
          )}

          {enhancedData.experience && enhancedData.experience.length > 0 && (
            <View>
              <Text style={styles.monoSectionTitle}>Experience & Appointments</Text>
              {enhancedData.experience.map((exp, idx) => (
                <View key={idx} style={styles.entry}>
                  <View style={styles.entryHeader}>
                    <Text style={{ fontFamily: 'Times-Bold' }}>{exp.title}</Text>
                    <Text style={{ fontFamily: 'Times-Bold' }}>{exp.company}</Text>
                  </View>
                  <View style={styles.entrySub}>
                    <Text>{exp.startDate} - {exp.endDate || 'Present'}</Text>
                  </View>
                  {exp.description && (
                    <Text style={{ fontSize: 9, color: '#333333' }}>{exp.description}</Text>
                  )}
                </View>
              ))}
            </View>
          )}
        </Page>
      </Document>
    );
  }

  // ───────────────── 5. MODERN BORDER STYLE ─────────────────
  return (
    <Document>
      <Page size="A4" style={styles.borderPage}>
        <View style={styles.borderContainer}>
          <View style={styles.borderHeader}>
            <View style={styles.borderNameBadge}>
              <Text style={styles.borderNameText}>AR</Text>
            </View>
            <View style={styles.borderHeaderDetails}>
              <Text style={styles.borderName}>{originalData.fullName}</Text>
              <Text style={styles.borderContactText}>{originalData.email} · {originalData.location}</Text>
            </View>
          </View>

          <View style={styles.borderColumns}>
            <View style={styles.borderLeft}>
              {enhancedData.summary && (
                <View>
                  <Text style={styles.borderSectionTitle}>Objective</Text>
                  <Text style={styles.entryDescription}>{enhancedData.summary}</Text>
                </View>
              )}

              {enhancedData.experience && enhancedData.experience.length > 0 && (
                <View>
                  <Text style={styles.borderSectionTitle}>Timeline</Text>
                  {enhancedData.experience.map((exp, idx) => (
                    <View key={idx} style={styles.entry}>
                      <View style={styles.entryHeader}>
                        <Text style={{ fontWeight: 'bold' }}>{exp.title}</Text>
                        <Text>{exp.startDate}</Text>
                      </View>
                      {exp.description && (
                        <Text style={styles.entryDescription}>{exp.description}</Text>
                      )}
                    </View>
                  ))}
                </View>
              )}
            </View>

            <View style={styles.borderRight}>
              {enhancedData.skills && enhancedData.skills.length > 0 && (
                <View>
                  <Text style={styles.borderSectionTitle}>Skills</Text>
                  <View style={styles.skillsContainer}>
                    {enhancedData.skills.map((skill, idx) => (
                      <Text key={idx} style={styles.borderSkillBadge}>{skill}</Text>
                    ))}
                  </View>
                </View>
              )}
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
};
