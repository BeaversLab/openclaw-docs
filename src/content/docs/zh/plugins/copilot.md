---
summary: "OpenClawGitHub通过外部 GitHub Copilot SDK 套件运行 OpenClaw 嵌入式 agent 轮次"
title: "Copilot SDK 工具"
read_when:
  - You want to use the GitHub Copilot SDK harness for an agent
  - You need configuration examples for the `copilot` runtime
  - You are wiring an agent to subscription Copilot (github / openclaw / copilot) and want it to run through the Copilot CLI
---

外部 `@openclaw/copilot`OpenClawGitHubCLI 插件允许 OpenClaw 通过 GitHub Copilot CLI (`@github/copilot-sdk`) 运行嵌入式订阅 Copilot agent 轮次，而不是使用内置的 PI 套件。

当您希望 Copilot CLI 会话拥有底层 agent 循环（原生工具执行、原生压缩 (CLI`infiniteSessions`CLI) 以及 CLI 在 `copilotHome`OpenClawOpenClaw 下管理的线程状态）时，请使用 Copilot SDK 套件。
OpenClaw 仍然拥有聊天通道、会话文件、模型选择、OpenClaw 动态工具（桥接）、审批、媒体交付、可见的转录镜像、`/btw` 侧面问题（由内置 PI 回退处理 — 请参阅 [侧面问题 (`/btw`)](#side-questions-btw)）以及 `openclaw doctor`。

有关更广泛的模型/提供商/运行时划分，请从
[Agent runtimes](/zh/concepts/agent-runtimes) 开始。

## 要求

- 安装了 OpenClaw`@openclaw/copilot` 插件的 OpenClaw。
- 如果您的配置使用 `plugins.allow`，请包含 `copilot`npm（插件声明的清单 ID）。如果限制性允许列表使用 npm 风格的 `@openclaw/copilot` 包名称，则插件将保持阻止状态，并且即使在 `agentRuntime.id: "copilot"` 下运行时也不会加载。
- 可以驱动 Copilot CLI 的 GitHub Copilot 订阅（或用于无头/定时运行的 GitHubCLI`gitHubToken` env / auth-profile 条目）。
- 一个可写的 `copilotHome` 目录。该工具默认使用
  `~/.openclaw/agents/<agentId>/copilot` 以实现完全的每个代理隔离。当
  没有显式设置主目录时，平台默认值（Windows 上的 `%APPDATA%\copilot`，或其他地方的 `$XDG_CONFIG_HOME/copilot`
  或 `~/.config/copilot`）将用作诊断探针的回退项。

`openclaw doctor` 为该扩展运行
插件 [doctor contract](#doctor-and-probes)；那里的失败是
在启用代理之前确认环境准备就绪的标准方式。

## 插件安装

Copilot 运行时是一个外部插件，因此核心 `openclaw` 包
不携带 `@github/copilot-sdk` 依赖项或其特定于平台的
`@github/copilot-<platform>-<arch>` CLI 二进制文件。它们加起来大约
260 MB，因此仅为选择加入此运行时的代理安装它们：

```bash
openclaw plugins install @openclaw/copilot
```

当您首次选择一个
`github-copilot/*` 模型**并且**您的配置通过
`agentRuntime: { id: "copilot" }` 将该模型（或其提供商）选择加入
Copilot 代理运行时时，向导会安装该插件
（请参阅下面的 [Quickstart](#quickstart)）。
如果没有选择加入，openclaw 将使用其内置的 GitHub Copilot 提供商
并且从不安装运行时插件。

运行时按以下顺序解析 SDK：

1. 来自已安装 `@openclaw/copilot`
   包的 `import("@github/copilot-sdk")`。
2. 众所周知的回退目录 `~/.openclaw/npm-runtime/copilot/`（即
   传统的按需安装目标）。

缺少 SDK 会显示代码为 `COPILOT_SDK_MISSING` 的单个错误
以及上面的插件重新安装命令。

## 快速入门

将一个模型（或一个提供商）固定到该工具：

```json5
{
  agents: {
    defaults: {
      model: "github-copilot/gpt-5.5",
      models: {
        "github-copilot/gpt-5.5": {
          agentRuntime: { id: "copilot" },
        },
      },
    },
  },
}
```

这两种方法是等效的。当仅应通过该工具路由该模型时，在单个模型条目上使用
`agentRuntime.id`；当该提供商下的每个模型
都应使用它时，在提供商上设置 `agentRuntime.id`。

## 支持的提供商

该工具声明支持规范的 `github-copilot` 提供商
（由 `extensions/github-copilot` 拥有的相同 id）：

- `github-copilot`

超出该集合的任何内容都会通过 `selection.ts` 的 `auto_pi` 分支回退到 PI。

## 身份验证

每个代理的优先级，在 `runCopilotAttempt` 期间应用：

1. **显式 `useLoggedInUser: true`** 位于尝试输入上。使用在代理的 `copilotHome` 下解析的 Copilot CLI 已登录用户。
2. **显式 `gitHubToken`** 位于尝试输入上（带有 `profileId` +
   `profileVersion`）。适用于调用方想要绕过身份验证配置文件解析的直接 CLI 调用和测试。
3. **从 `EmbeddedRunAttemptParams` 形状解析的 `resolvedApiKey` + `authProfileId`**。这是**生产主要路径**：
   core 在调用 harness 之前解析代理已配置的 `github-copilot` 身份验证配置文件
   （通过 `src/infra/provider-usage.auth.ts:resolveProviderAuths`），并且 harness 直接使用这两个字段。
   这使得 `github-copilot:<profile>` 身份验证配置文件可以在无头 / cron / 多配置文件设置中端到端工作，而无需环境变量。
4. **环境变量回退**，适用于未配置身份验证配置文件的直接 CLI / dogfood 运行。运行时按优先级顺序检查以下变量，
   映射已发布的 `github-copilot` 提供商
   （`extensions/github-copilot/auth.ts`）和文档化的 Copilot SDK
   设置：
   1. `OPENCLAW_GITHUB_TOKEN` -- harness 特定覆盖；设置此项
      可为 OpenClaw harness 固定令牌，而不会干扰
      系统范围的 `gh` / Copilot CLI 配置。
   2. `COPILOT_GITHUB_TOKEN` -- 标准 Copilot SDK / CLI 环境变量。
   3. `GH_TOKEN` -- 标准 `gh` CLI 环境变量（匹配现有的
      `github-copilot` 提供商优先级）。
   4. `GITHUB_TOKEN` -- 通用 GitHub 令牌回退。

   第一个非空值优先；空字符串被视为不存在。综合的 pool profile id 为 `env:<NAME>`，而 profileVersion 是 token 的不可逆 sha256 指纹，因此轮换环境变量值会彻底清除客户端池。

5. 当没有可用的 token 信号时的**默认 `useLoggedInUser`**。

每个代理都会获得一个专用的 `copilotHome`，以便 Copilot CLI token、会话和配置不会在同一台机器上的代理之间泄漏。默认情况下，当宿主向工具提供代理目录时（将 SDK 状态与同一目录中的 OpenClaw 的 `models.json` / `auth-profiles.json` 隔离），默认值为 `<agentDir>/copilot`，否则为 `~/.openclaw/agents/<agentId>/copilot`。如果需要自定义位置（例如，用于迁移的共享挂载），可以在 attempt 输入中使用 `copilotHome: <path>` 进行覆盖。

`probeCopilotAuthShape`（参见 [Doctor and probes](#doctor-and-probes)）是纯形状检查，用于验证将使用上述哪种模式。它不执行实时的 SDK 握手。

## 配置界面

工具从每次尝试的输入 (`runCopilotAttempt({...})`) 以及 `extensions/copilot/src/` 内部的一小组环境变量默认值中读取其配置：

- `copilotHome` — 每个代理的 CLI 状态目录（默认值如上所述）。
- `model` — 字符串或 `{ provider, id, api? }`。如果省略，OpenClaw 将使用代理的常规模型选择，并且工具会验证解析出的提供商是否在支持的集合中。
- `reasoningEffort` — `"low" | "medium" | "high" | "xhigh"`。从 OpenClaw 在 `auto-reply/thinking.ts` 中的 `ThinkLevel` / `ReasoningLevel` 解析进行映射。
- `infiniteSessionConfig` — 由 `harness.compact` 驱动的 SDK `infiniteSessions` 块的可选覆盖。默认值保持原样即可。
- `hooksConfig` — 可选的桥接配置，向 SDK 循环暴露 OpenClaw 的消息写入前/后挂钩。
- `permissionPolicy` — 用于内置 SDK 工具类型 (`shell`, `write`, `read`, `url`, `mcp`, `memory`, `hook`) 的 SDK `onPermissionRequest` 处理程序的可选覆盖。作为安全网默认为 `rejectAllPolicy`；实际上 SDK 永远不会调用这些类型中的任何一个，因为每个桥接的 OpenClaw 工具都使用 `overridesBuiltInTool: true` 和 `skipPermission: true` 注册，因此 100% 的工具调用都通过 OpenClaw 包装的 `execute()`。请参阅 [Permissions and ask_user](#permissions-and-ask_user)。
- `enableSessionTelemetry` — 通过 `telemetry-bridge.ts` 选择加入 OpenTelemetry 路由。

OpenClaw 的其余部分不需要了解这些字段。其他插件、通道和核心代码只能看到标准的 `AgentHarnessAttemptParams` / `AgentHarnessAttemptResult` 形状。

## 压缩

当 `harness.compact` 运行时，Copilot SDK 套件：

1. 在 SDK 会话上启用 `infiniteSessions`。
2. 让 SDK 执行其原生压缩。
3. 在 `workspacePath/files/openclaw-compaction-<ts>.json` 处写入 OpenClaw 形状的标记，以便现有的 OpenClaw 转录读取器仍然可以看到熟悉的工件。

OpenClaw 端转录镜像（见下文）继续接收压缩后消息，因此面向用户的聊天历史保持一致。

## 转录镜像

`runCopilotAttempt`OpenClaw 将每个回合的可镜像消息双重写入
OpenClaw 审计记录，通过
`extensions/copilot/src/dual-write-transcripts.ts` 实现。镜像是
按会话作用域的 (`copilot:${sessionId}`)，并使用逐消息
标识 (`${role}:${sha256_16(role,content)}`)，因此重新发出先前回合的
条目会与现有的磁盘键冲突，而不会重复。

镜像包含在两层故障隔离中，因此记录写入
故障不会导致尝试失败：内部的尽力而为包装器和尝试
级别的深度防御 `.catch(...)`。故障会被记录，但
不会呈现给用户。

## 侧边问题 (`/btw`)

`/btw` 在此工具中**不**是原生的。`createCopilotAgentHarness()`
故意将 `harness.runSideQuestion`OpenClaw 留空，因此 OpenClaw 的 `/btw`
调度器 (`src/agents/btw.ts`) 会回退到与其用于每个非 Codex 运行时相同的
内部 PI 回退路径：直接使用简短的侧边问题提示调用配置的模型提供商，并
通过 `streamSimple`CLI 流式传输回来（无 CLI 会话，无额外池槽位）。

这将 Copilot CLI 会话保留给代理的主要回合循环，并
使 CLI`/btw` 行为与其他支持的 PI 运行时保持一致。该契约在
[`extensions/copilot/harness.test.ts`](https://github.com/openclaw/openclaw/blob/main/extensions/copilot/harness.test.ts)
中的 `describe("runSideQuestion")` 下进行了断言。

## 诊断和探测

`extensions/copilot/doctor-contract-api.ts` 由
`src/plugins/doctor-contract-registry.ts` 自动加载。它提供了：

- 一个空的 `legacyConfigRules`（在 MVP 阶段没有废弃的字段）。
- 一个无操作的 `normalizeCompatibilityConfig`（保留以便未来字段废弃
  有一个稳定的内部归宿）。
- 一个 `sessionRouteStateOwners` 条目，声明提供商 `github-copilot`；
  运行时 `copilot`CLI；CLI 会话密钥 `copilot`；身份验证配置文件
  前缀 `github-copilot:`。

`extensions/copilot/src/doctor-probes.ts` 导出三个命令式探针，
主机（包括 `openclaw doctor`）可以调用这些探针来验证环境：

| 探针                       | 检查内容                                                                        | 可能失败的原因                                                                       |
| -------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `probeCopilotCliVersion`   | `copilot --version` 以退出代码 0 退出并返回非空版本字符串                       | `non-zero-exit`， `empty-version`， `spawn-failed`， `spawn-error`， `probe-timeout` |
| `probeCopilotHomeWritable` | `mkdir -p copilotHome` + 写入 + 删除标记文件                                    | `copilothome-not-writable`（在 `details.rawError` 中包含底层文件系统错误）           |
| `probeCopilotAuthShape`    | 至少存在 `useLoggedInUser`、 `gitHubToken` 或 `profileId`+`profileVersion` 之一 | `no-auth-source`                                                                     |

每个探针接受一个 DI 接缝（`spawnFn`， `fsApi`），以便测试不生成
真实的 Copilot CLI 或接触主机文件系统。

## 局限性

- 该驱动在 MVP 阶段仅支持规范的 `github-copilot` 提供商。
  额外的提供商（BYOK 或其他）应在后续 PR 中落地，这些 PR 应
  将适配器与连接代码一起发布。
- 该驱动不提供 TUI；PI 的 TUI 不受影响，并仍是
  没有对等表面的任何运行时的回退方案。
- 当代理切换到 `copilot` 时，不会迁移 PI 会话状态。
  选择是按尝试进行的；现有的 PI 会话仍然有效。
- **交互式 `ask_user` 尚未连接。** SDK 的
  `onUserInputRequest` 处理程序是故意未注册的，根据 SDK 契约，这会完全向模型隐藏 `ask_user` 工具。
  在此工具下运行的代理会根据初始提示做出最佳判断决策，而不是在轮次中途提出澄清问题。
  后续工作将把 `extensions/codex/src/app-server/user-input-bridge.ts` 中的 codex 模式移植过来，以通过 OpenClaw 渠道/TUI 提示路径路由 SDK
  `UserInputRequest`；`extensions/copilot/src/user-input-bridge.ts` 中
  的休眠脚手架是该后续工作将要连接的表面。

## 权限和 ask_user

桥接 OpenClaw 工具的权限强制执行发生在**工具包装器内部**，而不是通过 SDK 的 `onPermissionRequest` 回调。
PI 使用的相同 `wrapToolWithBeforeToolCallHook`
(`src/agents/pi-tools.before-tool-call.ts`) 由 `createOpenClawCodingTools` 应用于每个编码工具：循环检测、
受信任插件策略、工具调用前挂钩以及通过网关 (`plugin.approval.request`) 进行的两阶段插件批准，
均在与原生 PI 尝试完全相同的代码路径上运行。

为了让该包装器拥有决策权，由 `convertOpenClawToolToSdkTool` 返回的 SDK 工具被标记为：

- `overridesBuiltInTool: true` — 替换 Copilot CLI 的内置
  同名工具（edit、read、write、bash 等），以便每个工具调用都路由回 OpenClaw。
- `skipPermission: true` — 告诉 SDK 在调用工具之前不要触发
  `onPermissionRequest({kind: "custom-tool"})`。
  包装后的 `execute()` 在内部执行更丰富的 OpenClaw 策略检查；
  SDK 级别的提示要么会短路 OpenClaw 的
  强制执行（如果我们允许所有），要么会阻止每个工具调用（如果我们拒绝所有）—— 这两者都不符合 PI 同等性。

内置 codex harness 使用相同的拆分：桥接的 OpenClaw 工具被包装 (`extensions/codex/src/app-server/dynamic-tools.ts`)，并且 codex-app-server 自己的原生审批类型 (`item/commandExecution/requestApproval`, `item/fileChange/requestApproval`, `item/permissions/requestApproval`) 通过 `plugin.approval.request` (`extensions/codex/src/app-server/approval-bridge.ts`) 进行路由。Copilot SDK 的等效机制——即对任何到达 `onPermissionRequest` 的非 `custom-tool` 类型进行 fail-closed `rejectAllPolicy` ——是相同的安全网，并且在实践中不会触发，因为 `overridesBuiltInTool: true` 会取代所有内置功能。

为了使封装工具层做出与 PI 等效的策略决策，
控制器将完整的 PI attempt-工具 上下文转发到
`createOpenClawCodingTools` — 身份（`senderIsOwner`，
`memberRoleIds`，`ownerOnlyToolAllowlist`，……）、渠道/路由
（`groupId`，`currentChannelId`，`replyToMode`，message-工具 切换）、
身份验证（`authProfileStore`）、运行身份
（从 `sandboxSessionKey`
派生的 `sessionKey`/`runSessionKey`，
`runId`）、模型上下文（`modelApi`，`modelContextWindowTokens`，
`modelCompat`，`modelHasVision`）和运行钩子（`onToolOutcome`，
`onYield`）。如果没有这些字段，仅限所有者的允许列表将静默地
表现为默认拒绝，插件信任策略无法解析为
正确的作用域，并且 `session_status: "current"` 将解析为过时的
沙箱密钥。桥接构建器位于
`extensions/copilot/src/tool-bridge.ts` 中，并镜像了 `src/agents/pi-embedded-runner/run/attempt.ts:1029-1117` 处的
PI 权威调用。两个 PI 字段
在 MVP 中故意**未**转发，并被标记为后续跟踪项：
`sandbox`（控制器尚未通过 `resolveSandboxContext` 路由）
以及 PI 工具搜索/代码模式机制
（`toolSearchCatalogRef`，`includeCoreTools`，
`includeToolSearchControls`，`toolSearchCatalogExecutor`，
`toolConstructionPlan`），这些在 SDK 边界没有对应物。

### 会话级 GitHub 令牌

Copilot SDK 契约区分了**客户端级别**的 GitHub 令牌（`CopilotClientOptions.gitHubToken`，用于对 CLI 进程本身进行身份验证）和**会话级别**的令牌（`SessionConfig.gitHubToken`，它决定了该会话的内容排除、模型路由和配额，并且在 `createSession` 和 `resumeSession` 上均受尊重）。当身份验证模式为 `gitHubToken`（显式的 `auth.gitHubToken` 或来自配置的 `github-copilot` 身份验证配置文件的契约解析的 `resolvedApiKey`）时，harness 通过 `resolveCopilotAuth` 解析一次身份验证并设置这两个字段。当解析的模式为 `useLoggedInUser` 时，会话级别字段将被省略，以便 SDK 继续从已登录的身份派生身份。

`ask_user` 是有意隐藏的 — 请参阅上面的局限性。

## 相关

- [Agent runtimes](/zh/concepts/agent-runtimes)
- [Codex harness](/zh/plugins/codex-harness)
- [Agent harness plugins (SDK reference)](/zh/plugins/sdk-agent-harness)
