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

  // MERIDIAN — Two-column with gray sidebar (Jonathan Patterson style)
  meridianPage: { flexDirection: 'row', fontSize: 9.5, color: '#2d2d2d', fontFamily: 'Helvetica', lineHeight: 1.45 },
  meridianSidebar: { width: '32%', backgroundColor: '#f4f4f4', padding: 22, flexDirection: 'column' },
  meridianMain: { flex: 1, padding: 28, flexDirection: 'column' },
  meridianNameBlock: { marginBottom: 18 },
  meridianName: { fontSize: 20, color: '#1a1a1a', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 2 },
  meridianJobTitle: { fontSize: 9, color: '#555555', letterSpacing: 1.5, marginTop: 3 },
  meridianSideSection: { marginTop: 16 },
  meridianSideTitle: { fontSize: 8, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1.5, color: '#555555', borderBottomWidth: 0.5, borderBottomColor: '#cccccc', paddingBottom: 3, marginBottom: 8 },
  meridianContactItem: { fontSize: 8, color: '#444444', marginBottom: 5, flexDirection: 'row', alignItems: 'center' },
  meridianSkillItem: { fontSize: 8.5, color: '#333333', marginBottom: 4 },
  meridianEduDegree: { fontSize: 8.5, color: '#1a1a1a', fontWeight: 'bold' },
  meridianEduSchool: { fontSize: 8.5, color: '#1a1a1a', marginTop: 1 },
  meridianEduDate: { fontSize: 7.5, color: '#777777', marginTop: 1, marginBottom: 6 },
  meridianMainSection: { marginBottom: 16 },
  meridianMainTitle: { fontSize: 9, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1.5, color: '#444444', borderBottomWidth: 0.5, borderBottomColor: '#cccccc', paddingBottom: 3, marginBottom: 10 },
  meridianProfile: { fontSize: 9, color: '#444444', lineHeight: 1.5 },
  meridianExpTitle: { fontSize: 9.5, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 1 },
  meridianExpCompany: { fontSize: 8.5, color: '#555555' },
  meridianExpDate: { fontSize: 8, color: '#888888', marginTop: 1, marginBottom: 3 },
  meridianExpDesc: { fontSize: 8.5, color: '#444444', lineHeight: 1.4 },
  meridianBullet: { fontSize: 8.5, color: '#444444', marginBottom: 2 },
  meridianLangItem: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  meridianLangName: { fontSize: 8.5, color: '#333333' },
  meridianLangBar: { width: 60, height: 4, backgroundColor: '#dddddd', borderRadius: 2, marginTop: 2 },
  meridianLangFill: { height: 4, backgroundColor: '#333333', borderRadius: 2 },

  // CHRONICLE — Classic single-column professional (Charles Bloomberg style)
  chroniclePage: { padding: 45, fontSize: 9.5, color: '#1a1a1a', fontFamily: 'Helvetica', lineHeight: 1.4 },
  chronicleHeader: { alignItems: 'center', marginBottom: 6 },
  chronicleName: { fontSize: 22, color: '#1a1a1a', fontWeight: 'bold' },
  chronicleContactRow: { fontSize: 8.5, color: '#444444', marginTop: 4, textAlign: 'center' },
  chronicleRule: { height: 0.75, backgroundColor: '#888888', marginVertical: 10 },
  chronicleSectionTitle: { fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1, textAlign: 'center', marginBottom: 8 },
  chronicleExpRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 1 },
  chronicleExpCompany: { fontSize: 9.5, fontWeight: 'bold', color: '#1a1a1a' },
  chronicleExpLocation: { fontSize: 9, color: '#444444' },
  chronicleExpTitle: { fontSize: 9, color: '#1a1a1a', fontWeight: 'bold' },
  chronicleExpDate: { fontSize: 8.5, color: '#444444' },
  chronicleBullet: { fontSize: 8.5, color: '#333333', marginBottom: 2, marginLeft: 8 },
  chronicleEntry: { marginBottom: 10 },
  chronicleSkillsLabel: { fontSize: 9, fontWeight: 'bold', marginRight: 4 },
  chronicleSkillsText: { fontSize: 9, color: '#333333' },
  chronicleSkillsRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 3 },

  // DEFAULT — Adebayo Ajayi Style (Ruled centered blue dividers, single-column)
  defaultPage: { padding: 40, fontSize: 9.5, color: '#111111', fontFamily: 'Helvetica', lineHeight: 1.45 },
  defaultHeader: { alignItems: 'center', marginBottom: 8, width: '100%' },
  defaultName: { fontSize: 24, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  defaultContactRow: { fontSize: 8.5, color: '#111111', marginVertical: 3, textAlign: 'center', fontFamily: 'Helvetica' },
  defaultRule: { height: 1.0, backgroundColor: '#0066cc', width: '100%', marginVertical: 4 },
  defaultSectionHeaderContainer: { marginTop: 16, marginBottom: 8, width: '100%' },
  defaultSectionTitleLine: { width: '100%', height: 1.0, backgroundColor: '#0066cc' },
  defaultSectionTitleText: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: '#0066cc', textAlign: 'center', marginBottom: 3 },
  defaultEntry: { marginBottom: 12 },
  defaultEntryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 2 },
  defaultEntryTitle: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#111111' },
  defaultEntryDate: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#111111' },
  defaultEntrySubHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 },
  defaultEntryCompany: { fontSize: 9.5, fontFamily: 'Helvetica-Bold', color: '#111111' },
  defaultEntryLocation: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#111111' },
  defaultBulletRow: { flexDirection: 'row', alignItems: 'flex-start', marginLeft: 8, marginBottom: 2 },
  defaultBulletPoint: { fontSize: 9, color: '#111111', marginRight: 5 },
  defaultBulletText: { flex: 1, fontSize: 9, color: '#222222', lineHeight: 1.4 },
  defaultSkillsGrid: { flexDirection: 'row', justifyContent: 'space-between', gap: 20, marginTop: 4 },
  defaultSkillsCol: { flex: 1 },
  defaultSkillsBulletRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 3 },
  defaultSkillsBulletPoint: { fontSize: 9, color: '#111111', marginRight: 5 },
  defaultSkillsText: { fontSize: 9, color: '#222222' },
  defaultSimpleText: { fontSize: 9.5, color: '#222222', lineHeight: 1.5 },
} as const;


interface CVTemplateProps {
  originalData: CVInput & { style?: string; color?: string };
  enhancedData: CVEnhancedData;
  pdf: any;
}

export const CVPdfTemplate: React.FC<CVTemplateProps> = ({ originalData, enhancedData, pdf }) => {
  const { Document, Page, Text, View, StyleSheet } = pdf;
  
  const selectedStyle = originalData.style || 'default';
  const accentColor = originalData.color || '#0066cc';

  const initials = (originalData.fullName || 'CV')
    .trim()
    .split(/\s+/)
    .map((w: string) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

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
    defaultName: { ...rawStyles.defaultName, color: accentColor },
    defaultSectionTitleText: { ...rawStyles.defaultSectionTitleText, color: accentColor },
    defaultSectionTitleLine: { ...rawStyles.defaultSectionTitleLine, backgroundColor: accentColor },
  };

  const styles = StyleSheet.create(dynamicStyles);

  // ───────────────── 1. CELESTIAL STYLE ─────────────────
  if (selectedStyle === 'celestial' || selectedStyle === 'nova') {
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
              <Text style={styles.astralPhotoText}>{initials}</Text>
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
  if (selectedStyle === 'monochrome' || selectedStyle === 'slate') {
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
  if (selectedStyle === 'border' || selectedStyle === 'aurora' || selectedStyle === 'prism') {
    return (
      <Document>
        <Page size="A4" style={styles.borderPage}>
          <View style={styles.borderContainer}>
            <View style={styles.borderHeader}>
              <View style={styles.borderNameBadge}>
                <Text style={styles.borderNameText}>{initials}</Text>
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
  }

  // ───────────────── 6. MERIDIAN STYLE — Two-column gray sidebar ─────────────────
  if (selectedStyle === 'meridian' || selectedStyle === 'blueprint') {
    const initials = (originalData.fullName || 'JD').split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);
    return (
      <Document>
        <Page size="A4" style={styles.meridianPage}>
          {/* Left Sidebar */}
          <View style={styles.meridianSidebar}>
            <View style={styles.meridianNameBlock}>
              <Text style={styles.meridianName}>{originalData.fullName}</Text>
              <Text style={styles.meridianJobTitle}>{originalData.summary ? originalData.summary.split(' ').slice(0, 4).join(' ') + '…' : 'Professional'}</Text>
            </View>

            {/* Contact */}
            <View style={styles.meridianSideSection}>
              <Text style={styles.meridianSideTitle}>Contact</Text>
              <Text style={styles.meridianContactItem}>{originalData.phone || ''}</Text>
              <Text style={styles.meridianContactItem}>{originalData.email}</Text>
              {originalData.location && <Text style={styles.meridianContactItem}>{originalData.location}</Text>}
            </View>

            {/* Skills */}
            {enhancedData.skills && enhancedData.skills.length > 0 && (
              <View style={styles.meridianSideSection}>
                <Text style={styles.meridianSideTitle}>Skills</Text>
                {enhancedData.skills.map((skill, idx) => (
                  <Text key={idx} style={styles.meridianSkillItem}>• {skill}</Text>
                ))}
              </View>
            )}

            {/* Education */}
            {originalData.education && originalData.education.length > 0 && (
              <View style={styles.meridianSideSection}>
                <Text style={styles.meridianSideTitle}>Education</Text>
                {originalData.education.map((edu, idx) => (
                  <View key={idx} style={{ marginBottom: 8 }}>
                    <Text style={styles.meridianEduDegree}>{edu.degree || ''}{edu.field ? ` in ${edu.field}` : ''}</Text>
                    <Text style={styles.meridianEduSchool}>{edu.school}</Text>
                    <Text style={styles.meridianEduDate}>{edu.startDate} – {edu.endDate || 'Present'}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Right Main Body */}
          <View style={styles.meridianMain}>
            {/* Profile */}
            {enhancedData.summary && (
              <View style={styles.meridianMainSection}>
                <Text style={styles.meridianMainTitle}>Profile</Text>
                <Text style={styles.meridianProfile}>{enhancedData.summary}</Text>
              </View>
            )}

            {/* Work Experience */}
            {enhancedData.experience && enhancedData.experience.length > 0 && (
              <View style={styles.meridianMainSection}>
                <Text style={styles.meridianMainTitle}>Work Experience</Text>
                {enhancedData.experience.map((exp, idx) => (
                  <View key={idx} style={{ marginBottom: 10 }}>
                    <Text style={styles.meridianExpTitle}>{exp.title}</Text>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={styles.meridianExpCompany}>{exp.company}</Text>
                      <Text style={styles.meridianExpDate}>{exp.startDate} – {exp.endDate || 'Present'}</Text>
                    </View>
                    {exp.description && (
                      <Text style={styles.meridianExpDesc}>{exp.description}</Text>
                    )}
                  </View>
                ))}
              </View>
            )}
          </View>
        </Page>
      </Document>
    );
  }

  // ───────────────── 7. CHRONICLE STYLE — Classic single-column professional ─────────────────
  if (selectedStyle === 'chronicle' || selectedStyle === 'executive') {
    return (
      <Document>
        <Page size="A4" style={styles.chroniclePage}>
          {/* Header */}
          <View style={styles.chronicleHeader}>
            <Text style={styles.chronicleName}>{originalData.fullName}</Text>
            <Text style={styles.chronicleContactRow}>
              {[originalData.location, originalData.email, originalData.phone].filter(Boolean).join('  •  ')}
            </Text>
          </View>

          <View style={styles.chronicleRule} />

          {/* Professional Summary */}
          {enhancedData.summary && (
            <View style={{ marginBottom: 12 }}>
              <Text style={styles.chronicleSectionTitle}>Professional Summary</Text>
              <Text style={{ fontSize: 9, color: '#333333', lineHeight: 1.5 }}>{enhancedData.summary}</Text>
              <View style={styles.chronicleRule} />
            </View>
          )}

          {/* Professional Experience */}
          {enhancedData.experience && enhancedData.experience.length > 0 && (
            <View style={{ marginBottom: 12 }}>
              <Text style={styles.chronicleSectionTitle}>Professional Experience</Text>
              {enhancedData.experience.map((exp, idx) => (
                <View key={idx} style={styles.chronicleEntry}>
                  <View style={styles.chronicleExpRow}>
                    <Text style={styles.chronicleExpCompany}>{exp.company}</Text>
                    <Text style={styles.chronicleExpLocation}>{originalData.location || ''}</Text>
                  </View>
                  <View style={styles.chronicleExpRow}>
                    <Text style={styles.chronicleExpTitle}>{exp.title}</Text>
                    <Text style={styles.chronicleExpDate}>{exp.startDate} — {exp.endDate || 'Present'}</Text>
                  </View>
                  {exp.description && exp.description.split('. ').filter(Boolean).map((point, i) => (
                    <Text key={i} style={styles.chronicleBullet}>• {point.trim()}</Text>
                  ))}
                </View>
              ))}
              <View style={styles.chronicleRule} />
            </View>
          )}

          {/* Education */}
          {originalData.education && originalData.education.length > 0 && (
            <View style={{ marginBottom: 12 }}>
              <Text style={styles.chronicleSectionTitle}>Education</Text>
              {originalData.education.map((edu, idx) => (
                <View key={idx} style={styles.chronicleEntry}>
                  <View style={styles.chronicleExpRow}>
                    <Text style={{ fontSize: 9.5, fontWeight: 'bold' }}>{edu.degree ? `${edu.degree} in ${edu.field || ''}` : edu.school}</Text>
                    <Text style={styles.chronicleExpDate}>{edu.startDate} – {edu.endDate || 'Present'}</Text>
                  </View>
                  {edu.degree && <Text style={{ fontSize: 9, color: '#444444' }}>{edu.school}</Text>}
                </View>
              ))}
              <View style={styles.chronicleRule} />
            </View>
          )}

          {/* Skills */}
          {enhancedData.skills && enhancedData.skills.length > 0 && (
            <View>
              <Text style={styles.chronicleSectionTitle}>Expert-Level Skills</Text>
              <View style={styles.chronicleSkillsRow}>
                <Text style={styles.chronicleSkillsLabel}>Core Skills:</Text>
                <Text style={styles.chronicleSkillsText}>{enhancedData.skills.join('  •  ')}</Text>
              </View>
            </View>
          )}
        </Page>
      </Document>
    );
  }

  // ───────────────── DEFAULT FALLBACK (Adebayo Ajayi layout design) ─────────────────
  const contactText = [originalData.email, originalData.phone, originalData.location].filter(Boolean).join('  |  ');
  const half = Math.ceil((enhancedData.skills || []).length / 2);
  const skillsCol1 = (enhancedData.skills || []).slice(0, half);
  const skillsCol2 = (enhancedData.skills || []).slice(half);

  return (
    <Document>
      <Page size="A4" style={styles.defaultPage}>
        {/* Header */}
        <View style={styles.defaultHeader}>
          <Text style={styles.defaultName}>{originalData.fullName}</Text>
          <View style={styles.defaultRule} />
          {contactText ? <Text style={styles.defaultContactRow}>{contactText}</Text> : null}
          <View style={styles.defaultRule} />
        </View>

        {/* Summary Section */}
        {enhancedData.summary && (
          <View>
            <View style={styles.defaultSectionHeaderContainer}>
              <Text style={styles.defaultSectionTitleText}>Summary</Text>
              <View style={styles.defaultSectionTitleLine} />
            </View>
            <Text style={styles.defaultSimpleText}>{enhancedData.summary}</Text>
          </View>
        )}

        {/* Experience Section */}
        {enhancedData.experience && enhancedData.experience.length > 0 && (
          <View>
            <View style={styles.defaultSectionHeaderContainer}>
              <Text style={styles.defaultSectionTitleText}>Experience</Text>
              <View style={styles.defaultSectionTitleLine} />
            </View>
            {enhancedData.experience.map((exp, idx) => (
              <View key={idx} style={styles.defaultEntry}>
                <View style={styles.defaultEntryHeader}>
                  <Text style={styles.defaultEntryTitle}>{exp.title}</Text>
                  <Text style={styles.defaultEntryDate}>{exp.startDate} to {exp.endDate || 'Current'}</Text>
                </View>
                <View style={styles.defaultEntrySubHeader}>
                  <Text style={styles.defaultEntryCompany}>{exp.company}</Text>
                  <Text style={styles.defaultEntryLocation}>{originalData.location || ''}</Text>
                </View>
                {exp.description && exp.description.split('\n').map((line, pIdx) => {
                  const cleanLine = line.replace(/^[•●*-]\s*/, '').trim();
                  if (!cleanLine) return null;
                  return (
                    <View key={pIdx} style={styles.defaultBulletRow}>
                      <Text style={styles.defaultBulletPoint}>•</Text>
                      <Text style={styles.defaultBulletText}>{cleanLine}</Text>
                    </View>
                  );
                })}
              </View>
            ))}
          </View>
        )}

        {/* Skills Section */}
        {enhancedData.skills && enhancedData.skills.length > 0 && (
          <View>
            <View style={styles.defaultSectionHeaderContainer}>
              <Text style={styles.defaultSectionTitleText}>Skills</Text>
              <View style={styles.defaultSectionTitleLine} />
            </View>
            <View style={styles.defaultSkillsGrid}>
              <View style={styles.defaultSkillsCol}>
                {skillsCol1.map((skill, idx) => (
                  <View key={idx} style={styles.defaultSkillsBulletRow}>
                    <Text style={styles.defaultSkillsBulletPoint}>•</Text>
                    <Text style={styles.defaultSkillsText}>{skill}</Text>
                  </View>
                ))}
              </View>
              <View style={styles.defaultSkillsCol}>
                {skillsCol2.map((skill, idx) => (
                  <View key={idx} style={styles.defaultSkillsBulletRow}>
                    <Text style={styles.defaultSkillsBulletPoint}>•</Text>
                    <Text style={styles.defaultSkillsText}>{skill}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* Education Section */}
        {originalData.education && originalData.education.length > 0 && (
          <View>
            <View style={styles.defaultSectionHeaderContainer}>
              <Text style={styles.defaultSectionTitleText}>Education</Text>
              <View style={styles.defaultSectionTitleLine} />
            </View>
            {originalData.education.map((edu, idx) => (
              <View key={idx} style={styles.defaultEntry}>
                <View style={styles.defaultEntryHeader}>
                  <Text style={styles.defaultEntryTitle}>
                    {[edu.degree, edu.field].filter(Boolean).join(': ')}
                  </Text>
                  <Text style={styles.defaultEntryDate}>{edu.startDate} – {edu.endDate || 'Present'}</Text>
                </View>
                <View style={styles.defaultEntrySubHeader}>
                  <Text style={styles.defaultEntryCompany}>{edu.school}</Text>
                  <Text style={styles.defaultEntryLocation}>{originalData.location || ''}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* References Section */}
        <View>
          <View style={styles.defaultSectionHeaderContainer}>
            <Text style={styles.defaultSectionTitleText}>References</Text>
            <View style={styles.defaultSectionTitleLine} />
          </View>
          <Text style={{ fontSize: 9.5, fontFamily: 'Helvetica-Bold', color: '#111111', marginTop: 10 }}>
            REFERENCES - AVAILABLE ON REQUEST
          </Text>
        </View>
      </Page>
    </Document>
  );
};

