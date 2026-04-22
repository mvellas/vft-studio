interface DesktopApi {
  save_text_file: (defaultName: string, content: string) => Promise<string | null> | string | null
  save_base64_file: (defaultName: string, base64Data: string) => Promise<string | null> | string | null
  save_multiple_base64_files: (filesJson: string) => Promise<string[]> | string[]
  open_preview_window: (title: string, html: string, width?: number, height?: number) => Promise<boolean> | boolean
}

function getDesktopApi(): DesktopApi | null {
  return (window as any).pywebview?.api ?? null
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function escapeScriptString(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\$\{/g, '\\${')
    .replace(/<\/script/gi, '<\\/script')
}

export function isDesktopBridgeAvailable(): boolean {
  return Boolean(getDesktopApi())
}

export async function saveTextFile(defaultName: string, content: string): Promise<boolean> {
  const api = getDesktopApi()
  if (!api) return false
  const result = await api.save_text_file(defaultName, content)
  return Boolean(result)
}

export async function saveBase64File(defaultName: string, base64Data: string): Promise<boolean> {
  const api = getDesktopApi()
  if (!api) return false
  const result = await api.save_base64_file(defaultName, base64Data)
  return Boolean(result)
}

export async function saveMultipleBase64Files(files: Array<{ name: string; base64: string }>): Promise<boolean> {
  const api = getDesktopApi()
  if (!api) return false
  const result = await api.save_multiple_base64_files(JSON.stringify(files))
  return Array.isArray(result) && result.length > 0
}

export async function openPreviewWindow(
  title: string,
  html: string,
  width = 1280,
  height = 900,
): Promise<boolean> {
  const api = getDesktopApi()
  if (!api) return false
  const result = await api.open_preview_window(title, html, width, height)
  return Boolean(result)
}

export function buildMarkdownPreviewHtml(title: string, fileName: string, markdown: string): string {
  const safeTitle = escapeHtml(title)
  const safeMarkdown = escapeHtml(markdown)
  const encodedMarkdown = escapeScriptString(markdown)
  const encodedFileName = escapeScriptString(fileName)
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${safeTitle}</title>
  <style>
    :root { color-scheme: dark; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: Inter, system-ui, sans-serif; background: #07101f; color: #e2e8f0; }
    .shell { min-height: 100vh; display: flex; flex-direction: column; }
    .toolbar {
      position: sticky; top: 0; z-index: 10; display: flex; align-items: center; justify-content: space-between;
      padding: 16px 20px; background: rgba(7,16,31,0.9); backdrop-filter: blur(20px); border-bottom: 1px solid rgba(148,163,184,0.18);
    }
    .title { font-size: 18px; font-weight: 700; }
    .subtitle { font-size: 13px; color: #94a3b8; margin-top: 4px; }
    .actions { display: flex; gap: 10px; }
    button {
      border: 1px solid rgba(148,163,184,0.22); background: rgba(15,23,42,0.9); color: #f8fafc;
      border-radius: 999px; padding: 10px 16px; font-size: 13px; cursor: pointer;
    }
    button.primary { background: linear-gradient(135deg, #2563eb, #7c3aed); border: none; }
    main { padding: 24px; }
    pre {
      margin: 0; padding: 24px; border-radius: 24px; background: rgba(15,23,42,0.96); border: 1px solid rgba(148,163,184,0.14);
      white-space: pre-wrap; word-break: break-word; line-height: 1.65; font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="shell">
    <div class="toolbar">
      <div>
        <div class="title">${safeTitle}</div>
        <div class="subtitle">Pré-visualização do relatório em Markdown</div>
      </div>
      <div class="actions">
        <button class="primary" onclick="saveFile()">Salvar .md</button>
        <button onclick="window.close()">Fechar</button>
      </div>
    </div>
    <main>
      <pre>${safeMarkdown}</pre>
    </main>
  </div>
  <script>
    async function saveFile() {
      if (window.pywebview?.api?.save_text_file) {
        await window.pywebview.api.save_text_file(\`${encodedFileName}\`, \`${encodedMarkdown}\`);
      }
    }
  </script>
</body>
</html>`
}

export function buildHtmlPreviewShell(
  title: string,
  subtitle: string,
  fileName: string,
  mode: 'html' | 'pdf',
  contentHtml: string,
): string {
  const safeTitle = escapeHtml(title)
  const safeSubtitle = escapeHtml(subtitle)
  const encodedFileName = escapeScriptString(fileName)
  const encodedContent = escapeScriptString(contentHtml)
  const saveLabel = mode === 'pdf' ? 'Salvar PDF' : 'Salvar HTML'
  const saveAction = mode === 'pdf'
    ? "document.getElementById('preview-frame')?.contentWindow?.print?.();"
    : `if (window.pywebview?.api?.save_text_file) { await window.pywebview.api.save_text_file(\`${encodedFileName}\`, \`${encodedContent}\`); }`

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${safeTitle}</title>
  <style>
    :root { color-scheme: dark; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: Inter, system-ui, sans-serif; background: radial-gradient(circle at top, #172554, #020617 58%); color: #e2e8f0; }
    .shell { min-height: 100vh; display: flex; flex-direction: column; }
    .toolbar {
      position: sticky; top: 0; z-index: 10; display: flex; align-items: center; justify-content: space-between; gap: 12px;
      padding: 16px 20px; background: rgba(2,6,23,0.84); backdrop-filter: blur(22px); border-bottom: 1px solid rgba(148,163,184,0.18);
    }
    .title { font-size: 18px; font-weight: 700; }
    .subtitle { font-size: 13px; color: #94a3b8; margin-top: 4px; }
    .actions { display: flex; gap: 10px; flex-wrap: wrap; }
    button {
      border: 1px solid rgba(148,163,184,0.22); background: rgba(15,23,42,0.9); color: #f8fafc;
      border-radius: 999px; padding: 10px 16px; font-size: 13px; cursor: pointer;
    }
    button.primary { background: linear-gradient(135deg, #06b6d4, #2563eb); border: none; }
    main { flex: 1; padding: 18px; }
    iframe {
      width: 100%; height: calc(100vh - 112px); border: none; border-radius: 24px;
      background: white; box-shadow: 0 30px 80px rgba(15,23,42,0.45);
    }
  </style>
</head>
<body>
  <div class="shell">
    <div class="toolbar">
      <div>
        <div class="title">${safeTitle}</div>
        <div class="subtitle">${safeSubtitle}</div>
      </div>
      <div class="actions">
        <button class="primary" onclick="saveFile()">${saveLabel}</button>
        <button onclick="window.close()">Fechar</button>
      </div>
    </div>
    <main>
      <iframe id="preview-frame"></iframe>
    </main>
  </div>
  <script>
    const frame = document.getElementById('preview-frame');
    if (frame) frame.srcdoc = \`${encodedContent}\`;
    async function saveFile() { ${saveAction} }
  </script>
</body>
</html>`
}

export function buildPngPreviewHtml(
  title: string,
  subtitle: string,
  files: Array<{ name: string; dataUrl: string }>,
): string {
  const safeTitle = escapeHtml(title)
  const safeSubtitle = escapeHtml(subtitle)
  const payload = escapeScriptString(JSON.stringify(files.map((file) => ({
    name: file.name,
    base64: file.dataUrl.split(',')[1] ?? '',
  }))))
  const cards = files.map((file) => `
    <article class="card">
      <div class="card-head">
        <span>${escapeHtml(file.name)}</span>
      </div>
      <img src="${file.dataUrl}" alt="${escapeHtml(file.name)}" />
    </article>
  `).join('')

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${safeTitle}</title>
  <style>
    :root { color-scheme: dark; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: Inter, system-ui, sans-serif; background: #020617; color: #e2e8f0; }
    .toolbar {
      position: sticky; top: 0; z-index: 10; display: flex; align-items: center; justify-content: space-between; gap: 12px;
      padding: 16px 20px; background: rgba(2,6,23,0.92); backdrop-filter: blur(22px); border-bottom: 1px solid rgba(148,163,184,0.16);
    }
    .title { font-size: 18px; font-weight: 700; }
    .subtitle { font-size: 13px; color: #94a3b8; margin-top: 4px; }
    .actions { display: flex; gap: 10px; }
    button {
      border: 1px solid rgba(148,163,184,0.22); background: rgba(15,23,42,0.9); color: #f8fafc;
      border-radius: 999px; padding: 10px 16px; font-size: 13px; cursor: pointer;
    }
    button.primary { background: linear-gradient(135deg, #0ea5e9, #10b981); border: none; }
    main { padding: 20px; display: grid; gap: 18px; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); }
    .card {
      border-radius: 24px; overflow: hidden; background: rgba(15,23,42,0.95); border: 1px solid rgba(148,163,184,0.14);
      box-shadow: 0 20px 60px rgba(15,23,42,0.35);
    }
    .card-head { padding: 12px 16px; font-size: 13px; color: #cbd5e1; border-bottom: 1px solid rgba(148,163,184,0.12); }
    img { display: block; width: 100%; height: auto; background: #0f172a; }
  </style>
</head>
<body>
  <div class="toolbar">
    <div>
      <div class="title">${safeTitle}</div>
      <div class="subtitle">${safeSubtitle}</div>
    </div>
    <div class="actions">
      <button class="primary" onclick="saveAll()">Salvar PNGs</button>
      <button onclick="window.close()">Fechar</button>
    </div>
  </div>
  <main>${cards}</main>
  <script>
    async function saveAll() {
      if (window.pywebview?.api?.save_multiple_base64_files) {
        await window.pywebview.api.save_multiple_base64_files(\`${payload}\`);
      }
    }
  </script>
</body>
</html>`
}
