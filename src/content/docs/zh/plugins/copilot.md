---
summary: "OpenClawGitHub通过捆绑的 GitHub Copilot SDK 工具运行 OpenClaw 嵌入式代理轮次"
title: "Copilot SDK 工具"
read_when:
  - You want to use the bundled GitHub Copilot SDK harness for an agent
  - You need configuration examples for the `copilot` runtime
  - You are wiring an agent to subscription Copilot (github / openclaw / copilot) and want it to run through the Copilot CLI
---

捆绑的 `copilot`OpenClawGitHubCLI 扩展允许 OpenClaw 通过 GitHub Copilot CLI (`@github/copilot-sdk`)
运行嵌入式订阅 Copilot 代理轮次，而不是使用内置的 PI 工具。

当您希望 Copilot CLI 会话拥有低级代理循环时，请使用 Copilot SDK 工具：原生工具执行、
原生压缩 (CLI`infiniteSessions`CLI)，以及 `copilotHome`OpenClawOpenClaw 下的 CLI 管理线程状态。
OpenClaw 仍然拥有聊天通道、会话文件、模型选择、OpenClaw 动态工具（已桥接）、
审批、媒体传递、可见脚本镜像、`/btw` 侧边问题（由树内 PI 回退处理 — 请参阅
[侧边问题 (`/btw`)](#side-questions-btw)）以及 `openclaw doctor`。

有关更广泛的模型/提供商/运行时划分，请从
[代理运行时](/zh/concepts/agent-runtimes) 开始。

## 要求

- 可用的带有捆绑 OpenClaw`copilot` 扩展的 OpenClaw。
- 如果您的配置使用 `plugins.allow`，请包含 `copilot`（`extensions/copilot/openclaw.plugin.json`npm 中的清单
  id）。使用 npm 风格 `@openclaw/copilot` 包名的限制性
  许可列表将导致捆绑的插件被阻止，即使使用 `agentRuntime.id: "copilot"`，运行时也不会加载。
- 可以驱动 Copilot CLI 的 GitHub Copilot 订阅（或用于无头/cron 运行的
  GitHubCLI`gitHubToken` env / auth-profile 条目）。
- 一个可写的 `copilotHome` 目录。该框架默认为
  `~/.openclaw/agents/<agentId>/copilot` 以实现完全的每个代理隔离。当
  未设置显式的主目录时，平台默认值（Windows 上的 `%APPDATA%\copilot`Windows，
  或其他地方的 `$XDG_CONFIG_HOME/copilot`
  或 `~/.config/copilot`）将用作医生探测（doctor probe）的回退值。

`openclaw doctor` 运行该扩展的捆绑
[doctor contract](#doctor-and-probes)；那里的失败是
在选择加入代理之前确认环境准备就绪的标准方法。

## 按需 SDK 安装

Copilot 代理运行时将其小型 TypeScript 代码捆绑在
openclaw tarball 内部发货，但底层的 `@github/copilot-sdk` 包
（及其特定于平台的 `@github/copilot-<platform>-<arch>`CLI CLI
二进制文件）默认情况下**不**安装——它们总共会为
您的 openclaw 安装占用空间增加约 260 MB，而且大多数 openclaw 用户不会选择
Copilot 模型。

当您第一次选择 `github-copilot/*` 模型**并且**
您的配置通过 `agentRuntime: { id: "copilot" }` 将该模型（或其
提供商）选择加入 Copilot 代理运行时时（请参阅下面的 [Quickstart](#quickstartGitHub)），
向导会提议安装 SDK。
如果没有选择加入，openclaw 将使用其内置的 GitHub Copilot 提供商
并且从不提示安装 SDK：

```
The Copilot agent runtime needs @github/copilot-sdk (~260 MB on first
install, downloads the @github/copilot CLI binary for your platform).
Install now? [Y/n]
```

如果您接受，SDK 将安装到
`~/.openclaw/npm-runtime/copilot/` 并在后续运行中被检测到。
安装操作针对随 openclaw 在 `src/commands/copilot-sdk-install-manifest/package-lock.json` 处
发货的已检入 `package-lock.json` 运行 `npm ci`，
因此为此版本审核的确切传递依赖关系图会
保存在每台用户机器的磁盘上。

如果您拒绝，运行时将在首次调用时失败，并
提供可执行的安装消息；重新运行 `openclaw setup` 以重试安装
（或者，如果您需要离线安装，请将固定的清单复制到 `~/.openclaw/npm-runtime/copilot/` 并
自行运行 `npm ci`）。

运行时按以下顺序解析 SDK：

1. `import("@github/copilot-sdk")` 针对主机 openclaw 安装
   （包括源码/开发检出以及任何预先安装
   了 SDK 与 openclaw 并存的环境）。
2. 众所周知的备用目录 `~/.openclaw/npm-runtime/copilot/`（即
   向导安装目标）。

缺少 SDK 会显示一个错误代码为 `COPILOT_SDK_MISSING` 的单一错误
以及上述的手动安装命令。

## 快速入门

将一个模型（或一个提供商）固定到此工具：

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

这两种方式是等效的。当仅希望将单个模型通过工具路由时，
在该模型条目上使用 `agentRuntime.id`；当希望
该提供商下的每个模型都使用它时，在提供商上设置
`agentRuntime.id`。

## 支持的提供商

该工具声明支持规范 `github-copilot` 提供商
（与 `extensions/github-copilot` 拥有的 id 相同）：

- `github-copilot`

该集合之外的任何内容都会通过 `selection.ts` 的 `auto_pi` 分支
回退到 PI。

## 身份验证

每个代理的优先级，在 `runCopilotAttempt` 期间应用：

1. 尝试输入上的**显式 `useLoggedInUser: true`CLI**。使用在代理的 `copilotHome` 下
   解析的已登录 CLI 用户。
2. 尝试输入上的**显式 `gitHubToken`**（带有 `profileId` +
   `profileVersion`CLI）。适用于调用者希望绕过
   身份验证配置文件解析的直接 CLI 调用和测试。
3. 来自 `EmbeddedRunAttemptParams` 结构的**合同解析的 `resolvedApiKey` + `authProfileId`**。
   这是**生产主干路径**：
   core 在调用工具之前解析代理配置的 `github-copilot` 身份验证配置文件
   （通过 `src/infra/provider-usage.auth.ts:resolveProviderAuths`），并且工具直接使用这两个字段。
   这使得 `github-copilot:<profile>` 身份验证配置文件可以在无头 / cron / 多配置文件设置中
   端到端地工作，而无需环境变量。
4. 针对未配置身份验证配置文件的直接 CLI / dogfood 运行的**环境变量回退**。运行时按优先级顺序检查以下变量，这与附带的 `github-copilot` 提供商 (`extensions/github-copilot/auth.ts`) 和记录的 Copilot SDK 设置相匹配：
   1. `OPENCLAW_GITHUB_TOKEN` -- 针对特定工具的覆盖；设置此项以便为 OpenClaw 工具固定令牌，而不会干扰系统范围的 `gh` / Copilot CLI 配置。
   2. `COPILOT_GITHUB_TOKEN` -- 标准的 Copilot SDK / CLI 环境变量。
   3. `GH_TOKEN` -- 标准的 `gh` CLI 环境变量（与现有的 `github-copilot` 提供商优先级相匹配）。
   4. `GITHUB_TOKEN` -- 通用的 GitHub 令牌回退。

   第一个非空值获胜；空字符串被视为不存在。合成的池配置文件 ID 是 `env:<NAME>`，而 profileVersion 是令牌的不可逆 sha256 指纹，因此轮换环境值会彻底清除客户端池。

5. 当没有可用的令牌信号时的**默认 `useLoggedInUser`**。

每个代理都有一个专用的 `copilotHome`，因此 Copilot CLI 令牌、会话和配置不会在同一台机器上的代理之间泄漏。当宿主向工具提供一个代理目录时（将 SDK 状态与同一目录中 OpenClaw 的 `models.json` / `auth-profiles.json` 隔离），默认值为 `<agentDir>/copilot`，否则为 `~/.openclaw/agents/<agentId>/copilot`。
当您需要自定义位置（例如，用于迁移的共享挂载）时，可以在尝试输入中使用 `copilotHome: <path>` 进行覆盖。

`probeCopilotAuthShape`（请参阅 [Doctor and probes](#doctor-and-probes)）是纯形状检查，用于验证将使用上述哪种模式。它不执行实时的 SDK 握手。

## 配置表面

驱动器从每次尝试的输入
(`runCopilotAttempt({...})`) 以及 `extensions/copilot/src/` 内部的一小组环境默认值读取其配置：

- `copilotHome` — 每个代理的 CLI 状态目录（默认值见上文文档）。
- `model` — 字符串或 `{ provider, id, api? }`。如果省略，OpenClaw 将使用代理的常规模型选择，并且驱动器会验证解析出的提供商是否在受支持的集合中。
- `reasoningEffort` — `"low" | "medium" | "high" | "xhigh"`。映射自
  OpenClaw 在 `auto-reply/thinking.ts` 中的 `ThinkLevel` / `ReasoningLevel` 解析结果。
- `infiniteSessionConfig` — 由 `harness.compact` 驱动的 SDK
  `infiniteSessions` 块的可选覆盖。默认值可以安全地保持不变。
- `hooksConfig` — 可选的桥接配置，用于将 OpenClaw
  的消息写入前/后挂钩暴露给 SDK 循环。
- `permissionPolicy` — 用于内置 SDK 工具类型
  (`shell`, `write`, `read`, `url`, `mcp`, `memory`, `hook`) 的 SDK
  `onPermissionRequest` 处理程序的可选覆盖。作为安全网，默认为
  `rejectAllPolicy`；实际上，SDK 从不调用这些类型中的任何一个，因为每个桥接的 OpenClaw 工具都
  注册了 `overridesBuiltInTool: true` 和
  `skipPermission: true`，因此 100% 的工具调用都通过 OpenClaw 包装的
  `execute()` 流动。请参阅 [权限和 ask_user](#permissions-and-ask_user)。
- `enableSessionTelemetry` — 通过
  `telemetry-bridge.ts` 选择加入 OpenTelemetry 路由。

OpenClaw 的其余部分无需了解这些字段。其他
插件、通道和核心代码只能看到标准的
`AgentHarnessAttemptParams` / `AgentHarnessAttemptResult` 形状。

## 压缩

当 `harness.compact` 运行时，Copilot SDK 线束：

1. 在 SDK 会话上启用 `infiniteSessions`。
2. 允许 SDK 执行其原生的压缩。
3. 在
   `workspacePath/files/openclaw-compaction-<ts>.json` 处写入一个 OpenClaw 形状的标记，以便现有的 OpenClaw
   副本读取器仍然可以看到熟悉的产物。

OpenClaw 侧副本镜像（见下文）继续接收
压缩后的消息，因此面向用户的聊天历史保持一致。

## 副本镜像

`runCopilotAttempt` 通过
`extensions/copilot/src/dual-write-transcripts.ts` 将每个回合可镜像的消息双写到
OpenClaw 审计副本中。镜像是
按会话作用域的 (`copilot:${sessionId}`)，并使用每条消息
的身份 (`${role}:${sha256_16(role,content)}`)，以便重新发送先前回合
的条目时与现有的磁盘键冲突而不重复。

镜像被包裹在两层故障遏制中，因此副本
写入失败不会导致尝试失败：一个内部尽力而为的包装器和一个
尝试级别的纵深防御 `.catch(...)`。故障会被记录但
不会暴露。

## 侧面问题 (`/btw`)

`/btw` 在此线束上**不是**原生的。`createCopilotAgentHarness()`
故意将 `harness.runSideQuestion` 留空，因此 OpenClaw 的 `/btw`
调度器 (`src/agents/btw.ts`) 会回退到其用于每个非 Codex 运行时的相同树内 PI 回退
路径：直接使用简短的侧面问题提示调用配置的模型提供商，并通过
`streamSimple` 流式返回（无 CLI 会话，无额外池槽位）。

这将 Copilot CLI 会话保留给代理的主要回合循环，并
使 `/btw` 行为与其他支持的 PI 运行时相同。该契约在
[`extensions/copilot/harness.test.ts`](https://github.com/openclaw/openclaw/blob/main/extensions/copilot/harness.test.ts)
中的 `describe("runSideQuestion")` 下进行了断言。

## 诊断和探针

`extensions/copilot/doctor-contract-api.ts` 由
`src/plugins/doctor-contract-registry.ts` 自动加载。它提供了：

- 一个空的 `legacyConfigRules`（在 MVP 阶段没有废弃的字段）。
- 一个空操作的 `normalizeCompatibilityConfig`（保留此项以便将来废弃字段时
  有一个稳定的内部位置）。
- 一个 `sessionRouteStateOwners` 条目，声明提供商 `github-copilot`；
  运行时 `copilot`CLI；CLI 会话密钥 `copilot`；认证配置文件
  前缀 `github-copilot:`。

`extensions/copilot/src/doctor-probes.ts` 导出了三个命令式探针，
主机（包括 `openclaw doctor`）可以调用它们来验证环境：

| 探针                       | 检查内容                                                                       | 失败原因                                                                         |
| -------------------------- | ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| `probeCopilotCliVersion`   | `copilot --version` 退出码为 0 且包含非空版本字符串                            | `non-zero-exit`、`empty-version`、`spawn-failed`、`spawn-error`、`probe-timeout` |
| `probeCopilotHomeWritable` | `mkdir -p copilotHome` + 写入 + 删除标记文件                                   | `copilothome-not-writable`（其中包含 `details.rawError` 中的底层 fs 错误）       |
| `probeCopilotAuthShape`    | 至少满足 `useLoggedInUser`、`gitHubToken` 或 `profileId`+`profileVersion` 之一 | `no-auth-source`                                                                 |

每个探针都接受一个 DI 接缝（`spawnFn`、`fsApi`CLI），以便测试不生成
真正的 Copilot CLI 或接触主机 fs。

## 限制

- 在 MVP 阶段，该工具仅声明规范的 `github-copilot` 提供商。
  额外的提供商（BYOK 或其他）应在后续的 PR 中落地，这些 PR
  应将适配器与连接代码一起发布。
- 该工具不提供 TUI；PI 的 TUI 不受影响，并且仍然是
  没有对等界面的运行时的后备选项。
- 当代理切换到 `copilot` 时，PI 会话状态不会迁移。
  选择是针对每次尝试的；现有的 PI 会话仍然有效。
- **交互式 `ask_user` 尚未连接。** SDK 的
  `onUserInputRequest` 处理程序被有意未注册，根据
  SDK 契约，这会完全对模型隐藏 `ask_user` 工具。
  在此工具下运行的代理会根据初始提示做出最佳判断
  决策，而不是在轮次中提出澄清问题。
  后续工作会将 `extensions/codex/src/app-server/user-input-bridge.ts` 处的 codex 模式移植
  以通过 OpenClaw 渠道/TUI 提示路径路由 SDK
  `UserInputRequest`OpenClawTUI；`extensions/copilot/src/user-input-bridge.ts` 中
  处于休眠状态的脚手架是后续工作将要连接的界面。

## 权限和 ask_user

桥接 OpenClaw 工具的权限执行发生在**工具包装器内部**，
而不是通过 SDK 的 OpenClaw`onPermissionRequest` 回调。
`createOpenClawCodingTools` 应用与 PI 所用相同的
`wrapToolWithBeforeToolCallHook` (`src/agents/pi-tools.before-tool-call.ts`)
到每个编码工具：循环检测、
受信任的插件策略、工具调用前挂钩以及通过网关 (`plugin.approval.request`) 进行的两阶段插件
批准，所有这些都以与原生 PI 尝试完全相同的代码路径运行。

为了让该包装器拥有决策权，由
`convertOpenClawToolToSdkTool` 返回的 SDK 工具被标记为：

- `overridesBuiltInTool: true`CLIOpenClaw — 替换 Copilot CLI 内置的
  同名工具（edit、read、write、bash 等），以便每个工具
  调用都路由回 OpenClaw。
- `skipPermission: true` — 告诉 SDK 不要在调用
  工具之前触发 `onPermissionRequest({kind: "custom-tool"})`。
  包装后的 `execute()`OpenClawOpenClaw 在内部执行更丰富的 OpenClaw 策略检查；
  SDK 级别的提示要么会绕过 OpenClaw 的
  执行（如果我们允许全部），要么会阻止每个工具调用（如果我们
  拒绝全部）——这两种情况都不符合 PI 奇偶校验。

内置的 codex harness 使用相同的拆分：桥接的 OpenClaw 工具被包装（`extensions/codex/src/app-server/dynamic-tools.ts`），并且 codex-app-server 自身的原生审批类型（`item/commandExecution/requestApproval`、`item/fileChange/requestApproval`、`item/permissions/requestApproval`）通过 `plugin.approval.request`（`extensions/codex/src/app-server/approval-bridge.ts`）进行路由。Copilot SDK 的等效项——即针对任何到达 `onPermissionRequest` 的非 `custom-tool` 类型进行失效关闭 `rejectAllPolicy`——是相同的安全网，实际上它不会触发，因为 `overridesBuiltInTool: true` 取代了所有内置项。

为了使封装工具层做出与 PI 等效的策略决策，
harness 将完整的 PI 尝试工具上下文转发给
`createOpenClawCodingTools` — 身份（`senderIsOwner`、
`memberRoleIds`、`ownerOnlyToolAllowlist`，……）、渠道/路由
（`groupId`、`currentChannelId`、`replyToMode`、消息工具切换开关）、
身份验证（`authProfileStore`）、运行身份
（从 `sandboxSessionKey`、`runId` 派生的 `sessionKey`/`runSessionKey`）、
模型上下文（`modelApi`、`modelContextWindowTokens`、
`modelCompat`、`modelHasVision`）和运行钩子（`onToolOutcome`、
`onYield`）。如果没有这些字段，仅限所有者的允许列表将静默
表现为默认拒绝，插件信任策略无法解析到
正确的范围，并且 `session_status: "current"` 将解析为过时的
sandbox 密钥。桥接构建器位于
`extensions/copilot/src/tool-bridge.ts` 中，并镜像了位于
`src/agents/pi-embedded-runner/run/attempt.ts:1029-1117` 的 PI
权威调用。两个 PI 字段
在 MVP 中故意**未**转发，并被跟踪为后续跟进事项：
`sandbox`（harness 尚未通过 `resolveSandboxContext` 路由）
以及 PI 工具搜索/代码模式机制
（`toolSearchCatalogRef`、`includeCoreTools`、
`includeToolSearchControls`、`toolSearchCatalogExecutor`、
`toolConstructionPlan`），这些在 SDK 边界没有类似机制。

### 会话级 GitHub 令牌

Copilot SDK 契约区分了用于对 CLI 进程本身进行身份验证的**客户端级别** GitHub 令牌 (GitHub`CopilotClientOptions.gitHubToken`CLI) 与决定该会话的内容排除、模型路由和配额并在 `createSession` 和 `resumeSession` 上均受到尊重的**会话级别**令牌 (`SessionConfig.gitHubToken`)。该工具通过 `resolveCopilotAuth` 一次性解析身份验证，并在身份验证模式为 `gitHubToken`（显式的 `auth.gitHubToken` 或来自已配置 `github-copilot` 身份验证配置文件的契约解析 `resolvedApiKey`）时设置这两个字段。当解析后的模式为 `useLoggedInUser` 时，将省略会话级别字段，以便 SDK 继续从登录的身份派生标识。

`ask_user` 被有意隐藏 — 请参见上面的限制。

## 相关

- [Agent runtimes](/zh/concepts/agent-runtimes)
- [Codex harness](/zh/plugins/codex-harness)
- [Agent harness plugins (SDK reference)](/zh/plugins/sdk-agent-harness)
