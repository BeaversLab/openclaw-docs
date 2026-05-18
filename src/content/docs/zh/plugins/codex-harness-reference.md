---
summary: "Codex harness 的配置、身份验证、发现和应用服务器参考"
title: "Codex harness 参考"
read_when:
  - You need every Codex harness config field
  - You are changing app-server transport, auth, discovery, or timeout behavior
  - You are debugging Codex harness startup, model discovery, or environment isolation
---

本文档介绍了随附的 `codex` 插件的详细配置。有关设置和路由决策，请从 [Codex harness](/zh/plugins/codex-harness) 开始。

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

| 字段                       | 默认值                | 含义                                                                                                                    |
| -------------------------- | --------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `discovery`                | enabled               | Codex 应用服务器 `model/list` 的模型发现设置。                                                                          |
| `appServer`                | 托管 stdio 应用服务器 | 传输、命令、身份验证、审批、沙盒和超时设置。                                                                            |
| `codexDynamicToolsLoading` | `"searchable"`        | 使用 `"direct"`OpenClaw 将 OpenClaw 动态工具直接置于初始 Codex 工具上下文中。                                           |
| `codexDynamicToolsExclude` | `[]`                  | 要从 Codex 应用服务器轮次中排除的其他 OpenClaw 动态工具名称。                                                           |
| `codexPlugins`             | disabled              | 对已迁移的源安装型精选插件的 Codex 原生插件/应用支持。请参阅 [Native Codex plugins](/zh/plugins/codex-native-plugins)。 |
| `computerUse`              | disabled              | Codex Computer Use 设置。请参阅 [Codex Computer Use](/zh/plugins/codex-computer-use)。                                  |

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
| `turnCompletionIdleTimeoutMs` | `60000`                                   | 在 Codex 接受一轮对话或针对特定轮次的应用服务器请求后，OpenClaw 等待 OpenClaw`turn/completed` 期间的静默窗口。                                |
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

默认情况下，Stdio 应用服务器启动时会继承 OpenClaw 的进程环境。OpenClaw 拥有 Codex 应用服务器帐户桥，并将 OpenClawOpenClaw`CODEX_HOME`OpenClawOpenClaw 设置为该代理 OpenClaw 状态下的特定代理目录。这使 Codex 配置、帐户、插件缓存/数据和线程状态限定于 OpenClaw 代理，而不是从操作员的个人 `~/.codex` 主目录泄漏进来。

对于正常的本地应用服务器启动，OpenClaw 不会重写 OpenClaw`HOME`。Codex 运行的子进程（如 `openclaw`、`gh`、`git`、云 CLI 和 shell 命令）可以看到正常的进程主目录，并可以找到用户主目录配置和令牌。Codex 还可能会发现 `$HOME/.agents/skills` 和 `$HOME/.agents/plugins/marketplace.json`；这种 `.agents` 发现有意与操作员主目录共享，并与隔离的 `~/.codex` 状态分开。

OpenClaw 插件和 OpenClaw 技能快照仍然通过 OpenClaw 自己的插件注册表和技能加载器流转。个人 Codex OpenClawOpenClawOpenClaw`~/.codex`CLIOpenClaw 资产则不会。如果您拥有有用的 Codex CLI 技能或来自 Codex 主目录的插件，并且这些插件应成为 OpenClaw 代理的一部分，请明确列出它们：

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

`appServer.clearEnv`OpenClaw 仅影响生成的 Codex app-server 子进程。
OpenClaw 会在本地启动规范化期间从此列表中移除 `CODEX_HOME` 和 `HOME`：
`CODEX_HOME` 保持为每个代理独有，而 `HOME` 保持继承，以便子进程可以使用
正常的用户主目录状态。

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

其余的 OpenClaw 集成工具（如 messaging、sessions、media、cron、
browser、nodes、gateway、OpenClaw`heartbeat_respond` 和 `web_search`）可通过
Codex 工具搜索在 `openclaw` 命名空间下使用。这使初始
模型上下文更小。`sessions_yield` 和仅使用消息工具的源回复
保持直接，因为这些是轮次控制合约。

仅当连接到无法搜索延迟动态工具的自定义 Codex
app-server 或调试完整
工具负载时，才设置 `codexDynamicToolsLoading: "direct"`。

## 超时

OpenClaw 拥有的动态工具调用独立于
OpenClaw`appServer.requestTimeoutMs` 受限。每个 Codex `item/tool/call` 请求按顺序使用第一个
可用的超时设置：

- 正数的每次调用 `timeoutMs` 参数。
- 对于 `image_generate`，`agents.defaults.imageGenerationModel.timeoutMs`。
- 对于媒体理解 `image` 工具，`tools.media.image.timeoutSeconds`
  转换为毫秒，或者 60 秒的媒体默认值。
- 30 秒的动态工具默认值。

动态工具预算上限为 600000 毫秒。如果超时，OpenClaw 会在支持的情况下中止工具信号，并向 Codex 返回失败的动态工具响应，以便轮次可以继续，而不是将会话留在 OpenClaw`processing` 中。

Codex 接受轮次后，且 OpenClaw 响应了轮次作用域的应用服务器请求后，harness 期望 Codex 取得当前轮次的进展，并最终以 OpenClaw`turn/completed` 完成原生轮次。如果应用服务器在 `appServer.turnCompletionIdleTimeoutMs`OpenClawOpenClaw 内保持静默，OpenClaw 会尽力中断 Codex 轮次，记录诊断超时，并释放 OpenClaw 会话通道，以便后续聊天消息不会排在陈旧的原生轮次之后。

同一轮次的大多数非终端通知会解除该短期监视，因为 Codex 已证明轮次仍然存活。原始 `custom_tool_call_output` 补全会使工具后的短期监视保持启用，因为它们是轮次作用域的工具结果交接。已完成的 `agentMessage` 项目和工具前的原始助手 `rawResponseItem/completed` 项目会启用助手输出释放：如果 Codex 随后在没有 `turn/completed`OpenClaw 的情况下保持静默，OpenClaw 会尽力中断原生轮次并释放会话通道。工具后的原始助手进度会继续等待 `turn/completed` 或终端监视器。超时诊断包括最后一次应用服务器通知方法，对于原始助手响应项目，还包括项目类型、角色、ID 和有界的助手文本预览。

## 模型发现

默认情况下，Codex 插件会向应用服务器请求可用模型。模型可用性由 Codex 应用服务器决定，因此当 OpenClaw 升级捆绑的 OpenClaw`@openai/codex` 版本或部署将 `appServer.command` 指向不同的 Codex 二进制文件时，列表可能会发生变化。可用性也可能受帐户范围限制。在运行中的网关上使用 `/codex models` 以查看该 harness 和帐户的实时目录。

如果发现失败或超时，OpenClaw 会使用捆绑的回退目录来查找：

- GPT-5.5
- GPT-5.4 mini
- GPT-5.2

当前捆绑的 harness 是 `@openai/codex` `0.130.0`。针对该捆绑 app-server 的 `model/list` 探测返回：

| 模型 ID               | 默认 | 隐藏 | 输入模态   | 推理强度         |
| --------------------- | ---- | ---- | ---------- | ---------------- |
| `gpt-5.5`             | 是   | 否   | 文本、图像 | 低、中、高、超高 |
| `gpt-5.4`             | 否   | 否   | 文本、图像 | 低、中、高、超高 |
| `gpt-5.4-mini`        | 否   | 否   | 文本、图像 | 低、中、高、超高 |
| `gpt-5.3-codex`       | 否   | 否   | 文本、图像 | 低、中、高、超高 |
| `gpt-5.3-codex-spark` | 否   | 否   | 文本       | 低、中、高、超高 |
| `gpt-5.2`             | 否   | 否   | 文本、图像 | 低、中、高、超高 |

App-server 目录可以返回隐藏模型用于内部或专用流程，但它们不是正常的模型选择器选项。

在 `plugins.entries.codex.config.discovery` 下调整发现机制：

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

当您希望启动时避免探测 Codex 并仅使用后备目录时，请禁用发现机制：

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

Codex 通过原生项目文档发现自行处理 `AGENTS.md`。OpenClaw 不会编写合成 Codex 项目文档文件，也不依赖于 Codex 后备文件名作为角色文件，因为 Codex 后备仅在 `AGENTS.md` 缺失时适用。

为了实现 OpenClaw 工作区对等性，Codex harness 会解析其他引导文件（包括 `SOUL.md`、`TOOLS.md`、`IDENTITY.md`、`USER.md`、`HEARTBEAT.md`、`BOOTSTRAP.md` 和 `MEMORY.md`，如果存在的话），并通过 `thread/start` 和 `thread/resume` 上的 Codex 开发者指令进行转发。这使得工作区角色和配置文件上下文在原生 Codex 行为塑造通道上可见，而无需复制 `AGENTS.md`。

## 环境覆盖

环境覆盖功能仍可用于本地测试：

- `OPENCLAW_CODEX_APP_SERVER_BIN`
- `OPENCLAW_CODEX_APP_SERVER_ARGS`
- `OPENCLAW_CODEX_APP_SERVER_MODE=yolo|guardian`
- `OPENCLAW_CODEX_APP_SERVER_APPROVAL_POLICY`
- `OPENCLAW_CODEX_APP_SERVER_SANDBOX`

当 `appServer.command` 未设置时，`OPENCLAW_CODEX_APP_SERVER_BIN` 绕过托管二进制文件。

`OPENCLAW_CODEX_APP_SERVER_GUARDIAN=1` 已被移除。请改用 `plugins.entries.codex.config.appServer.mode: "guardian"`，或用于一次性本地测试的 `OPENCLAW_CODEX_APP_SERVER_MODE=guardian`。对于可重复部署，首选配置，因为它将插件行为与 Codex harness 设置的其余部分保持在同一已审核的文件中。

## 相关

- [Codex harness](/zh/plugins/codex-harness)
- [Codex harness runtime](/zh/plugins/codex-harness-runtime)
- [Native Codex plugins](/zh/plugins/codex-native-plugins)
- [Codex Computer Use](/zh/plugins/codex-computer-use)
- [OpenAI 提供商](OpenAI/en/providers/openai)
- [Configuration reference](/zh/gateway/configuration-reference)
