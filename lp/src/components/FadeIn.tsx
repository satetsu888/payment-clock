import type { ReactNode } from 'react'
import { useFadeInOnScroll } from '../hooks/useFadeInOnScroll'

export function FadeIn({
  children,
  delay = 0,
  className = '',
}: {
  children: ReactNode
  delay?: number
  className?: string
}) {
  const { ref, state } = useFadeInOnScroll()

  const fadeClass =
    state === 'initial'
      ? ''
      : state === 'hidden'
        ? 'fade-in-section'
        : 'fade-in-section is-visible'

  return (
    <div
      ref={ref}
      className={`${fadeClass} ${className}`}
      style={delay > 0 && state !== 'initial' ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  )
}
