import { useEffect } from 'react'
import { createPortal } from 'react-dom'

interface ToastProps {
  message: string
  type: 'success' | 'error'
  onClose: () => void
}

export function Toast({ message, type, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000)
    return () => clearTimeout(timer)
  }, [onClose])

  return createPortal(
    <div className={`toast toast-${type}`} role="alert">
      {message}
    </div>,
    document.body,
  )
}
