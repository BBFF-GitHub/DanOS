import React from 'react'

export default function Btn({ children, onClick, variant = 'primary', size = 'md', style = {}, disabled = false }) {
  const base = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    borderRadius: 'var(--radius-sm)',
    fontFamily: 'var(--font-body)',
    fontWeight: 500,
    cursor: disabled ? 'not-allowed' : 'pointer',
    border: 'none',
    transition: 'background 0.15s, opacity 0.15s',
    opacity: disabled ? 0.5 : 1,
    fontSize: size === 'sm' ? '12px' : '13px',
    padding: size === 'sm' ? '5px 10px' : '8px 14px',
  }

  const variants = {
    primary: {
      background: 'var(--accent)',
      color: '#fff',
    },
    secondary: {
      background: 'var(--bg-badge)',
      color: 'var(--text-primary)',
      border: '1px solid var(--border)',
    },
    ghost: {
      background: 'transparent',
      color: 'var(--text-secondary)',
    },
    danger: {
      background: 'var(--danger-soft)',
      color: 'var(--danger)',
    },
  }

  return (
    <button
      onClick={disabled ? undefined : onClick}
      style={{ ...base, ...variants[variant], ...style }}
    >
      {children}
    </button>
  )
}
