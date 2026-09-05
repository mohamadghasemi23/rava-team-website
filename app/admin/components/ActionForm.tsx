'use client'

import { FormEvent, ReactNode, useActionState, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import AdminIcon from './AdminIcon'
import { useAdminLocale } from './AdminLocale'

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
  const {language}=useAdminLocale()
  const localized=language==='fa'?{confirmTitle:'تأیید عملیات',confirmMessage:'آیا از انجام این عملیات مطمئن هستید؟',confirmLabel:'بله، انجام شود',cancelLabel:'انصراف',help:'راهنمای این عملیات',success:'انجام شد',error:'خطا',close:'بستن پیام'}:{confirmTitle:'Confirm operation',confirmMessage:'Are you sure you want to run this operation?',confirmLabel:'Yes, continue',cancelLabel:'Cancel',help:'Help for this operation',success:'Completed',error:'Error',close:'Dismiss message'}
  confirmTitle=confirmTitle==='تأیید عملیات'?localized.confirmTitle:confirmTitle
  confirmMessage=confirmMessage==='آیا از انجام این عملیات مطمئن هستید؟'?localized.confirmMessage:confirmMessage
  confirmLabel=confirmLabel==='بله، انجام شود'?localized.confirmLabel:confirmLabel
  cancelLabel=cancelLabel==='انصراف'?localized.cancelLabel:cancelLabel
  const router = useRouter()
  const [state, formAction, pending] = useActionState(action, initialState)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
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
          <button type="button" className="rava-operation-help" onClick={() => setHelpOpen(true)} aria-label={localized.help} title={localized.help}><AdminIcon name="help" size={17}/><span>{localized.help}</span></button>
        </fieldset>
      </form>

      {helpOpen ? (
        <div className="admin-modal-backdrop" role="presentation" onMouseDown={() => setHelpOpen(false)}>
          <div className="admin-modal rava-operation-help-modal" role="dialog" aria-modal="true" aria-labelledby="operation-help-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="admin-modal-icon"><AdminIcon name="help"/></div>
            <h3 id="operation-help-title">{confirmTitle}</h3>
            <p>{confirmMessage}</p>
            <button type="button" className="admin-primary-button" onClick={() => setHelpOpen(false)}>{language==='fa'?'متوجه شدم':'Got it'}</button>
          </div>
        </div>
      ) : null}

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
          <b>{toast.ok ? localized.success : localized.error}</b>
          <span>{toast.message}</span>
          <button type="button" aria-label={localized.close} onClick={() => setToast(null)}>×</button>
        </div>
      ) : null}
    </>
  )
}
