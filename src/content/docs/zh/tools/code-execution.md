---
summary: "code_execution -- 使用 xAI 运行沙箱隔离的远程 Python 分析"
read_when:
  - You want to enable or configure code_execution
  - You want remote analysis without local shell access
  - You want to combine x_search or web_search with remote Python analysis
title: "代码执行"
---

# 代码执行

`code_execution` 在 xAI 的 Responses API 上运行沙箱隔离的远程 Python 分析。
这与本地的 [`exec`](/en/tools/exec) 不同：

- `exec` 在您的计算机或节点上运行 Shell 命令
- `code_execution` 在 xAI 的远程沙箱中运行 Python

使用 `code_execution` 进行：

- 计算
- 制表
- 快速统计
- 图表风格分析
- 分析由 `x_search` 或 `web_search` 返回的数据

当您需要本地文件、您的 Shell、您的仓库或配对设备时，请**不要**使用它。为此请使用 [`exec`](/en/tools/exec)。

## 设置

您需要一个 xAI API 密钥。以下任意一种均可：

- `XAI_API_KEY`
- `plugins.entries.xai.config.webSearch.apiKey`

示例：

```json5
{
  plugins: {
    entries: {
      xai: {
        config: {
          webSearch: {
            apiKey: "xai-...",
          },
          codeExecution: {
            enabled: true,
            model: "grok-4-1-fast",
            maxTurns: 2,
            timeoutSeconds: 30,
          },
        },
      },
    },
  },
}
```

## 如何使用

自然地提问，并明确说明分析意图：

```text
Use code_execution to calculate the 7-day moving average for these numbers: ...
```

```text
Use x_search to find posts mentioning OpenClaw this week, then use code_execution to count them by day.
```

```text
Use web_search to gather the latest AI benchmark numbers, then use code_execution to compare percent changes.
```

该工具在内部接受一个单一的 `task` 参数，因此 Agent 应在一个提示中发送完整的分析请求和任何内联数据。

## 限制

- 这是 xAI 远程执行，而非本地进程执行。
- 应将其视为临时分析，而非持久化笔记本。
- 不要假设可以访问本地文件或您的工作区。
- 对于最新的 X 数据，请先使用 [`x_search`](/en/tools/web#x_search)。

## 另请参阅

- [Web 工具](/en/tools/web)
- [Exec](/en/tools/exec)
- [xAI](/en/providers/xai)
