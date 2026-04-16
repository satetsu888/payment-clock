import { content } from '../content'
import { DownloadButtons } from './DownloadButtons'

export function Hero() {
  return (
    <section className="relative pt-28 pb-24 px-6 hero-gradient overflow-hidden">
      {/* Decorative blurred orbs */}
      <div className="pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 h-[500px] w-[800px] rounded-full bg-indigo-100/40 blur-3xl" />
      <div className="pointer-events-none absolute top-40 -right-40 h-[300px] w-[300px] rounded-full bg-violet-100/40 blur-3xl" />
      <div className="pointer-events-none absolute top-60 -left-32 h-[200px] w-[200px] rounded-full bg-teal-100/30 blur-3xl" />

      <div className="relative max-w-4xl mx-auto text-center">
        <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 tracking-tight leading-tight">
          {content.hero.title}
        </h1>
        <p className="mt-6 text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
          {content.hero.subtitle}
        </p>
        {/* App screenshot */}
        <div className="mt-16 mx-auto max-w-3xl rounded-xl bg-gray-50 screenshot-frame overflow-hidden">
          <img src={import.meta.env.BASE_URL + 'hero.png'} alt="Payment Clock app screenshot" className="w-full" />
        </div>

        <div className="mt-10">
          <DownloadButtons />
        </div>
      </div>
    </section>
  )
}
