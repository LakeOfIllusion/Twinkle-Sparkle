import { useState, useEffect, useRef } from 'react'
import TitleBar from './components/TitleBar/TitleBar'
import LeftPanel from './components/LeftPanel/LeftPanel'
import MiddlePanel from './components/MiddlePanel/MiddlePanel'
import RightPanel from './components/RightPanel/RightPanel'
import SettingsWindow from './components/SettingsWindow/SettingsWindow'
import FolderManageWindow from './components/FolderManageWindow/FolderManageWindow'
import ConfirmDialog from './components/ConfirmDialog/ConfirmDialog'
import { chat, buildAnnotationPrompt, buildStatusPrompt, buildSummaryPrompt, buildFollowUpPrompt, buildFolderSummaryPrompt, buildReadingGoalTitle } from './api/deepseek'
import type { FolderDocInfo } from './api/deepseek'
import type { PdfViewerHandle } from './components/PdfViewer/PdfViewer'
import CardEditWindow from './components/CardEditWindow/CardEditWindow'
import styles from './App.module.css'

type AIStatus = 'idle' | 'loading'

function App() {
  const [showSettings, setShowSettings] = useState(false)
  const [selectedText, setSelectedText] = useState('')
  const [selectedPageNum, setSelectedPageNum] = useState(1)
  const [literature, setLiterature] = useState<LiteratureItem[]>([])
  const [activeLiteratureId, setActiveLiteratureId] = useState<string | null>(null)
  const [annotations, setAnnotations] = useState<Annotation[]>([])
  const [aiStatus, setAIStatus] = useState<AIStatus>('idle')
  const [statusMessage, setStatusMessage] = useState('让我们开始阅读吧！')
  const [aiError, setAIError] = useState<string | null>(null)
  const [scrollToText, setScrollToText] = useState<string | null>(null)
  const [isSummarizing, setIsSummarizing] = useState(false)
  const [showSummaryConfirm, setShowSummaryConfirm] = useState(false)
  const [focusAnnotationId, setFocusAnnotationId] = useState<string | null>(null)
  const pdfViewerRef = useRef<PdfViewerHandle>(null)
  const [manageFolder, setManageFolder] = useState<LiteratureItem | null>(null)
  const [cardEditData, setCardEditData] = useState<{
    readingGoalTitle: string
    literatureTitles: string[]
    favoriteAnnotations: { selectedText: string; userMessage: string; aiResponse: string }[]
    folderSummary: string
  } | null>(null)

  useEffect(() => {
    window.electronAPI.getLiterature().then(setLiterature)
  }, [])

  useEffect(() => {
    if (activeLiteratureId && !literature.some(l => l.id === activeLiteratureId)) {
      setActiveLiteratureId(null)
    }
  }, [literature, activeLiteratureId])

  useEffect(() => {
    if (activeLiteratureId) {
      window.electronAPI.getAnnotations(activeLiteratureId).then(setAnnotations)
    } else {
      setAnnotations([])
    }
    setSelectedText('')
    setStatusMessage('让我们开始阅读吧！')
  }, [activeLiteratureId])

  const activeFilePath = literature.find(l => l.id === activeLiteratureId)?.filePath ?? ''

  const handleLiteratureSelect = (item: LiteratureItem) => {
    setActiveLiteratureId(item.id)
  }

  const handleLiteratureChange = (items: LiteratureItem[]) => {
    setLiterature(items)
  }

  const handleTextSelect = (text: string, pageNum: number) => {
    setSelectedText(text)
    setSelectedPageNum(pageNum)
  }

  const handleSendMessage = async (userMessage: string) => {
    if (!activeLiteratureId || aiStatus === 'loading') return

    const settings = await window.electronAPI.getSettings()
    if (!settings.apiKey) {
      setAIError('请先在设置中配置 API Key')
      return
    }

    const annotationId = Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
    const pending: Annotation = {
      id: annotationId,
      literatureId: activeLiteratureId,
      selectedText,
      userMessage,
      aiResponse: '',
      isFavorite: false,
      createdAt: new Date().toISOString(),
      pageNum: selectedPageNum,
    }

    const pendingList = await window.electronAPI.addAnnotation(pending)
    setAnnotations(pendingList)
    setAIStatus('loading')
    setAIError(null)

    try {
      const activeItem = literature.find(l => l.id === activeLiteratureId)
      const parentFolderId = activeItem?.parentId
      let readingGoal = ''
      if (parentFolderId) {
        readingGoal = (await window.electronAPI.getFolderMeta(parentFolderId)).readingGoal
      }
      const messages = buildAnnotationPrompt(selectedText, userMessage, readingGoal || undefined)
      const aiResponse = await chat(messages, {
        apiKey: settings.apiKey,
        model: settings.model,
      })

      const updated = await window.electronAPI.updateAnnotation(annotationId, activeLiteratureId, { aiResponse })
      setAnnotations(updated)
      setFocusAnnotationId(annotationId)

      try {
        const statusMessages = buildStatusPrompt(selectedText, aiResponse)
        const companionMsg = await chat(statusMessages, {
          apiKey: settings.apiKey,
          model: 'flash',
        })
        setStatusMessage(companionMsg.slice(0, 30))
      } catch {
        setStatusMessage('批注已完成')
      }
    } catch (e: any) {
      setAIError(e.message || 'AI 请求失败')
    } finally {
      setAIStatus('idle')
    }
  }

  const handleFollowUp = async (annotationId: string, question: string) => {
    if (!activeLiteratureId || aiStatus === 'loading') return

    const annotation = annotations.find(a => a.id === annotationId)
    if (!annotation) return

    const settings = await window.electronAPI.getSettings()
    if (!settings.apiKey) {
      setAIError('请先在设置中配置 API Key')
      return
    }

    const userMsg: FollowUpMessage = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
      role: 'user',
      content: question,
      createdAt: new Date().toISOString(),
    }

    const followUpMessages = [...(annotation.followUpMessages || []), userMsg]
    const updatedWithUser = await window.electronAPI.updateAnnotation(annotationId, activeLiteratureId, { followUpMessages })
    setAnnotations(updatedWithUser)
    setAIStatus('loading')
    setAIError(null)

    try {
      const activeLit = literature.find(l => l.id === activeLiteratureId)
      const parentFid = activeLit?.parentId
      let fGoal = ''
      if (parentFid) {
        fGoal = (await window.electronAPI.getFolderMeta(parentFid)).readingGoal
      }
      const messages = buildFollowUpPrompt(
        annotation.selectedText,
        annotation.userMessage,
        annotation.aiResponse,
        followUpMessages.slice(0, -1),
        question,
        fGoal || undefined
      )
      const aiReply = await chat(messages, {
        apiKey: settings.apiKey,
        model: settings.model,
      })

      const aiMsg: FollowUpMessage = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
        role: 'assistant',
        content: aiReply,
        createdAt: new Date().toISOString(),
      }

      const final = await window.electronAPI.updateAnnotation(annotationId, activeLiteratureId, {
        followUpMessages: [...followUpMessages, aiMsg],
      })
      setAnnotations(final)

      try {
        const statusMessages = buildStatusPrompt(annotation.selectedText, aiReply)
        const companionMsg = await chat(statusMessages, {
          apiKey: settings.apiKey,
          model: 'flash',
        })
        setStatusMessage(companionMsg.slice(0, 30))
      } catch {
        setStatusMessage('追问已完成')
      }
    } catch (e: any) {
      setAIError(e.message || 'AI 请求失败')
    } finally {
      setAIStatus('idle')
    }
  }

  const handleToggleFavorite = async (annotationId: string) => {
    if (!activeLiteratureId) return
    const updated = await window.electronAPI.toggleFavorite(annotationId, activeLiteratureId)
    setAnnotations(updated)
  }

  const handleLocateAnnotation = (annotationSelectedText: string) => {
    setScrollToText(null)
    setTimeout(() => setScrollToText(annotationSelectedText), 0)
  }

  const handleSelectAnnotationText = (text: string) => {
    setSelectedText(text)
  }

  const handleDeleteAnnotation = async (annotationId: string) => {
    if (!activeLiteratureId) return
    const updated = await window.electronAPI.removeAnnotation(annotationId, activeLiteratureId)
    setAnnotations(updated)
  }

  const handleRenameAnnotation = async (annotationId: string, customName: string) => {
    if (!activeLiteratureId) return
    const updated = await window.electronAPI.updateAnnotation(annotationId, activeLiteratureId, { customName })
    setAnnotations(updated)
  }

  const doSummarize = async () => {
    if (!activeLiteratureId || aiStatus === 'loading') return

    const settings = await window.electronAPI.getSettings()
    if (!settings.apiKey) {
      setAIError('请先在设置中配置 API Key')
      return
    }

    const fullText = pdfViewerRef.current?.getFullText()
    if (!fullText) {
      setAIError('无法获取文献全文，请确认 PDF 已加载')
      return
    }

    setIsSummarizing(true)
    setAIStatus('loading')
    setAIError(null)

    const existingSummary = annotations.find(a => a.type === 'summary')
    if (existingSummary) {
      await window.electronAPI.removeAnnotation(existingSummary.id, activeLiteratureId)
    }

    const summaryId = Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
    const pending: Annotation = {
      id: summaryId,
      literatureId: activeLiteratureId,
      selectedText: '',
      userMessage: '',
      aiResponse: '',
      isFavorite: false,
      createdAt: new Date().toISOString(),
      type: 'summary',
    }

    try {
      const pendingList = await window.electronAPI.addAnnotation(pending)
      setAnnotations(pendingList)

      const messages = buildSummaryPrompt(fullText, pendingList)
      const aiResponse = await chat(messages, {
        apiKey: settings.apiKey,
        model: settings.model,
      })

      const updated = await window.electronAPI.updateAnnotation(summaryId, activeLiteratureId, { aiResponse })
      setAnnotations(updated)
      setFocusAnnotationId(summaryId)

      try {
        const statusMessages = buildStatusPrompt('全文总结', aiResponse)
        const companionMsg = await chat(statusMessages, {
          apiKey: settings.apiKey,
          model: 'flash',
        })
        setStatusMessage(companionMsg.slice(0, 30))
      } catch {
        setStatusMessage('全文总结已完成')
      }
    } catch (e: any) {
      setAIError(e.message || 'AI 请求失败')
      await window.electronAPI.removeAnnotation(summaryId, activeLiteratureId)
      const restored = await window.electronAPI.getAnnotations(activeLiteratureId)
      setAnnotations(restored)
    } finally {
      setAIStatus('idle')
      setIsSummarizing(false)
    }
  }

  const handleSummarize = async () => {
    if (!activeLiteratureId || aiStatus === 'loading' || isSummarizing) return
    setShowSummaryConfirm(true)
  }

  const handleSummaryConfirm = async () => {
    setShowSummaryConfirm(false)
    await doSummarize()
  }

  const handleReSummarize = async () => {
    await doSummarize()
  }

  const handleFolderSummarize = async (folderId: string, readingGoal: string): Promise<string> => {
    const settings = await window.electronAPI.getSettings()
    if (!settings.apiKey) throw new Error('请先在设置中配置 API Key')

    const children = literature.filter(l => l.parentId === folderId)
    const docs: FolderDocInfo[] = []

    for (const child of children) {
      const anns = await window.electronAPI.getAnnotations(child.id)
      docs.push({
        title: child.title,
        annotations: anns
          .filter(a => a.type !== 'summary')
          .map(a => ({
            selectedText: a.selectedText,
            userMessage: a.userMessage,
            aiResponse: a.aiResponse,
          })),
      })
    }

    const messages = buildFolderSummaryPrompt(readingGoal, docs)
    return chat(messages, { apiKey: settings.apiKey, model: settings.model })
  }

  const handleExportCard = async (folderId: string) => {
    const settings = await window.electronAPI.getSettings()
    if (!settings.apiKey) {
      setAIError('请先在设置中配置 API Key')
      return
    }

    const meta = await window.electronAPI.getFolderMeta(folderId)
    const children = literature.filter(l => l.parentId === folderId)
    const literatureTitles = children.map(c => c.title)

    const favoriteAnnotations: { selectedText: string; userMessage: string; aiResponse: string }[] = []
    for (const child of children) {
      const anns = await window.electronAPI.getAnnotations(child.id)
      anns.filter(a => a.isFavorite && a.selectedText && a.aiResponse).forEach(a => {
        favoriteAnnotations.push({
          selectedText: a.selectedText,
          userMessage: a.userMessage,
          aiResponse: a.aiResponse,
        })
      })
    }

    if (favoriteAnnotations.length === 0) {
      setAIError('该文件夹下没有已收藏的批注，请先点亮批注后再导出阅读卡片')
      return
    }

    let title: string
    if (meta.readingGoal) {
      try {
        const titleMessages = buildReadingGoalTitle(meta.readingGoal)
        title = await chat(titleMessages, { apiKey: settings.apiKey, model: 'flash' })
      } catch {
        title = meta.readingGoal.slice(0, 20)
      }
    } else {
      title = '阅读卡片'
    }

    setManageFolder(null)
    setCardEditData({
      readingGoalTitle: title,
      literatureTitles,
      favoriteAnnotations,
      folderSummary: meta.summary || '',
    })
  }

  return (
    <div className={styles.app}>
      <TitleBar onSettings={() => setShowSettings(true)} />
      <div className={styles.mainArea}>
        <div className={styles.leftPanel}>
          <LeftPanel
            pdfViewerRef={pdfViewerRef}
            filePath={activeFilePath}
            aiStatus={aiStatus}
            statusMessage={statusMessage}
            annotations={annotations}
            onTextSelect={handleTextSelect}
            scrollToText={scrollToText}
            onScrollComplete={() => setScrollToText(null)}
            onSummarize={handleSummarize}
          />
        </div>
        <div className={styles.middlePanel}>
          <MiddlePanel
            selectedText={selectedText}
            annotations={annotations}
            aiStatus={aiStatus}
            aiError={aiError}
            focusAnnotationId={focusAnnotationId}
            onSendMessage={handleSendMessage}
            onToggleFavorite={handleToggleFavorite}
            onLocateAnnotation={handleLocateAnnotation}
            onSelectAnnotationText={handleSelectAnnotationText}
            onDismissError={() => setAIError(null)}
            onDeleteAnnotation={handleDeleteAnnotation}
            onRenameAnnotation={handleRenameAnnotation}
            onReSummarize={handleReSummarize}
            onFollowUp={handleFollowUp}
          />
        </div>
        <div className={styles.rightPanel}>
          <RightPanel
            literature={literature}
            activeLiteratureId={activeLiteratureId}
            onSelectLiterature={handleLiteratureSelect}
            onLiteratureChange={handleLiteratureChange}
            onManageFolder={setManageFolder}
          />
        </div>
      </div>
      {showSettings && <SettingsWindow onClose={() => setShowSettings(false)} />}
      {manageFolder && (
        <FolderManageWindow
          folderId={manageFolder.id}
          folderName={manageFolder.title}
          onClose={() => setManageFolder(null)}
          onSave={() => {}}
          onSummarize={(goal) => handleFolderSummarize(manageFolder.id, goal)}
          onExportCard={() => handleExportCard(manageFolder.id)}
        />
      )}
      {cardEditData && (
        <CardEditWindow
          readingGoalTitle={cardEditData.readingGoalTitle}
          literatureTitles={cardEditData.literatureTitles}
          favoriteAnnotations={cardEditData.favoriteAnnotations}
          folderSummary={cardEditData.folderSummary}
          onClose={() => setCardEditData(null)}
        />
      )}
      <ConfirmDialog
        visible={showSummaryConfirm}
        title="全文总结"
        message="要对这篇文章进行总结吗？"
        confirmText="确定"
        cancelText="取消"
        onConfirm={handleSummaryConfirm}
        onCancel={() => setShowSummaryConfirm(false)}
      />
    </div>
  )
}

export default App
