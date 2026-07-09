import { Document, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle, TabStopType, TabStopPosition } from 'docx';
import { CVInput, CVEnhancedData } from '../../document-generator.types';

// Helper to create left-aligned or centered headers with borders
function createSectionTitle(title: string, font: string, color: string, align: any): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 200, after: 100 },
    alignment: align,
    border: {
      bottom: {
        color: color,
        space: 6,
        style: BorderStyle.SINGLE,
        size: 6,
      },
    },
    children: [
      new TextRun({
        text: title,
        bold: true,
        size: 25, // 12.5pt
        color: color,
        font: font,
      }),
    ],
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. DEFAULT STYLE (John Doe centered blue layout design)
// ─────────────────────────────────────────────────────────────────────────────
function generateDefaultDocx(originalData: CVInput, enhancedData: CVEnhancedData): Document {
  const children: any[] = [];
  const printableWidth = 10466; // 11906 (A4 width) - 2 * 720 (0.5 inch margins)
  const font = 'Arial';
  const accentColor = '0066CC';

  // Header Block
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 60 },
      children: [
        new TextRun({
          text: (originalData.fullName || 'Your Name').toUpperCase(),
          bold: true,
          size: 42, // 21pt
          color: accentColor,
          font: font,
        }),
      ],
    })
  );

  // Twin rules around contact details
  children.push(
    new Paragraph({
      border: {
        bottom: {
          color: accentColor,
          space: 4,
          style: BorderStyle.SINGLE,
          size: 6,
        },
      },
    })
  );

  const contactText = [
    originalData.location,
    originalData.phone,
    originalData.email,
  ].filter(Boolean).join(' | ');

  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 80, after: 80 },
      children: [
        new TextRun({
          text: contactText,
          size: 20, // 10pt
          color: '111111',
          font: font,
        }),
      ],
    })
  );

  children.push(
    new Paragraph({
      border: {
        bottom: {
          color: accentColor,
          space: 4,
          style: BorderStyle.SINGLE,
          size: 6,
        },
      },
      spacing: { after: 120 },
    })
  );

  // 1. Summary
  if (enhancedData?.summary || originalData.summary) {
    children.push(createSectionTitle('Summary', font, accentColor, AlignmentType.CENTER));
    children.push(
      new Paragraph({
        spacing: { after: 120 },
        children: [
          new TextRun({
            text: enhancedData?.summary || originalData.summary,
            size: 21, // 10.5pt
            color: '111111',
            font: font,
          }),
        ],
      })
    );
  }

  // 2. Experience
  const expList = enhancedData?.experience || originalData.experience;
  if (expList && expList.length > 0) {
    children.push(createSectionTitle('Experience', font, accentColor, AlignmentType.CENTER));
    for (const exp of expList) {
      children.push(
        new Paragraph({
          tabStops: [
            {
              type: TabStopType.RIGHT,
              position: printableWidth,
            },
          ],
          spacing: { before: 100, after: 40 },
          children: [
            new TextRun({
              text: exp.title,
              bold: true,
              size: 22, // 11pt
              font: font,
              color: '111111',
            }),
            new TextRun({
              text: `\t${exp.startDate} to ${exp.endDate || 'Current'}`,
              bold: true,
              size: 22,
              font: font,
              color: '111111',
            }),
          ],
        })
      );

      children.push(
        new Paragraph({
          tabStops: [
            {
              type: TabStopType.RIGHT,
              position: printableWidth,
            },
          ],
          spacing: { after: 80 },
          children: [
            new TextRun({
              text: exp.company,
              size: 21, // 10.5pt
              font: font,
              color: '333333',
            }),
            new TextRun({
              text: originalData.location ? `\t${originalData.location}` : '',
              size: 21,
              font: font,
              color: '333333',
            }),
          ],
        })
      );

      if (exp.description) {
        const bullets = exp.description.split('\n').map(b => b.replace(/^[•●*-]\s*/, '').trim()).filter(Boolean);
        for (const bullet of bullets) {
          children.push(
            new Paragraph({
              spacing: { before: 0, after: 0, line: 240 },
              indent: { left: 360, hanging: 180 },
              children: [
                new TextRun({
                  text: '●  ',
                  size: 21,
                  font: font,
                  color: '111111',
                }),
                new TextRun({
                  text: bullet,
                  size: 21,
                  font: font,
                  color: '222222',
                }),
              ],
            })
          );
        }
      }
    }
  }

  // 3. Skills (two-column layout)
  const skillsList = enhancedData?.skills || originalData.skills;
  if (skillsList && skillsList.length > 0) {
    children.push(createSectionTitle('Skills', font, accentColor, AlignmentType.CENTER));
    const halfSkills = Math.ceil(skillsList.length / 2);
    const skillsCol1 = skillsList.slice(0, halfSkills);
    const skillsCol2 = skillsList.slice(halfSkills);
    const maxLen = Math.max(skillsCol1.length, skillsCol2.length);
    for (let i = 0; i < maxLen; i++) {
      const leftSkill = skillsCol1[i];
      const rightSkill = skillsCol2[i];
      children.push(
        new Paragraph({
          tabStops: [{ type: TabStopType.LEFT, position: Math.floor(printableWidth / 2) }],
          spacing: { before: 0, after: 0, line: 240 },
          children: [
            ...(leftSkill
              ? [
                  new TextRun({ text: '●  ', size: 21, font: font, color: '111111' }),
                  new TextRun({ text: leftSkill, size: 21, font: font, color: '222222' }),
                ]
              : []),
            ...(rightSkill
              ? [
                  new TextRun({ text: '\t●  ', size: 21, font: font, color: '111111' }),
                  new TextRun({ text: rightSkill, size: 21, font: font, color: '222222' }),
                ]
              : []),
          ],
        })
      );
    }
  }

  // 4. Accomplishments
  const projects = (originalData as any).projects || [];
  if (projects && projects.length > 0) {
    children.push(createSectionTitle('Accomplishments', font, accentColor, AlignmentType.CENTER));
    for (const p of projects) {
      const pDesc = p.description || '';
      children.push(
        new Paragraph({
          spacing: { before: 0, after: 0, line: 240 },
          indent: { left: 360, hanging: 180 },
          children: [
            new TextRun({
              text: '●  ',
              size: 21,
              font: font,
              color: '111111',
            }),
            new TextRun({
              text: p.name || pDesc,
              size: 21,
              font: font,
              color: '222222',
              bold: true,
            }),
          ],
        })
      );
    }
  }

  // 5. Education
  if (originalData.education && originalData.education.length > 0) {
    children.push(createSectionTitle('Education', font, accentColor, AlignmentType.CENTER));
    for (const edu of originalData.education) {
      const degreeText = [edu.degree, edu.field].filter(Boolean).join(': ').toUpperCase();
      const dateText = edu.endDate ? `${edu.startDate}/${edu.endDate}` : edu.startDate;
      children.push(
        new Paragraph({
          tabStops: [
            {
              type: TabStopType.RIGHT,
              position: printableWidth,
            },
          ],
          spacing: { before: 100, after: 40 },
          children: [
            new TextRun({
              text: degreeText || edu.school,
              bold: true,
              size: 22,
              font: font,
              color: '111111',
            }),
            new TextRun({
              text: `\t${dateText}`,
              bold: true,
              size: 22,
              font: font,
              color: '111111',
            }),
          ],
        })
      );

      if (degreeText) {
        children.push(
          new Paragraph({
            tabStops: [
              {
                type: TabStopType.RIGHT,
                position: printableWidth,
              },
            ],
            spacing: { after: 80 },
            children: [
              new TextRun({
                text: edu.school,
                size: 21,
                font: font,
                color: '333333',
              }),
              new TextRun({
                text: originalData.location ? `\t${originalData.location}` : '',
                size: 21,
                font: font,
                color: '333333',
              }),
            ],
          })
        );
      }
    }
  }

  // 6. References
  children.push(createSectionTitle('References', font, accentColor, AlignmentType.CENTER));
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 80, after: 120 },
      children: [
        new TextRun({
          text: 'REFERENCES - AVAILABLE ON REQUEST',
          bold: true,
          size: 21,
          color: '111111',
          font: font,
        }),
      ],
    })
  );

  // 7. Certifications
  const certifications = (originalData as any).certifications || [];
  if (certifications && certifications.length > 0) {
    children.push(createSectionTitle('Certifications', font, accentColor, AlignmentType.CENTER));
    for (const cert of certifications) {
      children.push(
        new Paragraph({
          spacing: { before: 0, after: 0, line: 240 },
          indent: { left: 360, hanging: 180 },
          children: [
            new TextRun({
              text: '●  ',
              size: 21,
              font: font,
              color: '111111',
            }),
            new TextRun({
              text: `${cert.name}${cert.issuer ? `. ${cert.issuer}` : ''}`,
              size: 21,
              font: font,
              color: '222222',
            }),
          ],
        })
      );
    }
  }

  return new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 720, bottom: 720, left: 720, right: 720 },
            size: { width: 11906, height: 16838 },
          },
        },
        children,
      },
    ],
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. EXECUTIVE / CHRONICLE STYLE (Times New Roman elegant serif design)
// ─────────────────────────────────────────────────────────────────────────────
function generateExecutiveDocx(originalData: CVInput, enhancedData: CVEnhancedData): Document {
  const children: any[] = [];
  const printableWidth = 9602; // 11906 (A4 width) - 2 * 1152 (0.8 inch margins)
  const font = 'Times New Roman';
  const colorDark = '1A1A1A';

  // Centered Header Name
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 60 },
      children: [
        new TextRun({
          text: (originalData.fullName || 'Your Name').toUpperCase(),
          bold: true,
          size: 38, // 19pt
          color: colorDark,
          font: font,
        }),
      ],
    })
  );

  const contactText = [
    originalData.location,
    originalData.phone,
    originalData.email,
  ].filter(Boolean).join('   •   ');

  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 40, after: 180 },
      children: [
        new TextRun({
          text: contactText,
          size: 19, // 9.5pt
          color: '444444',
          font: font,
        }),
      ],
    })
  );

  // Thin black rule divider
  children.push(
    new Paragraph({
      border: {
        bottom: {
          color: '333333',
          space: 4,
          style: BorderStyle.SINGLE,
          size: 6,
        },
      },
      spacing: { after: 180 },
    })
  );

  // Summary
  if (enhancedData?.summary || originalData.summary) {
    children.push(createSectionTitle('Summary', font, colorDark, AlignmentType.LEFT));
    children.push(
      new Paragraph({
        spacing: { after: 160 },
        children: [
          new TextRun({
            text: enhancedData?.summary || originalData.summary,
            size: 21, // 10.5pt
            color: '222222',
            font: font,
          }),
        ],
      })
    );
  }

  // Experience
  const expList = enhancedData?.experience || originalData.experience;
  if (expList && expList.length > 0) {
    children.push(createSectionTitle('Experience', font, colorDark, AlignmentType.LEFT));
    for (const exp of expList) {
      children.push(
        new Paragraph({
          tabStops: [
            {
              type: TabStopType.RIGHT,
              position: printableWidth,
            },
          ],
          spacing: { before: 120, after: 40 },
          children: [
            new TextRun({
              text: exp.title,
              bold: true,
              size: 21, // 10.5pt
              font: font,
              color: colorDark,
            }),
            new TextRun({
              text: `\t${exp.startDate} – ${exp.endDate || 'Present'}`,
              bold: true,
              size: 21,
              font: font,
              color: colorDark,
            }),
          ],
        })
      );

      children.push(
        new Paragraph({
          tabStops: [
            {
              type: TabStopType.RIGHT,
              position: printableWidth,
            },
          ],
          spacing: { after: 80 },
          children: [
            new TextRun({
              text: exp.company,
              italics: true,
              size: 20, // 10pt
              font: font,
              color: '444444',
            }),
            new TextRun({
              text: originalData.location ? `\t${originalData.location}` : '',
              size: 20,
              font: font,
              color: '444444',
            }),
          ],
        })
      );

      if (exp.description) {
        const bullets = exp.description.split('\n').map(b => b.replace(/^[•●*-]\s*/, '').trim()).filter(Boolean);
        for (const bullet of bullets) {
          children.push(
            new Paragraph({
              spacing: { before: 0, after: 0, line: 240 },
              indent: { left: 240, hanging: 120 },
              children: [
                new TextRun({
                  text: '•  ',
                  size: 20,
                  font: font,
                  color: '333333',
                }),
                new TextRun({
                  text: bullet,
                  size: 20,
                  font: font,
                  color: '333333',
                }),
              ],
            })
          );
        }
      }
    }
  }

  // Skills
  const skillsList = enhancedData?.skills || originalData.skills;
  if (skillsList && skillsList.length > 0) {
    children.push(createSectionTitle('Skills', font, colorDark, AlignmentType.LEFT));
    children.push(
      new Paragraph({
        spacing: { after: 120 },
        children: [
          new TextRun({
            text: skillsList.join(', '),
            size: 21,
            font: font,
            color: '222222',
          }),
        ],
      })
    );
  }

  // Education
  if (originalData.education && originalData.education.length > 0) {
    children.push(createSectionTitle('Education', font, colorDark, AlignmentType.LEFT));
    for (const edu of originalData.education) {
      const degreeText = [edu.degree, edu.field].filter(Boolean).join(' in ');
      children.push(
        new Paragraph({
          tabStops: [
            {
              type: TabStopType.RIGHT,
              position: printableWidth,
            },
          ],
          spacing: { before: 120, after: 40 },
          children: [
            new TextRun({
              text: degreeText || edu.school,
              bold: true,
              size: 21,
              font: font,
              color: colorDark,
            }),
            new TextRun({
              text: `\t${edu.startDate} – ${edu.endDate || 'Present'}`,
              bold: true,
              size: 21,
              font: font,
              color: colorDark,
            }),
          ],
        })
      );

      if (degreeText) {
        children.push(
          new Paragraph({
            tabStops: [
              {
                type: TabStopType.RIGHT,
                position: printableWidth,
              },
            ],
            spacing: { after: 80 },
            children: [
              new TextRun({
                text: edu.school,
                italics: true,
                size: 20,
                font: font,
                color: '444444',
              }),
              new TextRun({
                text: originalData.location ? `\t${originalData.location}` : '',
                size: 20,
                font: font,
                color: '444444',
              }),
            ],
          })
        );
      }
    }
  }

  // References
  children.push(createSectionTitle('References', font, colorDark, AlignmentType.LEFT));
  children.push(
    new Paragraph({
      spacing: { after: 120 },
      children: [
        new TextRun({
          text: 'REFERENCES - AVAILABLE ON REQUEST',
          bold: true,
          size: 20,
          color: '333333',
          font: font,
        }),
      ],
    })
  );

  return new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1152, bottom: 1152, left: 1152, right: 1152 },
            size: { width: 11906, height: 16838 },
          },
        },
        children,
      },
    ],
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. NOVA / CELESTIAL STYLE (Modern left-aligned Indigo design)
// ─────────────────────────────────────────────────────────────────────────────
function generateNovaDocx(originalData: CVInput, enhancedData: CVEnhancedData): Document {
  const children: any[] = [];
  const printableWidth = 9890; // 11906 (A4 width) - 2 * 1008 (0.7 inch margins)
  const font = 'Calibri';
  const accentColor = '6366F1'; // indigo

  // Left Aligned Name Header
  children.push(
    new Paragraph({
      alignment: AlignmentType.LEFT,
      spacing: { before: 100, after: 60 },
      children: [
        new TextRun({
          text: originalData.fullName || 'Your Name',
          bold: true,
          size: 44, // 22pt
          color: accentColor,
          font: font,
        }),
      ],
    })
  );

  const contactText = [
    originalData.location,
    originalData.phone,
    originalData.email,
  ].filter(Boolean).join('   •   ');

  children.push(
    new Paragraph({
      alignment: AlignmentType.LEFT,
      spacing: { after: 240 },
      children: [
        new TextRun({
          text: contactText,
          size: 19, // 9.5pt
          color: '555555',
          font: font,
        }),
      ],
    })
  );

  // Summary
  if (enhancedData?.summary || originalData.summary) {
    children.push(createSectionTitle('Summary', font, accentColor, AlignmentType.LEFT));
    children.push(
      new Paragraph({
        spacing: { after: 160 },
        children: [
          new TextRun({
            text: enhancedData?.summary || originalData.summary,
            size: 21,
            color: '333333',
            font: font,
          }),
        ],
      })
    );
  }

  // Experience
  const expList = enhancedData?.experience || originalData.experience;
  if (expList && expList.length > 0) {
    children.push(createSectionTitle('Experience', font, accentColor, AlignmentType.LEFT));
    for (const exp of expList) {
      children.push(
        new Paragraph({
          tabStops: [
            {
              type: TabStopType.RIGHT,
              position: printableWidth,
            },
          ],
          spacing: { before: 120, after: 40 },
          children: [
            new TextRun({
              text: exp.title,
              bold: true,
              size: 22,
              font: font,
              color: '222222',
            }),
            new TextRun({
              text: `\t${exp.startDate} – ${exp.endDate || 'Present'}`,
              bold: true,
              size: 20,
              font: font,
              color: '555555',
            }),
          ],
        })
      );

      children.push(
        new Paragraph({
          spacing: { after: 80 },
          children: [
            new TextRun({
              text: exp.company,
              bold: true,
              size: 20,
              font: font,
              color: accentColor,
            }),
          ],
        })
      );

      if (exp.description) {
        const bullets = exp.description.split('\n').map(b => b.replace(/^[•●*-]\s*/, '').trim()).filter(Boolean);
        for (const bullet of bullets) {
          children.push(
            new Paragraph({
              spacing: { before: 0, after: 0, line: 240 },
              indent: { left: 240, hanging: 120 },
              children: [
                new TextRun({
                  text: '•  ',
                  size: 20,
                  font: font,
                  color: '444444',
                }),
                new TextRun({
                  text: bullet,
                  size: 20,
                  font: font,
                  color: '444444',
                }),
              ],
            })
          );
        }
      }
    }
  }

  // Skills
  const skillsList = enhancedData?.skills || originalData.skills;
  if (skillsList && skillsList.length > 0) {
    children.push(createSectionTitle('Skills', font, accentColor, AlignmentType.LEFT));
    children.push(
      new Paragraph({
        spacing: { after: 120 },
        children: [
          new TextRun({
            text: skillsList.join('   •   '),
            size: 21,
            font: font,
            color: '333333',
          }),
        ],
      })
    );
  }

  // Education
  if (originalData.education && originalData.education.length > 0) {
    children.push(createSectionTitle('Education', font, accentColor, AlignmentType.LEFT));
    for (const edu of originalData.education) {
      const degreeText = [edu.degree, edu.field].filter(Boolean).join(' in ');
      children.push(
        new Paragraph({
          tabStops: [
            {
              type: TabStopType.RIGHT,
              position: printableWidth,
            },
          ],
          spacing: { before: 120, after: 40 },
          children: [
            new TextRun({
              text: degreeText || edu.school,
              bold: true,
              size: 22,
              font: font,
              color: '222222',
            }),
            new TextRun({
              text: `\t${edu.startDate} – ${edu.endDate || 'Present'}`,
              bold: true,
              size: 20,
              font: font,
              color: '555555',
            }),
          ],
        })
      );

      children.push(
        new Paragraph({
          spacing: { after: 80 },
          children: [
            new TextRun({
              text: edu.school,
              size: 20,
              font: font,
              color: '555555',
            }),
          ],
        })
      );
    }
  }

  return new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1008, bottom: 1008, left: 1008, right: 1008 },
            size: { width: 11906, height: 16838 },
          },
        },
        children,
      },
    ],
  });
}

export function generateCVDocx(originalData: CVInput, enhancedData: CVEnhancedData): Document {
  const selectedStyle = originalData.style || 'default';
  if (selectedStyle === 'executive' || selectedStyle === 'chronicle') {
    return generateExecutiveDocx(originalData, enhancedData);
  } else if (selectedStyle === 'nova' || selectedStyle === 'celestial') {
    return generateNovaDocx(originalData, enhancedData);
  } else {
    return generateDefaultDocx(originalData, enhancedData);
  }
}
