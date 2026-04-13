import { Clock, Github } from 'lucide-react'
import { content, links } from '../content'

export function Header() {
  return (
    <header className="fixed top-0 inset-x-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
      <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2 font-semibold text-gray-900">
          <Clock className="h-5 w-5 text-indigo-600" />
          {content.header.appName}
        </div>
        <div className="flex items-center gap-4">
          <a
            href={links.github}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            <Github className="h-4 w-4" />
            {content.header.github}
          </a>
          <a
            href={links.releases}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-1.5 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 transition-colors"
          >
            {content.header.download}
          </a>
        </div>
      </div>
    </header>
  )
}
