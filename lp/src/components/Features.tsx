import { Clock, RefreshCw, List } from 'lucide-react'
import { content } from '../content'
import { FadeIn } from './FadeIn'

const featureStyles = [
  {
    Icon: Clock,
    iconBg: 'bg-indigo-50',
    iconColor: 'text-indigo-600',
    valueColor: 'text-indigo-600',
    screenshot: 'timeline.png',
    layout: 'stacked' as const,
  },
  {
    Icon: RefreshCw,
    iconBg: 'bg-violet-50',
    iconColor: 'text-violet-600',
    valueColor: 'text-violet-600',
    screenshot: 'complex-subscription.png',
    layout: 'side-tall' as const,
  },
  {
    Icon: List,
    iconBg: 'bg-teal-50',
    iconColor: 'text-teal-600',
    valueColor: 'text-teal-600',
    screenshot: 'event-log.png',
    layout: 'stacked' as const,
  },
]

export function Features() {
  return (
    <section id="features" className="py-20 px-6 bg-gray-50/70">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-3xl font-bold text-gray-900 text-center">
          {content.features.title}
        </h2>
        <div className="mt-14 space-y-12">
          {content.features.items.map((item, i) => {
            const { Icon, iconBg, iconColor, valueColor, screenshot, layout } = featureStyles[i]
            const reversed = i % 2 === 1

            const isSide = layout === 'side' || layout === 'side-tall'

            const textBlock = (
              <div className={`${layout === 'stacked' ? '' : 'flex-1'} p-8 flex flex-col justify-center`}>
                <div
                  className={`h-10 w-10 rounded-lg ${iconBg} flex items-center justify-center mb-4`}
                >
                  <Icon className={`h-5 w-5 ${iconColor}`} />
                </div>
                <h3 className="text-xl font-semibold text-gray-900">
                  {item.title}
                </h3>
                <p className="mt-3 text-sm text-gray-600 leading-relaxed">
                  {item.description}
                </p>
                <p className={`mt-4 text-sm font-medium ${valueColor}`}>
                  {item.value}
                </p>
              </div>
            )

            const imageBlock = screenshot ? (
              <div
                className={`${layout === 'stacked' ? '' : 'flex-1'} bg-gray-50 ${
                  layout === 'stacked'
                    ? 'border-t border-gray-100 p-6'
                    : `border-t md:border-t-0 ${reversed ? 'md:border-r' : 'md:border-l'} border-gray-100`
                } ${layout === 'side-tall' ? 'flex items-center justify-center p-6' : ''}`}
              >
                <img
                  src={import.meta.env.BASE_URL + screenshot}
                  alt={item.title}
                  className={layout === 'side-tall' ? 'max-h-80 w-auto' : 'w-full'}
                />
              </div>
            ) : (
              <div
                className={`flex-1 bg-gray-50 border-t md:border-t-0 ${reversed ? 'md:border-r' : 'md:border-l'} border-gray-100`}
              >
                <div className="aspect-[16/10] flex items-center justify-center text-gray-400 text-sm">
                  Screenshot
                </div>
              </div>
            )

            return (
              <FadeIn key={item.title}>
                <div className="feature-card bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                  {isSide ? (
                    <div className={`flex flex-col ${reversed ? 'md:flex-row-reverse' : 'md:flex-row'}`}>
                      {textBlock}
                      {imageBlock}
                    </div>
                  ) : (
                    <div className="flex flex-col">
                      {textBlock}
                      {imageBlock}
                    </div>
                  )}
                </div>
              </FadeIn>
            )
          })}
        </div>
      </div>
    </section>
  )
}
