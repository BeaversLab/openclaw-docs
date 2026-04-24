---
title: "Tokenjuice"
summary: "使用選用性的隨附外掛程式壓縮喧鬧的 exec 和 bash 工具結果"
read_when:
  - You want shorter `exec` or `bash` tool results in OpenClaw
  - You want to enable the bundled tokenjuice plugin
  - You need to understand what tokenjuice changes and what it leaves raw
---

# Tokenjuice

`tokenjuice` 是一個選用的隨附外掛程式，可在指令執行完畢後，壓縮喧鬧的 `exec` 和 `bash`
工具結果。

它會改變傳回的 `tool_result`，而不是指令本身。Tokenjuice 不會
重寫 shell 輸入、重新執行指令，或變更結束代碼。

目前這適用於 Pi 嵌入式執行，其中 tokenjuice 會掛載嵌入式的
`tool_result` 路徑，並修剪傳回工作階段的輸出。

## 啟用外掛程式

快速路徑：

```bash
openclaw config set plugins.entries.tokenjuice.enabled true
```

相等於：

```bash
openclaw plugins enable tokenjuice
```

OpenClaw 已經隨附此外掛程式。沒有單獨的 `plugins install`
或 `tokenjuice install openclaw` 步驟。

如果您偏好直接編輯設定：

```json5
{
  plugins: {
    entries: {
      tokenjuice: {
        enabled: true,
      },
    },
  },
}
```

## Tokenjuice 變更的內容

- 在喧鬧的 `exec` 和 `bash` 結果被饋送回工作階段之前，先將其壓縮。
- 保持原始指令執行不受影響。
- 保留精確的檔案內容讀取，以及 tokenjuice 應保留原樣的其他指令。
- 保持選用性：如果您希望在所有地方使用逐字輸出，請停用此外掛程式。

## 驗證其是否正常運作

1. 啟用外掛程式。
2. 啟動可以呼叫 `exec` 的工作階段。
3. 執行一個喧鬧的指令，例如 `git status`。
4. 檢查傳回的工具結果是否比原始 shell 輸出更簡短且結構更完整。

## 停用外掛程式

```bash
openclaw config set plugins.entries.tokenjuice.enabled false
```

或者：

```bash
openclaw plugins disable tokenjuice
```
