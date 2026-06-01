---
summary: "`openclaw docs`CLICLI 参考手册（搜索实时文档索引）"
read_when:
  - You want to search the live OpenClaw docs from the terminal
  - You need to know which hosted search API the docs CLI calls
title: "文档"
---

# `openclaw docs`

从终端搜索实时 OpenClaw 文档索引。该命令调用 OpenClaw 托管在 Cloudflare 上的文档搜索 API，并在您的终端中呈现结果。

## 用法

```bash
openclaw docs                       # print docs entrypoint and example search
openclaw docs <query...>            # search the live docs index
```

参数：

| 参数         | 描述                                                         |
| ------------ | ------------------------------------------------------------ |
| `[query...]` | 自由形式的搜索查询。多词查询会用空格连接并作为一个整体发送。 |

## 示例

```bash
openclaw docs browser existing-session
openclaw docs sandbox allowHostControl
openclaw docs gateway token secretref
```

如果没有查询，`openclaw docs` 将打印文档入口 URL 以及一个示例搜索命令，而不是运行搜索。

## 工作原理

`openclaw docs` 调用 `https://docs.openclaw.ai/api/search` 并呈现 JSON 结果。搜索调用使用固定的 30 秒超时。

## 输出

在富文本（TTY）终端中，结果呈现为标题后跟项目符号列表。每个项目符号显示页面标题、链接的文档 URL，以及下一行的简短片段。空结果打印“No results.”。

在非富文本输出（管道传输、`--no-color`、脚本）中，相同的数据呈现为 Markdown 格式：

```markdown
# Docs search: <query>

- [Title](https://docs.openclaw.ai/...) - snippet
- [Title](https://docs.openclaw.ai/...) - snippet
```

## 退出代码

| 代码 | 含义                                             |
| ---- | ------------------------------------------------ |
| `0`  | 搜索成功（包括零结果响应）。                     |
| `1`  | 托管的文档搜索 API 调用失败；stderr 将内联打印。 |

## 相关

- [CLI 参考](CLI/en/cli)
- [实时文档](https://docs.openclaw.ai)
