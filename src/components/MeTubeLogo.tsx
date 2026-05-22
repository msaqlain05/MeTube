interface MeTubeLogoProps {
  className?: string
  size?: 'default' | 'compact'
}

export function MeTubeLogo({ className = '', size = 'default' }: MeTubeLogoProps) {
  return (
    <span
      className={`metube-logo metube-logo--${size}${className ? ` ${className}` : ''}`}
      aria-hidden
    >
      <span className="metube-logo__icon">
        <svg
          viewBox="0 0 34 24"
          width="34"
          height="24"
          xmlns="http://www.w3.org/2000/svg"
          focusable="false"
        >
          <rect width="34" height="24" rx="6" fill="#FF0000" />
          <path d="M13.5 7.5v9l9-4.5-9-4.5z" fill="#FFFFFF" />
        </svg>
      </span>
      <span className="metube-logo__text">MeTube</span>
    </span>
  )
}
