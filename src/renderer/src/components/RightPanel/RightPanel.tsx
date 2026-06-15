import { useState, useEffect, useRef } from 'react'
import styles from './RightPanel.module.css'
import ConfirmDialog from '../ConfirmDialog/ConfirmDialog'
import ContextMenu, { type ContextMenuItem } from '../ContextMenu/ContextMenu'
import { useToast } from '../Toast/Toast'
import sidebarIcon from '../../assets/essay management/Sidebar.svg'
import importIcon from '../../assets/essay management/Folder plus.svg'
import chevronDownIcon from '../../assets/essay management/Chevron down.svg'
import chevronRightIcon from '../../assets/essay management/Chevron right.svg'

interface Props {
  literature: LiteratureItem[]
  activeLiteratureId: string | null
  onSelectLiterature: (item: LiteratureItem) => void
  onLiteratureChange: (items: LiteratureItem[]) => void
  onManageFolder: (folder: LiteratureItem) => void
}

interface CtxMenu {
  x: number
  y: number
  item?: LiteratureItem
}

function RightPanel({ literature, activeLiteratureId, onSelectLiterature, onLiteratureChange, onManageFolder }: Props) {
  const toast = useToast()
  const panelRef = useRef<HTMLDivElement>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [contextMenu, setContextMenu] = useState<CtxMenu | null>(null)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<LiteratureItem | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null)

  const isSearching = searchQuery.trim().length > 0

  // ── Import ──────────────────────────────────────────

  const handleImport = async (sourcePath: string) => {
    const originalFilename = sourcePath.split(/[\\/]/).pop() || '未命名文献'
    const title = originalFilename.replace(/\.[^.]+$/, '')
    const destPath = await window.electronAPI.copyPdfToStorage(sourcePath)
    if (!destPath) {
      toast.show('文件导入失败', 'error')
      return
    }
    const newItem: LiteratureItem = {
      id: crypto.randomUUID(),
      title,
      authors: '',
      year: '',
      filePath: destPath,
      importedAt: new Date().toISOString()
    }
    const updated = await window.electronAPI.addLiterature(newItem)
    onLiteratureChange(updated)
    toast.show('导入成功', 'success')
  }

  const handleImportClick = async () => {
    const path = await window.electronAPI.selectPdf()
    if (path) await handleImport(path)
  }

  const handleImportRef = useRef(handleImport)
  useEffect(() => { handleImportRef.current = handleImport })

  useEffect(() => {
    // Only respond to external file drags (not internal item drags)
    const isFileDrag = (e: DragEvent) => e.dataTransfer?.types.includes('Files')

    const onDragOver = (e: DragEvent) => {
      if (!isFileDrag(e)) return
      e.preventDefault()
      e.stopPropagation()
      setIsDragOver(true)
    }
    const onDragLeave = (e: DragEvent) => {
      if (!isFileDrag(e)) return
      if (e.target === document.documentElement || e.relatedTarget === null) {
        setIsDragOver(false)
      }
    }
    const onDrop = async (e: DragEvent) => {
      if (!isFileDrag(e)) return
      e.preventDefault()
      e.stopPropagation()
      setIsDragOver(false)
      const file = e.dataTransfer?.files[0]
      if (!file) return
      const path = window.electronAPI.getFilePath(file)
      if (!path) return
      if (!path.toLowerCase().endsWith('.pdf')) {
        toast.show('仅支持 PDF 文件', 'error')
        return
      }
      handleImportRef.current(path)
    }

    document.addEventListener('dragover', onDragOver)
    document.addEventListener('dragleave', onDragLeave)
    document.addEventListener('drop', onDrop)
    return () => {
      document.removeEventListener('dragover', onDragOver)
      document.removeEventListener('dragleave', onDragLeave)
      document.removeEventListener('drop', onDrop)
    }
  }, [toast])

  // ── Filtering ───────────────────────────────────────

  const folders = literature.filter(item => item.type === 'folder')

  const rootLiterature = literature.filter(item => {
    if (item.type === 'folder') return false
    if (item.parentId) return false
    if (!isSearching) return true
    return item.title.toLowerCase().includes(isSearching ? searchQuery.toLowerCase() : '')
  })

  const getFolderChildren = (folderId: string): LiteratureItem[] => {
    return literature.filter(item => {
      if (item.type === 'folder') return false
      if (item.parentId !== folderId) return false
      if (!isSearching) return true
      return item.title.toLowerCase().includes(searchQuery.toLowerCase())
    })
  }

  const visibleFolders = isSearching
    ? folders.filter(f => {
        if (f.title.toLowerCase().includes(searchQuery.toLowerCase())) return true
        return getFolderChildren(f.id).length > 0
      })
    : folders

  // Items shown at root level: folders + root literature
  const hasVisibleContent = visibleFolders.length > 0 || rootLiterature.length > 0

  // ── Folder operations ───────────────────────────────

  const handleCreateFolder = async () => {
    const count = literature.filter(l => l.type === 'folder').length
    const newFolder: LiteratureItem = {
      id: crypto.randomUUID(),
      title: `文件夹${count + 1}`,
      authors: '',
      year: '',
      filePath: '',
      importedAt: new Date().toISOString(),
      type: 'folder',
      isCollapsed: false
    }
    const updated = await window.electronAPI.addLiterature(newFolder)
    onLiteratureChange(updated)
    setContextMenu(null)
    toast.show('文件夹已创建', 'success')
  }

  const handleToggleFolder = async (folder: LiteratureItem) => {
    const updated = await window.electronAPI.updateLiterature(folder.id, {
      isCollapsed: !folder.isCollapsed
    })
    onLiteratureChange(updated)
  }

  const handleRename = () => {
    if (!contextMenu?.item) return
    setRenamingId(contextMenu.item.id)
    setRenameValue(contextMenu.item.title)
    setContextMenu(null)
  }

  const handleRenameSubmit = async (id: string) => {
    const trimmed = renameValue.trim()
    if (trimmed && trimmed !== literature.find(l => l.id === id)?.title) {
      const updated = await window.electronAPI.updateLiterature(id, { title: trimmed })
      onLiteratureChange(updated)
      toast.show('重命名成功', 'success')
    }
    setRenamingId(null)
  }

  const handleDeleteClick = () => {
    if (!contextMenu?.item) return
    setDeleteTarget(contextMenu.item)
    setContextMenu(null)
  }

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return
    const targetId = deleteTarget.id

    if (deleteTarget.type === 'folder') {
      // Move all children back to root before deleting folder
      const children = literature.filter(l => l.parentId === targetId)
      for (const child of children) {
        await window.electronAPI.updateLiterature(child.id, { parentId: '' })
      }
    }

    const updated = await window.electronAPI.removeLiterature(targetId)
    onLiteratureChange(updated)
    setDeleteTarget(null)
    toast.show('已删除', 'success')
  }

  // ── Drag & drop between folders ─────────────────────

  const handleItemDragStart = (e: React.DragEvent, item: LiteratureItem) => {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', item.id)
  }

  const handleFolderDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleFolderDragEnter = (folderId: string) => {
    setDragOverFolderId(folderId)
  }

  const handleFolderDragLeave = () => {
    setDragOverFolderId(null)
  }

  const handleFolderDrop = async (e: React.DragEvent, folderId: string) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOverFolderId(null)
    const itemId = e.dataTransfer.getData('text/plain')
    if (!itemId || itemId === folderId) return
    const item = literature.find(l => l.id === itemId)
    if (!item || item.type === 'folder') return
    const updated = await window.electronAPI.updateLiterature(itemId, { parentId: folderId })
    onLiteratureChange(updated)
    toast.show('已移入文件夹', 'success')
  }

  const handleRootDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleRootDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setDragOverFolderId(null)
    const itemId = e.dataTransfer.getData('text/plain')
    if (!itemId) return
    const updated = await window.electronAPI.updateLiterature(itemId, { parentId: '' })
    onLiteratureChange(updated)
  }

  // ── Context menus ───────────────────────────────────

  const handleItemContextMenu = (e: React.MouseEvent, item: LiteratureItem) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({ x: e.clientX, y: e.clientY, item })
  }

  const handleEmptyContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY })
  }

  const handleManageFolder = () => {
    if (!contextMenu?.item) return
    const folder = contextMenu.item
    setContextMenu(null)
    onManageFolder(folder)
  }

  const contextMenuItems: ContextMenuItem[] = contextMenu?.item
    ? contextMenu.item.type === 'folder'
      ? [
          { label: '文件夹管理', onClick: handleManageFolder },
          { label: '重命名', onClick: handleRename },
          { label: '删除', onClick: handleDeleteClick, danger: true }
        ]
      : [
          { label: '重命名', onClick: handleRename },
          { label: '删除', onClick: handleDeleteClick, danger: true }
        ]
    : [
        { label: '新建文件夹', onClick: handleCreateFolder }
      ]

  const confirmMessage = deleteTarget?.type === 'folder'
    ? `确定要删除文件夹「${deleteTarget?.title ?? ''}」吗？\n文件夹内的文献将移回根目录。`
    : `确定要删除文献「${deleteTarget?.title ?? ''}」吗？\n文献将从列表中移除，但文件仍保留在存储目录中。`

  // ── Render ──────────────────────────────────────────

  return (
    <div
      ref={panelRef}
      className={`${styles.rightPanel} ${isDragOver ? styles.dragOver : ''}`}
    >
      <div className={styles.searchBar}>
        <button className={styles.collapseBtn} title="折叠侧栏">
          <img src={sidebarIcon} alt="折叠" />
        </button>
        <input
          className={styles.searchInput}
          placeholder="搜索文献..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
      </div>

      <div
        className={styles.literatureList}
        onContextMenu={handleEmptyContextMenu}
        onDragOver={handleRootDragOver}
        onDrop={handleRootDrop}
      >
        {/* Folders */}
        {visibleFolders.map(folder => {
          const isExpanded = isSearching || !folder.isCollapsed
          const children = getFolderChildren(folder.id)

          return (
            <div key={folder.id}>
              <div
                className={`${styles.folderItem} ${dragOverFolderId === folder.id ? styles.folderDragOver : ''}`}
                onContextMenu={e => handleItemContextMenu(e, folder)}
                onDragOver={handleFolderDragOver}
                onDragEnter={() => handleFolderDragEnter(folder.id)}
                onDragLeave={handleFolderDragLeave}
                onDrop={e => handleFolderDrop(e, folder.id)}
              >
                {renamingId === folder.id ? (
                  <input
                    className={styles.renameInput}
                    value={renameValue}
                    onChange={e => setRenameValue(e.target.value)}
                    onBlur={() => handleRenameSubmit(folder.id)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleRenameSubmit(folder.id)
                      if (e.key === 'Escape') setRenamingId(null)
                    }}
                    onClick={e => e.stopPropagation()}
                    autoFocus
                    onFocus={e => e.target.select()}
                  />
                ) : (
                  <div className={styles.folderHeader} onClick={() => handleToggleFolder(folder)}>
                    <img
                      className={styles.chevron}
                      src={isExpanded ? chevronDownIcon : chevronRightIcon}
                      alt={isExpanded ? '折叠' : '展开'}
                    />
                    <span className={styles.folderName}>{folder.title}</span>
                  </div>
                )}
              </div>

              {/* Children inside folder */}
              {isExpanded && children.map(child => (
                <div
                  key={child.id}
                  className={`${styles.literatureItem} ${styles.indented} ${child.id === activeLiteratureId ? styles.literatureItemActive : ''}`}
                  onClick={() => onSelectLiterature(child)}
                  onContextMenu={e => handleItemContextMenu(e, child)}
                  draggable
                  onDragStart={e => handleItemDragStart(e, child)}
                >
                  {renamingId === child.id ? (
                    <input
                      className={styles.renameInput}
                      value={renameValue}
                      onChange={e => setRenameValue(e.target.value)}
                      onBlur={() => handleRenameSubmit(child.id)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleRenameSubmit(child.id)
                        if (e.key === 'Escape') setRenamingId(null)
                      }}
                      onClick={e => e.stopPropagation()}
                      autoFocus
                      onFocus={e => e.target.select()}
                    />
                  ) : (
                    <>
                      <div className={styles.itemTitle}>{child.title}</div>
                      {child.authors && (
                        <div className={styles.itemMeta}>{child.authors}{child.year ? ` (${child.year})` : ''}</div>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          )
        })}

        {/* Root-level literature */}
        {rootLiterature.map(item => (
          <div
            key={item.id}
            className={`${styles.literatureItem} ${item.id === activeLiteratureId ? styles.literatureItemActive : ''}`}
            onClick={() => onSelectLiterature(item)}
            onContextMenu={e => handleItemContextMenu(e, item)}
            draggable
            onDragStart={e => handleItemDragStart(e, item)}
          >
            {renamingId === item.id ? (
              <input
                className={styles.renameInput}
                value={renameValue}
                onChange={e => setRenameValue(e.target.value)}
                onBlur={() => handleRenameSubmit(item.id)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleRenameSubmit(item.id)
                  if (e.key === 'Escape') setRenamingId(null)
                }}
                onClick={e => e.stopPropagation()}
                autoFocus
                onFocus={e => e.target.select()}
              />
            ) : (
              <>
                <div className={styles.itemTitle}>{item.title}</div>
                {item.authors && (
                  <div className={styles.itemMeta}>{item.authors}{item.year ? ` (${item.year})` : ''}</div>
                )}
              </>
            )}
          </div>
        ))}

        {!hasVisibleContent && (
          <div className={styles.emptyHint}>
            {literature.length === 0 ? '点击下方按钮导入文献，或拖拽 PDF 到此处' : '无匹配文献'}
          </div>
        )}
      </div>

      <div className={styles.importArea}>
        <button className={styles.importBtn} title="导入文献" onClick={handleImportClick}>
          <img src={importIcon} alt="导入文献" />
        </button>
      </div>

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextMenuItems}
          onClose={() => setContextMenu(null)}
        />
      )}

      <ConfirmDialog
        visible={deleteTarget !== null}
        title="确认删除"
        message={confirmMessage}
        confirmText="确认删除"
        cancelText="取消"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}

export default RightPanel
