---
summary: "`openclaw completion` 的 CLI 參考（生成/安裝 Shell 自動補全腳本）"
read_when:
  - 您想要 zsh/bash/fish/PowerShell 的 Shell 自動補全功能
  - 您需要在 OpenClaw 狀態下快取自動補全腳本
title: "completion"
---

# `openclaw completion`

生成 Shell 自動補全腳本，並選擇性地將其安裝到您的 Shell 設定檔中。

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

- `-s, --shell <shell>`: Shell 目標（`zsh`、`bash`、`powershell`、`fish`；預設：`zsh`）
- `-i, --install`：透過在 Shell 設定檔中新增 source 指令行來安裝自動補全
- `--write-state`：將自動補全腳本寫入 `$OPENCLAW_STATE_DIR/completions` 而不列印到標準輸出
- `-y, --yes`：略過安裝確認提示

## 注意事項

- `--install` 會將一個小型的「OpenClaw Completion」區塊寫入您的 shell 設定檔，並將其指向快取的腳本。
- 如果沒有 `--install` 或 `--write-state`，此指令會將腳本列印到標準輸出。
- 補全產生功能會積極載入指令樹，以便包含巢狀子指令。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
