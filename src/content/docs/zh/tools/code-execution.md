---
summary: "code_execution：使用 xAI 运行沙箱隔离的远程 Python 分析"
read_when:
  - You want to enable or configure code_execution
  - You want remote analysis without local shell access
  - You want to combine x_search or web_search with remote Python analysis
title: "代码执行"
---

`code_execution` 在 xAI 的 Responses API 上运行沙箱隔离的远程 Python 分析。它由捆绑的 `xai` 插件注册（在 `tools` 契约下），并分派到与 `x_search` 使用的相同的 `https://api.x.ai/v1/responses` 端点。

| 属性            | 值                                                                                    |
| --------------- | ------------------------------------------------------------------------------------- |
| 工具名称        | `code_execution`                                                                      |
| 提供者插件      | `xai`（已捆绑，`enabledByDefault: true`）                                             |
| 认证            | xAI 身份验证配置文件，`XAI_API_KEY`，或 `plugins.entries.xai.config.webSearch.apiKey` |
| 默认模型        | `grok-4-1-fast`                                                                       |
| 默认超时        | 30 秒                                                                                 |
| 默认 `maxTurns` | 未设置（xAI 应用其内部限制）                                                          |

这与本地 [`exec`](/zh/tools/exec) 不同：

- `exec` 在您的计算机或配对节点上运行 Shell 命令。
- `code_execution` 在 xAI 的远程沙箱中运行 Python。

将 `code_execution` 用于：

- 计算。
- 制表。
- 快速统计。
- 图表式分析。
- 分析由 `x_search` 或 `web_search` 返回的数据。

当您需要本地文件、Shell、代码库或配对设备时，请**不要**使用它。请为此使用 [`exec`](/zh/tools/exec)。

## 设置

<Steps>
  <Step title="提供 xAI 凭据">
    使用符合条件的 SuperGrok 或 X 高级订阅通过 Grok OAuth 登录，
    使用支持远程的设备代码流程，或存储 API 密钥。OAuth 适用于
    `code_execution` 和 `x_search`；`XAI_API_KEY` 或插件网络搜索
    配置也可以驱动 Grok `web_search`。

    ```bash
    openclaw models auth login --provider xai --method oauth
    openclaw models auth login --provider xai --device-code
    ```

    在全新安装期间，新手引导内也提供相同的身份验证选项：

    ```bash
    openclaw onboard --install-daemon
    openclaw onboard --install-daemon --auth-choice xai-device-code
    ```

    或使用 API 密钥：

    ```bash
    openclaw models auth login --provider xai --method api-key
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

  <Step title="启用并调优 code_execution">
    当提供 xAI 凭据时，可以使用 `code_execution`。将
    `plugins.entries.xai.config.codeExecution.enabled` 设置为 `false` 可将其禁用，
    或使用同一配置块来调整模型和超时。

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

  <Step title="重启 Gateway(网关)">
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

当工具在没有身份验证的情况下运行时，它会返回一个结构化的 `missing_xai_api_key` 错误，指向身份验证配置文件、环境变量和配置选项。该错误是 JSON，而不是抛出的异常，因此代理可以自我纠正：

```json
{
  "error": "missing_xai_api_key",
  "message": "code_execution needs xAI credentials. Run `openclaw onboard --auth-choice xai-oauth` to sign in with Grok, run `openclaw onboard --auth-choice xai-api-key`, set `XAI_API_KEY` in the Gateway environment, or configure `plugins.entries.xai.config.webSearch.apiKey`.",
  "docs": "https://docs.openclaw.ai/tools/code-execution"
}
```

## 限制

- 这是远程 xAI 执行，而不是本地进程执行。
- 将结果视为临时分析，而不是持久的 notebook 会话。
- 不要假设可以访问本地文件或您的工作区。
- 要获取最新的 X 数据，请先使用 [`x_search`](/zh/tools/web#x_search)，然后将结果通过管道传递给 `code_execution`。

## 相关

<CardGroup cols={2}>
  <Card title="Exec 工具" href="/zh/tools/exec" icon="terminal">
    在您的计算机或配对节点上执行本地 Shell。
  </Card>
  <Card title="Exec 审批" href="/zh/tools/exec-approvals" icon="shield">
    用于 Shell 执行的允许/拒绝策略。
  </Card>
  <Card title="Web 工具" href="/zh/tools/web" icon="globe">
    `web_search`、`x_search` 和 `web_fetch`。
  </Card>
  <Card title="xAI 提供商" href="/zh/providers/xai" icon="microchip">
    Grok 模型、Web/X 搜索和代码执行配置。
  </Card>
</CardGroup>
