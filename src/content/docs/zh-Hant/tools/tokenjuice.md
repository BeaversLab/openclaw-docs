---
summary: "使用選用的 Tokenjuice 外掛程式壓縮嘈雜的 exec 和 bash 工具結果"
title: "Tokenjuice"
read_when:
  - You want shorter `exec` or `bash` tool results in OpenClaw
  - You want to install or enable the Tokenjuice plugin
  - You need to understand what tokenjuice changes and what it leaves raw
---

`tokenjuice` 是一個選用的外部外掛程式，可在命令執行後壓縮嘈雜的 `exec` 和 `bash`
工具結果。

它會變更傳回的 `tool_result`，而非命令本身。Tokenjuice 不會
重寫 shell 輸入、重新執行命令或變更退出代碼。

目前這適用於 Codex app-server harness 中的 OpenClaw 嵌入式運行和 OpenClaw 動態工具。Tokenjuice 掛鉤 OpenClaw 的工具結果中介軟體，並在輸出返回到作用中的 harness 會話之前對其進行修剪。

## 啟用外掛程式

安裝一次：

```bash
openclaw plugins install clawhub:@openclaw/tokenjuice
```

然後啟用它：

```bash
openclaw config set plugins.entries.tokenjuice.enabled true
```

同等於：

```bash
openclaw plugins enable tokenjuice
```

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

- 在將嘈雜的 `exec` 和 `bash` 結果饋送回工作階段之前壓縮它們。
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
