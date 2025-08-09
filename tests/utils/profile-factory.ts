/**
 * Runtime Profile Factory
 * Generates lightweight test profiles from template metadata.
 */
import fs from 'fs/promises';
import path from 'path';

interface TemplateDefinition {
  id: string;
  complexity: 'low' | 'medium' | 'high';
  sampleCount: number;
  varianceLevel: 'low' | 'medium' | 'high';
  duration: number;
}

interface TemplateFileShape {
  templates: TemplateDefinition[];
}

export interface GeneratedProfileInput {
  name: string;
  description?: string;
  templateId: string;
  complexity: 'low' | 'medium' | 'high';
  sampleCount: number;
  varianceLevel: 'low' | 'medium' | 'high';
  duration: number;
  errorDistribution?: Record<string, number>;
}

const TEMPLATE_PATH = path.join(process.cwd(), 'tests', 'fixtures', 'test-profile-templates.json');
let cachedTemplates: TemplateDefinition[] | null = null;

async function loadTemplates(): Promise<TemplateDefinition[]> {
  if (cachedTemplates) return cachedTemplates;
  const raw = await fs.readFile(TEMPLATE_PATH, 'utf-8');
  const parsed: TemplateFileShape = JSON.parse(raw);
  cachedTemplates = parsed.templates;
  return cachedTemplates;
}

export async function listProfileTemplates() {
  return loadTemplates();
}
export async function getTemplate(id: string) {
  return (await loadTemplates()).find((t) => t.id === id);
}

export async function createProfileFromTemplate(
  templateId: string,
  overrides: Partial<GeneratedProfileInput> = {},
): Promise<GeneratedProfileInput> {
  const template = await getTemplate(templateId);
  if (!template) throw new Error(`Template '${templateId}' not found`);
  return {
    templateId,
    name: overrides.name || `Generated ${template.complexity} profile`,
    description: overrides.description || `Runtime generated profile from ${templateId}`,
    complexity: template.complexity,
    sampleCount: template.sampleCount,
    varianceLevel: template.varianceLevel,
    duration: template.duration,
    errorDistribution: overrides.errorDistribution || { basic_error: 1 },
  };
}

export async function registerProfileViaApi(
  baseUrl: string,
  templateId: string,
  overrides: Partial<GeneratedProfileInput> = {},
) {
  const profile = await createProfileFromTemplate(templateId, overrides);
  if (typeof fetch !== 'function') return profile;
  const res = await fetch(`${baseUrl.replace(/\/$/, '')}/api/test-manager/profiles`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(profile),
  });
  if (!res.ok) throw new Error(`Failed to register profile (${res.status})`);
  return profile;
}
