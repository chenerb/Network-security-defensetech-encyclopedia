import generatedCatalog from '../generated/catalog.json' with { type: 'json' };
import type { Catalog } from '../types.ts';
import { createDataClient } from './content-client.ts';

export const catalog = generatedCatalog as Catalog;
export const { getDocument, getLesson, getExam, loadMarkdown, loadPaper, loadSearchIndex } =
  createDataClient(catalog, import.meta.env?.BASE_URL ?? '/');
