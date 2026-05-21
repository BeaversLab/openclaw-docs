---
summary: "OpenClaw通过捆绑的 Codex app-server harness 运行 OpenClaw 嵌入式代理回合"
title: "Codex harness"
read_when:
  - You want to use the bundled Codex app-server harness
  - You need Codex harness config examples
  - You want Codex-only deployments to fail instead of falling back to PI
---

捆绑的 `codex`OpenClawOpenAI 插件允许 OpenClaw 通过 Codex app-server 而不是内置的 PI harness 来运行嵌入式 OpenAI 代理回合。

当您希望 Codex 拥有底层代理会话时，请使用 Codex harness：原生线程恢复、原生工具延续、原生压缩和应用服务器执行。OpenClaw 仍然拥有聊天频道、会话文件、模型选择、OpenClaw 动态工具、审批、媒体传递和可见的转录镜像。

常规设置使用规范的 OpenAI 模型引用，例如 OpenAI`openai/gpt-5.5`。
请勿配置 `openai-codex/gpt-*`OpenAI 模型引用。将 OpenAI 代理认证顺序
放在 `auth.order.openai` 下；较旧的 `openai-codex:*` 配置文件和
`auth.order.openai-codex` 条目仍然受现有安装支持。

OpenClaw 启动 Codex app-server 线程时默认启用了 Codex 原生代码模式，同时默认关闭“仅代码模式”。这使得 Codex 原生工作区和代码功能保持可用，同时 OpenClaw 动态工具通过 app-server OpenClawOpenClaw`item/tool/call` 桥接继续运行。受限工具策略仍然会完全禁用原生代码模式。

关于更广泛的模型/提供商/运行时划分，请从 [Agent runtimes](/zh/concepts/agent-runtimes) 开始。简而言之：`openai/gpt-5.5` 是模型引用，`codex` 是运行时，而 Telegram、Telegram、DiscordSlack 或其他渠道则仍然是通信表面。

## Requirements

- OpenClaw 并包含可用的内置 OpenClaw`codex` 插件。
- 如果您的配置使用了 `plugins.allow`，请包含 `codex`。
- Codex app-server `0.125.0` 或更新版本。内置插件默认管理兼容的 Codex app-server 二进制文件，因此 `PATH` 上的本地 `codex` 命令不会影响正常的 harness 启动。
- 可通过 `openclaw models auth login --provider openai-codex`API 进行 Codex 认证、在代理的 Codex 主目录中使用 app-server 账户，或使用显式的 Codex API 密钥认证配置文件。

关于身份验证优先级、环境隔离、自定义应用服务器命令、模型发现以及所有配置字段，请参阅 [Codex harness reference](/zh/plugins/codex-harness-reference)。

## 快速入门

大多数希望在 OpenClaw 中使用 Codex 的用户都选择此路径：使用 ChatGPT/Codex 订阅登录，启用内置 OpenClaw`codex` 插件，并使用规范的 `openai/gpt-*` 模型引用。

使用 Codex OAuth 登录：

```bash
openclaw models auth login --provider openai-codex
```

启用内置 `codex`OpenAI 插件并选择一个 OpenAI 代理模型：

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
      model: "openai/gpt-5.5",
    },
  },
}
```

如果您的配置使用了 `plugins.allow`，也请在其中添加 `codex`：

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

更改插件配置后重启网关。如果现有聊天已存在会话，请在测试运行时更改之前使用 `/new` 或 `/reset`，以便下一轮从当前配置解析 harness。

## 配置

快速入门配置是可用的最小 Codex harness 配置。在 OpenClaw 配置中设置 Codex harness 选项，并仅将 CLI 用于 Codex 身份验证：

| 需要                            | 设置                                                                             | 位置                                 |
| ------------------------------- | -------------------------------------------------------------------------------- | ------------------------------------ |
| 启用 harness                    | `plugins.entries.codex.enabled: true`                                            | OpenClaw 配置                        |
| 保留一个列入白名单的插件安装    | 在 `plugins.allow` 中包含 `codex`                                                | OpenClaw 配置                        |
| 通过 Codex 路由 OpenAI 代理回合 | 将 `agents.defaults.model` 或 `agents.list[].model` 作为 `openai/gpt-*`          | OpenClaw 代理配置                    |
| 使用 Codex OAuth 登录           | `openclaw models auth login --provider openai-codex`                             | CLI 身份验证配置文件                 |
| 为 Codex 运行添加 API 密钥备份  | 在 `auth.order.openai` 中的订阅身份验证之后列出的 `openai:*`API API-key 配置文件 | CLI 身份验证配置文件 + OpenClaw 配置 |
| 当 Codex 不可用时失败关闭       | 提供程序或模型 `agentRuntime.id: "codex"`                                        | OpenClaw 模型/提供商配置             |
| 使用直接 OpenAI API 流量        | 带有标准 OpenAI 身份验证的提供程序或模型 `agentRuntime.id: "pi"`OpenAI           | OpenClaw 模型/提供商配置             |
| 调整应用服务器行为              | `plugins.entries.codex.config.appServer.*`                                       | Codex 插件配置                       |
| 启用原生 Codex 插件应用         | `plugins.entries.codex.config.codexPlugins.*`                                    | Codex 插件配置                       |
| 启用 Codex Computer Use         | `plugins.entries.codex.config.computerUse.*`                                     | Codex 插件配置                       |

对 Codex 支持的 OpenAI 代理回合使用 `openai/gpt-*`OpenAI 模型引用。优先选择 `auth.order.openai`API 以实现订阅优先/API-key 备份的顺序。现有的 `openai-codex:*` 身份验证配置文件和 `auth.order.openai-codex` 仍然有效，但不要编写新的 `openai-codex/gpt-*` 模型引用。

除非选定的上下文引擎拥有压缩权限，否则不要在 Codex 支持的代理上设置 `compaction.model` 或 `compaction.provider`OpenClaw。如果没有拥有权限的上下文引擎，Codex 会通过其原生应用服务器线程状态进行压缩，因此 OpenClaw 在运行时会忽略这些本地摘要器覆盖设置，并且 `openclaw doctor --fix` 会在代理使用 Codex 时将其删除。

Lossless 仍然支持作为上下文引擎。请通过 `plugins.slots.contextEngine: "lossless-claw"` 和 `plugins.entries.lossless-claw.config.summaryModel` 进行配置，而不是通过 `agents.defaults.compaction.provider`。当 Codex 是活动运行时，`openclaw doctor --fix` 会将旧的 `compaction.provider: "lossless-claw"` 形状迁移到 Lossless 上下文引擎槽位。

当活动上下文引擎报告 `ownsCompaction: true` 时，`/compact` 会运行该引擎的压缩生命周期并使绑定的 Codex 应用服务器线程失效。下一次 Codex 轮次将启动一个新的后端线程并从上下文引擎重新填充它，而不是在引擎拥有的语义摘要之上分层 Codex 本地压缩。

```json5
{
  auth: {
    order: {
      openai: ["openai-codex:user@example.com", "openai:api-key-backup"],
    },
  },
}
```

在此配置下，两种配置文件仍通过 Codex 运行 `openai/gpt-*`APIOpenAI 代理轮次。API 密钥仅作为身份验证后备手段，而非切换到 PI 或纯 OpenAI 响应的请求。

本页的其余部分涵盖了用户必须选择的常见变体：部署形态、故障封闭路由、守护者审批策略、原生 Codex 插件以及 Computer Use。有关完整选项列表、默认值、枚举、发现、环境隔离、超时和应用服务器传输字段，请参阅 [Codex harness reference](/zh/plugins/codex-harness-reference)。

## 验证 Codex 运行时

在您期望使用 Codex 的聊天中使用 `/status`OpenAI。由 Codex 支持的 OpenAI 代理轮次显示：

```text
Runtime: OpenAI Codex
```

然后检查 Codex 应用服务器状态：

```text
/codex status
/codex models
```

`/codex status` 报告应用服务器连接性、账户、速率限制、MCP 服务器和技能。`/codex models` 列出了该工具和账户的实时 Codex 应用服务器目录。如果 `/status` 出乎意料，请参阅 [Troubleshooting](#troubleshooting)。

## 路由和模型选择

将提供商引用和运行时策略分开：

- 通过 Codex 进行 OpenAI 代理轮次时，请使用 `openai/gpt-*`OpenAI。
- 不要在配置中使用 `openai-codex/gpt-*`。运行 `openclaw doctor --fix` 以修复旧引用和过时的会话路由固定。
- 对于常规 OpenAI 自动模式，`agentRuntime.id: "codex"`OpenAI 是可选的，但在 Codex 不可用时部署应故障封闭的情况下很有用。
- `agentRuntime.id: "pi"` 在有意为之的情况下，选择提供商或模型进入直接 PI 行为。
- `/codex ...` 从聊天控制原生 Codex 应用服务器对话。
- ACP/acpx 是一个独立的外部适配器路径。仅当用户请求 ACP/acpx 或外部适配器时使用它。

常见命令路由：

| 用户意图                              | 用途                                                                                                  |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| 附加当前聊天                          | `/codex bind [--cwd <path>]`                                                                          |
| 恢复现有的 Codex 线程                 | `/codex resume <thread-id>`                                                                           |
| 列出或筛选 Codex 线程                 | `/codex threads [filter]`                                                                             |
| 列出原生 Codex 插件                   | `/codex plugins list`                                                                                 |
| 启用或禁用已配置的原生 Codex 插件     | `/codex plugins enable <name>`, `/codex plugins disable <name>`                                       |
| 在配对节点上附加现有的 Codex CLI 会话 | `/codex sessions --host <node> [filter]`，然后 `/codex resume <session-id> --host <node> --bind here` |
| 仅发送 Codex 反馈                     | `/codex diagnostics [note]`                                                                           |
| 启动 ACP/acpx 任务                    | ACP/acpx 会话命令，而非 `/codex`                                                                      |

| 用例                                       | 配置                                                            | 验证                                   | 注                        |
| ------------------------------------------ | --------------------------------------------------------------- | -------------------------------------- | ------------------------- |
| 具有原生 Codex 运行时的 ChatGPT/Codex 订阅 | `openai/gpt-*` 加上启用的 `codex` 插件                          | `/status` 显示 `Runtime: OpenAI Codex` | 推荐路径                  |
| 如果 Codex 不可用，则故障封闭              | 提供商或模型 `agentRuntime.id: "codex"`                         | 轮次失败而不是回退到 PI                | 用于仅 Codex 部署         |
| 通过 PI 引导 OpenAI API 密钥流量           | 提供商或模型 `agentRuntime.id: "pi"` 以及正常的 OpenAI 身份验证 | `/status` 显示 PI 运行时               | 仅在有意使用 PI 时使用    |
| 旧版配置                                   | `openai-codex/gpt-*`                                            | `openclaw doctor --fix` 会重写它       | 不要以此方式编写新配置    |
| ACP/acpx Codex 适配器                      | ACP `sessions_spawn({ runtime: "acp" })`                        | ACP 任务/会话状态                      | 与原生 Codex harness 分离 |

`agents.defaults.imageModel` 遵循相同的前缀拆分。对正常的 OpenAI 路由使用 `openai/gpt-*`，仅当图像理解应通过有界的 Codex 应用服务器轮次运行时使用 `codex/gpt-*`。不要使用 `openai-codex/gpt-*`；doctor 会将该旧版前缀重写为 `openai/gpt-*`。

## 部署模式

### 基本 Codex 部署

当所有 OpenAI 代理轮次默认应使用 Codex 时，使用快速入门配置。

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
      model: "openai/gpt-5.5",
    },
  },
}
```

### 混合提供商部署

此配置将 Claude 保留为默认代理，并添加一个命名的 Codex 代理：

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
      model: "anthropic/claude-opus-4-6",
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
        model: "openai/gpt-5.5",
      },
    ],
  },
}
```

使用此配置，`main` 代理使用其正常的提供商路径，而 `codex` 代理使用 Codex 应用服务器。

### Fail-closed Codex 部署

对于 OpenAI 代理轮次，当捆绑插件可用时，`openai/gpt-*` 已解析为 Codex。当您需要书面 fail-closed 规则时，添加显式运行时策略：

```json5
{
  models: {
    providers: {
      openai: {
        agentRuntime: {
          id: "codex",
        },
      },
    },
  },
  agents: {
    defaults: {
      model: "openai/gpt-5.5",
    },
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

在强制使用 Codex 的情况下，如果 Codex 插件被禁用、应用服务器过旧或应用服务器无法启动，OpenClaw 会提前失败。

## 应用服务器策略

默认情况下，插件会在本地通过 stdio 传输启动 OpenClaw 的托管 Codex 二进制文件。仅当您有意运行不同的可执行文件时，才设置 `appServer.command`。仅当应用服务器已在别处运行时才使用 WebSocket 传输：

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
            authToken: "${CODEX_APP_SERVER_TOKEN}",
          },
        },
      },
    },
  },
}
```

本地 stdio 应用服务器会话默认为受信任的本地操作员姿态：`approvalPolicy: "never"`、`approvalsReviewer: "user"` 和 `sandbox: "danger-full-access"`OpenClawOpenClawOpenClaw。如果本地 Codex 要求不允许这种隐式的 YOLO 姿态，OpenClaw 将改为选择允许的守护者权限。当为会话激活 OpenClaw 沙箱时，OpenClaw 会将 Codex `danger-full-access` 限制为 Codex `workspace-write`OpenClawDocker，以便原生 Codex 代码模式回合保持在沙箱隔离的工作区内。Codex 回合网络标志遵循 OpenClaw 沙箱出口策略：Docker `network: "none"` 保持离线，而 `network: "bridge"`Docker 或自定义 Docker 网络则允许出站访问。显式 Codex `workspace-write` 回合使用相同的源自出口策略的网络标志。

当您希望在沙箱逃逸或额外权限之前进行 Codex 原生自动审查时，请使用守护者模式：

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
        config: {
          appServer: {
            mode: "guardian",
            serviceTier: "priority",
          },
        },
      },
    },
  },
}
```

守护者模式扩展为 Codex 应用服务器批准，当本地要求允许这些值时，通常为 `approvalPolicy: "on-request"`、`approvalsReviewer: "auto_review"` 和 `sandbox: "workspace-write"`。

有关每个应用服务器字段、身份验证顺序、环境隔离、发现和超时行为，请参阅 [Codex harness 参考](/zh/plugins/codex-harness-reference)。

## 命令和诊断

捆绑插件将 `/codex`OpenClaw 注册为任何支持 OpenClaw 文本命令的渠道上的斜杠命令。

常见形式：

- `/codex status` 检查应用服务器连接性、模型、帐户、速率限制、MCP 服务器和技能。
- `/codex models` 列出实时的 Codex 应用服务器模型。
- `/codex threads [filter]` 列出最近的 Codex 应用服务器线程。
- `/codex resume <thread-id>`OpenClaw 将当前 OpenClaw 会话附加到现有的 Codex 线程。
- `/codex compact` 请求 Codex 应用服务器压缩附加的线程。
- `/codex review` 启动对附加线程的 Codex 原生审查。
- `/codex diagnostics [note]` 在为关联的线程发送 Codex 反馈之前会先询问。
- `/codex account` 显示账户和速率限制状态。
- `/codex mcp` 列出 Codex 应用服务器的 MCP 服务器状态。
- `/codex skills` 列出 Codex 应用服务器的技能。

对于大多数支持报告，请在发生错误的对话中从 `/diagnostics [note]`Gateway(网关) 开始。它会创建一个 Gateway(网关) 诊断报告，并且对于 Codex harness 会话，会请求批准发送相关的 Codex 反馈包。有关隐私模型和群聊行为，请参阅 [Diagnostics export](/zh/gateway/diagnostics)。

仅当您专门想要上传当前关联线程的 Codex 反馈而不需要完整的 Gateway(网关) 诊断包时，才使用 `/codex diagnostics [note]`Gateway(网关)。

### 在本地检查 Codex 线程

检查错误的 Codex 运行的最快方法通常是直接打开原生 Codex 线程：

```bash
codex resume <thread-id>
```

从已完成的 `/diagnostics` 回复、`/codex binding` 或 `/codex threads [filter]` 中获取线程 ID。

有关上传机制和运行时级诊断边界，请参阅 [Codex harness runtime](/zh/plugins/codex-harness-runtime#codex-feedback-upload)。

Auth 按以下顺序选择：

1. 针对智能体的有序 OpenAI 认证配置文件，最好位于 OpenAI`auth.order.openai` 下。现有的 `openai-codex:*` 配置文件 ID 仍然有效。
2. 该智能体 Codex 主目录中应用服务器的现有账户。
3. 仅对于本地 stdio 应用服务器启动，当不存在应用服务器账户且仍需要 OpenAI 认证时，使用 `CODEX_API_KEY`，然后使用 `OPENAI_API_KEY`OpenAI。

当 OpenClaw 检测到 ChatGPT 订阅风格的 Codex 身份验证配置文件时，它会从生成的 Codex 子进程中移除 `CODEX_API_KEY` 和 `OPENAI_API_KEY`。这样可以确保 Gateway(网关) 级别的 API 密钥可用于嵌入或直接使用 OpenAI 模型，而不会意外地导致原生 Codex 应用服务器轮次通过 API 计费。显式的 Codex API 密钥配置文件和本地 stdio 环境密钥回退使用应用服务器登录，而不是继承的子进程环境。WebSocket 应用服务器连接不会接收 Gateway(网关) 环境 API 密钥回退；请使用显式的身份验证配置文件或远程应用服务器自己的账户。

如果订阅配置文件达到 Codex 使用限制，当 Codex 报告重置时间时，OpenClaw 会记录该时间，并为同一个 Codex 运行尝试下一个有序的身份验证配置文件。当重置时间过后，订阅配置文件再次变为可用，而无需更改所选的 `openai/gpt-*` 模型或 Codex 运行时。

对于本地 stdio 应用服务器启动，OpenClaw 会将 `CODEX_HOME` 设置为每个代理专用的目录，这样 Codex 配置、身份验证/账户文件、插件缓存/数据以及原生线程状态默认不会读取或写入操作员的个人 `~/.codex`。OpenClaw 会保留正常的进程 `HOME`；Codex 运行的子进程仍然可以查找用户主目录配置和令牌，并且 Codex 可能会发现共享的 `$HOME/.agents/skills` 和 `$HOME/.agents/plugins/marketplace.json` 条目。

如果部署需要额外的环境隔离，请将这些变量添加到 `appServer.clearEnv`：

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
        config: {
          appServer: {
            clearEnv: ["CODEX_API_KEY", "OPENAI_API_KEY"],
          },
        },
      },
    },
  },
}
```

`appServer.clearEnv` 仅影响生成的 Codex 应用服务器子进程。OpenClaw 会在本地启动标准化期间从此列表中移除 `CODEX_HOME` 和 `HOME`：`CODEX_HOME` 保持为每个代理专用，而 `HOME` 保持为继承状态，以便子进程可以使用正常的用户主目录状态。

Codex 动态工具默认为 `searchable`OpenClaw 加载。OpenClaw 不会暴露重复 Codex 原生工作区操作的动态工具：`read`、`write`、`edit`、`apply_patch`、`exec`、`process` 和 `update_plan`OpenClaw。大多数其余的 OpenClaw 集成工具（如消息传递、媒体、cron、浏览器、节点、网关、`heartbeat_respond` 和 `web_search`）可通过 Codex 工具搜索在 `openclaw` 命名空间下使用，从而保持初始模型上下文较小。
`sessions_yield` 和仅消息工具源回复保持直接，因为这些是轮次控制契约。`sessions_spawn` 保持可搜索，因此 Codex 的原生 `spawn_agent`OpenClaw 仍然是主要的 Codex 子代理界面，而显式的 OpenClaw 或 ACP 委托仍可通过 `openclaw` 动态工具命名空间使用。Heartbeat 协作指令指示 Codex 在结束心跳轮次之前搜索 `heartbeat_respond`（如果该工具尚未加载）。

仅在连接到无法搜索延迟动态工具的自定义 Codex 应用服务器或调试完整工具负载时，才设置 `codexDynamicToolsLoading: "direct"`。

支持的顶级 Codex 插件字段：

| 字段                       | 默认值         | 含义                                                                          |
| -------------------------- | -------------- | ----------------------------------------------------------------------------- |
| `codexDynamicToolsLoading` | `"searchable"` | 使用 `"direct"`OpenClaw 将 OpenClaw 动态工具直接置于初始 Codex 工具上下文中。 |
| `codexDynamicToolsExclude` | `[]`           | 要从 Codex 应用服务器轮次中省略的其他 OpenClaw 动态工具名称。                 |
| `codexPlugins`             | disabled       | 对已迁移的源安装精选插件的 Codex 原生插件/应用支持。                          |

支持的 `appServer` 字段：

| 字段                          | 默认值                                        | 含义                                                                                                                                                                                                                                                      |
| ----------------------------- | --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `transport`                   | `"stdio"`                                     | `"stdio"` 生成 Codex；`"websocket"` 连接到 `url`。                                                                                                                                                                                                        |
| `command`                     | 托管的 Codex 二进制文件                       | 用于 stdio 传输的可执行文件。保持未设置以使用托管二进制文件；仅在显式覆盖时设置。                                                                                                                                                                         |
| `args`                        | `["app-server", "--listen", "stdio://"]`      | 用于 stdio 传输的参数。                                                                                                                                                                                                                                   |
| `url`                         | 未设置                                        | WebSocket 应用服务器 URL。                                                                                                                                                                                                                                |
| `authToken`                   | 未设置                                        | 用于 WebSocket 传输的 Bearer 令牌。                                                                                                                                                                                                                       |
| `headers`                     | `{}`                                          | 额外的 WebSocket 头部。                                                                                                                                                                                                                                   |
| `clearEnv`                    | `[]`                                          | 在 OpenClaw 构建其继承的环境后，从生成的 stdio 应用服务器进程中移除的额外环境变量名称。OpenClaw 为本地启动保留每个代理的 `CODEX_HOME` 和继承的 `HOME`。                                                                                                   |
| `codeModeOnly`                | `false`                                       | 选择使用 Codex 的仅代码模式工具界面。OpenClaw 动态工具仍在 Codex 中注册，以便嵌套的 `tools.*` 调用通过应用服务器 `item/tool/call` 网桥返回。                                                                                                              |
| `requestTimeoutMs`            | `60000`                                       | 应用服务器控制平面调用的超时时间。                                                                                                                                                                                                                        |
| `turnCompletionIdleTimeoutMs` | `60000`                                       | 在 Codex 接受一轮对话或在轮次范围的应用服务器请求之后，OpenClaw 等待 `turn/completed` 期间的静默窗口。针对缓慢的工具后或仅状态合成阶段，请增加此值。                                                                                                      |
| `mode`                        | `"yolo"`，除非本地 Codex 要求不允许 YOLO      | 用于 YOLO 或监护人审查执行的预设。省略 `danger-full-access`、`never` 批准或 `user` 审查者的本地 stdio 要求将使隐式默认监护人生效。                                                                                                                        |
| `approvalPolicy`              | `"never"` 或允许的监护人批准策略              | 发送到线程启动/恢复/轮次的 Native Codex 审批策略。Guardian 默认值在允许时优先选择 `"on-request"`。                                                                                                                                                        |
| `sandbox`                     | `"danger-full-access"` 或允许的 guardian 沙箱 | 发送到线程启动/恢复的 Native Codex 沙箱模式。Guardian 默认值在允许时优先选择 `"workspace-write"`，否则为 `"read-only"`。当 OpenClaw 沙箱处于活动状态时，`danger-full-access` 轮次使用 Codex `workspace-write`，其网络访问权限源自 OpenClaw 沙箱出口设置。 |
| `approvalsReviewer`           | `"user"` 或允许的 guardian 审阅者             | 使用 `"auto_review"` 以允许 Codex 在允许时审阅本地审批提示，否则为 `guardian_subagent` 或 `user`。`guardian_subagent` 仍作为旧版别名使用。                                                                                                                |
| `serviceTier`                 | 未设置                                        | 可选的 Codex 应用服务器服务层级。`"priority"` 启用快速模式路由，`"flex"` 请求弹性处理，`null` 清除覆盖设置，旧版 `"fast"` 被接受为 `"priority"`。                                                                                                         |

OpenClaw 拥有的动态工具调用受到与 OpenClaw`appServer.requestTimeoutMs` 独立的限制：Codex `item/tool/call`OpenClaw 请求默认使用 30 秒的 OpenClaw 看门狗。正值的每次调用 `timeoutMs` 参数可以延长或缩短该特定工具的预算。`image_generate` 工具在工具调用未提供自己的超时时间时使用 `agents.defaults.imageGenerationModel.timeoutMs`，否则使用 120 秒的图像生成默认值。媒体理解 `image` 工具使用 `tools.media.image.timeoutSeconds`OpenClaw 或其 60 秒的媒体默认值。动态工具预算上限为 600000 毫秒。超时时，OpenClaw 会在支持的情况下中止工具信号，并向 Codex 返回失败的动态工具响应，以便会话能够继续，而不是将会话留在 `processing` 状态。

在 Codex 接受一个回合，并且 OpenClaw 响应了一个回合范围的 app-server 请求后，harness 期望 Codex 取得当前回合的进展，并最终用 `turn/completed` 完成原生回合。如果 app-server 沉默 `appServer.turnCompletionIdleTimeoutMs`，OpenClaw 将尽力中断 Codex 回合，记录诊断超时，并释放 OpenClaw 会话通道，以便后续聊天消息不会在陈旧的原生回合后排队。对于同一回合的大多数非终端通知会使该短监视器失效，因为 Codex 已证明该回合仍然活跃；原始 `custom_tool_call_output` 补全会使工具后的短监视器保持启用，因为它们是回合范围的工具结果交接。全局 app-server 通知（如速率限制更新）不会重置回合空闲进度。已完成的 `agentMessage` 项和工具前的原始助手 `rawResponseItem/completed` 项会启用助手输出释放：如果 Codex 随后在没有 `turn/completed` 的情况下保持沉默，OpenClaw 将尽力中断原生回合并释放会话通道。工具后的原始助手进展会继续等待 `turn/completed` 或终端监视器。超时诊断包括最后一个 app-server 通知方法，对于原始助手响应项，还包括项目类型、角色、id 和有界的助手文本预览。

环境覆盖变量仍可用于本地测试：

- `OPENCLAW_CODEX_APP_SERVER_BIN`
- `OPENCLAW_CODEX_APP_SERVER_ARGS`
- `OPENCLAW_CODEX_APP_SERVER_MODE=yolo|guardian`
- `OPENCLAW_CODEX_APP_SERVER_APPROVAL_POLICY`
- `OPENCLAW_CODEX_APP_SERVER_SANDBOX`

当 `appServer.command` 未设置时，`OPENCLAW_CODEX_APP_SERVER_BIN` 会绕过托管二进制文件。

`OPENCLAW_CODEX_APP_SERVER_GUARDIAN=1` 已被移除。请改用 `plugins.entries.codex.config.appServer.mode: "guardian"`，或者使用 `OPENCLAW_CODEX_APP_SERVER_MODE=guardian` 进行一次性本地测试。对于可重复的部署，首选配置，因为它将插件行为与 Codex harness 设置的其余部分保持在同一个已审查的文件中。

## 原生 Codex 插件

原生 Codex 插件支持在与 OpenClaw 驱动轮次相同的 Codex 线程中使用 Codex 应用服务器自身的应用和插件功能。OpenClaw 不会将 Codex 插件转换为合成的 `codex_plugin_*` OpenClaw 动态工具。

`codexPlugins` 仅影响选择原生 Codex 驱动的会话。它对 PI 运行、正常的 OpenAI 提供商运行、ACP 会话绑定或其他驱动没有影响。

最简迁移配置：

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
        config: {
          codexPlugins: {
            enabled: true,
            allow_destructive_actions: true,
            plugins: {
              "google-calendar": {
                enabled: true,
                marketplaceName: "openai-curated",
                pluginName: "google-calendar",
              },
            },
          },
        },
      },
    },
  },
}
```

当 OpenClaw 建立 Codex 驱动会话或替换过时的 Codex 线程绑定时，会计算线程应用配置。它不会在每次轮次时重新计算。更改 `codexPlugins` 后，请使用 `/new`、`/reset` 或重启网关，以便未来的 Codex 驱动会话使用更新后的应用集启动。

有关迁移资格、应用清单、破坏性操作策略、诱导以及原生插件诊断，请参阅 [Native Codex plugins](/zh/plugins/codex-native-plugins)。

## 计算机使用 (Computer Use)

计算机使用在其专门的设置指南中进行了介绍：
[Codex Computer Use](/zh/plugins/codex-computer-use)。

简而言之：OpenClaw 不提供桌面控制应用，也不自行执行桌面操作。它准备 Codex 应用服务器，验证 `computer-use` MCP 服务器是否可用，然后让 Codex 在 Codex 模式轮次期间拥有原生 MCP 工具调用。

## 运行时边界

Codex 驱动仅更改底层的嵌入式代理执行器。

- 支持 OpenClaw 动态工具。Codex 要求 OpenClaw 执行这些工具，因此 OpenClaw 仍处于执行路径中。
- Codex 原生 shell、patch、MCP 和原生应用工具归 Codex 所有。
  OpenClaw 可以通过支持的中继观察或阻止选定的原生事件，但它不会重写原生工具参数。
- 除非活动的 OpenClaw 上下文引擎声明了 OpenClaw`ownsCompaction: true`OpenClaw，否则 Codex 拥有原生压缩。OpenClaw 会保留一份脚本副本用于渠道历史记录、搜索、`/new`、`/reset` 以及未来的模型或连接器切换。
- 媒体生成、媒体理解、TTS、批准和消息工具输出继续通过匹配的 OpenClaw 提供商/模型设置。
- `tool_result_persist`OpenClaw 适用于 OpenClaw 拥有的脚本工具结果，而不适用于 Codex 原生工具结果记录。

关于 Hook 层、支持的 V1 接口、原生权限处理、队列引导、Codex 反馈上传机制和压缩详情，请参阅 [Codex harness runtime](/zh/plugins/codex-harness-runtime)。

## 故障排除

**Codex 未显示为常规 `/model` 提供商：** 对于新配置而言，这是预期的。选择一个 `openai/gpt-*` 模型，启用 `plugins.entries.codex.enabled`，并检查 `plugins.allow` 是否排除了 `codex`。

**OpenClaw 使用 PI 而不是 Codex：** 请确保模型引用在官方 OpenAI 提供商上是 OpenClaw`openai/gpt-*`OpenAI，并且已安装并启用了 Codex 插件。如果在测试时需要严格的证明，请设置提供商或模型 `agentRuntime.id: "codex"`。强制的 Codex 运行时会失败，而不是回退到 PI。

**OpenAI Codex 运行时回退到 API 密钥路径：** 收集一个显示模型、运行时、所选提供商和故障的编辑过的网关摘录。请受影响的协作者在其 OpenClaw 主机上运行此只读命令：

```bash
(
  pattern='openai/gpt-5\.[45]|agentRuntime(\.id)?|harnessRuntime|Runtime: OpenAI Codex|openai-codex|resolveSelectedOpenAIPiRuntimeProvider|candidateProvider[": ]+openai|status[": ]+401|Incorrect API key|No API key|api-key path|API-key path|OAuth'

  if ls /tmp/openclaw/openclaw-*.log >/dev/null 2>&1; then
    grep -E -i -n "$pattern" /tmp/openclaw/openclaw-*.log 2>/dev/null || true
  else
    journalctl --user -u openclaw-gateway --since today --no-pager 2>/dev/null \
      | grep -E -i "$pattern" || true
  fi
) | sed -E \
    -e 's/(Authorization: Bearer )[A-Za-z0-9._~+\/-]+/\1[REDACTED]/Ig' \
    -e 's/(Bearer )[A-Za-z0-9._~+\/-]+/\1[REDACTED]/Ig' \
    -e 's/(api[_ -]?key[=: ]+)[^ ,}"]+/\1[REDACTED]/Ig' \
    -e 's/(OPENAI_API_KEY[=: ]+)[^ ,}"]+/\1[REDACTED]/Ig' \
    -e 's/sk-[A-Za-z0-9_-]{12,}/sk-[REDACTED]/g' \
    -e 's/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/[EMAIL-REDACTED]/g' \
  | tail -200
```

有用的摘录通常包括 `openai/gpt-5.5` 或 `openai/gpt-5.4`，
`Runtime: OpenAI Codex`、`agentRuntime.id` 或 `harnessRuntime`，
`candidateProvider: "openai"` 以及 `401`、`Incorrect API key` 或
`No API key` 结果。更正后的运行应显示 `openai-codex` OAuth
路径，而不是普通的 OpenAI API 密钥失败。

**遗留 `openai-codex/*` 配置仍然保留：** 运行 `openclaw doctor --fix`。
Doctor 会将遗留的模型引用重写为 `openai/*`，移除过时的会话和
整体代理运行时固定（pins），并保留现有的身份验证配置文件覆盖设置。

**应用服务器被拒绝：** 使用 Codex 应用服务器 `0.125.0` 或更新版本。
相同版本的预发布版本或带构建后缀的版本（例如
`0.125.0-alpha.2` 或 `0.125.0+custom`）会被拒绝，因为 OpenClaw 会测试
稳定的 `0.125.0` 协议底线。

**`/codex status` 无法连接：** 检查捆绑的 `codex` 插件是否
已启用，当配置了允许列表时 `plugins.allow` 是否包含它，以及
任何自定义 `appServer.command`、`url`、`authToken` 或标头是否有效。

**模型发现缓慢：** 降低
`plugins.entries.codex.config.discovery.timeoutMs` 或禁用发现。请参阅
[Codex harness 参考](/zh/plugins/codex-harness-reference#model-discovery)。

**WebSocket 传输立即失败：** 检查 `appServer.url`、`authToken`、
标头，以及远程应用服务器是否使用相同的 Codex 应用服务器
协议版本。

**非 Codex 模型使用 PI：** 除非提供商或模型运行时
策略将其路由到另一个 harness，否则这是预期的。普通的非 OpenAI 提供商引用在 `auto` 模式下会
保留在其正常的提供商路径上。

**Computer Use 已安装但工具未运行：** 从新会话检查 `/codex computer-use status`。如果工具报告 `Native hook relay unavailable`，请使用 `/new` 或 `/reset`；如果问题持续，请重启网关以清除过时的原生 hook 注册。请参阅 [Codex Computer Use](/zh/plugins/codex-computer-use#troubleshooting)。

## 相关

- [Codex harness 参考](/zh/plugins/codex-harness-reference)
- [Codex harness 运行时](/zh/plugins/codex-harness-runtime)
- [原生 Codex 插件](/zh/plugins/codex-native-plugins)
- [Codex Computer Use](/zh/plugins/codex-computer-use)
- [Agent 运行时](/zh/concepts/agent-runtimes)
- [模型提供商](/zh/concepts/model-providers)
- [OpenAI 提供商](/zh/providers/openai)
- [Agent harness 插件](/zh/plugins/sdk-agent-harness)
- [Plugin hooks](/zh/plugins/hooks)
- [诊断导出](/zh/gateway/diagnostics)
- [状态](/zh/cli/status)
- [测试](/zh/help/testing-live#live-codex-app-server-harness-smoke)
