import { Fragment, Suspense, createElement, lazy, useMemo, type ReactNode } from 'react'
import type { RootContent } from 'mdast'
import { fromMarkdown } from 'mdast-util-from-markdown'
import { gfmFromMarkdown } from 'mdast-util-gfm'
import { mathFromMarkdown } from 'mdast-util-math'
import { gfm } from 'micromark-extension-gfm'
import { math } from 'micromark-extension-math'
import katex from 'katex'
import 'katex/dist/katex.min.css'

const CodeBlock = lazy(() => import('./CodeBlock').then(module => ({ default: module.CodeBlock })))

type NodeWithChildren = RootContent & { children?: RootContent[] }

function safeUrl(value: string): string | undefined {
  try { const url = new URL(value, location.origin); return ['http:', 'https:', 'mailto:'].includes(url.protocol) ? url.href : undefined } catch { return undefined }
}

function children(node: NodeWithChildren, streaming: boolean): ReactNode[] {
  return (node.children ?? []).map((child, index) => <Fragment key={index}>{renderNode(child, streaming)}</Fragment>)
}

function renderNode(node: RootContent, streaming: boolean): ReactNode {
  const item = node as NodeWithChildren & Record<string, unknown>
  switch (node.type) {
    case 'text': return node.value
    case 'paragraph': return <p>{children(item, streaming)}</p>
    case 'heading': return createElement(`h${node.depth}`, {}, ...children(item, streaming))
    case 'blockquote': return <blockquote>{children(item, streaming)}</blockquote>
    case 'thematicBreak': return <hr />
    case 'break': return <br />
    case 'strong': return <strong>{children(item, streaming)}</strong>
    case 'emphasis': return <em>{children(item, streaming)}</em>
    case 'delete': return <del>{children(item, streaming)}</del>
    case 'inlineCode': return <code>{node.value}</code>
    case 'html': return node.value
    case 'code': return streaming ? <pre><code>{node.value}</code></pre> : <Suspense fallback={<pre><code>{node.value}</code></pre>}><CodeBlock code={node.value} language={node.lang ?? undefined} /></Suspense>
    case 'list': return createElement(node.ordered ? 'ol' : 'ul', node.start && node.start !== 1 ? { start: node.start } : {}, ...children(item, streaming))
    case 'listItem': return <li>{typeof node.checked === 'boolean' && <input type="checkbox" checked={node.checked} readOnly disabled />}{children(item, streaming)}</li>
    case 'link': { const href = safeUrl(node.url); return href ? <a href={href} target={href.startsWith('http') ? '_blank' : undefined} rel="noreferrer">{children(item, streaming)}</a> : children(item, streaming) }
    case 'image': { const src = safeUrl(node.url); return src ? <img src={src} alt={node.alt ?? ''} loading="lazy" /> : node.alt }
    case 'table': return <div className="md-table-wrapper"><table><tbody>{children(item, streaming)}</tbody></table></div>
    case 'tableRow': return <tr>{children(item, streaming)}</tr>
    case 'tableCell': return <td>{children(item, streaming)}</td>
    case 'math':
    case 'inlineMath': {
      const value = String(item.value ?? '')
      try { return <span className={node.type === 'math' ? 'md-math-block' : 'md-math-inline'} dangerouslySetInnerHTML={{ __html: katex.renderToString(value, { displayMode: node.type === 'math', throwOnError: false, strict: false }) }} /> } catch { return value }
    }
    default: return null
  }
}

export function Markdown({ text, streaming = false }: { text: string; streaming?: boolean }) {
  const tree = useMemo(() => {
    try { return fromMarkdown(text, { extensions: [gfm(), math()], mdastExtensions: [gfmFromMarkdown(), mathFromMarkdown()] }) }
    catch { return undefined }
  }, [text])
  if (!tree) return <div className="markdown-body">{text}</div>
  return <div className="markdown-body" data-streaming={streaming || undefined}>{tree.children.map((node, index) => <Fragment key={index}>{renderNode(node, streaming)}</Fragment>)}</div>
}
