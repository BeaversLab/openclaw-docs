---
summary: "通过内置的 Codex 应用服务器套件运行 OpenClaw 嵌入式代理回合"
title: "Codex 套件"
read_when:
  - You want to use the bundled Codex app-server harness
  - You need Codex harness config examples
  - You want Codex-only deployments to fail instead of falling back to PI
---

内置的 `codex` 插件允许 OpenClaw 通过
Codex 应用服务器运行嵌入式代理回合，而不是通过内置的 PI 套件。

当您希望 Codex 拥有底层代理会话时使用此功能：模型
发现、原生线程恢复、原生压缩和应用服务器执行。
OpenClaw 仍然拥有聊天渠道、会话文件、模型选择、工具、
审批、媒体交付和可见的转录镜像。

如果您正在尝试确定方向，请从
[Agent runtimes](/zh/concepts/agent-runtimes) 开始。简而言之：
`openai/gpt-5.5` 是模型引用，`codex` 是运行时，而 Telegram、
Discord、Slack 或其他渠道仍然是通信表面。

## 此插件更改的内容

内置的 `codex` 插件提供了几个独立的功能：

| 功能                        | 使用方法                                            | 作用                                                    |
| --------------------------- | --------------------------------------------------- | ------------------------------------------------------- |
| 原生嵌入式运行时            | `agentRuntime.id: "codex"`                          | 通过 Codex 应用服务器运行 OpenClaw 嵌入式代理回合。     |
| 原生聊天控制命令            | `/codex bind`, `/codex resume`, `/codex steer`, ... | 从消息对话中绑定和控制 Codex 应用服务器线程。           |
| Codex 应用服务器提供商/目录 | `codex` 内部机制，通过套件呈现                      | 允许运行时发现和验证应用服务器模型。                    |
| Codex 媒体理解路径          | `codex/*` 图像模型兼容性路径                        | 为支持的图像理解模型运行有界的 Codex 应用服务器回合。   |
| 原生 Hook 中继              | 围绕 Codex 原生事件的插件 Hooks                     | 允许 OpenClaw 观察/阻止支持的 Codex 原生工具/完成事件。 |

启用该插件使这些功能可用。它**不**会：

- 开始对每个 OpenAI 模型使用 Codex
- 将 `openai-codex/*` 模型引用转换为原生运行时
- 将 ACP/acpx 设为默认的 Codex 路径
- 热切换已经记录了 PI 运行时的现有会话
- 替换 OpenClaw 渠道交付、会话文件、身份配置文件存储或
  消息路由

同一个插件还拥有原生的 `/codex` 聊天控制命令界面。如果
启用了该插件，并且用户要求从聊天中绑定、恢复、引导、停止或检查
Codex 线程，Agent 应优先使用 `/codex ...` 而不是 ACP。当用户请求 ACP/acpx 或正在测试 ACP
Codex 适配器时，ACP 仍然是显式的后备方案。

原生 Codex 轮次将 OpenClaw 插件钩子作为公共兼容层保留。
这些是进程内 OpenClaw 钩子，而不是 Codex `hooks.json` 命令钩子：

- `before_prompt_build`
- `before_compaction`, `after_compaction`
- `llm_input`, `llm_output`
- `before_tool_call`, `after_tool_call`
- 用于镜像转录记录的 `before_message_write`
- 通过 Codex `Stop` 中继传递的 `before_agent_finalize`
- `agent_end`

插件还可以注册运行时中立的工具结果中间件，以便在 OpenClaw 执行工具之后、将结果返回给 Codex 之前重写
OpenClaw 动态工具结果。这与公共
`tool_result_persist` 插件钩子是分开的，后者用于转换 OpenClaw 拥有的转录
工具结果写入。

关于插件钩子本身的语义，请参阅 [Plugin hooks](/zh/plugins/hooks)
和 [Plugin guard behavior](/zh/tools/plugin)。

默认情况下，此插件是关闭的。新配置应将 OpenAI 模型引用
保持为 `openai/gpt-*` 规范格式，并在需要
原生应用服务器执行时显式强制使用
`agentRuntime.id: "codex"` 或 `OPENCLAW_AGENT_RUNTIME=codex`。旧版 `codex/*` 模型引用仍会自动选择
该插件以保持兼容性，但运行时支持的旧版提供商前缀不会
作为常规模型/提供商选项显示。

如果启用了 `codex` 插件但主模型仍然是
`openai-codex/*`，`openclaw doctor` 会发出警告而不是更改路由。这是
有意为之的：`openai-codex/*` 仍然是 PI Codex OAuth/订阅路径，
而原生应用服务器执行仍然是一个明确的运行时选择。

## 路由映射

更改配置前请使用此表：

| 期望的行为                            | 模型参考             | 运行时配置                                | 插件要求                  | 预期状态标签                   |
| ------------------------------------- | -------------------- | ----------------------------------------- | ------------------------- | ------------------------------ |
| 通过普通 OpenAI 运行器的 API OpenClaw | `openai/gpt-*`       | 省略或 `runtime: "pi"`                    | OpenAI 提供商             | `Runtime: OpenClaw Pi Default` |
| 通过 PI 的 Codex OAuth/订阅           | `openai-codex/gpt-*` | 省略或 `runtime: "pi"`                    | OpenAI Codex OAuth 提供商 | `Runtime: OpenClaw Pi Default` |
| 原生 Codex 应用服务器嵌入回合         | `openai/gpt-*`       | `agentRuntime.id: "codex"`                | `codex` 插件              | `Runtime: OpenAI Codex`        |
| 使用保守自动模式的混合提供商          | 特定提供商的引用     | `agentRuntime.id: "auto"`                 | 可选的插件运行时          | 取决于所选运行时               |
| 显式 Codex ACP 适配器会话             | 取决于 ACP 提示/模型 | 带有 `runtime: "acp"` 的 `sessions_spawn` | 健康的 `acpx` 后端        | ACP 任务/会话状态              |

重要的区别在于提供商与运行时：

- `openai-codex/*` 回答“PI 应该使用哪个提供商/认证路由？”
- `agentRuntime.id: "codex"` 回答“哪个循环应该执行此
  嵌入轮次？”
- `/codex ...` 回答“此聊天应绑定
  或控制哪个原生 Codex 对话？”
- ACP 回答“acpx 应该启动哪个外部 harness 进程？”

## 选择正确的模型前缀

OpenAI 系列路由是特定于前缀的。当您希望通过 PI 进行 Codex OAuth 时，请使用 `openai-codex/*`；当您希望直接访问 OpenAI API 或强制使用原生 Codex 应用服务器 harness 时，请使用 `openai/*`：

| 模型引用                                      | 运行时路径                                | 使用场景                                                              |
| --------------------------------------------- | ----------------------------------------- | --------------------------------------------------------------------- |
| `openai/gpt-5.4`                              | 通过 OpenAI/PI 管道实现的 OpenClaw 提供商 | 您希望通过 `OPENAI_API_KEY` 获得当前的直接 OpenAI 平台 API 访问权限。 |
| `openai-codex/gpt-5.5`                        | 通过 OpenClaw/PI 的 OpenAI Codex OAuth    | 您希望使用默认的 PI 运行器进行 ChatGPT/Codex 订阅身份验证。           |
| `openai/gpt-5.5` + `agentRuntime.id: "codex"` | Codex app-server harness                  | 您希望为嵌入式代理轮次使用原生 Codex app-server 执行。                |

GPT-5.5 在 OpenClaw 中目前仅支持订阅/OAuth。使用 `openai-codex/gpt-5.5` 进行 PI OAuth，或使用 `openai/gpt-5.5` 搭配 Codex app-server harness。一旦 OpenAI 在公共 API 上启用 GPT-5.5，将支持 `openai/gpt-5.5` 的直接 API 密钥访问。

旧的 `codex/gpt-*` 引用仍作为兼容性别名被接受。Doctor 兼容性迁移会将旧的主要运行时引用重写为规范模型引用，并单独记录运行时策略，而仅限回退的旧引用则保持不变，因为运行时是为整个代理容器配置的。新的 PI Codex OAuth 配置应使用 `openai-codex/gpt-*`；新的原生 app-server harness 配置应使用 `openai/gpt-*` 加上 `agentRuntime.id: "codex"`。

`agents.defaults.imageModel` 遵循相同的前缀拆分。当图像理解应通过 OpenAI Codex OAuth 提供商路径运行时，请使用 `openai-codex/gpt-*`。当图像理解应通过有界的 Codex app-server 轮次运行时，请使用 `codex/gpt-*`。Codex app-server 模型必须声明支持图像输入；仅支持文本的 Codex 模型会在媒体轮次开始前失败。

使用 `/status` 确认当前会话的有效 harness。如果选择结果出乎意料，请为 `agents/harness` 子系统启用调试日志，并检查网关的结构化 `agent harness selected` 记录。它包含所选的 harness ID、选择原因、运行时/回退策略，以及在 `auto` 模式下，每个插件候选者的支持结果。

### 医生警告的含义

当满足以下所有条件时，`openclaw doctor` 会发出警告：

- 捆绑的 `codex` 插件已启用或被允许
- 代理的主要模型是 `openai-codex/*`
- 该代理的有效运行时不是 `codex`

该警告的存在是因为用户通常期望“启用 Codex 插件”意味着“原生 Codex 应用服务器运行时”。OpenClaw 不会进行这种推断。该警告意味着：

- **无需更改**，如果您打算通过 PI 进行 ChatGPT/Codex OAuth 认证。
- 如果您打算使用原生应用服务器执行，请将模型更改为 `openai/<model>` 并设置
  `agentRuntime.id: "codex"`。
- 在更改运行时后，现有会话仍需要 `/new` 或 `/reset`，
  因为会话运行时固定是具有粘性的。

Harness 选择不是实时会话控制。当嵌入轮次运行时，
OpenClaw 会记录该会话上所选的 harness id，并在同一会话 id 的后续轮次中继续使用它。当您希望未来的会话使用另一个 harness 时，更改 `agentRuntime` 配置或
`OPENCLAW_AGENT_RUNTIME`；
使用 `/new` 或 `/reset` 启动一个新会话，然后在 PI 和 Codex 之间切换现有对话。这样可以避免通过两个不兼容的原生会话系统重放同一个转录记录。

在 harness 固定之前创建的旧会话，一旦它们具有转录历史，就会被视为 PI 固定的。更改配置后，使用 `/new` 或 `/reset`将该对话选择加入 Codex。

`/status` 显示有效的模型运行时。默认的 PI harness 显示为
`Runtime: OpenClaw Pi Default`，而 Codex 应用服务器 harness 显示为
`Runtime: OpenAI Codex`。

## 要求

- OpenClaw 附带可用的捆绑 `codex` 插件。
- Codex 应用服务器 `0.125.0` 或更新版本。捆绑插件默认管理兼容的
  Codex 应用服务器二进制文件，因此 `PATH` 上的本地 `codex` 命令
  不会影响正常的 harness 启动。
- Codex 认证可用于应用服务器进程。

该插件阻止较旧或未版本化的应用服务器握手。这使
OpenClaw 保持在其经过测试的协议表面上。

对于实时和 Docker 冒烟测试，身份验证通常来自 `OPENAI_API_KEY`，以及可选的 Codex CLI 文件，例如 `~/.codex/auth.json` 和 `~/.codex/config.toml`。请使用与本地 Codex 应用服务器相同的身份验证材料。

## 最小配置

使用 `openai/gpt-5.5`，启用捆绑的插件，并强制使用 `codex` harness：

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
      agentRuntime: {
        id: "codex",
      },
    },
  },
}
```

如果您的配置使用 `plugins.allow`，请也在那里包含 `codex`：

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

设置了 `agents.defaults.model` 或将代理模型设置为 `codex/<model>` 的旧配置仍会自动启用捆绑的 `codex` 插件。新配置应首选 `openai/<model>` 加上上述显式的 `agentRuntime` 条目。

## 与其他模型一起添加 Codex

如果同一个代理应在 Codex 和非 Codex 提供商模型之间自由切换，请不要全局设置 `agentRuntime.id: "codex"`。强制运行时适用于该代理或会话的每个嵌入式轮次。如果在强制使用该运行时的情况下选择 Anthropic 模型，OpenClaw 仍会尝试 Codex harness 并失败关闭，而不是通过 PI 静默路由该轮次。

请改用以下形式之一：

- 将 Codex 放在专用代理上，使用 `agentRuntime.id: "codex"`。
- 将默认代理保留在 `agentRuntime.id: "auto"` 上，并为正常的混合提供商使用保留 PI 回退。
- 仅出于兼容性考虑使用旧的 `codex/*` 引用。新配置应首选 `openai/*` 加上显式的 Codex 运行时策略。

例如，这使默认代理保持在正常的自动选择上，并添加了一个单独的 Codex 代理：

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
      agentRuntime: {
        id: "auto",
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
        model: "openai/gpt-5.5",
        agentRuntime: {
          id: "codex",
        },
      },
    ],
  },
}
```

结构如下：

- 默认 `main` 代理使用正常的提供商路径和 PI 兼容性回退。
- `codex` 代理使用 Codex 应用服务器 harness。
- 如果 `codex` 代理缺少或不支持 Codex，该轮次将失败，而不是静默使用 PI。

## Agent 命令路由

代理应根据意图路由用户请求，而不仅仅是根据单词“Codex”：

| 用户请求...                                       | 代理应使用...                                 |
| ------------------------------------------------- | --------------------------------------------- |
| "将此聊天绑定到 Codex"                            | `/codex bind`                                 |
| "在此处恢复 Codex 线程 `<id>`"                    | `/codex resume <id>`                          |
| "显示 Codex 线程"                                 | `/codex threads`                              |
| "将 Codex 用作此代理的运行时"                     | 配置更改为 `agentRuntime.id`                  |
| "在普通 OpenClaw 中使用我的 ChatGPT/Codex 订阅"   | `openai-codex/*` 模型引用                     |
| "通过 ACP/acpx 运行 Codex"                        | ACP `sessions_spawn({ runtime: "acp", ... })` |
| "在线程中启动 Claude Code/Gemini/OpenCode/Cursor" | ACP/acpx，而非 `/codex`，也非原生子代理       |

OpenClaw 仅在 ACP 已启用、可分派且由已加载的运行时后端支持时，才向代理通告 ACP 生成指导。如果 ACP 不可用，系统提示和插件技能不应教导代理有关 ACP 路由的内容。

## 仅限 Codex 的部署

当您需要证明每个嵌入式代理回合都使用 Codex 时，请强制使用 Codex harness。显式插件运行时默认没有 PI 回退，因此 `fallback: "none"` 是可选的，但作为文档记录通常很有用：

```json5
{
  agents: {
    defaults: {
      model: "openai/gpt-5.5",
      agentRuntime: {
        id: "codex",
        fallback: "none",
      },
    },
  },
}
```

环境覆盖：

```bash
OPENCLAW_AGENT_RUNTIME=codex openclaw gateway run
```

在强制使用 Codex 的情况下，如果 Codex 插件被禁用、app-server 太旧或 app-server 无法启动，OpenClaw 会提前失败。仅当您确实希望 PI 处理缺失的 harness 选择时，才设置 `OPENCLAW_AGENT_HARNESS_FALLBACK=pi`。

## Per-agent Codex

您可以使一个代理仅使用 Codex，而默认代理保持正常的自动选择：

```json5
{
  agents: {
    defaults: {
      agentRuntime: {
        id: "auto",
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
        model: "openai/gpt-5.5",
        agentRuntime: {
          id: "codex",
          fallback: "none",
        },
      },
    ],
  },
}
```

使用普通的会话命令来切换代理和模型。`/new` 会创建一个新的 OpenClaw 会话，Codex harness 会根据需要创建或恢复其 sidecar app-server 线程。`/reset` 会清除该线程的 OpenClaw 会话绑定，并让下一轮再次从当前配置中解析 harness。

## 模型发现

默认情况下，Codex 插件会向应用服务器询问可用模型。如果发现失败或超时，它将使用捆绑的备用目录，用于：

- GPT-5.5
- GPT-5.4 mini
- GPT-5.2

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

当您希望启动时避免探测 Codex 并坚持使用备用目录时，请禁用发现：

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

默认情况下，插件会在本地启动 OpenClaw 托管的 Codex 二进制文件，配置如下：

```bash
codex app-server --listen stdio://
```

托管二进制文件被声明为捆绑插件运行时依赖项，并与其他 `codex` 插件依赖项一起暂存。这将应用服务器版本与捆绑插件绑定，而不是取决于本地安装的任何独立的 Codex CLI。仅当您有意运行不同的可执行文件时，才设置 `appServer.command`。

默认情况下，OpenClaw 会以 YOLO 模式启动本地 Codex harness 会话：
`approvalPolicy: "never"`、`approvalsReviewer: "user"` 和
`sandbox: "danger-full-access"`。这是用于自主心跳的可信本地操作员姿态：Codex 可以使用 shell 和网络工具，而不会在周围无人应答的原生批准提示上停止。

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

守护者模式使用 Codex 的原生自动审查批准路径。当 Codex 请求离开沙盒、在工作区外写入或添加网络访问等权限时，Codex 会将该批准请求路由到原生审查程序，而不是人工提示。审查程序应用 Codex 的风险框架并批准或拒绝特定请求。当您想要比 YOLO 模式更多的护栏但仍需要无人值守的代理取得进展时，请使用守护者模式。

`guardian` 预设扩展为 `approvalPolicy: "on-request"`、
`approvalsReviewer: "auto_review"` 和 `sandbox: "workspace-write"`。
个别策略字段仍会覆盖 `mode`，因此高级部署可以将预设与显式选项混合使用。较旧的 `guardian_subagent` 审查程序值仍作为兼容性别名被接受，但新配置应使用
`auto_review`。

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

| 字段                | 默认值                                   | 含义                                                                                            |
| ------------------- | ---------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `transport`         | `"stdio"`                                | `"stdio"` 衍生 Codex；`"websocket"` 连接到 `url`。                                              |
| `command`           | 托管的 Codex 二进制文件                  | 用于 stdio 传输的可执行文件。保留未设置状态以使用托管二进制文件；仅在进行显式覆盖时才进行设置。 |
| `args`              | `["app-server", "--listen", "stdio://"]` | stdio 传输的参数。                                                                              |
| `url`               | 未设置                                   | WebSocket 应用服务器 URL。                                                                      |
| `authToken`         | 未设置                                   | WebSocket 传输的 Bearer 令牌。                                                                  |
| `headers`           | `{}`                                     | 额外的 WebSocket 标头。                                                                         |
| `requestTimeoutMs`  | `60000`                                  | 应用服务器控制平面调用的超时时间。                                                              |
| `mode`              | `"yolo"`                                 | YOLO 或监护人审查执行的预设。                                                                   |
| `approvalPolicy`    | `"never"`                                | 发送到线程启动/恢复/轮次的本地 Codex 审批策略。                                                 |
| `sandbox`           | `"danger-full-access"`                   | 发送到线程启动/恢复的本地 Codex 沙箱模式。                                                      |
| `approvalsReviewer` | `"user"`                                 | 使用 `"auto_review"` 让 Codex 审查本地审批提示。`guardian_subagent` 仍是旧版别名。              |
| `serviceTier`       | 未设置                                   | 可选的 Codex 应用服务器服务层级：`"fast"`、`"flex"` 或 `null`。无效的旧版值将被忽略。           |

环境变量覆盖仍可用于本地测试：

- `OPENCLAW_CODEX_APP_SERVER_BIN`
- `OPENCLAW_CODEX_APP_SERVER_ARGS`
- `OPENCLAW_CODEX_APP_SERVER_MODE=yolo|guardian`
- `OPENCLAW_CODEX_APP_SERVER_APPROVAL_POLICY`
- `OPENCLAW_CODEX_APP_SERVER_SANDBOX`

当 `appServer.command` 未设置时，`OPENCLAW_CODEX_APP_SERVER_BIN` 会绕过托管二进制文件。

`OPENCLAW_CODEX_APP_SERVER_GUARDIAN=1` 已被移除。请改用 `plugins.entries.codex.config.appServer.mode: "guardian"`，或使用 `OPENCLAW_CODEX_APP_SERVER_MODE=guardian` 进行一次性本地测试。对于可重复的部署，首选配置，因为它将插件行为与 Codex harness 设置的其余部分保持在同一个已审查的文件中。

## 计算机使用

Computer Use 是 Codex 原生的 MCP 插件。OpenClaw 不提供桌面控制应用程序，也不自行执行桌面操作；它启用 Codex 应用服务器插件，在请求时安装已配置的 Codex 市场插件，检查 `computer-use` MCP 服务器是否可用，然后让 Codex 在 Codex 模式轮次中处理原生的 MCP 工具调用。

当您希望 Codex 模式轮次需要 Computer Use 时，请设置 `plugins.entries.codex.config.computerUse`：

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
        config: {
          computerUse: {
            autoInstall: true,
          },
        },
      },
    },
  },
  agents: {
    defaults: {
      model: "openai/gpt-5.5",
      embeddedHarness: {
        runtime: "codex",
      },
    },
  },
}
```

如果没有市场字段，OpenClaw 会请求 Codex 应用服务器使用其发现的市场。在全新的 Codex 主页上，应用服务器会植入官方策划的市场，OpenClaw 遵循与 Codex 相同的加载形状：它在安装期间轮询 `plugin/list`，然后将 Computer Use 视为不可用。默认发现等待时间为 60 秒，可以通过 `marketplaceDiscoveryTimeoutMs` 进行调整。如果多个已知的 Codex 市场包含 Computer Use，OpenClaw 会使用 Codex 市场优先顺序，然后对于未知的模糊匹配以失败关闭。

对于应用服务器可以添加的非默认 Codex 市场源，请使用 `marketplaceSource`；对于机器上已存在的本地市场文件，请使用 `marketplacePath`。如果市场已向 Codex 应用服务器注册，请改用 `marketplaceName`。默认值是 `pluginName: "computer-use"` 和 `mcpServerName: "computer-use"`。
为了安全起见，轮次开始时的自动安装仅使用应用服务器已发现的市场。对于从配置的 `marketplaceSource` 或 `marketplacePath` 进行的显式安装，请使用 `/codex computer-use install`。

可以从命令界面检查或安装相同的设置：

- `/codex computer-use status`
- `/codex computer-use install`
- `/codex computer-use install --source <marketplace-source>`
- `/codex computer-use install --marketplace-path <path>`

Computer Use 是特定于 macOS 的，在 Codex MCP 服务器可以控制应用程序之前，可能需要本地操作系统的权限。如果 `computerUse.enabled` 为 true 且 MCP 服务器不可用，Codex 模式轮次将在线程启动之前失败，而不是在没有原生 Computer Use 工具的情况下静默运行。

## 常用配方

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

仅限 Codex 的 harness 验证：

```json5
{
  agents: {
    defaults: {
      model: "openai/gpt-5.5",
      agentRuntime: {
        id: "codex",
      },
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

Guardian 审核的 Codex 批准：

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
            approvalsReviewer: "auto_review",
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

模型切换仍由 OpenClaw 控制。当 OpenClaw 会话附加到现有 Codex 线程时，下一轮会将当前选定的 OpenAI 模型、提供商、批准策略、沙盒和服务层再次发送给应用服务器。从 `openai/gpt-5.5` 切换到 `openai/gpt-5.2` 会保持线程绑定，但要求 Codex 使用新选择的模型继续。

## Codex 命令

捆绑插件将 `/codex` 注册为授权的斜杠命令。它是通用的，可在任何支持 OpenClaw 文本命令的渠道上工作。

常见形式：

- `/codex status` 显示实时应用服务器连接、模型、账户、速率限制、MCP 服务器和技能。
- `/codex models` 列出实时的 Codex 应用服务器模型。
- `/codex threads [filter]` 列出最近的 Codex 线程。
- `/codex resume <thread-id>` 将当前的 OpenClaw 会话附加到现有的 Codex 线程。
- `/codex compact` 要求 Codex 应用服务器压缩附加的线程。
- `/codex review` 启动附加线程的 Codex 原生审核。
- `/codex computer-use status` 检查配置的 Computer Use 插件和 MCP 服务器。
- `/codex computer-use install` 安装配置的 Computer Use 插件并重新加载 MCP 服务器。
- `/codex account` 显示账户和速率限制状态。
- `/codex mcp` 列出 Codex 应用服务器 MCP 服务器状态。
- `/codex skills` 列出 Codex 应用服务器技能。

`/codex resume` 写入与 harness 用于普通轮次相同的侧车绑定文件。在下一个消息中，OpenClaw 恢复该 Codex 线程，将当前选定的 OpenClaw 模型传递给应用服务器，并保持扩展历史记录启用状态。

命令界面需要 Codex 应用服务器 `0.125.0` 或更新版本。如果未来或自定义应用服务器未公开该 JSON-RPC 方法，则各个控制方法将报告为 `unsupported by this Codex app-server`。

## Hook 边界

Codex harness 有三个 hook 层：

| 层级                       | 所有者            | 用途                                                 |
| -------------------------- | ----------------- | ---------------------------------------------------- |
| OpenClaw 插件 hooks        | OpenClaw          | 产品/插件在 PI 和 Codex 驱动程序之间的兼容性。       |
| Codex 应用服务器扩展中间件 | OpenClaw 捆绑插件 | 围绕 OpenClaw 动态工具的每轮适配器行为。             |
| Codex 原生钩子             | Codex             | 来自 Codex 配置的低级 Codex 生命周期和原生工具策略。 |

OpenClaw 不使用项目或全局 Codex `hooks.json` 文件来路由
OpenClaw 插件行为。对于受支持的原生工具和权限桥，
OpenClaw 为 `PreToolUse`、`PostToolUse`、
`PermissionRequest` 和 `Stop` 注入每线程 Codex 配置。其他 Codex 钩子（如 `SessionStart` 和
`UserPromptSubmit`）保留为 Codex 级别的控制；它们不作为
v1 协议中的 OpenClaw 插件钩子公开。

对于 OpenClaw 动态工具，OpenClaw 在 Codex 请求调用后执行该工具，
因此 OpenClaw 在驱动程序适配器中触发它拥有的插件和中间件行为。
对于 Codex 原生工具，Codex 拥有规范的工具记录。
OpenClaw 可以镜像选定的事件，但除非 Codex 通过应用服务器或原生钩子
回调公开该操作，否则它无法重写原生 Codex 线程。

压缩和 LLM 生命周期预测来自 Codex 应用服务器
通知和 OpenClaw 适配器状态，而非原生 Codex 钩子命令。
OpenClaw 的 `before_compaction`、`after_compaction`、`llm_input` 和
`llm_output` 事件是适配器级别的观察，而非 Codex 内部请求或压缩负载的
逐字节捕获。

Codex 原生 `hook/started` 和 `hook/completed` 应用服务器通知被
投影为 `codex_app_server.hook` 代理事件，用于轨迹和调试。
它们不调用 OpenClaw 插件钩子。

## V1 支持协议

Codex 模式不是底层具有不同模型调用的 PI。Codex 拥有更多
原生模型循环，而 OpenClaw 围绕该边界调整其插件和会话表面。

Codex 运行时 v1 中支持的功能：

| 表面                              | 支持                 | 原因                                                                                                                                                  |
| --------------------------------- | -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| 通过 Codex 进行的 OpenAI 模型循环 | 支持                 | Codex 应用服务器拥有 OpenAI 轮次、原生线程恢复和原生工具继续执行。                                                                                    |
| OpenClaw 渠道路由和投递           | 支持                 | Telegram、Discord、Slack、WhatsApp、iMessage 和其他渠道位于模型运行时之外。                                                                           |
| OpenClaw 动态工具                 | 支持                 | Codex 请求 OpenClaw 执行这些工具，因此 OpenClaw 仍保留在执行路径中。                                                                                  |
| 提示词和上下文插件                | 支持                 | OpenClaw 构建提示词叠加层，并在启动或恢复线程之前将上下文投射到 Codex 轮次中。                                                                        |
| 上下文引擎生命周期                | 支持                 | 针对 Codex 轮次运行组装、摄取或轮次后维护以及上下文引擎压缩协调。                                                                                     |
| 动态工具钩子                      | 支持                 | `before_tool_call`、`after_tool_call` 和工具结果中间件围绕 OpenClaw 拥有的动态工具运行。                                                              |
| 生命周期钩子                      | 作为适配器观察支持   | `llm_input`、`llm_output`、`agent_end`、`before_compaction` 和 `after_compaction` 触发并带有真实的 Codex 模式负载。                                   |
| 最终答案修订门控                  | 通过本机钩子中继支持 | Codex `Stop` 被中继到 `before_agent_finalize`；`revise` 请求 Codex 在最终确定之前再进行一次模型传递。                                                 |
| 本机 Shell、补丁和 MCP 阻止或观察 | 通过本机钩子中继支持 | 针对已提交的本机工具表面中继 Codex `PreToolUse` 和 `PostToolUse`，包括 Codex 应用服务器 `0.125.0` 或更高版本上的 MCP 负载。支持阻止；不支持参数重写。 |
| 本机权限策略                      | 通过本机钩子中继支持 | Codex `PermissionRequest` 可以通过运行时公开的 OpenClaw 策略进行路由。如果 OpenClaw 未返回决定，Codex 将继续通过其正常的守护者或用户批准路径。        |
| 应用服务器轨迹捕获                | 支持                 | OpenClaw 记录其发送到应用服务器的请求以及其接收到的应用服务器通知。                                                                                   |

Codex 运行时 v1 中不支持：

| 表面                                            | V1 边界                                                                                               | 未来路径                                                       |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| 本机工具参数变更                                | Codex 本机预工具钩子可以阻止，但 OpenClaw 不会重写 Codex 本机工具参数。                               | 需要 Codex hook/schema 支持以替换工具输入。                    |
| 可编辑的 Codex 原生记录历史                     | Codex 拥有规范的本地线程历史。OpenClaw 拥有一个副本并可以投影未来上下文，但不应改变不支持的内部结构。 | 如果需要进行本地线程修改，请添加显式的 Codex 应用服务器 API。  |
| 用于 Codex 原生工具记录的 `tool_result_persist` | 该 hook 转换 OpenClaw 拥有的记录写入，而不是 Codex 原生工具记录。                                     | 可以镜像转换后的记录，但规范重写需要 Codex 支持。              |
| 丰富的本地压缩元数据                            | OpenClaw 观察压缩的开始和完成，但不会收到稳定的保留/丢弃列表、Token 增量或摘要负载。                  | 需要更丰富的 Codex 压缩事件。                                  |
| 压缩干预                                        | 当前的 OpenClaw 压缩 hooks 在 Codex 模式下处于通知级别。                                              | 如果插件需要否决或重写本地压缩，请添加 Codex 压缩前/后 hooks。 |
| 逐字节的模型 API 请求捕获                       | OpenClaw 可以捕获应用服务器请求和通知，但 Codex 核心在内部构建最终的 OpenAI API 请求。                | 需要 Codex 模型请求跟踪事件或调试 API。                        |

## 工具、媒体和压缩

Codex harness 仅更改底层的嵌入式代理执行器。

OpenClaw 仍然构建工具列表并从 harness 接收动态工具结果。文本、图像、视频、音乐、TTS、批准和消息传递工具输出继续通过正常的 OpenClaw 传递路径。

本地 hook 中继故意设计为通用，但 v1 支持协议仅限于 OpenClaw 测试的 Codex 原生工具和权限路径。在 Codex 运行时中，这包括 shell、patch 和 MCP `PreToolUse`、`PostToolUse` 和 `PermissionRequest` 负载。在运行时协议命名之前，不要假设每个未来的 Codex hook 事件都是 OpenClaw 插件表面。

对于 `PermissionRequest`，当策略决定时，OpenClaw 仅返回明确的允许或拒绝决定。无决定结果不是允许。Codex 将其视为无 hook 决定，并回退到其自己的保护者或用户批准路径。

当 Codex 将 `_meta.codex_approval_kind` 标记为 `"mcp_tool_call"` 时，Codex MCP 工具批准请求会通过 OpenClaw 的插件批准流程进行路由。Codex `request_user_input` 提示会被发送回原始聊天，下一个排队的后续消息会回答该原生服务器请求，而不是作为额外的上下文被引导。其他 MCP 请求仍将失败关闭。

当所选模型使用 Codex harness 时，原生线程压缩会委托给 Codex 应用服务器。OpenClaw 会保留一份记录镜像用于渠道历史、搜索、`/new`、`/reset` 以及未来的模型或 harness 切换。该镜像包括用户提示、最终助手文本，以及应用服务器发出时的轻量级 Codex 推理或计划记录。目前，OpenClaw 仅记录原生压缩的开始和完成信号。它尚未公开人类可读的压缩摘要或可审计的列表，以显示 Codex 在压缩后保留了哪些条目。

由于 Codex 拥有规范的原生线程，因此 `tool_result_persist` 目前不会重写 Codex 原生工具结果记录。它仅适用于 OpenClaw 正在编写 OpenClaw 拥有的会话记录工具结果时。

媒体生成不需要 PI。图像、视频、音乐、PDF、TTS 和媒体理解继续使用匹配的提供商/模型设置，例如 `agents.defaults.imageGenerationModel`、`videoGenerationModel`、`pdfModel` 和 `messages.tts`。

## 故障排除

**Codex 未显示为正常的 `/model` 提供商：** 对于新配置来说这是预期的。选择一个带有 `agentRuntime.id: "codex"` 的 `openai/gpt-*` 模型（或旧的 `codex/*` 引用），启用 `plugins.entries.codex.enabled`，并检查 `plugins.allow` 是否排除了 `codex`。

**OpenClaw 使用 PI 而不是 Codex：** 当没有 Codex harness 接管运行时，`agentRuntime.id: "auto"` 仍可将 PI 用作兼容性后端。设置 `agentRuntime.id: "codex"` 以在测试期间强制选择 Codex。除非显式设置 `agentRuntime.fallback: "pi"`，否则强制选择的 Codex 运行时现在会失败，而不是回退到 PI。一旦选择了 Codex 应用服务器，其失败将直接呈现，而无需额外的回退配置。

**应用服务器被拒绝：** 升级 Codex，以便应用服务器握手报告版本 `0.125.0` 或更新版本。拒绝同版本的预发布版本或带有构建后缀的版本（如 `0.125.0-alpha.2` 或 `0.125.0+custom`），因为稳定的 `0.125.0` 协议底线才是 OpenClaw 测试的内容。

**模型发现速度慢：** 降低 `plugins.entries.codex.config.discovery.timeoutMs` 或禁用发现。

**WebSocket 传输立即失败：**请检查 `appServer.url`、`authToken`，并确保远程应用服务器使用相同的 Codex 应用服务器协议版本。

**非 Codex 模型使用 PI：**这是预期的，除非你为该代理强制 `agentRuntime.id: "codex"` 或选择了旧版 `codex/*` 引用。普通的 `openai/gpt-*` 和其他提供商引用在 `auto` 模式下保持其正常的提供商路径。如果你强制 `agentRuntime.id: "codex"`，该代理的每个嵌入式回合必须是 Codex 支持的 OpenAI 模型。

## 相关

- [Agent harness plugins](/zh/plugins/sdk-agent-harness)
- [Agent runtimes](/zh/concepts/agent-runtimes)
- [Model providers](/zh/concepts/model-providers)
- [OpenAI 提供商](/zh/providers/openai)
- [状态](/zh/cli/status)
- [插件钩子](/zh/plugins/hooks)
- [配置参考](/zh/gateway/configuration-reference)
- [测试](/zh/help/testing-live#live-codex-app-server-harness-smoke)
