---
summary: "Codex harness 的配置、身份验证、发现和应用服务器参考"
title: "Codex harness 参考"
read_when:
  - You need every Codex harness config field
  - You are changing app-server transport, auth, discovery, or timeout behavior
  - You are debugging Codex harness startup, model discovery, or environment isolation
---

本参考文档涵盖了捆绑的 `codex` 插件的详细配置。有关设置和路由决策，请从 [Codex harness](/zh/plugins/codex-harness) 开始。

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

| 字段                       | 默认值                | 含义                                                                                                                      |
| -------------------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `discovery`                | enabled               | Codex 应用服务器 `model/list` 的模型发现设置。                                                                            |
| `appServer`                | 托管 stdio 应用服务器 | 传输、命令、身份验证、审批、沙盒和超时设置。                                                                              |
| `codexDynamicToolsLoading` | `"searchable"`        | 使用 `"direct"`OpenClaw 将 OpenClaw 动态工具直接置于初始 Codex 工具上下文中。                                             |
| `codexDynamicToolsExclude` | `[]`                  | 要从 Codex 应用服务器轮次中排除的其他 OpenClaw 动态工具名称。                                                             |
| `codexPlugins`             | disabled              | 对迁移的源码安装精选插件的 Codex 原生插件/应用程序支持。请参阅 [Native Codex plugins](/zh/plugins/codex-native-plugins)。 |
| `computerUse`              | disabled              | Codex Computer Use 设置。请参阅 [Codex Computer Use](/zh/plugins/codex-computer-use)。                                    |

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

| 字段                          | 默认值                                    | 含义                                                                                                                                                                              |
| ----------------------------- | ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `transport`                   | `"stdio"`                                 | `"stdio"` 生成 Codex；`"websocket"` 连接到 `url`。                                                                                                                                |
| `command`                     | 托管的 Codex 二进制文件                   | 用于 stdio 传输的可执行文件。留空以使用托管的二进制文件。                                                                                                                         |
| `args`                        | `["app-server", "--listen", "stdio://"]`  | stdio 传输的参数。                                                                                                                                                                |
| `url`                         | 未设置                                    | WebSocket 应用服务器 URL。                                                                                                                                                        |
| `authToken`                   | 未设置                                    | WebSocket 传输的 Bearer token。                                                                                                                                                   |
| `headers`                     | `{}`                                      | 额外的 WebSocket 头部。                                                                                                                                                           |
| `clearEnv`                    | `[]`                                      | 从 OpenClaw 构建其继承环境后，从生成的 stdio 应用服务器进程中移除的额外环境变量名称。                                                                                             |
| `requestTimeoutMs`            | `60000`                                   | 应用服务器控制平面调用的超时时间。                                                                                                                                                |
| `turnCompletionIdleTimeoutMs` | `60000`                                   | 在 Codex 接受一轮对话或针对特定轮次的应用服务器请求后，OpenClaw 等待 OpenClaw`turn/completed` 期间的静默窗口。                                                                    |
| `mode`                        | `"yolo"`，除非本地 Codex 要求不允许 YOLO  | YOLO 或守护者审核执行的预设。                                                                                                                                                     |
| `approvalPolicy`              | `"never"` 或允许的守护者审批策略          | 发送到线程启动、恢复和轮次的本地 Codex 审批策略。                                                                                                                                 |
| `sandbox`                     | `"danger-full-access"` 或允许的守护者沙盒 | 发送到线程启动和恢复的 Codex 原生沙箱模式。活动的 OpenClaw 沙箱会将 OpenClaw`danger-full-access` 轮次限制为 Codex `workspace-write`OpenClaw；轮次网络标志遵循 OpenClaw 沙箱出口。 |
| `approvalsReviewer`           | `"user"` 或允许的守护者审查者             | 当允许时，使用 `"auto_review"` 让 Codex 审查原生批准提示。                                                                                                                        |
| `defaultWorkspaceDir`         | 当前进程目录                              | 省略 `--cwd` 时由 `/codex bind` 使用的工作区。                                                                                                                                    |
| `serviceTier`                 | 未设置                                    | 可选的 Codex 应用服务器服务层级。`"priority"` 启用快速模式路由，`"flex"` 请求弹性处理，而 `null` 清除覆盖。旧的 `"fast"` 被接受为 `"priority"`。                                  |

该插件会阻止较旧或未版本化的应用服务器握手。Codex 应用服务器
必须报告稳定版本 `0.125.0` 或更新版本。

## 审批和沙盒模式

本地 stdio 应用服务器会话默认为 YOLO 模式：
`approvalPolicy: "never"`、`approvalsReviewer: "user"` 和
`sandbox: "danger-full-access"`OpenClaw。这种受信任的本地操作员姿态允许
无人值守的 OpenClaw 轮次和心跳继续进行，而无需原生批准
提示，因为周围没有人回答。

如果 Codex 的本地系统需求文件不允许隐式 YOLO 批准、
审查者或沙箱值，OpenClaw 会将隐式默认值视为守护者
并选择允许的守护者权限。同一需求文件中主机名匹配的
OpenClaw`[[remote_sandbox_config]]` 条目将受到尊重
用于沙箱默认决策。

为 Codex 守护者审核批准设置 `appServer.mode: "guardian"`：

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

当允许这些值时，`guardian` 预设会扩展为 `approvalPolicy: "on-request"`、
`approvalsReviewer: "auto_review"` 和 `sandbox: "workspace-write"`。单独的策略字段会覆盖 `mode`。较旧的
`guardian_subagent` 审核者值作为兼容性别名仍被接受，
但新配置应使用 `auto_review`。

当 OpenClaw 沙箱处于活动状态时，本地 Codex 应用服务器进程仍然
在 Gateway(网关) 主机上运行。因此，OpenClaw 会为本地代码模式轮次保留 Codex 自己的文件系统
沙箱。`danger-full-access` 轮次被缩小到
Codex `workspace-write`，并且 `workspace-write` 轮次 `networkAccess` 派生自
OpenClaw 沙箱出站设置：Docker `network: "none"` 保持
离线，而 `network: "bridge"` 或自定义 Docker 网络则允许出站
访问。

## 身份验证和环境隔离

身份验证按以下顺序选择：

1. 为该代理指定的显式 OpenClaw Codex 身份验证配置文件。
2. 应用服务器在该代理的 Codex 主目录中的现有帐户。
3. 仅对于本地 stdio 应用服务器启动，如果没有应用服务器帐户且仍需要
   OpenAI 身份验证，则依次是 `CODEX_API_KEY`，然后是
   `OPENAI_API_KEY`。

当 OpenClaw 发现 ChatGPT 订阅风格的 Codex 身份验证配置文件时，它会从
生成的 Codex 子进程中移除 `CODEX_API_KEY` 和 `OPENAI_API_KEY`。这
使得 Gateway(网关) 级别的 API 密钥可用于嵌入或直接 OpenAI 模型，
而不会导致本机 Codex 应用服务器轮次意外通过 API 计费。

显式的 Codex API 密钥配置文件和本地 stdio 环境密钥回退使用 app-server 登录，而不是继承的子进程环境。WebSocket app-server 连接不接收 Gateway(网关) 环境 API 密钥回退；请使用显式的身份验证配置文件或远程 app-server 自己的账户。

默认情况下，Stdio app-server 启动会继承 OpenClaw 的进程环境。OpenClaw 拥有 Codex app-server 账户桥，并将 `CODEX_HOME` 设置为该代理的 OpenClaw 状态下的每个代理目录。这使得 Codex 配置、账户、插件缓存/数据和线程状态限定在 OpenClaw 代理范围内，而不是从操作员的个人 `~/.codex` 主目录泄漏进来。

对于正常的本地 app-server 启动，OpenClaw 不会重写 `HOME`。Codex 运行的子进程（如 `openclaw`、`gh`、`git`、云 CLIs 和 shell 命令）可以看到正常的进程主目录，并且可以找到用户主目录配置和令牌。Codex 也可能发现 `$HOME/.agents/skills` 和 `$HOME/.agents/plugins/marketplace.json`；该 `.agents` 发现旨在与操作员主目录共享，并且与隔离的 `~/.codex` 状态是分开的。

OpenClaw 插件和 OpenClaw 技能快照仍然通过 OpenClaw 自己的插件注册表和技能加载器流动。个人 Codex `~/.codex` 资产则不会。如果您有有用的 Codex CLI 技能或来自 Codex 主目录的插件应该成为 OpenClaw 代理的一部分，请明确列出它们：

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

`appServer.clearEnv`OpenClaw 仅影响生成的 Codex 应用服务器子进程。
OpenClaw 在本地启动规范化期间会从此列表中移除 `CODEX_HOME` 和 `HOME`：
`CODEX_HOME` 保持按代理设置，而 `HOME` 保持继承，以便
子进程可以使用正常的用户主目录状态。

## 动态工具

Codex 动态工具默认为 `searchable`OpenClaw 加载。OpenClaw 不会暴露
重复 Codex 原生工作区操作的动态工具：

- `read`
- `write`
- `edit`
- `apply_patch`
- `exec`
- `process`
- `update_plan`

大多数其余的 OpenClaw 集成工具（如消息传递、媒体、cron、
浏览器、节点、网关、OpenClaw`heartbeat_respond` 和 `web_search`）均可通过
`openclaw` 命名空间下的 Codex 工具搜索获取。这可以使初始
模型上下文更小。`sessions_yield` 和仅消息工具来源的回复
保持直接，因为它们是轮次控制合约。`sessions_spawn` 保持
可搜索，因此 Codex 的原生 `spawn_agent`OpenClaw 仍然是主要的 Codex 子代理
界面，而显式的 OpenClaw 或 ACP 委派仍可通过
`openclaw` 动态工具命名空间使用。

仅在连接到无法搜索延迟动态工具的自定义 Codex
应用服务器或调试完整
工具负载时，才设置 `codexDynamicToolsLoading: "direct"`。

## 超时

OpenClaw 拥有的动态工具调用受独立于
OpenClaw`appServer.requestTimeoutMs` 的限制。每个 Codex `item/tool/call` 请求按以下顺序使用第一个
可用的超时：

- 每次调用的正数 `timeoutMs` 参数。
- 对于 `image_generate`，`agents.defaults.imageGenerationModel.timeoutMs`。
- 对于未配置超时的 `image_generate`，默认为 120 秒的图像生成超时。
- 对于媒体理解 `image` 工具，`tools.media.image.timeoutSeconds` 转换为毫秒，或默认 60 秒媒体超时。
- 动态工具的默认超时为 30 秒。

动态工具预算上限为 600000 毫秒。超时时，OpenClaw 会尽可能中止工具信号，并向 Codex 返回失败的动态工具响应，以便回合可以继续，而不是让会话处于 OpenClaw`processing` 状态。

Codex 接受回合后，以及 OpenClaw 响应特定于回合的应用程序服务器请求后，Harness 期望 Codex 取得当前回合的进展，并最终使用 OpenClaw`turn/completed` 完成本机回合。如果应用程序服务器 `appServer.turnCompletionIdleTimeoutMs`OpenClawOpenClaw 无响应，OpenClaw 会尽力中断 Codex 回合，记录诊断超时，并释放 OpenClaw 会话通道，以便后续聊天消息不会排在过时的本机回合后面。

同一轮次中的大多数非终止通知会解除该短看门狗，因为 Codex 已证明该轮次仍然存活。原始 `custom_tool_call_output` 补全会使短后工具看门狗保持启用，因为它们是轮次范围的工具结果移交。已完成的 `agentMessage` 项和前工具原始助手 `rawResponseItem/completed` 项会启用助手输出释放：如果 Codex 随后在没有 `turn/completed` 的情况下保持静默，OpenClaw 会尽力中断本机轮次并释放会话通道。后工具原始助手进度会继续等待 `turn/completed` 或终止看门狗。超时诊断包括最后一个应用服务器通知方法，对于原始助手响应项，还包括项类型、角色、ID 和有限的助手文本预览。

## 模型发现

默认情况下，Codex 插件会向应用服务器询问可用模型。模型的可用性由 Codex 应用服务器管理，因此当 OpenClaw 升级捆绑的 `@openai/codex` 版本或部署指向 `appServer.command` 不同的 Codex 二进制文件时，列表可能会发生变化。可用性也可能受限于账户范围。在运行中的网关上使用 `/codex models` 可以查看该 harness 和账户的实时目录。

如果发现失败或超时，OpenClaw 将使用捆绑的回退目录来查找：

- GPT-5.5
- GPT-5.4 mini
- GPT-5.2

当前捆绑的 harness 是 `@openai/codex` `0.130.0`。针对该捆绑应用服务器的 `model/list` 探测返回：

| 模型 ID               | 默认 | 隐藏 | 输入模态    | 推理强度                 |
| --------------------- | ---- | ---- | ----------- | ------------------------ |
| `gpt-5.5`             | 是   | 否   | text, image | low, medium, high, xhigh |
| `gpt-5.4`             | 否   | 否   | text, image | low, medium, high, xhigh |
| `gpt-5.4-mini`        | 否   | 否   | text, image | low, medium, high, xhigh |
| `gpt-5.3-codex`       | 否   | 否   | text, image | low, medium, high, xhigh |
| `gpt-5.3-codex-spark` | 否   | 否   | text        | low, medium, high, xhigh |
| `gpt-5.2`             | 否   | 否   | text, image | low, medium, high, xhigh |

隐藏模型可以由应用服务器目录返回，用于内部或专门的流程，但它们不是正常的模型选择器选项。

在 `plugins.entries.codex.config.discovery` 下调整发现：

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

当您希望启动过程避免探测 Codex 并仅使用后备目录时，请禁用发现：

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

## 工作区启动文件

Codex 通过原生项目文档发现自行处理 `AGENTS.md`。OpenClaw 不会编写合成的 Codex 项目文档文件，也不依赖 Codex 后备文件名来查找 persona 文件，因为 Codex 后备仅在 `AGENTS.md` 缺失时才适用。

为了实现 OpenClaw 工作区对等性，Codex harness 会解析其他启动文件。`SOUL.md`、`IDENTITY.md`、`TOOLS.md` 和 `USER.md` 会作为 OpenClaw Codex 开发者指令进行转发，因为它们定义了活动代理、可用的工作区指导和用户配置文件。`HEARTBEAT.md` 的内容不会被注入；心跳轮次会获得一个协作模式指针，以便在该文件存在且非空时读取它。如果存在 `BOOTSTRAP.md` 和 `MEMORY.md`，它们将作为 OpenClaw 轮次输入参考上下文进行转发。

## 环境覆盖

环境覆盖仍可用于本地测试：

- `OPENCLAW_CODEX_APP_SERVER_BIN`
- `OPENCLAW_CODEX_APP_SERVER_ARGS`
- `OPENCLAW_CODEX_APP_SERVER_MODE=yolo|guardian`
- `OPENCLAW_CODEX_APP_SERVER_APPROVAL_POLICY`
- `OPENCLAW_CODEX_APP_SERVER_SANDBOX`

当 `appServer.command` 未设置时，`OPENCLAW_CODEX_APP_SERVER_BIN` 会绕过托管二进制文件。

`OPENCLAW_CODEX_APP_SERVER_GUARDIAN=1` 已被移除。请改用 `plugins.entries.codex.config.appServer.mode: "guardian"`，或者在进行一次性本地测试时使用 `OPENCLAW_CODEX_APP_SERVER_MODE=guardian`。对于可重复的部署，首选配置，因为它将插件行为保留在与 Codex harness 设置其余部分相同的已审查文件中。

## 相关

- [Codex harness](/zh/plugins/codex-harness)
- [Codex harness runtime](/zh/plugins/codex-harness-runtime)
- [Native Codex plugins](/zh/plugins/codex-native-plugins)
- [Codex 计算机使用](/zh/plugins/codex-computer-use)
- [OpenAI 提供商](OpenAI/en/providers/openai)
- [配置参考](/zh/gateway/configuration-reference)
