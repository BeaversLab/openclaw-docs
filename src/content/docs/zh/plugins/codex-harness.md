---
summary: "OpenClaw通过捆绑的 Codex 应用服务器工具运行 OpenClaw 嵌入式代理回合"
title: "Codex 工具"
read_when:
  - You want to use the bundled Codex app-server harness
  - You need Codex harness config examples
  - You want Codex-only deployments to fail instead of falling back to PI
---

捆绑的 `codex`OpenClawOpenAI 插件允许 OpenClaw 通过 Codex 应用服务器而不是内置的 PI 工具运行嵌入式 OpenAI 代理回合。

当您希望 Codex 拥有底层代理会话时，请使用 Codex harness：原生线程恢复、原生工具延续、原生压缩和应用服务器执行。OpenClaw 仍然拥有聊天频道、会话文件、模型选择、OpenClaw 动态工具、审批、媒体传递和可见的转录镜像。

常规设置使用规范的 OpenAI 模型引用，例如 OpenAI`openai/gpt-5.5`。
不要配置 `openai-codex/gpt-*`OpenAI 模型引用。将 OpenAI 代理身份验证顺序
放在 `auth.order.openai` 下；旧的 `openai-codex:*` 配置文件和
`auth.order.openai-codex` 条目仍受现有安装支持。

OpenClaw 启动 Codex 应用服务器线程时启用 Codex 原生代码模式和仅代码模式。这使得延迟/可搜索的 OpenClaw 动态工具
保留在 Codex 自己的代码执行和工具搜索表面内，而不是在 Codex 之上添加
PI 风格的工具搜索包装器。

关于更广泛的模型/提供商/运行时划分，请从
[Agent runtimes](/zh/concepts/agent-runtimes) 开始。简而言之：
`openai/gpt-5.5` 是模型引用，`codex`TelegramDiscordSlack 是运行时，而 Telegram、
Discord、Slack 或其他渠道仍然是通信表面。

## Requirements

- OpenClaw，且捆绑的 OpenClaw`codex` 插件可用。
- 如果您的配置使用 `plugins.allow`，请包含 `codex`。
- Codex 应用服务器 `0.125.0` 或更新版本。默认情况下，捆绑插件管理兼容的
  Codex 应用服务器二进制文件，因此在 `PATH` 上的本地 `codex` 命令不会
  影响正常工具启动。
- 可通过 `openclaw models auth login --provider openai-codex`API、
  代理 Codex 主目录中的应用服务器帐户或显式的 Codex API 密钥
  身份验证配置文件获得 Codex 身份验证。

有关身份验证优先级、环境隔离、自定义应用服务器命令、模型发现以及所有配置字段，请参阅
[Codex harness 参考](/zh/plugins/codex-harness-reference)。

## 快速入门

大多数希望在 OpenClaw 中使用 Codex 的用户都选择此路径：使用 ChatGPT/Codex 订阅登录，启用捆绑的 `codex` 插件，并使用规范的 `openai/gpt-*` 模型引用。

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

更改插件配置后重启网关。如果现有的聊天已经拥有会话，请在测试运行时更改之前使用 `/new` 或 `/reset`，以便下一轮对话从当前配置解析 harness。

## 配置

快速入门配置是可用的最小 Codex harness 配置。在 OpenClaw 配置中设置 Codex harness 选项，并仅将 CLI 用于 Codex 身份验证：

| 需要                            | 设置                                                                          | 位置                                 |
| ------------------------------- | ----------------------------------------------------------------------------- | ------------------------------------ |
| 启用 harness                    | `plugins.entries.codex.enabled: true`                                         | OpenClaw 配置                        |
| 保留一个列入白名单的插件安装    | 在 `plugins.allow` 中包含 `codex`                                             | OpenClaw 配置                        |
| 通过 Codex 路由 OpenAI 代理回合 | `agents.defaults.model` 或 `agents.list[].model` 作为 `openai/gpt-*`          | OpenClaw 代理配置                    |
| 使用 Codex OAuth 登录           | `openclaw models auth login --provider openai-codex`                          | CLI 身份验证配置文件                 |
| 为 Codex 运行添加 API 密钥备份  | 在 `auth.order.openai` 中，订阅身份验证之后列出的 `openai:*` API 密钥配置文件 | CLI 身份验证配置文件 + OpenClaw 配置 |
| 当 Codex 不可用时失败关闭       | 提供商或模型 `agentRuntime.id: "codex"`                                       | OpenClaw 模型/提供商配置             |
| 使用直接 OpenAI API 流量        | 带有标准 OpenAI 身份验证的提供商或模型 `agentRuntime.id: "pi"`                | OpenClaw 模型/提供商配置             |
| 调整应用服务器行为              | `plugins.entries.codex.config.appServer.*`                                    | Codex 插件配置                       |
| 启用原生 Codex 插件应用         | `plugins.entries.codex.config.codexPlugins.*`                                 | Codex 插件配置                       |
| 启用 Codex Computer Use         | `plugins.entries.codex.config.computerUse.*`                                  | Codex 插件配置                       |

对于 Codex 支持的 OpenAI 代理轮次，请使用 `openai/gpt-*` 模型引用。对于订阅优先/API 密钥备份的顺序，首选 `auth.order.openai`。现有的 `openai-codex:*` 身份验证配置文件和 `auth.order.openai-codex` 仍然有效，但请不要写入新的 `openai-codex/gpt-*` 模型引用。

```json5
{
  auth: {
    order: {
      openai: ["openai-codex:user@example.com", "openai:api-key-backup"],
    },
  },
}
```

在此形式下，对于 `openai/gpt-*` 代理轮次，两个配置文件仍通过 Codex 运行。API 密钥仅作为身份验证的后备，并非切换到 PI 或普通 OpenAI 响应的请求。

本页的其余部分涵盖了用户必须选择之间常见变体：部署形式、故障封闭式路由、守护者批准策略、原生 Codex 插件和 Computer Use。有关完整的选项列表、默认值、枚举、发现、环境隔离、超时和应用服务器传输字段，请参阅 [Codex harness 参考](/zh/plugins/codex-harness-reference)。

## 验证 Codex 运行时

在您期望使用 Codex 的聊天中使用 `/status`。Codex 支持的 OpenAI 代理轮次显示：

```text
Runtime: OpenAI Codex
```

然后检查 Codex 应用服务器状态：

```text
/codex status
/codex models
```

`/codex status` 报告应用服务器连接性、账户、速率限制、MCP 服务器和技能。`/codex models` 列出了该框架和帐户的实时 Codex 应用服务器目录。如果 `/status` 出乎意料，请参阅 [故障排除](#troubleshooting)。

## 路由和模型选择

将提供商引用和运行时策略分离开来：

- 对于通过 Codex 的 OpenAI 代理轮次，请使用 `openai/gpt-*`。
- 不要在配置中使用 `openai-codex/gpt-*`。运行 `openclaw doctor --fix` 以
  修复旧的引用和过时的会话路由固定。
- 对于普通的 OpenAI 自动模式，`agentRuntime.id: "codex"` 是可选的，但如果 Codex 不可用时部署应失效关闭，则它非常有用。
- 当有意为之时，`agentRuntime.id: "pi"` 使提供商或模型选择直接 PI 行为。
- `/codex ...` 从聊天控制原生 Codex 应用服务器对话。
- ACP/acpx 是一条独立的外部控制路径。仅当用户要求使用 ACP/acpx 或外部控制适配器时才使用它。

常见命令路由：

| 用户意图              | 使用                             |
| --------------------- | -------------------------------- |
| 附加当前聊天          | `/codex bind [--cwd <path>]`     |
| 恢复现有的 Codex 线程 | `/codex resume <thread-id>`      |
| 列出或过滤 Codex 线程 | `/codex threads [filter]`        |
| 仅发送 Codex 反馈     | `/codex diagnostics [note]`      |
| 启动 ACP/acpx 任务    | ACP/acpx 会话命令，而非 `/codex` |

| 用例                                      | 配置                                                      | 验证                                   | 备注                     |
| ----------------------------------------- | --------------------------------------------------------- | -------------------------------------- | ------------------------ |
| ChatGPT/Codex 订阅，具有原生 Codex 运行时 | `openai/gpt-*` 加上启用的 `codex` 插件                    | `/status` 显示 `Runtime: OpenAI Codex` | 推荐路径                 |
| 如果 Codex 不可用则失效关闭               | 提供商或模型 `agentRuntime.id: "codex"`                   | 轮次失败而不是回退到 PI                | 用于仅 Codex 的部署      |
| 通过 PI 路由直接的 OpenAI API 密钥流量    | 提供商或模型 `agentRuntime.id: "pi"` 和普通的 OpenAI 认证 | `/status` 显示 PI 运行时               | 仅当有意使用 PI 时才使用 |
| 旧版配置                                  | `openai-codex/gpt-*`                                      | `openclaw doctor --fix` 会重写它       | 不要以这种方式编写新配置 |
| ACP/acpx Codex 适配器                     | ACP `sessions_spawn({ runtime: "acp" })`                  | ACP 任务/会话状态                      | 与原生 Codex 控制分离    |

`agents.defaults.imageModel` 遵循相同的前缀拆分。对常规 OpenAI 路由使用 `openai/gpt-*`，仅当图像理解应通过受限的 Codex 应用服务器轮次运行时才使用 `codex/gpt-*`。请勿使用 `openai-codex/gpt-*`；doctor 会将该旧版前缀重写为 `openai/gpt-*`。

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

此配置保持 Claude 为默认代理，并添加一个命名的 Codex 代理：

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

使用此配置时，`main` 代理使用其常规提供商路径，而 `codex` 代理使用 Codex 应用服务器。

### 故障关闭式 Codex 部署

对于 OpenAI 代理轮次，当捆绑插件可用时，`openai/gpt-*` 已解析为 Codex。当您需要明确的故障关闭规则时，添加显式运行时策略：

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

在强制使用 Codex 的情况下，如果 Codex 插件被禁用、应用服务器版本过低或应用服务器无法启动，OpenClaw 将会提前失败。

## 应用服务器策略

默认情况下，插件会在本地通过 stdio 传输启动 OpenClaw 托管的 Codex 二进制文件。仅当您有意运行不同的可执行文件时，才设置 `appServer.command`。仅当应用服务器已在其他位置运行时，才使用 WebSocket 传输：

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

本地 stdio 应用服务器会话默认为受信任的本地操作员姿态：`approvalPolicy: "never"`、`approvalsReviewer: "user"` 和 `sandbox: "danger-full-access"`。如果本地 Codex 要求不允许这种隐式 YOLO 姿态，OpenClaw 将改为选择允许的守护者权限。当会话激活 OpenClaw 沙箱时，OpenClaw 会将 Codex `danger-full-access` 限制为 Codex `workspace-write`，以便原生 Codex 代码模式轮次保持在沙箱隔离的工作区内。

当您希望 Codex 在沙箱逃逸或额外权限之前进行原生自动审查时，请使用守护者模式：

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

Guardian 模式扩展为 Codex 应用服务器审批，当本地要求允许这些值时，通常为
`approvalPolicy: "on-request"`、`approvalsReviewer: "auto_review"` 和
`sandbox: "workspace-write"`。

有关每个应用服务器字段、身份验证顺序、环境隔离、发现和
超时行为，请参阅 [Codex harness 参考](/zh/plugins/codex-harness-reference)。

## 命令和诊断

捆绑插件将 `/codex` 注册为任何支持
OpenClaw 文本命令的渠道上的斜杠命令。

常用形式：

- `/codex status` 检查应用服务器连接、模型、账户、速率限制、
  MCP 服务器和技能。
- `/codex models` 列出实时的 Codex 应用服务器模型。
- `/codex threads [filter]` 列出最近的 Codex 应用服务器线程。
- `/codex resume <thread-id>` 将当前的 OpenClaw 会话附加到
  现有的 Codex 线程。
- `/codex compact` 要求 Codex 应用服务器压缩附加的线程。
- `/codex review` 为附加的线程启动 Codex 原生审核。
- `/codex diagnostics [note]` 在为附加的线程发送 Codex 反馈之前
  会进行询问。
- `/codex account` 显示账户和速率限制状态。
- `/codex mcp` 列出 Codex 应用服务器 MCP 服务器状态。
- `/codex skills` 列出 Codex 应用服务器技能。

对于大多数支持报告，请在发生错误的对话中从 `/diagnostics [note]` 开始。
它会创建一个 Gateway(网关) 诊断报告，并且对于 Codex
harness 会话，会请求批准以发送相关的 Codex 反馈包。
有关隐私模型和群组聊天行为，请参阅 [诊断导出](/zh/gateway/diagnostics)。

仅当您专门需要为当前附加的线程上传 Codex 反馈而不需要完整的 Gateway(网关)
诊断包时，才使用 `/codex diagnostics [note]`。

### 在本地检查 Codex 线程

检查糟糕的 Codex 运行最快的方法通常是直接打开原生 Codex
线程：

```bash
codex resume <thread-id>
```

从已完成的 `/diagnostics` 回复、`/codex binding` 或
`/codex threads [filter]` 获取线程 id。

有关上传机制和运行时级别的诊断边界，请参阅
[Codex harness runtime](/zh/plugins/codex-harness-runtime#codex-feedback-upload)。

按以下顺序选择身份验证：

1. 为代理排序的 OpenAI 身份验证配置文件，最好位于
   `auth.order.openai` 下。现有的 `openai-codex:*` 配置文件 ID 仍然有效。
2. 该代理在 Codex 主目录中现有的应用服务器帐户。
3. 仅对于本地 stdio 应用服务器启动，`CODEX_API_KEY`，然后
   `OPENAI_API_KEY`，当不存在应用服务器帐户且仍需要
   OpenAI 身份验证时。

当 OpenClaw 检测到 ChatGPT 订阅风格的 Codex 身份验证配置文件时，它会从
生成的 Codex 子进程中移除 `CODEX_API_KEY` 和 `OPENAI_API_KEY`。这
可以使 Gateway(网关) 级别的 API 密钥可用于嵌入或直接 OpenAI 模型，
而不会意外地通过 API 为原生 Codex 应用服务器轮次计费。
明确的 Codex API 密钥配置文件和本地 stdio env-key 回退使用应用服务器
登录，而不是继承的子进程环境。WebSocket 应用服务器连接
不会接收 Gateway(网关) env API 密钥回退；请使用明确的身份验证配置文件或
远程应用服务器自己的帐户。

如果订阅配置文件达到 Codex 使用限制，OpenClaw 会在 Codex 报告时记录重置
时间，并尝试针对同一 Codex 运行的下一个排序身份验证配置文件。当重置时间过后，订阅配置文件将再次
变为有效，而无需更改所选的 `openai/gpt-*` 模型或 Codex 运行时。

如果部署需要额外的环境隔离，请将这些变量添加到
`appServer.clearEnv`：

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

Codex 动态工具默认为 `searchable`OpenClaw 加载。OpenClaw 不会公开重复 Codex 原生工作区操作的动态工具：`read`、`write`、`edit`、`apply_patch`、`exec`、`process` 和 `update_plan`OpenClaw。其余的 OpenClaw 集成工具（如消息传递、会话、媒体、cron、浏览器、节点、网关、`heartbeat_respond` 和 `web_search`）可在 Codex 工具搜索中通过 `openclaw` 命名空间获得，从而使初始模型上下文更小。
`sessions_yield` 和仅限消息工具的源回复保持直接连接，因为这些是轮次控制合约。Heartbeat 协作指令指示 Codex 在结束心跳轮次之前先搜索 `heartbeat_respond`（当该工具尚未加载时）。

仅当连接到无法搜索延迟动态工具的自定义 Codex 应用服务器，或调试完整工具负载时，才设置 `codexDynamicToolsLoading: "direct"`。

支持的顶级 Codex 插件字段：

| 字段                       | 默认值         | 含义                                                                          |
| -------------------------- | -------------- | ----------------------------------------------------------------------------- |
| `codexDynamicToolsLoading` | `"searchable"` | 使用 `"direct"`OpenClaw 将 OpenClaw 动态工具直接放入初始 Codex 工具上下文中。 |
| `codexDynamicToolsExclude` | `[]`           | 要从 Codex 应用服务器轮次中省略的其他 OpenClaw 动态工具名称。                 |
| `codexPlugins`             | disabled       | 原生 Codex 插件/应用支持已迁移的源安装精选插件。                              |

支持的 `appServer` 字段：

| 字段                          | 默认值                                        | 含义                                                                                                                                                                                                            |
| ----------------------------- | --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `transport`                   | `"stdio"`                                     | `"stdio"` 生成 Codex；`"websocket"` 连接到 `url`。                                                                                                                                                              |
| `command`                     | 托管的 Codex 二进制文件                       | 用于 stdio 传输的可执行文件。保留未设置状态以使用托管二进制文件；仅在需要显式覆盖时进行设置。                                                                                                                   |
| `args`                        | `["app-server", "--listen", "stdio://"]`      | stdio 传输的参数。                                                                                                                                                                                              |
| `url`                         | 未设置                                        | WebSocket 应用服务器 URL。                                                                                                                                                                                      |
| `authToken`                   | 未设置                                        | WebSocket 传输的 Bearer 令牌。                                                                                                                                                                                  |
| `headers`                     | `{}`                                          | 额外的 WebSocket 标头。                                                                                                                                                                                         |
| `clearEnv`                    | `[]`                                          | 从 OpenClaw 构建其继承环境后，从衍生出的 stdio 应用服务器进程中移除的额外环境变量名称。`CODEX_HOME` 和 `HOME` 保留给 OpenClaw 在本地启动时的按代理 Codex 隔离。                                                 |
| `requestTimeoutMs`            | `60000`                                       | 应用服务器控制平面调用的超时时间。                                                                                                                                                                              |
| `turnCompletionIdleTimeoutMs` | `60000`                                       | 在 OpenClaw 等待 `turn/completed` 时，轮次范围的 Codex 应用服务器请求之后的静默窗口。对于缓慢的后续工具或仅状态合成阶段，请增加此值。                                                                           |
| `mode`                        | `"yolo"`，除非本地 Codex 要求不允许 YOLO      | YOLO 或 Guardian 审核执行的预设。省略 `danger-full-access`、`never` 批准或 `user` 审核者的本地 stdio 要求将使隐式默认 Guardian 生效。                                                                           |
| `approvalPolicy`              | `"never"` 或允许的 Guardian 批准策略          | 发送到线程启动/恢复/轮次的本地 Codex 批准策略。Guardian 默认值在允许的情况下首选 `"on-request"`。                                                                                                               |
| `sandbox`                     | `"danger-full-access"` 或允许的 Guardian 沙盒 | 发送到线程启动/恢复/轮次的本地 Codex 沙盒模式。Guardian 默认值在允许的情况下首选 `"workspace-write"`，否则为 `"read-only"`。当 OpenClaw 沙盒处于活动状态时，`danger-full-access` 会缩小到 `"workspace-write"`。 |
| `approvalsReviewer`           | `"user"` 或允许的监护人审核者                 | 当允许时，使用 `"auto_review"` 让 Codex 审核本地审批提示，否则使用 `guardian_subagent` 或 `user`。`guardian_subagent` 仍作为旧版别名保留。                                                                      |
| `serviceTier`                 | unset                                         | 可选的 Codex 应用服务器服务层。`"priority"` 启用快速模式路由，`"flex"` 请求灵活处理，`null` 清除覆盖，且旧版 `"fast"` 被接受为 `"priority"`。                                                                   |

OpenClaw 拥有的动态工具调用与 OpenClaw`appServer.requestTimeoutMs` 是独立受限的：Codex `item/tool/call`OpenClaw 请求默认使用 30 秒的 OpenClaw 看门狗。正数的每次调用 `timeoutMs` 参数会延长或缩短该特定工具的预算。`image_generate` 工具也使用 `agents.defaults.imageGenerationModel.timeoutMs`，前提是工具调用未提供其自己的超时时间，且媒体理解 `image` 工具使用 `tools.media.image.timeoutSeconds`OpenClaw 或其 60 秒的媒体默认值。动态工具预算上限为 600000 毫秒。超时时，在支持的情况下 OpenClaw 会中止工具信号并向 Codex 返回失败的动态工具响应，以便轮次可以继续，而不是将会话置于 `processing` 状态。

在 OpenClaw 响应 Codex 轮次范围的应用服务器请求后，Harness 还期望 Codex 使用 `turn/completed` 完成本地轮次。如果在该响应后应用服务器安静 `appServer.turnCompletionIdleTimeoutMs`，OpenClaw 将尽力中断 Codex 轮次，记录诊断超时，并释放 OpenClaw 会话通道，以便后续聊天消息不会排队等待过时的本地轮次。同一轮次的任何非终止性通知（包括 `rawResponseItem/completed`）都会解除该短时监视程序，因为 Codex 已证明该轮次仍然存活；较长的终止监视程序继续保护真正卡住的轮次。全局应用服务器通知（例如速率限制更新）不会重置轮次空闲进度。当 Codex 发出已完成的 `agentMessage` 项目然后在没有 `turn/completed` 的情况下安静时，OpenClaw 将助手输出视为实际上已完成，尽力中断本地 Codex 轮次，并释放会话通道。超时诊断包括最后的应用服务器通知方法，对于原始助手响应项目，还包括项目类型、角色、id 和有界的助手文本预览。

环境覆盖仍然可用于本地测试：

- `OPENCLAW_CODEX_APP_SERVER_BIN`
- `OPENCLAW_CODEX_APP_SERVER_ARGS`
- `OPENCLAW_CODEX_APP_SERVER_MODE=yolo|guardian`
- `OPENCLAW_CODEX_APP_SERVER_APPROVAL_POLICY`
- `OPENCLAW_CODEX_APP_SERVER_SANDBOX`

当 `appServer.command` 未设置时，`OPENCLAW_CODEX_APP_SERVER_BIN` 会绕过托管二进制文件。

`OPENCLAW_CODEX_APP_SERVER_GUARDIAN=1` 已被移除。请改用 `plugins.entries.codex.config.appServer.mode: "guardian"`，或使用 `OPENCLAW_CODEX_APP_SERVER_MODE=guardian` 进行一次性本地测试。对于可重复部署，首选配置，因为它将插件行为与 Codex harness 设置的其余部分保留在同一个已审查的文件中。

## 原生 Codex 插件

原生 Codex 插件支持在与 OpenClaw 挂载轮次相同的 Codex 线程中使用 Codex 应用服务器的自有应用和插件功能。OpenClaw 不会将 Codex 插件转换为合成的 `codex_plugin_*` OpenClaw 动态工具。

`codexPlugins` 仅影响选择原生 Codex 挂载的会话。它对 PI 运行、普通 OpenAI 提供商运行、ACP 会话绑定或其他挂载没有影响。

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

当 OpenClaw 建立 Codex 挂载会话或替换过时的 Codex 线程绑定时，会计算线程应用配置。它不会在每次轮次时重新计算。更改 `codexPlugins` 后，请使用 `/new`、`/reset` 或重启网关，以便未来的 Codex 挂载会话使用更新后的应用集启动。

有关迁移资格、应用清单、破坏性操作策略、引询以及原生插件诊断，请参阅 [Native Codex plugins](/zh/plugins/codex-native-plugins)。

## Computer Use

Computer Use 在其单独的设置指南中进行了介绍：
[Codex Computer Use](/zh/plugins/codex-computer-use)。

简而言之：OpenClaw 不提供桌面控制应用，也不自行执行桌面操作。它准备 Codex 应用服务器，验证 `computer-use` MCP 服务器是否可用，然后让 Codex 在 Codex 模式轮次期间拥有原生 MCP 工具调用。

## 运行时边界

Codex 挂载仅更改底层嵌入式代理执行器。

- 支持 OpenClaw 动态工具。Codex 请求 OpenClaw 执行这些工具，因此 OpenClaw 仍保留在执行路径中。
- Codex 原生 shell、patch、MCP 和原生应用工具由 Codex 拥有。
  OpenClaw 可以通过支持的中继观察或阻止选定的原生事件，但它不会重写原生工具参数。
- Codex 拥有原生压缩。OpenClaw 为渠道历史记录、搜索、OpenClaw`/new`、`/reset` 以及未来的模型或切换保留记录镜像。
- 媒体生成、媒体理解、TTS、批准和消息工具输出继续通过匹配的 OpenClaw 提供商/模型设置进行。
- `tool_result_persist`OpenClaw 适用于 OpenClaw 拥有的记录工具结果，而不适用于 Codex 原生工具结果记录。

有关 hook 层、受支持的 V1 表面、原生权限处理、队列引导、Codex 反馈上传机制和压缩详细信息，请参阅 [Codex harness runtime](/zh/plugins/codex-harness-runtime)。

## 故障排除

**Codex 未作为正常的 `/model` 提供商出现：** 对于新配置，这是预期的。选择一个 `openai/gpt-*` 模型，启用 `plugins.entries.codex.enabled`，并检查 `plugins.allow` 是否排除了 `codex`。

**OpenClaw 使用 PI 而不是 Codex：** 确保模型引用是官方 OpenAI 提供商上的 OpenClaw`openai/gpt-*`OpenAI，并且已安装并启用 Codex 插件。如果在测试时需要严格证明，请设置提供商或模型 `agentRuntime.id: "codex"`。强制 Codex 运行时会失败，而不是回退到 PI。

**遗留的 `openai-codex/*` 配置仍然存在：** 运行 `openclaw doctor --fix`。Doctor 会将遗留的模型引用重写为 `openai/*`，删除陈旧的会话和全智能体运行时固定，并保留现有的身份验证配置文件覆盖。

**应用服务器被拒绝：** 使用 Codex 应用服务器 `0.125.0` 或更新版本。同版本的预发布版本或带构建后缀的版本（如 `0.125.0-alpha.2` 或 `0.125.0+custom`OpenClaw）会被拒绝，因为 OpenClaw 会测试稳定的 `0.125.0` 协议下限。

**`/codex status` 无法连接：** 请检查捆绑的 `codex` 插件是否已启用，当配置了允许列表时 `plugins.allow` 是否包含它，以及任何自定义的 `appServer.command`、`url`、`authToken` 或请求头是否有效。

**模型发现速度慢：** 降低 `plugins.entries.codex.config.discovery.timeoutMs` 或禁用发现。请参阅 [Codex harness 参考](/zh/plugins/codex-harness-reference#model-discovery)。

**WebSocket 传输立即失败：** 检查 `appServer.url`、`authToken`、请求头，以及远程应用服务器是否使用相同的 Codex 应用服务器协议版本。

**非 Codex 模型使用 PI：** 这是预期的，除非提供商或模型运行时策略将其路由到另一个 harness。普通的非 OpenAI 提供商引用在 `auto` 模式下将保持在它们正常的提供商路径上。

**Computer Use 已安装但工具未运行：** 从新的会话检查 `/codex computer-use status`。如果工具报告 `Native hook relay unavailable`，请使用 `/new` 或 `/reset`；如果问题持续存在，请重启网关以清除过时的本机 hook 注册。请参阅 [Codex Computer Use](/zh/plugins/codex-computer-use#troubleshooting)。

## 相关

- [Codex harness 参考](/zh/plugins/codex-harness-reference)
- [Codex harness 运行时](/zh/plugins/codex-harness-runtime)
- [本机 Codex 插件](/zh/plugins/codex-native-plugins)
- [Codex Computer Use](/zh/plugins/codex-computer-use)
- [Agent 运行时](/zh/concepts/agent-runtimes)
- [模型提供商](/zh/concepts/model-providers)
- [OpenAI 提供商](/zh/providers/openai)
- [Agent harness 插件](/zh/plugins/sdk-agent-harness)
- [插件 hooks](/zh/plugins/hooks)
- [诊断导出](/zh/gateway/diagnostics)
- [状态](/zh/cli/status)
- [测试](/zh/help/testing-live#live-codex-app-server-harness-smoke)
