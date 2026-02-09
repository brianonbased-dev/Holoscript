# HoloScript.nvim

Neovim plugin for HoloScript language support.

## Features

- 🎨 **Syntax Highlighting** - Full highlighting for `.holo` and `.hsplus` files
- 🔧 **LSP Integration** - Auto-connects to `@holoscript/lsp` for:
  - Code completion
  - Hover documentation
  - Go to definition
  - Diagnostics
  - Code actions
- 📁 **Filetype Detection** - Automatic recognition of HoloScript files
- 🔄 **Format on Save** - Optional auto-formatting
- ⌨️ **Commands** - Validate, preview compiled output, open docs

## Installation

### Lazy.nvim

```lua
{
  'holoscript/holoscript.nvim',
  ft = { 'holo', 'hsplus' },
  opts = {
    -- your config here
  }
}
```

### Packer

```lua
use {
  'holoscript/holoscript.nvim',
  config = function()
    require('holoscript').setup()
  end
}
```

### Manual

Clone to your nvim packages:

```bash
git clone https://github.com/holoscript/holoscript.nvim \
  ~/.local/share/nvim/site/pack/plugins/start/holoscript.nvim
```

## Requirements

- Neovim 0.7+
- [nvim-lspconfig](https://github.com/neovim/nvim-lspconfig) (for LSP features)
- `@holoscript/lsp` (install globally or use npx)

```bash
npm install -g @holoscript/lsp
```

## Configuration

```lua
require('holoscript').setup({
  lsp = {
    enabled = true,
    cmd = { "npx", "@holoscript/lsp", "--stdio" },
  },

  -- Avoid .hs conflict with Haskell
  register_hs_extension = false,

  -- Format on save
  format_on_save = false,

  -- Keymaps (false to disable)
  keymaps = {
    format = "<leader>hf",
    validate = "<leader>hv",
    compile_preview = "<leader>hp",
    goto_definition = "gd",
    hover = "K",
    code_action = "<leader>ca",
  },

  diagnostics = {
    enabled = true,
    virtual_text = true,
    signs = true,
    underline = true,
  },
})
```

## Commands

| Command                       | Description                                    |
| ----------------------------- | ---------------------------------------------- |
| `:HoloScriptValidate`         | Validate current buffer                        |
| `:HoloScriptPreview [target]` | Preview compiled output (e.g., `r3f`, `unity`) |
| `:HoloScriptDocs [topic]`     | Open documentation                             |
| `:HoloScriptNew [name]`       | Insert new composition template                |

## Keymaps

Default keymaps (customizable via config):

| Key          | Action              |
| ------------ | ------------------- |
| `gd`         | Go to definition    |
| `K`          | Hover documentation |
| `<leader>ca` | Code actions        |
| `<leader>hf` | Format buffer       |
| `<leader>hv` | Validate            |
| `<leader>hp` | Compile preview     |

## Supported File Types

| Extension | Filetype     | Description                              |
| --------- | ------------ | ---------------------------------------- |
| `.holo`   | `holo`       | Declarative compositions                 |
| `.hsplus` | `hsplus`     | HoloScript Plus with VR traits           |
| `.hs`     | `holoscript` | Classic HoloScript (disabled by default) |

> **Note:** `.hs` registration is disabled by default to avoid conflicts with Haskell. Enable with `register_hs_extension = true`.

## Highlighting Groups

The plugin defines these highlight groups that you can customize:

```vim
hi holoKeyword guifg=#c678dd
hi holoTrait guifg=#e5c07b
hi holoType guifg=#61afef
hi holoProperty guifg=#98c379
hi holoString guifg=#98c379
hi holoNumber guifg=#d19a66
hi holoComment guifg=#5c6370
```

## Troubleshooting

### LSP not starting

1. Ensure `@holoscript/lsp` is installed:

   ```bash
   npm list -g @holoscript/lsp
   ```

2. Check `:LspInfo` for connection status

3. Try manual start:
   ```vim
   :lua require('lspconfig').holoscript.launch()
   ```

### Syntax not highlighting

Check filetype is set:

```vim
:set filetype?
```

Should show `filetype=holo`

## License

MIT
