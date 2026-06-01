---
summary: "`openclaw docs`（搜尋即時文件索引）的 CLI 參考"
read_when:
  - You want to search the live OpenClaw docs from the terminal
  - You need to know which hosted search API the docs CLI calls
title: "文件"
---

# `openclaw docs`

從終端機搜尋即時 OpenClaw 文件索引。此指令會呼叫 OpenClaw 託管於 Cloudflare 的文件搜尋 API，並在您的終端機中顯示結果。

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

如果沒有提供查詢，`openclaw docs` 會印出文件入口網站 URL 以及一個搜尋指令範例，而不是執行搜尋。

## 運作方式

`openclaw docs` 會呼叫 `https://docs.openclaw.ai/api/search` 並顯示 JSON 結果。搜尋呼叫使用固定的 30 秒逾時。

## 輸出

在豐富 (TTY) 終端機中，結果會以標題加上項目符號清單的方式呈現。每個項目會顯示頁面標題、連結的文件 URL，以及下一行的簡短摘要。如果沒有結果，會顯示「No results.」。

在非豐富輸出 (管道、`--no-color`、腳本) 中，相同的資料會以 Markdown 格式呈現：

```markdown
# Docs search: <query>

- [Title](https://docs.openclaw.ai/...) - snippet
- [Title](https://docs.openclaw.ai/...) - snippet
```

## 結束代碼

| 代碼 | 含義                                             |
| ---- | ------------------------------------------------ |
| `0`  | 搜尋成功 (包含結果為零的回應)。                  |
| `1`  | 託管的文件搜尋 API 呼叫失敗；stderr 會直接印出。 |

## 相關

- [CLI 參考](/zh-Hant/cli)
- [即時文件](https://docs.openclaw.ai)
