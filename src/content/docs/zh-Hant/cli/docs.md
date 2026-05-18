---
summary: "`openclaw docs`（搜尋即時文件索引）的 CLI 參考"
read_when:
  - You want to search the live OpenClaw docs from the terminal
  - You need to know which helper binaries the docs CLI shells out to
title: "文件"
---

# `openclaw docs`

從終端機搜尋即時的 OpenClaw 文件索引。此指令會調用託管在 Mintlify 的公開文件 MCP 搜尋端點 `https://docs.openclaw.ai/mcp.search_open_claw`，並在您的終端機中呈現結果。

## 使用方式

```bash
openclaw docs                       # print docs entrypoint and example search
openclaw docs <query...>            # search the live docs index
```

引數：

| 引數         | 說明                                                               |
| ------------ | ------------------------------------------------------------------ |
| `[query...]` | 自由格式的搜尋查詢。多字詞查詢會以空格連接並作為一個單一查詢傳送。 |

## 範例

```bash
openclaw docs browser existing-session
openclaw docs sandbox allowHostControl
openclaw docs gateway token secretref
```

若沒有提供查詢，`openclaw docs` 會印出文件入口 URL 以及一個範例搜尋指令，而不是執行搜尋。

## 運作方式

`openclaw docs` 會呼叫 `mcporter` CLI 來使用文件搜尋 MCP 工具，然後將工具輸出中的 `Title: / Link: / Content:` 區塊解析為結果列表。

為了解析 `mcporter`，OpenClaw 會依序檢查：

1. `mcporter` 於 `PATH` 上（如果存在則直接使用）。
2. 若已安裝 `pnpm`，則使用 `pnpm dlx mcporter ...`。
3. 若已安裝 `npx`，則使用 `npx -y mcporter ...`。

如果都不可用，指令會失敗並提示安裝 `pnpm`（`npm install -g pnpm`）。

搜尋呼叫使用固定的 30 秒逾時。結果摘要會截斷為每個項目約 220 個字元。

## 輸出

在豐富（TTY）終端機中，結果會以標題後跟隨項目符號列表的方式呈現。每個項目符號顯示頁面標題、連結的文件 URL，以及下一行的簡短摘要。空結果會顯示「No results.」。

在非豐富輸出（管線、`--no-color`、指令碼）中，相同的資料會以 Markdown 格式呈現：

```markdown
# Docs search: <query>

- [Title](https://docs.openclaw.ai/...) - snippet
- [Title](https://docs.openclaw.ai/...) - snippet
```

## 退出代碼

| 代碼 | 含義                                  |
| ---- | ------------------------------------- |
| `0`  | 搜尋成功（包括零結果的回應）。        |
| `1`  | MCP 工具呼叫失敗；stderr 會直接印出。 |

## 相關

- [CLI 參考](/zh-Hant/cli)
- [即時文件](https://docs.openclaw.ai)
