; (function () {
  function createDocsifyEzSelectPlugin(rawOptions) {
    const ezs = {}

    ezs.options = Object.assign(
      {
        modalTitle: 'Select file(s) to share',
        buttonText: 'Share',
        autoIns: true, // while false: use { ds_ezs: select = "dir" } or { ds_ezs: select = "this" } or { ds_ezs: select = "all" } or just { ds_ezs: share } to make an anchor for share button
        defaultSelect: 'dir'
      },
      rawOptions || {}
    )

    ezs.vm = null
    ezs.currentSelectMode = ezs.options.defaultSelect || 'all'

    ezs.dom = {
      qs(selector, root) {
        return (root || document).querySelector(selector)
      },
      qsa(selector, root) {
        return Array.from((root || document).querySelectorAll(selector))
      },
      create(tag, className) {
        const el = document.createElement(tag)
        if (className) el.className = className
        return el
      }
    }

    ezs.getCurrentRouteFile = function () {
      if (!ezs.vm || !ezs.vm.route) return 'README.md'
      return ezs.vm.route.file || 'README.md'
    }

    ezs.getCurrentDirPrefix = function () {
      const file = ezs.getCurrentRouteFile()
      if (!file) return ''
      return file.replace(/[^/]*$/, '')
    }

    ezs.normalizeSidebarHref = function (href) {
      if (!href) return null
      href = href.trim()
      if (/^(https?:)?\/\//i.test(href)) return null
      if (/^(mailto:|tel:|javascript:)/i.test(href)) return null

      const hashPrefixIdx = href.indexOf('#/')
      if (hashPrefixIdx !== -1) {
        href = href.slice(hashPrefixIdx + 2)
      }

      if (!href || href === '#' || href === '#/') {
        return 'README.md'
      }

      href = href.replace(/[?#].*$/, '')
      if (href === '/') return 'README.md'
      href = href.replace(/^\/+/, '')

      if (!/\.(md|markdown)$/i.test(href)) {
        href = href.replace(/\/$/, '') + '.md'
      }

      return href
    }

    ezs.collectSidebarLinks = function () {
      const sidebarRoot =
        ezs.dom.qs('.sidebar-nav') ||
        ezs.dom.qs('.sidebar') ||
        ezs.dom.qs('.sidebar-nav ul') ||
        ezs.dom.qs('.sidebar ul')

      if (!sidebarRoot) return []

      const anchors = ezs.dom.qsa('a[href]', sidebarRoot)
      const rawList = anchors
        .map((a) => {
          const href = a.getAttribute('href') || ''
          const path = ezs.normalizeSidebarHref(href)
          if (!path) return null
          const title = (a.textContent || '').trim()
          return { title: title || path, path }
        })
        .filter(Boolean)

      const map = {}
      rawList.forEach((item) => {
        if (!map[item.path]) {
          map[item.path] = item
        }
      })

      return Object.values(map).sort((a, b) => {
        if (a.path === b.path) return 0
        return a.path > b.path ? 1 : -1
      })
    }

    ezs.getLinksByMode = function (mode) {
      const allLinks = ezs.collectSidebarLinks()
      const prefix = ezs.getCurrentDirPrefix()
      const currentFile = ezs.getCurrentRouteFile()

      if (mode === 'this') {
        return allLinks.filter((item) => item.path === currentFile)
      }

      if (mode === 'dir') {
        if (!prefix) {
          return allLinks.filter((item) => !item.path.includes('/'))
        }
        return allLinks.filter((item) => item.path.startsWith(prefix))
      }

      return allLinks
    }

    ezs.setSelectMode = function (mode) {
      if (mode !== 'dir' && mode !== 'this' && mode !== 'all') {
        mode = ezs.options.defaultSelect || 'all'
      }
      ezs.currentSelectMode = mode
    }

    ezs.injectStyleOnce = function () {
      if (ezs.dom.qs('#ezs-modal-style')) return

      const style = ezs.dom.create('style')
      style.id = 'ezs-modal-style'
      style.textContent = `
        .ezs-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.35);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 9999;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.18s ease-out;
        }
        .ezs-modal-overlay.show {
          opacity: 1;
          pointer-events: auto;
        }
        .ezs-modal {
          background: var(--color-bg, #fff);
          border-radius: 6px;
          max-width: 760px;
          width: 92%;
          max-height: 80vh;
          display: flex;
          flex-direction: column;
          box-shadow: 0 12px 32px rgba(0, 0, 0, 0.18);
          overflow: hidden;
          font-family: var(--font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif);
          font-size: var(--font-size, 14px);
          line-height: var(--line-height, 1.6);
          transform: translateY(4px);
          opacity: 0;
          transition: transform 0.18s ease-out, opacity 0.18s ease-out;
        }
        .ezs-modal-overlay.show .ezs-modal {
          transform: translateY(0);
          opacity: 1;
        }
        .ezs-modal-header {
          padding: 12px 20px;
          border-bottom: 1px solid rgba(0, 0, 0, 0.06);
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: linear-gradient(135deg, rgba(0,0,0,0.01), rgba(0,0,0,0.03));
        }
        .ezs-modal-title {
          font-size: 1em;
          font-weight: 600;
          color: var(--color-text, #2c3e50);
        }
        .ezs-modal-close {
          border: none;
          background: transparent;
          cursor: pointer;
          font-size: 18px;
          line-height: 1;
          color: rgba(0, 0, 0, 0.45);
          padding: 4px;
          border-radius: 999px;
          transition: background 0.15s ease, transform 0.1s ease, color 0.15s ease;
        }
        .ezs-modal-close:hover {
          background: rgba(0, 0, 0, 0.05);
          color: var(--color-text, #2c3e50);
          transform: rotate(8deg);
        }
        .ezs-modal-body {
          padding: 10px 20px 4px;
          overflow: auto;
          background: var(--color-bg, #fff);
        }
        .ezs-file-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }
        .ezs-file-item {
          display: flex;
          align-items: center;
          padding: 6px 0;
          border-bottom: 1px solid rgba(0, 0, 0, 0.04);
          font-size: 0.95em;
        }
        .ezs-file-item:last-child {
          border-bottom: none;
        }
        .ezs-file-item label {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          width: 100%;
        }
        .ezs-file-item input[type="checkbox"] {
          accent-color: var(--theme-color, #42b983);
        }
        .ezs-file-item span {
          color: var(--color-text, #2c3e50);
        }
        .ezs-file-item small {
          color: rgba(0, 0, 0, 0.45);
          margin-left: 4px;
        }
        .ezs-modal-footer {
          padding: 10px 20px 12px;
          border-top: 1px solid rgba(0, 0, 0, 0.06);
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
          background: rgba(0, 0, 0, 0.01);
        }
        .ezs-footer-left {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.85em;
          color: rgba(0, 0, 0, 0.55);
        }
        .ezs-footer-right {
          display: flex;
          gap: 8px;
        }
        .ezs-btn {
          border-radius: 3px;
          padding: 4px 12px;
          font-size: 0.85em;
          border: 1px solid rgba(0, 0, 0, 0.12);
          background: var(--color-bg, #fff);
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          line-height: 1.3;
          transition: background 0.15s ease, box-shadow 0.15s ease,
            transform 0.08s ease, border-color 0.15s ease, color 0.15s ease;
          font-family: inherit;
        }
        .ezs-btn-primary {
          border-color: var(--theme-color, #42b983);
          background: var(--theme-color, #42b983);
          color: #fff;
        }
        .ezs-btn-secondary {
          background: rgba(0, 0, 0, 0.02);
          color: var(--color-text, #2c3e50);
        }
        .ezs-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          box-shadow: none;
        }
        .ezs-btn:not(:disabled):hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.12);
        }
        .ezs-select-all {
          cursor: pointer;
          user-select: none;
        }
        .ezs-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          background: rgba(0, 0, 0, 0.04);
          padding: 0 8px;
          font-size: 0.8em;
          color: rgba(0, 0, 0, 0.65);
        }
        .ezs-sidebar-icon {
          margin-left: 0.35em;
          font-size: 0.9em;
          cursor: pointer;
          user-select: none;
          opacity: 0.7;
          color: var(--theme-color, #42b983);
          transition: opacity 0.15s ease, transform 0.1s ease;
        }
        .ezs-sidebar-icon:hover {
          opacity: 1;
          transform: translateY(-1px);
        }
        .ezs-inline-btn {
          border-radius: 3px;
          padding: 3px 10px;
          font-size: 0.85em;
          border: 1px solid rgba(0, 0, 0, 0.12);
          background: rgba(0, 0, 0, 0.02);
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 4px;
          line-height: 1.3;
          color: var(--color-text, #2c3e50);
          font-family: inherit;
        }
        .ezs-inline-btn::before {
          content: "🔗";
          font-size: 0.95em;
        }
        .ezs-inline-btn:hover {
          background: rgba(0, 0, 0, 0.04);
          border-color: var(--theme-color, #42b983);
        }
      `
      document.head.appendChild(style)
    }

    ezs.createModalSkeleton = function () {
      const overlay = ezs.dom.create('div', 'ezs-modal-overlay')
      overlay.id = 'ezs-file-modal'

      overlay.innerHTML = `
        <div class="ezs-modal">
          <div class="ezs-modal-header">
            <div class="ezs-modal-title">${ezs.options.modalTitle}</div>
            <button class="ezs-modal-close" aria-label="close">×</button>
          </div>
          <div class="ezs-modal-body">
            <div class="ezs-footer-left" style="margin-bottom:8px;">
              <label class="ezs-select-all">
                <input type="checkbox" id="ezs-select-all-checkbox" />
                <span>Select all</span>
              </label>
              <span class="ezs-badge" id="ezs-selected-count">0 selected</span>
            </div>
            <ul class="ezs-file-list" id="ezs-file-list"></ul>
          </div>
          <div class="ezs-modal-footer">
            <div class="ezs-footer-left">
              <span>
                Copy: copy file contents · Ask: open ChatGPT with a prompt and links.
              </span>
            </div>
            <div class="ezs-footer-right">
              <button class="ezs-btn ezs-btn-secondary" id="ezs-copy-btn">Copy</button>
              <button class="ezs-btn ezs-btn-primary" id="ezs-exp-btn">Ask AI</button>
            </div>
          </div>
        </div>
      `

      document.body.appendChild(overlay)
    }

    ezs.bindModalEvents = function () {
      const overlay = ezs.dom.qs('#ezs-file-modal')
      const closeBtn = ezs.dom.qs('.ezs-modal-close', overlay)
      const selectAllCheckbox = ezs.dom.qs('#ezs-select-all-checkbox', overlay)
      const copyButton = ezs.dom.qs('#ezs-copy-btn', overlay)
      const exportButton = ezs.dom.qs('#ezs-exp-btn', overlay)
      const fileList = ezs.dom.qs('#ezs-file-list', overlay)

      if (!overlay || !closeBtn || !selectAllCheckbox || !copyButton || !exportButton || !fileList) return

      closeBtn.addEventListener('click', ezs.hideModal)
      overlay.addEventListener('click', (evt) => {
        if (evt.target === overlay) {
          ezs.hideModal()
        }
      })

      selectAllCheckbox.addEventListener('change', () => {
        const checkboxes = ezs.dom.qsa('.ezs-file-item input[type="checkbox"]', fileList)
        checkboxes.forEach((cb) => {
          cb.checked = selectAllCheckbox.checked
        })
        ezs.updateSelectedCount()
      })

      if (!fileList._ezsBoundChangeHandler) {
        const handler = (evt) => {
          if (!evt.target.matches('input[type="checkbox"]')) return

          ezs.updateSelectedCount()

          const all = ezs.dom.qsa('.ezs-file-item input[type="checkbox"]', fileList)
          const checked = ezs.dom.qsa(
            '.ezs-file-item input[type="checkbox"]:checked',
            fileList
          )
          selectAllCheckbox.checked = all.length > 0 && all.length === checked.length
        }
        fileList.addEventListener('change', handler)
        fileList._ezsBoundChangeHandler = handler
      }

      copyButton.addEventListener('click', ezs.handleCopyClicked)
      exportButton.addEventListener('click', ezs.handleExportClicked)
    }

    ezs.ensureModalOnce = function () {
      if (ezs.dom.qs('#ezs-file-modal')) return
      ezs.injectStyleOnce()
      ezs.createModalSkeleton()
      ezs.bindModalEvents()
    }

    ezs.showModal = function () {
      const overlay = ezs.dom.qs('#ezs-file-modal')
      if (overlay) overlay.classList.add('show')
    }

    ezs.hideModal = function () {
      const overlay = ezs.dom.qs('#ezs-file-modal')
      if (overlay) overlay.classList.remove('show')
    }

    ezs.updateSelectedCount = function () {
      const badge = ezs.dom.qs('#ezs-selected-count')
      if (!badge) return
      const checked = ezs.dom.qsa('.ezs-file-item input[type="checkbox"]:checked')
      badge.textContent = `${checked.length} selected`
    }

    ezs.refreshFileListForCurrentMode = function () {
      const listEl = ezs.dom.qs('#ezs-file-list')
      const selectAll = ezs.dom.qs('#ezs-select-all-checkbox')
      if (!listEl || !selectAll) return

      const files = ezs.getLinksByMode(ezs.currentSelectMode)

      if (!files.length) {
        listEl.innerHTML =
          '<li style="padding:6px 0;font-size:13px;color:#888;">' +
          'No documents found in the sidebar. Verify loadSidebar and links.' +
          '</li>'
        selectAll.checked = false
        ezs.updateSelectedCount()
        return
      }

      const fragments = document.createDocumentFragment()
      files.forEach((file, index) => {
        const li = ezs.dom.create('li', 'ezs-file-item')
        const inputId = 'ezs-file-' + index

        li.innerHTML = `
          <label for="${inputId}">
            <input 
              id="${inputId}" 
              type="checkbox" 
              data-path="${file.path}"
            />
            <span>${file.title}</span>
            <small>${file.path}</small>
          </label>
        `
        fragments.appendChild(li)
      })

      listEl.innerHTML = ''
      listEl.appendChild(fragments)

      selectAll.checked = false
      ezs.updateSelectedCount()
    }

    ezs.collectSelectedPaths = function () {
      const checkboxes = ezs.dom.qsa('.ezs-file-item input[type="checkbox"]:checked')
      return checkboxes
        .map((cb) => cb.getAttribute('data-path'))
        .filter(Boolean)
    }

    ezs.handleCopyClicked = async function () {
      const paths = ezs.collectSelectedPaths()
      if (!paths.length) {
        alert('Please select at least one document.')
        return
      }

      try {
        const chunks = []
        for (const path of paths) {
          const resp = await fetch(path)
          if (!resp.ok) {
            throw new Error('Request failed: ' + path + ' (HTTP ' + resp.status + ')')
          }
          const content = await resp.text()
          chunks.push(`<!-- ${path} -->\n` + content)
        }

        const combined = chunks.join('\n\n---\n\n')

        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(combined)
        } else {
          const textarea = ezs.dom.create('textarea')
          textarea.value = combined
          textarea.style.position = 'fixed'
          textarea.style.opacity = '0'
          document.body.appendChild(textarea)
          textarea.select()
          document.execCommand('copy')
          document.body.removeChild(textarea)
        }

        alert('Copied to clipboard.')
        ezs.hideModal()
      } catch (err) {
        console.error('[docsifyezselect] copy failed:', err)
        alert('Error: ' + err.message)
      }
    }

    ezs.buildPageUrl = function (path) {
      const loc = window.location
      const basePath = (loc.origin + loc.pathname).replace(/index\.html$/i, '')
      const clean = path.replace(/^\/+/, '').replace(/\.(md|markdown)$/i, '')
      return basePath.replace(/\/$/, '') + '#/' + clean
    }

    ezs.buildChatGPTPrompt = function (paths) {
      const urls = paths.map(ezs.buildPageUrl)
      const basePrompt = `You will be given one or more websites as sources of information.

Carefully read and analyze all of the provided websites, including their main pages and any obviously relevant subpages or sections.

Pay attention to:

The overall purpose and topic of each site
Key concepts, terminology, and definitions
Important arguments, examples, data, and conclusions
Relationships between ideas across different pages or sites

Build a clear mental model of the content so you can:

Explain the material in your own words
Compare and contrast information from different pages
Infer implied meanings, assumptions, and context

After you have finished analyzing the websites, you will be asked questions.

When answering:

Base your answers primarily on the content of the given websites.
Use the context and meaning, not just keyword matching.
If the answer is not directly stated, make a reasonable inference and explain your reasoning briefly.
If the information is missing or unclear, say so honestly instead of inventing details.
When helpful, refer back to specific sections or ideas from the websites in a concise way.

Confirm that you have finished reading and understanding the websites, and then wait for the questions.

Sources:
${urls.join('\n')}`
      return basePrompt
    }

    ezs.handleExportClicked = function () {
      const paths = ezs.collectSelectedPaths()
      if (!paths.length) {
        alert('Please select at least one document to share.')
        return
      }

      const prompt = ezs.buildChatGPTPrompt(paths)
      const url = 'https://chatgpt.com/?prompt=' + encodeURIComponent(prompt)
      window.open(url, '_blank')
    }

    ezs.ensureSidebarIcon = function () {
      const sidebarRoot =
        ezs.dom.qs('.sidebar-nav') ||
        ezs.dom.qs('.sidebar') ||
        ezs.dom.qs('.sidebar-nav ul') ||
        ezs.dom.qs('.sidebar ul')

      if (!sidebarRoot) return

      ezs.dom.qsa('.ezs-sidebar-icon', sidebarRoot).forEach((el) => el.remove())

      const activeLink =
        ezs.dom.qs('.sidebar-nav a.active') ||
        ezs.dom.qs('.sidebar a.active') ||
        ezs.dom.qs('.sidebar-nav li.active > a') ||
        ezs.dom.qs('.sidebar li.active > a')

      if (!activeLink) return

      const icon = ezs.dom.create('span', 'ezs-sidebar-icon')
      icon.textContent = '🔗'
      icon.setAttribute('title', 'Share from this page')

      icon.addEventListener('click', (e) => {
        e.preventDefault()
        e.stopPropagation()
        ezs.setSelectMode(ezs.options.defaultSelect || 'all')
        ezs.ensureModalOnce()
        ezs.refreshFileListForCurrentMode()
        ezs.showModal()
      })

      activeLink.appendChild(icon)
    }

    ezs.processInlinePlaceholders = function (content) {
      const selectOnlyRe = /\{ds_ezs:\s*select="(dir|this|all)"\s*\}/gi
      const shareRe = /\{ds_ezs:\s*share\s*\}/gi

      content = content.replace(selectOnlyRe, function (_, mode) {
        const m = (mode || '').toLowerCase()
        const safeMode = m === 'dir' || m === 'this' || m === 'all' ? m : 'all'
        return `<button class="ezs-inline-btn" data-ezs-trigger="inline" data-ezs-select="${safeMode}">Share</button>`
      })

      content = content.replace(shareRe, function () {
        const def = ezs.options.defaultSelect || 'all'
        const safeMode = def === 'dir' || def === 'this' || def === 'all' ? def : 'all'
        return `<button class="ezs-inline-btn" data-ezs-trigger="inline" data-ezs-select="${safeMode}">Share</button>`
      })

      return content
    }

    ezs.bindInlineButtons = function () {
      const buttons = ezs.dom.qsa('button[data-ezs-trigger="inline"]')
      buttons.forEach((btn) => {
        if (btn._ezsBound) return
        btn._ezsBound = true
        btn.addEventListener('click', () => {
          const mode = (btn.getAttribute('data-ezs-select') || ezs.options.defaultSelect || 'all').toLowerCase()
          ezs.setSelectMode(mode)
          ezs.ensureModalOnce()
          ezs.refreshFileListForCurrentMode()
          ezs.showModal()
        })
      })
    }

    return function docsifyEzSelectPlugin(hook, docsifyVm) {
      ezs.vm = docsifyVm

      hook.beforeEach(function (content) {
        if (!ezs.options.autoIns) {
          content = ezs.processInlinePlaceholders(content)
        }
        return content
      })

      hook.ready(function () {
        ezs.ensureModalOnce()
      })

      hook.doneEach(function () {
        const overlay = ezs.dom.qs('#ezs-file-modal')
        if (overlay && overlay.classList.contains('show')) {
          ezs.refreshFileListForCurrentMode()
        }
        ezs.bindInlineButtons()
        if (ezs.options.autoIns) {
          ezs.ensureSidebarIcon()
        }
      })
    }
  }

  if (!window.$docsify) {
    window.$docsify = {}
  }

  const plugins = window.$docsify.plugins || []
  const pluginInstance = createDocsifyEzSelectPlugin(
    window.$docsify.docsifyezselect || {}
  )

  plugins.push(pluginInstance)
  window.$docsify.plugins = plugins

  window.docsifyezselect = createDocsifyEzSelectPlugin
})()
