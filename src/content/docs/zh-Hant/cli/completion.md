---
summary: "CLI 參考 for `openclaw completion` (generate/install shell completion scripts)"
read_when:
  - You want shell completions for zsh/bash/fish/PowerShell
  - You need to cache completion scripts under OpenClaw state
title: "completion"
---

# `openclaw completion`

生成 Shell 自動補腳本，並可選擇將其安裝至您的 Shell 設定檔中。

## 用法

```bash
openclaw completion
openclaw completion --shell zsh
openclaw completion --install
openclaw completion --shell fish --install
openclaw completion --write-state
openclaw completion --shell bash --write-state
```

## 選項

- `-s, --shell <shell>`: shell 目標 (`zsh`, `bash`, `powershell`, `fish`; 預設: `zsh`)
- `-i, --install`: 透過新增一行 source 指令至您的 Shell 設定檔來安裝自動補完
- `--write-state`: 將自動補完腳本寫入 `$OPENCLAW_STATE_DIR/completions` 而不列印至標準輸出
- `-y, --yes`: 略過安裝確認提示

## 注意事項

- `--install` 會在您的 Shell 設定檔中寫入一個小型的「OpenClaw Completion」區塊，並將其指向快取的腳本。
- 若沒有使用 `--install` 或 `--write-state`，此指令會將腳本列印至標準輸出。
- 生成自動補完時會積極載入指令樹，以包含巢狀子指令。
