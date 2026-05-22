import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'

interface CreatePlaylistModalProps {
  open: boolean
  onClose: () => void
  onCreate: (name: string) => void
}

export function CreatePlaylistModal({
  open,
  onClose,
  onCreate,
}: CreatePlaylistModalProps) {
  const [name, setName] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setName('')
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  if (!open) return null

  const submit = () => {
    const trimmed = name.trim()
    if (!trimmed) return
    onCreate(trimmed)
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose} role="presentation">
      <div
        className="modal"
        role="dialog"
        aria-labelledby="create-playlist-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal__header">
          <h2 id="create-playlist-title" className="modal__title">
            New Playlist
          </h2>
          <button
            type="button"
            className="modal__close"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={18} strokeWidth={1.75} />
          </button>
        </div>
        <p className="modal__desc">
          Create an empty playlist, then add videos one by one. The first video
          you add appears at the top.
        </p>
        <input
          ref={inputRef}
          type="text"
          className="modal__input"
          placeholder="Playlist name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit()
            if (e.key === 'Escape') onClose()
          }}
          maxLength={80}
        />
        <div className="modal__actions">
          <button type="button" className="modal__btn modal__btn--ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="modal__btn modal__btn--primary"
            onClick={submit}
            disabled={!name.trim()}
          >
            Create
          </button>
        </div>
      </div>
    </div>
  )
}
