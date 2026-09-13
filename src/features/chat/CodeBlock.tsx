import { useEffect, useState } from 'react'
import { createHighlighterCore } from 'shiki/core'
import { createOnigurumaEngine } from 'shiki/engine/oniguruma'
import githubLight from '@shikijs/themes/github-light'
import bash from '@shikijs/langs/bash'
import css from '@shikijs/langs/css'
import diff from '@shikijs/langs/diff'
import html from '@shikijs/langs/html'
import javascript from '@shikijs/langs/javascript'
import json from '@shikijs/langs/json'
import markdown from '@shikijs/langs/markdown'
import powershell from '@shikijs/langs/powershell'
import python from '@shikijs/langs/python'
import tsx from '@shikijs/langs/tsx'
import typescript from '@shikijs/langs/typescript'
import yaml from '@shikijs/langs/yaml'
import { Icon } from '../shell/Icon'

const highlighter = createHighlighterCore({
  themes: [githubLight],
  langs: [bash, css, diff, html, javascript, json, markdown, powershell, python, tsx, typescript, yaml],
  engine: createOnigurumaEngine(import('shiki/wasm')),
})

const aliases: Record<string, string> = {
  sh: 'bash', shell: 'bash', console: 'bash', js: 'javascript', jsx: 'javascript',
  ts: 'typescript', py: 'python', ps1: 'powershell', pwsh: 'powershell', yml: 'yaml', md: 'markdown',
  xml: 'html', vue: 'html', jsonc: 'json',
}

export function CodeBlock({ code, language }: { code: string; language?: string }) {
  const [html, setHtml] = useState<string>()
  useEffect(() => {
    let active = true
    const requested = (language || '').toLowerCase()
    const lang = aliases[requested] ?? requested
    if (!lang) { setHtml(undefined); return () => { active = false } }
    void highlighter.then(instance => instance.codeToHtml(code, { lang, theme: 'github-light' }))
      .then(value => { if (active) setHtml(value) })
      .catch(() => { if (active) setHtml(undefined) })
    return () => { active = false }
  }, [code, language])
  return <div className="md-code-block">
    <div className="md-code-head"><span>{language || 'text'}</span><button onClick={() => navigator.clipboard.writeText(code)}><Icon name="copy" />复制</button></div>
    {html ? <div className="md-code-highlight" dangerouslySetInnerHTML={{ __html: html }} /> : <pre><code>{code}</code></pre>}
  </div>
}
