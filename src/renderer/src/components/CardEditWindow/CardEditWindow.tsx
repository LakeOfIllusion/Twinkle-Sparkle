import { useState, useRef, useCallback } from 'react'
import html2canvas from 'html2canvas'
import styles from './CardEditWindow.module.css'

interface CardAnnotation {
  selectedText: string
  userMessage: string
  aiResponse: string
}

interface Props {
  readingGoalTitle: string
  literatureTitles: string[]
  favoriteAnnotations: CardAnnotation[]
  folderSummary: string
  onClose: () => void
}

interface ColorScheme {
  bg: string
  title: string
  litTitle: string
  other: string
  quoteBox: string
  userBubble: string
  aiBubble: string
  summary: string
}

const COLOR_SCHEMES: ColorScheme[] = [
  {
    bg: '#252545', title: '#FFFFFF', litTitle: '#CCCCCC', other: '#333333',
    quoteBox: '#F8F8F8', userBubble: '#F4F3EE', aiBubble: '#E1E2F3', summary: '#E5DCF5',
  },
  {
    bg: '#FFD0E7', title: '#FFFFFF', litTitle: '#FFF6F6', other: '#CCB2B2',
    quoteBox: '#F8F8F8', userBubble: '#FFECF6', aiBubble: '#E5FDFB', summary: '#D0FFFD',
  },
  {
    bg: '#A696FF', title: '#FFFFFF', litTitle: '#ECE7E7', other: '#9F9595',
    quoteBox: '#F8F8F8', userBubble: '#FFEEDD', aiBubble: '#FFD7CB', summary: '#DBC8FF',
  },
  {
    bg: '#A1C1A1', title: '#FFFFFF', litTitle: '#F3F6F1', other: '#746D6D',
    quoteBox: '#F8F8F8', userBubble: '#DFDAD3', aiBubble: '#D2C4B2', summary: '#D8F0CF',
  },
  {
    bg: '#89CAFF', title: '#FFFFFF', litTitle: '#EFF8FA', other: '#95989F',
    quoteBox: '#F8F8F8', userBubble: '#FFF3E6', aiBubble: '#FFB9A4', summary: '#CCF1FF',
  },
  {
    bg: '#E3E1DD', title: '#7C7373', litTitle: '#8F908E', other: '#716A6A',
    quoteBox: '#F8F8F8', userBubble: '#D9D4CE', aiBubble: '#BCB2A6', summary: '#F0EFEF',
  },
]

function randomIndex(current: number, max: number): number {
  if (max <= 1) return 0
  let next: number
  do {
    next = Math.floor(Math.random() * max)
  } while (next === current)
  return next
}

function CardEditWindow({ readingGoalTitle, literatureTitles, favoriteAnnotations, folderSummary, onClose }: Props) {
  const [title, setTitle] = useState(readingGoalTitle)
  const [summary, setSummary] = useState(folderSummary)
  const [annoIndex, setAnnoIndex] = useState(() => Math.floor(Math.random() * favoriteAnnotations.length))
  const [colorIdx, setColorIdx] = useState(0)
  const [editing, setEditing] = useState<'title' | 'summary' | null>(null)
  const cardRef = useRef<HTMLDivElement>(null)

  const scheme = COLOR_SCHEMES[colorIdx]
  const annotation = favoriteAnnotations[annoIndex] || null
  const hasAnnotations = favoriteAnnotations.length > 0

  const handleSwapAnnotation = useCallback(() => {
    if (favoriteAnnotations.length <= 1) return
    setAnnoIndex(prev => randomIndex(prev, favoriteAnnotations.length))
  }, [favoriteAnnotations.length])

  const handleSwapColor = useCallback(() => {
    setColorIdx(prev => (prev + 1) % COLOR_SCHEMES.length)
  }, [])

  const handleExport = useCallback(async () => {
    if (!cardRef.current) return
    try {
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: null,
        scale: 2,
      })
      const dataUrl = canvas.toDataURL('image/png')
      const link = document.createElement('a')
      link.download = `阅读卡片_${title.slice(0, 20)}.png`
      link.href = dataUrl
      link.click()
    } catch {
      // 导出失败静默处理
    }
  }, [title])

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.window} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.headerTitle}>阅读卡片编辑</h2>
        </div>

        <div className={styles.cardScroll}>
          <div
            ref={cardRef}
            className={styles.card}
            style={{ background: scheme.bg }}
          >
            {/* 阅读目标标题 */}
            {editing === 'title' ? (
              <input
                className={styles.cardTitleInput}
                style={{ color: scheme.title }}
                value={title}
                onChange={e => setTitle(e.target.value)}
                onBlur={() => setEditing(null)}
                onKeyDown={e => { if (e.key === 'Enter') setEditing(null) }}
                autoFocus
              />
            ) : (
              <div
                className={styles.cardTitle}
                style={{ color: scheme.title }}
                onClick={() => setEditing('title')}
              >
                {title}
              </div>
            )}

            {/* 文献名列表 */}
            <div className={styles.literatureList}>
              {literatureTitles.map((t, i) => (
                <div key={i} className={styles.litTitle} style={{ color: scheme.litTitle }}>
                  {t}
                </div>
              ))}
            </div>

            {/* 两栏 */}
            <div className={styles.columns}>
              {/* 左栏：点亮批注 */}
              <div className={styles.leftCol}>
                <div className={styles.colLabel} style={{ color: scheme.litTitle }}>
                  精选批注
                </div>
                {hasAnnotations && annotation ? (
                  <>
                    <div className={styles.quoteBox} style={{ background: scheme.quoteBox, color: scheme.other }}>
                      {annotation.selectedText}
                    </div>
                    <div className={styles.userBubbleCard} style={{ background: scheme.userBubble, color: scheme.other }}>
                      {annotation.userMessage}
                    </div>
                    <div className={styles.aiBubbleCard} style={{ background: scheme.aiBubble, color: scheme.other }}>
                      {annotation.aiResponse}
                    </div>
                  </>
                ) : (
                  <div className={styles.noAnnotations} style={{ color: scheme.other }}>
                    暂无收藏批注
                  </div>
                )}
              </div>

              {/* 右栏：阅读总结 */}
              <div className={styles.rightCol}>
                <div className={styles.colLabel} style={{ color: scheme.litTitle }}>
                  阅读总结
                </div>
                {editing === 'summary' ? (
                  <textarea
                    className={styles.summaryTextarea}
                    style={{ background: scheme.summary, color: scheme.other }}
                    value={summary}
                    onChange={e => setSummary(e.target.value)}
                    onBlur={() => setEditing(null)}
                    autoFocus
                  />
                ) : (
                  <div
                    className={styles.summaryBox}
                    style={{ background: scheme.summary, color: scheme.other }}
                    onClick={() => setEditing('summary')}
                  >
                    {summary || '暂无总结'}
                    <span className={styles.summaryEditHint} style={{ color: scheme.other }}>
                      点击编辑
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 底部按钮 */}
        <div className={styles.footer}>
          <button className={`${styles.btn} ${styles.swapBtn}`} onClick={handleSwapAnnotation}>
            换条批注
          </button>
          <button className={`${styles.btn} ${styles.colorBtn}`} onClick={handleSwapColor}>
            换个配色
          </button>
          <button className={`${styles.btn} ${styles.exportBtn}`} onClick={handleExport}>
            卡片导出
          </button>
        </div>
      </div>
    </div>
  )
}

export default CardEditWindow
