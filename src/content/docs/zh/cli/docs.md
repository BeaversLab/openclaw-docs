---
summary: "`openclaw docs` 的 CLI 参考（搜索实时文档索引）"
read_when:
  - You want to search the live OpenClaw docs from the terminal
title: "docs"
---

# `openclaw docs`

搜索实时文档索引。

参数：

- `[query...]`：发送到实时文档索引的搜索词

示例：

```bash
openclaw docs
openclaw docs browser existing-session
openclaw docs sandbox allowHostControl
openclaw docs gateway token secretref
```

说明：

- 如果没有查询，`openclaw docs` 会打开实时文档搜索入口。
- 多词查询将作为一个搜索请求传递。
