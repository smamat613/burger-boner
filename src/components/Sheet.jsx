import { C, F_MONO } from '../theme.js'
import { IconX } from './icons.jsx'

export function Sheet({ title, onClose, children }) {
  return (
    <div
      className="absolute inset-0 flex items-end"
      style={{ background: 'rgba(34,30,27,0.45)', zIndex: 1000 }}
      onClick={onClose}
    >
      <div
        className="w-full max-h-[85%] overflow-y-auto p-4"
        style={{ background: C.paper, borderTop: `5px solid ${C.char}` }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <span style={{ fontFamily: F_MONO, fontSize: 11, color: C.ink, opacity: 0.6 }}>
            {title}
          </span>
          <button onClick={onClose} aria-label="Close" style={{ color: C.char }}>
            <IconX size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function EmptyState({ line }) {
  return (
    <div
      className="py-10 text-center"
      style={{
        fontFamily: "Impact, Haettenschweiler, 'Arial Narrow Bold', sans-serif",
        fontSize: 20,
        color: C.ink,
        opacity: 0.45,
      }}
    >
      {line}
    </div>
  )
}
