import { useMemo } from 'react'

export type Platform = 'mac' | 'windows'

export function usePlatform(): Platform {
  return useMemo(() => {
    const ua = navigator.userAgent.toLowerCase()
    if (ua.includes('win')) return 'windows'
    return 'mac'
  }, [])
}
