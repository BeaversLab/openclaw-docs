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

[Agent Client Protocol (ACP)](https://agentclientprotocol.com/) 会话允许 OpenClaw 通过 ACP 后端插件运行外部编码工具（例如 Claude Code、Cursor、Copilot、Droid、OpenClaw ACP、OpenCode、Gemini CLI 和其他支持的 ACPX 工具）。

每次 ACP 会话生成都作为[后台任务](/zh/automation/tasks)进行跟踪。

<Note>
**ACP 是外部 harness 路径，而不是默认的 Codex 路径。** 原生 Codex 应用服务器插件拥有 `/codex ...` 控件以及用于 agent 轮次的默认 `openai/gpt-*` 嵌入式运行时；ACP 拥有 `/acp ...` 控件和 `sessions_spawn({ runtime: "acp" })` 会话。

如果您希望 Codex 或 Claude Code 作为外部 MCP 客户端直接连接到现有的 OpenClaw 渠道会话，请使用 [`openclaw mcp serve`](/zh/cli/mcp) 而不是 ACP。

</Note>

## 我需要哪个页面？

| 您想要...                                                                 | 使用此                                  | 备注                                                                                                                             |
| ------------------------------------------------------------------------- | --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| 在当前会话中绑定或控制 Codex                                              | `/codex bind`, `/codex threads`         | 当启用 `codex` 插件时的原生 Codex 应用服务器路径；包括绑定聊天回复、图片转发、模型/快速/权限、停止和转向控件。ACP 是一个显式回退 |
| 通过 CLI 运行 Claude Code、Gemini OpenClaw、显式 Codex ACP 或其他外部工具 | 本页                                    | 聊天绑定会话，`/acp spawn`，`sessions_spawn({ runtime: "acp" })`，后台任务，运行时控制                                           |
| 将 OpenClaw Gateway(网关) 会话作为 ACP 服务器暴露给编辑器或客户端         | [`openclaw acp`](/zh/cli/acp)           | 桥接模式。IDE/客户端通过 stdio/WebSocket 以 ACP 协议与 OpenClaw 通信                                                             |
| 重用本地 AI CLI 作为纯文本回退模型                                        | [CLI 后端](CLI/en/gateway/cli-backends) | 不是 ACP。没有 OpenClaw 工具，没有 ACP 控件，没有工具运行时                                                                      |

## 这是否开箱即用？

是的，在安装了官方 ACP 运行时插件之后：

```bash
openclaw plugins install @openclaw/acpx
openclaw config set plugins.entries.acpx.enabled true
```

源代码检出可以在 `pnpm install` 之后使用本地 `extensions/acpx` 工作区插件。运行 `/acp doctor` 进行就绪检查。

OpenClaw 仅在 ACP **真正可用**时才会告知代理有关 ACP 生成的情况：必须启用 ACP，不得禁用调度，当前会话不得被沙箱阻止，并且必须加载运行时后端。如果不满足这些条件，ACP 插件技能和 OpenClaw`sessions_spawn` ACP 指引将保持隐藏，以便代理不会建议不可用的后端。

<AccordionGroup>
  <Accordion title="首次运行注意事项">
    - 如果设置了 `plugins.allow`，它是一个限制性插件清单，并且**必须**包含 `acpx`；否则，已安装的 ACP 后端将被有意阻止，并且 `/acp doctor` 会报告缺失的允许列表条目。
    - Codex ACP 适配器与 `acpx` 插件一起暂存，并在可能的情况下在本地启动。
    - Codex ACP 在隔离的 `CODEX_HOME`OpenClaw 中运行；OpenClaw 会从主机 Codex 配置中复制受信任的项目条目以及安全的模型/提供商路由配置，而身份验证、通知和钩子保留在主机配置上。
    - 其他目标适配器适配器仍可能在您首次使用它们时通过 `npx`npm 按需获取。
    - 该适配器的供应商身份验证仍必须存在于主机上。
    - 如果主机没有 npm 或网络访问权限，首次运行的适配器获取将会失败，直到缓存被预热或通过其他方式安装了适配器。

  </Accordion>
  <Accordion title="Runtime prerequisites"OpenClawOpenClaw>
    ACP 会启动一个真实的外部 Harness 进程。OpenClaw 负责路由、后台任务状态、交付、绑定和策略；而 Harness 负责其提供商登录、模型目录、文件系统行为和原生工具。

    在归咎于 OpenClaw 之前，请验证：

    - `/acp doctor` 报告后端已启用且健康。
    - 当设置了允许列表时，目标 ID 被 `acp.allowedAgents`Gateway(网关) 允许。
    - Harness 命令可以在 Gateway(网关) 主机上启动。
    - 该 Harness 存在提供商身份验证（`claude`、`codex`、`gemini`、`opencode`、`droid` 等）。
    - 该 Harness 存在所选的模型 - 模型 ID 在不同 Harness 之间不可移植。
    - 请求的 `cwd` 存在且可访问，或者省略 `cwd` 并让后端使用其默认值。
    - 权限模式与工作匹配。非交互式会话无法点击原生权限提示，因此写入/执行繁重的编码运行通常需要能够无提示进行的 ACPX 权限配置文件。

  </Accordion>
</AccordionGroup>

OpenClaw 插件工具和内置 OpenClaw 工具默认情况下**不会**暴露给 ACP 适配器。仅当适配器需要直接调用这些工具时，才在 [ACP agents - setup](/zh/tools/acp-agents-setup) 中启用显式的 MCP 桥接。

## 支持的 Harness 目标

使用 `acpx` 后端时，将这些适配器 ID 用作 `/acp spawn <id>`
或 `sessions_spawn({ runtime: "acp", agentId: "<id>" })` 目标：

| Harness id | 典型后端                                             | 备注                                                                       |
| ---------- | ---------------------------------------------------- | -------------------------------------------------------------------------- |
| `claude`   | Claude Code ACP 适配器                               | 需要在主机上进行 Claude Code 身份验证。                                    |
| `codex`    | Codex ACP 适配器                                     | 仅当原生 `/codex` 不可用或请求 ACP 时，才显式回退到 ACP。                  |
| `copilot`  | GitHub Copilot ACP 适配器                            | 需要 Copilot CLI/运行时身份验证。                                          |
| `cursor`   | Cursor CLI ACP (`cursor-agent acp`)                  | 如果本地安装公开了不同的 ACP 入口点，则覆盖 acpx 命令。                    |
| `droid`    | Factory Droid CLI                                    | 需要在 harness 环境中进行 Factory/Droid 身份验证或设置 `FACTORY_API_KEY`。 |
| `gemini`   | Gemini CLI ACP 适配器                                | 需要 Gemini CLI 认证或 API 密钥设置。                                      |
| `iflow`    | iFlow CLI                                            | 适配器可用性和模型控制取决于已安装的 CLI。                                 |
| `kilocode` | Kilo Code CLI                                        | 适配器可用性和模型控制取决于已安装的 CLI。                                 |
| `kimi`     | Kimi/Moonshot CLI                                    | 需要在主机上进行 Kimi/Moonshot 认证。                                      |
| `kiro`     | Kiro CLI                                             | 适配器可用性和模型控制取决于已安装的 CLI。                                 |
| `opencode` | OpenCode ACP 适配器                                  | 需要 OpenCode CLI/提供商认证。                                             |
| `openclaw` | 通过 `openclaw acp` 进行 OpenClaw Gateway(网关) 桥接 | 允许支持 ACP 的 harness 与 OpenClaw Gateway(网关) 会话进行回话。           |
| `qwen`     | Qwen Code / Qwen CLI                                 | 要求主机上具有与 Qwen 兼容的身份验证。                                     |

可以在 acpx 本身中配置自定义 acpx 代理别名，但 OpenClaw 策略仍会在调度前检查 `acp.allowedAgents` 和任何 `agents.list[].runtime.acp.agent` 映射。

## Operator runbook

从聊天气泡中快速 `/acp` 流程：

<Steps>
  <Step title="生成">
    `/acp spawn claude --bind here`、
    `/acp spawn gemini --mode persistent --thread auto` 或显式
    `/acp spawn codex --bind here`。
  </Step>
  <Step title="Work">
    继续在绑定的对话或线程中操作（或明确指定会话密钥）。
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
    在不替换上下文的情况下：`/acp steer tighten logging and continue`。
  </Step>
  <Step title="停止">
    `/acp cancel`（当前轮次）或 `/acp close`（会话 + 绑定）。
  </Step>
</Steps>

<AccordionGroup>
  <Accordion title="Lifecycle details">
    - Spawn 创建或恢复 ACP 运行时会话，在 OpenClaw 会话存储中记录 ACP 元数据，并且在运行由父级拥有时可能会创建后台任务。
    - 父级拥有的 ACP 会话即使运行时会话是持久的，也会被视为后台工作；完成和跨表面交付通过父级任务通知程序进行，而不是像普通的面向用户的聊天会话那样运作。
    - 任务维护会关闭已终止或孤立的父级拥有的一次性 ACP 会话。只要存在活跃的对话绑定，持久的 ACP 会话就会被保留；没有活跃绑定的过时持久会话将被关闭，以免在拥有任务完成或其任务记录消失后被静默恢复。
    - 绑定的后续消息直接发送到 ACP 会话，直到绑定被关闭、失焦、重置或过期。
    - Gateway(网关) 命令保留在本地。`/acp ...`、`/status` 和 `/unfocus` 永远不会作为普通提示文本发送给绑定的 ACP 线束。
    - 当后端支持取消时，`cancel` 会中止当前轮次；它不会删除绑定或会话元数据。
    - `close` 从 OpenClaw 的角度结束 ACP 会话并移除绑定。如果线束支持恢复，它可能仍保留其自己的上游历史记录。
    - acpx 插件在 `close` 之后清理 OpenClaw 拥有的包装器和适配器进程树，并在 OpenClaw 启动期间清除过时的 Gateway(网关) 拥有的 ACPX 孤立进程。
    - 空闲的运行时工作器在 `acp.runtime.ttlMinutes` 后符合清理条件；存储的会话元数据在 `/acp sessions` 内仍然可用。

  </Accordion>
  <Accordion title="Native Codex 路由规则">
    当启用 **原生 Codex 插件** 时，应路由至该插件的自然语言触发器：

    - "将此 Discord 渠道绑定到 Codex。"
    - "将此聊天附加到 Codex 线程 `<id>`。"
    - "显示 Codex 线程，然后绑定此线程。"

    原生 Codex 会话绑定是默认的聊天控制路径。OpenClaw 动态工具仍通过 OpenClaw 执行，而 Codex 原生工具（如 shell/apply-patch）则在 Codex 内部执行。对于 Codex 原生工具事件，OpenClaw 会注入一个逐轮原生钩子中继，以便插件钩子可以拦截 `before_tool_call`、观察 `after_tool_call`，并通过 OpenClaw 审批路由 Codex `PermissionRequest` 事件。Codex `Stop` 钩子会被中继到 OpenClaw `before_agent_finalize`，插件可以在此请求进行另一次模型传递，然后再由 Codex 确定其答案。该中继刻意保持保守：它不会更改 Codex 原生工具参数，也不会重写 Codex 线程记录。仅当您需要 ACP 运行时/会话模型时，才使用显式 ACP。嵌入式 Codex 支持边界记录在 [Codex harness v1 支持合约](/zh/plugins/codex-harness-runtime#v1-support-contract) 中。

  </Accordion>
  <Accordion title="Model / 提供商 / runtime selection cheat sheet">
    - legacy Codex 模型 refs - legacy Codex OAuth/subscription 模型 route repaired by doctor.
    - `openai/*` - native Codex app-server embedded runtime for OpenAI agent turns.
    - `/codex ...` - native Codex conversation control.
    - `/acp ...` or `runtime: "acp"` - explicit ACP/acpx control.

  </Accordion>
  <Accordion title="ACP-routing natural-language triggers">
    应路由到 ACP 运行时的触发器：

    - "将其作为一次性 Claude Code ACP 会话运行并总结结果。"
    - "在线程中使用 Gemini CLI 完成此任务，然后在同一线程中保持后续跟进。"
    - "通过 ACP 在后台线程中运行 Codex。"

    OpenClaw 选择 `runtime: "acp"`，解析工具 `agentId`，
    在支持时绑定到当前对话或线程，并将后续跟进路由到该会话直到关闭/过期。仅当明确指定 ACP/acpx 或请求的操作无法使用原生 Codex 插件时，Codex 才会执行此路径。

    对于 `sessions_spawn`，仅当 ACP
    已启用、请求者未处于沙箱隔离环境中且加载了 ACP 运行时后端时，才会通告 `runtime: "acp"`。`acp.dispatch.enabled=false` 暂停自动
    ACP 线程调度，但不会隐藏或阻止显式
    `sessions_spawn({ runtime: "acp" })` 调用。它针对 ACP 工具 ID，例如 `codex`、
    `claude`、`droid`、`gemini` 或 `opencode`。除非该条目
    使用 `agents.list[].runtime.type="acp"` 进行了显式配置，否则不要传递来自 `agents_list` 的普通
    OpenClaw 配置代理 ID；
    否则请使用默认的子代理运行时。当 OpenClaw 代理
    配置有 `runtime.type="acp"` 时，OpenClaw 使用
    `runtime.acp.agent` 作为底层工具 ID。

  </Accordion>
</AccordionGroup>

## ACP 与子代理

当您需要外部工具运行时，请使用 ACP。当启用 `codex`OpenClaw 插件时，请使用 **原生 Codex 应用服务器** 进行 Codex 对话绑定/控制。当您需要 OpenClaw 原生委托运行时，请使用 **子代理**。

| 领域     | ACP 会话                              | 子代理运行                        |
| -------- | ------------------------------------- | --------------------------------- |
| 运行时   | ACP 后端插件（例如 acpx）             | OpenClaw 原生子代理运行时         |
| 会话密钥 | `agent:<agentId>:acp:<uuid>`          | `agent:<agentId>:subagent:<uuid>` |
| 主要命令 | `/acp ...`                            | `/subagents ...`                  |
| 生成工具 | `sessions_spawn` 配合 `runtime:"acp"` | `sessions_spawn`（默认运行时）    |

另请参阅 [子代理](/zh/tools/subagents)。

## ACP 如何运行 Claude Code

对于通过 ACP 运行的 Claude Code，技术栈如下：

1. OpenClaw ACP 会话控制平面。
2. 官方 `@openclaw/acpx` 运行时插件。
3. Claude ACP 适配器。
4. Claude 侧的运行时/会话机制。

ACP Claude 是一个具有 ACP 控制、会话恢复、后台任务跟踪以及可选对话/线程绑定的 **harness 会话**。

CLI 后端是独立的仅文本本地后备运行时 - 请参阅 [CLI 后端](/zh/gateway/cli-backends)。

对于操作员来说，实用的规则是：

- **想要 `/acp spawn`、可绑定会话、运行时控制或持久化工具工作？** 使用 ACP。
- **想要通过原始 CLI 进行简单的本地文本后备？** 请使用 CLI 后端。

## 绑定会话

### 思维模型

- **聊天界面** - 人们持续交谈的地方 (Discord 渠道、Telegram 主题、iMessage 聊天)。
- **ACP 会话** - OpenClaw 路由到的持久 Codex/Claude/Gemini 运行时状态。
- **子线程/主题** - 一个仅由 `--thread ...` 创建的可选额外消息界面。
- **运行时工作区** - 工具运行的文件系统位置（`cwd`、仓库检出、后端工作区）。独立于聊天界面。

### 当前对话绑定

`/acp spawn <harness> --bind here` 将当前对话固定到
生成的 ACP 会话——没有子线程，相同的聊天界面。OpenClaw 继续
负责传输、身份验证、安全和交付。该对话中的后续消息路由
到同一个会话；`/new` 和 `/reset` 原地重置
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
  <Accordion title="Binding rules and exclusivity">
    - `--bind here` 和 `--thread ...` 是互斥的。
    - `--bind here`OpenClawDiscord 仅在宣传当前会话绑定的频道上有效；否则，OpenClaw 会返回明确的不支持消息。绑定在网关重启后仍然保留。
    - 在 Discord 上，`spawnSessions` 会限制 `--thread auto|here` 的子线程创建 - 而不是 `--bind here`。
    - 如果你在没有 `--cwd`OpenClaw 的情况下生成了不同的 ACP 代理，OpenClaw 默认继承**目标代理的**工作区。缺失的继承路径（`ENOENT`/`ENOTDIR`）将回退到后端默认值；其他访问错误（例如 `EACCES`Gateway(网关)）将作为生成错误显示。
    - 网关管理命令在绑定的会话中保持本地 - 即使常规的后续文本路由到绑定的 ACP 会话，`/acp ...`OpenClaw 命令也由 OpenClaw 处理；只要该表面启用了命令处理，`/status` 和 `/unfocus` 也会保持本地。

  </Accordion>
  <Accordion title="Thread-bound sessions">
    当为渠道适配器启用线程绑定后：

    - OpenClaw 将线程绑定到目标 ACP 会话。
    - 该线程中的后续消息将路由到已绑定的 ACP 会话。
    - ACP 输出将返回到同一线程。
    - 失焦/关闭/归档/空闲超时或最大期限过期将移除绑定。
    - `/acp close`、`/acp cancel`、`/acp status`、`/status` 和 `/unfocus` 是 Gateway(网关) 命令，而非对 ACP 驱动器的提示。

    线程绑定 ACP 所需的功能标志：

    - `acp.enabled=true`
    - `acp.dispatch.enabled` 默认开启（设置 `false` 以暂停自动 ACP 线程分发；显式的 `sessions_spawn({ runtime: "acp" })` 调用仍然有效）。
    - 渠道适配器线程会话生成已启用（默认：`true`）：
      - Discord：`channels.discord.threadBindings.spawnSessions=true`
      - Telegram：`channels.telegram.threadBindings.spawnSessions=true`

    线程绑定支持取决于适配器。如果当前渠道适配器不支持线程绑定，OpenClaw 将返回一条明确的不支持/不可用消息。

  </Accordion>
  <Accordion title="Thread-supporting channels"DiscordTelegram>
    - 任何公开会话/线程绑定功能的渠道适配器。
    - 当前内置支持：**Discord** 线程/渠道、**Telegram** 话题（群组/超级群组中的论坛话题以及私信话题）。
    - 插件渠道可以通过相同的绑定接口添加支持。

  </Accordion>
</AccordionGroup>

## 持久化渠道绑定

对于非临时工作流，请在顶级 `bindings[]` 条目中配置持久的 ACP 绑定。

### 绑定模型

<ParamField path="bindings[].type" type='"acp"'>
  标记一个持久的 ACP 会话绑定。
</ParamField>
<ParamField path="bindings[].match" type="object">
  标识目标会话。按渠道区分的格式：

- **Discord 频道/主题：** `match.channel="discord"` + `match.peer.id="<channelOrThreadId>"`
- **Slack 频道/私信：** `match.channel="slack"` + `match.peer.id="<channelId|channel:<channelId>|#<channelId>|userId|user:<userId>|slack:<userId>|<@userId>>"`。建议使用稳定的 Slack ID；频道绑定也会匹配该频道主题内的回复。
- **Telegram 论坛主题：** `match.channel="telegram"` + `match.peer.id="<chatId>:topic:<topicId>"`
- **iMessage 私信/群组：** `match.channel="imessage"` + `match.peer.id="<handle|chat_id:*|chat_guid:*|chat_identifier:*>"`。对于稳定的群组绑定，首选 `chat_id:*`。

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
- `agents.list[].runtime.acp.agent` (harness id, e.g. `codex` or `claude`)
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
- 在绑定的会话中，`/new` 和 `/reset` 就地重置同一个 ACP 会话密钥。
- 临时运行时绑定（例如由线程聚焦流程创建的绑定）在存在时仍然适用。
- 对于没有显式 `cwd` 的跨代理 ACP 生成，OpenClaw 从代理配置继承目标代理工作区。
- 缺少的继承工作区路径将回退到后端默认的 cwd（当前工作目录）；非缺失的访问失败将作为生成错误呈现。

## 启动 ACP 会话

启动 ACP 会话有两种方式：

<Tabs>
  <Tab title="From sessions_spawn">
    使用 `runtime: "acp"` 从智能体轮次或工具调用启动 ACP 会话。

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
    `runtime` 默认为 `subagent`，因此请为 ACP 会话显式设置 `runtime: "acp"`。如果省略 `agentId`OpenClaw，OpenClaw 将在配置时使用 `acp.defaultAgent`。`mode: "session"` 需要 `thread: true` 来保持持久化绑定会话。
    </Note>

  </Tab>
  <Tab title="来自 /acp 命令">
    使用 `/acp spawn` 以便从聊天中进行显式操作员控制。

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

    请参阅 [斜杠命令](/zh/tools/slash-commands)。

  </Tab>
</Tabs>

### `sessions_spawn` 参数

<ParamField path="task" type="string" required>
  发送到 ACP 会话的初始提示。
</ParamField>
<ParamField path="runtime" type='"acp"' required>
  对于 ACP 会话，必须是 `"acp"`。
</ParamField>
<ParamField path="agentId" type="string">
  ACP 目标线束 ID。如果设置，则回退到 `acp.defaultAgent`。
</ParamField>
<ParamField path="thread" type="boolean" default="false">
  在支持的情况下请求线程绑定流程。
</ParamField>
<ParamField path="mode" type='"run" | "session"' default="run">
  `"run"` 是一次性的；`"session"` 是持久的。如果省略了 `thread: true` 和
  `mode`，根据运行时路径，OpenClaw 可能默认为持久行为。`mode: "session"` 需要 `thread: true`。
</ParamField>
<ParamField path="cwd" type="string">
  请求的运行时工作目录（由后端/运行时策略验证）。如果省略，ACP 生成会继承目标代理工作空间（如果已配置）；缺失的继承路径会回退到后端默认值，而实际的访问错误会被返回。
</ParamField>
<ParamField path="label" type="string">
  会话/横幅文本中使用的面向操作员的标签。
</ParamField>
<ParamField path="resumeSessionId" type="string">
  恢复现有的 ACP 会话而不是创建新的。代理通过 `session/load` 重放其对话历史。需要 `runtime: "acp"`。
</ParamField>
<ParamField path="streamTo" type='"parent"'>
  `"parent"` 将初始 ACP 运行进度摘要作为系统事件流式传输回请求者会话。接受的响应包括指向会话范围 JSONL 日志的 `streamLogPath` (`<sessionId>.acp-stream.jsonl`)，你可以查看它以获取完整的中继历史。
</ParamField>

ACP `sessions_spawn` 运行使用 `agents.defaults.subagents.runTimeoutSeconds` 作为其默认子轮次限制。该工具不接受每次调用的超时覆盖设置。

<ParamField path="model" type="string">
  ACP 子会话的显式模型覆盖。Codex ACP 生成实例会将
  OpenAI 引用（例如 `openai/gpt-5.4`）规范化为 Codex ACP 启动
  配置，位于 `session/new` 之前；斜杠形式（例如 `openai/gpt-5.4/high`）
  也会设置 Codex ACP 推理强度。
  如果省略，`sessions_spawn({ runtime: "acp" })` 将使用现有的
  子代理模型默认值（`agents.defaults.subagents.model` 或
  `agents.list[].subagents.model`）（如果已配置）；否则它将允许
  ACP 约束使用其自己的默认模型。
  其他约束必须通告 ACP `models` 并支持
  `session/set_model`；否则 OpenClaw/acpx 将明确失败，而不是
  静默回退到目标代理默认值。
</ParamField>
<ParamField path="thinking" type="string">
  显式思考/推理强度。对于 Codex ACP，`minimal` 映射到
  低强度，`low`/`medium`/`high`/`xhigh` 直接映射，而 `off`
  省略推理强度启动覆盖。
  如果省略，ACP 生成实例将使用现有的子代理思考默认值和
  所选模型的特定模型 `agents.defaults.models["provider/model"].params.thinking`。
</ParamField>

## 生成绑定和线程模式

<Tabs>
  <Tab title="--bind here|off">
    | 模式   | 行为                                                               |
    | ------ | ---------------------------------------------------------------------- |
    | `here` | 原地绑定当前活动对话；如果未激活，则失败。 |
    | `off`  | 不创建当前对话绑定。                          |

    注：

    - `--bind here` 是“使此渠道或聊天由 Codex 支持”的最简单操作员路径。
    - `--bind here` 不创建子线程。
    - `--bind here` 仅在支持当前对话绑定的渠道上可用。
    - `--bind` 和 `--thread` 不能在同一个 `/acp spawn` 调用中组合使用。

  </Tab>
  <Tab title="--thread auto|here|off">
    | 模式   | 行为                                                                                            |
    | ------ | --------------------------------------------------------------------------------------------------- |
    | `auto` | 在活动主题中：绑定该主题。在主题外：如果支持，创建/绑定子主题。 |
    | `here` | 需要当前活动主题；如果不在主题中则失败。                                                  |
    | `off`  | 无绑定。会话以未绑定状态启动。                                                                 |

    备注：

    - 在非主题绑定界面上，默认行为实际上是 `off`。
    - 主题绑定的生成需要渠道策略支持：
      - Discord：`channels.discord.threadBindings.spawnSessions=true`
      - Telegram：`channels.telegram.threadBindings.spawnSessions=true`
    - 当您想要固定当前对话而不创建子主题时，请使用 `--bind here`。

  </Tab>
</Tabs>

## 交付模型

ACP 会话可以是交互式工作区，也可以是由父级拥有的后台工作。交付路径取决于该形态。

<AccordionGroup>
  <Accordion title="Interactive ACP sessions">
    交互式会话旨在保持在一个可见的聊天界面上进行对话：

    - `/acp spawn ... --bind here` 将当前对话绑定到 ACP 会话。
    - `/acp spawn ... --thread ...` 将渠道主题/话题绑定到 ACP 会话。
    - 持久配置的 `bindings[].type="acp"`OpenClaw 将匹配的对话路由到同一个 ACP 会话。

    绑定对话中的后续消息直接路由到 ACP 会话，ACP 的输出则传回同一个渠道/主题/话题。

    OpenClaw 发送给 harness 的内容：

    - 普通的绑定后续消息作为提示文本发送，仅在 harness/后端支持时附带附件。
    - `/acp`Gateway(网关)OpenClawOpenClaw 管理命令和本地 Gateway(网关) 命令在 ACP 调度前被拦截。
    - 运行时生成的补全事件根据目标具体化。OpenClaw 代理获取 OpenClaw 的内部运行时上下文信封；外部 ACP harness 获取带有子结果和指令的纯提示。原始的 `<<<BEGIN_OPENCLAW_INTERNAL_CONTEXT>>>`OpenClaw 信封绝不应发送给外部 harness 或作为 ACP 用户转录文本持久化。
    - ACP 转录条目使用用户可见的触发文本或纯补全提示。内部事件元数据尽可能在 OpenClaw 中保持结构化，不被视为用户创作的聊天内容。

  </Accordion>
  <Accordion title="父级拥有的临时 ACP 会话">
    由另一个代理运行生成的临时 ACP 会话是后台子级，类似于子代理：

    - 父级通过 `sessions_spawn({ runtime: "acp", mode: "run" })`OpenClawOpenClaw 请求工作。
    - 子级在其自己的 ACP harness 会话中运行。
    - 子级轮次在与原生子代理生成使用的同一后台通道上运行，因此缓慢的 ACP harness 不会阻断不相关的主会话工作。
    - 完成情况通过任务完成公告路径汇报回来。OpenClaw 在将内部完成元数据发送给外部 harness 之前将其转换为纯 ACP 提示词，因此 harness 不会看到仅限 OpenClaw 的运行时上下文标记。
    - 当面向用户的回复有用时，父级会用正常的助手口吻重写子级结果。

    请**勿**将此路径视为父级和子级之间的点对点聊天。子级已经有一个完成渠道可以回传给父级。

  </Accordion>
  <Accordion title="sessions_send 和 A2A 投递">
    `sessions_send`OpenClaw 可以在生成后以另一个会话为目标。对于正常的
    对等会话，OpenClaw 在注入消息后使用代理到代理（A2A）的后续路径：

    - 等待目标会话的回复。
    - 可选地让请求者和目标交换有限次数的后续对话。
    - 请求目标生成一个公告消息。
    - 将该公告投递到可见渠道或线程。

    该 A2A 路径是发送者需要可见后续的对等发送的回退方案。当一个无关会话可以
    查看并向 ACP 目标发送消息时，例如在广泛的
    `tools.sessions.visibility`OpenClaw 设置下，它会保持启用状态。

    OpenClaw 仅在请求者是其自己拥有的父级一次性 ACP 子级的父级时跳过 A2A 后续。在这种情况下，
    在任务完成之上运行 A2A 可以用子级的结果唤醒父级，
    将父级的回复转发回子级，并
    创建父/子回声循环。`sessions_send` 结果报告
    `delivery.status="skipped"` 针对该拥有子级的情况，因为
    完成路径已经负责处理结果。

  </Accordion>
  <Accordion title="恢复现有会话">
    使用 `resumeSessionId` 继续之前的 ACP 会话，而不是重新开始。代理通过 `session/load` 重放其对话历史，因此它会获取之前内容的完整上下文。

    ```json
    {
      "task": "Continue where we left off - fix the remaining test failures",
      "runtime": "acp",
      "agentId": "codex",
      "resumeSessionId": "<previous-session-id>"
    }
    ```

    常见用例：

    - 将 Codex 会话从笔记本电脑转移到手机——告诉代理从你上次中断的地方继续。
    - 继续你在 CLI 中交互式启动的编码会话，现在通过代理以无头方式运行。
    - 恢复因网关重启或空闲超时而中断的工作。

    注意事项：

    - `resumeSessionId` 仅在 `runtime: "acp"` 时适用；默认的子代理运行时会忽略此仅限 ACP 的字段。
    - `streamTo` 仅在 `runtime: "acp"` 时适用；默认的子代理运行时会忽略此仅限 ACP 的字段。
    - `resumeSessionId` 是主机本地的 ACP/harness 恢复 ID，而不是 OpenClaw 渠道会话密钥；在调度之前，OpenClaw 仍会检查 ACP 生成策略和目标代理策略，而 ACP 后端或 harness 拥有加载该上游 ID 的授权。
    - `resumeSessionId` 恢复上游 ACP 对话历史；`thread` 和 `mode` 仍正常适用于你正在创建的新 OpenClaw 会话，因此 `mode: "session"` 仍然需要 `thread: true`。
    - 目标代理必须支持 `session/load`（Codex 和 Claude Code 支持）。
    - 如果找不到会话 ID，生成将失败并显示明确的错误——不会静默回退到新会话。

  </Accordion>
  <Accordion title="部署后冒烟测试">
    在网关部署后，运行一个实时的端到端检查，而不是
    信任单元测试：

    1. 在目标主机上验证已部署的网关版本和提交记录。
    2. 打开一个到实时代理的临时 ACPX 网桥会话。
    3. 要求该代理使用 `runtime: "acp"`、`agentId: "codex"`、`mode: "run"` 和任务 `Reply with exactly LIVE-ACP-SPAWN-OK` 调用 `sessions_spawn`。
    4. 验证 `accepted=yes`、一个真实的 `childSessionKey`，以及没有验证器错误。
    5. 清理临时的网桥会话。

    将开关保持在 `mode: "run"` 并跳过 `streamTo: "parent"` -
    线程绑定的 `mode: "session"` 和流中继路径是单独的、
    更丰富的集成通过。

  </Accordion>
</AccordionGroup>

## 沙箱兼容性

ACP 会话当前在主机运行时上运行，而不是在 OpenClaw 沙箱内运行。

<Warning>
**安全边界：**

- 外部线束可以根据其自己的 CLI 权限和所选的 `cwd` 进行读/写。
- OpenClaw 的沙箱策略**不会**包装 ACP 线束执行。
- OpenClaw 仍然会强制执行 ACP 功能门控、允许的代理、会话所有权、渠道绑定和 Gateway(网关) 交付策略。
- 请使用 `runtime: "subagent"` 进行沙箱强制的 OpenClaw 原生工作。

</Warning>

当前限制：

- 如果请求者会话已进行沙箱隔离，则将为 `sessions_spawn({ runtime: "acp" })` 和 `/acp spawn` 阻止 ACP 生成。
- 带有 `runtime: "acp"` 的 `sessions_spawn` 不支持 `sandbox: "require"`。

## 会话目标解析

大多数 `/acp` 操作都接受一个可选的会话目标（`session-key`、
`session-id` 或 `session-label`）。

**解析顺序：**

1. 显式目标参数（或 `/acp steer` 的 `--session`）
   - tries 键
   - 然后是 UUID 格式的会话 ID
   - 然后是标签
2. 当前线程绑定（如果此对话/线程已绑定到 ACP 会话）。
3. 当前请求者会话回退。

当前对话绑定和线程绑定都参与
第 2 步。

如果未解析到任何目标，OpenClaw 将返回明确的错误
(`Unable to resolve session target: ...`)。

## ACP 控件

| 命令                 | 作用                                      | 示例                                                          |
| -------------------- | ----------------------------------------- | ------------------------------------------------------------- |
| `/acp spawn`         | 创建 ACP 会话；可选的当前绑定或线程绑定。 | `/acp spawn codex --bind here --cwd /repo`                    |
| `/acp cancel`        | 取消目标会话进行中的轮次。                | `/acp cancel agent:codex:acp:<uuid>`                          |
| `/acp steer`         | 向运行中的会话发送引导指令。              | `/acp steer --session support inbox prioritize failing tests` |
| `/acp close`         | 关闭会话并解除线程目标绑定。              | `/acp close`                                                  |
| `/acp status`        | 显示后端、模式、状态、运行时选项、能力。  | `/acp status`                                                 |
| `/acp set-mode`      | 设置目标会话的运行时模式。                | `/acp set-mode plan`                                          |
| `/acp set`           | 通用运行时配置选项写入。                  | `/acp set model openai/gpt-5.4`                               |
| `/acp cwd`           | 设置运行时工作目录覆盖。                  | `/acp cwd /Users/user/Projects/repo`                          |
| `/acp permissions`   | 设置审批策略配置文件。                    | `/acp permissions strict`                                     |
| `/acp timeout`       | 设置运行时超时（秒）。                    | `/acp timeout 120`                                            |
| `/acp model`         | 设置运行时模型覆盖。                      | `/acp model anthropic/claude-opus-4-6`                        |
| `/acp reset-options` | 移除会话运行时选项覆盖。                  | `/acp reset-options`                                          |
| `/acp sessions`      | 列出存储中的近期 ACP 会话。               | `/acp sessions`                                               |
| `/acp doctor`        | 后端健康状况、功能、可执行的修复措施。    | `/acp doctor`                                                 |
| `/acp install`       | 打印确定性的安装和启用步骤。              | `/acp install`                                                |

`/acp status` 显示有效的运行时选项以及运行时级别和后端级别的会话标识符。当后端缺少某项功能时，不支持的控件错误会清晰地显示出来。`/acp sessions` 读取当前绑定或请求者会话的存储；目标令牌（`session-key`、`session-id` 或 `session-label`）通过网关会话发现机制进行解析，包括自定义的每代理 `session.store` 根目录。

### 运行时选项映射

`/acp` 具有便捷命令和一个通用设置器。等效操作：

| 命令                         | 映射到                       | 说明                                                                                                                                                                      |
| ---------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/acp model <id>`            | 运行时配置键 `model`         | 对于 Codex ACP，OpenClaw 将 `openai/<model>` 规范化为适配器模型 ID，并将斜杠推理后缀（如 `openai/gpt-5.4/high`）映射到 `reasoning_effort`。                               |
| `/acp set thinking <level>`  | 规范选项 `thinking`          | OpenClaw 会在存在时发送后端通告的等效项，首选 `thinking`，其次是 `effort`、`reasoning_effort` 或 `thought_level`。对于 Codex ACP，适配器会将值映射到 `reasoning_effort`。 |
| `/acp permissions <profile>` | 规范选项 `permissionProfile` | OpenClaw 在存在时发送后端通告的等效项，例如 OpenClaw`approval_policy`、`permission_profile`、`permissions` 或 `permission_mode`。                                         |
| `/acp timeout <seconds>`     | 规范选项 `timeoutSeconds`    | OpenClaw 在存在时发送后端通告的等效项，例如 OpenClaw`timeout` 或 `timeout_seconds`。                                                                                      |
| `/acp cwd <path>`            | 运行时 cwd 覆盖              | 直接更新。                                                                                                                                                                |
| `/acp set <key> <value>`     | 通用                         | `key=cwd` 使用 cwd 覆盖路径。                                                                                                                                             |
| `/acp reset-options`         | 清除所有运行时覆盖           | -                                                                                                                                                                         |

## acpx harness、插件设置和权限

有关 acpx harness 配置（Claude Code / Codex / Gemini CLI 别名）、plugin-tools 和 OpenClaw-tools MCP 桥接以及 ACP 权限模式，请参阅 [ACP agents - setup](/zh/tools/acp-agents-setup)。

## 故障排除

| 症状                                                                        | 可能原因                                                                        | 修复方法                                                                                                                                                           |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `ACP runtime backend is not configured`                                     | 后端插件缺失、已禁用或被 `plugins.allow` 阻止。                                 | 安装并启用后端插件，如果设置了白名单，请在 `plugins.allow` 中包含 `acpx`，然后运行 `/acp doctor`。                                                                 |
| `ACP is disabled by policy (acp.enabled=false)`                             | ACP 已全局禁用。                                                                | 设置 `acp.enabled=true`。                                                                                                                                          |
| `ACP dispatch is disabled by policy (acp.dispatch.enabled=false)`           | 已禁用从普通线程消息自动调度。                                                  | 设置 `acp.dispatch.enabled=true` 以恢复自动线程路由；显式的 `sessions_spawn({ runtime: "acp" })` 调用仍然有效。                                                    |
| `ACP agent "<id>" is not allowed by policy`                                 | Agent 不在允许列表中。                                                          | 使用允许的 `agentId` 或更新 `acp.allowedAgents`。                                                                                                                  |
| `/acp doctor` 报告后端在启动后立即未就绪                                    | 后端插件缺失、已禁用、被允许/拒绝策略阻止，或者其配置的可执行文件不可用。       | 安装/启用后端插件，重新运行 `/acp doctor`，如果它仍然不健康，请检查后端安装或策略错误。                                                                            |
| 未找到 Harness 命令                                                         | 适配器 CLI 未安装，外部插件缺失，或者非 Codex 适配器的首次运行 `npx` 获取失败。 | 运行 `/acp doctor`，在 Gateway(网关) 主机上安装/预热适配器，或显式配置 acpx agent 命令。                                                                           |
| 来自 harness 的 Model-not-found（模型未找到）                               | 模型 ID 对另一个提供商/ harness 有效，但对此 ACP 目标无效。                     | 使用该 harness 列出的模型，在 harness 中配置模型，或省略覆盖设置。                                                                                                 |
| 来自 harness 的供应商认证错误                                               | OpenClaw 运行状况良好，但目标 CLI/提供商未登录。                                | 登录或在 Gateway(网关) 主机环境中提供所需的提供商密钥。                                                                                                            |
| `Unable to resolve session target: ...`                                     | 错误密钥/id/标签令牌。                                                          | 运行 `/acp sessions`，复制确切的密钥/标签，然后重试。                                                                                                              |
| `--bind here requires running /acp spawn inside an active ... conversation` | `--bind here` 在没有可绑定的活动对话的情况下使用。                              | 移动到目标聊天/渠道并重试，或者使用非绑定生成。                                                                                                                    |
| `Conversation bindings are unavailable for <channel>.`                      | 适配器缺少当前对话 ACP 绑定功能。                                               | 在支持的情况下使用 `/acp spawn ... --thread ...`，配置顶层 `bindings[]`，或移动到支持的渠道。                                                                      |
| `--thread here requires running /acp spawn inside an active ... thread`     | `--thread here` 在线程上下文之外使用。                                          | 移动到目标线程或使用 `--thread auto`/`off`。                                                                                                                       |
| `Only <user-id> can rebind this channel/conversation/thread.`               | 另一位用户拥有活动绑定目标。                                                    | 作为所有者重新绑定，或使用不同的对话或线程。                                                                                                                       |
| `Thread bindings are unavailable for <channel>.`                            | 适配器缺少线程绑定功能。                                                        | 使用 `--thread off` 或移动到支持的适配器/渠道。                                                                                                                    |
| `Sandboxed sessions cannot spawn ACP sessions ...`                          | ACP 运行时在宿主端；请求者会话处于沙箱隔离状态。                                | 从沙箱隔离的会话中使用 `runtime="subagent"`，或者从非沙箱隔离的会话运行 ACP 生成。                                                                                 |
| `sessions_spawn sandbox="require" is unsupported for runtime="acp" ...`     | ACP 运行时请求了 `sandbox="require"`。                                          | 针对所需的沙箱隔离使用 `runtime="subagent"`，或者从非沙箱隔离的会话中使用带有 `sandbox="inherit"` 的 ACP。                                                         |
| `Cannot apply --model ... did not advertise model support`                  | 目标工具未暴露通用的 ACP 模型切换功能。                                         | 使用支持 ACP `models`/`session/set_model` 的工具，使用 Codex ACP 模型引用，或者如果工具具有自己的启动标志，则直接在工具中配置模型。                                |
| 绑定会话缺少 ACP 元数据                                                     | ACP 会话元数据已过期/被删除。                                                   | 使用 `/acp spawn` 重新创建，然后重新绑定/聚焦线程。                                                                                                                |
| `AcpRuntimeError: Permission prompt unavailable in non-interactive mode`    | `permissionMode` 阻止在非交互式 ACP 会话中进行写入/执行。                       | 将 `plugins.entries.acpx.config.permissionMode` 设置为 `approve-all` 并重启 Gateway(网关)。请参阅[权限配置](/zh/tools/acp-agents-setup#permission-configuration)。 |
| ACP 会话提前失败且输出很少                                                  | 权限提示被 `permissionMode`/`nonInteractivePermissions` 阻止。                  | 检查 Gateway(网关)日志中的 `AcpRuntimeError`。若要完全权限，请设置 `permissionMode=approve-all`；若要优雅降级，请设置 `nonInteractivePermissions=deny`。           |
| ACP 会话在完成工作后无限期停滞                                              | Harness 进程已完成，但 ACP 会话未报告完成。                                     | 更新 OpenClaw；当前的 acpx 清理会在关闭和 OpenClaw 启动时回收 Gateway(网关) 拥有的陈旧包装器和适配器进程。                                                         |
| Harness 看到 `<<<BEGIN_OPENCLAW_INTERNAL_CONTEXT>>>`                        | 内部事件信封在 ACP 边界处泄露。                                                 | 更新 OpenClaw 并重新运行补全流程；外部 Harness 应仅接收纯补全提示词。                                                                                              |

<Note>`Command blocked by PreToolUse hook: Native hook relay unavailable` 属于 原生 Codex hook 中继，而非 ACP/acpx。在绑定的 Codex 聊天中，使用 `/new` 或 `/reset` 启动新的会话；如果它工作一次后 在下一次原生工具调用时再次出现，请重启 Codex 应用服务器或 OpenClaw Gateway(网关)，而不是 重复 `/new`。请参阅 [Codex harness 故障排除](/zh/plugins/codex-harness#troubleshooting)。</Note>

## 相关

- [ACP agents - setup](/zh/tools/acp-agents-setup)
- [Agent send](/zh/tools/agent-send)
- [CLI 后端](/zh/gateway/cli-backends)
- [Codex harness](/zh/plugins/codex-harness)
- [Codex harness 运行时](/zh/plugins/codex-harness-runtime)
- [多代理沙盒工具](/zh/tools/multi-agent-sandbox-tools)
- [`openclaw acp` (桥接模式)](/zh/cli/acp)
- [子代理](/zh/tools/subagents)
