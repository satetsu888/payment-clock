import { Download } from 'lucide-react'
import { links } from '../content'
import { usePlatform } from '../hooks/usePlatform'

const platforms = {
  mac: { label: 'Download for macOS', altLabel: 'Download for Windows', link: links.downloadMac, altLink: links.downloadWindows },
  windows: { label: 'Download for Windows', altLabel: 'Download for macOS', link: links.downloadWindows, altLink: links.downloadMac },
} as const

export function DownloadButtons({
  variant = 'default',
}: {
  variant?: 'default' | 'inverted'
}) {
  const platform = usePlatform()
  const { label, altLabel, link, altLink } = platforms[platform]

  const primaryClass =
    variant === 'inverted'
      ? 'inline-flex items-center gap-2 px-6 py-3 text-sm font-medium text-indigo-700 bg-white rounded-lg hover:bg-indigo-50 transition-colors shadow-md'
      : 'inline-flex items-center gap-2 px-6 py-3 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-md shadow-indigo-200 transition-all hover:shadow-lg hover:shadow-indigo-200'

  const secondaryClass =
    variant === 'inverted'
      ? 'text-sm text-white/70 hover:text-white transition-colors underline underline-offset-4 decoration-white/30 hover:decoration-white/60'
      : 'text-sm text-gray-500 hover:text-gray-700 transition-colors underline underline-offset-4 decoration-gray-300 hover:decoration-gray-400'

  return (
    <div className="flex flex-col items-center gap-3">
      <a href={link} className={primaryClass}>
        <Download className="h-4 w-4" />
        {label}
      </a>
      <a href={altLink} className={secondaryClass}>
        {altLabel}
      </a>
    </div>
  )
}
