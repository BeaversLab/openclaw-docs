---
title: "Codex Harness"
summary: "通过内置的 Codex 应用服务器连接器运行 OpenClaw 嵌入式代理回合"
read_when:
  - You want to use the bundled Codex app-server harness
  - You need Codex model refs and config examples
  - You want to disable PI fallback for Codex-only deployments
---

# Codex 约束

内置的 `codex` 插件让 OpenClaw 通过 Codex 应用服务器运行嵌入式代理回合，而不是通过内置的 PI 连接器。

当您希望 Codex 拥有底层代理会话时使用此功能：模型发现、原生线程恢复、原生压缩和应用服务器执行。
OpenClaw 仍然拥有聊天频道、会话文件、模型选择、工具、批准、媒体传输和可见的记录镜像。

原生 Codex 回合也会遵循共享插件钩子，因此 prompt 垫片、感知压缩的自动化、工具中间件和生命周期观察器与 PI 连接器保持一致：

- `before_prompt_build`
- `before_compaction`，`after_compaction`
- `llm_input`，`llm_output`
- `tool_result`，`after_tool_call`
- `before_message_write`
- `agent_end`

捆绑插件还可以注册 Codex 应用服务器扩展工厂来添加异步 `tool_result` 中间件，并且镜像的 Codex 记录本写入通过 `before_message_write` 路由。

默认情况下，此工具是关闭的。只有在启用 `codex` 插件并且解析出的模型是 `codex/*` 模型时，或者当您显式强制 `embeddedHarness.runtime: "codex"` 或 `OPENCLAW_AGENT_RUNTIME=codex` 时，才会选择它。如果您从未配置 `codex/*`，现有的 PI、OpenAI、Anthropic、Gemini、本地和自定义提供商的运行将保持其当前行为。

## 选择正确的模型前缀

OpenClaw 针对开放 AI（OpenAI）和 Codex 形式的访问有单独的路由：

| 模型引用               | 运行时路径                             | 使用场景                                                              |
| ---------------------- | -------------------------------------- | --------------------------------------------------------------------- |
| `openai/gpt-5.4`       | 通过 OpenAI/PI 管道的 OpenClaw 提供商  | 您希望通过 `OPENAI_API_KEY` 直接访问 OpenAI 平台 API。                |
| `openai-codex/gpt-5.4` | 通过 PI 实现 OpenAI Codex OAuth 提供商 | 您希望在没有 Codex 应用服务器连接器的情况下使用 ChatGPT/Codex OAuth。 |
| `codex/gpt-5.4`        | 捆绑的 Codex 提供商加上 Codex 连接器   | 您希望为嵌入式智能体轮次使用原生的 Codex 应用服务器执行。             |

Codex 连接器仅声明 `codex/*` 模型引用。现有的 `openai/*`、
`openai-codex/*`、Anthropic、Gemini、xAI、本地和自定义提供商引用将
保留其正常路径。

## 要求

- 具有可用的捆绑 `codex` 插件的 OpenClaw。
- Codex 应用服务器 `0.118.0` 或更新版本。
- 向应用服务器进程提供 Codex 认证。

该插件会阻止较旧或未版本化的应用服务器握手。这可以确保 OpenClaw 保持在经过测试的协议层面上运行。

对于实时和 Docker 冒烟测试，身份验证通常来自 `OPENAI_API_KEY`，加上可选的 Codex CLI 文件，例如 `~/.codex/auth.json` 和 `~/.codex/config.toml`。请使用本地 Codex 应用服务器使用的相同身份验证材料。

## 最小配置

使用 `codex/gpt-5.4`，启用捆绑插件，并强制使用 `codex` 约束：

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

如果您的配置使用 `plugins.allow`，请也在其中包含 `codex`：

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

将 `agents.defaults.model` 或代理模型设置为 `codex/<model>` 也会自动启用捆绑的 `codex` 插件。在共享配置中，显式的插件条目仍然很有用，因为它使部署意图显而易见。

## 在不替换其他模型的情况下添加 Codex

保留 `runtime: "auto"`，以便将 Codex 用于 `codex/*` 模型，而将 PI 用于其他所有情况：

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

具有这种结构：

- `/model codex` 或 `/model codex/gpt-5.4` 使用 Codex 应用服务器 程序。
- `/model gpt` 或 `/model openai/gpt-5.4` 使用 OpenAI 提供商路径。
- `/model opus` 使用 Anthropic 提供商路径。
- 如果选择了非 Codex 模型，PI 将保持为兼容性 程序。

## 仅 Codex 部署

当您需要证明每个嵌入式代理轮次都使用 Codex 程序时，请禁用 PI 回退：

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

环境变量覆盖：

```bash
OPENCLAW_AGENT_RUNTIME=codex \
OPENCLAW_AGENT_HARNESS_FALLBACK=none \
openclaw gateway run
```

在禁用回退的情况下，如果 Codex 插件被禁用、所请求的模型不是 `codex/*` 引用、应用服务器版本过低或应用服务器无法启动，OpenClaw 将尽早失败。

## 每个代理的 Codex

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

使用正常的会话命令切换代理和模型。`/new` 创建一个新的 OpenClaw 会话，Codex harness 会根据需要创建或恢复其 sidecar 应用服务器线程。`/reset` 清除该线程的 OpenClaw 会话绑定。

## 模型发现

默认情况下，Codex 插件会向应用服务器请求可用模型。如果发现失败或超时，它将使用捆绑的回退目录：

- `codex/gpt-5.4`
- `codex/gpt-5.4-mini`
- `codex/gpt-5.2`

您可以在 `plugins.entries.codex.config.discovery` 下调整发现设置：

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

当您希望启动时避免探测 Codex 并坚持使用回退目录时，请禁用发现：

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

## 应用服务器连接和策略

默认情况下，插件会在本地启动 Codex，配置如下：

```bash
codex app-server --listen stdio://
```

默认情况下，OpenClaw 会以 YOLO 模式启动本地 Codex 控制会话：
`approvalPolicy: "never"`、`approvalsReviewer: "user"` 和
`sandbox: "danger-full-access"`。这是用于自主心跳的受信任本地操作员姿态：Codex 可以使用 shell 和网络工具，而不会在没有人回答的原生批准提示上停止。

要选择启用 Codex 守护者审查批准，请设置 `appServer.mode:
"guardian"`：

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
        config: {
          appServer: {
            mode: "guardian",
            serviceTier: "fast",
          },
        },
      },
    },
  },
}
```

守护者模式扩展为：

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
        config: {
          appServer: {
            mode: "guardian",
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

Guardian 是一个原生 Codex 审批审核者。当 Codex 请求离开沙盒、在工作区外写入或添加网络访问等权限时，Codex 会将该审批请求路由到审核者子代理，而不是人工提示。审核者收集上下文并应用 Codex 的风险框架，然后批准或拒绝特定请求。当您想要比 YOLO 模式更多的防护措施，但仍需要无人值守的代理和心跳来取得进展时，Guardian 非常有用。

Docker 实时工具包含一个 Guardian 探针，当 `OPENCLAW_LIVE_CODEX_HARNESS_GUARDIAN_PROBE=1` 时启用。它会在 Guardian 模式下启动 Codex 工具，验证一个良性升级的 shell 命令是否获得批准，并验证向不受信任的外部目标上传虚假机密是否被拒绝，以便代理请求明确批准。

各个策略字段仍然优先于 `mode`，因此高级部署可以将预设与显式选择混合使用。

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

| 字段                | 默认值                                   | 含义                                                                                |
| ------------------- | ---------------------------------------- | ----------------------------------------------------------------------------------- |
| `transport`         | `"stdio"`                                | `"stdio"` 生成 Codex；`"websocket"` 连接到 `url`。                                  |
| `command`           | `"codex"`                                | 用于 stdio 传输的可执行文件。                                                       |
| `args`              | `["app-server", "--listen", "stdio://"]` | 用于 stdio 传输的参数。                                                             |
| `url`               | 未设置                                   | WebSocket 应用服务器 URL。                                                          |
| `authToken`         | 未设置                                   | 用于 WebSocket 传输的 Bearer 令牌。                                                 |
| `headers`           | `{}`                                     | 额外的 WebSocket 头部。                                                             |
| `requestTimeoutMs`  | `60000`                                  | 应用服务器控制平面调用的超时时间。                                                  |
| `mode`              | `"yolo"`                                 | 用于 YOLO 或监护人审查执行的预设。                                                  |
| `approvalPolicy`    | `"never"`                                | 发送到线程启动/恢复/轮次的本地 Codex 审批策略。                                     |
| `sandbox`           | `"danger-full-access"`                   | 发送到线程启动/恢复的本地 Codex 沙箱模式。                                          |
| `approvalsReviewer` | `"user"`                                 | 使用 `"guardian_subagent"` 让 Codex Guardian 审查提示词。                           |
| `serviceTier`       | 未设置                                   | 可选的 Codex 应用服务器服务等级：`"fast"`、`"flex"` 或 `null`。无效的旧值将被忽略。 |

旧的 环境变量 在未设置相应的配置字段时，仍可作为本地测试的回退选项：

- `OPENCLAW_CODEX_APP_SERVER_BIN`
- `OPENCLAW_CODEX_APP_SERVER_ARGS`
- `OPENCLAW_CODEX_APP_SERVER_MODE=yolo|guardian`
- `OPENCLAW_CODEX_APP_SERVER_APPROVAL_POLICY`
- `OPENCLAW_CODEX_APP_SERVER_SANDBOX`

`OPENCLAW_CODEX_APP_SERVER_GUARDIAN=1` 已被移除。请改用
`plugins.entries.codex.config.appServer.mode: "guardian"`，或者
`OPENCLAW_CODEX_APP_SERVER_MODE=guardian` 进行一次性本地测试。对于可重复的部署，首选配置，因为它将插件行为与 Codex harness 设置的其余部分保留在同一个经过审查的文件中。

## 常用配方

使用默认 stdio 传输的本地 Codex：

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

仅 Codex harness 验证，已禁用 PI 回退：

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

Guardian 审查的 Codex 审批：

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
        config: {
          appServer: {
            mode: "guardian",
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

带有显式标头的远程应用服务器：

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

模型切换仍由 OpenClaw 控制。当 OpenClaw 会话附加到现有的 Codex 线程时，下一轮会将当前选定的 `codex/*` 模型、提供商、审批策略、沙箱和服务层级再次发送给应用服务器。从 `codex/gpt-5.4` 切换到 `codex/gpt-5.2` 会保持线程绑定，但要求 Codex 使用新选择的模型继续。

## Codex 命令

捆绑插件将 `/codex` 注册为授权的斜杠命令。它是通用的，适用于任何支持 OpenClaw 文本命令的渠道。

常用形式：

- `/codex status` 显示实时的应用服务器连接、模型、账户、速率限制、MCP 服务器和技能。
- `/codex models` 列出实时的 Codex 应用服务器模型。
- `/codex threads [filter]` 列出最近的 Codex 线程。
- `/codex resume <thread-id>` 将当前的 OpenClaw OpenClaw 会话附加到现有的 Codex 线程。
- `/codex compact` 要求 Codex 应用服务器压缩附加的线程。
- `/codex review` 启动附加线程的 Codex 原生审查。
- `/codex account` 显示账户和速率限制状态。
- `/codex mcp` 列出 Codex 应用服务器 MCP 服务器状态。
- `/codex skills` 列出 Codex 应用服务器技能。

`/codex resume` 写入与普通轮次中使用的相同的 sidecar 绑定文件。在下一条消息中，OpenClaw 恢复该 Codex 线程，将当前选定的 OpenClaw `codex/*` 模型传递给应用服务器，并保持扩展历史记录启用。

命令界面需要 Codex app-server `0.118.0` 或更高版本。如果未来或自定义的 app-server 未公开该 JSON-RPC 方法，则各个控制方法将报告为 `unsupported by this Codex app-server`。

## 工具、媒体和压缩

Codex harness 仅更改低级别的嵌入式代理执行器。

OpenClaw 仍然构建工具列表并从 harness 接收动态工具结果。文本、图像、视频、音乐、TTS、批准和消息工具输出继续通过正常的 OpenClaw 传递路径进行。

当 Codex 将 `_meta.codex_approval_kind` 标记为 `"mcp_tool_call"` 时，Codex MCP 工具批准请求将通过 OpenClaw 的插件批准流程进行路由；其他请求和自由形式的输入请求仍将被阻止。

当所选模型使用 Codex harness 时，原生线程压缩委托给 Codex 应用服务器。OpenClaw 为渠道历史记录、搜索、`/new`、`/reset` 以及未来的模型或 harness 切换保留一份副本镜像。该镜像包括用户提示、最终助手文本，以及当应用服务器发出时的轻量级 Codex 推理或计划记录。目前，OpenClaw 仅记录原生压缩的开始和完成信号。它尚未提供可读的压缩摘要或压缩后 Codex 保留条目的可审计列表。

媒体生成不需要 PI。图像、视频、音乐、PDF、TTS 和媒体理解继续使用匹配的提供商/模型设置，例如 `agents.defaults.imageGenerationModel`、`videoGenerationModel`、`pdfModel` 和 `messages.tts`。

## 故障排除

**Codex 未出现在 `/model` 中：** 请启用 `plugins.entries.codex.enabled`，
设置 `codex/*` 模型引用，或检查 `plugins.allow` 是否排除了 `codex`。

**OpenClaw 使用 PI 而非 Codex：** 如果没有 Codex harness 接管运行，
OpenClaw 可能会使用 PI 作为兼容后端。设置
`embeddedHarness.runtime: "codex"` 以在测试期间强制选择 Codex，或者
设置 `embeddedHarness.fallback: "none"` 以在没有插件 harness 匹配时失败。一旦
选择了 Codex 应用服务器，其故障将直接显示，而无需额外的
回退配置。

**应用服务器被拒绝：** 请升级 Codex，以便应用服务器握手
报告的版本为 `0.118.0` 或更新。

**模型发现缓慢：** 请降低 `plugins.entries.codex.config.discovery.timeoutMs`
或禁用发现。

**WebSocket 传输立即失败：**请检查 `appServer.url`、`authToken`，并确保远程应用服务器使用相同的 Codex 应用服务器协议版本。

**非 Codex 模型使用 PI：**这是预期的。Codex harness 仅声明 `codex/*` 模型引用。

## 相关

- [Agent Harness 插件](/zh/plugins/sdk-agent-harness)
- [模型提供商](/zh/concepts/model-providers)
- [配置参考](/zh/gateway/configuration-reference)
- [测试](/zh/help/testing#live-codex-app-server-harness-smoke)
