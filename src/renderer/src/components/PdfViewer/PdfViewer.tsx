import { useEffect, useLayoutEffect, useState, useCallback, useRef, useMemo, forwardRef, useImperativeHandle } from 'react'
import * as pdfjsLib from 'pdfjs-dist'
import styles from './PdfViewer.module.css'

pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'

interface TextItem {
  str: string
  left: number
  top: number
  fontSize: number
  scaleX: number
}

interface PageData {
  pageNum: number
  width: number
  height: number
  imageUrl: string
  textItems: TextItem[]
}

export interface PdfViewerHandle {
  getFullText: () => string
}

interface PdfViewerProps {
  filePath: string
  annotations?: Annotation[]
  onTextSelect?: (text: string, pageNum: number) => void
  scrollToText?: string | null
  onScrollComplete?: () => void
}

const MIN_ZOOM = 1.0
const MAX_ZOOM = 3.0
const ZOOM_STEP = 0.08
const RENDER_DEBOUNCE = 60

function findHighlightIndices(textItems: TextItem[], annotations: Annotation[]): Set<number> {
  const result = new Set<number>()
  if (annotations.length === 0) return result

  const fullText = textItems.map(t => t.str).join('')
  const itemRanges: { idx: number; start: number; end: number }[] = []
  let pos = 0
  for (let i = 0; i < textItems.length; i++) {
    const len = textItems[i].str.length
    itemRanges.push({ idx: i, start: pos, end: pos + len })
    pos += len
  }

  for (const ann of annotations) {
    if (!ann.selectedText) continue
    let searchFrom = 0
    while (searchFrom < fullText.length) {
      const found = fullText.indexOf(ann.selectedText, searchFrom)
      if (found === -1) break
      const matchEnd = found + ann.selectedText.length
      for (const r of itemRanges) {
        if (r.start < matchEnd && r.end > found) {
          result.add(r.idx)
        }
      }
      searchFrom = found + 1
    }
  }

  return result
}

function findTextPage(pages: PageData[], text: string): number {
  for (const page of pages) {
    const fullText = page.textItems.map(t => t.str).join('')
    if (fullText.includes(text)) return page.pageNum
  }
  return 1
}

const PdfViewer = forwardRef<PdfViewerHandle, PdfViewerProps>(function PdfViewer(
  { filePath, annotations = [], onTextSelect, scrollToText, onScrollComplete }, ref
) {
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null)
  const [pages, setPages] = useState<PageData[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [zoom, setZoom] = useState(1)
  const [renderZoom, setRenderZoom] = useState(1)
  const [flashText, setFlashText] = useState<string | null>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const zoomTimerRef = useRef<ReturnType<typeof setTimeout>>()
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map())

  useImperativeHandle(ref, () => ({
    getFullText: () => pages.map(p => p.textItems.map(t => t.str).join('')).join('\n')
  }), [pages])

  const highlightMaps = useMemo(() => {
    return pages.map(page => findHighlightIndices(page.textItems, annotations))
  }, [pages, annotations])

  const favoriteHighlightMaps = useMemo(() => {
    const favAnnotations = annotations.filter(a => a.isFavorite && a.selectedText)
    return pages.map(page => findHighlightIndices(page.textItems, favAnnotations))
  }, [pages, annotations])

  useEffect(() => {
    if (!filePath) {
      setPdfDoc(null)
      setPages([])
      return
    }

    let cancelled = false
    setLoading(true)
    setError('')
    setPages([])
    setPdfDoc(null)
    setZoom(1)
    setRenderZoom(1)
    setFlashText(null)

    async function load() {
      try {
        const b64 = await window.electronAPI.readPdf(filePath)
        if (cancelled) return

        if (!b64) {
          if (!cancelled) { setError('无法读取 PDF 文件，请检查文件路径'); setLoading(false) }
          return
        }

        const binary = atob(b64)
        const bytes = new Uint8Array(binary.length)
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i)
        }

        const doc = await pdfjsLib.getDocument({ data: bytes }).promise
        if (!cancelled) {
          setPdfDoc(doc)
        }
      } catch (err) {
        if (!cancelled) {
          setError(`加载失败: ${err instanceof Error ? err.message : String(err)}`)
          setLoading(false)
        }
      }
    }

    load()
    return () => { cancelled = true }
  }, [filePath])

  useEffect(() => {
    if (!pdfDoc) return

    let cancelled = false

    async function renderPages() {
      setLoading(true)
      pageRefs.current.clear()

      try {
        const loadedPages: PageData[] = []
        const wrapperWidth = wrapperRef.current?.clientWidth || 700
        const PADDING = 24
        const containerWidth = wrapperWidth - 16

        for (let i = 1; i <= pdfDoc!.numPages; i++) {
          if (cancelled) return
          const page = await pdfDoc!.getPage(i)
          const baseViewport = page.getViewport({ scale: 1 })
          const baseScale = (containerWidth - PADDING * 2) / baseViewport.width
          const scale = baseScale * renderZoom
          const viewport = page.getViewport({ scale })

          const canvas = document.createElement('canvas')
          canvas.width = Math.round(viewport.width * window.devicePixelRatio)
          canvas.height = Math.round(viewport.height * window.devicePixelRatio)
          const ctx = canvas.getContext('2d')!
          ctx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0)
          await page.render({ canvasContext: ctx, viewport }).promise

          const imageUrl = canvas.toDataURL('image/png')

          const textContent = await page.getTextContent()
          const textItems: TextItem[] = []

          for (const item of textContent.items) {
            if (!('str' in item) || !item.str.trim()) continue
            const tx = pdfjsLib.Util.transform(viewport.transform, item.transform)
            const fontSize = Math.abs(tx[3]) || Math.abs(item.height * viewport.scale)
            textItems.push({
              str: item.str,
              left: tx[4],
              top: tx[5] - fontSize,
              fontSize: Math.round(fontSize * 100) / 100,
              scaleX: tx[0] !== fontSize && tx[0] > 0 && fontSize > 0 ? tx[0] / fontSize : 1
            })
          }

          loadedPages.push({
            pageNum: i,
            width: viewport.width,
            height: viewport.height,
            imageUrl,
            textItems
          })
        }

        if (!cancelled) { setPages(loadedPages); setLoading(false) }
      } catch (err) {
        if (!cancelled) {
          setError(`渲染失败: ${err instanceof Error ? err.message : String(err)}`)
          setLoading(false)
        }
      }
    }

    renderPages()
    return () => { cancelled = true }
  }, [pdfDoc, renderZoom])

  useEffect(() => {
    const wrapper = wrapperRef.current
    if (!wrapper) return

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault()
        setZoom(prev => {
          const delta = -e.deltaY * ZOOM_STEP
          const next = prev + delta
          const clamped = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, Math.round(next * 100) / 100))

          clearTimeout(zoomTimerRef.current)
          zoomTimerRef.current = setTimeout(() => {
            setRenderZoom(clamped)
          }, RENDER_DEBOUNCE)

          return clamped
        })
      }
    }

    wrapper.addEventListener('wheel', handleWheel, { passive: false })
    return () => {
      wrapper.removeEventListener('wheel', handleWheel)
      clearTimeout(zoomTimerRef.current)
    }
  }, [])

  useEffect(() => {
    if (!scrollToText || pages.length === 0) return

    const targetPage = findTextPage(pages, scrollToText)
    const pageEl = pageRefs.current.get(targetPage)
    if (pageEl) {
      pageEl.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
    setFlashText(scrollToText)
  }, [scrollToText, pages])

  useLayoutEffect(() => {
    if (pages.length === 0) return
    const wrapper = wrapperRef.current
    if (!wrapper) return
    const pageWidth = pages[0].width
    if (pageWidth <= wrapper.clientWidth) return
    requestAnimationFrame(() => {
      wrapper.scrollLeft = (wrapper.scrollWidth - wrapper.clientWidth) / 2
    })
  }, [pages])

  const handleMouseUp = useCallback(() => {
    setTimeout(() => {
      const sel = window.getSelection()
      if (!sel || sel.isCollapsed) return
      const text = sel.toString().trim()
      if (!text || !onTextSelect) return

      let pageNum = 1
      const anchorNode = sel.anchorNode
      if (anchorNode) {
        const textLayer = (anchorNode as Element).closest?.('[data-page]')
        if (textLayer) {
          pageNum = parseInt(textLayer.getAttribute('data-page') || '1')
        }
      }

      onTextSelect(text, pageNum)
    }, 0)
  }, [onTextSelect])

  const handleFlashEnd = () => {
    setFlashText(null)
    onScrollComplete?.()
  }

  const visualScale = zoom / renderZoom
  const needsMargin = visualScale > 1

  return (
    <div ref={wrapperRef} className={styles.wrapper} onMouseUp={handleMouseUp}>
      <div className={styles.container}>
        {pages.map((page, pageIdx) => (
          <div
            key={page.pageNum}
            ref={(el) => {
              if (el) pageRefs.current.set(page.pageNum, el)
              else pageRefs.current.delete(page.pageNum)
            }}
            className={styles.pageWrapper}
            style={needsMargin ? {
              marginBottom: page.height * (visualScale - 1),
              marginLeft: (page.width * (visualScale - 1)) / 2,
              marginRight: (page.width * (visualScale - 1)) / 2,
            } : undefined}
          >
            <div
              className={styles.pageInner}
              style={{
                width: page.width,
                height: page.height,
                transform: `scale(${visualScale})`,
                transformOrigin: 'top center',
              }}
            >
              <img
                src={page.imageUrl}
                alt={`第 ${page.pageNum} 页`}
                style={{ width: page.width, height: page.height }}
              />
              <div
                className={styles.textLayer}
                data-page={page.pageNum}
                style={{ width: page.width, height: page.height }}
              >
                {page.textItems.map((item, idx) => {
                  const isHighlighted = highlightMaps[pageIdx]?.has(idx)
                  const isFavorite = favoriteHighlightMaps[pageIdx]?.has(idx)
                  const isFlashing = flashText
                    ? page.textItems.map(t => t.str).join('').includes(flashText) && isHighlighted
                    : false

                  return (
                    <span
                      key={idx}
                      className={[
                        isHighlighted ? styles.highlighted : '',
                        isFavorite ? styles.favoriteHighlighted : '',
                        isFlashing ? styles.flashHighlight : ''
                      ].filter(Boolean).join(' ') || undefined}
                      style={{
                        position: 'absolute',
                        left: item.left,
                        top: item.top,
                        fontSize: item.fontSize,
                        fontFamily: 'serif',
                        color: 'transparent',
                        pointerEvents: 'auto',
                        transform: item.scaleX !== 1 ? `scaleX(${item.scaleX})` : undefined,
                        transformOrigin: item.scaleX !== 1 ? 'left bottom' : undefined
                      }}
                      onAnimationEnd={isFlashing ? handleFlashEnd : undefined}
                    >
                      {item.str}
                    </span>
                  )
                })}
              </div>
            </div>
          </div>
        ))}
        {pages.length > 0 && (
          <div className={styles.endMark}>—— 共 {pages.length} 页 ——</div>
        )}
      </div>
      {(zoom !== renderZoom || loading) && (
        <div className={styles.loading}>
          <span className={styles.spinner} />
          加载中...
        </div>
      )}
      {error && <div className={styles.placeholder}>{error}</div>}
      {!filePath && !loading && !error && (
        <div className={styles.placeholder}>请从右侧选择文献以开始阅读</div>
      )}
    </div>
  )
})

export default PdfViewer
