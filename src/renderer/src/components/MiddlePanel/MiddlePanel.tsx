import { useState, useRef, useEffect } from 'react'
import styles from './MiddlePanel.module.css'
import ContextMenu from '../ContextMenu/ContextMenu'
import ConfirmDialog from '../ConfirmDialog/ConfirmDialog'
import aiReplyIcon from '../../assets/annotation/AI_reply.svg'
import selectedTextBg from '../../assets/annotation/sentencse_selected.svg'
import starIcon from '../../assets/annotation/star_filled.svg'
import listIcon from '../../assets/annotation/List.svg'
import menuIcon from '../../assets/annotation/Menu.svg'

type ViewMode = 'detail' | 'manage'

interface MiddlePanelProps {
  selectedText?: string
  annotations: Annotation[]
  aiStatus: 'idle' | 'loading'
  aiError: string | null
  focusAnnotationId?: string | null
  onSendMessage: (userMessage: string) => void
  onToggleFavorite: (annotationId: string) => void
  onLocateAnnotation: (selectedText: string) => void
  onEditAnnotation: (annotationId: string, newUserMessage: string) => void
  onSelectAnnotationText: (text: string) => void
  onDismissError: () => void
  onDeleteAnnotation: (annotationId: string) => void
  onRenameAnnotation: (annotationId: string, customName: string) => void
  onReSummarize: () => void
  onFollowUp: (annotationId: string, question: string) => void
}

function MiddlePanel({
  selectedText,
  annotations,
  aiStatus,
  aiError,
  focusAnnotationId,
  onSendMessage,
  onToggleFavorite,
  onLocateAnnotation,
  onEditAnnotation,
  onSelectAnnotationText,
  onDismissError,
  onDeleteAnnotation,
  onRenameAnnotation,
  onReSummarize,
  onFollowUp,
}: MiddlePanelProps) {
  const [inputValue, setInputValue] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('detail')
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; annotationId: string } | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<Annotation | null>(null)
  const [scrollToAnnotationId, setScrollToAnnotationId] = useState<string | null>(null)
  const [followUpTargetId, setFollowUpTargetId] = useState<string | null>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const editInputRef = useRef<HTMLTextAreaElement>(null)

  const sortedAnnotations = [...annotations].sort((a, b) => {
    const pageA = a.pageNum ?? Infinity
    const pageB = b.pageNum ?? Infinity
    if (pageA !== pageB) return pageA - pageB
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  })

  const prevCountRef = useRef(annotations.length)
  useEffect(() => {
    if (annotations.length > prevCountRef.current) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
    prevCountRef.current = annotations.length
  }, [annotations])

  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus()
      editInputRef.current.setSelectionRange(editValue.length, editValue.length)
    }
  }, [editingId])

  useEffect(() => {
    if (focusAnnotationId) {
      setScrollToAnnotationId(focusAnnotationId)
    }
  }, [focusAnnotationId])

  useEffect(() => {
    if (!scrollToAnnotationId || viewMode !== 'detail') return
    requestAnimationFrame(() => {
      const el = document.querySelector(`[data-annotation-id="${scrollToAnnotationId}"]`)
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      setScrollToAnnotationId(null)
    })
  }, [scrollToAnnotationId, viewMode])

  useEffect(() => {
    if (!followUpTargetId) return
    const target = annotations.find(a => a.id === followUpTargetId)
    if (!target || target.selectedText !== selectedText) {
      setFollowUpTargetId(null)
    }
  }, [selectedText, annotations, followUpTargetId])

  const handleSend = () => {
    const trimmed = inputValue.trim()
    if (!trimmed || aiStatus === 'loading') return
    if (followUpTargetId) {
      onFollowUp(followUpTargetId, trimmed)
      setFollowUpTargetId(null)
    } else {
      onSendMessage(trimmed)
    }
    setInputValue('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleContextMenu = (e: React.MouseEvent, annotationId: string) => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY, annotationId })
  }

  const startEdit = (annotationId: string) => {
    const ann = annotations.find(a => a.id === annotationId)
    if (ann) {
      setEditValue(ann.userMessage)
      setEditingId(annotationId)
    }
    setContextMenu(null)
  }

  const commitEdit = () => {
    if (editingId && editValue.trim()) {
      onEditAnnotation(editingId, editValue.trim())
    }
    setEditingId(null)
    setEditValue('')
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditValue('')
  }

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      commitEdit()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      cancelEdit()
    }
  }

  // ── Manage view handlers ────────────────────────────

  const handleManageContextMenu = (e: React.MouseEvent, annotationId: string) => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY, annotationId })
  }

  const startRename = (annotationId: string) => {
    const ann = annotations.find(a => a.id === annotationId)
    if (ann) {
      setRenameValue(ann.customName || ann.userMessage)
      setRenamingId(annotationId)
    }
    setContextMenu(null)
  }

  const commitRename = () => {
    if (renamingId && renameValue.trim()) {
      onRenameAnnotation(renamingId, renameValue.trim())
    }
    setRenamingId(null)
    setRenameValue('')
  }

  const handleRenameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      commitRename()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setRenamingId(null)
    }
  }

  const handleDeleteClick = () => {
    if (!contextMenu) return
    const ann = annotations.find(a => a.id === contextMenu.annotationId)
    if (ann) setDeleteTarget(ann)
    setContextMenu(null)
  }

  const handleDeleteConfirm = () => {
    if (!deleteTarget) return
    onDeleteAnnotation(deleteTarget.id)
    setDeleteTarget(null)
  }

  const handleCardClick = (ann: Annotation) => {
    onSelectAnnotationText(ann.selectedText)
    setScrollToAnnotationId(ann.id)
    setViewMode('detail')
  }

  const isInManageView = viewMode === 'manage'
  const currentContextMenuAnnotationId = contextMenu?.annotationId

  const contextMenuItems = contextMenu
    ? (() => {
        const ann = annotations.find(a => a.id === currentContextMenuAnnotationId)
        if (isInManageView) {
          return [
            { label: '重命名', onClick: () => startRename(currentContextMenuAnnotationId!) },
            { label: '删除', onClick: handleDeleteClick, danger: true },
          ]
        }
        if (ann?.type === 'summary') {
          return [
            { label: '重新总结', onClick: () => { onReSummarize(); setContextMenu(null) } },
          ]
        }
        return [
          { label: '定位到原文', onClick: () => {
              if (ann) onLocateAnnotation(ann.selectedText)
              setContextMenu(null)
            }},
          { label: '编辑批注', onClick: () => startEdit(currentContextMenuAnnotationId!) },
        ]
      })()
    : []

  return (
    <div className={styles.middlePanel}>
      {/* Header bar */}
      <div className={styles.headerBar}>
        <button
          className={styles.viewToggleBtn}
          title={isInManageView ? '批注详情' : '批注管理'}
          onClick={() => setViewMode(isInManageView ? 'detail' : 'manage')}
        >
          <img src={isInManageView ? menuIcon : listIcon} alt="" />
        </button>
      </div>

      {/* Selected text display — only in detail view */}
      {viewMode === 'detail' && (
        <div className={styles.selectedTextWrapper}>
          <img className={styles.selectedTextBg} src={selectedTextBg} alt="" />
          <div className={styles.selectedText}>
            {selectedText || '在文献中选中文本后，将在此处显示...'}
          </div>
        </div>
      )}

      {aiError && (
        <div className={styles.errorBar}>
          <span>{aiError}</span>
          <button className={styles.errorDismiss} onClick={onDismissError}>×</button>
        </div>
      )}

      {/* Detail view: chat + input */}
      {viewMode === 'detail' && (
        <>
          <div className={styles.chatArea}>
            {sortedAnnotations.length === 0 && aiStatus === 'idle' && (
              <div className={styles.emptyHint}>
                选中文献文字，在下方输入你的批注或问题，AI 将针对选中内容进行回复
              </div>
            )}

            {(() => {
              let num = 0
              return sortedAnnotations.map((a) => {
              const isSummary = a.type === 'summary'

              if (isSummary) {
                return (
                  <div
                    key={a.id}
                    data-annotation-id={a.id}
                    className={styles.annotationGroup}
                    onContextMenu={(e) => handleContextMenu(e, a.id)}
                  >
                    <div className={styles.summaryLabel}>全文总结</div>
                    <div
                      className={`${styles.bubble} ${styles.summaryBubble} ${styles.clickableBubble}`}
                    >
                      {a.aiResponse || (aiStatus === 'loading' && !a.aiResponse ? '...' : '')}
                    </div>
                    <button
                      className={`${styles.inlineStar} ${a.isFavorite ? styles.favorited : ''}`}
                      title={a.isFavorite ? '取消收藏' : '点亮批注'}
                      onClick={() => onToggleFavorite(a.id)}
                    >
                      <img src={starIcon} alt="" />
                    </button>
                  </div>
                )
              }

              num += 1
              return (
                <div
                  key={a.id}
                  data-annotation-id={a.id}
                  className={styles.annotationGroup}
                  onContextMenu={(e) => handleContextMenu(e, a.id)}
                >
                  <div className={styles.summaryLabel}>{num}</div>
                  {editingId === a.id ? (
                    <div className={`${styles.bubble} ${styles.userBubble} ${styles.editBubble}`}>
                      <textarea
                        ref={editInputRef}
                        className={styles.editInput}
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={handleEditKeyDown}
                        rows={3}
                      />
                      <div className={styles.editActions}>
                        <button className={styles.editSaveBtn} onClick={commitEdit}>保存</button>
                        <button className={styles.editCancelBtn} onClick={cancelEdit}>取消</button>
                      </div>
                    </div>
                  ) : (
                    <div
                      className={`${styles.bubble} ${styles.userBubble} ${styles.clickableBubble}`}
                      onClick={() => { onSelectAnnotationText(a.selectedText); setFollowUpTargetId(a.id) }}
                    >
                      {a.userMessage}
                    </div>
                  )}
                  <div
                    className={`${styles.bubble} ${styles.aiBubble} ${styles.clickableBubble}`}
                    onClick={() => { onSelectAnnotationText(a.selectedText); setFollowUpTargetId(a.id) }}
                  >
                    {a.aiResponse || (aiStatus === 'loading' && !a.aiResponse ? '...' : '')}
                  </div>
                  {a.followUpMessages?.map((msg) => (
                    <div
                      key={msg.id}
                      className={`${styles.bubble} ${msg.role === 'user' ? styles.userBubble : styles.aiBubble}`}
                    >
                      {msg.content}
                    </div>
                  ))}
                  <button
                    className={`${styles.inlineStar} ${a.isFavorite ? styles.favorited : ''}`}
                    title={a.isFavorite ? '取消收藏' : '点亮批注'}
                    onClick={() => onToggleFavorite(a.id)}
                  >
                    <img src={starIcon} alt="" />
                  </button>
                </div>
              )
            })})()}

            <div ref={chatEndRef} />
          </div>

          <div className={styles.inputArea}>
            <textarea
              className={styles.inputField}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="输入你的批注或问题..."
              rows={2}
              disabled={aiStatus === 'loading'}
            />
            <button
              className={styles.sendBtn}
              onClick={handleSend}
              disabled={aiStatus === 'loading' || !inputValue.trim()}
              title="发送"
            >
              <img src={aiReplyIcon} alt="发送" />
            </button>
          </div>
        </>
      )}

      {/* Manage view: annotation list */}
      {viewMode === 'manage' && (
        <div className={styles.manageArea}>
          {sortedAnnotations.length === 0 ? (
            <div className={styles.emptyHint}>
              暂无批注记录
            </div>
          ) : (
            sortedAnnotations.map((a) => (
              <div
                key={a.id}
                className={styles.annotationCard}
                onClick={() => handleCardClick(a)}
                onContextMenu={(e) => handleManageContextMenu(e, a.id)}
              >
                {renamingId === a.id ? (
                  <input
                    className={styles.cardRenameInput}
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onBlur={commitRename}
                    onKeyDown={handleRenameKeyDown}
                    onClick={(e) => e.stopPropagation()}
                    autoFocus
                    onFocus={(e) => e.target.select()}
                  />
                ) : a.type === 'summary' ? (
                  <span style={{ color: '#8B7AA0', fontStyle: 'italic' }}>
                    全文总结
                  </span>
                ) : (
                  a.customName || a.userMessage
                )}
              </div>
            ))
          )}
        </div>
      )}

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
        message={`确定要删除这条批注吗？\n「${(deleteTarget?.customName || deleteTarget?.userMessage?.slice(0, 30)) ?? ''}」`}
        confirmText="确认删除"
        cancelText="取消"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}

export default MiddlePanel
