import { useState } from 'react'
import styles from './TitleBar.module.css'
import minimizeIcon from '../../assets/background/minimize.svg'
import maximizeIcon from '../../assets/background/maximize.svg'
import restoreIcon from '../../assets/background/restore.svg'
import closeIcon from '../../assets/background/exit.svg'

interface Props {
  onSettings: () => void
}

function TitleBar({ onSettings }: Props) {
  const [isMaximized, setIsMaximized] = useState(true)

  const handleMinimize = () => window.electronAPI?.minimize()
  const handleMaximize = () => {
    window.electronAPI?.maximize()
    setIsMaximized(!isMaximized)
  }
  const handleClose = () => window.electronAPI?.close()

  return (
    <div className={styles.titleBar}>
      <button className={styles.settingsBtn} onClick={onSettings} title="设置">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3"/>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
        </svg>
      </button>
      <span className={styles.title}>Twinkle Sparkle</span>
      <div className={styles.windowControls}>
        <button className={styles.controlBtn} onClick={handleMinimize} title="最小化">
          <img src={minimizeIcon} alt="最小化" />
        </button>
        <button
          className={styles.controlBtn}
          onClick={handleMaximize}
          title={isMaximized ? '还原' : '最大化'}
        >
          <img src={isMaximized ? restoreIcon : maximizeIcon} alt={isMaximized ? '还原' : '最大化'} />
        </button>
        <button className={styles.controlBtn} onClick={handleClose} title="关闭">
          <img src={closeIcon} alt="关闭" />
        </button>
      </div>
    </div>
  )
}

export default TitleBar
