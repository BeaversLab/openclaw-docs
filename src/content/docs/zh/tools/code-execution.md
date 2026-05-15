---
summary: "code_execution: 使用 xAI 运行沙箱隔离的远程 Python 分析"
read_when:
  - You want to enable or configure code_execution
  - You want remote analysis without local shell access
  - You want to combine x_search or web_search with remote Python analysis
title: "代码执行"
---

`code_execution` 在 xAI 的 Responses API 上运行沙箱隔离的远程 Python 分析。它由内置的 `xai` 插件注册（基于 `tools` 协定），并调度到与 `x_search` 使用的相同的 `https://api.x.ai/v1/responses` 端点。

| 属性            | 值                                                                               |
| --------------- | -------------------------------------------------------------------------------- |
| 工具名称        | `code_execution`                                                                 |
| 提供者插件      | `xai`（内置，`enabledByDefault: true`）                                          |
| 认证            | xAI 认证配置文件、`XAI_API_KEY` 或 `plugins.entries.xai.config.webSearch.apiKey` |
| 默认模型        | `grok-4-1-fast`                                                                  |
| 默认超时        | 30 秒                                                                            |
| 默认 `maxTurns` | 未设置（xAI 应用其内部限制）                                                     |

这与本地 [`exec`](/zh/tools/exec) 不同：

- `exec` 在您的计算机或配对节点上运行 Shell 命令。
- `code_execution` 在 xAI 的远程沙箱中运行 Python。

将 `code_execution` 用于：

- 计算。
- 制表。
- 快速统计。
- 图表式分析。
- 分析 `x_search` 或 `web_search` 返回的数据。

当您需要本地文件、Shell、仓库或配对设备时，请**不要**使用它。请改用 [`exec`](/zh/tools/exec)。

## 设置

<Steps>
  <Step title="提供 xAI API 密钥">
    为 `code_execution` 和 `x_search` 运行 `openclaw onboard --auth-choice xai-api-key`，
    或设置 `XAI_API_KEY` / 在 xAI 插件下配置密钥，
    当您还希望 Grok 网络搜索使用相同的凭据时：

    ```bash
    export XAI_API_KEY=xai-...
    ```

    或通过配置：

    ```json5
    {
      plugins: {
        entries: {
          xai: {
            config: {
              webSearch: {
                apiKey: "xai-...",
              },
            },
          },
        },
      },
    }
    ```

  </Step>

  <Step title="启用并调整 code_execution">
    该工具受 `plugins.entries.xai.config.codeExecution.enabled` 限制。默认为关闭。

    ```json5
    {
      plugins: {
        entries: {
          xai: {
            config: {
              codeExecution: {
                enabled: true,
                model: "grok-4-1-fast", // override the default xAI code-execution model
                maxTurns: 2,            // optional cap on internal tool turns
                timeoutSeconds: 30,     // request timeout (default: 30)
              },
            },
          },
        },
      },
    }
    ```

  </Step>

  <Step title="Gateway(网关)重启 Gateway">
    ```bash
    openclaw gateway restart
    ```

    一旦 xAI 插件向 `enabled: true` 重新注册，`code_execution` 就会显示在代理的工具列表中。

  </Step>
</Steps>

## 如何使用它

自然地提问并明确分析意图：

```text
Use code_execution to calculate the 7-day moving average for these numbers: ...
```

```text
Use x_search to find posts mentioning OpenClaw this week, then use code_execution to count them by day.
```

```text
Use web_search to gather the latest AI benchmark numbers, then use code_execution to compare percent changes.
```

该工具在内部接受单个 `task` 参数，因此代理应在一个提示中发送完整的分析请求和任何内联数据。

## 错误

当工具在未授权的情况下运行时，它会返回一个结构化的 `missing_xai_api_key` 错误，指向 auth-profile、环境变量和配置选项。该错误是 JSON，而不是抛出的异常，因此代理可以自我纠正：

```json
{
  "error": "missing_xai_api_key",
  "message": "code_execution needs an xAI API key. Run openclaw onboard --auth-choice xai-api-key, set XAI_API_KEY in the Gateway environment, or configure plugins.entries.xai.config.webSearch.apiKey.",
  "docs": "https://docs.openclaw.ai/tools/code-execution"
}
```

## 限制

- 这是远程 xAI 执行，而不是本地进程执行。
- 将结果视为临时分析，而不是持久的 notebook 会话。
- 不要假设可以访问本地文件或您的工作区。
- 对于最新的 X 数据，请先使用 [`x_search`](/zh/tools/web#x_search) 并将结果通过管道传递给 `code_execution`。

## 相关

<CardGroup cols={2}>
  <Card title="Exec 工具" href="/zh/tools/exec" icon="terminal">
    在您的计算机或配对节点上执行本地 Shell。
  </Card>
  <Card title="Exec 批准" href="/zh/tools/exec-approvals" icon="shield">
    Shell 执行的允许/拒绝策略。
  </Card>
  <Card title="Web 工具" href="/zh/tools/web" icon="globe">
    `web_search`、`x_search` 和 `web_fetch`。
  </Card>
  <Card title="xAI 提供商" href="/zh/providers/xai" icon="microchip">
    Grok 模型、web/x 搜索和代码执行配置。
  </Card>
</CardGroup>
