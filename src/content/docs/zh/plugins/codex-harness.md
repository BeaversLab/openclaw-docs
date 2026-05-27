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

当没有激活 OpenClaw 沙箱隔离时，OpenClaw 会启动 Codex 应用服务器线程，并默认启用 Codex 原生代码模式，同时关闭仅代码模式。这使得 Codex 原生工作区和代码功能保持可用，同时 OpenClaw 动态工具继续通过应用服务器 `item/tool/call` 桥接运行。激活的 OpenClaw 沙箱隔离和受限工具策略将完全禁用原生代码模式，除非你选择加入实验性沙箱 exec-server 路径。

此 Codex 原生功能与 [OpenClaw 代码模式](/zh/reference/code-mode) 分开，后者是一个可选的 QuickJS-WASI 运行时，用于具有不同 `exec` 输入形状的通用 OpenClaw 运行。

关于更广泛的模型/提供商/运行时拆分，请从 [Agent runtimes](/zh/concepts/agent-runtimes) 开始。简而言之：`openai/gpt-5.5` 是模型引用，`codex` 是运行时，而 Telegram、Discord、Slack 或其他渠道则保持为通信表面。

## 要求

- 具有可用捆绑 `codex` 插件的 OpenClaw。
- 如果您的配置使用了 `plugins.allow`，请包含 `codex`。
- Codex 应用服务器 `0.125.0` 或更新版本。捆绑插件默认管理兼容的 Codex 应用服务器二进制文件，因此 `PATH` 上的本地 `codex` 命令不会影响正常的 harness 启动。
- Codex 认证可通过 `openclaw models auth login --provider openai-codex`、代理 Codex 主目录中的应用服务器帐户或显式 Codex API 密钥认证配置文件获得。

有关认证优先级、环境隔离、自定义应用服务器命令、模型发现和所有配置字段，请参阅 [Codex harness reference](/zh/plugins/codex-harness-reference)。

## 快速入门

大多数想在 OpenClaw 中使用 Codex 的用户都选择这条路径：使用 ChatGPT/Codex 订阅登录，启用捆绑的 `codex` 插件，并使用规范的 `openai/gpt-*` 模型引用。

使用 Codex OAuth 登录：

```bash
openclaw models auth login --provider openai-codex
```

启用捆绑的 `codex` 插件并选择一个 OpenAI 代理模型：

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

如果您的配置使用 `plugins.allow`，请也在那里添加 `codex`：

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

更改插件配置后重启网关。如果现有的聊天已经有会话，请在测试运行时更改之前使用 `/new` 或 `/reset`，以便下一轮从当前配置解析 harness。

## 配置

快速入门配置是 Codex harness 的最小可用配置。在 OpenClaw 配置中设置 Codex harness 选项，并仅使用 CLI 进行 Codex 身份验证：

| 需要                            | 设置                                                                     | 位置                                 |
| ------------------------------- | ------------------------------------------------------------------------ | ------------------------------------ |
| 启用 harness                    | `plugins.entries.codex.enabled: true`                                    | OpenClaw 配置                        |
| 保留一个已列入白名单的插件安装  | 在 `plugins.allow` 中包含 `codex`                                        | OpenClaw 配置                        |
| 通过 Codex 路由 OpenAI 代理轮次 | `agents.defaults.model` 或 `agents.list[].model` 作为 `openai/gpt-*`     | OpenClaw 代理配置                    |
| 使用 Codex OAuth 登录           | `openclaw models auth login --provider openai-codex`                     | CLI 身份验证配置文件                 |
| 为 Codex 运行添加 API 密钥备份  | `openai:*` API 密钥配置文件在 `auth.order.openai` 的订阅身份验证之后列出 | CLI 身份验证配置文件 + OpenClaw 配置 |
| 当 Codex 不可用时失败关闭       | 提供商或模型 `agentRuntime.id: "codex"`                                  | OpenClaw 模型/提供商配置             |
| 使用直接 OpenAI API 流量        | 提供商或模型 `agentRuntime.id: "pi"` 使用常规 OpenAI 身份验证            | OpenClaw 模型/提供商配置             |
| 调整应用服务器行为              | `plugins.entries.codex.config.appServer.*`                               | Codex 插件配置                       |
| 启用原生 Codex 插件应用         | `plugins.entries.codex.config.codexPlugins.*`                            | Codex 插件配置                       |
| 启用 Codex 计算机使用           | `plugins.entries.codex.config.computerUse.*`                             | Codex 插件配置                       |

使用 `openai/gpt-*`OpenAI 模型引用来支持由 Codex 驱动的 OpenAI 代理轮次。`auth.order.openai`API 更适合订阅优先/API 密钥备份的顺序。现有的 `openai-codex:*` 认证配置文件和 `auth.order.openai-codex` 仍然有效，但请不要编写新的 `openai-codex/gpt-*` 模型引用。

除非选定的上下文引擎拥有压缩权限，否则不要在 Codex 支持的代理上设置 `compaction.model` 或 `compaction.provider`OpenClaw。如果没有拥有权的上下文引擎，Codex 会通过其原生应用服务器线程状态进行压缩，因此 OpenClaw 在运行时会忽略那些本地摘要器覆盖设置，并且当代理使用 Codex 时 `openclaw doctor --fix` 会将其移除。

Lossless 作为上下文引擎仍然受支持。通过 `plugins.slots.contextEngine: "lossless-claw"` 和 `plugins.entries.lossless-claw.config.summaryModel` 进行配置，而不是通过 `agents.defaults.compaction.provider`。当 Codex 处于活动运行时状态时，`openclaw doctor --fix` 会将旧的 `compaction.provider: "lossless-claw"` 结构迁移到 Lossless 上下文引擎槽位。

原生 Codex 应用服务器挂载支持需要预提示组装的上下文引擎。包括 CLI`codex-cli` 在内的通用 CLI 后端不提供该主机功能。

当活动上下文引擎报告 `ownsCompaction: true` 时，`/compact` 会运行该引擎的压缩生命周期并使绑定的 Codex 应用服务器线程失效。下一个 Codex 轮次将启动一个新的后端线程并从上下文引擎重新对其进行水合，而不是在引擎拥有的语义摘要之上分层 Codex 原生压缩。

```json5
{
  auth: {
    order: {
      openai: ["openai-codex:user@example.com", "openai:api-key-backup"],
    },
  },
}
```

在该形式下，两个配置文件仍然通过 Codex 运行 `openai/gpt-*`APIOpenAI 代理轮次。API 密钥仅作为一种身份验证后备，而非切换到 PI 或普通 OpenAI 响应的请求。

本页的其余部分涵盖了用户必须做出选择的常见变体：部署形式、故障封闭式路由、守护者审批策略、原生 Codex 插件以及 Computer Use。有关完整的选项列表、默认值、枚举、发现、环境隔离、超时和应用服务器传输字段，请参阅 [Codex harness 参考](/zh/plugins/codex-harness-reference)。

## 验证 Codex 运行时

在您期望使用 Codex 的聊天中使用 `/status`OpenAI。由 Codex 支持的 OpenAI 代理轮次会显示：

```text
Runtime: OpenAI Codex
```

然后检查 Codex 应用服务器状态：

```text
/codex status
/codex models
```

`/codex status` 报告应用服务器连接性、账户、速率限制、MCP 服务器和技能。`/codex models` 列出了该 harness 和账户的实时 Codex 应用服务器目录。如果 `/status` 令人意外，请参阅 [故障排除](#troubleshooting)。

## 路由和模型选择

将提供商引用和运行时策略分离开来：

- 使用 `openai/gpt-*`OpenAI 通过 Codex 进行 OpenAI 代理轮次。
- 不要在配置中使用 `openai-codex/gpt-*`。运行 `openclaw doctor --fix` 以
  修复遗留引用和过时的会话路由固定。
- `agentRuntime.id: "codex"`OpenAI 对于普通的 OpenAI 自动模式是可选的，但如果 Codex 不可用时部署应故障封闭，则非常有用。
- `agentRuntime.id: "pi"` 在有意为之的情况下，选择提供商或模型直接使用 PI 行为。
- `/codex ...` 从聊天控制原生 Codex 应用服务器对话。
- ACP/acpx 是一条独立的外部 harness 路径。仅当用户要求 ACP/acpx 或外部 harness 适配器时才使用它。

常见命令路由：

| 用户意图                              | 使用                                                                                                  |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| 附加当前聊天                          | `/codex bind [--cwd <path>]`                                                                          |
| 恢复现有的 Codex 线程                 | `/codex resume <thread-id>`                                                                           |
| 列出或筛选 Codex 线程                 | `/codex threads [filter]`                                                                             |
| 列出原生 Codex 插件                   | `/codex plugins list`                                                                                 |
| 启用或禁用已配置的本地 Codex 插件     | `/codex plugins enable <name>`，`/codex plugins disable <name>`                                       |
| 附加到配对节点上现有的 Codex CLI 会话 | `/codex sessions --host <node> [filter]`，然后 `/codex resume <session-id> --host <node> --bind here` |
| 仅发送 Codex 反馈                     | `/codex diagnostics [note]`                                                                           |
| 启动 ACP/acpx 任务                    | ACP/acpx 会话命令，而非 `/codex`                                                                      |

| 用例                                       | 配置                                                                  | 验证                                   | 备注                      |
| ------------------------------------------ | --------------------------------------------------------------------- | -------------------------------------- | ------------------------- |
| 带有本地 Codex 运行时的 ChatGPT/Codex 订阅 | `openai/gpt-*` 加上启用的 `codex` 插件                                | `/status` 显示 `Runtime: OpenAI Codex` | 推荐路径                  |
| 如果 Codex 不可用，则故障关闭              | 提供商或模型 `agentRuntime.id: "codex"`                               | 轮次失败，而不是回退到 PI              | 用于仅 Codex 部署         |
| 通过 PI 传送直接 OpenAI API 密钥流量       | 提供商或模型 `agentRuntime.id: "pi"`OpenAI 以及正常的 OpenAI 身份验证 | `/status` 显示 PI 运行时               | 仅在有意使用 PI 时使用    |
| 旧版配置                                   | `openai-codex/gpt-*`                                                  | `openclaw doctor --fix` 会将其重写     | 不要以这种方式编写新配置  |
| ACP/acpx Codex 适配器                      | ACP `sessions_spawn({ runtime: "acp" })`                              | ACP 任务/会话状态                      | 与本地 Codex harness 分离 |

`agents.defaults.imageModel` 遵循相同的前缀拆分。对正常的 OpenAI 路由使用 `openai/gpt-*`OpenAI，仅当图像理解应通过受限的 Codex 应用服务器轮次运行时才使用 `codex/gpt-*`。不要使用 `openai-codex/gpt-*`；doctor 会将该旧版前缀重写为 `openai/gpt-*`。

## 部署模式

### 基本 Codex 部署

当所有 OpenAI 代理轮次默认应使用 Codex 时，请使用快速入门配置。

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

### 故障关闭的 Codex 部署

对于 OpenAI 代理回合，当内置插件可用时，`openai/gpt-*` 已经解析为 Codex。当您需要书面化的失效关闭规则时，请添加显式的运行时策略：

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

当强制使用 Codex 时，如果 Codex 插件被禁用、应用服务器太旧或应用服务器无法启动，OpenClaw 将会提前失败。

## 应用服务器策略

默认情况下，该插件会在本地通过 stdio 传输启动 OpenClaw 托管的 Codex 二进制文件。仅当您有意运行不同的可执行文件时，才设置 `appServer.command`。仅当应用服务器已在其他地方运行时，才使用 WebSocket 传输：

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

本地 stdio 应用服务器会话默认采用受信任的本地操作员姿态：`approvalPolicy: "never"`、`approvalsReviewer: "user"` 和 `sandbox: "danger-full-access"`。如果本地 Codex 要求不允许这种隐式的 YOLO 姿态，OpenClaw 将改为选择允许的 Guardian 权限。当为该会话激活了 OpenClaw 沙箱时，OpenClaw 将禁用 Codex 原生代码模式、用户 MCP 服务器和应用支持的插件执行，而不是依赖 Codex 主机端沙箱隔离。当正常的 exec/process 工具可用时，Shell 访问通过 OpenClaw 沙箱支持的动态工具（如 `sandbox_exec` 和 `sandbox_process`）公开。

当您需要在沙箱逃逸或额外权限之前进行 Codex 原生自动审查时，请使用 Guardian 模式：

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

Guardian 模式扩展为 Codex 应用服务器批准，当本地要求允许这些值时，通常为 `approvalPolicy: "on-request"`、`approvalsReviewer: "auto_review"` 和 `sandbox: "workspace-write"`。

有关每个应用服务器字段、身份验证顺序、环境隔离、发现和超时行为，请参阅 [Codex harness 参考](/zh/plugins/codex-harness-reference)。

## 命令和诊断

内置插件将 `/codex` 注册为支持 OpenClaw 文本命令的任何渠道上的斜杠命令。

常用形式：

- `/codex status` 检查应用服务器连接性、模型、账户、速率限制、MCP 服务器和技能。
- `/codex models` 列出实时 Codex 应用服务器模型。
- `/codex threads [filter]` 列出最近的 Codex 应用服务器线程。
- `/codex resume <thread-id>`OpenClaw 将当前 OpenClaw 会话附加到
  现有的 Codex 线程。
- `/codex compact` 请求 Codex 应用服务器压缩附加的线程。
- `/codex review` 启动对附加线程的 Codex 原生审查。
- `/codex diagnostics [note]` 在发送附加线程的 Codex 反馈之前
  进行询问。
- `/codex account` 显示帐户和速率限制状态。
- `/codex mcp` 列出 Codex 应用服务器 MCP 服务器状态。
- `/codex skills` 列出 Codex 应用服务器技能。

对于大多数支持报告，请在发生 Bug 的对话中从 `/diagnostics [note]`Gateway(网关) 开始。
它会创建一份 Gateway 诊断报告，并且对于 Codex 驱动会话，会请求批准发送相关的 Codex 反馈包。
有关隐私模型和群组聊天行为，请参阅 [Diagnostics export](/zh/gateway/diagnostics)。

仅当您专门想要上传当前附加线程的 Codex 反馈而不需要完整的 Gateway
诊断包时，才使用 `/codex diagnostics [note]`Gateway(网关)。

### 本地检查 Codex 线程

检查错误的 Codex 运行，最快的方法通常是直接打开原生 Codex
线程：

```bash
codex resume <thread-id>
```

从完成的 `/diagnostics` 回复、`/codex binding` 或
`/codex threads [filter]` 中获取线程 ID。

有关上传机制和运行时级诊断边界，请参阅
[Codex harness runtime](/zh/plugins/codex-harness-runtime#codex-feedback-upload)。

按以下顺序选择身份验证：

1. 代理的有序 OpenAI 身份验证配置文件，最好位于
   OpenAI`auth.order.openai` 下。现有的 `openai-codex:*` 配置文件 ID 保持有效。
2. 该代理的 Codex 主页中应用服务器的现有帐户。
3. 仅对于本地 stdio 应用服务器启动，当不存在应用服务器帐户且仍需要 OpenAI 身份验证时，
   首先使用 `CODEX_API_KEY`，然后使用 `OPENAI_API_KEY`OpenAI。

当 OpenClaw 检测到 ChatGPT 订阅风格的 Codex 认证配置文件时，它会从生成的 Codex 子进程中移除 `CODEX_API_KEY` 和 `OPENAI_API_KEY`。这样做可以确保 Gateway(网关) 级别的 API 密钥可用于嵌入或直接的 OpenAI 模型，而不会导致原生 Codex 应用服务器轮次意外地通过 API 计费。显式的 Codex API 密钥配置文件和本地 stdio 环境密钥回退使用应用服务器登录，而不是继承的子进程环境。WebSocket 应用服务器连接不会接收 Gateway(网关) 环境 API 密钥回退；请使用显式的认证配置文件或远程应用服务器自己的账户。

如果订阅配置文件达到 Codex 使用限制，OpenClaw 会记录 Codex 报告的重置时间，并尝试为同一个 Codex 运行使用下一个有序的认证配置文件。当重置时间过去后，订阅配置文件将再次变为可用，而无需更改选定的 `openai/gpt-*` 模型或 Codex 运行时。

对于本地 stdio 应用服务器启动，OpenClaw 将 `CODEX_HOME` 设置为每个代理专用的目录，以便 Codex 配置、auth/account 文件、插件缓存/数据和原生线程状态默认不会读取或写入操作员的个人 `~/.codex`。OpenClaw 保留正常进程 `HOME`；Codex 运行的子进程仍然可以找到用户主目录配置和令牌，并且 Codex 可以发现共享的 `$HOME/.agents/skills` 和 `$HOME/.agents/plugins/marketplace.json` 条目。

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

`appServer.clearEnv` 仅影响生成的 Codex 应用服务器子进程。OpenClaw 会在本地启动规范化期间从此列表中移除 `CODEX_HOME` 和 `HOME`：`CODEX_HOME` 保持每个代理专用，而 `HOME` 保持继承，以便子进程可以使用正常的用户主目录状态。

Codex 动态工具默认为 `searchable`OpenClaw 加载。OpenClaw 不会暴露与 Codex 原生工作区操作重复的动态工具：`read`、`write`、
`edit`、`apply_patch`、`exec`、`process` 和 `update_plan`OpenClaw。大多数剩余的
OpenClaw 集成工具（例如消息传递、媒体、cron、浏览器、节点、
网关、`heartbeat_respond` 和 `web_search`）均可通过 `openclaw` 命名空间下的 Codex 工具搜索获取，从而使初始模型上下文
保持较小。
`sessions_yield` 和仅限消息工具的源回复保持直接，
因为它们是轮次控制合约。`sessions_spawn` 保持可搜索，以便 Codex 的
原生 `spawn_agent`OpenClaw 保持作为主要的 Codex 子代理接口，而显式的
OpenClaw 或 ACP 委托仍可通过 `openclaw` 动态
工具命名空间使用。Heartbeat 协作指令指示 Codex 在该工具未
已加载时，在结束心跳轮次之前搜索 `heartbeat_respond`。

仅在连接到无法搜索延迟动态工具的自定义 Codex
应用服务器，或调试完整
工具负载时，才设置 `codexDynamicToolsLoading: "direct"`。

支持的顶级 Codex 插件字段：

| 字段                       | 默认值         | 含义                                                                          |
| -------------------------- | -------------- | ----------------------------------------------------------------------------- |
| `codexDynamicToolsLoading` | `"searchable"` | 使用 `"direct"`OpenClaw 将 OpenClaw 动态工具直接放入初始 Codex 工具上下文中。 |
| `codexDynamicToolsExclude` | `[]`           | 要从 Codex 应用服务器轮次中省略的其他 OpenClaw 动态工具名称。                 |
| `codexPlugins`             | disabled       | 原生 Codex 插件/应用程序对已迁移的源安装精选插件的支持。                      |

支持的 `appServer` 字段：

| 字段                                          | 默认值                                        | 含义                                                                                                                                                                                                                                                                     |
| --------------------------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `transport`                                   | `"stdio"`                                     | `"stdio"` 生成 Codex；`"websocket"` 连接到 `url`。                                                                                                                                                                                                                       |
| `command`                                     | 托管的 Codex 二进制文件                       | 用于 stdio 传输的可执行文件。保持未设置以使用托管二进制文件；仅在需要显式覆盖时设置。                                                                                                                                                                                    |
| `args`                                        | `["app-server", "--listen", "stdio://"]`      | 用于 stdio 传输的参数。                                                                                                                                                                                                                                                  |
| `url`                                         | 未设置                                        | WebSocket 应用服务器 URL。                                                                                                                                                                                                                                               |
| `authToken`                                   | 未设置                                        | WebSocket 传输的 Bearer 令牌。                                                                                                                                                                                                                                           |
| `headers`                                     | `{}`                                          | 额外的 WebSocket 标头。                                                                                                                                                                                                                                                  |
| `clearEnv`                                    | `[]`                                          | 在 OpenClaw 构建其继承的环境之后，从生成的 stdio 应用服务器进程中移除的额外环境变量名称。对于本地启动，OpenClaw 会保留每个代理的 `CODEX_HOME` 和继承的 `HOME`。                                                                                                          |
| `codeModeOnly`                                | `false`                                       | 选择加入 Codex 的仅代码模式工具界面。OpenClaw 动态工具仍然向 Codex 注册，以便嵌套的 `tools.*` 调用通过应用服务器 `item/tool/call` 桥接返回。                                                                                                                             |
| `requestTimeoutMs`                            | `60000`                                       | 应用服务器控制平面调用的超时。                                                                                                                                                                                                                                           |
| `turnCompletionIdleTimeoutMs`                 | `60000`                                       | Codex 接受一轮对话或在 OpenClaw 等待 `turn/completed` 时的轮次作用域应用服务器请求之后的静默窗口。对于缓慢的工具后处理或仅状态合成阶段，请调高此值。                                                                                                                     |
| `postToolRawAssistantCompletionIdleTimeoutMs` | 未设置                                        | 在工具移交后使用的完成空闲守卫，此时 Codex 发出原始助手完成或进度但不发送 `turn/completed`。如果未设置，默认为助手完成空闲超时。将此用于受信任或繁重的工作负载，在这些情况下，工具后合成可以合法地保持静默时间比最终助手释放预算更长。                                   |
| `mode`                                        | `"yolo"`，除非本地 Codex 要求不允许 YOLO      | 用于 YOLO 或 guardian 审核执行的预设。如果本地 stdio 要求省略了 `danger-full-access`、`never` 审批或 `user` 审核者，则将隐式默认 guardian 设为默认值。                                                                                                                   |
| `approvalPolicy`                              | `"never"` 或允许的 guardian 审批策略          | 发送到线程启动/恢复/轮次的本机 Codex 审批策略。Guardian 默认值在允许的情况下首选 `"on-request"`。                                                                                                                                                                        |
| `sandbox`                                     | `"danger-full-access"` 或允许的 guardian 沙盒 | 发送到线程启动/恢复的本机 Codex 沙盒模式。Guardian 默认值在允许的情况下首选 `"workspace-write"`，否则首选 `"read-only"`。当 OpenClaw 沙盒处于活动状态时，`danger-full-access` 轮次使用具有网络访问权限的 Codex `workspace-write`，该访问权限源自 OpenClaw 沙盒出站设置。 |
| `approvalsReviewer`                           | `"user"` 或允许的 guardian 审核者             | 使用 `"auto_review"` 让 Codex 在允许时审核本机审批提示，否则使用 `guardian_subagent` 或 `user`。`guardian_subagent` 仍作为旧版别名保留。                                                                                                                                 |
| `serviceTier`                                 | 未设置                                        | 可选的 Codex 应用服务器服务层级。`"priority"` 启用快速模式路由，`"flex"` 请求弹性处理，`null` 清除覆盖设置，并且旧版 `"fast"` 被接受为 `"priority"`。                                                                                                                    |
| `experimental.sandboxExecServer`              | `false`                                       | 预览可选功能，向 Codex 应用服务器 0.132.0 或更新版本注册由 OpenClaw 沙盒支持的 Codex 环境，以便本机 Codex 执行可以在活动 OpenClaw 沙盒内运行。                                                                                                                           |

OpenClaw 拥有的动态工具调用独立于 OpenClaw`appServer.requestTimeoutMs` 进行边界限制：Codex `item/tool/call`OpenClaw 请求默认使用 30 秒的 OpenClaw 看门狗。正值的每次调用 `timeoutMs` 参数会延长或缩短该特定工具的预算。当工具调用未提供自己的超时时间时，`image_generate` 工具使用 `agents.defaults.imageGenerationModel.timeoutMs`，否则使用 120 秒的图像生成默认值。媒体理解 `image` 工具使用 `tools.media.image.timeoutSeconds`OpenClaw 或其 60 秒的媒体默认值。动态工具预算上限为 600000 毫秒。发生超时时，OpenClaw 会中止工具信号（在支持的情况下），并向 Codex 返回失败的动态工具响应，以便回合可以继续，而不是让会话处于 `processing` 状态。

在 Codex 接受一个回合，以及 OpenClaw 响应了特定于回合的应用程序服务器请求之后，工具适配器期望 Codex 取得当前回合的进展，并最终使用 `turn/completed` 完成本地回合。如果应用程序服务器静默 `appServer.turnCompletionIdleTimeoutMs`，OpenClaw 会尽力中断 Codex 回合，记录诊断超时，并释放 OpenClaw 会话通道，以便后续聊天消息不会排队滞留在过时的本地回合之后。同一回合的大多数非终止通知会解除该短时监视器的状态，因为 Codex 已证明该回合仍然活跃；原始 `custom_tool_call_output` 补全会使工具后短时监视器保持启用状态，因为它们是特定于回合的工具结果交接。全局应用程序服务器通知（例如速率限制更新）不会重置回合空闲进度。已完成的 `agentMessage` 项和工具前原始助手 `rawResponseItem/completed` 项会启动助手输出释放：如果 Codex 随后未 `turn/completed` 而静默，OpenClaw 会尽力中断本地回合并释放会话通道。工具后原始助手进度会继续等待 `turn/completed`，同时补全空闲保护保持启用状态；如果已配置，保护将使用 `appServer.postToolRawAssistantCompletionIdleTimeoutMs`，否则回退到助手补全空闲超时。超时诊断包括最后一次应用程序服务器通知方法，以及对于原始助手响应项，还包括项类型、角色、ID 和有界的助手文本预览。

环境变量覆盖仍可用于本地测试：

- `OPENCLAW_CODEX_APP_SERVER_BIN`
- `OPENCLAW_CODEX_APP_SERVER_ARGS`
- `OPENCLAW_CODEX_APP_SERVER_MODE=yolo|guardian`
- `OPENCLAW_CODEX_APP_SERVER_APPROVAL_POLICY`
- `OPENCLAW_CODEX_APP_SERVER_SANDBOX`

当未设置 `appServer.command` 时，`OPENCLAW_CODEX_APP_SERVER_BIN` 会绕过受管二进制文件。

`OPENCLAW_CODEX_APP_SERVER_GUARDIAN=1` 已被移除。请改用
`plugins.entries.codex.config.appServer.mode: "guardian"`，或者在一次性本地测试中使用
`OPENCLAW_CODEX_APP_SERVER_MODE=guardian`。对于可重复部署，首选配置文件，因为它将插件行为与 Codex harness 设置的其余部分保留在同一个已审核的文件中。

## 原生 Codex 插件

原生 Codex 插件支持在与 OpenClaw harness 轮次相同的 Codex 线程中使用 Codex 应用服务器的自有应用和插件功能。OpenClaw 不会将 Codex 插件转换为合成的 `codex_plugin_*` OpenClaw 动态工具。

`codexPlugins` 仅影响选择原生 Codex harness 的会话。它对 PI 运行、普通 OpenAI 提供商运行、ACP 对话绑定或其他 harness 没有影响。

最小迁移配置：

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

线程应用配置是在 OpenClaw 建立 Codex harness 会话或替换过期的 Codex 线程绑定时计算的。它不会在每次轮次时重新计算。更改 `codexPlugins` 后，请使用 `/new`、`/reset` 或重启网关，以便未来的 Codex harness 会话使用更新的应用集启动。

有关迁移资格、应用清单、破坏性操作策略、启发式和原生插件诊断，请参阅
[原生 Codex 插件](/zh/plugins/codex-native-plugins)。

## Computer Use

Computer Use 在其自己的设置指南中进行了介绍：
[Codex Computer Use](/zh/plugins/codex-computer-use)。

简而言之：OpenClaw 不提供桌面控制应用，也不自行执行桌面操作。它准备 Codex 应用服务器，验证 `computer-use` MCP 服务器是否可用，然后让 Codex 在 Codex 模式轮次期间拥有原生 MCP 工具调用。

## 运行时边界

Codex harness 仅更改底层嵌入式代理执行器。

- 支持 OpenClaw 动态工具。Codex 请求 OpenClaw 执行这些工具，因此 OpenClaw 仍保留在执行路径中。
- Codex 原生 shell、patch、MCP 和原生应用工具归 Codex 所有。
  OpenClaw 可以通过支持的中继观察或阻止特定的原生事件，但它不会重写原生工具参数。
- 除非活动的 OpenClaw 上下文引擎声明 `ownsCompaction: true`，否则 Codex 拥有原生压缩。OpenClaw 会保留一个转录镜像，用于
  渠道历史记录、搜索、`/new`、`/reset`，以及未来的模型或 harness
  切换。
- 媒体生成、媒体理解、TTS、审批和消息传递工具
  输出继续通过匹配的 OpenClaw 提供商/模型设置进行。
- `tool_result_persist` 适用于 OpenClaw 拥有的转录工具结果，不适用于
  Codex 原生工具结果记录。

有关 hook 层、支持的 V1 界面、原生权限处理、队列
引导、Codex 反馈上传机制和压缩详细信息，请参阅
[Codex harness runtime](/zh/plugins/codex-harness-runtime)。

## 故障排除

**Codex 未显示为正常的 `/model` 提供商：** 这对于
新配置来说是预期的。选择一个 `openai/gpt-*` 模型，启用
`plugins.entries.codex.enabled`，并检查 `plugins.allow` 是否排除了
`codex`。

**OpenClaw 使用 PI 而不是 Codex：** 请确保在官方 OpenAI 提供商上的模型引用是
`openai/gpt-*`，并且 Codex 插件已
安装并启用。如果在测试期间需要严格的证明，请设置提供商或
模型 `agentRuntime.id: "codex"`。强制执行的 Codex 运行时将失败，而不是
回退到 PI。

**OpenAI Codex 运行时回退到 API 密钥路径：** 收集一个经过编辑的
网关摘录，其中显示模型、运行时、选定的提供商和失败信息。
请受影响的协作者在其 OpenClaw 主机上运行此只读命令：

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
`Runtime: OpenAI Codex`，`agentRuntime.id` 或 `harnessRuntime`，
`candidateProvider: "openai"`，以及 `401`，`Incorrect API key`，或
`No API key` 结果。修正后的运行应显示 `openai-codex` OAuth
路径，而不是普通的 OpenAI API 密钥失败。

**旧版 `openai-codex/*` 配置仍然保留：** 运行 `openclaw doctor --fix`。
Doctor 会将旧版模型引用重写为 `openai/*`，移除过时的会话和
整个代理运行时固定项，并保留现有的身份验证配置文件覆盖。

**应用服务器被拒绝：** 使用 Codex 应用服务器 `0.125.0` 或更新版本。
相同版本的预发布版或带有构建后缀的版本（例如
`0.125.0-alpha.2` 或 `0.125.0+custom`）会被拒绝，因为 OpenClaw 会测试
稳定的 `0.125.0` 协议下限。

**`/codex status` 无法连接：** 检查捆绑的 `codex` 插件是否
已启用，配置允许列表时 `plugins.allow` 是否包含它，以及
任何自定义 `appServer.command`、`url`、`authToken` 或请求头是否有效。

**模型发现缓慢：** 降低
`plugins.entries.codex.config.discovery.timeoutMs` 或禁用发现。请参阅
[Codex harness 参考](/zh/plugins/codex-harness-reference#model-discovery)。

**WebSocket 传输立即失败：** 检查 `appServer.url`、`authToken`、
请求头，以及远程应用服务器是否使用相同的 Codex 应用服务器
协议版本。

**非 Codex 模型使用 PI：** 除非提供商或模型运行时
策略将其路由到另一个 harness，否则这是预期的。普通的非 OpenAI 提供商引用在 `auto` 模式下将
保持在其正常的提供商路径上。

**Computer Use is installed but tools do not run:** 检查 `/codex computer-use status` 从新的会话中开始。如果工具报告 `Native hook relay unavailable`，请使用 `/new` 或 `/reset`；如果问题仍然存在，请重启网关以清除过时的原生挂钩注册。请参阅 [Codex Computer Use](/zh/plugins/codex-computer-use#troubleshooting)。

## 相关

- [Codex harness 参考](/zh/plugins/codex-harness-reference)
- [Codex harness 运行时](/zh/plugins/codex-harness-runtime)
- [原生 Codex 插件](/zh/plugins/codex-native-plugins)
- [Codex Computer Use](/zh/plugins/codex-computer-use)
- [Agent 运行时](/zh/concepts/agent-runtimes)
- [模型提供商](/zh/concepts/model-providers)
- [OpenAI 提供商](/zh/providers/openai)
- [Agent harness 插件](/zh/plugins/sdk-agent-harness)
- [插件挂钩](/zh/plugins/hooks)
- [诊断导出](/zh/gateway/diagnostics)
- [状态](/zh/cli/status)
- [测试](/zh/help/testing-live#live-codex-app-server-harness-smoke)
