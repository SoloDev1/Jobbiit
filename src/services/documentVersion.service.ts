import { prisma } from "../config/db";

export class DocumentVersionService {
  /**
   * Save a new version snapshot for a resume document
   */
  static async createResumeVersion(
    resumeId: string,
    versionTag: string,
    jsonSnapshot: any,
    changeSummary?: string
  ) {
    const version = await prisma.documentVersion.create({
      data: {
        resumeId,
        versionTag,
        jsonSnapshot,
        changeSummary: changeSummary || `Snapshot ${versionTag}`,
      },
    });

    // Update active version pointer on resume document
    await prisma.resumeDocument.update({
      where: { id: resumeId },
      data: {
        activeVersionId: version.id,
        structuredJson: jsonSnapshot,
      },
    });

    return version;
  }

  /**
   * Fetch all versions for a resume document
   */
  static async getResumeVersions(resumeId: string) {
    return prisma.documentVersion.findMany({
      where: { resumeId },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Rollback a resume document to a specific version (0 AI tokens)
   */
  static async restoreResumeVersion(resumeId: string, versionId: string) {
    const version = await prisma.documentVersion.findUnique({
      where: { id: versionId },
    });

    if (!version || version.resumeId !== resumeId) {
      throw new Error("Version not found or invalid.");
    }

    await prisma.resumeDocument.update({
      where: { id: resumeId },
      data: {
        activeVersionId: version.id,
        structuredJson: version.jsonSnapshot as any,
      },
    });

    return version;
  }

  /**
   * Save a new version snapshot for a cover letter document
   */
  static async createCoverLetterVersion(
    coverLetterId: string,
    versionTag: string,
    jsonSnapshot: any,
    changeSummary?: string
  ) {
    const version = await prisma.documentVersion.create({
      data: {
        coverLetterId,
        versionTag,
        jsonSnapshot,
        changeSummary: changeSummary || `Snapshot ${versionTag}`,
      },
    });

    // Update active version pointer on cover letter document
    await prisma.coverLetterDocument.update({
      where: { id: coverLetterId },
      data: {
        activeVersionId: version.id,
        structuredJson: jsonSnapshot,
      },
    });

    return version;
  }

  /**
   * Fetch all versions for a cover letter document
   */
  static async getCoverLetterVersions(coverLetterId: string) {
    return prisma.documentVersion.findMany({
      where: { coverLetterId },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Rollback a cover letter document to a specific version (0 AI tokens)
   */
  static async restoreCoverLetterVersion(coverLetterId: string, versionId: string) {
    const version = await prisma.documentVersion.findUnique({
      where: { id: versionId },
    });

    if (!version || version.coverLetterId !== coverLetterId) {
      throw new Error("Version not found or invalid.");
    }

    await prisma.coverLetterDocument.update({
      where: { id: coverLetterId },
      data: {
        activeVersionId: version.id,
        structuredJson: version.jsonSnapshot as any,
      },
    });

    return version;
  }
}
