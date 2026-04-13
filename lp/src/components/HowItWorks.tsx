import { content } from '../content'
import { FadeIn } from './FadeIn'

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 px-6">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl font-bold text-gray-900 text-center">
          {content.howItWorks.title}
        </h2>
        <div className="mt-14 relative">
          {/* Connecting line */}
          <div className="hidden lg:block absolute top-6 left-[calc(12.5%+24px)] right-[calc(12.5%+24px)] h-px bg-gradient-to-r from-indigo-200 via-indigo-300 to-indigo-200" />

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {content.howItWorks.steps.map((step, i) => (
              <FadeIn key={step.step} delay={i * 100}>
                <div className="text-center relative">
                  <div className="relative mx-auto h-12 w-12 rounded-full bg-indigo-600 text-white flex items-center justify-center text-lg font-bold shadow-md shadow-indigo-200">
                    {step.step}
                  </div>
                  <h3 className="mt-4 text-base font-semibold text-gray-900">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm text-gray-600 leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
