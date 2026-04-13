import { ArrowRight, Github } from 'lucide-react'
import { content, links } from '../content'

export function CTA() {
  return (
    <section className="py-20 px-6">
      <div className="max-w-3xl mx-auto">
        <div className="relative rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-700 px-8 py-14 text-center overflow-hidden">
          {/* Decorative elements */}
          <div className="pointer-events-none absolute -top-20 -right-20 h-60 w-60 rounded-full bg-white/5 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-white/5 blur-2xl" />

          <h2 className="relative text-3xl font-bold text-white">
            {content.cta.title}
          </h2>
          <div className="relative mt-8 flex items-center justify-center gap-4 flex-wrap">
            <a
              href={links.releases}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium text-indigo-700 bg-white rounded-lg hover:bg-indigo-50 transition-colors shadow-md"
            >
              {content.cta.download}
              <ArrowRight className="h-4 w-4" />
            </a>
            <a
              href={links.github}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium text-white/90 border border-white/25 rounded-lg hover:bg-white/10 transition-colors"
            >
              <Github className="h-4 w-4" />
              {content.cta.github}
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
