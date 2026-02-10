# docsify-easyShare

A docsify plugin that allows users to share docs



---

## Features

* 🔗 **Sidebar share icon** — share from the page you're reading
* **Inline share buttons** — `{ds_ezs: share}` / `{ds_ezs: select="dir"}` / `{ds_ezs: select="this"}` / `{ds_ezs: select="all"}`
* ** file selection**

  * `this`: only current file
  * `dir`: files in the same folder
  * `all`: all files from the sidebar
*  **Copy**: Merge selected Markdown files -> copy to clipboard
*  **Export to ChatGPT**:
  Automatically opens ChatGPT with:
  * A structured analysis prompt
  * The generated list of document URLs

---

## Installation

1. Add the plugin to your docsify HTML (Choose one!):

```html
<script src="https://raw.githubusercontent.com/tangxiaoyi97/docsify-easyShare/main/docsify-ezs.js"></script>
<script src="https://cdn.jsdelivr.net/gh/tangxiaoyi97/docsify-easyShare/docsify-ezs.js"></script>
```

(Or download / copy and include it manually)

2. Add config:

```html
<script>
  window.$docsify = {
    docsifyezselect: {
      modalTitle: 'Select file(s) to share', // The text you see on the share UI
      buttonText: 'Share', // Text on share the button
      autoIns: true,  //auto inserts an icon 🔗 ont he sidebar
      defaultSelect: 'all' // or dir / this
    }
  }
</script>
```

---

## Anchor Usage

Inside any Markdown file:

Share with default mode

```
{ds_ezs: share}
```

Share only current directory

```
{ds_ezs: select="dir"}
```

Share only this page

```
{ds_ezs: select="this"}
```

Share everything from sidebar

```
{ds_ezs: select="all"}
```

---


## Credits
created by:

* **Tangxiaoyi97 (唐晓翼)** – Author 
* **Anastasia B. (白青)** – Technical Support
*Special Thanks to ChatGPT & Copilot*

