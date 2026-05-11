---
summary: "使用可選的內建外掛程式精簡嘈雜的 exec 和 bash 工具結果"
title: "Tokenjuice"
read_when:
  - You want shorter `exec` or `bash` tool results in OpenClaw
  - You want to enable the bundled tokenjuice plugin
  - You need to understand what tokenjuice changes and what it leaves raw
---

`tokenjuice` 是一個可選的內建外掛程式，可在命令執行後精簡嘈雜的 `exec` 和 `bash`
工具結果。

它會變更傳回的 `tool_result`，而不是命令本身。Tokenjuice 不會
重寫 shell 輸入、重新執行命令或變更結束代碼。

目前這適用於 Codex 應用程式伺服器線束中的 PI 嵌入式執行和 OpenClaw 動態工具。
Tokenjuice 掛接 OpenClaw 的工具結果中介軟體，並在輸出傳回作用中的線束工作階段之前將其修剪。

## 啟用外掛程式

快速途徑：

```bash
openclaw config set plugins.entries.tokenjuice.enabled true
```

對等項目：

```bash
openclaw plugins enable tokenjuice
```

OpenClaw 已隨附此外掛程式。沒有額外的 `plugins install`
或 `tokenjuice install openclaw` 步驟。

如果您偏好直接編輯組態：

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

## Tokenjuice 的變更內容

- 在將結果輸送回工作階段之前，精簡嘈雜的 `exec` 和 `bash` 結果。
- 保持原始命令執行不變。
- 保留精確的檔案內容讀取，以及 tokenjuice 應保持原樣的其他命令。
- 保持選擇性加入：如果您希望到處都是逐字輸出，請停用外掛程式。

## 驗證是否正常運作

1. 啟用外掛程式。
2. 啟動可呼叫 `exec` 的工作階段。
3. 執行嘈雜的命令，例如 `git status`。
4. 檢查傳回的工具結果是否比原始 shell 輸出更短且更有結構。

## 停用外掛程式

```bash
openclaw config set plugins.entries.tokenjuice.enabled false
```

或者：

```bash
openclaw plugins disable tokenjuice
```

## 相關內容

- [Exec 工具](/zh-Hant/tools/exec)
- [思考層級](/zh-Hant/tools/thinking)
- [情境引擎](/zh-Hant/concepts/context-engine)
