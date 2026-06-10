import styles from './ConfirmDialog.module.css'

interface Props {
  visible: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  onConfirm: () => void
  onCancel: () => void
}

function ConfirmDialog({ visible, title, message, confirmText = '确认', cancelText = '取消', onConfirm, onCancel }: Props) {
  if (!visible) return null

  return (
    <div className={styles.overlay} onClick={onCancel}>
      <div className={styles.dialog} onClick={e => e.stopPropagation()}>
        <div className={styles.title}>{title}</div>
        <div className={styles.message}>{message}</div>
        <div className={styles.footer}>
          <button className={styles.cancelBtn} onClick={onCancel}>{cancelText}</button>
          <button className={styles.confirmBtn} onClick={onConfirm}>{confirmText}</button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmDialog
