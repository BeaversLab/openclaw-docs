---
summary: "Codex harness 的配置、身份验证、发现和应用服务器参考"
title: "Codex harness 参考"
read_when:
  - You need every Codex harness config field
  - You are changing app-server transport, auth, discovery, or timeout behavior
  - You are debugging Codex harness startup, model discovery, or environment isolation
---

本参考涵盖了随附 `codex` 插件的详细配置。有关设置和路由决策，请首先阅读 [Codex harness](/zh/plugins/codex-harness)。

## 插件配置界面

所有 Codex harness 设置均位于 `plugins.entries.codex.config` 之下。

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
          appServer: {
            mode: "guardian",
          },
        },
      },
    },
  },
}
```

支持的顶层字段：

| 字段                       | 默认值                | 含义                                                                                                               |
| -------------------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `discovery`                | enabled               | Codex 应用服务器 `model/list` 的模型发现设置。                                                                     |
| `appServer`                | 托管 stdio 应用服务器 | 传输、命令、身份验证、审批、沙盒和超时设置。                                                                       |
| `codexDynamicToolsLoading` | `"searchable"`        | 使用 `"direct"`OpenClaw 将 OpenClaw 动态工具直接置于初始 Codex 工具上下文中。                                      |
| `codexDynamicToolsExclude` | `[]`                  | 要从 Codex 应用服务器轮次中排除的其他 OpenClaw 动态工具名称。                                                      |
| `codexPlugins`             | disabled              | 对已迁移的源码安装精选插件的原生 Codex 插件/应用支持。请参阅 [原生 Codex 插件](/zh/plugins/codex-native-plugins)。 |
| `computerUse`              | disabled              | Codex Computer Use 设置。请参阅 [Codex Computer Use](/zh/plugins/codex-computer-use)。                             |

## 应用服务器传输

默认情况下，OpenClaw 会启动随附 插件附带的托管 Codex 二进制文件：

```bash
codex app-server --listen stdio://
```

这使应用服务器版本与随附的 `codex`CLI 插件绑定，而不是与本地安装的任何单独 Codex CLI 绑定。仅当您有意想要运行不同的可执行文件时，才设置 `appServer.command`。

对于已运行的应用服务器，请使用 WebSocket 传输：

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
            requestTimeoutMs: 60000,
          },
        },
      },
    },
  },
}
```

支持的 `appServer` 字段：

| 字段                          | 默认值                                    | 含义                                                                                                                                          |
| ----------------------------- | ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `transport`                   | `"stdio"`                                 | `"stdio"` 生成 Codex；`"websocket"` 连接到 `url`。                                                                                            |
| `command`                     | 托管的 Codex 二进制文件                   | 用于 stdio 传输的可执行文件。留空以使用托管的二进制文件。                                                                                     |
| `args`                        | `["app-server", "--listen", "stdio://"]`  | stdio 传输的参数。                                                                                                                            |
| `url`                         | 未设置                                    | WebSocket 应用服务器 URL。                                                                                                                    |
| `authToken`                   | 未设置                                    | WebSocket 传输的 Bearer token。                                                                                                               |
| `headers`                     | `{}`                                      | 额外的 WebSocket 头部。                                                                                                                       |
| `clearEnv`                    | `[]`                                      | 从 OpenClaw 构建其继承环境后，从生成的 stdio 应用服务器进程中移除的额外环境变量名称。                                                         |
| `requestTimeoutMs`            | `60000`                                   | 应用服务器控制平面调用的超时时间。                                                                                                            |
| `turnCompletionIdleTimeoutMs` | `60000`                                   | 在 OpenClaw 等待 OpenClaw`turn/completed` 期间，轮次范围的应用服务器请求之后的静默窗口。                                                      |
| `mode`                        | `"yolo"`，除非本地 Codex 要求不允许 YOLO  | YOLO 或守护者审核执行的预设。                                                                                                                 |
| `approvalPolicy`              | `"never"` 或允许的守护者审批策略          | 发送到线程启动、恢复和轮次的本地 Codex 审批策略。                                                                                             |
| `sandbox`                     | `"danger-full-access"` 或允许的守护者沙盒 | 发送到线程启动和恢复的本地 Codex 沙盒模式。                                                                                                   |
| `approvalsReviewer`           | `"user"` 或允许的守护者审核者             | 在允许的情况下，使用 `"auto_review"` 让 Codex 审查本地审批提示。                                                                              |
| `defaultWorkspaceDir`         | 当前进程目录                              | 当省略 `--cwd` 时，`/codex bind` 使用的工作区。                                                                                               |
| `serviceTier`                 | 未设置                                    | 可选的 Codex 应用服务器服务层级。`"priority"` 启用快速模式路由，`"flex"` 请求灵活处理，`null` 清除覆盖。旧的 `"fast"` 被接受为 `"priority"`。 |

该插件会阻止较旧或未版本化的应用服务器握手。Codex 应用服务器必须报告稳定版本 `0.125.0` 或更新版本。

## 审批和沙盒模式

本地 stdio 应用服务器会话默认采用 YOLO 模式：
`approvalPolicy: "never"`、`approvalsReviewer: "user"` 和
`sandbox: "danger-full-access"`OpenClaw。这种受信任的本地操作员姿态允许
无人值守的 OpenClaw 轮次和心跳取得进展，而无需原生审批
提示（因为周围没有人可以回答）。

如果 Codex 的本地系统需求文件禁止隐式 YOLO 批准、
审查者或沙箱值，OpenClaw 会将隐式默认值视为 guardian
（守护者），并选择允许的 guardian 权限。同一需求文件中
主机名匹配的 OpenClaw`[[remote_sandbox_config]]` 条目将
受到尊重，用于确定沙箱默认值。

设置 `appServer.mode: "guardian"` 以进行 Codex guardian（守护者）审查批准：

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

`guardian` 预设在这些值被允许时扩展为 `approvalPolicy: "on-request"`、
`approvalsReviewer: "auto_review"` 和 `sandbox: "workspace-write"`。单个策略字段会覆盖 `mode`。较旧的
`guardian_subagent` reviewer 值作为兼容性别名仍被接受，
但新配置应使用 `auto_review`。

## 认证和环境隔离

认证按以下顺序选择：

1. 为代理显式指定的 OpenClaw Codex 认证配置文件。
2. 该代理 Codex home 中应用服务器现有的帐户。
3. 仅对于本地 stdio 应用服务器启动，当不存在应用服务器帐户且仍需要 OpenAI 认证时，
   依次为 `CODEX_API_KEY` 和 `OPENAI_API_KEY`。

当 OpenClaw 检测到 ChatGPT 订阅式的 Codex 认证配置文件时，它会从生成的 Codex 子进程中移除 `CODEX_API_KEY` 和 `OPENAI_API_KEY`。这样做可以使 Gateway(网关) 级 API 密钥用于嵌入或直接 OpenAI 模型，而不会导致原生 Codex 应用服务器轮次意外通过 API 计费。

显式的 Codex API 密钥配置文件和本地 stdio 环境密钥回退使用应用服务器登录，而不是继承子进程环境。WebSocket 应用服务器连接不接收 Gateway(网关) 环境 API 密钥回退；请使用显式认证配置文件或远程应用服务器自己的账户。

Stdio 应用服务器启动默认继承 OpenClaw 的进程环境，但 OpenClaw 拥有 Codex 应用服务器账户桥接，并将 `CODEX_HOME` 和 `HOME` 都设置为该 OpenClaw 状态下的每代理目录。Codex 自身的技能加载器读取 `$CODEX_HOME/skills` 和 `$HOME/.agents/skills`，因此这两个值对于本地应用服务器启动是隔离的。这将 Codex 原生技能、插件、配置、账户和线程状态限定在 OpenClaw 代理范围内，而不会从操作员的个人 Codex CLI 主目录中泄漏进来。

OpenClaw 插件和 OpenClaw 技能快照仍通过 OpenClaw 自身的插件注册表和技能加载器流动。个人 Codex CLI 资产则不会。如果您有有用的 Codex CLI 技能或插件应成为 OpenClaw 代理的一部分，请明确列出它们：

```bash
openclaw migrate codex --dry-run
openclaw migrate apply codex --yes
```

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
`CODEX_HOME` 和 `HOME`OpenClaw 仍保留给 OpenClaw 在本地启动时进行按代理的 Codex
隔离。

## 动态工具

Codex 动态工具默认为 `searchable`OpenClaw 加载。OpenClaw 不会暴露
与 Codex 原生工作区操作重复的动态工具：

- `read`
- `write`
- `edit`
- `apply_patch`
- `exec`
- `process`
- `update_plan`

其余的 OpenClaw 集成工具，如消息传递、会话、媒体、定时任务、
浏览器、节点、网关、OpenClaw`heartbeat_respond` 和 `web_search`，均可通过
Codex 工具搜索在 `openclaw` 命名空间下使用。这使初始
模型上下文更小。`sessions_yield` 和仅消息工具的源回复
保持直接，因为那些是轮次控制合约。

仅当连接到无法搜索延迟动态工具的自定义 Codex
应用服务器或调试完整
工具负载时，才设置 `codexDynamicToolsLoading: "direct"`。

## 超时

OpenClaw 拥有的动态工具调用受到独立于
OpenClaw`appServer.requestTimeoutMs` 的限制。每个 Codex `item/tool/call` 请求按此顺序使用第一个
可用的超时设置：

- 正的每次调用 `timeoutMs` 参数。
- 对于 `image_generate`，使用 `agents.defaults.imageGenerationModel.timeoutMs`。
- 对于媒体理解的 `image` 工具，使用 `tools.media.image.timeoutSeconds`
  转换后的毫秒数，或默认的 60 秒媒体超时。
- 默认的 30 秒动态工具超时。

动态工具预算上限为 600000 毫秒。发生超时时，OpenClaw 在支持的情况下中止
工具信号，并向 Codex 返回失败的动态工具响应，
以便轮次可以继续，而不是将会话置于 OpenClaw`processing` 状态。

当 OpenClaw 响应 Codex 轮次作用域的应用服务器请求后，harness
还期望 Codex 以 `turn/completed` 完成本机轮次。如果在该响应后应用服务器静默 `appServer.turnCompletionIdleTimeoutMs`，
OpenClaw 将尽力中断 Codex 轮次，记录诊断超时，并释放 OpenClaw 会话通道，以便后续聊天消息
不会在过期的本机轮次后面排队。

针对同一轮次的任何非终止性通知，包括
`rawResponseItem/completed`，都会解除该短时监视，因为 Codex 已证明该轮次仍然活跃。较长的终止监视器会继续
保护真正卡住的轮次。超时诊断包括最后一次应用服务器
通知方法，以及对于原始助手响应项，还包括项类型、角色、
ID 和有界的助手文本预览。

## 模型发现

默认情况下，Codex 插件会向应用服务器请求可用模型。模型可用性由 Codex 应用服务器管理，因此当 OpenClaw 升级捆绑的 `@openai/codex` 版本，或者当部署将 `appServer.command` 指向不同的 Codex 二进制文件时，列表可能会发生变化。可用性也可能受限于账户范围。请在运行的网关上使用 `/codex models` 以查看该连接器和账户的实时目录。

如果发现失败或超时，OpenClaw 将使用捆绑的回退目录用于：

- GPT-5.5
- GPT-5.4 mini
- GPT-5.2

当前捆绑的连接器是 `@openai/codex` `0.130.0`。针对该捆绑应用服务器的 `model/list` 探测返回：

| 模型 ID               | 默认 | 隐藏 | 输入模态   | 推理强度                 |
| --------------------- | ---- | ---- | ---------- | ------------------------ |
| `gpt-5.5`             | 是   | 否   | 文本，图像 | 低，中，高，超高         |
| `gpt-5.4`             | 否   | 否   | 文本，图像 | 低，中，高，超高         |
| `gpt-5.4-mini`        | 否   | 否   | 文本，图像 | 低，中，高，超高         |
| `gpt-5.3-codex`       | 否   | 否   | 文本，图像 | 低，中，高，超高         |
| `gpt-5.3-codex-spark` | 否   | 否   | 文本       | 低，中，高，超高         |
| `gpt-5.2`             | 否   | 否   | 文本，图像 | low, medium, high, xhigh |

应用服务器目录可以为内部或专用流程返回隐藏模型，但它们不是正常的模型选择器选项。

在 `plugins.entries.codex.config.discovery` 下调整发现设置：

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

当您希望启动时避免探测 Codex 并仅使用回退目录时，请禁用发现：

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

## 工作区引导文件

Codex 通过原生项目文档发现自行处理 `AGENTS.md`。OpenClaw 不会编写合成 Codex 项目文档文件，也不依赖 Codex 回退文件名作为角色文件，因为 Codex 回退仅在 `AGENTS.md` 缺失时适用。

为了实现 OpenClaw 工作区对等性，Codex harness 会解析其他引导文件，包括 `SOUL.md`、`TOOLS.md`、`IDENTITY.md`、`USER.md`、`HEARTBEAT.md`、`BOOTSTRAP.md` 和 `MEMORY.md`（如果存在），并通过 `thread/start` 和 `thread/resume` 上的 Codex 开发者指令转发它们。这使得工作区角色和配置文件上下文在原生 Codex 行为塑造通道上可见，而无需复制 `AGENTS.md`。

## 环境覆盖

环境覆盖仍可用于本地测试：

- `OPENCLAW_CODEX_APP_SERVER_BIN`
- `OPENCLAW_CODEX_APP_SERVER_ARGS`
- `OPENCLAW_CODEX_APP_SERVER_MODE=yolo|guardian`
- `OPENCLAW_CODEX_APP_SERVER_APPROVAL_POLICY`
- `OPENCLAW_CODEX_APP_SERVER_SANDBOX`

当 `appServer.command` 未设置时，`OPENCLAW_CODEX_APP_SERVER_BIN` 会绕过托管二进制文件。

`OPENCLAW_CODEX_APP_SERVER_GUARDIAN=1` 已被移除。请改用 `plugins.entries.codex.config.appServer.mode: "guardian"`，或使用 `OPENCLAW_CODEX_APP_SERVER_MODE=guardian` 进行一次性本地测试。对于可重复部署，首选配置，因为它可以将插件行为与 Codex harness 设置的其余部分保留在同一已审核的文件中。

## 相关

- [Codex harness](/zh/plugins/codex-harness)
- [Codex harness runtime](/zh/plugins/codex-harness-runtime)
- [Native Codex plugins](/zh/plugins/codex-native-plugins)
- [Codex Computer Use](/zh/plugins/codex-computer-use)
- [OpenAI 提供商](OpenAI 提供商](/zh/providers/openai)
- [配置参考](/zh/gateway/configuration-reference)
