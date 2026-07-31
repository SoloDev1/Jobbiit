export interface StructuredResumeData {
  personal: {
    fullName: string;
    email: string;
    phone?: string;
    location?: string;
    linkedin?: string;
    website?: string;
  };
  summary: string;
  experience: Array<{
    company: string;
    role: string;
    startDate: string;
    endDate?: string;
    location?: string;
    bullets: string[];
  }>;
  education: Array<{
    school: string;
    degree?: string;
    field?: string;
    startDate: string;
    endDate?: string;
  }>;
  skills: string[];
  certifications?: string[];
}

export type TemplateStyle = "modern" | "executive" | "minimal" | "ats" | "creative";

export class ResumeRendererService {
  /**
   * Generates clean HTML template for rendering.
   * 0 AI Tokens used - pure deterministic layout compilation.
   */
  static renderToHtml(data: StructuredResumeData, style: TemplateStyle = "modern"): string {
    const primaryColor = this.getPrimaryColorForStyle(style);

    const experienceHtml = (data.experience || [])
      .map(
        (exp) => `
        <div style="margin-bottom: 16px;">
          <div style="display: flex; justify-content: space-between; align-items: baseline;">
            <strong style="font-size: 16px; color: #111827;">${this.escape(exp.role)}</strong>
            <span style="font-size: 13px; color: #6b7280;">${this.escape(exp.startDate)} - ${this.escape(exp.endDate || "Present")}</span>
          </div>
          <div style="font-size: 14px; color: ${primaryColor}; font-weight: 500;">${this.escape(exp.company)} ${exp.location ? `• ${this.escape(exp.location)}` : ""}</div>
          <ul style="margin-top: 6px; padding-left: 18px; margin-bottom: 0;">
            ${(exp.bullets || []).map((b) => `<li style="font-size: 13.5px; color: #374151; margin-bottom: 4px; line-height: 1.4;">${this.escape(b)}</li>`).join("")}
          </ul>
        </div>
      `
      )
      .join("");

    const educationHtml = (data.education || [])
      .map(
        (edu) => `
        <div style="margin-bottom: 10px;">
          <div style="display: flex; justify-content: space-between; align-items: baseline;">
            <strong style="font-size: 15px; color: #111827;">${this.escape(edu.school)}</strong>
            <span style="font-size: 12.5px; color: #6b7280;">${this.escape(edu.startDate)} - ${this.escape(edu.endDate || "Present")}</span>
          </div>
          <div style="font-size: 13.5px; color: #4b5563;">${this.escape(edu.degree || "")} ${edu.field ? `in ${this.escape(edu.field)}` : ""}</div>
        </div>
      `
      )
      .join("");

    const skillsHtml = (data.skills || [])
      .map((skill) => `<span style="display: inline-block; background-color: #f3f4f6; color: #1f2937; padding: 4px 10px; border-radius: 4px; font-size: 12px; margin-right: 6px; margin-bottom: 6px;">${this.escape(skill)}</span>`)
      .join("");

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1f2937; margin: 0; padding: 32px; background: #ffffff; }
          .header { border-bottom: 2px solid ${primaryColor}; padding-bottom: 16px; margin-bottom: 20px; }
          .name { font-size: 28px; font-weight: 700; color: #111827; margin: 0; }
          .contact { font-size: 13px; color: #4b5563; margin-top: 6px; }
          .section-title { font-size: 16px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: ${primaryColor}; margin-top: 20px; margin-bottom: 10px; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; }
          .summary { font-size: 14px; line-height: 1.5; color: #374151; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1 class="name">${this.escape(data.personal.fullName || "Your Name")}</h1>
          <div class="contact">
            ${[data.personal.email, data.personal.phone, data.personal.location, data.personal.linkedin].filter((item): item is string => Boolean(item)).map((item) => this.escape(item)).join("  |  ")}
          </div>
        </div>

        ${data.summary ? `<div class="section-title">Professional Summary</div><div class="summary">${this.escape(data.summary)}</div>` : ""}

        ${experienceHtml ? `<div class="section-title">Work Experience</div>${experienceHtml}` : ""}

        ${educationHtml ? `<div class="section-title">Education</div>${educationHtml}` : ""}

        ${skillsHtml ? `<div class="section-title">Skills & Competencies</div><div>${skillsHtml}</div>` : ""}
      </body>
      </html>
    `;
  }

  private static getPrimaryColorForStyle(style: TemplateStyle): string {
    switch (style) {
      case "executive":
        return "#1e3a8a"; // Navy Blue
      case "minimal":
        return "#374151"; // Slate Dark
      case "creative":
        return "#7c3aed"; // Violet
      case "ats":
        return "#111827"; // Monochrome Black
      case "modern":
      default:
        return "#0284c7"; // Sky Blue
    }
  }

  private static escape(str?: string): string {
    return (str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
}
