---
title: "Codex 约束"
summary: "通过捆绑的 Codex 应用服务器约束运行 OpenClaw 嵌入式代理轮次"
read_when:
  - You want to use the bundled Codex app-server harness
  - You need Codex model refs and config examples
  - You want to disable PI fallback for Codex-only deployments
---

# Codex 约束

捆绑的 `codex` 插件允许 OpenClaw 通过 Codex 应用服务器运行嵌入式代理轮次，而不是通过内置的 PI 约束。

当您希望 Codex 拥有底层代理会话时使用此功能：模型发现、原生线程恢复、原生压缩和应用服务器执行。
OpenClaw 仍然拥有聊天频道、会话文件、模型选择、工具、批准、媒体传输和可见的记录镜像。

该约束默认关闭。仅当启用 `codex` 插件且解析出的模型是 `codex/*` 模型时，或者当您显式强制 `embeddedHarness.runtime: "codex"` 或 `OPENCLAW_AGENT_RUNTIME=codex` 时，才会选择它。
如果您从不配置 `codex/*`，现有的 PI、OpenAI、Anthropic、Gemini、本地和自定义提供商运行将保持其当前行为。

## 选择正确的模型前缀

OpenClaw 具有针对 OpenAI 和 Codex 形式访问的独立路由：

| 模型引用               | 运行时路径                            | 使用场景                                                    |
| ---------------------- | ------------------------------------- | ----------------------------------------------------------- |
| `openai/gpt-5.4`       | 通过 OpenAI/PI 管道的 OpenClaw 提供商 | 您希望通过 `OPENAI_API_KEY` 直接访问 OpenAI 平台 API。      |
| `openai-codex/gpt-5.4` | 通过 PI 的 OpenAI Codex OAuth 提供商  | 您希望使用不带 Codex 应用服务器约束的 ChatGPT/Codex OAuth。 |
| `codex/gpt-5.4`        | 捆绑的 Codex 提供商加上 Codex 约束    | 您希望为嵌入式代理轮次使用原生 Codex 应用服务器执行。       |

Codex 约束仅声明 `codex/*` 模型引用。现有的 `openai/*`、
`openai-codex/*`、Anthropic、Gemini、xAI、本地和自定义提供商引用保持
其正常路径。

## 要求

- OpenClaw 包含可用的捆绑 `codex` 插件。
- Codex 应用服务器 `0.118.0` 或更新版本。
- Codex 身份验证对应用服务器进程可用。

该插件会阻止较旧或未版本化的应用服务器握手。这使
OpenClaw 保持在其经过测试的协议表面上。

对于实时和 Docker 烟雾测试，身份验证通常来自 `OPENAI_API_KEY`，加上可选的 Codex Docker 文件，例如 `~/.codex/auth.json` 和 `~/.codex/config.toml`。请使用本地 Codex 应用服务器使用的相同身份验证材料。

## 最小配置

使用 `codex/gpt-5.4`，启用捆绑的插件，并强制 `codex` 约束：

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
      },
    },
  },
  agents: {
    defaults: {
      model: "codex/gpt-5.4",
      embeddedHarness: {
        runtime: "codex",
        fallback: "none",
      },
    },
  },
}
```

如果您的配置使用 `plugins.allow`，请在那里也包含 `codex`：

```json5
{
  plugins: {
    allow: ["codex"],
    entries: {
      codex: {
        enabled: true,
      },
    },
  },
}
```

将 `agents.defaults.model` 或代理模型设置为 `codex/<model>` 也会自动启用捆绑的 `codex` 插件。显式的插件条目在共享配置中仍然很有用，因为它使部署意图显而易见。

## 在不替换其他模型的情况下添加 Codex

当您希望 Codex 用于 `codex/*` 模型而 PI 用于其他所有情况时，请保留 `runtime: "auto"`：

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
      },
    },
  },
  agents: {
    defaults: {
      model: {
        primary: "codex/gpt-5.4",
        fallbacks: ["openai/gpt-5.4", "anthropic/claude-opus-4-6"],
      },
      models: {
        "codex/gpt-5.4": { alias: "codex" },
        "codex/gpt-5.4-mini": { alias: "codex-mini" },
        "openai/gpt-5.4": { alias: "gpt" },
        "anthropic/claude-opus-4-6": { alias: "opus" },
      },
      embeddedHarness: {
        runtime: "auto",
        fallback: "pi",
      },
    },
  },
}
```

使用此形式：

- `/model codex` 或 `/model codex/gpt-5.4` 使用 Codex 应用服务器约束。
- `/model gpt` 或 `/model openai/gpt-5.4` 使用 OpenAI 提供商路径。
- `/model opus` 使用 Anthropic 提供商路径。
- 如果选择了非 Codex 模型，PI 仍然是兼容性约束。

## 仅 Codex 部署

当您需要证明每个嵌入式代理轮次都使用 Codex 约束时，请禁用 PI 回退：

```json5
{
  agents: {
    defaults: {
      model: "codex/gpt-5.4",
      embeddedHarness: {
        runtime: "codex",
        fallback: "none",
      },
    },
  },
}
```

环境覆盖：

```bash
OPENCLAW_AGENT_RUNTIME=codex \
OPENCLAW_AGENT_HARNESS_FALLBACK=none \
openclaw gateway run
```

在禁用回退的情况下，如果 Codex 插件被禁用、请求的模型不是 `codex/*` 引用、应用服务器太旧或应用服务器无法启动，OpenClaw 将提前失败。

## 每代理 Codex

您可以让一个代理仅使用 Codex，而默认代理保持正常的自动选择：

```json5
{
  agents: {
    defaults: {
      embeddedHarness: {
        runtime: "auto",
        fallback: "pi",
      },
    },
    list: [
      {
        id: "main",
        default: true,
        model: "anthropic/claude-opus-4-6",
      },
      {
        id: "codex",
        name: "Codex",
        model: "codex/gpt-5.4",
        embeddedHarness: {
          runtime: "codex",
          fallback: "none",
        },
      },
    ],
  },
}
```

使用正常的会话命令来切换代理和模型。`/new` 创建一个新的 OpenClaw 会话，Codex 约束会根据需要创建或恢复其边车应用服务器线程。`/reset` 清除该线程的 OpenClaw 会话绑定。

## 模型发现

默认情况下，Codex 插件向应用服务器请求可用模型。如果发现失败或超时，它将使用捆绑的回退目录：

- `codex/gpt-5.4`
- `codex/gpt-5.4-mini`
- `codex/gpt-5.2`

您可以在 `plugins.entries.codex.config.discovery` 下调整发现：

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
        config: {
          discovery: {
            enabled: true,
            timeoutMs: 2500,
          },
        },
      },
    },
  },
}
```

当您希望启动时避免探测 Codex 并坚持使用后备目录时，请禁用发现：

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
        config: {
          discovery: {
            enabled: false,
          },
        },
      },
    },
  },
}
```

## 应用服务器连接与策略

默认情况下，该插件使用以下内容在本地启动 Codex：

```bash
codex app-server --listen stdio://
```

默认情况下，OpenClaw 会要求 Codex 请求原生审批。您可以进一步调整该策略，例如通过收紧策略并将审查通过 guardian 进行路由：

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
        config: {
          appServer: {
            approvalPolicy: "untrusted",
            approvalsReviewer: "guardian_subagent",
            sandbox: "workspace-write",
            serviceTier: "priority",
          },
        },
      },
    },
  },
}
```

对于已在运行的应用服务器，请使用 WebSocket 传输：

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
        config: {
          appServer: {
            transport: "websocket",
            url: "ws://127.0.0.1:39175",
            authToken: "${CODEX_APP_SERVER_TOKEN}",
            requestTimeoutMs: 60000,
          },
        },
      },
    },
  },
}
```

支持的 `appServer` 字段：

| 字段                | 默认值                                   | 含义                                                        |
| ------------------- | ---------------------------------------- | ----------------------------------------------------------- |
| `transport`         | `"stdio"`                                | `"stdio"` 生成 Codex；`"websocket"` 连接到 `url`。          |
| `command`           | `"codex"`                                | stdio 传输的可执行文件。                                    |
| `args`              | `["app-server", "--listen", "stdio://"]` | stdio 传输的参数。                                          |
| `url`               | 未设置                                   | WebSocket 应用服务器 URL。                                  |
| `authToken`         | 未设置                                   | WebSocket 传输的 Bearer 令牌。                              |
| `headers`           | `{}`                                     | 额外的 WebSocket 头部。                                     |
| `requestTimeoutMs`  | `60000`                                  | 应用服务器控制平面调用的超时时间。                          |
| `approvalPolicy`    | `"on-request"`                           | 发送到线程启动/恢复/轮次的原生 Codex 批准策略。             |
| `sandbox`           | `"workspace-write"`                      | 发送到线程启动/恢复的原生 Codex 沙盒模式。                  |
| `approvalsReviewer` | `"user"`                                 | 使用 `"guardian_subagent"` 让 Codex guardian 审查原生批准。 |
| `serviceTier`       | 未设置                                   | 可选的 Codex 服务层，例如 `"priority"`。                    |

当未设置相应的配置字段时，旧的环境变量仍可作为本地测试的后备方案：

- `OPENCLAW_CODEX_APP_SERVER_BIN`
- `OPENCLAW_CODEX_APP_SERVER_ARGS`
- `OPENCLAW_CODEX_APP_SERVER_APPROVAL_POLICY`
- `OPENCLAW_CODEX_APP_SERVER_SANDBOX`
- `OPENCLAW_CODEX_APP_SERVER_GUARDIAN=1`

配置更适合可重复的部署。

## 常用方案

具有默认 stdio 传输的本地 Codex：

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
      },
    },
  },
}
```

仅 Codex 挂载验证，禁用 PI 回退：

```json5
{
  embeddedHarness: {
    fallback: "none",
  },
  plugins: {
    entries: {
      codex: {
        enabled: true,
      },
    },
  },
}
```

Guardian 审查的 Codex 批准：

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
        config: {
          appServer: {
            approvalPolicy: "on-request",
            approvalsReviewer: "guardian_subagent",
            sandbox: "workspace-write",
          },
        },
      },
    },
  },
}
```

具有显式标头的远程应用服务器：

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
        config: {
          appServer: {
            transport: "websocket",
            url: "ws://gateway-host:39175",
            headers: {
              "X-OpenClaw-Agent": "main",
            },
          },
        },
      },
    },
  },
}
```

模型切换仍由 OpenClaw 控制。当 OpenClaw 会话附加到现有 Codex 线程时，下一轮会将当前选定的 `codex/*` 模型、提供商、批准策略、沙箱和服务层再次发送到应用服务器。从 `codex/gpt-5.4` 切换到 `codex/gpt-5.2` 会保持线程绑定，但要求 Codex 使用新选择的模型继续。

## Codex 命令

捆绑插件将 `/codex` 注册为授权的斜杠命令。它是通用的，适用于任何支持 OpenClaw 文本命令的渠道。

常见形式：

- `/codex status` 显示实时的应用服务器连接、模型、账户、速率限制、MCP 服务器和技能。
- `/codex models` 列出实时的 Codex 应用服务器模型。
- `/codex threads [filter]` 列出最近的 Codex 线程。
- `/codex resume <thread-id>` 将当前 OpenClaw 会话附加到现有的 Codex 线程。
- `/codex compact` 要求 Codex 应用服务器压缩附加的线程。
- `/codex review` 启动针对附加线程的 Codex 本机审查。
- `/codex account` 显示账户和速率限制状态。
- `/codex mcp` 列出 Codex 应用服务器 MCP 服务器状态。
- `/codex skills` 列出 Codex 应用服务器技能。

`/codex resume` 写入与挂载用于正常轮次的相同的 sidecar 绑定文件。在下一条消息中，OpenClaw 恢复该 Codex 线程，将当前选定的 OpenClaw `codex/*` 模型传递给应用服务器，并保持启用扩展历史记录。

命令界面需要 Codex 应用服务器 `0.118.0` 或更新版本。如果未来或自定义应用服务器未公开该 JSON-RPC 方法，则各个控制方法将被报告为 `unsupported by this Codex app-server`。

## 工具、媒体和压缩

Codex 挂载仅更改低级嵌入式代理执行器。

OpenClaw 仍然构建工具列表并从 harness 接收动态工具结果。文本、图像、视频、音乐、TTS、审批和消息传递工具输出继续通过正常的 OpenClaw 传递路径。

当所选模型使用 Codex harness 时，原生线程压缩被委派给 Codex 应用服务器。OpenClaw 会保留一个用于渠道历史、搜索、`/new`、`/reset` 以及未来模型或 harness 切换的记录镜像。该镜像包括用户提示、最终助手文本，以及当应用服务器发出它们时的轻量级 Codex 推理或计划记录。

媒体生成不需要 PI。图像、视频、音乐、PDF、TTS 和媒体理解继续使用匹配的提供商/模型设置，例如 `agents.defaults.imageGenerationModel`、`videoGenerationModel`、`pdfModel` 和 `messages.tts`。

## 故障排除

**Codex 未出现在 `/model` 中：** 启用 `plugins.entries.codex.enabled`，设置 `codex/*` 模型引用，或检查 `plugins.allow` 是否排除了 `codex`。

**OpenClaw 回退到 PI：** 在测试期间设置 `embeddedHarness.fallback: "none"` 或 `OPENCLAW_AGENT_HARNESS_FALLBACK=none`。

**应用服务器被拒绝：** 升级 Codex，使应用服务器握手报告的版本为 `0.118.0` 或更新。

**模型发现缓慢：** 降低 `plugins.entries.codex.config.discovery.timeoutMs` 或禁用发现。

**WebSocket 传输立即失败：** 检查 `appServer.url`、`authToken`，并确保远程应用服务器使用相同的 Codex 应用服务器协议版本。

**非 Codex 模型使用 PI：** 这是预期的。Codex harness 仅声明 `codex/*` 模型引用。

## 相关

- [Agent Harness 插件](/zh/plugins/sdk-agent-harness)
- [模型提供商](/zh/concepts/model-providers)
- [配置参考](/zh/gateway/configuration-reference)
- [测试](/zh/help/testing#live-codex-app-server-harness-smoke)
