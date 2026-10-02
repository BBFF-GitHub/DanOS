import React from 'react'

export default function PageHeader({ title, subtitle, action }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      marginBottom: '24px',
    }}>
      <div>
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: '22px',
          fontWeight: 600,
          color: 'var(--text-primary)',
          letterSpacing: '-0.3px',
          lineHeight: 1.2,
        }}>{title}</h1>
        {subtitle && (
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '4px' }}>
            {subtitle}
          </p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}
