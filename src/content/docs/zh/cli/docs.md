---
summary: "`openclaw docs`CLICLI 参考手册（搜索实时文档索引）"
read_when:
  - You want to search the live OpenClaw docs from the terminal
  - You need to know which helper binaries the docs CLI shells out to
title: "文档"
---

# `openclaw docs`

从终端搜索实时的 OpenClaw 文档索引。该命令会调用位于 OpenClaw`https://docs.openclaw.ai/mcp.search_open_claw` 的公共 Mintlify 托管文档 MCP 搜索端点，并在您的终端中呈现结果。

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

如果没有提供查询，`openclaw docs` 将打印文档入口 URL 和一个示例搜索命令，而不是执行搜索。

## 工作原理

`openclaw docs` 调用 `mcporter`CLI CLI 来调用文档搜索 MCP 工具，然后解析工具输出中的 `Title: / Link: / Content:` 代码块，将其转换为结果列表。

为了解析 `mcporter`OpenClaw，OpenClaw 会按顺序检查：

1. `mcporter` 在 `PATH` 上（如果存在则直接使用）。
2. 如果安装了 `pnpm`，则使用 `pnpm dlx mcporter ...`。
3. 如果安装了 `npx`，则使用 `npx -y mcporter ...`。

如果都不可用，命令将失败并提示安装 `pnpm` (`npm install -g pnpm`)。

搜索调用使用固定的 30 秒超时。结果摘要会截断为每条约 220 个字符。

## 输出

在富文本 (TTY) 终端中，结果渲染为标题后跟项目符号列表。每个项目符号显示页面标题、链接的文档 URL，以及下一行的简短摘要。如果结果为空，则打印“无结果”。

在非富文本输出（管道传输、`--no-color`、脚本）中，相同的数据以 Markdown 格式渲染：

```markdown
# Docs search: <query>

- [Title](https://docs.openclaw.ai/...) - snippet
- [Title](https://docs.openclaw.ai/...) - snippet
```

## 退出代码

| 代码 | 含义                                |
| ---- | ----------------------------------- |
| `0`  | 搜索成功（包括零结果响应）。        |
| `1`  | MCP 工具调用失败；stderr 内联打印。 |

## 相关

- [CLI 参考手册](CLI/en/cli)
- [实时文档](https://docs.openclaw.ai)
