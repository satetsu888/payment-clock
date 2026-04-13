import { ArrowRight, Github } from 'lucide-react'
import { content, links } from '../content'

export function Hero() {
  return (
    <section className="pt-28 pb-20 px-6">
      <div className="max-w-4xl mx-auto text-center">
        <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 tracking-tight leading-tight">
          {content.hero.title}
        </h1>
        <p className="mt-6 text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
          {content.hero.subtitle}
        </p>
        <div className="mt-10 flex items-center justify-center gap-4 flex-wrap">
          <a
            href={links.releases}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            {content.hero.cta}
            <ArrowRight className="h-4 w-4" />
          </a>
          <a
            href={links.github}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <Github className="h-4 w-4" />
            {content.hero.github}
          </a>
        </div>

        {/* Screenshot placeholder */}
        <div className="mt-16 mx-auto max-w-3xl rounded-xl border border-gray-200 bg-gray-50 shadow-lg overflow-hidden">
          <div className="aspect-[16/10] flex items-center justify-center text-gray-400 text-sm">
            App screenshot
          </div>
        </div>
      </div>
    </section>
  )
}
