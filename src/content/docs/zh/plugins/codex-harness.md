---
summary: "通过捆绑的 Codex 应用服务器 harness 运行嵌入的 OpenClaw 代理轮次"
title: "Codex harness"
read_when:
  - You want to use the bundled Codex app-server harness
  - You need Codex harness config examples
  - You want Codex-only deployments to fail instead of falling back to PI
---

捆绑的 `codex` 插件允许 OpenClaw 通过 Codex 应用服务器运行嵌入的 OpenAI 代理轮次，而不是使用内置的 PI harness。

当您希望 Codex 拥有底层代理会话时，请使用 Codex harness：原生线程恢复、原生工具延续、原生压缩和应用服务器执行。OpenClaw 仍然拥有聊天频道、会话文件、模型选择、OpenClaw 动态工具、审批、媒体传递和可见的转录镜像。

正常设置使用规范的 OpenAI 模型引用，例如 `openai/gpt-5.5`。
不要配置 `openai-codex/gpt-*` 模型引用。`openai-codex` 是 Codex OAuth 或 Codex API 密钥配置文件的认证配置文件提供商，而不是新代理配置的模型提供商前缀。

有关更广泛的模型/提供商/运行时划分，请从
[Agent runtimes](/zh/concepts/agent-runtimes) 开始。简而言之：
`openai/gpt-5.5` 是模型引用，`codex` 是运行时，而 Telegram、
Discord、Slack 或其他渠道仍保留为通信表面。

## Requirements

- 带有可用捆绑 `codex` 插件的 OpenClaw。
- 如果您的配置使用 `plugins.allow`，请包含 `codex`。
- Codex app-server `0.125.0` 或更新版本。默认情况下，捆绑插件会管理兼容的
  Codex app-server 二进制文件，因此 `PATH` 上的本地 `codex` 命令不会
  影响正常的 harness 启动。
- 可通过 `openclaw models auth login --provider openai-codex`、
  代理的 Codex 主目录中的 app-server 帐户或显式的 Codex API 密钥
  身份验证配置文件使用 Codex 身份验证。

有关身份验证优先级、环境隔离、自定义 app-server 命令、模型
发现以及所有配置字段，请参阅
[Codex harness 参考](/zh/plugins/codex-harness-reference)。

## 快速入门

大多数想在 OpenClaw 中使用 Codex 的用户都选择这种方式：使用 ChatGPT/Codex 订阅登录，启用内置的 `codex` 插件，并使用规范的 `openai/gpt-*` 模型引用。

使用 Codex OAuth 登录：

```bash
openclaw models auth login --provider openai-codex
```

启用内置的 `codex` 插件并选择一个 OpenAI 代理模型：

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

如果您的配置使用 `plugins.allow`，请在此处也添加 `codex`：

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

更改插件配置后重启网关。如果现有聊天已经拥有会话，请在测试运行时更改之前使用 `/new` 或 `/reset`，以便下一轮从当前配置解析 harness。

## 配置

快速入门配置是 Codex harness 可用的最小配置。在 OpenClaw 配置中设置 Codex harness 选项，并仅将 CLI 用于 Codex 身份验证：

| 需要                            | 设置                                                                    | 位置                     |
| ------------------------------- | ----------------------------------------------------------------------- | ------------------------ |
| 启用 harness                    | `plugins.entries.codex.enabled: true`                                   | OpenClaw 配置            |
| 保留已列入白名单的插件安装      | 在 `plugins.allow` 中包含 `codex`                                       | OpenClaw 配置            |
| 通过 Codex 路由 OpenAI 代理轮次 | 将 `agents.defaults.model` 或 `agents.list[].model` 设为 `openai/gpt-*` | OpenClaw 代理配置        |
| 使用 Codex OAuth 登录           | `openclaw models auth login --provider openai-codex`                    | CLI 身份验证配置文件     |
| 当 Codex 不可用时失败关闭       | 提供方或模型 `agentRuntime.id: "codex"`                                 | OpenClaw 模型/提供商配置 |
| 使用直接的 OpenAI API 流量      | 带有标准 OpenAI 认证的提供商或模型 `agentRuntime.id: "pi"`              | OpenClaw 模型/提供商配置 |
| 调整应用服务器行为              | `plugins.entries.codex.config.appServer.*`                              | Codex 插件配置           |
| 启用原生 Codex 插件应用         | `plugins.entries.codex.config.codexPlugins.*`                           | Codex 插件配置           |
| 启用 Codex 计算机使用           | `plugins.entries.codex.config.computerUse.*`                            | Codex 插件配置           |

对 Codex 支持的 OpenAI 代理轮次使用 `openai/gpt-*` 模型引用。
`openai-codex` 仅仅是 Codex OAuth 和
Codex API 密钥配置文件的认证配置文件提供商名称。请勿编写新的 `openai-codex/gpt-*` 模型引用。

本页的其余部分涵盖了用户必须选择的常见变体：部署形状、故障关闭路由、Guardian 批准策略、原生 Codex 插件以及 Computer Use。有关完整的选项列表、默认值、枚举、发现、环境隔离、超时和应用服务器传输字段，请参阅 [Codex harness 参考](/zh/plugins/codex-harness-reference)。

## 验证 Codex 运行时

在您期望使用 Codex 的聊天中使用 `/status`。由 Codex 支持的 OpenAI 代理轮次显示：

```text
Runtime: OpenAI Codex
```

然后检查 Codex 应用服务器状态：

```text
/codex status
/codex models
```

`/codex status` 报告应用服务器连接性、账户、速率限制、MCP 服务器和技能。`/codex models` 列出了该 Harness 和账户的实时 Codex 应用服务器目录。如果 `/status` 出乎意料，请参阅 [故障排除](#troubleshooting)。

## 路由和模型选择

保持提供商引用和运行时策略分离：

- 通过 Codex 使用 `openai/gpt-*` 进行 OpenAI 代理轮次。
- 不要在配置中使用 `openai-codex/gpt-*`。运行 `openclaw doctor --fix` 以
  修复遗留引用和过时的会话路由固定。
- 对于常规 OpenAI 自动模式，`agentRuntime.id: "codex"` 是可选的，但如果 Codex
  不可用时部署应失败关闭，则它非常有用。
- 当有意为之，`agentRuntime.id: "pi"` 将提供商或模型选择为直接 PI 行为。
- `/codex ...` 从聊天控制原生 Codex 应用服务器对话。
- ACP/acpx 是一个独立的外部 harness 路径。仅当用户请求
  ACP/acpx 或外部 harness 适配器时才使用它。

常见命令路由：

| 用户意图              | 使用                             |
| --------------------- | -------------------------------- |
| 附加当前聊天          | `/codex bind [--cwd <path>]`     |
| 恢复现有的 Codex 线程 | `/codex resume <thread-id>`      |
| 列出或筛选 Codex 线程 | `/codex threads [filter]`        |
| 仅发送 Codex 反馈     | `/codex diagnostics [note]`      |
| 启动 ACP/acpx 任务    | ACP/acpx 会话命令，而非 `/codex` |

| 用例                                       | 配置                                                          | 验证                                   | 注意事项                  |
| ------------------------------------------ | ------------------------------------------------------------- | -------------------------------------- | ------------------------- |
| 具有原生 Codex 运行时的 ChatGPT/Codex 订阅 | `openai/gpt-*` 加上已启用的 `codex` 插件                      | `/status` 显示 `Runtime: OpenAI Codex` | 推荐路径                  |
| 如果 Codex 不可用则失败关闭                | 提供商或模型 `agentRuntime.id: "codex"`                       | 回合失败而不是回退到 PI                | 用于仅 Codex 的部署       |
| 通过 PI 路由直接的 OpenAI API 密钥流量     | 提供商或模型 `agentRuntime.id: "pi"` 和常规的 OpenAI 身份验证 | `/status` 显示 PI 运行时               | 仅在有意使用 PI 时使用    |
| 旧版配置                                   | `openai-codex/gpt-*`                                          | `openclaw doctor --fix` 会重写它       | 不要以这种方式编写新配置  |
| ACP/acpx Codex 适配器                      | ACP `sessions_spawn({ runtime: "acp" })`                      | ACP 任务/会话状态                      | 与原生 Codex harness 分离 |

`agents.defaults.imageModel` 遵循相同的前缀拆分。对常规的 OpenAI 路由使用 `openai/gpt-*`，仅当图像理解应通过有界的 Codex app-server 回合运行时使用 `codex/gpt-*`。不要使用 `openai-codex/gpt-*`；doctor 会将该旧前缀重写为 `openai/gpt-*`。

## 部署模式

### 基本 Codex 部署

当所有 OpenAI 代理回合默认应使用 Codex 时，请使用快速入门配置。

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

使用此配置，`main` 代理使用其常规提供商路径，而 `codex` 代理使用 Codex app-server。

### 失败关闭的 Codex 部署

对于 OpenAI 代理轮次，当捆绑插件可用时，OpenAI`openai/gpt-*` 已解析为 Codex。当您需要书面的失效关闭规则时，添加显式运行时策略：

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

在强制使用 Codex 的情况下，如果 Codex 插件被禁用、应用服务器太旧或应用服务器无法启动，OpenClaw 会尽早失效。

## 应用服务器策略

默认情况下，该插件会在本地使用 stdio 传输启动 OpenClaw 托管的 Codex 二进制文件。仅当您有意要运行不同的可执行文件时，才设置 OpenClaw`appServer.command`。仅当应用服务器已在其他位置运行时，才使用 WebSocket 传输：

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

本地 stdio 应用服务器会话默认采用受信任的本地操作员姿态：`approvalPolicy: "never"`、`approvalsReviewer: "user"` 和 `sandbox: "danger-full-access"`OpenClaw。如果本地 Codex 要求不允许这种隐式 YOLO 姿态，OpenClaw 将转而选择允许的 guardian 权限。

当您希望在沙箱逃逸或额外权限之前进行 Codex 原生自动审查时，请使用 guardian 模式：

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

Guardian 模式扩展为 Codex 应用服务器审批，当本地要求允许这些值时，通常为 `approvalPolicy: "on-request"`、`approvalsReviewer: "auto_review"` 和 `sandbox: "workspace-write"`。

有关每个应用服务器字段、身份验证顺序、环境隔离、发现和超时行为，请参阅 [Codex harness 参考](/zh/plugins/codex-harness-reference)。

## 命令和诊断

捆绑插件将 `/codex`OpenClaw 注册为斜杠命令，适用于任何支持 OpenClaw 文本命令的渠道。

常用形式：

- `/codex status` 检查应用服务器连接性、模型、账户、速率限制、MCP 服务器和技能。
- `/codex models` 列出实时的 Codex 应用服务器模型。
- `/codex threads [filter]` 列出最近的 Codex 应用服务器线程。
- `/codex resume <thread-id>`OpenClaw 将当前 OpenClaw 会话附加到现有的 Codex 线程。
- `/codex compact` 请求 Codex 应用服务器压缩附加的线程。
- `/codex review` 启动对附加线程的 Codex 原生审查。
- `/codex diagnostics [note]` 会在发送所连接线程的 Codex 反馈之前进行询问。
- `/codex account` 显示账户和速率限制状态。
- `/codex mcp` 列出 Codex 应用服务器 MCP 服务器状态。
- `/codex skills` 列出 Codex 应用服务器技能。

对于大多数支持报告，请在出现 bug 的对话中从 `/diagnostics [note]`Gateway(网关) 开始。它会创建一份 Gateway(网关) 诊断报告，并且对于 Codex harness 会话，会请求批准以发送相关的 Codex 反馈包。有关隐私模型和群组聊天行为，请参阅 [Diagnostics export](/zh/gateway/diagnostics)。

仅当您专门需要为当前连接的线程上传 Codex 反馈而不需要完整的 Gateway(网关) 诊断包时，才使用 `/codex diagnostics [note]`Gateway(网关)。

### 在本地检查 Codex 线程

检查不良 Codex 运行的最快方法通常是直接打开原生 Codex 线程：

```bash
codex resume <thread-id>
```

从已完成的 `/diagnostics` 回复、`/codex binding` 或 `/codex threads [filter]` 中获取线程 ID。

有关上传机制和运行时级诊断边界，请参阅 [Codex harness runtime](/zh/plugins/codex-harness-runtime#codex-feedback-upload)。

按以下顺序选择身份验证：

1. 代理的显式 OpenClaw Codex 身份验证配置文件。
2. 该代理的 Codex 主目录中应用服务器的现有账户。
3. 仅对于本地 stdio 应用服务器启动，当不存在应用服务器账户且仍需要 OpenAI 身份验证时，先执行 `CODEX_API_KEY`，然后执行 `OPENAI_API_KEY`OpenAI。

当 OpenClaw 检测到 ChatGPT 订阅风格的 Codex 身份验证配置文件时，它会从生成的 Codex 子进程中移除 `CODEX_API_KEY` 和 `OPENAI_API_KEY`。这确保 Gateway(网关) 级别的 API 密钥可用于嵌入或直接 OpenAI 模型，而不会导致原生 Codex 应用服务器轮次意外通过 API 计费。显式的 Codex API 密钥配置文件和本地 stdio 环境密钥回退使用应用服务器登录，而不是继承的子进程环境。WebSocket 应用服务器连接不接收 Gateway(网关) 环境 API 密钥回退；请使用显式身份验证配置文件或远程应用服务器自己的账户。

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

`appServer.clearEnv` 仅影响生成的 Codex 应用服务器子进程。

Codex 动态工具默认为 `searchable` 加载。OpenClaw 不会暴露重复 Codex 原生工作区操作的动态工具：`read`、`write`、`edit`、`apply_patch`、`exec`、`process` 和 `update_plan`。其余的 OpenClaw 集成工具（如消息传递、会话、媒体、定时任务、浏览器、节点、网关、`heartbeat_respond` 和 `web_search`）可通过 Codex 工具搜索在 `openclaw` 命名空间下使用，从而保持初始模型上下文较小。
`sessions_yield` 和仅消息工具来源的回复保持直接，因为这些是轮次控制契约。心跳协作指令告诉 Codex 在结束心跳轮次之前搜索 `heartbeat_respond`，前提是该工具尚未加载。

仅当连接到无法搜索延迟动态工具的自定义 Codex 应用服务器或调试完整工具负载时，才设置 `codexDynamicToolsLoading: "direct"`。

支持的顶级 Codex 插件字段：

| 字段                       | 默认值         | 含义                                                                  |
| -------------------------- | -------------- | --------------------------------------------------------------------- |
| `codexDynamicToolsLoading` | `"searchable"` | 使用 `"direct"` 将 OpenClaw 动态工具直接放入初始 Codex 工具上下文中。 |
| `codexDynamicToolsExclude` | `[]`           | 要从 Codex 应用服务器轮次中省略的其他 OpenClaw 动态工具名称。         |
| `codexPlugins`             | 禁用           | 对已迁移的源安装精选插件的本地 Codex 插件/应用支持。                  |

支持的 `appServer` 字段：

| 字段                          | 默认值                                    | 含义                                                                                                                                                            |
| ----------------------------- | ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `transport`                   | `"stdio"`                                 | `"stdio"` 生成 Codex；`"websocket"` 连接到 `url`。                                                                                                              |
| `command`                     | 托管的 Codex 二进制文件                   | 用于 stdio 传输的可执行文件。保留未设置以使用托管二进制文件；仅在显式覆盖时设置。                                                                               |
| `args`                        | `["app-server", "--listen", "stdio://"]`  | 用于 stdio 传输的参数。                                                                                                                                         |
| `url`                         | 未设置                                    | WebSocket 应用服务器 URL。                                                                                                                                      |
| `authToken`                   | 未设置                                    | 用于 WebSocket 传输的 Bearer 令牌。                                                                                                                             |
| `headers`                     | `{}`                                      | 额外的 WebSocket 标头。                                                                                                                                         |
| `clearEnv`                    | `[]`                                      | 在 OpenClaw 构建其继承的环境后，从生成的 stdio 应用服务器进程中移除的额外环境变量名称。`CODEX_HOME` 和 `HOME` 保留给 OpenClaw 在本地启动时的每代理 Codex 隔离。 |
| `requestTimeoutMs`            | `60000`                                   | 应用服务器控制平面调用的超时时间。                                                                                                                              |
| `turnCompletionIdleTimeoutMs` | `60000`                                   | 在轮次范围的 Codex 应用服务器请求之后的静默窗口，期间 OpenClaw 等待 `turn/completed`。对于缓慢的后工具或仅状态合成阶段，请增加此值。                            |
| `mode`                        | `"yolo"` 除非本地 Codex 要求不允许 YOLO   | 用于 YOLO 或监护人审查执行的预设。如果本地 stdio 要求省略了 `danger-full-access`、`never` 批准或 `user` 审查者，则会使隐含的默认监护人生效。                    |
| `approvalPolicy`              | `"never"` 或允许的监护人批准策略          | 发送到线程启动/恢复/轮次的本地 Codex 批准策略。如果允许，监护人默认值倾向于 `"on-request"`。                                                                    |
| `sandbox`                     | `"danger-full-access"` 或允许的监护人沙箱 | 发送到线程启动/恢复的本地 Codex 沙箱模式。如果允许，监护人默认值倾向于 `"workspace-write"`，否则为 `"read-only"`。                                              |
| `approvalsReviewer`           | `"user"` 或允许的监护人审查者             | 使用 `"auto_review"` 让 Codex 在允许时审查本地批准提示，否则使用 `guardian_subagent` 或 `user`。`guardian_subagent` 仍为遗留别名。                              |
| `serviceTier`                 | 未设置                                    | 可选的 Codex 应用服务器服务层级。`"priority"` 启用快速模式路由，`"flex"` 请求灵活处理，`null` 清除覆盖设置，遗留的 `"fast"` 被接受为 `"priority"`。             |

OpenClaw 拥有的动态工具调用与 OpenClaw`appServer.requestTimeoutMs` 独立限制：Codex `item/tool/call`OpenClaw 请求默认使用 30 秒的 OpenClaw 监视程序。正的单次调用 `timeoutMs` 参数会延长或缩短该特定工具的预算。`image_generate` 工具在工具调用未提供自己的超时时间时也使用 `agents.defaults.imageGenerationModel.timeoutMs`，而媒体理解 `image` 工具则使用 `tools.media.image.timeoutSeconds`OpenClaw 或其 60 秒的媒体默认值。动态工具预算上限为 600000 毫秒。超时时，OpenClaw 会在受支持的情况下中止工具信号，并向 Codex 返回失败的动态工具响应，以便轮次能够继续，而不是让会话处于 `processing` 状态。

在 OpenClaw 响应 Codex 轮次范围的应用服务器请求后，程序还期望 Codex 以 OpenClaw`turn/completed` 结束原生轮次。如果应用服务器在该响应后 `appServer.turnCompletionIdleTimeoutMs`OpenClawOpenClaw 内保持静默，OpenClaw 会尽力中断 Codex 轮次，记录诊断超时，并释放 OpenClaw 会话通道，以便后续聊天消息不会排在过时的原生轮次后面。针对同一轮次的任何非终止性通知（包括 `rawResponseItem/completed`）都会解除该短期监视程序，因为 Codex 已证明轮次仍然活跃；较长的终止监视程序则继续保护真正卡住的轮次。超时诊断包括最后的应用服务器通知方法，对于原始助手响应项，还包括项类型、角色、id 和有界的助手文本预览。

环境变量覆盖仍然可用于本地测试：

- `OPENCLAW_CODEX_APP_SERVER_BIN`
- `OPENCLAW_CODEX_APP_SERVER_ARGS`
- `OPENCLAW_CODEX_APP_SERVER_MODE=yolo|guardian`
- `OPENCLAW_CODEX_APP_SERVER_APPROVAL_POLICY`
- `OPENCLAW_CODEX_APP_SERVER_SANDBOX`

当未设置 `appServer.command` 时，`OPENCLAW_CODEX_APP_SERVER_BIN` 会绕过托管二进制文件。

`OPENCLAW_CODEX_APP_SERVER_GUARDIAN=1` 已被移除。请改用
`plugins.entries.codex.config.appServer.mode: "guardian"`，或者在进行一次性本地测试时使用
`OPENCLAW_CODEX_APP_SERVER_MODE=guardian`。对于可重复的部署，首选配置，因为它将插件行为与 Codex harness 设置的其余部分保持在同一个经过审查的文件中。

## Codex 原生插件

Codex 原生插件支持在与 OpenClaw harness 轮次相同的 Codex 线程中使用 Codex app-server 自有的应用和插件功能。OpenClaw 不会将 Codex 插件转换为合成 `codex_plugin_*` OpenClaw 动态工具。

`codexPlugins` 仅影响选择原生 Codex harness 的会话。它对 PI 运行、正常的 OpenAI 提供商运行、ACP 对话绑定或其他 harness 没有影响。

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
            allow_destructive_actions: false,
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

线程应用配置是在 OpenClaw 建立 Codex harness 会话或替换过时的 Codex 线程绑定时计算的。它不会在每一轮都重新计算。更改 `codexPlugins` 后，请使用 `/new`、`/reset` 或重启网关，以便未来的 Codex harness 会话使用更新后的应用集启动。

有关迁移资格、应用清单、破坏性操作策略、引诱（elicitations）和原生插件诊断，请参阅
[Native Codex plugins](/zh/plugins/codex-native-plugins)。

## Computer Use

Computer Use 在其单独的设置指南中进行了介绍：
[Codex Computer Use](/zh/plugins/codex-computer-use)。

简而言之：OpenClaw 不提供桌面控制应用，也不自行执行桌面操作。它准备 Codex app-server，验证
`computer-use` MCP 服务器是否可用，然后让 Codex 在 Codex 模式轮次期间拥有原生 MCP 工具调用。

## 运行时边界

Codex harness 仅更改低级嵌入式代理执行器。

- 支持 OpenClaw 动态工具。Codex 请求 OpenClaw 执行这些
  工具，因此 OpenClaw 仍保留在执行路径中。
- Codex 原生 shell、补丁、MCP 和原生应用工具归 Codex 所有。OpenClaw 可以通过支持的中继观察或阻止选定的原生事件，但它不会重写原生工具参数。
- Codex 拥有原生压缩功能。OpenClaw 会为渠道历史记录、搜索、OpenClaw`/new`、`/reset` 以及未来的模型或 harness 切换保留一个记录镜像。
- 媒体生成、媒体理解、TTS、批准和消息传递工具输出会继续通过匹配的 OpenClaw 提供商/模型设置进行。
- `tool_result_persist`OpenClaw 适用于 OpenClaw 拥有的记录工具结果，而不适用于 Codex 原生工具结果记录。

有关钩子层、支持的 V1 表面、原生权限处理、队列引导、Codex 反馈上传机制和压缩详细信息，请参阅 [Codex harness runtime](/zh/plugins/codex-harness-runtime)。

## 故障排除

**Codex 未显示为正常的 `/model` 提供商：** 对于新配置，这是预期行为。选择一个 `openai/gpt-*` 模型，启用 `plugins.entries.codex.enabled`，并检查 `plugins.allow` 是否排除了 `codex`。

**OpenClaw 使用 PI 而不是 Codex：** 请确保模型引用是官方 OpenAI 提供商上的 OpenClaw`openai/gpt-*`OpenAI，并且 Codex 插件已安装并启用。如果测试时需要严格证明，请设置提供商或模型 `agentRuntime.id: "codex"`。强制的 Codex 运行时会失败，而不是回退到 PI。

**旧的 `openai-codex/*` 配置仍然存在：** 请运行 `openclaw doctor --fix`。Doctor 会将旧的模型引用重写为 `openai/*`，移除过时的会话和全代理运行时固定，并保留现有的身份验证配置文件覆盖。

**App-server 被拒绝：** 请使用 Codex app-server `0.125.0` 或更新版本。
同版本的预发布版本或带有构建后缀的版本（例如
`0.125.0-alpha.2` 或 `0.125.0+custom`）会被拒绝，因为 OpenClaw 会测试
稳定的 `0.125.0` 协议底线。

**`/codex status` 无法连接：** 请检查附带的 `codex` 插件是否
已启用，在配置了允许列表时 `plugins.allow` 是否包含它，以及
任何自定义 `appServer.command`、`url`、`authToken` 或标头是否有效。

**模型发现速度慢：** 请降低
`plugins.entries.codex.config.discovery.timeoutMs` 或禁用发现功能。请参阅
[Codex harness reference](/zh/plugins/codex-harness-reference#model-discovery)。

**WebSocket 传输立即失败：** 请检查 `appServer.url`、`authToken`、
标头，以及远程 app-server 使用的 Codex app-server
协议版本是否相同。

**非 Codex 模型使用 PI：** 这是预期的，除非提供商或模型运行时
策略将其路由到另一个 harness。普通的非 OpenAI 提供商引用在 `auto` 模式下会
停留在其正常的提供商路径上。

**Computer Use 已安装但工具未运行：** 请从新的
会话检查 `/codex computer-use status`。如果工具报告
`Native hook relay unavailable`，请使用 `/new` 或 `/reset`；如果问题仍然存在，请
重启网关以清除过时的本机 hook 注册。请参阅
[Codex Computer Use](/zh/plugins/codex-computer-use#troubleshooting)。

## 相关

- [Codex harness reference](/zh/plugins/codex-harness-reference)
- [Codex harness runtime](/zh/plugins/codex-harness-runtime)
- [Native Codex plugins](/zh/plugins/codex-native-plugins)
- [Codex Computer Use](/zh/plugins/codex-computer-use)
- [Agent runtimes](/zh/concepts/agent-runtimes)
- [Model providers](/zh/concepts/model-providers)
- [OpenAI 提供商](/zh/providers/openai)
- [Agent harness plugins](/zh/plugins/sdk-agent-harness)
- [插件钩子](/zh/plugins/hooks)
- [诊断导出](/zh/gateway/diagnostics)
- [状态](/zh/cli/status)
- [测试](/zh/help/testing-live#live-codex-app-server-harness-smoke)
