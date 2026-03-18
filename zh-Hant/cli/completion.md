---
summary: "CLI 參考手冊，適用於 `openclaw completion`（生成/安裝 Shell 自動補全腳本）"
read_when:
  - You want shell completions for zsh/bash/fish/PowerShell
  - You need to cache completion scripts under OpenClaw state
title: "completion"
---

# `openclaw completion`

生成 Shell 自動補全腳本，並可選擇將其安裝至您的 Shell 設定檔中。

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

- `-s, --shell <shell>`：Shell 目標（`zsh`、`bash`、`powershell`、`fish`；預設值：`zsh`）
- `-i, --install`：透過在您的 Shell 設定檔中加入 source 指令來安裝自動補全
- `--write-state`：將自動補全腳本寫入 `$OPENCLAW_STATE_DIR/completions` 而不輸出至標準輸出
- `-y, --yes`：略過安裝確認提示

## 備註

- `--install` 會在您的 Shell 設定檔中寫入一個小型的「OpenClaw Completion」區塊，並將其指向快取的腳本。
- 若未使用 `--install` 或 `--write-state`，該指令會將腳本輸出至標準輸出。
- 自動補全的產生會預先載入指令樹，以便包含巢狀的子指令。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
