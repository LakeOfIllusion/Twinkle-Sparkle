import { contextBridge, ipcRenderer, webUtils } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  // Window controls
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),

  // Settings
  getSettings: () => ipcRenderer.invoke('store:get-settings'),
  setSettings: (settings: unknown) => ipcRenderer.invoke('store:set-settings', settings),

  // Literature
  getLiterature: () => ipcRenderer.invoke('store:get-literature'),
  addLiterature: (item: unknown) => ipcRenderer.invoke('store:add-literature', item),
  removeLiterature: (id: string) => ipcRenderer.invoke('store:remove-literature', id),
  updateLiterature: (id: string, updates: Record<string, unknown>) =>
    ipcRenderer.invoke('store:update-literature', id, updates),

  // Annotations
  getAnnotations: (literatureId: string) => ipcRenderer.invoke('store:get-annotations', literatureId),
  addAnnotation: (item: unknown) => ipcRenderer.invoke('store:add-annotation', item),
  updateAnnotation: (id: string, literatureId: string, updates: Record<string, unknown>) =>
    ipcRenderer.invoke('store:update-annotation', id, literatureId, updates),
  toggleFavorite: (id: string, literatureId: string) =>
    ipcRenderer.invoke('store:toggle-favorite', id, literatureId),
  removeAnnotation: (id: string, literatureId: string) =>
    ipcRenderer.invoke('store:remove-annotation', id, literatureId),

  // Dialog
  readPdf: (filePath: string) => ipcRenderer.invoke('file:read-pdf', filePath),
  selectFolder: () => ipcRenderer.invoke('dialog:select-folder'),
  selectPdf: () => ipcRenderer.invoke('dialog:select-pdf'),
  copyPdfToStorage: (sourcePath: string) => ipcRenderer.invoke('file:copy-pdf', sourcePath),

  // Folder meta
  getFolderMeta: (folderId: string) => ipcRenderer.invoke('store:get-folder-meta', folderId),
  setFolderMeta: (folderId: string, meta: Record<string, unknown>) =>
    ipcRenderer.invoke('store:set-folder-meta', folderId, meta),

  // File path from drag-drop (contextIsolation 下 File.path 不可用)
  getFilePath: (file: File) => webUtils.getPathForFile(file)
})
