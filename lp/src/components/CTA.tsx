import { ArrowRight, Github } from 'lucide-react'
import { content, links } from '../content'

export function CTA() {
  return (
    <section className="py-20 px-6">
      <div className="max-w-2xl mx-auto text-center">
        <h2 className="text-3xl font-bold text-gray-900">
          {content.cta.title}
        </h2>
        <div className="mt-8 flex items-center justify-center gap-4 flex-wrap">
          <a
            href={links.releases}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            {content.cta.download}
            <ArrowRight className="h-4 w-4" />
          </a>
          <a
            href={links.github}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <Github className="h-4 w-4" />
            {content.cta.github}
          </a>
        </div>
      </div>
    </section>
  )
}
