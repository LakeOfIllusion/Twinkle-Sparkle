/// <reference types="vite/client" />

interface AppSettings {
  apiKey: string
  storagePath: string
  model: 'flash' | 'pro'
}

interface LiteratureItem {
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

interface Annotation {
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
}

interface Window {
  electronAPI: {
    minimize: () => void
    maximize: () => void
    close: () => void
    getSettings: () => Promise<AppSettings>
    setSettings: (settings: AppSettings) => Promise<AppSettings>
    getLiterature: () => Promise<LiteratureItem[]>
    addLiterature: (item: LiteratureItem) => Promise<LiteratureItem[]>
    removeLiterature: (id: string) => Promise<LiteratureItem[]>
    updateLiterature: (id: string, updates: Partial<LiteratureItem>) => Promise<LiteratureItem[]>
    getAnnotations: (literatureId: string) => Promise<Annotation[]>
    addAnnotation: (item: Annotation) => Promise<Annotation[]>
    updateAnnotation: (id: string, literatureId: string, updates: Partial<Annotation>) => Promise<Annotation[]>
    toggleFavorite: (id: string, literatureId: string) => Promise<Annotation[]>
    removeAnnotation: (id: string, literatureId: string) => Promise<Annotation[]>
    readPdf: (filePath: string) => Promise<string | null>
    selectFolder: () => Promise<string | null>
    selectPdf: () => Promise<string | null>
    copyPdfToStorage: (sourcePath: string) => Promise<string | null>
    getFilePath: (file: File) => string
  }
}
