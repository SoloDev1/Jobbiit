import { Request, Response } from 'express';
import { DocumentService } from '../services/document.service';
import { ExportService } from '../services/export.service';

const parseStringParam = (param: any): string => {
  if (Array.isArray(param)) return param[0] || '';
  return typeof param === 'string' ? param : String(param || '');
};

export async function generateDocument(req: Request, res: Response) {
  try {
    const userId = req.user!.id;
    const { documentType, formData, targetOpportunityText } = req.body;

    if (!documentType || !formData) {
      return res.status(400).json({ success: false, message: 'documentType and formData are required' });
    }

    const document = await DocumentService.generateDocument(
      userId,
      parseStringParam(documentType),
      formData,
      targetOpportunityText ? parseStringParam(targetOpportunityText) : undefined
    );

    return res.status(201).json({ success: true, data: document });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function getUserDocuments(req: Request, res: Response) {
  try {
    const userId = req.user!.id;
    const page = parseInt(parseStringParam(req.query.page)) || 1;
    const limit = parseInt(parseStringParam(req.query.limit)) || 20;
    const search = req.query.search ? parseStringParam(req.query.search) : undefined;

    const result = await DocumentService.getUserDocuments(userId, page, limit, search);
    return res.status(200).json({ success: true, data: result });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function getDocumentById(req: Request, res: Response) {
  try {
    const userId = req.user!.id;
    const id = parseStringParam(req.params.id);

    const document = await DocumentService.getDocumentById(userId, id);
    return res.status(200).json({ success: true, data: document });
  } catch (error: any) {
    return res.status(404).json({ success: false, message: error.message });
  }
}

export async function updateDocument(req: Request, res: Response) {
  try {
    const userId = req.user!.id;
    const id = parseStringParam(req.params.id);
    const { title, sections, settings, templateId } = req.body;

    const updated = await DocumentService.updateDocument(userId, id, {
      title: title ? parseStringParam(title) : undefined,
      sections,
      settings,
      templateId: templateId ? parseStringParam(templateId) : undefined,
    });

    return res.status(200).json({ success: true, data: updated });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
}

export async function executeSectionAiAction(req: Request, res: Response) {
  try {
    const userId = req.user!.id;
    const id = parseStringParam(req.params.id);
    const { sectionId, action, targetOpportunityText } = req.body;

    if (!sectionId || !action) {
      return res.status(400).json({ success: false, message: 'sectionId and action are required' });
    }

    const result = await DocumentService.executeSectionAiAction(
      userId,
      id,
      parseStringParam(sectionId),
      action as any,
      targetOpportunityText ? parseStringParam(targetOpportunityText) : undefined
    );

    return res.status(200).json({ success: true, data: result });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function revertSectionAiAction(req: Request, res: Response) {
  try {
    const userId = req.user!.id;
    const id = parseStringParam(req.params.id);
    const { sectionId } = req.body;

    if (!sectionId) {
      return res.status(400).json({ success: false, message: 'sectionId is required' });
    }

    const updated = await DocumentService.revertSectionAiAction(userId, id, parseStringParam(sectionId));
    return res.status(200).json({ success: true, data: updated });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
}

export async function duplicateDocument(req: Request, res: Response) {
  try {
    const userId = req.user!.id;
    const id = parseStringParam(req.params.id);

    const duplicated = await DocumentService.duplicateDocument(userId, id);
    return res.status(201).json({ success: true, data: duplicated });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
}

export async function deleteDocument(req: Request, res: Response) {
  try {
    const userId = req.user!.id;
    const id = parseStringParam(req.params.id);

    const result = await DocumentService.deleteDocument(userId, id);
    return res.status(200).json({ success: true, data: result });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
}

export async function exportDocument(req: Request, res: Response) {
  try {
    const userId = req.user!.id;
    const id = parseStringParam(req.params.id);
    const format = (parseStringParam(req.query.format) || 'pdf').toLowerCase();

    const document = await DocumentService.getDocumentById(userId, id);

    if (format === 'docx') {
      const buffer = await ExportService.generateDocx(document);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', `attachment; filename="${document.title}.docx"`);
      return res.send(buffer);
    } else {
      const buffer = await ExportService.generatePdf(document);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${document.title}.pdf"`);
      return res.send(buffer);
    }
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}
