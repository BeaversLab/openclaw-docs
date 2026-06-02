---
summary: "OpenClaw通过捆绑的 Codex app-server harness 运行 OpenClaw 嵌入式代理回合"
title: "Codex harness"
read_when:
  - You want to use the bundled Codex app-server harness
  - You need Codex harness config examples
  - You want Codex-only deployments to fail instead of falling back to OpenClaw
---

捆绑的 `codex`OpenClawOpenAIOpenClaw 插件允许 OpenClaw 通过 Codex 应用服务器运行嵌入式 OpenAI 代理轮次，而不是使用内置的 OpenClaw harness。

当您希望 Codex 拥有底层代理会话时，请使用 Codex harness：原生线程恢复、原生工具延续、原生压缩和应用服务器执行。OpenClaw 仍然拥有聊天频道、会话文件、模型选择、OpenClaw 动态工具、审批、媒体传递和可见的转录镜像。

正常设置使用规范 OpenAI 模型引用，例如 `openai/gpt-5.5`。
请勿配置旧版 Codex GPT 引用。将 OpenAI 代理身份验证顺序
放在 `auth.order.openai` 下；较旧的旧版 Codex 身份验证配置文件 ID 和
旧版 Codex 身份验证顺序条目是由 `openclaw doctor --fix` 修复的旧版状态。

当未激活 OpenClaw 沙箱时，OpenClaw 会启动 Codex 应用服务器线程，
默认启用 Codex 原生代码模式，同时默认关闭仅代码模式。
这使得 Codex 原生工作区和代码功能可用，同时
OpenClaw 动态工具继续通过应用服务器 `item/tool/call` 桥接运行。
激活的 OpenClaw 沙箱和受限工具策略会完全禁用原生代码模式，
除非您选择加入实验性沙箱 exec-server 路径。

此 Codex 原生功能与
[OpenClaw 代码模式](/zh/reference/code-mode) 分开，后者是一个可选加入的 QuickJS-WASI
运行时，用于具有不同 `exec` 输入形状的通用 OpenClaw 运行。

有关更广泛的模型/提供商/运行时划分，请从
[代理运行时](/zh/concepts/agent-runtimes) 开始。简而言之：
`openai/gpt-5.5` 是模型引用，`codex` 是运行时，而 Telegram、
Discord、Slack 或其他渠道仍然是通信表面。

## 要求

- 具有捆绑的 `codex` 插件可用的 OpenClaw。
- 如果您的配置使用 `plugins.allow`，请包含 `codex`。
- Codex 应用服务器 `0.125.0` 或更新版本。捆绑的插件默认管理兼容的
  Codex 应用服务器二进制文件，因此 `PATH` 上的本地 `codex` 命令
  不会影响正常的 harness 启动。
- 可通过 `openclaw models auth login --provider openai` 获得的 Codex 身份验证、
  代理 Codex 主目录中的应用服务器帐户，或显式 Codex API 密钥
  身份验证配置文件。

有关身份验证优先级、环境隔离、自定义应用服务器命令、模型发现以及所有配置字段，请参阅 [Codex harness 参考](/zh/plugins/codex-harness-reference)。

## 快速入门

大多数想在 OpenClaw 中使用 Codex 的用户都选择这条路径：使用 ChatGPT/Codex 订阅登录，启用捆绑的 `codex` 插件，并使用规范的 `openai/gpt-*` 模型引用。

使用 Codex OAuth 登录：

```bash
openclaw models auth login --provider openai
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

如果您的配置使用 `plugins.allow`，请也在其中添加 `codex`：

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

更改插件配置后重启网关。如果现有聊天已经拥有会话，请在测试运行时更改之前使用 `/new` 或 `/reset`，以便下一次轮询从当前配置解析 harness。

## 配置

快速入门配置是 Codex harness 的最小可用配置。在 OpenClaw 配置中设置 Codex harness 选项，并仅使用 CLI 进行 Codex 身份验证：

| 需要                            | 设置                                                                        | 位置                                 |
| ------------------------------- | --------------------------------------------------------------------------- | ------------------------------------ |
| 启用 harness                    | `plugins.entries.codex.enabled: true`                                       | OpenClaw 配置                        |
| 保留一个已列入白名单的插件安装  | 在 `plugins.allow` 中包含 `codex`                                           | OpenClaw 配置                        |
| 通过 Codex 路由 OpenAI 代理轮次 | `agents.defaults.model` 或 `agents.list[].model` 作为 `openai/gpt-*`        | OpenClaw 代理配置                    |
| 使用 ChatGPT/Codex OAuth 登录   | `openclaw models auth login --provider openai`                              | CLI 身份验证配置文件                 |
| 为 Codex 运行添加 API 密钥备份  | 在 `auth.order.openai` 中订阅身份验证之后列出的 `openai:*` API 密钥配置文件 | CLI 身份验证配置文件 + OpenClaw 配置 |
| 当 Codex 不可用时失败关闭       | 提供者或模型 `agentRuntime.id: "codex"`                                     | OpenClaw 模型/提供商配置             |
| 使用直接 OpenAI API 流量        | 使用标准 OpenAI 身份验证的提供者或模型 `agentRuntime.id: "openclaw"`        | OpenClaw 模型/提供商配置             |
| 调整应用服务器行为              | `plugins.entries.codex.config.appServer.*`                                  | Codex 插件配置                       |
| 启用原生 Codex 插件应用         | `plugins.entries.codex.config.codexPlugins.*`                               | Codex 插件配置                       |
| 启用 Codex 计算机使用           | `plugins.entries.codex.config.computerUse.*`                                | Codex 插件配置                       |

对 Codex 支持的 OpenAI 代理轮询使用 `openai/gpt-*` 模型引用。对于“订阅优先/API 密钥备份”的顺序，首选 `auth.order.openai`。现有的旧版 Codex 身份验证配置文件 ID 和旧版 Codex 身份验证顺序仅限医生使用的旧版状态；请勿编写新的旧版 Codex GPT 引用。

请勿在由 Codex 支持的代理上设置 `compaction.model` 或 `compaction.provider`OpenClaw。
Codex 通过其原生应用服务器线程状态进行压缩，因此 OpenClaw 在运行时会忽略
这些本地摘要器覆盖设置，并且当代理使用 Codex 时，`openclaw doctor --fix` 会将
其移除。

Lossless 仍然支持作为上下文引擎，用于 Codex 轮次周围的组装、摄取
和维护。通过 `plugins.slots.contextEngine: "lossless-claw"` 和
`plugins.entries.lossless-claw.config.summaryModel` 进行配置，而不要通过
`agents.defaults.compaction.provider`。当 Codex 为活动运行时，`openclaw doctor --fix` 会将旧的
`compaction.provider: "lossless-claw"` 形状迁移到 Lossless 上下文引擎插槽，
但原生 Codex 仍然拥有压缩权。

原生 Codex 应用服务器工具支持需要预先提示组装的上下文引擎。
包括 CLI`codex-cli` 在内的通用 CLI 后端不提供
该主机功能。

对于由 Codex 支持的代理，`/compact`OpenClawOpenClawOpenAI 会在绑定线程上启动原生 Codex 应用服务器压缩。
OpenClaw 不会等待完成，也不会强加 OpenClaw
超时、重启共享应用服务器或回退到上下文引擎或
公共 OpenAI 摘要器。如果原生 Codex 线程绑定缺失或
失效，该命令将失败关闭，以便操作员看到真正的运行时边界，
而不是静默切换压缩后端。

```json5
{
  auth: {
    order: {
      openai: ["openai:user@example.com", "openai:api-key-backup"],
    },
  },
}
```

在该形式下，两个配置文件仍然通过 Codex 运行 `openai/gpt-*`APIOpenClawOpenAI 代理
轮次。API 密钥仅作为一种身份验证后备，而非切换到 OpenClaw 或
纯 OpenAI 响应的请求。

本页的其余部分涵盖了用户必须选择的常见变体：
部署形式、故障关闭路由、守护者审批策略、原生 Codex
插件和计算机使用。有关完整的选项列表、默认值、枚举、发现、
环境隔离、超时和应用服务器传输字段，请参阅
[Codex 工具参考](/zh/plugins/codex-harness-reference)。

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

`/codex status` 报告应用服务器连接性、帐户、速率限制、MCP 服务器和技能。`/codex models` 列出了该 harness 和帐户的实时 Codex 应用服务器目录。如果 `/status` 出乎意料，请参阅 [故障排除](#troubleshooting)。

## 路由和模型选择

将提供商引用和运行时策略分离开来：

- 对于通过 Codex 进行的 OpenAI 代理轮次，请使用 `openai/gpt-*`。
- 不要在配置中使用旧的 Codex GPT 引用。运行 `openclaw doctor --fix` 以修复旧的引用和过时的会话路由固定。
- 对于常规 OpenAI 自动模式，`agentRuntime.id: "codex"` 是可选的，但如果 Codex 不可用时部署应故障关闭，则它非常有用。
- `agentRuntime.id: "openclaw"` 在有意为之的情况下，将提供商或模型选择加入 OpenClaw 嵌入式运行时。
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

| 用例                                       | 配置                                                              | 验证                                   | 备注                           |
| ------------------------------------------ | ----------------------------------------------------------------- | -------------------------------------- | ------------------------------ |
| 带有本地 Codex 运行时的 ChatGPT/Codex 订阅 | `openai/gpt-*` 加上已启用的 `codex` 插件                          | `/status` 显示 `Runtime: OpenAI Codex` | 推荐路径                       |
| 如果 Codex 不可用，则故障关闭              | 提供商或模型 `agentRuntime.id: "codex"`                           | 轮次失败，而不是嵌入式回退             | 用于仅 Codex 部署              |
| 通过 OpenAI 直接传输 API OpenClaw 密钥流量 | 提供商或模型 `agentRuntime.id: "openclaw"` 和常规 OpenAI 身份验证 | `/status` 显示 OpenClaw 运行时         | 仅在 OpenClaw 为有意使用时使用 |
| 旧版配置                                   | 旧的 Codex GPT 引用                                               | `openclaw doctor --fix` 重写它         | 不要以这种方式编写新配置       |
| ACP/acpx Codex 适配器                      | ACP `sessions_spawn({ runtime: "acp" })`                          | ACP 任务/会话状态                      | 与本地 Codex harness 分离      |

`agents.defaults.imageModel` 遵循相同的前缀拆分。对正常的 OpenAI 路由使用 `openai/gpt-*`，并仅当图像理解应在有界的 Codex 应用服务器轮次中运行时才使用 `codex/gpt-*`。不要使用旧的 Codex GPT 引用；doctor 会将该旧前缀重写为 `openai/gpt-*`。

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

对于 OpenAI 代理轮次，当捆绑的插件可用时，`openai/gpt-*` 已经解析为 Codex。当您需要书写的故障关闭规则时，添加显式的运行时策略：

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

默认情况下，插件会在本地通过 stdio 传输启动 OpenClaw 托管的 Codex 二进制文件。仅当您有意要运行不同的可执行文件时才设置 `appServer.command`。仅当应用服务器已在其他位置运行时才使用 WebSocket 传输：

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

本地 stdio 应用服务器会话默认采用受信任的本地操作员姿态：`approvalPolicy: "never"`、`approvalsReviewer: "user"` 和 `sandbox: "danger-full-access"`。如果本地 Codex 要求不允许该隐式 YOLO 姿态，OpenClaw 将改为选择允许的守护者权限。当 OpenClaw 沙箱为该会话激活时，OpenClaw 将在该轮次中禁用 Codex 原生代码模式、用户 MCP 服务器和应用支持的插件执行，而不是依赖 Codex 主机端沙箱隔离。当正常的 exec/process 工具可用时，Shell 访问通过 OpenClaw 沙箱支持的动态工具（如 `sandbox_exec` 和 `sandbox_process`）公开。

当您希望在沙箱逃逸或额外权限之前进行 Codex 原生自动审查时，请使用标准化的 OpenClaw exec 模式：

```json5
{
  tools: {
    exec: {
      mode: "auto",
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

对于 Codex 应用服务器会话，OpenClaw 将 OpenClaw`tools.exec.mode: "auto"` 映射到 Codex Guardian 审核的批准，当本地要求允许这些值时，通常为 `approvalPolicy: "on-request"`、`approvalsReviewer: "auto_review"` 和 `sandbox: "workspace-write"`。在 `tools.exec.mode: "auto"`OpenClaw 中，OpenClaw 不会保留旧版不安全的 Codex `approvalPolicy: "never"` 或 `sandbox: "danger-full-access"` 覆盖；请使用 `tools.exec.mode: "full"` 来实现有意的不批准 Codex 策略。旧版 `plugins.entries.codex.config.appServer.mode: "guardian"` 预设仍然有效，但 `tools.exec.mode: "auto"`OpenClaw 是标准化的 OpenClaw 表面。

有关每个应用服务器字段、身份验证顺序、环境隔离、发现和超时行为，请参阅 [Codex harness 参考](/zh/plugins/codex-harness-reference)。

## 命令和诊断

捆绑的插件将 `/codex`OpenClaw 注册为斜杠命令，适用于任何支持 OpenClaw 文本命令的渠道。

常用形式：

- `/codex status` 检查应用服务器连接性、模型、账户、速率限制、MCP 服务器和技能。
- `/codex models` 列出实时的 Codex 应用服务器模型。
- `/codex threads [filter]` 列出最近的 Codex 应用服务器线程。
- `/codex resume <thread-id>`OpenClaw 将当前的 OpenClaw 会话附加到现有的 Codex 线程。
- `/codex compact` 请求 Codex 应用服务器压缩附加的线程。
- `/codex review` 为附加的线程启动 Codex 原生审核。
- `/codex diagnostics [note]` 在为附加的线程发送 Codex 反馈之前进行询问。
- `/codex account` 显示账户和速率限制状态。
- `/codex mcp` 列出 Codex 应用服务器 MCP 服务器状态。
- `/codex skills` 列出 Codex 应用服务器技能。

对于大多数支持报告，请在发生错误的对话中使用 `/diagnostics [note]`Gateway(网关)。它会生成一份 Gateway 诊断报告，并且对于 Codex harness 会话，会请求批准发送相关的 Codex 反馈包。有关隐私模型和群聊行为，请参阅[诊断导出](/zh/gateway/diagnostics)。

仅当您专门想要当前附加线程的 Codex 反馈上传而不需要完整的 Gateway 诊断包时，才使用 `/codex diagnostics [note]`Gateway(网关)。

### 本地检查 Codex 线程

检查错误的 Codex 运行，最快的方法通常是直接打开原生 Codex
线程：

```bash
codex resume <thread-id>
```

从完成的 `/diagnostics` 回复、`/codex binding` 或 `/codex threads [filter]` 中获取线程 ID。

有关上传机制和运行时级诊断边界，请参阅[Codex harness 运行时](/zh/plugins/codex-harness-runtime#codex-feedback-upload)。

按以下顺序选择身份验证：

1. 代理的有序 OpenAI 身份验证配置文件，最好位于 OpenAI`auth.order.openai` 下。运行 `openclaw doctor --fix` 以迁移较旧的旧版 Codex 身份验证配置文件 ID 和旧版 Codex 身份验证顺序。
2. 该代理的 Codex 主页中应用服务器的现有帐户。
3. 仅对于本地 stdio 应用程序服务器启动，当不存在应用程序服务器帐户且仍需要 OpenAI 身份验证时，先 `CODEX_API_KEY`，然后 `OPENAI_API_KEY`OpenAI。

当 OpenClaw 看到 ChatGPT 订阅样式的 Codex 身份验证配置文件时，它会从生成的 Codex 子进程中删除 OpenClaw`CODEX_API_KEY` 和 `OPENAI_API_KEY`Gateway(网关)APIOpenAIAPIAPIGateway(网关)API。这使得 Gateway 级的 API 密钥可用于嵌入或直接 OpenAI 模型，而不会导致本机 Codex 应用服务器轮次意外通过 API 计费。显式 Codex API 密钥配置文件和本地 stdio 环境密钥回退使用应用程序服务器登录，而不是继承的子进程环境。WebSocket 应用服务器连接不会接收 Gateway 环境的 API 密钥回退；请使用显式身份验证配置文件或远程应用程序服务器自己的帐户。

如果订阅配置文件达到 Codex 使用限制，OpenClaw 会在 Codex 报告时记录重置时间，并为同一 Codex 运行尝试下一个有序的身份验证配置文件。当重置时间过去后，订阅配置文件再次变为可用，而无需更改所选的 OpenClaw`openai/gpt-*` 模型或 Codex 运行时。

对于本地 stdio 应用服务器启动，OpenClaw 会将 OpenClaw`CODEX_HOME` 设置为每个代理专用的目录，以便 Codex 配置、身份验证/帐户文件、插件缓存/数据和本机线程状态在默认情况下不会读取或写入操作员的个人 `~/.codex`OpenClaw。OpenClaw 保留正常的进程 `HOME`；Codex 运行的子进程仍然可以找到用户主目录配置和令牌，并且 Codex 可以发现共享的 `$HOME/.agents/skills` 和 `$HOME/.agents/plugins/marketplace.json` 条目。

如果部署需要额外的环境隔离，请将这些变量添加到 `appServer.clearEnv` 中：

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

`appServer.clearEnv`OpenClaw 仅影响生成的 Codex 应用服务器子进程。OpenClaw 在本地启动规范化过程中从此列表中删除 `CODEX_HOME` 和 `HOME`：`CODEX_HOME` 保持每个代理专用，而 `HOME` 保持继承状态，以便子进程可以使用正常的用户主目录状态。

Codex 动态工具默认为 `searchable`OpenClaw 加载。OpenClaw 不会公开复制 Codex 原生工作区操作的动态工具：`read`、`write`、
`edit`、`apply_patch`、`exec`、`process` 和 `update_plan`OpenClaw。大多数剩余的
OpenClaw 集成工具（如 messaging、media、cron、browser、nodes、
gateway、`heartbeat_respond` 和 `web_search`）都可以在 `openclaw` 命名空间下通过 Codex 工具搜索获得，从而使初始模型上下文
更小。
`sessions_yield` 和仅消息工具源回复保持直接，因为
这些是轮次控制合约。`sessions_spawn` 保持可搜索，因此 Codex 的
原生 `spawn_agent`OpenClaw 仍然是主要的 Codex 子代理表面，而显式的
OpenClaw 或 ACP 委派仍然可以通过 `openclaw` 动态
工具命名空间获得。Heartbeat 协作指令指示 Codex 在心跳轮次结束之前搜索
`heartbeat_respond`（如果该工具尚未加载）。

仅在连接到无法搜索延迟动态工具的自定义 Codex
应用服务器或调试完整
工具负载时，才设置 `codexDynamicToolsLoading: "direct"`。

支持的顶级 Codex 插件字段：

| 字段                       | 默认值         | 含义                                                                          |
| -------------------------- | -------------- | ----------------------------------------------------------------------------- |
| `codexDynamicToolsLoading` | `"searchable"` | 使用 `"direct"`OpenClaw 将 OpenClaw 动态工具直接放入初始 Codex 工具上下文中。 |
| `codexDynamicToolsExclude` | `[]`           | 要从 Codex 应用服务器轮次中省略的其他 OpenClaw 动态工具名称。                 |
| `codexPlugins`             | disabled       | 原生 Codex 插件/应用程序对已迁移的源安装精选插件的支持。                      |

支持的 `appServer` 字段：

| 字段                                          | 默认值                                    | 含义                                                                                                                                                                                                                                               |
| --------------------------------------------- | ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `transport`                                   | `"stdio"`                                 | `"stdio"` 生成 Codex；`"websocket"` 连接到 `url`。                                                                                                                                                                                                 |
| `command`                                     | 托管的 Codex 二进制文件                   | 用于 stdio 传输的可执行文件。保持未设置以使用托管二进制文件；仅在需要显式覆盖时设置。                                                                                                                                                              |
| `args`                                        | `["app-server", "--listen", "stdio://"]`  | 用于 stdio 传输的参数。                                                                                                                                                                                                                            |
| `url`                                         | 未设置                                    | WebSocket 应用服务器 URL。                                                                                                                                                                                                                         |
| `authToken`                                   | 未设置                                    | WebSocket 传输的 Bearer 令牌。                                                                                                                                                                                                                     |
| `headers`                                     | `{}`                                      | 额外的 WebSocket 标头。                                                                                                                                                                                                                            |
| `clearEnv`                                    | `[]`                                      | 在 OpenClaw 构建其继承的环境变量后，从生成的 stdio app-server 进程中移除额外的环境变量名称。对于本地启动，OpenClaw 会保留每个代理的 `CODEX_HOME` 和继承的 `HOME`。                                                                                 |
| `codeModeOnly`                                | `false`                                   | 选择使用 Codex 的仅代码模式工具表面。OpenClaw 动态工具仍会在 Codex 中注册，以便嵌套的 `tools.*` 调用通过 app-server `item/tool/call` 桥接返回。                                                                                                    |
| `requestTimeoutMs`                            | `60000`                                   | 应用服务器控制平面调用的超时。                                                                                                                                                                                                                     |
| `turnCompletionIdleTimeoutMs`                 | `60000`                                   | 在 Codex 接受轮次或在轮次作用域的 app-server 请求之后的静默窗口，此时 OpenClaw 正在等待 `turn/completed`。                                                                                                                                         |
| `postToolRawAssistantCompletionIdleTimeoutMs` | `300000`                                  | 在工具移交、原生工具完成或工具后原始助手进度之后使用的完成空闲和进度守卫，此时 OpenClaw 正在等待 `turn/completed`。将此用于受信任或繁重的工作负载，在这些工作负载中，工具后合成可以合法地保持静默的时间超过最终助手释放预算。                      |
| `mode`                                        | `"yolo"`，除非本地 Codex 要求不允许 YOLO  | 用于 YOLO 或监护人审查执行的预设。省略 `danger-full-access`、`never` 审批或 `user` 审查者的本地 stdio 要求会使隐式默认监护人生效。                                                                                                                 |
| `approvalPolicy`                              | `"never"` 或允许的监护人审批策略          | 发送到线程启动/恢复/轮次的本地 Codex 审批策略。如果允许，监护人默认首选 `"on-request"`。                                                                                                                                                           |
| `sandbox`                                     | `"danger-full-access"` 或允许的监护人沙箱 | 发送到线程启动/恢复的原生 Codex 沙盒模式。Guardian 默认值在允许时优先选择 `"workspace-write"`，否则选择 `"read-only"`。当激活 OpenClaw 沙盒时，`danger-full-access` 轮次使用派生自 OpenClaw 沙盒出口设置的网络访问权限的 Codex `workspace-write`。 |
| `approvalsReviewer`                           | `"user"` 或允许的 guardian 审阅者         | 使用 `"auto_review"` 让 Codex 在允许时审阅原生审批提示，否则使用 `guardian_subagent` 或 `user`。`guardian_subagent` 仍为遗留别名。                                                                                                                 |
| `serviceTier`                                 | 未设置                                    | 可选的 Codex 应用服务器服务层。`"priority"` 启用快速模式路由，`"flex"` 请求弹性处理，`null` 清除覆盖，并且遗留的 `"fast"` 被接受为 `"priority"`。                                                                                                  |
| `experimental.sandboxExecServer`              | `false`                                   | 预览可选功能，向 Codex 应用服务器 0.132.0 或更新版本注册由 OpenClaw 沙盒支持的 Codex 环境，以便本机 Codex 执行可以在活动 OpenClaw 沙盒内运行。                                                                                                     |

OpenClaw 拥有的动态工具调用独立于
`appServer.requestTimeoutMs` 进行限制：Codex `item/tool/call` 请求默认使用 90 秒的
OpenClaw 看门狗。正数的每次调用 `timeoutMs` 参数会延长
或缩短该特定工具预算。`image_generate` 工具在工具调用
未提供自己的超时时间时使用 `agents.defaults.imageGenerationModel.timeoutMs`，否则使用 120 秒的图像生成默认值。
媒体理解 `image` 工具使用
`tools.media.image.timeoutSeconds` 或其 60 秒的媒体默认值。动态工具
预算上限为 600000 毫秒。超时时，OpenClaw 在支持的情况下中止工具信号，
并向 Codex 返回失败的动态工具响应，以便轮次
可以继续，而不是将会话留在 `processing` 中。

在 Codex 接受一个轮次，并且 OpenClaw 响应了一个轮次范围的
应用服务器请求之后，工具套件期望 Codex 取得当前轮次的进展，并
最终使用 `turn/completed` 完成本地轮次。如果应用服务器
静默 `appServer.turnCompletionIdleTimeoutMs`，OpenClaw 会尽力
中断 Codex 轮次，记录诊断超时，并释放
OpenClaw 会话通道，以便后续聊天消息不会在过时的
本地轮次后面排队。同一轮次的大多数非终止通知会解除该短时
看门狗，因为 Codex 已证明该轮次仍然存活。工具交接使用
更长的工具后空闲预算：在 OpenClaw 返回一个 `item/tool/call`
响应后，在本地工具项目（如 `commandExecution`）完成后，在原始
`custom_tool_call_output` 完成后，以及在工具后原始助手
进展后。如果在配置时设置了该保护，则使用 `appServer.postToolRawAssistantCompletionIdleTimeoutMs`，
否则默认为五分钟。同样的工具后预算也会延长静默合成窗口内的
进度看门狗，直到 Codex 发出下一个当前轮次事件。全局应用服务器通知（例如
速率限制更新）不会重置轮次空闲进度。推理完成、
注释 `agentMessage` 完成以及工具前原始推理或助手
进展之后可能会跟有一个自动最终回复，因此它们使用
进度后回复保护，而不是立即释放会话通道。
只有最终/非注释的已完成 `agentMessage` 项目和工具前原始
助手完成才会触发助手输出释放：如果 Codex 随后在没有
`turn/completed` 的情况下静默，OpenClaw 会尽力中断本地轮次并
释放会话通道。可重放的安全标准输入输出应用服务器故障（包括
没有助手、工具、活动项目或
副作用证据的轮次完成空闲超时）将在新的应用服务器尝试上重试一次。
不安全的超时仍会停止卡住的应用服务器客户端并释放 OpenClaw
会话通道。它们还会清除过时的本地线程绑定，并显示一个
可恢复的超时消息供用户或维护者判断，而不是自动
重放。超时诊断包括最后的应用服务器
通知方法，对于原始助手响应项目，还包括项目类型、角色、
ID 和有界的助手文本预览。

环境变量覆盖仍可用于本地测试：

- `OPENCLAW_CODEX_APP_SERVER_BIN`
- `OPENCLAW_CODEX_APP_SERVER_ARGS`
- `OPENCLAW_CODEX_APP_SERVER_MODE=yolo|guardian`
- `OPENCLAW_CODEX_APP_SERVER_APPROVAL_POLICY`
- `OPENCLAW_CODEX_APP_SERVER_SANDBOX`

`OPENCLAW_CODEX_APP_SERVER_BIN` 在 `appServer.command` 未设置时绕过受管二进制文件。

`OPENCLAW_CODEX_APP_SERVER_GUARDIAN=1` 已被移除。请改用 `plugins.entries.codex.config.appServer.mode: "guardian"`，或使用 `OPENCLAW_CODEX_APP_SERVER_MODE=guardian` 进行一次性本地测试。对于可重复部署，首选配置，因为它将插件行为与 Codex harness 设置的其余部分保留在同一已审查的文件中。

## 原生 Codex 插件

原生 Codex 插件支持在与 OpenClaw harness 轮次相同的 Codex 线程中使用 Codex 应用服务器自己的应用和插件功能。OpenClaw 不会将 Codex 插件转换为合成的 `codex_plugin_*` OpenClaw 动态工具。

`codexPlugins` 仅影响选择原生 Codex harness 的会话。它对内置 harness 运行、正常的 OpenAI 提供商运行、ACP 会话绑定或其他 harness 没有影响。

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

当 OpenClaw 建立 Codex harness 会话或替换过时的 Codex 线程绑定时，会计算线程应用配置。它不会在每一轮中重新计算。更改 `codexPlugins` 后，请使用 `/new`、`/reset` 或重启网关，以便未来的 Codex harness 会话使用更新的应用集启动。

有关迁移资格、应用清单、破坏性操作策略、请求和原生插件诊断，请参阅 [Native Codex plugins](/zh/plugins/codex-native-plugins)。

## Computer Use

计算机使用在其单独的设置指南中进行了介绍：
[Codex Computer Use](/zh/plugins/codex-computer-use)。

简而言之：OpenClaw 不提供桌面控制应用或自行执行桌面操作。它准备 Codex 应用服务器，验证 `computer-use` MCP 服务器是否可用，然后让 Codex 在 Codex 模式轮次期间拥有原生 MCP 工具调用。

## 运行时边界

Codex harness 仅更改底层嵌入式代理执行器。

- 支持 OpenClaw 动态工具。Codex 请求 OpenClaw 执行这些工具，因此 OpenClaw 仍保留在执行路径中。
- Codex 原生 shell、patch、MCP 和原生应用工具归 Codex 所有。
  OpenClaw 可以通过支持的中继观察或阻止特定的原生事件，但它不会重写原生工具参数。
- Codex 拥有原生压缩。OpenClaw 为渠道历史、搜索、OpenClaw`/new`、`/reset`OpenClaw 以及未来的模型或线束切换保留转录镜像，但它不会用 OpenClaw 或上下文引擎摘要器替换 Codex 压缩。
- 媒体生成、媒体理解、TTS、审批和消息传递工具
  输出继续通过匹配的 OpenClaw 提供商/模型设置进行。
- `tool_result_persist`OpenClaw 适用于 OpenClaw 拥有的转录工具结果，而不适用于 Codex 原生工具结果记录。

有关钩子层、支持的 V1 接口、原生权限处理、队列引导、Codex 反馈上传机制和压缩详细信息，请参阅 [Codex 线束运行时](/zh/plugins/codex-harness-runtime)。

## 故障排除

**Codex 不会显示为普通的 `/model` 提供商：** 对于新配置，这是预期的。选择 `openai/gpt-*` 模型，启用 `plugins.entries.codex.enabled`，并检查 `plugins.allow` 是否排除了 `codex`。

**OpenClaw 使用内置线束而不是 Codex：** 确保模型引用位于官方 OpenAI 提供商上的 OpenClaw`openai/gpt-*`OpenAI，并且已安装并启用 Codex 插件。如果在测试时需要严格证明，请设置提供商或模型 `agentRuntime.id: "codex"`OpenClaw。强制的 Codex 运行时将失败，而不是回退到 OpenClaw。

**OpenAI Codex 运行时回退到 API 密钥路径：** 收集一个经过编辑的
网关摘录，其中显示模型、运行时、选定的提供商和失败信息。
请受影响的协作者在其 OpenClaw 主机上运行此只读命令：

```bash
(
  pattern='openai/gpt-5\.[45]|openai[-]codex|agentRuntime(\.id)?|harnessRuntime|Runtime: OpenAI Codex|legacy OpenAI Codex prefix|resolveSelectedOpenAIRuntimeProvider|candidateProvider[": ]+openai|status[": ]+401|Incorrect API key|No API key|api-key path|API-key path|OAuth'

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

有用的摘录通常包括 `openai/gpt-5.5` 或 `openai/gpt-5.4`、`Runtime: OpenAI Codex`、`agentRuntime.id` 或 `harnessRuntime`、`candidateProvider: "openai"` 以及 `401`、`Incorrect API key` 或 `No API key`OpenAIOAuthOpenAIAPI 结果。更正后的运行应显示 OpenAI OAuth 路径，而不是普通的 OpenAI API 密钥失败。

**旧版 Codex 模型引用配置仍然保留：** 运行 `openclaw doctor --fix`。Doctor 会将旧版模型引用重写为 `openai/*`，删除过时的会话和全智能体运行时固定，并保留现有的身份验证配置文件覆盖。

**app-server 被拒绝：** 请使用 Codex app-server `0.125.0` 或更新版本。
相同版本的预发布版本或带构建后缀的版本（例如
`0.125.0-alpha.2` 或 `0.125.0+custom`）会被拒绝，因为 OpenClaw 会测试
稳定的 `0.125.0` 协议下限。

**`/codex status` 无法连接：** 检查捆绑的 `codex` 插件是否
已启用，当配置了允许列表时 `plugins.allow` 是否包含它，以及
任何自定义 `appServer.command`、`url`、`authToken` 或标头是否有效。

**模型发现缓慢：** 降低
`plugins.entries.codex.config.discovery.timeoutMs` 或禁用发现。请参阅
[Codex harness 参考](/zh/plugins/codex-harness-reference#model-discovery)。

**WebSocket 传输立即失败：** 检查 `appServer.url`、`authToken`、
标头，以及远程 app-server 是否使用相同的 Codex app-server
协议版本。

**Native shell 或 patch 工具被 `Native hook relay unavailable` 阻止：**
Codex 线程仍在尝试使用 OpenClaw 不再注册的 native hook 转发 ID。这是一个 native Codex hook 传输问题，而不是 ACP
后端、提供商、GitHub 或 shell 命令失败的问题。在受影响的聊天中，使用 `/new` 或 `/reset` 开启一个新的会话，然后重试一个无害的命令。如果
第一次成功但下一次 native 工具调用再次失败，请仅将 `/new` 视为临时
变通方法：在重启 Codex
app-server 或 OpenClaw Gateway(网关) 后，将提示词复制到新会话中，以便丢弃旧线程并重新创建 native hook
注册。

**非 Codex 模型使用内置 harness：** 这是预期的，除非
提供商或模型运行时策略将其路由到另一个 harness。普通的非 OpenAI
提供商引用在 `auto` 模式下保持在其正常的提供商路径上。

**已安装 Computer Use 但工具未运行：** 从新会话检查 `/codex computer-use status`。如果工具报告 `Native hook relay unavailable`，请使用上面的原生钩子中继恢复。请参阅 [Codex Computer Use](/zh/plugins/codex-computer-use#troubleshooting)。

## 相关

- [Codex harness 参考](/zh/plugins/codex-harness-reference)
- [Codex harness 运行时](/zh/plugins/codex-harness-runtime)
- [原生 Codex 插件](/zh/plugins/codex-native-plugins)
- [Codex Computer Use](/zh/plugins/codex-computer-use)
- [Agent 运行时](/zh/concepts/agent-runtimes)
- [模型提供商](/zh/concepts/model-providers)
- [OpenAI 提供商](/zh/providers/openai)
- [Agent harness 插件](/zh/plugins/sdk-agent-harness)
- [插件钩子](/zh/plugins/hooks)
- [诊断导出](/zh/gateway/diagnostics)
- [状态](/zh/cli/status)
- [测试](/zh/help/testing-live#live-codex-app-server-harness-smoke)
