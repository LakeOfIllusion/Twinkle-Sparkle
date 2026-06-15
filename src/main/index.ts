import { app, BrowserWindow, ipcMain } from 'electron'
import { join, resolve, extname } from 'path'
import { readFileSync, copyFileSync, existsSync, mkdirSync } from 'fs'
import { randomUUID } from 'crypto'
import {
  getSettings,
  setSettings,
  getLiterature,
  addLiterature,
  removeLiterature,
  updateLiterature,
  getAnnotations,
  addAnnotation,
  toggleFavorite,
  updateAnnotation,
  removeAnnotation,
  getFolderMeta,
  setFolderMeta
} from './store'

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1210,
    height: 780,
    frame: false,
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.maximize()
    mainWindow?.show()
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// Window controls
ipcMain.on('window-minimize', () => mainWindow?.minimize())
ipcMain.on('window-maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize()
  } else {
    mainWindow?.maximize()
  }
})
ipcMain.on('window-close', () => mainWindow?.close())

// Store IPC handlers
ipcMain.handle('store:get-settings', () => getSettings())
ipcMain.handle('store:set-settings', (_e, settings) => {
  setSettings(settings)
  return getSettings()
})
ipcMain.handle('store:get-literature', () => getLiterature())
ipcMain.handle('store:add-literature', (_e, item) => addLiterature(item))
ipcMain.handle('store:remove-literature', (_e, id) => removeLiterature(id))
ipcMain.handle('store:get-annotations', (_e, literatureId) => getAnnotations(literatureId))
ipcMain.handle('store:add-annotation', (_e, item) => addAnnotation(item))
ipcMain.handle('store:update-annotation', (_e, id, literatureId, updates) => updateAnnotation(id, literatureId, updates))
ipcMain.handle('store:remove-annotation', (_e, id, literatureId) => removeAnnotation(id, literatureId))
ipcMain.handle('store:toggle-favorite', (_e, id, literatureId) => toggleFavorite(id, literatureId))
ipcMain.handle('store:update-literature', (_e, id, updates) => updateLiterature(id, updates))
ipcMain.handle('store:get-folder-meta', (_e, folderId) => getFolderMeta(folderId))
ipcMain.handle('store:set-folder-meta', (_e, folderId, meta) => {
  setFolderMeta(folderId, meta)
  return getFolderMeta(folderId)
})
ipcMain.handle('dialog:select-pdf', async () => {
  const { dialog } = await import('electron')
  const result = await dialog.showOpenDialog({
    filters: [{ name: 'PDF 文件', extensions: ['pdf'] }],
    properties: ['openFile']
  })
  return result.canceled ? null : result.filePaths[0]
})
ipcMain.handle('file:copy-pdf', async (_e, sourcePath: string) => {
  try {
    const settings = getSettings()
    const storageDir = settings.storagePath || join(app.getPath('documents'), 'TwinkleSparkle')
    if (!existsSync(storageDir)) mkdirSync(storageDir, { recursive: true })
    const ext = extname(sourcePath)
    const destPath = join(storageDir, `${randomUUID()}${ext}`)
    copyFileSync(sourcePath, destPath)
    return destPath
  } catch {
    return null
  }
})
ipcMain.handle('file:read-pdf', async (_e, filePath: string) => {
  try {
    const absolutePath = resolve(app.getAppPath(), filePath)
    const buf = readFileSync(absolutePath)
    return buf.toString('base64')
  } catch {
    return null
  }
})

ipcMain.handle('dialog:select-folder', async () => {
  const { dialog } = await import('electron')
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory']
  })
  return result.canceled ? null : result.filePaths[0]
})

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})
