import { useState, useEffect, useRef } from 'react'
import styles from './LeftPanel.module.css'
import PdfViewer from '../PdfViewer/PdfViewer'
import type { PdfViewerHandle } from '../PdfViewer/PdfViewer'
import deepseekLogo from '../../assets/annotation/deepseek-logo.png'
import aiSummaryIcon from '../../assets/essay reading/check_box.svg'

interface LeftPanelProps {
  filePath?: string
  aiStatus?: 'idle' | 'loading'
  statusMessage?: string
  annotations?: Annotation[]
  onTextSelect?: (text: string, pageNum: number) => void
  scrollToText?: string | null
  onScrollComplete?: () => void
  onSummarize?: () => void
  pdfViewerRef?: React.RefObject<PdfViewerHandle>
}

const LOADING_TEXT = '思考中……'
const DEFAULT_MESSAGE = '让我们开始阅读吧！'

const POOL_FRIENDLY = [
  '我在呢，怎么了？',
  '我也在读呢！',
  '继续阅读吧！',
  '有问题随时问我！',
  '怎么啦？',
]

const POOL_ANNOYED = [
  '别戳我了！',
  '呜哇（>_<）！',
  '不要再戳我了！',
  '不是在读文献吗(O.O)！',
  '刚刚看到哪里来着！？',
  '干嘛(>_<)！',
]

function pickRandom(arr: string[]) {
  return arr[Math.floor(Math.random() * arr.length)]
}

function LeftPanel({
  filePath = '',
  aiStatus = 'idle',
  statusMessage = DEFAULT_MESSAGE,
  annotations = [],
  onTextSelect,
  scrollToText,
  onScrollComplete,
  onSummarize,
  pdfViewerRef,
}: LeftPanelProps) {
  const [typedIdx, setTypedIdx] = useState(0)
  const [funMessage, setFunMessage] = useState('')
  const prevStatus = useRef(aiStatus)
  const typingTimer = useRef<ReturnType<typeof setTimeout>>()
  const clickCountRef = useRef(0)
  const clickTimerRef = useRef<ReturnType<typeof setTimeout>>()
  const funTimerRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    if (aiStatus === 'loading' && prevStatus.current !== 'loading') {
      setTypedIdx(1)
    }
    prevStatus.current = aiStatus
  }, [aiStatus])

  useEffect(() => {
    if (aiStatus !== 'loading') return
    if (typedIdx >= LOADING_TEXT.length) return

    typingTimer.current = setTimeout(() => {
      setTypedIdx(i => i + 1)
    }, 120)
    return () => clearTimeout(typingTimer.current)
  }, [aiStatus, typedIdx])

  const handleAvatarClick = () => {
    clickCountRef.current += 1
    clearTimeout(clickTimerRef.current)
    clearTimeout(funTimerRef.current)

    const pool = clickCountRef.current <= 3 ? POOL_FRIENDLY : POOL_ANNOYED
    setFunMessage(pickRandom(pool))

    funTimerRef.current = setTimeout(() => setFunMessage(''), 3000)
    clickTimerRef.current = setTimeout(() => { clickCountRef.current = 0 }, 2000)
  }

  const displayText = funMessage
    ? funMessage
    : aiStatus === 'loading'
      ? LOADING_TEXT.slice(0, typedIdx)
      : statusMessage

  return (
    <div className={styles.leftPanel}>
      <PdfViewer
        ref={pdfViewerRef}
        filePath={filePath}
        annotations={annotations}
        onTextSelect={onTextSelect}
        scrollToText={scrollToText}
        onScrollComplete={onScrollComplete}
      />
      <div className={styles.statusBar}>
        <img
          src={deepseekLogo}
          alt="DeepSeek"
          onClick={handleAvatarClick}
          style={{ cursor: 'pointer' }}
        />
        <span
          className={`${styles.statusLabel} ${aiStatus === 'loading' ? styles.statusActive : ''}`}
        >
          {displayText || DEFAULT_MESSAGE}
        </span>
        {aiStatus === 'loading' && <span className={styles.spinner} />}
        <div className={styles.toolButtons}>
          <button
            className={styles.toolBtn}
            title="全篇总结"
            onClick={onSummarize}
            disabled={aiStatus === 'loading' || !filePath}
          >
            <img src={aiSummaryIcon} alt="全篇总结" />
          </button>
        </div>
      </div>
    </div>
  )
}

export default LeftPanel
