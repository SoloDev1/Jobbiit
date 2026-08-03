/**
 * OpporHub OS — Document Plugin Registry
 * Central registry for dynamic document type plugins (Resume, Cover Letter, SOP, Grant, Scholarship).
 * Zero switch statements in core DocumentEngine.
 */

import { DocumentPlugin } from './plugin.interface';
import { resumePlugin } from './resume/resume.plugin';
import { coverLetterPlugin } from './cover-letter/cover-letter.plugin';
import { NotFoundError } from '../core/errors/domain-error';

export class PluginRegistry {
  private plugins: Map<string, DocumentPlugin> = new Map();

  constructor() {
    // Register core document plugins
    this.registerPlugin(resumePlugin);
    this.registerPlugin(coverLetterPlugin);
  }

  /**
   * Registers a document plugin.
   */
  public registerPlugin(plugin: DocumentPlugin): void {
    this.plugins.set(plugin.docType.toLowerCase(), plugin);
  }

  /**
   * Retrieves a plugin by document type string.
   */
  public getPlugin(docType: string): DocumentPlugin {
    const plugin = this.plugins.get(docType.toLowerCase());
    if (!plugin) {
      throw new NotFoundError(`No document plugin registered for type: ${docType}`);
    }
    return plugin;
  }

  /**
   * Returns all registered document types.
   */
  public getRegisteredDocTypes(): string[] {
    return Array.from(this.plugins.keys());
  }
}

export const pluginRegistry = new PluginRegistry();
