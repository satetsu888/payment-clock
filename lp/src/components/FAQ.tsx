import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { content } from '../content'
import { FadeIn } from './FadeIn'

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  return (
    <section id="faq" className="py-20 px-6 bg-gray-50">
      <div className="max-w-2xl mx-auto">
        <h2 className="text-3xl font-bold text-gray-900 text-center">
          {content.faq.title}
        </h2>
        <div className="mt-12 space-y-3">
          {content.faq.items.map((item, i) => {
            const isOpen = openIndex === i
            return (
              <FadeIn key={i} delay={i * 80}>
                <div className="bg-white rounded-lg border border-gray-100 shadow-sm">
                  <button
                    onClick={() => setOpenIndex(isOpen ? null : i)}
                    className="w-full flex items-center justify-between px-5 py-4 text-left text-sm font-medium text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    {item.question}
                    <ChevronDown
                      className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-4 text-sm text-gray-600 leading-relaxed">
                      {item.answer}
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
