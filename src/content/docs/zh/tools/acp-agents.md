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

[Agent Client Protocol (ACP)](https://agentclientprotocol.com/) 会话允许 OpenClaw 通过 ACP 后端插件运行外部编码工具（例如 Pi、Claude Code、Cursor、Copilot、Droid、OpenClaw ACP、OpenCode、Gemini CLI 以及其他受支持的 ACPX 工具）。

每个 ACP 会话的生成都会作为[后台任务](/zh/automation/tasks)被跟踪。

<Note>
**ACP 是外部工具路径，而非默认的 Codex 路径。** 原生 Codex 应用服务器插件拥有 `/codex ...` 控制权和用于代理轮次的默认 `openai/gpt-*` 嵌入式运行时；ACP 拥有 `/acp ...` 控制权和 `sessions_spawn({ runtime: "acp" })` 会话。

如果您希望 Codex 或 Claude Code 作为外部 MCP 客户端直接连接到现有的 OpenClaw 渠道会话，请使用 [`openclaw mcp serve`](/zh/cli/mcp) 而非 ACP。

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
    - 如果设置了 `plugins.allow`，则它是一个限制性插件清单，并且**必须**包含 `acpx`；否则安装的 ACP 后端将被有意阻止，并且 `/acp doctor` 会报告缺失的允许列表条目。
    - Codex ACP 适配器与 `acpx` 插件一起暂存，并在可能的情况下在本地启动。
    - Codex ACP 使用隔离的 `CODEX_HOME`OpenClaw 运行；OpenClaw 仅从主机 Codex 配置中复制受信任的项目条目并信任活动工作区，将身份验证、通知和挂钩保留在主机配置上。
    - 其他目标线束适配器可能仍会在您首次使用它们时通过 `npx`npm 按需获取。
    - 该线程的供应商身份验证仍必须存在于主机上。
    - 如果主机没有 npm 或网络访问权限，首次运行适配器获取将失败，直到缓存预热或通过其他方式安装适配器。

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

OpenClaw 插件工具和内置的 OpenClaw 工具默认情况下**不**暴露给
ACP harness。仅当 Harness
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
| `pi`       | Pi/嵌入式 OpenClaw 运行时                                                 | 用于 OpenClaw 原生 harness 实验。                                      |
| `qwen`     | Qwen Code / Qwen CLI                                                      | 需要在主机上进行兼容 Qwen 的认证。                                     |

自定义 acpx 代理别名可以在 acpx 本身中配置，但在分发之前，OpenClaw 策略仍会检查 OpenClaw`acp.allowedAgents` 和任何 `agents.list[].runtime.acp.agent` 映射。

## Operator runbook

来自聊天的快速 `/acp` 流程：

<Steps>
  <Step title="生成">
    `/acp spawn claude --bind here`、
    `/acp spawn gemini --mode persistent --thread auto` 或显式
    `/acp spawn codex --bind here`。
  </Step>
  <Step title="工作">
    在绑定的会话或线程中继续（或显式定位会话密钥）。
  </Step>
  <Step title="检查状态">
    `/acp status`
  </Step>
  <Step title="调整">
    `/acp model <provider/model>`、
    `/acp permissions <profile>`、
    `/acp timeout <seconds>`。
  </Step>
  <Step title="引导">
    无需替换上下文：`/acp steer tighten logging and continue`。
  </Step>
  <Step title="停止">
    `/acp cancel`（当前轮次）或 `/acp close`（会话 + 绑定）。
  </Step>
</Steps>

<AccordionGroup>
  <Accordion title="生命周期详情">
    - 生成会创建或恢复一个 ACP 运行时会话，在 OpenClaw 会话存储中记录 ACP 元数据，并且当运行由父级拥有时可能会创建一个后台任务。
    - 即使运行时会话是持久的，父级拥有的 ACP 会话仍被视为后台工作；完成和跨表面交付通过父级任务通知程序进行，而不是像普通的面向用户的聊天会话那样运作。
    - 任务维护会关闭终端或孤立的父级拥有的一次性 ACP 会话。只要存在活跃的对话绑定，持久的 ACP 会话就会被保留；没有活跃绑定的陈旧持久会话将被关闭，以便在拥有任务完成或其任务记录消失后无法静默恢复。
    - 绑定的后续消息直接发送到 ACP 会话，直到绑定被关闭、失去焦点、重置或过期。
    - Gateway(网关) 命令保持在本地。`/acp ...`、`/status` 和 `/unfocus` 永远不会作为普通的提示文本发送到绑定的 ACP 工具。
    - 当后端支持取消时，`cancel` 会中止当前的活动轮次；它不会删除绑定或会话元数据。
    - 从 OpenClaw 的角度来看，`close` 结束 ACP 会话并移除绑定。如果工具支持恢复，它可能仍会保留自己的上游历史记录。
    - acpx 插件会在 `close` 之后清理 OpenClaw 拥有的包装器和适配器进程树，并在 OpenClaw 启动期间回收陈旧的 Gateway(网关) 拥有的 ACPX 孤立进程。
    - 空闲的运行时工作器在 `acp.runtime.ttlMinutes` 之后有资格被清理；存储的会话元数据在 `/acp sessions` 内仍然可用。

  </Accordion>
  <Accordion title="Native Codex 路由规则"Discord>
    在启用时，应路由到 **原生 Codex 插件** 的自然语言触发器：

    - “将此 Discord 渠道绑定到 Codex。”
    - “将此聊天附加到 Codex 线程 `<id>`OpenClawOpenClawOpenClaw。”
    - “显示 Codex 线程，然后绑定此线程。”

    原生 Codex 对话绑定是默认的聊天控制路径。OpenClaw 动态工具仍通过 OpenClaw 执行，而原生 Codex 工具（如 shell/apply-patch）则在 Codex 内部执行。对于原生 Codex 工具事件，OpenClaw 会注入一个每轮次的原生挂钩中继，以便插件挂钩可以阻止 `before_tool_call`、观察 `after_tool_call`，并通过 OpenClaw 审批路由 Codex `PermissionRequest`OpenClaw 事件。Codex `Stop`OpenClaw 挂钩被中继到 OpenClaw `before_agent_finalize`，插件可以在 Codex 最终确定其答案之前请求再一次模型传递。该中继保持刻意保守：它不会改变原生 Codex 工具参数或重写 Codex 线程记录。仅当您需要 ACP 运行时/会话模型时才使用显式 ACP。嵌入式 Codex 支持边界记录在 [Codex harness v1 支持合约](/zh/plugins/codex-harness-runtime#v1-support-contract) 中。

  </Accordion>
  <Accordion title="模型 / 提供商 / 运行时选择速查表">
    - `openai-codex/*`OAuth - 由医生修复的旧版 Codex OAuth/订阅模型路由。
    - `openai/*`OpenAI - 用于 OpenAI 代理轮次的原生 Codex 应用服务器嵌入式运行时。
    - `/codex ...` - 原生 Codex 对话控制。
    - `/acp ...` 或 `runtime: "acp"` - 显式 ACP/acpx 控制。

  </Accordion>
  <Accordion title="ACP 路由自然语言触发器">
    应路由到 ACP 运行时的触发器：

    - “将此作为一次性 Claude Code ACP 会话运行并总结结果。”
    - “在此线程中使用 Gemini CLI 完成此任务，然后将后续跟进保留在同一线程中。”
    - “在后台线程中通过 ACP 运行 Codex。”

    OpenClaw 选择 `runtime: "acp"`，解析工具 `agentId`，
    在支持时绑定到当前对话或线程，并将后续跟进路由到该会话，直到关闭/过期。仅当明确指定 ACP/acpx 或请求的操作无法使用原生 Codex 插件时，Codex 才会遵循此路径。

    对于 `sessions_spawn`，仅在启用 ACP、请求者未被OpenClaw且加载了 ACP 运行时后端时，才会通告 `runtime: "acp"`。`acp.dispatch.enabled=false` 暂停自动 ACP 线程调度，但不会隐藏或阻止显式 `sessions_spawn({ runtime: "acp" })` 调用。它以 ACP 工具 ID 为目标，例如 `codex`、
    `claude`、`droid`、`gemini` 或 `opencode`。除非该条目已明确配置了 `agents.list[].runtime.type="acp"`，否则不要传递 `agents_list` 中的普通 OpenClaw 配置代理 ID；
    否则，请使用默认的子代理运行时。当 OpenClaw 代理配置了 `runtime.type="acp"` 时，OpenClaw 将
    使用 `runtime.acp.agent` 作为底层工具 ID。

  </Accordion>
</AccordionGroup>

## ACP 与子代理

当您需要外部工具运行时时，请使用 ACP。当启用 `codex` 插件时，请使用 **原生 Codex 应用服务器** 进行 Codex 对话绑定/控制。当您需要 OpenClaw 原生委托运行时，请使用 **子代理**。

| 区域     | ACP 会话                              | 子代理运行                        |
| -------- | ------------------------------------- | --------------------------------- |
| 运行时   | ACP 后端插件（例如 acpx）             | OpenClaw 原生子代理运行时         |
| 会话密钥 | `agent:<agentId>:acp:<uuid>`          | `agent:<agentId>:subagent:<uuid>` |
| 主要命令 | `/acp ...`                            | `/subagents ...`                  |
| 生成工具 | `sessions_spawn` 带有 `runtime:"acp"` | `sessions_spawn` （默认运行时）   |

另请参阅 [子代理](/zh/tools/subagents)。

## ACP 如何运行 Claude Code

对于通过 ACP 运行的 Claude Code，技术栈如下：

1. OpenClaw ACP 会话控制平面。
2. 官方 `@openclaw/acpx` 运行时插件。
3. Claude ACP 适配器。
4. Claude 侧的运行时/会话机制。

ACP Claude 是一个带有 ACP 控制、会话恢复、后台任务跟踪以及可选对话/线程绑定的 **Harness 会话**。

CLI 后端是独立的纯文本本地后备运行时 - 请参阅 [CLI 后端](/zh/gateway/cli-backends)。

对于操作员而言，实用规则如下：

- **需要 `/acp spawn`、可绑定会话、运行时控制或持久的 Harness 工作？** 请使用 ACP。
- **需要通过原始 CLI 进行简单的本地文本后备？** 请使用 CLI 后端。

## 绑定会话

### 心智模型

- **聊天界面** - 人们持续交谈的地方（Discord 渠道、Telegram 话题、iMessage 聊天）。
- **ACP 会话** - OpenClaw 路由到的持久 Codex/Claude/Gemini 运行时状态。
- **子线程/话题** - 一个可选的额外消息界面，仅由 `--thread ...` 创建。
- **运行时工作区** - Harness 运行的文件系统位置（`cwd`、repo checkout、后端工作区）。独立于聊天界面。

### 当前对话绑定

`/acp spawn <harness> --bind here` 将当前对话固定到
生成的 ACP 会话 - 没有子线程，相同的聊天界面。OpenClaw 继续
拥有传输、身份验证、安全和交付。该对话中的后续消息
路由到同一会话；`/new` 和 `/reset` 就地
重置会话；`/acp close` 移除绑定。

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
    - `--bind here` 和 `--thread ...` 是互斥的。
    - `--bind here` 仅在支持当前会话绑定的频道上有效；否则，OpenClaw 会返回明确的不支持消息。绑定在 Gateway(网关) 重启后仍然保留。
    - 在 Discord 上，`spawnSessions` 限制 `--thread auto|here` 创建子线程 —— 而不是 `--bind here`。
    - 如果你生成到不同的 ACP 代理时未使用 `--cwd`，OpenClaw 默认继承**目标代理的**工作区。缺失的继承路径（`ENOENT`/`ENOTDIR`）将回退到后端默认值；其他访问错误（例如 `EACCES`Gateway(网关)）将显示为生成错误。
    - Gateway(网关) 管理命令在绑定的会话中保持本地化 —— `/acp ...` 命令由 OpenClaw 处理，即使正常的后续文本路由到绑定的 ACP 会话；只要为该界面启用了命令处理，`/status` 和 `/unfocus` 也保持本地化。

  </Accordion>
  <Accordion title="Thread-bound sessions">
    当为渠道适配器启用线程绑定功能时：

    - OpenClaw 将线程绑定到目标 ACP 会话。
    - 该线程中的后续消息路由到绑定的 ACP 会话。
    - ACP 输出会传回同一个线程。
    - 失焦/关闭/归档/空闲超时或最大期限过期会移除该绑定。
    - `/acp close`、`/acp cancel`、`/acp status`、`/status` 和 `/unfocus` 是 Gateway(网关) 命令，而非发送给 ACP harness 的提示词。

    线程绑定 ACP 所需的功能标志：

    - `acp.enabled=true`
    - `acp.dispatch.enabled` 默认开启（设置 `false` 可暂停自动 ACP 线程调度；显式的 `sessions_spawn({ runtime: "acp" })` 调用仍然有效）。
    - 渠道适配器线程会话生成已启用（默认值：`true`）：
      - Discord：`channels.discord.threadBindings.spawnSessions=true`
      - Telegram：`channels.telegram.threadBindings.spawnSessions=true`

    线程绑定支持取决于适配器。如果当前活动的渠道
    适配器不支持线程绑定，OpenClaw 将返回一条明确的
    不支持/不可用消息。

  </Accordion>
  <Accordion title="Thread-supporting channels">
    - 任何暴露会话/线程绑定功能的渠道适配器。
    - 当前内置支持：**Discord** 线程/频道，**Telegram** 话题（群组/超级群组中的论坛话题以及私信话题）。
    - 插件渠道可以通过相同的绑定接口添加支持。

  </Accordion>
</AccordionGroup>

## Persistent 渠道 bindings

对于非临时工作流，请在顶层的 `bindings[]` 条目中配置持久化 ACP 绑定。

### Binding 模型

<ParamField path="bindings[].type" type='"acp"'>
  标记一个持久化的 ACP 会话绑定。
</ParamField>
<ParamField path="bindings[].match" type="object">
  识别目标会话。针对不同渠道的格式：

- **Discord 渠道/主题：** Discord`match.channel="discord"` + `match.peer.id="<channelOrThreadId>"`
- **Telegram 论坛主题：** Telegram`match.channel="telegram"` + `match.peer.id="<chatId>:topic:<topicId>"`
- **iMessage 私信/群组：** iMessage`match.channel="imessage"` + `match.peer.id="<handle|chat_id:*|chat_guid:*|chat_identifier:*>"`。为了稳定的群组绑定，建议优先使用 `chat_id:*`。

</ParamField>
<ParamField path="bindings[].agentId" type="string"OpenClaw>
  所属的 OpenClaw 代理 ID。
</ParamField>
<ParamField path="bindings[].acp.mode" type='"persistent" | "oneshot"'>
  可选的 ACP 覆盖设置。
</ParamField>
<ParamField path="bindings[].acp.label" type="string">
  可选的操作员面向的标签。
</ParamField>
<ParamField path="bindings[].acp.cwd" type="string">
  可选的运行时工作目录。
</ParamField>
<ParamField path="bindings[].acp.backend" type="string">
  可选的后端覆盖设置。
</ParamField>

### 每个代理的运行时默认值

使用 `agents.list[].runtime` 为每个代理定义一次 ACP 默认值：

- `agents.list[].runtime.type="acp"`
- `agents.list[].runtime.acp.agent`（harness id，例如 `codex` 或 `claude`）
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

- OpenClaw 会在使用前确保已配置的 ACP 会话存在。
- 该渠道或主题中的消息会路由到已配置的 ACP 会话。
- 在绑定会话中，`/new` 和 `/reset` 会就地重置同一个 ACP 会话密钥。
- 临时运行时绑定（例如由主题聚焦流程创建的绑定）如果存在，仍然适用。
- 对于没有明确指定 `cwd`OpenClaw 的跨代理 ACP 生成，OpenClaw 会从代理配置继承目标代理的工作区。
- 缺少继承的工作区路径将回退到后端默认的当前工作目录；非缺失的访问失败将显示为生成错误。

## 启动 ACP 会话

有两种启动 ACP 会话的方法：

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
    `runtime` 默认为 `subagent`，因此请为 ACP 会话显式设置 `runtime: "acp"`。如果省略了 `agentId`，OpenClaw 在配置时会使用 `acp.defaultAgent`。`mode: "session"` 需要 `thread: true` 来保持持久绑定的会话。
    </Note>

  </Tab>
  <Tab title="From /acp command">
    使用 `/acp spawn` 从聊天中进行显式操作员控制。

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

    请参阅 [Slash commands](/zh/tools/slash-commands)。

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
  ACP 目标 harness ID。如果设置，则回退到 `acp.defaultAgent`。
</ParamField>
<ParamField path="thread" type="boolean" default="false">
  在支持的情况下请求线程绑定流程。
</ParamField>
<ParamField path="mode" type='"run" | "session"' default="run">
  `"run"` 是一次性；`"session"` 是持久化。如果 `thread: true` 且
  `mode`OpenClaw 被省略，OpenClaw 可能会根据运行时路径默认为持久化行为。
  `mode: "session"` 需要 `thread: true`。
</ParamField>
<ParamField path="cwd" type="string">
  请求的运行时工作目录（由后端/运行时策略验证）。如果省略，ACP 生成会在配置时继承目标 agent 的工作区；缺失的继承路径会回退到后端默认值，而实际的访问错误会被返回。
</ParamField>
<ParamField path="label" type="string">
  在会话/横幅文本中使用的面向操作员的标签。
</ParamField>
<ParamField path="resumeSessionId" type="string">
  恢复现有的 ACP 会话而不是创建新会话。agent 通过 `session/load` 重放其对话历史。需要
  `runtime: "acp"`。
</ParamField>
<ParamField path="streamTo" type='"parent"'>
  `"parent"` 将初始 ACP 运行进度摘要作为系统事件流式传输回请求者会话。接受的响应包括
  `streamLogPath`，指向会话范围的 JSONL 日志
  (`<sessionId>.acp-stream.jsonl`)，您可以跟踪该日志以获取完整的中继历史记录。
</ParamField>
<ParamField path="runTimeoutSeconds" type="number">
  在 N 秒后中止 ACP 子回合。`0`Gateway(网关) 使回合保持在
  gateway 的无超时路径上。相同的值应用于 Gateway 运行和 ACP 运行时，因此停滞/配额耗尽的 harness 不会
  无限期地占用父 agent 通道。
</ParamField>
<ParamField path="model" type="string"OpenClaw>
  ACP 子会话的显式模型覆盖。Codex ACP 生成会将
  OpenClaw Codex 引用（例如 `openai-codex/gpt-5.4`）规范化为 Codex
  ACP 启动配置，在此之前 `session/new`；斜杠形式（例如
  `openai-codex/gpt-5.4/high`）也会设置 Codex ACP 推理工作量。
  其他 harness 必须通告 ACP `models` 并支持
  `session/set_model`OpenClaw；否则 OpenClaw/acpx 将清楚地失败，而不是
  静默回退到目标 agent 默认值。
</ParamField>
<ParamField path="thinking" type="string">
  显式思考/推理工作量。对于 Codex ACP，`minimal` 映射到
  低工作量，`low`/`medium`/`high`/`xhigh` 直接映射，而 `off`
  省略推理工作量启动覆盖。
</ParamField>

## 生成绑定和线程模式

<Tabs>
  <Tab title="--bind here|off">
    | 模式   | 行为                                                                 |
    | ------ | -------------------------------------------------------------------- |
    | `here` | 就地绑定当前活动对话；如果没有活动对话则失败。                           |
    | `off`  | 不创建当前对话绑定。                                                  |

    注：

    - `--bind here` 是“使此渠道或聊天获得 Codex 支持”的最简单操作路径。
    - `--bind here` 不创建子线程。
    - `--bind here` 仅在支持当前对话绑定的渠道上可用。
    - `--bind` 和 `--thread` 不能在同一个 `/acp spawn` 调用中组合使用。

  </Tab>
  <Tab title="--thread auto|here|off">
    | 模式   | 行为                                                                                              |
    | ------ | ------------------------------------------------------------------------------------------------- |
    | `auto` | 在活动线程中：绑定该线程。在线程外：如果支持，则创建/绑定子线程。                    |
    | `here` | 要求当前活动线程；如果未在线程中则失败。                                                        |
    | `off`  | 无绑定。会话以未绑定状态启动。                                                                   |

    注：

    - 在非线程绑定表面上，默认行为实际上是 `off`Discord。
    - 线程绑定生成需要渠道策略支持：
      - Discord：`channels.discord.threadBindings.spawnSessions=true`Telegram
      - Telegram：`channels.telegram.threadBindings.spawnSessions=true`
    - 当您想要固定当前对话而不创建子线程时，请使用 `--bind here`。

  </Tab>
</Tabs>

## 交付模型

ACP 会话既可以是交互式工作区，也可以是父级拥有的后台工作。交付路径取决于该形状。

<AccordionGroup>
  <Accordion title="Interactive ACP sessions">
    交互式会话旨在可见的聊天表面上持续进行对话：

    - `/acp spawn ... --bind here` 将当前对话绑定到 ACP 会话。
    - `/acp spawn ... --thread ...` 将渠道线程/主题绑定到 ACP 会话。
    - 持久化配置的 `bindings[].type="acp"` 将匹配的对话路由到同一个 ACP 会话。

    绑定对话中的后续消息直接路由到 ACP 会话，ACP 输出也会传送回同一个渠道/线程/主题。

    OpenClaw 发送给工具的内容：

    - 普通的绑定后续消息作为提示文本发送，并且仅在工具/后端支持时才附带附件。
    - `/acp` 管理命令和本地 Gateway(网关) 命令会在 ACP 分发前被拦截。
    - 运行时生成的补全事件会根据目标具体化。OpenClaw 代理获取 OpenClaw 的内部运行时上下文封包；外部 ACP 工具获取带有子结果和指令的纯提示。原始的 `<<<BEGIN_OPENCLAW_INTERNAL_CONTEXT>>>` 封包绝不应发送给外部工具或作为 ACP 用户对话记录文本持久化。
    - ACP 对话记录条目使用用户可见的触发文本或纯补全提示。内部事件元数据尽可能在 OpenClaw 中保持结构化，不被视为用户编写的聊天内容。

  </Accordion>
  <Accordion title="父级拥有的一次性 ACP 会话">
    由另一个代理运行产生的一次性 ACP 会话是后台子级，类似于子代理：

    - 父级通过 `sessions_spawn({ runtime: "acp", mode: "run" })` 请求工作。
    - 子级在其自己的 ACP harness 会话中运行。
    - 子级轮次在与原生子代理生成使用的同一后台通道上运行，因此缓慢的 ACP harness 不会阻断不相关的主会话工作。
    - 完成报告通过任务完成公告路径传回。OpenClaw 在将内部完成元数据发送到外部 harness 之前，将其转换为纯 ACP 提示，因此 harness 不会看到仅 OpenClaw 运行时的上下文标记。
    - 当面向用户的回复有用时，父级会以正常的助手语调重写子级结果。

    请**勿**将此路径视为父级与子级之间的点对点聊天。子级已经有一个完成渠道可以反馈给父级。

  </Accordion>
  <Accordion title="sessions_send 和 A2A 投递">
    `sessions_send` 可以在生成后针对另一个会话。对于正常的对等会话，在注入消息后，OpenClaw 使用代理到代理（A2A）的后续路径：

    - 等待目标会话的回复。
    - 可选择让请求者和目标交换有限数量的后续轮次。
    - 要求目标生成公告消息。
    - 将该公告投递到可见渠道或线程。

    该 A2A 路径是发送者需要可见后续的对等发送的回退方案。当不相关的会话可以看到并向 ACP 目标发送消息时，例如在广泛的 `tools.sessions.visibility` 设置下，该路径保持启用状态。

    仅当请求者是其自身拥有的父级一次性 ACP 子级的父级时，OpenClaw 才会跳过 A2A 后续。在这种情况下，在任务完成之上运行 A2A 可能会使用子级的结果唤醒父级，将父级的回复转发回子级，并创建父级/子级回声循环。`sessions_send` 结果针对该拥有子级的情况报告 `delivery.status="skipped"`，因为完成路径已对结果负责。

  </Accordion>
  <Accordion title="恢复现有会话">
    使用 `resumeSessionId` 来继续之前的 ACP 会话，而不是
    重新开始。代理通过 `session/load` 重放其对话历史，
    因此它可以获取之前发生的所有上下文。

    ```json
    {
      "task": "Continue where we left off - fix the remaining test failures",
      "runtime": "acp",
      "agentId": "codex",
      "resumeSessionId": "<previous-session-id>"
    }
    ```

    常见用例：

    - 将 Codex 会话从您的笔记本电脑移交到您的手机 - 告诉您的代理从您中断的地方继续。
    - 继续您在 CLI 中以交互方式开始的编码会话，现在通过您的代理以无头方式继续。
    - 恢复因网关重启或空闲超时而中断的工作。

    注意事项：

    - `resumeSessionId` 仅在 `runtime: "acp"` 时适用；默认的子代理运行时会忽略此 ACP 专用字段。
    - `streamTo` 仅在 `runtime: "acp"` 时适用；默认的子代理运行时会忽略此 ACP 专用字段。
    - `resumeSessionId` 是主机本地的 ACP/harness 恢复 ID，而不是 OpenClaw 渠道会话密钥；OpenClaw 仍然会在分派前检查 ACP 生成策略和目标代理策略，而 ACP 后端或 harness 拥有加载该上游 ID 的授权。
    - `resumeSessionId` 恢复上游 ACP 对话历史；`thread` 和 `mode` 仍然正常适用于您正在创建的新 OpenClaw 会话，因此 `mode: "session"` 仍然需要 `thread: true`。
    - 目标代理必须支持 `session/load`（Codex 和 Claude Code 支持）。
    - 如果找不到会话 ID，生成将失败并显示明确的错误 - 不会静默回退到新会话。

  </Accordion>
  <Accordion title="部署后冒烟测试">
    在 Gateway(网关) 部署后，运行实时的端到端检查，而不是
    信任单元测试：

    1. 在目标主机上验证已部署的 Gateway(网关) 版本和提交记录。
    2. 打开一个到实时代理的临时 ACPX 桥接会话。
    3. 要求该代理使用 `runtime: "acp"`、`agentId: "codex"`、`mode: "run"` 和任务 `Reply with exactly LIVE-ACP-SPAWN-OK` 调用 `sessions_spawn`。
    4. 验证 `accepted=yes`、一个真实的 `childSessionKey` 以及没有验证器错误。
    5. 清理临时桥接会话。

    将网关保持在 `mode: "run"` 上并跳过 `streamTo: "parent"` -
    线程绑定的 `mode: "session"` 和流中继路径是分开的
    更丰富的集成传递。

  </Accordion>
</AccordionGroup>

## 沙箱兼容性

ACP 会话当前在主机运行时上运行，而**不是**在
OpenClaw 沙箱内部。

<Warning>
**安全边界：**

- 外部程式可以根据其自己的 CLI 权限和所选的 `cwd` 进行读/写。
- OpenClaw 的沙箱策略**不会**封装 ACP 程式执行。
- OpenClawGateway(网关) 仍然强制执行 ACP 功能开关、允许的代理、会话所有权、渠道绑定和 Gateway(网关) 交付策略。
- 对沙箱强制的 OpenClaw 原生工作使用 `runtime: "subagent"`。

</Warning>

当前限制：

- 如果请求者会话是沙箱隔离的，ACP 生成将被阻止，无论是对于 `sessions_spawn({ runtime: "acp" })` 还是 `/acp spawn`。
- 带有 `runtime: "acp"` 的 `sessions_spawn` 不支持 `sandbox: "require"`。

## 会话目标解析

大多数 `/acp` 操作接受一个可选的会话目标（`session-key`，
`session-id` 或 `session-label`）。

**解析顺序：**

1. 显式目标参数（或对于 `/acp steer` 使用 `--session`）
   - 尝试键
   - 然后是 UUID 形状的会话 ID
   - 然后是标签
2. 当前线程绑定（如果此对话/线程已绑定到 ACP 会话）。
3. 当前请求者会话回退。

当前对话绑定和线程绑定都参与第 2 步。

如果未解析到目标，OpenClaw 将返回明确的错误
(OpenClaw`Unable to resolve session target: ...`)。

## ACP 控制命令

| 命令                 | 作用                                      | 示例                                                          |
| -------------------- | ----------------------------------------- | ------------------------------------------------------------- |
| `/acp spawn`         | 创建 ACP 会话；可选的当前绑定或线程绑定。 | `/acp spawn codex --bind here --cwd /repo`                    |
| `/acp cancel`        | 取消目标会话的进行中轮次。                | `/acp cancel agent:codex:acp:<uuid>`                          |
| `/acp steer`         | 向运行中的会话发送引导指令。              | `/acp steer --session support inbox prioritize failing tests` |
| `/acp close`         | 关闭会话并取消绑定线程目标。              | `/acp close`                                                  |
| `/acp status`        | 显示后端、模式、状态、运行时选项、能力。  | `/acp status`                                                 |
| `/acp set-mode`      | 设置目标会话的运行时模式。                | `/acp set-mode plan`                                          |
| `/acp set`           | 通用运行时配置选项写入。                  | `/acp set model openai/gpt-5.4`                               |
| `/acp cwd`           | 设置运行时工作目录覆盖。                  | `/acp cwd /Users/user/Projects/repo`                          |
| `/acp permissions`   | 设置审批策略配置文件。                    | `/acp permissions strict`                                     |
| `/acp timeout`       | 设置运行时超时（秒）。                    | `/acp timeout 120`                                            |
| `/acp model`         | 设置运行时模型覆盖。                      | `/acp model anthropic/claude-opus-4-6`                        |
| `/acp reset-options` | 移除会话运行时选项覆盖。                  | `/acp reset-options`                                          |
| `/acp sessions`      | 列出存储中的近期 ACP 会话。               | `/acp sessions`                                               |
| `/acp doctor`        | 后端健康状况、能力、可执行的修复方案。    | `/acp doctor`                                                 |
| `/acp install`       | 打印确定性的安装和启用步骤。              | `/acp install`                                                |

`/acp status` 显示有效的运行时选项以及运行时级和后端级会话标识符。当后端缺少某项功能时，不支持的控件错误会清晰地显示出来。`/acp sessions` 读取当前绑定或请求者会话的存储；目标令牌（`session-key`、`session-id` 或 `session-label`）通过网关会话发现机制进行解析，包括自定义的每个代理 `session.store` 根目录。

### 运行时选项映射

`/acp` 提供了便捷命令和一个通用设置器。等效操作：

| 命令                         | 映射到                       | 备注                                                                                                                                                                          |
| ---------------------------- | ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/acp model <id>`            | 运行时配置键 `model`         | 对于 Codex ACP，OpenClaw 会将 `openai-codex/<model>` 规范化为适配器模型 ID，并将斜杠推理后缀（如 `openai-codex/gpt-5.4/high`）映射到 `reasoning_effort`。                     |
| `/acp set thinking <level>`  | 规范选项 `thinking`          | OpenClaw 会在存在时发送后端通告的等效项，优先选择 `thinking`，然后是 `effort`、`reasoning_effort` 或 `thought_level`。对于 Codex ACP，适配器会将值映射到 `reasoning_effort`。 |
| `/acp permissions <profile>` | 规范选项 `permissionProfile` | OpenClaw 会在存在时发送后端通告的等效项，例如 `approval_policy`、`permission_profile`、`permissions` 或 `permission_mode`。                                                   |
| `/acp timeout <seconds>`     | 规范选项 `timeoutSeconds`    | OpenClaw 会在存在时发送后端通告的等效项，例如 `timeout` 或 `timeout_seconds`。                                                                                                |
| `/acp cwd <path>`            | 运行时 cwd 覆盖              | 直接更新。                                                                                                                                                                    |
| `/acp set <key> <value>`     | 通用                         | `key=cwd` 使用 cwd 覆盖路径。                                                                                                                                                 |
| `/acp reset-options`         | 清除所有运行时覆盖           | -                                                                                                                                                                             |

## acpx harness、插件设置和权限

有关 acpx harness 配置（Claude Code / Codex / Gemini CLI 别名）、plugin-tools 和 OpenClaw-tools MCP 桥接以及 ACP 权限模式，请参阅 [ACP agents - setup](/zh/tools/acp-agents-setup)。

## 故障排除

| 症状                                                                        | 可能原因                                                                        | 修复                                                                                                                                                                |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ACP runtime backend is not configured`                                     | 后端插件缺失、已禁用或被 `plugins.allow` 阻止。                                 | 安装并启用后端插件，在设置了该允许列表时将 `acpx` 包含在 `plugins.allow` 中，然后运行 `/acp doctor`。                                                               |
| `ACP is disabled by policy (acp.enabled=false)`                             | ACP 已全局禁用。                                                                | 设置 `acp.enabled=true`。                                                                                                                                           |
| `ACP dispatch is disabled by policy (acp.dispatch.enabled=false)`           | 已禁用从普通线程消息自动分派。                                                  | 设置 `acp.dispatch.enabled=true` 以恢复自动线程路由；显式的 `sessions_spawn({ runtime: "acp" })` 调用仍然有效。                                                     |
| `ACP agent "<id>" is not allowed by policy`                                 | 代理不在允许列表中。                                                            | 使用允许的 `agentId` 或更新 `acp.allowedAgents`。                                                                                                                   |
| `/acp doctor` 报告启动后后端未就绪                                          | 后端插件缺失、已禁用、被允许/拒绝策略阻止，或其配置的可执行文件不可用。         | 安装/启用后端插件，重新运行 `/acp doctor`，如果其仍然不健康，请检查后端安装或策略错误。                                                                             |
| 未找到 Harness 命令                                                         | 适配器 CLI 未安装，外部插件缺失，或者非 Codex 适配器的首次运行 `npx` 获取失败。 | 运行 `/acp doctor`，在 Gateway(网关) 主机上安装/预热适配器，或者显式配置 acpx 代理命令。                                                                            |
| 来自 Harness 的未找到模型                                                   | 模型 ID 对另一个提供商/harness 有效，但对该 ACP 目标无效。                      | 使用该 harness 列出的模型，在 harness 中配置模型，或者省略覆盖。                                                                                                    |
| 来自 Harness 的供应商认证错误                                               | OpenClaw 状态正常，但目标 CLI/提供商未登录。                                    | 在 Gateway(网关) 主机环境中登录或提供所需的提供商密钥。                                                                                                             |
| `Unable to resolve session target: ...`                                     | 错误的密钥/ID/标签令牌。                                                        | 运行 `/acp sessions`，复制确切的密钥/标签，然后重试。                                                                                                               |
| `--bind here requires running /acp spawn inside an active ... conversation` | `--bind here` 在没有可绑定活动会话的情况下使用。                                | 移动到目标聊天/渠道并重试，或者使用非绑定生成。                                                                                                                     |
| `Conversation bindings are unavailable for <channel>.`                      | 适配器缺乏当前会话 ACP 绑定功能。                                               | 在支持的情况下使用 `/acp spawn ... --thread ...`，配置顶级 `bindings[]`，或移动到受支持的渠道。                                                                     |
| `--thread here requires running /acp spawn inside an active ... thread`     | `--thread here` 在线程上下文之外使用。                                          | 移动到目标线程或使用 `--thread auto`/`off`。                                                                                                                        |
| `Only <user-id> can rebind this channel/conversation/thread.`               | 另一个用户拥有活动绑定目标。                                                    | 以所有者身份重新绑定或使用不同的会话或线程。                                                                                                                        |
| `Thread bindings are unavailable for <channel>.`                            | 适配器缺乏线程绑定功能。                                                        | 使用 `--thread off` 或移动到受支持的适配器/渠道。                                                                                                                   |
| `Sandboxed sessions cannot spawn ACP sessions ...`                          | ACP 运行时位于主机端；请求者会话是沙箱隔离的。                                  | 从沙箱隔离的会话使用 `runtime="subagent"`，或者从非沙箱隔离的会话运行 ACP 生成。                                                                                    |
| `sessions_spawn sandbox="require" is unsupported for runtime="acp" ...`     | 为 ACP 运行时请求了 `sandbox="require"`。                                       | 对所需的沙箱隔离使用 `runtime="subagent"`，或者从非沙箱隔离的会话将 ACP 与 `sandbox="inherit"` 一起使用。                                                           |
| `Cannot apply --model ... did not advertise model support`                  | 目标工具未暴露通用 ACP 模型切换。                                               | 使用宣称支持 ACP `models`/`session/set_model` 的工具，使用 Codex ACP 模型引用，或者如果工具具有自己的启动标志，则在工具中直接配置模型。                             |
| 绑定会话缺少 ACP 元数据                                                     | 过期/已删除的 ACP 会话元数据。                                                  | 使用 `/acp spawn` 重新创建，然后重新绑定/聚焦线程。                                                                                                                 |
| `AcpRuntimeError: Permission prompt unavailable in non-interactive mode`    | `permissionMode` 阻止在非交互式 ACP 会话中进行写入/执行。                       | 将 `plugins.entries.acpx.config.permissionMode` 设置为 `approve-all` 并重启 Gateway(网关)。请参阅 [权限配置](/zh/tools/acp-agents-setup#permission-configuration)。 |
| ACP 会话过早失败且输出很少                                                  | 权限提示被 `permissionMode`/`nonInteractivePermissions` 阻止。                  | 检查 Gateway(网关) 日志中的 `AcpRuntimeError`。如需完全权限，请设置 `permissionMode=approve-all`；如需优雅降级，请设置 `nonInteractivePermissions=deny`。           |
| ACP 会话在完成工作后无限期停滞                                              | Harness 进程已完成，但 ACP 会话未报告完成。                                     | 更新 OpenClaw；当前的 acpx 清理操作会在关闭和 OpenClaw 启动时回收 Gateway(网关) 拥有的过时包装器和适配器进程。                                                      |
| Harness 看到 `<<<BEGIN_OPENCLAW_INTERNAL_CONTEXT>>>`                        | 内部事件信封在 ACP 边界处泄漏。                                                 | 更新 OpenClaw 并重新运行完成流程；外部 Harness 应仅接收纯完成提示。                                                                                                 |

## 相关

- [ACP 代理 - 设置](/zh/tools/acp-agents-setup)
- [Agent 发送](/zh/tools/agent-send)
- [CLI 后端](/zh/gateway/cli-backends)
- [Codex harness](/zh/plugins/codex-harness)
- [Codex harness 运行时](/zh/plugins/codex-harness-runtime)
- [多代理沙盒工具](/zh/tools/multi-agent-sandbox-tools)
- [`openclaw acp` (桥接模式)](/zh/cli/acp)
- [子代理](/zh/tools/subagents)
