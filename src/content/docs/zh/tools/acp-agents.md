---
summary: "CLIOpenClaw通过 ACP 后端运行外部编码工具（Claude Code、Cursor、Gemini CLI、显式 Codex ACP、OpenClaw ACP、OpenCode）"
read_when:
  - Running coding harnesses through ACP
  - Setting up conversation-bound ACP sessions on messaging channels
  - Binding a message-channel conversation to a persistent ACP session
  - Troubleshooting ACP backend, plugin wiring, or completion delivery
  - Operating /acp commands from chat
title: "ACP 代理"
sidebarTitle: "ACP 代理"
---

[Agent Client Protocol (ACP)](https://agentclientprotocol.com/) 会话
允许 OpenClaw 通过 ACP 后端插件运行外部编码工具（例如 Claude Code、
Cursor、Copilot、Droid、OpenClaw ACP、OpenCode、Gemini CLI 和其他
支持的 ACPX 工具）。

每个 ACP 会话的生成都作为[后台任务](/zh/automation/tasks)进行跟踪。

<Note>
**ACP 是外部工具路径，而非默认的 Codex 路径。** 原生
Codex 应用服务器插件拥有 `/codex ...` 控制权和用于代理轮次的默认
`openai/gpt-*` 嵌入式运行时；ACP 拥有
`/acp ...` 控制权和 `sessions_spawn({ runtime: "acp" })` 会话。

如果您希望 Codex 或 Claude Code 作为外部 MCP 客户端
直接连接到现有的 OpenClaw 渠道会话，请使用
[`openclaw mcp serve`](/zh/cli/mcp) 而非 ACP。

</Note>

## 我需要哪个页面？

| 您想要...                                                                 | 使用此                               | 备注                                                                                                                                     |
| ------------------------------------------------------------------------- | ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| 在当前会话中绑定或控制 Codex                                              | `/codex bind`, `/codex threads`      | 当启用 `codex` 插件时的原生 Codex 应用服务器路径；包括绑定聊天回复、图片转发、模型/快速/权限、停止和转向控制。ACP 是一个显式的回退选项。 |
| 通过 CLI 运行 Claude Code、Gemini OpenClaw、显式 Codex ACP 或其他外部工具 | 本页                                 | 聊天绑定会话、`/acp spawn`、`sessions_spawn({ runtime: "acp" })`、后台任务、运行时控制                                                   |
| 将 OpenClaw Gateway(网关) 会话作为 ACP 服务器暴露给编辑器或客户端         | [`openclaw acp`](/zh/cli/acp)        | 桥接模式。IDE/客户端通过 stdio/WebSocket 以 ACP 协议与 OpenClaw 通信                                                                     |
| 重用本地 AI CLI 作为纯文本回退模型                                        | [CLI 后端](/zh/gateway/cli-backends) | 不是 ACP。没有 OpenClaw 工具，没有 ACP 控件，没有工具运行时                                                                              |

## 这是否开箱即用？

是的，在安装了官方 ACP 运行时插件之后：

```bash
openclaw plugins install @openclaw/acpx
openclaw config set plugins.entries.acpx.enabled true
```

源码检出版本可以在 `pnpm install` 之后使用本地 `extensions/acpx` 工作区插件。运行 `/acp doctor` 进行就绪检查。

OpenClaw 仅在 ACP **真正可用** 时才向智能体传授有关 ACP 生成的知识：必须启用 ACP，不得禁用调度，当前会话不得被沙盒阻止，并且必须加载运行时后端。如果不满足这些条件，ACP 插件技能和 OpenClaw`sessions_spawn` ACP 指引将保持隐藏，以免智能体建议不可用的后端。

<AccordionGroup>
  <Accordion title="首次运行注意事项">
    - 如果设置了 `plugins.allow`，则它是一个限制性插件清单，**必须**包含 `acpx`；否则已安装的 ACP 后端将被有意阻止，并且 `/acp doctor` 会报告缺少允许列表条目。
    - Codex ACP 适配器暂存了 `acpx` 插件，并在可能的情况下在本地启动。
    - Codex ACP 使用隔离的 `CODEX_HOME` 运行；OpenClaw 会从主机 Codex 配置中复刻受信任的项目条目以及安全的模型/提供商路由配置，而身份验证、通知和钩子则保留在主机配置中。
    - 其他目标工具适配器可能仍需在您首次使用它们时通过 `npx` 按需获取。
    - 针对该工具的供应商身份验证仍必须存在于主机上。
    - 如果主机没有 npm 或网络访问权限，首次运行的适配器获取将失败，直到缓存预热或通过其他方式安装适配器。

  </Accordion>
  <Accordion title="运行时先决条件">
    ACP 会启动一个真实的外部 harness 进程。OpenClaw 负责路由、
    后台任务状态、交付、绑定和策略；而 harness
    负责其提供商登录、模型目录、文件系统行为和
    原生工具。

    在归咎于 OpenClaw 之前，请验证：

    - `/acp doctor` 报告了一个已启用且健康的后端。
    - 当设置了允许列表时，目标 id 被 `acp.allowedAgents` 允许。
    - Harness 命令可以在 Gateway(网关) 主机上启动。
    - 该 Harness 存在提供商身份验证（`claude`、`codex`、`gemini`、`opencode`、`droid` 等）。
    - 为该 Harness 选择的模型存在——模型 ID 在不同的 Harness 之间不可移植。
    - 请求的 `cwd` 存在且可访问，或者省略 `cwd` 并让后端使用其默认值。
    - 权限模式与工作匹配。非交互式会话无法点击原生权限提示，因此写入/执行繁重的编码运行通常需要能够无头（headlessly）进行的 ACPX 权限配置文件。

  </Accordion>
</AccordionGroup>

OpenClaw 插件工具和内置 OpenClaw 工具默认情况下
**不**向 ACP 工具公开。仅当工具
应该直接调用这些工具时，才在
[ACP agents - setup](/zh/tools/acp-agents-setup) 中启用显式 MCP 桥接。

## 支持的 Harness 目标

对于 `acpx` 后端，请将这些 harness id 用作 `/acp spawn <id>`
或 `sessions_spawn({ runtime: "acp", agentId: "<id>" })` 目标：

| Harness id | 典型后端                                                                  | 备注                                                                   |
| ---------- | ------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `claude`   | Claude Code ACP 适配器                                                    | 需要在主机上进行 Claude Code 身份验证。                                |
| `codex`    | Codex ACP 适配器                                                          | 仅当原生 `/codex` 不可用或请求 ACP 时，才作为显式 ACP 回退。           |
| `copilot`  | GitHub Copilot ACP 适配器                                                 | 需要 Copilot CLI/运行时身份验证。                                      |
| `cursor`   | Cursor CLI ACP (CLI`cursor-agent acp`)                                    | 如果本地安装公开了不同的 ACP 入口点，则覆盖 acpx 命令。                |
| `droid`    | Factory Droid CLI                                                         | 需要在 harness 环境中进行 Factory/Droid 认证或设置 `FACTORY_API_KEY`。 |
| `gemini`   | Gemini CLI ACP 适配器                                                     | 需要 Gemini CLI 认证或 API 密钥设置。                                  |
| `iflow`    | iFlow CLI                                                                 | 适配器可用性和模型控制取决于已安装的 CLI。                             |
| `kilocode` | Kilo Code CLI                                                             | 适配器可用性和模型控制取决于已安装的 CLI。                             |
| `kimi`     | Kimi/Moonshot CLI                                                         | 需要在主机上进行 Kimi/Moonshot 认证。                                  |
| `kiro`     | Kiro CLI                                                                  | 适配器可用性和模型控制取决于已安装的 CLI。                             |
| `opencode` | OpenCode ACP 适配器                                                       | 需要 OpenCode CLI/提供商认证。                                         |
| `openclaw` | 通过 OpenClawGateway(网关)`openclaw acp` 进行 OpenClaw Gateway(网关) 桥接 | 允许支持 ACP 的 harness 与 OpenClaw Gateway(网关) 会话进行回话。       |
| `qwen`     | Qwen Code / Qwen CLI                                                      | 要求主机上具有与 Qwen 兼容的身份验证。                                 |

可以在 acpx 本身中配置自定义 acpx 代理别名，但 OpenClaw
策略仍会在调度前检查 `acp.allowedAgents` 和任何
`agents.list[].runtime.acp.agent` 映射。

## Operator runbook

来自聊天的快速 `/acp` 流程：

<Steps>
  <Step title="生成">
    `/acp spawn claude --bind here`、
    `/acp spawn gemini --mode persistent --thread auto` 或显式
    `/acp spawn codex --bind here`。
  </Step>
  <Step title="Work">
    继续在绑定的对话或线程中操作（或明确指定会话密钥）。
  </Step>
  <Step title="Check state">
    `/acp status`
  </Step>
  <Step title="Tune">
    `/acp model <provider/model>`，
    `/acp permissions <profile>`，
    `/acp timeout <seconds>`。
  </Step>
  <Step title="Steer">
    在不替换上下文的情况下：`/acp steer tighten logging and continue`。
  </Step>
  <Step title="Stop">
    `/acp cancel`（当前轮次）或 `/acp close`（会话 + 绑定）。
  </Step>
</Steps>

<AccordionGroup>
  <Accordion title="生命周期详情">
    - Spawn 会创建或恢复 ACP 运行时会话，在 OpenClaw 会话存储中记录 ACP 元数据，并在运行由父级拥有时可能创建后台任务。
    - 父级拥有的 ACP 会话即使在运行时会话是持久化的情况下，也会被视为后台工作；完成和跨表面交付通过父级任务通知程序进行，而不是像普通用户面向聊天会话那样运行。
    - 任务维护会关闭终端或孤立的父级拥有的一次性 ACP 会话。只要存在活跃的对话绑定，持久化的 ACP 会话就会被保留；没有活跃绑定的陈旧持久化会话将被关闭，以便在拥有任务完成或其任务记录消失后无法静默恢复。
    - 绑定的后续消息直接发送到 ACP 会话，直到绑定关闭、失去焦点、重置或过期。
    - Gateway(网关) 命令保持在本地。`/acp ...`、`/status` 和 `/unfocus` 永远不会作为正常的提示文本发送到绑定的 ACP 驱动程序。
    - 当后端支持取消时，`cancel` 会中止当前的轮次；它不会删除绑定或会话元数据。
    - `close` 从 OpenClaw 的角度结束 ACP 会话并移除绑定。如果驱动程序支持恢复，它可能仍会保留自己的上游历史记录。
    - acpx 插件在 `close` 之后清理 OpenClaw 拥有的包装器和适配器进程树，并在 OpenClaw 启动期间清理陈旧的 Gateway(网关) 拥有的 ACPX 孤立进程。
    - 空闲的运行时工作器在 `acp.runtime.ttlMinutes` 之后可以被清理；存储的会话元数据在 `/acp sessions` 内仍然可用。

  </Accordion>
  <Accordion title="Native Codex routing rules"Discord>
    在启用 **native Codex plugin** 时应路由到该插件的自然语言触发器：

    - “将此 Discord 渠道绑定到 Codex。”
    - “将此聊天附加到 Codex 线程 `<id>`OpenClawOpenClawOpenClaw。”
    - “显示 Codex 线程，然后绑定此线程。”

    Native Codex 会话绑定是默认的聊天控制路径。OpenClaw 动态工具仍通过 OpenClaw 执行，而 Codex 原生工具（如 shell/apply-patch）则在 Codex 内部执行。对于 Codex 原生工具事件，OpenClaw 会注入一个逐轮原生钩子中继，以便插件钩子可以拦截 `before_tool_call`、观察 `after_tool_call`，并通过 OpenClaw 批准来路由 Codex `PermissionRequest`OpenClaw 事件。Codex `Stop`OpenClaw 钩子被中继到 OpenClaw `before_agent_finalize`，在此插件可以在 Codex 最终确定其答案之前请求再进行一次模型传递。该中继保持刻意的保守性：它不会改变 Codex 原生工具参数或重写 Codex 线程记录。仅当您需要 ACP 运行时/会话模型时才使用显式 ACP。嵌入式 Codex 支持边界记录在 [Codex harness v1 support contract](/zh/plugins/codex-harness-runtime#v1-support-contract) 中。

  </Accordion>
  <Accordion title="Model / 提供商 / runtime selection cheat sheet">
    - `openai-codex/*`OAuth - 由 doctor 修复的旧版 Codex OAuth/subscription 模型路由。
    - `openai/*`OpenAI - 用于 OpenAI 代理轮次的 native Codex app-server 嵌入式运行时。
    - `/codex ...` - native Codex 会话控制。
    - `/acp ...` 或 `runtime: "acp"` - 显式 ACP/acpx 控制。

  </Accordion>
  <Accordion title="ACP-routing natural-language triggers">
    应路由到 ACP 运行时的触发器：

    - "Run this as a one-shot Claude Code ACP 会话 and summarize the result."
    - "Use Gemini CLI for this task in a thread, then keep follow-ups in that same thread."
    - "Run Codex through ACP in a background thread."

    OpenClaw 拾取 `runtime: "acp"`，解析工具 `agentId`，
    在受支持时绑定到当前对话或线程，并将后续消息路由到该会话，直到关闭/过期。Codex 仅
    当明确使用 ACP/acpx 或请求的操作无法使用原生 Codex 插件时，才会遵循此路径。

    对于 `sessions_spawn`，只有在启用 ACP、请求者未被沙箱隔离以及加载了
    ACP 运行时后端时，才会通告 `runtime: "acp"`。`acp.dispatch.enabled=false` 会暂停
    自动 ACP 线程调度，但不会隐藏或阻止显式 `sessions_spawn({ runtime: "acp" })` 调用。它以 ACP 工具 id
    为目标，例如 `codex`、`claude`、`droid`、
    `gemini` 或 `opencode`。除非该条目已
    使用 `agents.list[].runtime.type="acp"` 显式配置，否则不要传递
    来自 `agents_list` 的普通 OpenClaw 配置代理 id；
    否则，请使用默认的子代理运行时。当 OpenClaw 代理配置了
    `runtime.type="acp"` 时，OpenClaw 会将
    `runtime.acp.agent` 用作底层工具 id。

  </Accordion>
</AccordionGroup>

## ACP 与子代理

当您需要外部工具运行时时，请使用 ACP。当启用 `codex` 插件时，请使用
**原生 Codex 应用服务器** 进行 Codex 对话绑定/控制。当您需要 OpenClaw 原生
委派运行时，请使用 **子代理**。

| 领域     | ACP 会话                              | 子代理运行                        |
| -------- | ------------------------------------- | --------------------------------- |
| 运行时   | ACP 后端插件（例如 acpx）             | OpenClaw 原生子代理运行时         |
| 会话密钥 | `agent:<agentId>:acp:<uuid>`          | `agent:<agentId>:subagent:<uuid>` |
| 主要命令 | `/acp ...`                            | `/subagents ...`                  |
| 生成工具 | `sessions_spawn` 搭配 `runtime:"acp"` | `sessions_spawn` (默认运行时)     |

另请参阅 [子代理](/zh/tools/subagents)。

## ACP 如何运行 Claude Code

对于通过 ACP 运行的 Claude Code，技术栈如下：

1. OpenClaw ACP 会话控制平面。
2. 官方 `@openclaw/acpx` 运行时插件。
3. Claude ACP 适配器。
4. Claude 侧的运行时/会话机制。

ACP Claude 是一个具有 ACP 控制、会话恢复、后台任务跟踪以及可选对话/线程绑定的 **harness 会话**。

CLI 后端是独立的纯文本本地后备运行时 - 请参阅 [CLI 后端](CLICLI/en/gateway/cli-backends)。

对于操作员来说，实用的规则是：

- **想要 `/acp spawn`、可绑定会话、运行时控制或持久的 harness 工作？** 请使用 ACP。
- **想要通过原始 CLI 进行简单的本地文本后备？** 请使用 CLI 后端。

## 绑定会话

### 思维模型

- **聊天界面** - 人们持续交谈的地方 (Discord 渠道、Telegram 主题、iMessage 聊天)。
- **ACP 会话** - OpenClaw 路由到的持久 Codex/Claude/Gemini 运行时状态。
- **子线程/主题** - 一个仅由 `--thread ...` 创建的可选额外消息界面。
- **运行时工作区** - harness 运行的文件系统位置 (`cwd`、repo checkout、后端工作区)。独立于聊天界面。

### 当前对话绑定

`/acp spawn <harness> --bind here`OpenClaw 将当前对话固定到
生成的 ACP 会话 - 无子线程，相同的聊天界面。OpenClaw 继续
拥有传输、身份验证、安全和递送功能。该对话中的后续消息
路由到同一会话；`/new` 和 `/reset` 原地重置
会话；`/acp close` 移除绑定。

示例：

```text
/codex bind                                              # native Codex bind, route future messages here
/codex model gpt-5.4                                     # tune the bound native Codex thread
/codex stop                                              # control the active native Codex turn
/acp spawn codex --bind here                             # explicit ACP fallback for Codex
/acp spawn codex --thread auto                           # may create a child thread/topic and bind there
/acp spawn codex --bind here --cwd /workspace/repo       # same chat binding, Codex runs in /workspace/repo
```

<AccordionGroup>
  <Accordion title="绑定规则和排他性">
    - `--bind here` 和 `--thread ...` 互斥。
    - `--bind here` 仅在声明支持当前会话绑定的频道上有效；否则 OpenClawDiscord 会返回明确的不支持消息。绑定在 Gateway(网关) 重启后依然保留。
    - 在 Discord 上，`spawnSessions` 会限制 `--thread auto|here` 的子线程创建——而非 `--bind here`。
    - 如果你在没有 `--cwd` 的情况下启动到另一个 ACP 代理，OpenClaw 默认会继承**目标代理的**工作区。缺失的继承路径（`ENOENT`/`ENOTDIR`）将回退到后端默认值；其他访问错误（例如 `EACCES`Gateway(网关)）将作为启动错误显示。
    - Gateway(网关) 管理命令保留在绑定的会话本地——`/acp ...` 命令由 OpenClaw 处理，即使正常的后续文本路由到绑定的 ACP 会话；`/status` 和 `/unfocus` 只要在该界面启用了命令处理，也会保留在本地。

  </Accordion>
  <Accordion title="Thread-bound sessions"OpenClaw>
    当为渠道适配器启用线程绑定时：

    - OpenClaw 将线程绑定到目标 ACP 会话。
    - 该线程中的后续消息将路由到绑定的 ACP 会话。
    - ACP 输出将传送回同一线程。
    - 失焦/关闭/归档/空闲超时或最大到期时间会移除该绑定。
    - `/acp close`、`/acp cancel`、`/acp status`、`/status` 和 `/unfocus`Gateway(网关) 是 Gateway(网关) 命令，而不是发送给 ACP harness 的提示词。

    线程绑定 ACP 所需的功能标志：

    - `acp.enabled=true`
    - `acp.dispatch.enabled` 默认处于开启状态（设置 `false` 以暂停自动 ACP 线程调度；显式的 `sessions_spawn({ runtime: "acp" })` 调用仍然有效）。
    - 渠道适配器线程会话生成已启用（默认：`true`Discord）：
      - Discord：`channels.discord.threadBindings.spawnSessions=true`Telegram
      - Telegram：`channels.telegram.threadBindings.spawnSessions=true`OpenClaw

    线程绑定支持取决于具体的适配器。如果当前活动的渠道适配器不支持线程绑定，OpenClaw 将返回一条明确的不支持/不可用消息。

  </Accordion>
  <Accordion title="Thread-supporting channels"DiscordTelegram>
    - 任何公开会话/线程绑定功能的渠道适配器。
    - 当前内置支持：**Discord** 线程/渠道、**Telegram** 话题（群组/超级群组中的论坛话题以及私信话题）。
    - 插件渠道可以通过相同的绑定接口添加支持。

  </Accordion>
</AccordionGroup>

## 持久化渠道绑定

对于非临时工作流，请在顶层 `bindings[]` 条目中配置持久化 ACP 绑定。

### 绑定模型

<ParamField path="bindings[].type" type='"acp"'>
  标记一个持久的 ACP 会话绑定。
</ParamField>
<ParamField path="bindings[].match" type="object">
  标识目标会话。按渠道区分的格式：

- **Discord 频道/主题：** Discord`match.channel="discord"` + `match.peer.id="<channelOrThreadId>"`
- **Slack 频道/私信：** Slack`match.channel="slack"` + `match.peer.id="<channelId|channel:<channelId>|#<channelId>|userId|user:<userId>|slack:<userId>|<@userId>>"`Slack。首选稳定的 Slack ID；频道绑定也会匹配该频道主题内的回复。
- **Telegram 论坛主题：** Telegram`match.channel="telegram"` + `match.peer.id="<chatId>:topic:<topicId>"`
- **iMessage 私信/群组：** iMessage`match.channel="imessage"` + `match.peer.id="<handle|chat_id:*|chat_guid:*|chat_identifier:*>"`。对于稳定的群组绑定，首选 `chat_id:*`。

</ParamField>
<ParamField path="bindings[].agentId" type="string"OpenClaw>
  拥有的 OpenClaw 代理 ID。
</ParamField>
<ParamField path="bindings[].acp.mode" type='"persistent" | "oneshot"'>
  可选的 ACP 覆盖。
</ParamField>
<ParamField path="bindings[].acp.label" type="string">
  可选的操作员面向标签。
</ParamField>
<ParamField path="bindings[].acp.cwd" type="string">
  可选的运行时工作目录。
</ParamField>
<ParamField path="bindings[].acp.backend" type="string">
  可选的后端覆盖。
</ParamField>

### 每个代理的运行时默认值

使用 `agents.list[].runtime` 为每个代理定义一次 ACP 默认值：

- `agents.list[].runtime.type="acp"`
- `agents.list[].runtime.acp.agent`（工具 ID，例如 `codex` 或 `claude`）
- `agents.list[].runtime.acp.backend`
- `agents.list[].runtime.acp.mode`
- `agents.list[].runtime.acp.cwd`

**ACP 绑定会话的覆盖优先级：**

1. `bindings[].acp.*`
2. `agents.list[].runtime.acp.*`
3. 全局 ACP 默认值（例如 `acp.backend`）

### 示例

```json5
{
  agents: {
    list: [
      {
        id: "codex",
        runtime: {
          type: "acp",
          acp: {
            agent: "codex",
            backend: "acpx",
            mode: "persistent",
            cwd: "/workspace/openclaw",
          },
        },
      },
      {
        id: "claude",
        runtime: {
          type: "acp",
          acp: { agent: "claude", backend: "acpx", mode: "persistent" },
        },
      },
    ],
  },
  bindings: [
    {
      type: "acp",
      agentId: "codex",
      match: {
        channel: "discord",
        accountId: "default",
        peer: { kind: "channel", id: "222222222222222222" },
      },
      acp: { label: "codex-main" },
    },
    {
      type: "acp",
      agentId: "claude",
      match: {
        channel: "telegram",
        accountId: "default",
        peer: { kind: "group", id: "-1001234567890:topic:42" },
      },
      acp: { cwd: "/workspace/repo-b" },
    },
    {
      type: "route",
      agentId: "main",
      match: { channel: "discord", accountId: "default" },
    },
    {
      type: "route",
      agentId: "main",
      match: { channel: "telegram", accountId: "default" },
    },
  ],
  channels: {
    discord: {
      guilds: {
        "111111111111111111": {
          channels: {
            "222222222222222222": { requireMention: false },
          },
        },
      },
    },
    telegram: {
      groups: {
        "-1001234567890": {
          topics: { "42": { requireMention: false } },
        },
      },
    },
  },
}
```

### 行为

- OpenClaw 确保在使用前配置的 ACP 会话存在。
- 该频道或主题中的消息路由到配置的 ACP 会话。
- 在绑定的会话中，`/new` 和 `/reset` 会原位重置相同的 ACP 会话密钥。
- 临时运行时绑定（例如由线程聚焦流程创建的绑定）在存在时仍然适用。
- 对于没有显式 `cwd`OpenClaw 的跨代理 ACP 生成，OpenClaw 从代理配置继承目标代理工作区。
- 缺少的继承工作区路径将回退到后端默认的 cwd（当前工作目录）；非缺失的访问失败将作为生成错误呈现。

## 启动 ACP 会话

启动 ACP 会话有两种方式：

<Tabs>
  <Tab title="From sessions_spawn">
    使用 `runtime: "acp"` 从代理轮次或工具调用启动 ACP 会话。

    ```json
    {
      "task": "Open the repo and summarize failing tests",
      "runtime": "acp",
      "agentId": "codex",
      "thread": true,
      "mode": "session"
    }
    ```

    <Note>
    `runtime` 默认为 `subagent`，因此请为 ACP 会话显式设置 `runtime: "acp"`。如果省略了 `agentId`OpenClaw，OpenClaw 在配置时会使用 `acp.defaultAgent`。`mode: "session"` 需要 `thread: true` 来保持持久化的绑定对话。
    </Note>

  </Tab>
  <Tab title="From /acp command">
    使用 `/acp spawn` 进行来自聊天的显式操作员控制。

    ```text
    /acp spawn codex --mode persistent --thread auto
    /acp spawn codex --mode oneshot --thread off
    /acp spawn codex --bind here
    /acp spawn codex --thread here
    ```

    关键标志：

    - `--mode persistent|oneshot`
    - `--bind here|off`
    - `--thread auto|here|off`
    - `--cwd <absolute-path>`
    - `--label <name>`

    参见 [Slash commands](/zh/tools/slash-commands)。

  </Tab>
</Tabs>

### `sessions_spawn` 参数

<ParamField path="task" type="string" required>
  发送到 ACP 会话的初始提示词。
</ParamField>
<ParamField path="runtime" type='"acp"' required>
  对于 ACP 会话，必须为 `"acp"`。
</ParamField>
<ParamField path="agentId" type="string">
  ACP 目标 harness ID。如果已设置，则回退到 `acp.defaultAgent`。
</ParamField>
<ParamField path="thread" type="boolean" default="false">
  请求线程绑定流程（如果支持）。
</ParamField>
<ParamField path="mode" type='"run" | "session"' default="run">
  `"run"` 为一次性；`"session"` 为持久化。如果省略 `thread: true` 和
  `mode`，OpenClaw 可能会根据运行时路径默认为持久化行为。`mode: "session"` 需要 `thread: true`。
</ParamField>
<ParamField path="cwd" type="string">
  请求的运行时工作目录（由后端/运行时策略验证）。如果省略，则在配置时 ACP 生成会继承目标代理工作区；缺失的继承路径会回退到后端默认值，而实际的访问错误会被返回。
</ParamField>
<ParamField path="label" type="string">
  用于会话/横幅文本的操作员面向的标签。
</ParamField>
<ParamField path="resumeSessionId" type="string">
  恢复现有的 ACP 会话而不是创建新会话。代理通过 `session/load` 重放其对话历史。需要
  `runtime: "acp"`。
</ParamField>
<ParamField path="streamTo" type='"parent"'>
  `"parent"` 将初始 ACP 运行进度摘要作为系统事件流式传输回请求者会话。接受的响应包括
  指向会话范围 JSONL 日志（`<sessionId>.acp-stream.jsonl`）的 `streamLogPath`，您可以跟踪该日志以获取完整的中继历史。
</ParamField>
<ParamField path="runTimeoutSeconds" type="number">
  在 N 秒后中止 ACP 子轮次。`0` 使轮次保持在
  Gateway(网关) 的无超时路径上。相同的值应用于 OpenClaw
  运行和 ACP 运行时，以避免停滞/配额耗尽的 harness 无限期地占用父代理通道。
</ParamField>
<ParamField path="model" type="string">
  ACP 子会话的显式模型覆盖。Codex ACP 生成
  会将 OpenClaw Codex 引用（如 `openai-codex/gpt-5.4`）规范化为 Codex
  ACP 启动配置，然后再进行 `session/new`；斜杠形式（如
  `openai-codex/gpt-5.4/high`）也会设置 Codex ACP 推理强度。
  其他 harness 必须通告 ACP `models` 并支持
  `session/set_model`；否则 OpenClaw/acpx 将明确失败，而不是
  默默回退到目标代理默认值。
</ParamField>
<ParamField path="thinking" type="string">
  显式思考/推理强度。对于 Codex ACP，`minimal` 映射到
  低强度，`low`/`medium`/`high`/`xhigh` 直接映射，而 `off`
  会省略推理强度启动覆盖。
</ParamField>

## 生成绑定和线程模式

<Tabs>
  <Tab title="--bind here|off">
    | 模式   | 行为                                                               |
    | ------ | ---------------------------------------------------------------------- |
    | `here` | 就地绑定当前活动对话；如果没有活动对话则失败。 |
    | `off`  | 不创建当前对话绑定。                          |

    注意：

    - `--bind here` 是“使此渠道或聊天支持 Codex”的最简单操作路径。
    - `--bind here` 不创建子线程。
    - `--bind here` 仅在支持当前对话绑定的渠道上可用。
    - `--bind` 和 `--thread` 不能在同一个 `/acp spawn` 调用中组合使用。

  </Tab>
  <Tab title="--thread auto|here|off">
    | 模式   | 行为                                                                                            |
    | ------ | --------------------------------------------------------------------------------------------------- |
    | `auto` | 在活动线程中：绑定该线程。在线程外：如果支持，则创建/绑定子线程。 |
    | `here` | 需要当前活动线程；如果未处于线程中则失败。                                                  |
    | `off`  | 无绑定。会话以未绑定状态启动。                                                                 |

    注意：

    - 在非线程绑定界面上，默认行为实际上是 `off`。
    - 线程绑定生成需要渠道策略支持：
      - Discord：`channels.discord.threadBindings.spawnSessions=true`
      - Telegram：`channels.telegram.threadBindings.spawnSessions=true`
    - 当您希望固定当前对话而不创建子线程时，请使用 `--bind here`。

  </Tab>
</Tabs>

## 交付模型

ACP 会话可以是交互式工作区，也可以是父级拥有的后台工作。交付路径取决于该形式。

<AccordionGroup>
  <Accordion title="交互式 ACP 会话">
    交互式会话旨在在可见的聊天表面上保持对话：

    - `/acp spawn ... --bind here` 将当前对话绑定到 ACP 会话。
    - `/acp spawn ... --thread ...` 将渠道线程/主题绑定到 ACP 会话。
    - 持久配置的 `bindings[].type="acp"`OpenClaw 将匹配的对话路由到同一个 ACP 会话。

    绑定对话中的后续消息直接路由到 ACP 会话，ACP 输出将传回同一个渠道/线程/主题。

    OpenClaw 发送给工具的内容：

    - 普通的绑定后续消息作为提示文本发送，并且仅当工具/后端支持时才包含附件。
    - `/acp`Gateway(网关)OpenClawOpenClaw 管理命令和本地 Gateway(网关) 命令会在 ACP 分发前被拦截。
    - 运行时生成的补全事件会按目标具体化。OpenClaw 代理获取 OpenClaw 的内部运行时上下文信封；外部 ACP 工具获取包含子结果和指令的纯提示。原始 `<<<BEGIN_OPENCLAW_INTERNAL_CONTEXT>>>`OpenClaw 信封绝不应发送给外部工具或作为 ACP 用户转录文本持久化。
    - ACP 转录条目使用用户可见的触发文本或纯补全提示。内部事件元数据尽可能在 OpenClaw 中保持结构化，并且不被视为用户创作的聊天内容。

  </Accordion>
  <Accordion title="Parent-owned one-shot ACP sessions">
    由另一个代理运行生成的 One-shot ACP 会话是后台
    子级，类似于子代理：

    - 父级使用 `sessions_spawn({ runtime: "acp", mode: "run" })`OpenClawOpenClaw 请求工作。
    - 子级在其自己的 ACP harness 会话中运行。
    - 子级轮次在与原生子代理生成所使用的同一后台通道上运行，因此缓慢的 ACP harness 不会阻塞不相关的主会话工作。
    - 完成报告通过任务完成通告路径传回。OpenClaw 在将内部完成元数据发送到外部 harness 之前将其转换为纯 ACP 提示，因此 harness 不会看到 OpenClaw 专有的运行时上下文标记。
    - 当需要面向用户的回复时，父级会用正常的助手语音重写子级结果。

    请**勿**将此路径视为父级
    和子级之间的点对点聊天。子级已经有一个返回到
    父级的完成渠道。

  </Accordion>
  <Accordion title="sessions_send and A2A delivery">
    `sessions_send`OpenClaw 可以在生成后定位另一个会话。对于正常
    的对等会话，OpenClaw 在注入消息后使用代理对代理 (A2A) 后续路径：

    - 等待目标会话的回复。
    - 可选择性地让请求者和目标交换有限数量的后续轮次。
    - 请求目标生成通告消息。
    - 将该通告传递到可见渠道或线程。

    该 A2A 路径是发送者需要
    可见后续内容的对等发送的回退方案。当不相关的会话可以
    查看并向 ACP 目标发送消息时，例如在广泛的
    `tools.sessions.visibility`OpenClaw 设置下，它保持启用状态。

    OpenClaw 仅在请求者是其自身拥有的 one-shot ACP 子级的
    父级时才跳过 A2A 后续。在这种情况下，
    在任务完成之上运行 A2A 可以使用子级结果唤醒父级，
    将父级的回复转发回子级，并
    创建父/子回声循环。`sessions_send` 结果报告
    `delivery.status="skipped"` 针对该拥有的子级情况，因为
    完成路径已负责结果。

  </Accordion>
  <Accordion title="恢复现有会话">
    使用 `resumeSessionId` 来继续之前的 ACP 会话，而不是
    重新开始。Agent 通过 `session/load` 重放其对话历史，
    因此它能完全了解之前发生的事情。

    ```json
    {
      "task": "Continue where we left off - fix the remaining test failures",
      "runtime": "acp",
      "agentId": "codex",
      "resumeSessionId": "<previous-session-id>"
    }
    ```

    常见用例：

    - 将 Codex 会话从笔记本电脑转移到手机上——让 Agent 接着之前的工作继续。
    - 继续您在 CLI 中以交互方式开始的编码会话，现在通过 Agent 以无头模式继续。
    - 恢复因网关重启或空闲超时而中断的工作。

    注意：

    - `resumeSessionId` 仅在 `runtime: "acp"` 时适用；默认的子 Agent 运行时会忽略此 ACP 专用字段。
    - `streamTo` 仅在 `runtime: "acp"` 时适用；默认的子 Agent 运行时会忽略此 ACP 专用字段。
    - `resumeSessionId` 是主机本地的 ACP/harness 恢复 ID，而不是 OpenClaw 渠道会话密钥；OpenClaw 仍然会在调度前检查 ACP 生成策略和目标 Agent 策略，而 ACP 后端或 harness 拥有加载该上游 ID 的授权。
    - `resumeSessionId` 恢复上游 ACP 对话历史；`thread` 和 `mode` 仍然正常适用于您正在创建的新 OpenClaw 会话，因此 `mode: "session"` 仍然需要 `thread: true`。
    - 目标 Agent 必须支持 `session/load`（Codex 和 Claude Code 支持）。
    - 如果找不到会话 ID，生成将失败并显示明确的错误——不会静默回退到新会话。

  </Accordion>
  <Accordion title="部署后的冒烟测试">
    在 Gateway(网关) 部署后，运行一个实时的端到端检查，而不是
    信任单元测试：

    1. 在目标主机上验证已部署的 Gateway(网关) 版本和提交记录。
    2. 打开一个临时的 ACPX 桥接会话 到一个实时 agent。
    3. 请求该 agent 调用 `sessions_spawn`，参数为 `runtime: "acp"`、`agentId: "codex"`、`mode: "run"` 和 task `Reply with exactly LIVE-ACP-SPAWN-OK`。
    4. 验证 `accepted=yes`、一个真正的 `childSessionKey`，以及没有验证器错误。
    5. 清理临时桥接会话。

    保持 gateway 开启 `mode: "run"` 并跳过 `streamTo: "parent"` -
    线程绑定的 `mode: "session"` 和流中继路径是分开的
    更丰富的集成阶段。

  </Accordion>
</AccordionGroup>

## 沙箱 兼容性

ACP 会话当前在主机运行时上运行，**不**在
OpenClaw 沙箱 内部。

<Warning>
**安全边界：**

- 外部 harness 可以根据其自己的 CLI 权限和所选的 CLI`cwd`OpenClawOpenClawGateway(网关) 进行读/写。
- OpenClaw 的沙箱策略 **不**封装 ACP harness 的执行。
- OpenClaw 仍然执行 ACP 功能门控、允许的 agent、会话所有权、渠道 绑定和 Gateway(网关) 投递策略。
- 使用 `runtime: "subagent"`OpenClaw 进行沙箱 强制执行的 OpenClaw 原生工作。

</Warning>

当前限制：

- 如果请求者会话是沙箱隔离 的，则对于 `sessions_spawn({ runtime: "acp" })` 和 `/acp spawn`，ACP 生成都会被阻止。
- 带有 `runtime: "acp"` 的 `sessions_spawn` 不支持 `sandbox: "require"`。

## 会话 目标解析

大多数 `/acp` 动作接受一个可选的会话 目标 (`session-key`，
`session-id` 或 `session-label`)。

**解析顺序：**

1. 显式目标参数（或用于 `/acp steer` 的 `--session`）
   - 然后是键
   - 然后是 UUID 形状的会话 id
   - 然后是标签
2. 当前线程绑定（如果此对话/线程已绑定到 ACP 会话）。
3. 当前请求者会话回退。

当前对话绑定和线程绑定都参与
步骤 2。

如果未解析到目标，OpenClaw 将返回明确的错误
(OpenClaw`Unable to resolve session target: ...`)。

## ACP 控制

| 命令                 | 功能                                      | 示例                                                          |
| -------------------- | ----------------------------------------- | ------------------------------------------------------------- |
| `/acp spawn`         | 创建 ACP 会话；可选的当前绑定或线程绑定。 | `/acp spawn codex --bind here --cwd /repo`                    |
| `/acp cancel`        | 取消目标会话的进行中轮次。                | `/acp cancel agent:codex:acp:<uuid>`                          |
| `/acp steer`         | 向运行中的会话发送引导指令。              | `/acp steer --session support inbox prioritize failing tests` |
| `/acp close`         | 关闭会话并解除线程目标绑定。              | `/acp close`                                                  |
| `/acp status`        | 显示后端、模式、状态、运行时选项、能力。  | `/acp status`                                                 |
| `/acp set-mode`      | 设置目标会话的运行时模式。                | `/acp set-mode plan`                                          |
| `/acp set`           | 通用运行时配置选项写入。                  | `/acp set model openai/gpt-5.4`                               |
| `/acp cwd`           | 设置运行时工作目录覆盖。                  | `/acp cwd /Users/user/Projects/repo`                          |
| `/acp permissions`   | 设置批准策略配置文件。                    | `/acp permissions strict`                                     |
| `/acp timeout`       | 设置运行时超时（秒）。                    | `/acp timeout 120`                                            |
| `/acp model`         | 设置运行时模型覆盖。                      | `/acp model anthropic/claude-opus-4-6`                        |
| `/acp reset-options` | 移除会话运行时选项覆盖。                  | `/acp reset-options`                                          |
| `/acp sessions`      | 列出存储中的近期 ACP 会话。               | `/acp sessions`                                               |
| `/acp doctor`        | 后端健康状况、能力、可执行的修复措施。    | `/acp doctor`                                                 |
| `/acp install`       | 打印确定性的安装和启用步骤。              | `/acp install`                                                |

`/acp status` 显示有效的运行时选项以及运行时级和后端级会话标识符。当后端缺少某项功能时，不支持的控件错误会清晰地显示出来。`/acp sessions` 读取当前绑定或请求者会话的存储；目标令牌（`session-key`、`session-id` 或 `session-label`）通过网关会话发现进行解析，包括自定义的每个代理 `session.store` 根目录。

### 运行时选项映射

`/acp` 具有便捷命令和一个通用设置器。等效操作：

| 命令                         | 映射到                       | 备注                                                                                                                                                                                   |
| ---------------------------- | ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/acp model <id>`            | 运行时配置键 `model`         | 对于 Codex ACP，OpenClaw 会将 `openai-codex/<model>` 规范化为适配器模型 ID，并将斜杠推理后缀（例如 `openai-codex/gpt-5.4/high`）映射到 `reasoning_effort`。                            |
| `/acp set thinking <level>`  | 规范选项 `thinking`          | 如果存在后端通告的等效项，OpenClaw 会优先发送它，依次优先选择 `thinking`、`effort`、`reasoning_effort` 或 `thought_level`。对于 Codex ACP，适配器会将这些值映射到 `reasoning_effort`。 |
| `/acp permissions <profile>` | 规范选项 `permissionProfile` | 如果存在后端通告的等效项，OpenClaw 会发送该等效项，例如 `approval_policy`、`permission_profile`、`permissions` 或 `permission_mode`。                                                  |
| `/acp timeout <seconds>`     | 规范选项 `timeoutSeconds`    | 如果存在后端通告的等效项，OpenClaw 会发送该等效项，例如 `timeout` 或 `timeout_seconds`。                                                                                               |
| `/acp cwd <path>`            | 运行时 cwd 覆盖              | 直接更新。                                                                                                                                                                             |
| `/acp set <key> <value>`     | 通用                         | `key=cwd` 使用 cwd 覆盖路径。                                                                                                                                                          |
| `/acp reset-options`         | 清除所有运行时覆盖项         | -                                                                                                                                                                                      |

## acpx harness、插件设置和权限

有关 acpx harness 配置（Claude Code / Codex / Gemini CLI 别名）、plugin-tools 和 OpenClaw-tools MCP 桥接以及 ACP 权限模式，请参阅 [ACP agents - setup](/zh/tools/acp-agents-setup)。

## 故障排除

| 症状                                                                        | 可能原因                                                                       | 修复                                                                                                                                                                |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ACP runtime backend is not configured`                                     | 后端插件缺失、已禁用或被 `plugins.allow` 阻止。                                | 安装并启用后端插件，如果设置了允许列表，请在 `plugins.allow` 中包含 `acpx`，然后运行 `/acp doctor`。                                                                |
| `ACP is disabled by policy (acp.enabled=false)`                             | ACP 全局已禁用。                                                               | 设置 `acp.enabled=true`。                                                                                                                                           |
| `ACP dispatch is disabled by policy (acp.dispatch.enabled=false)`           | 已禁用从普通线程消息自动调度。                                                 | 设置 `acp.dispatch.enabled=true` 以恢复自动线程路由；显式的 `sessions_spawn({ runtime: "acp" })` 调用仍然有效。                                                     |
| `ACP agent "<id>" is not allowed by policy`                                 | Agent 不在允许列表中。                                                         | 使用允许的 `agentId` 或更新 `acp.allowedAgents`。                                                                                                                   |
| `/acp doctor` 报告启动后后端未就绪                                          | 后端插件缺失、已禁用、被允许/拒绝策略阻止，或者其配置的可执行文件不可用。      | 安装/启用后端插件，重新运行 `/acp doctor`，如果它仍然不健康，请检查后端安装或策略错误。                                                                             |
| 未找到 Harness 命令                                                         | 未安装适配器 CLI，外部插件缺失，或者非 Codex 适配器的首次运行 `npx` 获取失败。 | 运行 `/acp doctor`，在 Gateway(网关) 主机上安装/预热适配器，或显式配置 acpx agent 命令。                                                                            |
| 来自 Harness 的模型未找到错误                                               | 模型 ID 对另一个提供商/harness 有效，但对此 ACP 目标无效。                     | 使用该 harness 列出的模型，在 harness 中配置模型，或者省略覆盖设置。                                                                                                |
| 来自 Harness 的供应商身份验证错误                                           | OpenClaw 状态正常，但目标 CLI/提供商未登录。                                   | 登录或在 Gateway(网关) 主机环境中提供所需的提供商密钥。                                                                                                             |
| `Unable to resolve session target: ...`                                     | 错误的密钥/ID/标签令牌。                                                       | 运行 `/acp sessions`，复制确切的密钥/标签，然后重试。                                                                                                               |
| `--bind here requires running /acp spawn inside an active ... conversation` | `--bind here` 在没有可绑定的活动会话时使用。                                   | 移动到目标聊天/渠道并重试，或使用未绑定的生成。                                                                                                                     |
| `Conversation bindings are unavailable for <channel>.`                      | 适配器缺少当前会话 ACP 绑定功能。                                              | 在支持的地方使用 `/acp spawn ... --thread ...`，配置顶级 `bindings[]`，或移动到支持的渠道。                                                                         |
| `--thread here requires running /acp spawn inside an active ... thread`     | `--thread here` 在线程上下文之外使用。                                         | 移动到目标线程或使用 `--thread auto`/`off`。                                                                                                                        |
| `Only <user-id> can rebind this channel/conversation/thread.`               | 另一个用户拥有活动绑定目标。                                                   | 以所有者身份重新绑定，或使用不同的会话或线程。                                                                                                                      |
| `Thread bindings are unavailable for <channel>.`                            | 适配器缺少线程绑定功能。                                                       | 使用 `--thread off` 或移动到支持的适配器/渠道。                                                                                                                     |
| `Sandboxed sessions cannot spawn ACP sessions ...`                          | ACP 运行时位于主机端；请求者会话已沙箱隔离。                                   | 从沙箱隔离的会话使用 `runtime="subagent"`，或从非沙箱隔离的会话运行 ACP 生成。                                                                                      |
| `sessions_spawn sandbox="require" is unsupported for runtime="acp" ...`     | 为 ACP 运行时请求了 `sandbox="require"`。                                      | 使用 `runtime="subagent"` 进行所需的沙箱隔离，或在非沙箱隔离的会话中使用带 `sandbox="inherit"` 的 ACP。                                                             |
| `Cannot apply --model ... did not advertise model support`                  | 目标工具未暴露通用 ACP 模型切换功能。                                          | 使用宣传支持 ACP `models`/`session/set_model` 的工具，使用 Codex ACP 模型引用，或者如果工具有自己的启动标志，则直接在其中配置模型。                                 |
| 绑定会话缺少 ACP 元数据                                                     | 过时/已删除的 ACP 会话元数据。                                                 | 使用 `/acp spawn` 重新创建，然后重新绑定/聚焦线程。                                                                                                                 |
| `AcpRuntimeError: Permission prompt unavailable in non-interactive mode`    | `permissionMode` 阻止在非交互式 ACP 会话中进行写入/执行。                      | 将 `plugins.entries.acpx.config.permissionMode` 设置为 `approve-all` 并重启 Gateway(网关)。请参阅 [权限配置](/zh/tools/acp-agents-setup#permission-configuration)。 |
| ACP 会话提前失败，且输出甚少                                                | 权限提示被 `permissionMode`/`nonInteractivePermissions` 阻止。                 | 检查 Gateway(网关) 日志中的 `AcpRuntimeError`。如需完整权限，请设置 `permissionMode=approve-all`；如需优雅降级，请设置 `nonInteractivePermissions=deny`。           |
| ACP 会话在完成工作后无限期停滞                                              | Harness 进程已结束，但 ACP 会话未报告完成状态。                                | 更新 OpenClaw；当前的 acpx 清理机制会在关闭和 OpenClaw 启动时回收 Gateway(网关) 拥有的陈旧包装器和适配器进程。                                                      |
| Harness 看到 `<<<BEGIN_OPENCLAW_INTERNAL_CONTEXT>>>`                        | 内部事件信封在 ACP 边界处泄漏。                                                | 更新 OpenClaw 并重新运行完成流程；外部 Harness 应仅接收纯文本完成提示。                                                                                             |

<Note>`Command blocked by PreToolUse hook: Native hook relay unavailable` 属于 原生 Codex hook 中继，而非 ACP/acpx。在绑定的 Codex 聊天中，使用 `/new` 或 `/reset` 启动一个新会话；如果它工作一次后在下一个原生工具调用时又出现问题，请重启 Codex 应用服务器或 OpenClaw Gateway(网关)，而 不是重复 `/new`。请参阅 [Codex harness 故障排除](/zh/plugins/codex-harness#troubleshooting)。</Note>

## 相关

- [ACP 代理 - 设置](/zh/tools/acp-agents-setup)
- [代理发送](/zh/tools/agent-send)
- [CLI 后端](/zh/gateway/cli-backends)
- [Codex harness](/zh/plugins/codex-harness)
- [Codex harness 运行时](/zh/plugins/codex-harness-runtime)
- [多代理沙盒工具](/zh/tools/multi-agent-sandbox-tools)
- [`openclaw acp` (桥接模式)](/zh/cli/acp)
- [子代理](/zh/tools/subagents)
