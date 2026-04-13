import { Clock, RefreshCw, List } from 'lucide-react'
import { content } from '../content'
import { FadeIn } from './FadeIn'

const icons = [Clock, RefreshCw, List]

export function Features() {
  return (
    <section id="features" className="py-20 px-6 bg-gray-50">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-3xl font-bold text-gray-900 text-center">
          {content.features.title}
        </h2>
        <div className="mt-14 space-y-12">
          {content.features.items.map((item, i) => {
            const Icon = icons[i]
            const reversed = i % 2 === 1
            return (
              <FadeIn key={item.title}>
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                  <div
                    className={`flex flex-col ${reversed ? 'md:flex-row-reverse' : 'md:flex-row'}`}
                  >
                    {/* Text */}
                    <div className="flex-1 p-8 flex flex-col justify-center">
                      <div className="h-10 w-10 rounded-lg bg-indigo-50 flex items-center justify-center mb-4">
                        <Icon className="h-5 w-5 text-indigo-600" />
                      </div>
                      <h3 className="text-xl font-semibold text-gray-900">
                        {item.title}
                      </h3>
                      <p className="mt-3 text-sm text-gray-600 leading-relaxed">
                        {item.description}
                      </p>
                      <p className="mt-4 text-sm text-indigo-600 font-medium">
                        {item.value}
                      </p>
                    </div>
                    {/* Screenshot placeholder */}
                    <div className="flex-1 bg-gray-50 border-t md:border-t-0 md:border-l border-gray-100">
                      <div className="aspect-[16/10] flex items-center justify-center text-gray-400 text-sm">
                        Screenshot
                      </div>
                    </div>
                  </div>
                </div>
              </FadeIn>
            )
          })}
        </div>
      </div>
    </section>
  )
}
