import { content, links } from '../content'

export function Footer() {
  return (
    <footer className="border-t border-gray-100 py-8 px-6">
      <div className="max-w-5xl mx-auto flex items-center justify-between text-sm text-gray-500">
        <span>{content.footer.license}</span>
        <a
          href={links.github}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-gray-700 transition-colors"
        >
          GitHub
        </a>
      </div>
    </footer>
  )
}
