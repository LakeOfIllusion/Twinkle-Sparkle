import { app } from 'electron'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'

function getStorePath(filename: string): string {
  const dir = join(app.getPath('userData'), 'store')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return join(dir, filename)
}

function readJSON<T>(filename: string, fallback: T): T {
  const filepath = getStorePath(filename)
  try {
    if (existsSync(filepath)) {
      return JSON.parse(readFileSync(filepath, 'utf-8')) as T
    }
  } catch { /* corrupt file → use fallback */ }
  return fallback
}

function writeJSON(filename: string, data: unknown): void {
  writeFileSync(getStorePath(filename), JSON.stringify(data, null, 2), 'utf-8')
}

// ── Types ──────────────────────────────────────────

export interface AppSettings {
  apiKey: string
  storagePath: string
  model: 'flash' | 'pro'
}

export interface LiteratureItem {
  id: string
  title: string
  authors: string
  year: string
  filePath: string
  importedAt: string
  type?: 'folder'
  parentId?: string
  isCollapsed?: boolean
}

export interface FolderMeta {
  readingGoal: string
  summary: string
}

export interface FollowUpMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: string
}

export interface Annotation {
  id: string
  literatureId: string
  selectedText: string
  userMessage: string
  aiResponse: string
  isFavorite: boolean
  createdAt: string
  pageNum?: number
  customName?: string
  type?: 'normal' | 'summary'
  followUpMessages?: FollowUpMessage[]
}

// ── Settings ───────────────────────────────────────

const DEFAULT_SETTINGS: AppSettings = {
  apiKey: '',
  storagePath: '',
  model: 'flash'
}

export function getSettings(): AppSettings {
  return readJSON<AppSettings>('settings.json', DEFAULT_SETTINGS)
}

export function setSettings(settings: AppSettings): void {
  writeJSON('settings.json', settings)
}

// ── Literature ─────────────────────────────────────

interface LiteratureStore {
  items: LiteratureItem[]
}

const DEFAULT_LITERATURE: LiteratureStore = { items: [] }

export function getLiterature(): LiteratureItem[] {
  return readJSON<LiteratureStore>('literature.json', DEFAULT_LITERATURE).items
}

export function addLiterature(item: LiteratureItem): LiteratureItem[] {
  const data = readJSON<LiteratureStore>('literature.json', DEFAULT_LITERATURE)
  data.items.push(item)
  writeJSON('literature.json', data)
  return data.items
}

export function removeLiterature(id: string): LiteratureItem[] {
  const data = readJSON<LiteratureStore>('literature.json', DEFAULT_LITERATURE)
  data.items = data.items.filter(it => it.id !== id)
  writeJSON('literature.json', data)
  return data.items
}

export function updateLiterature(id: string, updates: Partial<LiteratureItem>): LiteratureItem[] {
  const data = readJSON<LiteratureStore>('literature.json', DEFAULT_LITERATURE)
  const item = data.items.find(it => it.id === id)
  if (item) Object.assign(item, updates)
  writeJSON('literature.json', data)
  return data.items
}

// ── Annotations ────────────────────────────────────

interface AnnotationStore {
  items: Annotation[]
}

const DEFAULT_ANNOTATIONS: AnnotationStore = { items: [] }

export function getAnnotations(literatureId: string): Annotation[] {
  const data = readJSON<AnnotationStore>(`annotations-${literatureId}.json`, DEFAULT_ANNOTATIONS)
  return data.items
}

export function addAnnotation(item: Annotation): Annotation[] {
  const data = readJSON<AnnotationStore>(`annotations-${item.literatureId}.json`, DEFAULT_ANNOTATIONS)
  data.items.push(item)
  writeJSON(`annotations-${item.literatureId}.json`, data)
  return data.items
}

export function toggleFavorite(id: string, literatureId: string): Annotation[] {
  const data = readJSON<AnnotationStore>(`annotations-${literatureId}.json`, DEFAULT_ANNOTATIONS)
  const target = data.items.find(it => it.id === id)
  if (target) target.isFavorite = !target.isFavorite
  writeJSON(`annotations-${literatureId}.json`, data)
  return data.items
}

export function updateAnnotation(id: string, literatureId: string, updates: Partial<Annotation>): Annotation[] {
  const data = readJSON<AnnotationStore>(`annotations-${literatureId}.json`, DEFAULT_ANNOTATIONS)
  const target = data.items.find(it => it.id === id)
  if (target) Object.assign(target, updates)
  writeJSON(`annotations-${literatureId}.json`, data)
  return data.items
}

export function removeAnnotation(id: string, literatureId: string): Annotation[] {
  const data = readJSON<AnnotationStore>(`annotations-${literatureId}.json`, DEFAULT_ANNOTATIONS)
  data.items = data.items.filter(it => it.id !== id)
  writeJSON(`annotations-${literatureId}.json`, data)
  return data.items
}

// ── Folder Meta ────────────────────────────────────

const DEFAULT_FOLDER_META: FolderMeta = {
  readingGoal: '',
  summary: ''
}

export function getFolderMeta(folderId: string): FolderMeta {
  return readJSON<FolderMeta>(`folder-meta-${folderId}.json`, DEFAULT_FOLDER_META)
}

export function setFolderMeta(folderId: string, meta: FolderMeta): void {
  writeJSON(`folder-meta-${folderId}.json`, meta)
}
