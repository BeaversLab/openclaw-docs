---
summary: "Codex harness 的配置、身份验证、发现和应用服务器参考"
title: "Codex harness 参考"
read_when:
  - You need every Codex harness config field
  - You are changing app-server transport, auth, discovery, or timeout behavior
  - You are debugging Codex harness startup, model discovery, or environment isolation
---

本参考文档涵盖了内置 `codex`
插件的详细配置。有关设置和路由决策，请从
[Codex harness](/zh/plugins/codex-harness) 开始。

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

| 字段                       | 默认值                | 含义                                                                                                                         |
| -------------------------- | --------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `discovery`                | enabled               | Codex 应用服务器 `model/list` 的模型发现设置。                                                                               |
| `appServer`                | 托管 stdio 应用服务器 | 传输、命令、身份验证、审批、沙盒和超时设置。                                                                                 |
| `codexDynamicToolsLoading` | `"searchable"`        | 使用 `"direct"`OpenClaw 将 OpenClaw 动态工具直接置于初始 Codex 工具上下文中。                                                |
| `codexDynamicToolsExclude` | `[]`                  | 要从 Codex 应用服务器轮次中排除的其他 OpenClaw 动态工具名称。                                                                |
| `codexPlugins`             | disabled              | 对已迁移的源安装精选插件的 Native Codex 插件/应用程序支持。请参阅 [Native Codex plugins](/zh/plugins/codex-native-plugins)。 |
| `computerUse`              | disabled              | Codex Computer Use 设置。请参阅 [Codex Computer Use](/zh/plugins/codex-computer-use)。                                       |

## 应用服务器传输

默认情况下，OpenClaw 会启动随附 插件附带的托管 Codex 二进制文件：

```bash
codex app-server --listen stdio://
```

这使得应用服务器版本与捆绑的 `codex`CLI 插件保持一致，而不是
取决于本地安装的任何独立的 Codex CLI。仅当您有意运行不同的
可执行文件时，才设置
`appServer.command`。

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

| 字段                                          | 默认值                                            | 含义                                                                                                                                                                                                                                   |
| --------------------------------------------- | ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `transport`                                   | `"stdio"`                                         | `"stdio"` 生成 Codex；`"websocket"` 连接到 `url`。                                                                                                                                                                                     |
| `command`                                     | 托管的 Codex 二进制文件                           | 用于 stdio 传输的可执行文件。留空以使用托管的二进制文件。                                                                                                                                                                              |
| `args`                                        | `["app-server", "--listen", "stdio://"]`          | stdio 传输的参数。                                                                                                                                                                                                                     |
| `url`                                         | 未设置                                            | WebSocket 应用服务器 URL。                                                                                                                                                                                                             |
| `authToken`                                   | 未设置                                            | WebSocket 传输的 Bearer token。                                                                                                                                                                                                        |
| `headers`                                     | `{}`                                              | 额外的 WebSocket 头部。                                                                                                                                                                                                                |
| `clearEnv`                                    | `[]`                                              | 从 OpenClaw 构建其继承环境后，从生成的 stdio 应用服务器进程中移除的额外环境变量名称。                                                                                                                                                  |
| `requestTimeoutMs`                            | `60000`                                           | 应用服务器控制平面调用的超时时间。                                                                                                                                                                                                     |
| `turnCompletionIdleTimeoutMs`                 | `60000`                                           | 在 Codex 接受轮次或轮次范围的 app-server 请求后，OpenClaw 等待 OpenClaw`turn/completed` 时的静默窗口。                                                                                                                                 |
| `postToolRawAssistantCompletionIdleTimeoutMs` | `300000`                                          | 在 OpenClaw 等待 `turn/completed` 时，在工具移交、原生工具完成或工具后原始助手进度之后使用的完成空闲和进度保护。对于受信任或繁重的工作负载，请使用此选项，因为在这种情况下，工具后合成可以合理地保持比最终助手释放预算更长的时间静默。 |
| `mode`                                        | 除非本地 Codex 要求不允许 YOLO，否则使用 `"yolo"` | 用于 YOLO 或监护人审查执行的预设。                                                                                                                                                                                                     |
| `approvalPolicy`                              | `"never"` 或允许的守护者审批策略                  | 发送到线程开始、恢复和轮次的本地 Codex 批准策略。                                                                                                                                                                                      |
| `sandbox`                                     | `"danger-full-access"` 或允许的守护者沙箱         | 发送到线程启动和恢复的 Native Codex 沙箱模式。活动的 OpenClaw 沙箱将 `danger-full-access` 回合限制为 Codex `workspace-write`；回合网络标志遵循 OpenClaw 沙箱出口。                                                                     |
| `approvalsReviewer`                           | `"user"` 或允许的守护者审查者                     | 当允许时，使用 `"auto_review"` 让 Codex 审查原生审批提示。                                                                                                                                                                             |
| `defaultWorkspaceDir`                         | 当前进程目录                                      | 当省略 `--cwd` 时，`/codex bind` 使用的工作区。                                                                                                                                                                                        |
| `serviceTier`                                 | unset                                             | 可选的 Codex 应用服务器服务层。`"priority"` 启用快速模式路由，`"flex"` 请求灵活处理，`null` 清除覆盖设置。传统的 `"fast"` 被接受为 `"priority"`。                                                                                      |
| `experimental.sandboxExecServer`              | `false`                                           | 预览选项，用于向 Codex app-server 0.132.0 或更新版本注册由 OpenClaw 沙箱支持的 Codex 环境，以便本机 Codex 执行可以在活动的 OpenClaw 沙箱内运行。                                                                                       |

该插件会拦截旧版本或未设置版本的 app-server 握手。Codex app-server 必须报告稳定版本 `0.125.0` 或更新版本。

## 审批和沙箱模式

本地 stdio app-server 会话默认采用 YOLO 模式：
`approvalPolicy: "never"`、`approvalsReviewer: "user"` 和
`sandbox: "danger-full-access"`OpenClaw。这种受信任的本地操作员姿态允许无人值守的 OpenClaw 轮次和心跳继续进行，而无需本地批准提示，因为没有人来回答这些提示。

如果 Codex 的本地系统需求文件不允许隐式 YOLO 批准、审查员或沙箱值，OpenClaw 会将隐式默认值视为 guardian（监护人）并选择允许的 guardian 权限。OpenClaw`tools.exec.mode: "auto"`
也会强制执行 guardian 审查的 Codex 批准，并且不保留不安全的旧版 `approvalPolicy: "never"` 或 `sandbox: "danger-full-access"` 覆盖；
设置 `tools.exec.mode: "full"` 以实现故意的无批准姿态。
同一需求文件中的主机名匹配
`[[remote_sandbox_config]]` 条目将用于沙箱默认决策。

设置 `appServer.mode: "guardian"` 以启用 Codex guardian 审查批准：

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

当允许这些值时，`guardian` 预设会展开为 `approvalPolicy: "on-request"`、
`approvalsReviewer: "auto_review"` 和 `sandbox: "workspace-write"`。各个策略字段会覆盖 `mode`。较旧的
`guardian_subagent` 审查员值仍作为兼容性别名被接受，
但新配置应使用 `auto_review`。

当 OpenClaw 沙箱处于活动状态时，本地 Codex app-server 进程仍然
在 Gateway(网关) 主机上运行。因此，OpenClaw 会禁用该轮次的 Codex 原生代码模式、
用户 MCP 服务器和应用支持的插件执行，而不是将
Codex 主机端沙箱隔离视为等同于 OpenClaw 沙箱
后端。当常规 exec/process 工具
可用时，Shell 访问通过 OpenClaw 沙箱支持的动态工具
（如 OpenClawGateway(网关)OpenClawOpenClawOpenClaw`sandbox_exec` 和 `sandbox_process`）暴露。

在 Ubuntu/AppArmor 主机上，当您故意在没有激活 OpenClaw 沙箱隔离的情况下运行原生 Codex `workspace-write`OpenClaw 时，Codex bwrap 可能会在 shell 命令启动前在 `workspace-write` 下失败。如果您看到 `bwrap: setting up uid map: Permission denied` 或 `bwrap: loopback: Failed RTM_NEWADDR: Operation not permitted`，请运行 `openclaw doctor`OpenClawDocker 并修复针对 OpenClaw 服务用户报告的主机命名空间策略，而不是授予更广泛的 Docker 容器权限。最好为服务进程使用限定范围的 AppArmor 配置文件；`kernel.apparmor_restrict_unprivileged_userns=0` 回退方案是主机范围的，并且存在安全权衡。

## 沙箱隔离的原生执行

稳定的默认值是 fail-closed（故障关闭）：激活的 OpenClaw 沙箱隔离会禁用原生 Codex 执行表面，否则这些表面将从 Codex 应用服务器主机运行。仅当您想通过 OpenClaw 的沙箱后端尝试 Codex 的远程环境支持时，才使用 OpenClaw`appServer.experimental.sandboxExecServer: true`OpenClaw。此预览路径需要 Codex 应用服务器 0.132.0 或更新版本。

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
        config: {
          appServer: {
            experimental: {
              sandboxExecServer: true,
            },
          },
        },
      },
    },
  },
}
```

当启用此标志且当前的 OpenClaw 会话处于沙箱隔离状态时，OpenClaw 会启动一个由活动沙箱支持本地回环执行服务器，将其注册到 Codex 应用服务器，并使用该 OpenClaw 拥有的环境启动 Codex 线程和轮次。如果应用服务器无法注册该环境，运行将失败关闭，而不是静默回退到主机执行。

此预览路径仅限本地。远程 WebSocket 应用服务器无法到达回环执行服务器，除非它在同一主机上运行，因此 OpenClaw 会拒绝该组合。

## 身份验证和环境隔离

身份验证按以下顺序选择：

1. 针对该代理的显式 OpenClaw Codex 身份验证配置文件。
2. 该代理的 Codex 主目录中现有的应用服务器账户。
3. 仅对于本地 stdio 应用服务器启动，当不存在应用服务器帐户且仍需要 OpenAI 身份验证时，`CODEX_API_KEY`，然后 `OPENAI_API_KEY`OpenAI。

当 OpenClaw 看到 ChatGPT 订阅风格的 Codex 身份验证配置文件时，它会从生成的 Codex 子进程中移除 OpenClaw`CODEX_API_KEY` 和 `OPENAI_API_KEY`Gateway(网关)APIOpenAIAPI。这使得 Gateway 级别的 API 密钥可用于嵌入或直接 OpenAI 模型，而不会意外地通过 API 对原生 Codex 应用服务器轮次进行计费。

显式的 Codex API 密钥配置文件和本地 stdio 环境密钥回退使用应用服务器登录，而不是继承的子进程环境。WebSocket 应用服务器连接不接收 Gateway(网关) 环境 API 密钥回退；请使用显式身份验证配置文件或远程应用服务器自己的账户。

Stdio 应用服务器启动默认继承 OpenClaw 的进程环境。OpenClaw 拥有 Codex 应用服务器帐户桥，并将 OpenClawOpenClaw`CODEX_HOME`OpenClawOpenClaw 设置为该代理 OpenClaw 状态下的每个代理目录。这使得 Codex 配置、帐户、插件缓存/数据和线程状态限定于 OpenClaw 代理，而不是从操作员个人 `~/.codex` 主目录泄漏进来。

对于正常的本地应用服务器启动，OpenClaw 不会重写 OpenClaw`HOME`。Codex 运行的子进程（如 `openclaw`、`gh`、`git`、云 CLI 和 shell 命令）可以看到正常的进程主目录，并可以找到用户主目录配置和令牌。Codex 可能还会发现 `$HOME/.agents/skills` 和 `$HOME/.agents/plugins/marketplace.json`；这种 `.agents` 发现是有意与操作员主目录共享的，并且与隔离的 `~/.codex` 状态是分开的。

OpenClaw 插件和 OpenClaw 技能快照仍然通过 OpenClaw 自己的插件注册表和技能加载器流动。个人 Codex OpenClawOpenClawOpenClaw`~/.codex` 资产则不会。如果您有有用的 Codex CLIOpenClaw 技能或来自 Codex 主目录的插件应成为 OpenClaw 代理的一部分，请明确将它们列入清单：

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

`appServer.clearEnv`OpenClaw 仅影响生成的 Codex 应用服务器子进程。OpenClaw 在本地启动规范化期间会从此列表中删除 `CODEX_HOME` 和 `HOME`：`CODEX_HOME` 保持每个代理独立，而 `HOME` 保持继承，以便子进程可以使用正常的用户主目录状态。

## 动态工具

Codex 动态工具默认为 `searchable`OpenClaw 加载。OpenClaw 不会公开复制 Codex 原生工作区操作的动态工具：

- `read`
- `write`
- `edit`
- `apply_patch`
- `exec`
- `process`
- `update_plan`

大多数剩余的 OpenClaw 集成工具（如 messaging、media、cron、browser、nodes、gateway、OpenClaw`heartbeat_respond` 和 `web_search`）均可通过 Codex 工具搜索在 `openclaw` 命名空间下获得。这使初始模型上下文更小。`sessions_yield` 和仅限 message-工具 的源回复保持直接，因为那些是轮次控制合约。`sessions_spawn` 保持可搜索，以便 Codex 原生的 `spawn_agent`OpenClaw 仍然是主要的 Codex 子代理表面，而通过 `openclaw` 动态工具命名空间仍可进行显式的 OpenClaw 或 ACP 委托。

仅当连接到无法搜索延迟动态工具的自定义 Codex 应用服务器或调试完整工具负载时，才设置 `codexDynamicToolsLoading: "direct"`。

## 超时

OpenClaw 拥有的动态工具调用独立于 OpenClaw`appServer.requestTimeoutMs` 进行限制。每个 Codex `item/tool/call` 请求按顺序使用第一个可用的超时：

- 正数的每次调用 `timeoutMs` 参数。
- 对于 `image_generate`，`agents.defaults.imageGenerationModel.timeoutMs`。
- 对于没有配置超时的 `image_generate`，为 120 秒的图像生成默认值。
- 对于媒体理解 `image` 工具，为 `tools.media.image.timeoutSeconds` 转换后的毫秒数，或 60 秒的媒体默认值。
- 90 秒的动态工具默认值。

动态工具预算上限为 600000 毫秒。超时时，OpenClaw 在支持的情况下中止工具信号，并向 Codex 返回失败的动态工具响应，以便轮次可以继续，而不是将会话置于 OpenClaw`processing` 状态。

在 Codex 接受一个轮次，且 OpenClaw 响应了轮次范围的 app-server 请求后，harness 预期 Codex 取得当前轮次的进展，并最终用 OpenClaw`turn/completed` 结束原生轮次。如果 app-server 保持安静 `appServer.turnCompletionIdleTimeoutMs`OpenClawOpenClaw，OpenClaw 会尽力中断 Codex 轮次，记录诊断超时，并释放 OpenClaw 会话通道，以便后续聊天消息不会在陈旧的原生轮次后面排队。

针对同一轮的大多数非终端通知会解除该短时监视，因为 Codex 已证明该轮次仍然存活。工具交接使用更长的工具后闲置预算：在 OpenClaw 返回 `item/tool/call` 响应后，在诸如 `commandExecution` 的原生工具项完成后，在原始 `custom_tool_call_output` 补全后，以及在工具后原始助手进度之后。如果进行了配置，该守卫使用 `appServer.postToolRawAssistantCompletionIdleTimeoutMs`，否则默认为五分钟。相同的工具后预算也会延长进度监视器的时间，覆盖 Codex 发出下一个当前轮次事件之前的静默合成窗口。推理补全、评论 `agentMessage` 补全以及工具前原始推理或助手进度之后可以跟随自动最终回复，因此它们使用进度后回复守卫，而不是立即释放会话通道。只有最终/非评论已完成的 `agentMessage` 项和工具前原始助手补全会触发助手输出释放：如果 Codex 随后在没有 `turn/completed` 的情况下保持静默，OpenClaw 会尽力中断原生轮次并释放会话通道。可重放的安全 stdio 应用服务器故障（包括在没有助手、工具、活动项或副作用证据的情况下的轮次完成闲置超时）将在新的应用服务器尝试上重试一次。不安全的超时仍然会退役卡住的应用服务器客户端并释放 OpenClaw 会话通道。它们还会清除过时的原生线程绑定，并显示可恢复的超时消息供用户或维护者判断，而不是自动重放。超时诊断包括最后的应用服务器通知方法，对于原始助手响应项，还包括项类型、角色、ID 和有界的助手文本预览。

## 模型发现

默认情况下，Codex 插件向应用服务器询问可用模型。模型的可用性由 Codex 应用服务器管理，因此当 OpenClaw 升级捆绑的 OpenClaw`@openai/codex` 版本或部署将 `appServer.command` 指向不同的 Codex 二进制文件时，列表可能会发生变化。可用性也可能受限于账户范围。在运行的网关上使用 `/codex models` 以查看该工具链和账户的实时目录。

如果发现失败或超时，OpenClaw 将针对以下情况使用捆绑的回退目录：

- GPT-5.5
- GPT-5.4 mini
- GPT-5.2

当前捆绑的工具链是 `@openai/codex` `0.134.0`。针对该捆绑应用服务器的 `model/list` 探测返回：

| 模型 ID               | 默认 | 隐藏 | 输入模态    | 推理强度                 |
| --------------------- | ---- | ---- | ----------- | ------------------------ |
| `gpt-5.5`             | 是   | 否   | 文本、图像  | 低、中、高、超高         |
| `gpt-5.4`             | 否   | 否   | 文本、图像  | 低、中、高、超高         |
| `gpt-5.4-mini`        | 否   | 否   | 文本、图像  | 低、中、高、超高         |
| `gpt-5.3-codex`       | 否   | 否   | 文本、图像  | 低、中、高、超高         |
| `gpt-5.3-codex-spark` | 否   | 否   | 文本        | low, medium, high, xhigh |
| `gpt-5.2`             | 否   | 否   | text, image | low, medium, high, xhigh |

隐藏模型可以由应用服务器目录返回，用于内部或专用流程，但它们不是正常的模型选择器选项。

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

如果您希望启动时避免探测 Codex 并仅使用回退目录，请禁用发现：

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

Codex 通过原生项目文档发现自行处理 `AGENTS.md`OpenClaw。OpenClaw 不编写合成的 Codex 项目文档文件，也不依赖 Codex 后备文件名来查找角色文件，因为 Codex 后备机制仅在 `AGENTS.md` 缺失时才适用。

为了实现 OpenClaw 工作区对等性，Codex harness 会解析其他启动文件。`SOUL.md`、`IDENTITY.md`、`TOOLS.md` 和 `USER.md` 会作为 OpenClaw Codex 开发者指令被转发，因为它们定义了活动代理、可用的工作区指导和用户配置文件。精简的 OpenClaw 技能列表会作为轮次范围的协作开发者指令被转发。`HEARTBEAT.md` 内容不会被注入；心跳轮次会获得一个协作模式指针，以便在该文件存在且非空时读取它。当该工作区可用内存工具时，来自所配置代理工作区的 `MEMORY.md` 内容不会被粘贴到原生 Codex 轮次输入中；当它存在时，harness 会向轮次范围的协作开发者指令添加一个小型工作区内存指针，当持久内存相关时，Codex 应使用 `memory_search` 或 `memory_get`。如果工具被禁用、内存搜索不可用，或者活动工作区与代理内存工作区不同，`MEMORY.md` 将使用常规的有界轮次上下文路径。当存在 `BOOTSTRAP.md` 时，它会作为 OpenClaw 轮次输入参考上下文被转发。

## 环境覆盖

环境覆盖仍然可用于本地测试：

- `OPENCLAW_CODEX_APP_SERVER_BIN`
- `OPENCLAW_CODEX_APP_SERVER_ARGS`
- `OPENCLAW_CODEX_APP_SERVER_MODE=yolo|guardian`
- `OPENCLAW_CODEX_APP_SERVER_APPROVAL_POLICY`
- `OPENCLAW_CODEX_APP_SERVER_SANDBOX`

当未设置 `appServer.command` 时，`OPENCLAW_CODEX_APP_SERVER_BIN` 会绕过托管二进制文件。

`OPENCLAW_CODEX_APP_SERVER_GUARDIAN=1` 已被移除。请改用 `plugins.entries.codex.config.appServer.mode: "guardian"`，或者使用 `OPENCLAW_CODEX_APP_SERVER_MODE=guardian` 进行一次性本地测试。对于可重复部署，首选配置，因为它将插件行为保留在与 Codex harness 设置其余部分相同的已审核文件中。

## 相关

- [Codex harness](/zh/plugins/codex-harness)
- [Codex harness runtime](/zh/plugins/codex-harness-runtime)
- [Native Codex plugins](/zh/plugins/codex-native-plugins)
- [Codex Computer Use](/zh/plugins/codex-computer-use)
- [OpenAI 提供商](OpenAI/en/providers/openai)
- [配置参考](/zh/gateway/configuration-reference)
