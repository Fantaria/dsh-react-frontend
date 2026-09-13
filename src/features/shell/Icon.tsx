import type { SVGProps } from 'react'

const paths: Record<string, string> = {
  plus: 'M12 5v14M5 12h14', search: 'm20 20-4.3-4.3M10.8 18a7.2 7.2 0 1 1 0-14.4 7.2 7.2 0 0 1 0 14.4Z',
  sliders: 'M4 7h8m4 0h4M4 17h4m4 0h8M12 4v6M8 14v6', folder: 'M3.5 7.5h6l2-2h9v13h-17z',
  settings: 'M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Zm0-5v2m0 13v2m8.5-8.5h-2m-13 0h-2m14.5-6-1.4 1.4M7.4 16.6 6 18m12 0-1.4-1.4M7.4 7.4 6 6',
  panel: 'M4 4.5h16v15H4zM8.5 4.5v15', copy: 'M9 8h10v11H9zM5 15V5h10',
  up: 'M8 10v9H4v-9h4Zm0 8h8.3a2 2 0 0 0 1.9-1.4l1.3-4.5A1.7 1.7 0 0 0 17.8 10H14l.6-3.4C14.8 5.2 13.8 4 12.5 4L8 10',
  down: 'M8 14V5H4v9h4Zm0-8h8.3a2 2 0 0 1 1.9 1.4l1.3 4.5a1.7 1.7 0 0 1-1.7 2.1H14l.6 3.4c.2 1.4-.8 2.6-2.1 2.6L8 14',
  branch: 'M7 5v7a4 4 0 0 0 4 4h6m-3-3 3 3-3 3M7 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  send: 'M12 19V5m-6 6 6-6 6 6', stop: 'M8 8h8v8H8z', chevron: 'm8 10 4 4 4-4',
  tool: 'M14.5 6.5a4 4 0 0 0-5 5L4 17l3 3 5.5-5.5a4 4 0 0 0 5-5l-2.5 2.5-3-3z',
}

export function Icon({ name, size = 16, ...props }: SVGProps<SVGSVGElement> & { name: string; size?: number }) {
  if (name === 'dot') return <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" {...props}><circle cx="12" cy="12" r="3" fill="currentColor" /></svg>
  return <svg className="dsh-icon" width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}><path d={paths[name] ?? paths.tool} /></svg>
}

