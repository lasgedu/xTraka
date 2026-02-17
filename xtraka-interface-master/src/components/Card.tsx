interface CardProps {
  children: React.ReactNode
  className?: string
  title?: string
  subtitle?: string
}

export function Card({ children, className = '', title, subtitle }: CardProps) {
  return (
    <div className={`xtraka-card ${className}`}>
      {(title || subtitle) && (
        <div className="xtraka-card-header">
          {title && <h3 className="xtraka-card-title">{title}</h3>}
          {subtitle && <p className="xtraka-card-subtitle">{subtitle}</p>}
        </div>
      )}
      {children}
    </div>
  )
}
