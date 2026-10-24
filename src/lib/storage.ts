import { DEFAULT_SETTINGS, DocRecord } from '../types';

const KEY = 'writerpro.docs.v1';

function load(): DocRecord[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function save(docs: DocRecord[]) {
  localStorage.setItem(KEY, JSON.stringify(docs));
}

export function listDocs(): DocRecord[] {
  return load().sort((a, b) => b.updatedAt - a.updatedAt);
}

export function newDoc(title = 'Untitled draft'): DocRecord {
  const now = Date.now();
  const doc: DocRecord = {
    id: `d${now.toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`,
    title,
    createdAt: now,
    updatedAt: now,
    content: { type: 'doc', content: [{ type: 'paragraph' }] },
    settings: { ...DEFAULT_SETTINGS },
    variables: {},
  };
  save([doc, ...load()]);
  return doc;
}

export function getDoc(id: string): DocRecord | undefined {
  return load().find((d) => d.id === id);
}

export function putDoc(doc: DocRecord) {
  const docs = load();
  const i = docs.findIndex((d) => d.id === doc.id);
  const next = { ...doc, updatedAt: Date.now() };
  if (i === -1) docs.unshift(next);
  else docs[i] = next;
  save(docs);
  return next;
}

export function deleteDoc(id: string) {
  save(load().filter((d) => d.id !== id));
}

export function duplicateDoc(id: string): DocRecord | undefined {
  const src = getDoc(id);
  if (!src) return undefined;
  const copy: DocRecord = {
    ...structuredClone(src),
    id: `d${Date.now().toString(36)}`,
    title: `${src.title} (copy)`,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  save([copy, ...load()]);
  return copy;
}
