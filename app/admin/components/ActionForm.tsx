'use client'

import { FormEvent, ReactNode, useActionState, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

export type AdminActionState = {
  ok?: boolean
  message?: string
  redirectTo?: string
  nonce?: number
}

type Action = (state: AdminActionState, formData: FormData) => Promise<AdminActionState>

type Props = {
  action: Action
  children: ReactNode
  className?: string
  confirmTitle?: string
  confirmMessage?: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
}

const initialState: AdminActionState = {}

export default function ActionForm({
  action,
  children,
  className,
  confirmTitle = 'تأیید عملیات',
  confirmMessage = 'آیا از انجام این عملیات مطمئن هستید؟',
  confirmLabel = 'بله، انجام شود',
  cancelLabel = 'انصراف',
  danger = false,
}: Props) {
  const router = useRouter()
  const [state, formAction, pending] = useActionState(action, initialState)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [toast, setToast] = useState<AdminActionState | null>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const allowSubmit = useRef(false)

  useEffect(() => {
    if (!state.message) return
    setToast(state)
    if (state.ok && state.redirectTo) {
      const timer = window.setTimeout(() => router.push(state.redirectTo!), 700)
      return () => window.clearTimeout(timer)
    }
    if (state.ok) router.refresh()
  }, [state, router])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 4200)
    return () => window.clearTimeout(timer)
  }, [toast])

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    if (allowSubmit.current) {
      allowSubmit.current = false
      return
    }
    event.preventDefault()
    if (!pending) setConfirmOpen(true)
  }

  function confirm() {
    setConfirmOpen(false)
    allowSubmit.current = true
    formRef.current?.requestSubmit()
  }

  return (
    <>
      <form ref={formRef} action={formAction} onSubmit={onSubmit} className={className} aria-busy={pending}>
        <fieldset disabled={pending} className="admin-action-fieldset">
          {children}
        </fieldset>
      </form>

      {confirmOpen ? (
        <div className="admin-modal-backdrop" role="presentation" onMouseDown={() => setConfirmOpen(false)}>
          <div className={`admin-modal ${danger ? 'admin-modal-danger' : ''}`} role="dialog" aria-modal="true" aria-labelledby="admin-confirm-title" onMouseDown={(e) => e.stopPropagation()}>
            <div className="admin-modal-icon">{danger ? '!' : '✓'}</div>
            <h3 id="admin-confirm-title">{confirmTitle}</h3>
            <p>{confirmMessage}</p>
            <div className="admin-modal-actions">
              <button type="button" className={danger ? 'admin-danger-button' : 'admin-primary-button'} onClick={confirm}>{confirmLabel}</button>
              <button type="button" className="admin-muted-button" onClick={() => setConfirmOpen(false)}>{cancelLabel}</button>
            </div>
          </div>
        </div>
      ) : null}

      {toast ? (
        <div className={`admin-toast ${toast.ok ? 'admin-toast-success' : 'admin-toast-error'}`} role="status" aria-live="polite">
          <b>{toast.ok ? 'انجام شد' : 'خطا'}</b>
          <span>{toast.message}</span>
          <button type="button" aria-label="بستن پیام" onClick={() => setToast(null)}>×</button>
        </div>
      ) : null}
    </>
  )
}
