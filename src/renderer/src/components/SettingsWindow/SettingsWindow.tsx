import { useState, useEffect } from 'react'
import { useToast } from '../Toast/Toast'
import styles from './SettingsWindow.module.css'

interface Props {
  onClose: () => void
}

function SettingsWindow({ onClose }: Props) {
  const toast = useToast()
  const [apiKey, setApiKey] = useState('')
  const [storagePath, setStoragePath] = useState('')
  const [model, setModel] = useState<'flash' | 'pro'>('flash')

  useEffect(() => {
    window.electronAPI.getSettings().then(s => {
      setApiKey(s.apiKey)
      setStoragePath(s.storagePath)
      setModel(s.model)
    })
  }, [])

  const handleSave = () => {
    window.electronAPI.setSettings({ apiKey, storagePath, model }).then(() => {
      toast.show('设置已保存', 'success')
      onClose()
    })
  }

  const handleBrowse = async () => {
    const result = await window.electronAPI.selectFolder()
    if (result) setStoragePath(result)
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.window} onClick={e => e.stopPropagation()}>
        <h2 className={styles.title}>设置</h2>

        {/* API Key */}
        <div className={styles.section}>
          <label className={styles.label}>API Key</label>
          <input
            className={styles.input}
            type="password"
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            placeholder="输入 API Key"
          />
        </div>

        {/* 文件存储路径 */}
        <div className={styles.section}>
          <label className={styles.label}>文献存储路径</label>
          <div className={styles.pathRow}>
            <input
              className={styles.pathInput}
              value={storagePath}
              onChange={e => setStoragePath(e.target.value)}
              placeholder="选择文献存储路径"
              readOnly
            />
            <button className={styles.browseBtn} onClick={handleBrowse} title="浏览文件夹">
              …
            </button>
          </div>
        </div>

        {/* 模型选择 */}
        <div className={styles.section}>
          <label className={styles.label}>模型选择</label>
          <div className={styles.modelRow}>
            <button
              className={`${styles.modelBtn} ${model === 'flash' ? styles.modelBtnActive : ''}`}
              onClick={() => setModel('flash')}
            >
              DeepSeek Flash
            </button>
            <button
              className={`${styles.modelBtn} ${model === 'pro' ? styles.modelBtnActive : ''}`}
              onClick={() => setModel('pro')}
            >
              DeepSeek Pro
            </button>
          </div>
        </div>

        {/* 按钮 */}
        <div className={styles.footer}>
          <button className={`${styles.btn} ${styles.cancelBtn}`} onClick={onClose}>取消</button>
          <button className={`${styles.btn} ${styles.saveBtn}`} onClick={handleSave}>保存</button>
        </div>
      </div>
    </div>
  )
}

export default SettingsWindow
