import { content } from '../content'
import { DownloadButtons } from './DownloadButtons'

export function CTA() {
  return (
    <section className="py-20 px-6">
      <div className="max-w-3xl mx-auto">
        <div className="relative rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-600 to-violet-600 px-8 py-14 text-center overflow-hidden">
          {/* Decorative elements */}
          <div className="pointer-events-none absolute -top-20 -right-20 h-60 w-60 rounded-full bg-violet-400/15 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-teal-400/10 blur-2xl" />

          <h2 className="relative text-3xl font-bold text-white">
            {content.cta.title}
          </h2>
          <div className="relative mt-8">
            <DownloadButtons variant="inverted" />
          </div>
        </div>
      </div>
    </section>
  )
}
