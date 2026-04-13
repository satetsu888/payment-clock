import { useEffect, useRef, useState } from 'react'

type FadeState = 'initial' | 'hidden' | 'visible'

export function useFadeInOnScroll() {
  const ref = useRef<HTMLDivElement>(null)
  const [state, setState] = useState<FadeState>('initial')

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const prefersReduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches
    if (prefersReduced) {
      setState('visible')
      return
    }

    const rect = el.getBoundingClientRect()
    if (rect.top < window.innerHeight) {
      setState('visible')
      return
    }

    setState('hidden')

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setState('visible')
          observer.unobserve(el)
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' },
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return { ref, state }
}
