---
summary: "CLI 參考手冊，用於 `openclaw docs` (搜尋即時文件索引)"
read_when:
  - You want to search the live OpenClaw docs from the terminal
title: "docs"
---

# `openclaw docs`

搜尋即時文件索引。

引數：

- `[query...]`：要發送到即時文件索引的搜尋詞

範例：

```bash
openclaw docs
openclaw docs browser existing-session
openclaw docs sandbox allowHostControl
openclaw docs gateway token secretref
```

注意：

- 如果沒有查詢，`openclaw docs` 會開啟即時文件搜尋入口。
- 多字詞查詢將作為一個搜尋請求傳遞。
