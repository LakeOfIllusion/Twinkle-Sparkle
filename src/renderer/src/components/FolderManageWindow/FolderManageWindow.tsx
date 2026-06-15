import { useState, useEffect } from 'react'
import { useToast } from '../Toast/Toast'
import styles from './FolderManageWindow.module.css'

interface Props {
  folderId: string
  folderName: string
  onClose: () => void
  onSave: () => void
  onSummarize: (goal: string) => Promise<string>
  onExportCard: () => void
}

const PLACEHOLDER_SUMMARY = '请阅读完文件夹中的所有文献后再点击总结按钮'

function FolderManageWindow({ folderId, folderName, onClose, onSave, onSummarize, onExportCard }: Props) {
  const toast = useToast()
  const [readingGoal, setReadingGoal] = useState('')
  const [summary, setSummary] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)

  useEffect(() => {
    window.electronAPI.getFolderMeta(folderId).then(meta => {
      setReadingGoal(meta.readingGoal)
      setSummary(meta.summary)
    })
  }, [folderId])

  const handleSave = async () => {
    await window.electronAPI.setFolderMeta(folderId, { readingGoal, summary })
    toast.show('已保存', 'success')
    onSave()
    onClose()
  }

  const handleSummarize = async () => {
    setIsGenerating(true)
    try {
      const result = await onSummarize(readingGoal)
      setSummary(result)
    } catch (e: any) {
      toast.show(e.message || '总结生成失败', 'error')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.window} onClick={e => e.stopPropagation()}>
        <h2 className={styles.title}>文件夹管理</h2>

        {/* 阅读目标 */}
        <div className={styles.section}>
          <label className={styles.label}>阅读目标</label>
          <textarea
            className={styles.goalInput}
            value={readingGoal}
            onChange={e => setReadingGoal(e.target.value)}
            placeholder="你希望通过这些文献探索什么、弄懂什么问题？"
            rows={3}
          />
        </div>

        {/* 总结 */}
        <div className={styles.section}>
          <div className={styles.summaryHeader}>
            <label className={styles.label}>阅读总结</label>
            <button
              className={styles.summarizeBtn}
              onClick={handleSummarize}
              disabled={isGenerating}
            >
              {isGenerating ? '生成中...' : summary ? '重新生成' : '生成总结'}
            </button>
          </div>
          <div className={`${styles.summaryBox} ${summary ? '' : styles.summaryEmpty}`}>
            {isGenerating ? (
              <span className={styles.generating}>正在生成总结……</span>
            ) : (
              summary || PLACEHOLDER_SUMMARY
            )}
          </div>
        </div>

        {/* 按钮 */}
        <div className={styles.footer}>
          <button className={`${styles.btn} ${styles.exportCardBtn}`} onClick={onExportCard}>
            导出阅读卡片
          </button>
          <div className={styles.footerRight}>
            <button className={`${styles.btn} ${styles.cancelBtn}`} onClick={onClose}>取消</button>
            <button className={`${styles.btn} ${styles.saveBtn}`} onClick={handleSave}>保存</button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default FolderManageWindow
