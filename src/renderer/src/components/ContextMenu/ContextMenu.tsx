import { useEffect } from 'react'
import styles from './ContextMenu.module.css'

export interface ContextMenuItem {
  label: string
  onClick: () => void
  danger?: boolean
}

interface Props {
  x: number
  y: number
  items: ContextMenuItem[]
  onClose: () => void
}

function ContextMenu({ x, y, items, onClose }: Props) {
  useEffect(() => {
    const handler = () => onClose()
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [onClose])

  return (
    <div className={styles.menu} style={{ left: x, top: y }}>
      {items.map((item, idx) => (
        <div
          key={idx}
          className={`${styles.item} ${item.danger ? styles.danger : ''}`}
          onClick={item.onClick}
        >
          {item.label}
        </div>
      ))}
    </div>
  )
}

export default ContextMenu
