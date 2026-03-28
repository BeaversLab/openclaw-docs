---
summary: "CLI 參考，用於 `openclaw completion`（生成/安裝 Shell 自動完成腳本）"
read_when:
  - You want shell completions for zsh/bash/fish/PowerShell
  - You need to cache completion scripts under OpenClaw state
title: "completion"
---

# `openclaw completion`

生成 Shell 自動完成腳本，並可選擇將其安裝到您的 Shell 配置檔案中。

## 使用方式

```exec
openclaw completion
openclaw completion --shell zsh
openclaw completion --install
openclaw completion --shell fish --install
openclaw completion --write-state
openclaw completion --shell bash --write-state
```

## 選項

- `-s, --shell <shell>`：Shell 目標（`zsh`、`bash`、`powershell`、`fish`；預設：`zsh`）
- `-i, --install`：透過新增 source 行到您的 Shell 配置檔案來安裝自動完成
- `--write-state`：將自動完成腳本寫入 `$OPENCLAW_STATE_DIR/completions` 而不列印到標準輸出
- `-y, --yes`：略過安裝確認提示

## 備註

- `--install` 會將一個小型「OpenClaw Completion」區塊寫入您的 shell profile，並將其指向快取腳本。
- 若沒有 `--install` 或 `--write-state`，此指令會將腳本列印至 stdout。
- Completion 生成會積極載入指令樹，以便包含巢狀子指令。
