---
summary: "测试套件：单元/e2e/live 套件，Docker 运行器，以及每个测试涵盖的内容"
read_when:
  - Running tests locally or in CI
  - Adding regressions for model/provider bugs
  - Debugging gateway + agent behavior
title: "测试"
---

# 测试

OpenClaw 有三个 Vitest 套件（单元/集成、E2E、Live）和一小部分 Docker 运行器。

这份文档是一份“我们要如何测试”的指南：

- 每个套件涵盖的内容（以及它故意*不*涵盖的内容）
- 针对常见工作流（本地、推送前、调试）运行哪些命令
- Live 测试如何发现凭证并选择模型/提供商
- 如何为现实世界的模型/提供商问题添加回归测试

## 快速开始

大多数时候：

- 完整网关（推送前预期）：`pnpm build && pnpm check && pnpm check:test-types && pnpm test`
- 在宽敞的机器上更快地本地运行完整套件：`pnpm test:max`
- 直接 Vitest 监视循环：`pnpm test:watch`
- 直接文件定位现在也路由扩展/渠道路径：`pnpm test extensions/discord/src/monitor/message-handler.preflight.test.ts`
- 当您正在针对单个失败进行迭代时，请优先使用定向运行。
- Docker 支持的 QA 站点：`pnpm qa:lab:up`
- Linux VM 支持的 QA 通道：`pnpm openclaw qa suite --runner multipass --scenario channel-chat-baseline`

当您接触测试或需要额外的信心时：

- 覆盖率网关：`pnpm test:coverage`
- E2E 套件：`pnpm test:e2e`

调试真实提供商/模型时（需要真实凭证）：

- Live 套件（模型 + 网关工具/图像探针）：`pnpm test:live`
- 安静地定位一个 live 文件：`pnpm test:live -- src/agents/models.profiles.live.test.ts`
- Moonshot/Kimi 成本冒烟测试：设置 `MOONSHOT_API_KEY` 后，运行
  `openclaw models list --provider moonshot --json`，然后针对 `moonshot/kimi-k2.6` 运行一个独立的
  `openclaw agent --local --session-id live-kimi-cost --message 'Reply exactly: KIMI_LIVE_OK' --thinking off --json`。验证 JSON 报告显示 Moonshot/K2.6，并且
  助手对话记录存储了标准化的 `usage.cost`。

提示：当您只需要一个失败案例时，优先使用下面描述的 allowlist 环境变量来缩小 live 测试范围。

## QA 专用运行器

当您需要 QA 实验室的真实环境时，这些命令位于主测试套件之侧：

CI 在专用工作流中运行 QA Lab。`Parity gate` 在匹配的 PR 上
以及使用模拟提供程序的手动触发时运行。`QA-Lab - All Lanes` 每晚在
`main` 上运行，并使用模拟一致性门、实时 Matrix 车道和
Convex 管理的实时 Telegram 车道作为并行作业进行手动触发。`OpenClaw Release Checks`
在发布批准前运行相同的车道。

- `pnpm openclaw qa suite`
  - 直接在主机上运行基于仓库的 QA 场景。
  - 默认情况下，使用隔离的 gateway worker 并行运行多个选定的场景。`qa-channel` 默认并发数为 4（受选定场景数的限制）。使用 `--concurrency <count>` 调整 worker 数量，或使用 `--concurrency 1` 用于旧的单行道模式。
  - 当任何场景失败时，以非零代码退出。当您需要生成产物而不希望以失败代码退出时，请使用 `--allow-failures`。
  - 支持提供商模式 `live-frontier`、`mock-openai` 和 `aimock`。`aimock` 会启动一个本地支持 AIMock 的提供商服务器，用于实验性的 fixture 和协议模拟覆盖，而无需替换感知场景的 `mock-openai` 通道。
- `pnpm openclaw qa suite --runner multipass`
  - 在一次性 Multipass Linux 虚拟机内运行相同的 QA 套件。
  - 保持与主机上的 `qa suite` 相同的场景选择行为。
  - 重用与 `qa suite` 相同的提供商/模型选择标志。
  - Live 运行转发适用于 guest 的支持的 QA 认证输入：
    基于环境的提供商密钥、QA live 提供商配置路径，以及 `CODEX_HOME`
    （如果存在）。
  - 输出目录必须保持在仓库根目录下，以便 guest 可以通过
    挂载的工作空间写回数据。
  - 在 `.artifacts/qa-e2e/...` 下写入常规 QA 报告 + 摘要以及 Multipass 日志。
- `pnpm qa:lab:up`
  - 启动 Docker 支持的 QA 站点，以进行操作员式的 QA 工作。
- `pnpm test:docker:npm-onboard-channel-agent`
  - 从当前检出构建 npm tarball，在 Docker 中全局安装它，运行非交互式 OpenAI API 密钥新手引导，默认配置 Telegram，验证启用插件会按需安装运行时依赖，运行 doctor，并对模拟的 OpenAI 端点运行一次本地 agent 轮次。
  - 使用 `OPENCLAW_NPM_ONBOARD_CHANNEL=discord` 运行与 Discord 相同的打包安装通道。
- `pnpm test:docker:bundled-channel-deps`
  - 打包并安装当前的 OpenClaw 构建版本到 Docker 中，启动配置了 Gateway(网关) 的 OpenAI，然后通过配置编辑启用捆绑的渠道/插件。
  - 验证设置发现会保留未配置插件的运行时依赖为缺失状态，第一次配置的 Gateway(网关) 或 doctor 运行会按需安装每个捆绑插件的运行时依赖，且第二次重启不会重新安装已激活的依赖。
  - 此外还会安装一个已知的旧 npm 基线版本，在运行
    `openclaw update --tag <candidate>` 之前启用 Telegram，并验证候选版本的
    更新后诊断程序是否修复了打包的渠道运行时依赖项，而无需
    harness 端的安装后修复。
- `pnpm openclaw qa aimock`
  - 仅启动本地 AIMock 提供商服务器以进行直接的协议冒烟
    测试。
- `pnpm openclaw qa matrix`
  - 针对基于一次性 Docker 的 Tuwunel 家庭服务器运行 Matrix 现场 QA 车道。
  - 目前此 QA 主机仅限仓库/开发人员使用。打包的 OpenClaw 安装程序不包含
    `qa-lab`，因此它们不会暴露 `openclaw qa`。
  - 仓库检出会直接加载打包的运行器；无需单独的插件安装
    步骤。
  - 配置三个临时 Matrix 用户（`driver`、`sut`、`observer`）以及一个私人房间，然后启动一个 QA 网关子进程，使用真实的 Matrix 插件作为 SUT 传输。
  - 默认使用固定的稳定 Tuwunel 镜像 `ghcr.io/matrix-construct/tuwunel:v1.5.1`。当您需要测试不同的镜像时，可以使用 `OPENCLAW_QA_MATRIX_TUWUNEL_IMAGE` 覆盖。
  - Matrix 不会公开共享凭证源标志，因为该通道会在本地配置一次性用户。
  - 在 `.artifacts/qa-e2e/...` 下写入 Matrix QA 报告、摘要、观察到的事件制品以及合并的 stdout/stderr 输出日志。
- `pnpm openclaw qa telegram`
  - 使用来自环境的驱动程序和 SUT 机器人令牌，针对真实的私人组运行 Telegram 实时 QA 通道。
  - 需要 `OPENCLAW_QA_TELEGRAM_GROUP_ID`、`OPENCLAW_QA_TELEGRAM_DRIVER_BOT_TOKEN` 和 `OPENCLAW_QA_TELEGRAM_SUT_BOT_TOKEN`。组 ID 必须是数字 Telegram 聊天 ID。
  - 支持 `--credential-source convex` 用于共享池凭据。默认使用 env 模式，或者设置 `OPENCLAW_QA_CREDENTIAL_SOURCE=convex` 以选择加入池租约。
  - 当任何场景失败时，以非零状态退出。当你希望在不退出失败代码的情况下获取工件时，请使用 `--allow-failures`。
  - 需要在同一个私有组中有两个不同的机器人，且 SUT 机器人要暴露一个 Telegram 用户名。
  - 为了稳定的机器人到机器人观察，请在 `@BotFather` 中为两个机器人启用 Bot-to-Bot 通信模式，并确保驱动程序机器人可以观察组机器人流量。
  - 在 `.artifacts/qa-e2e/...` 下写入 Telegram QA 报告、摘要和观察到的消息工件。

Live transport lanes 共享一份标准合约，以确保新的 transport 不会发生偏离：

`qa-channel` 依然是广泛的综合 QA 套件，并不属于 live
transport 覆盖矩阵的一部分。

| Lane     | Canary | Mention gating | Allowlist block | Top-level reply | Restart resume | Thread follow-up | Thread isolation | Reaction observation | Help command |
| -------- | ------ | -------------- | --------------- | --------------- | -------------- | ---------------- | ---------------- | -------------------- | ------------ |
| Matrix   | x      | x              | x               | x               | x              | x                | x                | x                    |              |
| Telegram | x      |                |                 |                 |                |                  |                  |                      | x            |

### 通过 Convex 共享 Telegram 凭证 (v1)

当为 `openclaw qa telegram` 启用 `--credential-source convex` (或 `OPENCLAW_QA_CREDENTIAL_SOURCE=convex`) 时，
QA 实验室会从 Convex 支持的池中获取独占租约，在 lane 运行期间对该租约发送心跳，并在关闭时释放该租约。

参考 Convex 项目脚手架：

- `qa/convex-credential-broker/`

必需的环境变量：

- `OPENCLAW_QA_CONVEX_SITE_URL` （例如 `https://your-deployment.convex.site`）
- 所选角色有一个密钥：
  - `OPENCLAW_QA_CONVEX_SECRET_MAINTAINER` 用于 `maintainer`
  - `OPENCLAW_QA_CONVEX_SECRET_CI` 用于 `ci`
- 凭据角色选择：
  - CLI：`--credential-role maintainer|ci`
  - 环境变量默认值：`OPENCLAW_QA_CREDENTIAL_ROLE` （在 CI 中默认为 `ci`，否则为 `maintainer`）

可选环境变量：

- `OPENCLAW_QA_CREDENTIAL_LEASE_TTL_MS` （默认 `1200000`）
- `OPENCLAW_QA_CREDENTIAL_HEARTBEAT_INTERVAL_MS` （默认 `30000`）
- `OPENCLAW_QA_CREDENTIAL_ACQUIRE_TIMEOUT_MS` （默认 `90000`）
- `OPENCLAW_QA_CREDENTIAL_HTTP_TIMEOUT_MS` （默认 `15000`）
- `OPENCLAW_QA_CONVEX_ENDPOINT_PREFIX` （默认 `/qa-credentials/v1`）
- `OPENCLAW_QA_CREDENTIAL_OWNER_ID` （可选的跟踪 ID）
- `OPENCLAW_QA_ALLOW_INSECURE_HTTP=1` 允许在仅限本地的开发中使用回环 `http://` Convex URL。

`OPENCLAW_QA_CONVEX_SITE_URL` 在正常操作中应该使用 `https://`。

维护者管理命令（pool add/remove/list）特别需要
`OPENCLAW_QA_CONVEX_SECRET_MAINTAINER`。

用于维护者的 CLI 辅助工具：

```bash
pnpm openclaw qa credentials add --kind telegram --payload-file qa/telegram-credential.json
pnpm openclaw qa credentials list --kind telegram
pnpm openclaw qa credentials remove --credential-id <credential-id>
```

在脚本和 CI 实用工具中使用 `--json` 以获取机器可读的输出。

默认端点合约（`OPENCLAW_QA_CONVEX_SITE_URL` + `/qa-credentials/v1`）：

- `POST /acquire`
  - 请求： `{ kind, ownerId, actorRole, leaseTtlMs, heartbeatIntervalMs }`
  - 成功： `{ status: "ok", credentialId, leaseToken, payload, leaseTtlMs?, heartbeatIntervalMs? }`
  - 耗尽/可重试： `{ status: "error", code: "POOL_EXHAUSTED" | "NO_CREDENTIAL_AVAILABLE", ... }`
- `POST /heartbeat`
  - 请求： `{ kind, ownerId, actorRole, credentialId, leaseToken, leaseTtlMs }`
  - 成功： `{ status: "ok" }` (或空的 `2xx`)
- `POST /release`
  - 请求： `{ kind, ownerId, actorRole, credentialId, leaseToken }`
  - 成功： `{ status: "ok" }` (或空的 `2xx`)
- `POST /admin/add` (仅限维护者密钥)
  - 请求： `{ kind, actorId, payload, note?, status? }`
  - 成功： `{ status: "ok", credential }`
- `POST /admin/remove` (仅限维护者密钥)
  - 请求： `{ credentialId, actorId }`
  - 成功： `{ status: "ok", changed, credential }`
  - 活跃租约守卫： `{ status: "error", code: "LEASE_ACTIVE", ... }`
- `POST /admin/list` (仅限维护者密钥)
  - 请求： `{ kind?, status?, includePayload?, limit? }`
  - 成功： `{ status: "ok", credentials, count }`

Telegram 类型的有效载荷结构：

- `{ groupId: string, driverToken: string, sutToken: string }`
- `groupId` 必须是数字 Telegram 聊天 ID 字符串。
- `admin/add` 验证 `kind: "telegram"` 的此结构，并拒绝格式错误的负载。

### 将渠道添加到 QA

将渠道添加到 markdown QA 系统正好需要两件事：

1. 该渠道的传输适配器。
2. 一个演练渠道合约的场景包。

当共享 `qa-lab` 宿主可以拥有该流程时，不要添加新的顶级 QA 命令根。

`qa-lab` 拥有共享宿主机制：

- `openclaw qa` 命令根
- 套件启动和拆卸
- 工作程序并发
- 构件写入
- 报告生成
- 场景执行
- 旧版 `qa-channel` 场景的兼容性别名

运行程序插件拥有传输合约：

- `openclaw qa <runner>` 如何挂载在共享 `qa` 根目录下
- 如何针对该传输方式配置网关
- 如何检查就绪状态
- 如何注入入站事件
- 如何观察出站消息
- 如何公开转录内容和标准化的传输状态
- 如何执行基于传输的动作
- 如何处理特定于传输的重置或清理

采用新渠道的最低要求是：

1. 保持 `qa-lab` 作为共享 `qa` 根目录的所有者。
2. 在共享 `qa-lab` 主机接缝上实现传输运行器。
3. 将特定于传输的机制保留在运行器插件或渠道工具中。
4. 将运行器挂载为 `openclaw qa <runner>`，而不是注册一个竞争的根命令。
   运行器插件应在 `openclaw.plugin.json` 中声明 `qaRunners`，并从 `runtime-api.ts` 导出匹配的 `qaRunnerCliRegistrations` 数组。
   保持 `runtime-api.ts` 轻量；延迟 CLI 和运行器执行应位于单独的入口点之后。
5. 在主题化的 `qa/scenarios/` 目录下编写或调整 markdown 场景。
6. 为新场景使用通用场景辅助函数。
7. 保持现有的兼容性别名正常工作，除非仓库正在进行有意的迁移。

决策规则是严格的：

- 如果行为可以在 `qa-lab` 中表达一次，请将其放在 `qa-lab` 中。
- 如果行为依赖于某个渠道传输，请将其保留在该运行器插件或插件线束中。
- 如果某个场景需要多个渠道都能使用的新功能，请在 `suite.ts` 中添加通用辅助函数（generic helper），而不是特定于渠道的分支。
- 如果某个行为仅对一种传输有意义，请保持该场景特定于传输，并在场景契约中明确指出这一点。

新场景的首选通用辅助函数名称包括：

- `waitForTransportReady`
- `waitForChannelReady`
- `injectInboundMessage`
- `injectOutboundMessage`
- `waitForTransportOutboundMessage`
- `waitForChannelOutboundMessage`
- `waitForNoTransportOutbound`
- `getTransportSnapshot`
- `readTransportMessage`
- `readTransportTranscript`
- `formatTransportTranscript`
- `resetTransport`

兼容性别名（Compatibility aliases）仍可用于现有场景，包括：

- `waitForQaChannelReady`
- `waitForOutboundMessage`
- `waitForNoOutbound`
- `formatConversationTranscript`
- `resetBus`

新的渠道工作应使用通用辅助名称。存在兼容性别名是为了避免一次性大迁移，而不是作为新场景编写的模型。

## 测试套件（在哪里运行什么）

可以将这些套件视为“真实性递增”（以及不稳定性/成本递增）：

### 单元 / 集成（默认）

- 命令：`pnpm test`
- 配置：在现有范围的 Vitest 项目上进行 10 次连续分片运行 (`vitest.full-*.config.ts`)
- 文件：`src/**/*.test.ts`、`packages/**/*.test.ts`、`test/**/*.test.ts` 下的核心/单元清单，以及由 `vitest.unit.config.ts` 覆盖的白名单 `ui` 节点测试
- 范围：
  - 纯单元测试
  - 进程内集成测试（网关认证、路由、工具、解析、配置）
  - 针对已知错误的确定性回归测试
- 预期：
  - 在 CI 中运行
  - 不需要真实的密钥
  - 应该快速且稳定
- 项目说明：
  - 非定向 `pnpm test` 现在运行十一个较小的分片配置（`core-unit-src`、`core-unit-security`、`core-unit-ui`、`core-unit-support`、`core-support-boundary`、`core-contracts`、`core-bundled`、`core-runtime`、`agentic`、`auto-reply`、`extensions`），而不是一个巨大的原生根项目进程。这减少了负载机器上的峰值 RSS（常驻集大小），并避免了自动回复/扩展工作导致不相关测试套件资源匮乏。
  - `pnpm test --watch` 仍然使用原生根 `vitest.config.ts` 项目图，因为多分片监听循环是不切实际的。
  - `pnpm test`、`pnpm test:watch` 和 `pnpm test:perf:imports` 首先通过限定作用域的通道路由显式文件/目录目标，因此 `pnpm test extensions/discord/src/monitor/message-handler.preflight.test.ts` 避免了支付完整的根项目启动成本。
  - 当差异仅涉及可路由的源/测试文件时，`pnpm test:changed` 将更改的 git 路径扩展到相同的限定作用域通道中；配置/设置编辑仍回退到广泛的根项目重运行。
  - `pnpm check:changed` 是用于针对性工作的常规智能本地关卡。它会将差异分类为核心、核心测试、扩展、扩展测试、应用、文档、发布元数据和工具，然后运行匹配的类型检查/检查/测试通道。公共插件 SDK 和插件契约的更改包括扩展验证，因为扩展依赖于这些核心契约。仅限发布元数据的版本升级会运行有针对性的版本/配置/根依赖检查，而不是完整套件，并且有一个保护措施会拒绝顶级版本字段之外的包更改。
  - 来自代理、命令、插件、自动回复助手、`plugin-sdk` 和类似纯实用程序区域的导入轻量级单元测试通过 `unit-fast` 通道进行路由，该通道跳过 `test/setup-openclaw-runtime.ts`；有状态/运行时繁重的文件保留在现有通道上。
  - 选定的 `plugin-sdk` 和 `commands` 辅助源文件还将“更改模式”的运行映射到这些轻量通道中的显式同级测试，因此对辅助文件的编辑可以避免为该目录重新运行完整的重量级测试套件。
  - `auto-reply` 现在有三个专用的存储桶：顶层核心辅助程序、顶层 `reply.*` 集成测试以及 `src/auto-reply/reply/**` 子树。这可以使最繁重的回复测试线束工作不会影响廉价的状态/块/令牌测试。
- 嵌入式运行器说明：
  - 当您更改消息工具发现输入或压缩运行时上下文时，
    请保持两个级别的覆盖率。
  - 为纯路由/规范化边界添加 focused helper 回归测试。
  - 还要保持嵌入式运行器集成套件的正常运行：
    `src/agents/pi-embedded-runner/compact.hooks.test.ts`、
    `src/agents/pi-embedded-runner/run.overflow-compaction.test.ts` 和
    `src/agents/pi-embedded-runner/run.overflow-compaction.loop.test.ts`。
  - 这些套件验证了作用域 ID 和压缩行为是否仍然流经
    真实的 `run.ts` / `compact.ts` 路径；仅包含 helper 的测试
    不足以替代这些集成路径。
- Pool 说明：
  - 基础 Vitest 配置现在默认为 `threads`。
  - 共享的 Vitest 配置还修复了 `isolate: false`，并在根项目、e2e 和 live 配置中跨域使用非隔离运行器。
  - 根 UI 车道保留其 `jsdom` 设置和优化器，但现在也在共享的非隔离运行器上运行。
  - 每个 `pnpm test` 分片都从共享的 Vitest 配置中继承相同的 `threads` + `isolate: false` 默认值。
  - 共享的 `scripts/run-vitest.mjs` 启动器现在默认还会为 Vitest 子 Node 进程添加 `--no-maglev`，以减少大型本地运行期间的 V8 编译开销。如果需要与原生 V8 行为进行比较，请设置 `OPENCLAW_VITEST_ENABLE_MAGLEV=1`。
- 快速本地迭代说明：
  - `pnpm changed:lanes` 显示差异触发了哪些架构通道。
  - 预提交挂钩在暂存的格式化/检查之后运行 `pnpm check:changed --staged`，因此仅涉及核心的提交除非触及公共扩展接口，否则不会承担扩展测试成本。仅包含发布元数据的提交保持在目标版本/配置/根依赖通道上。
  - 如果确切的暂存更改集已经通过了同等或更强级别的门禁检查，请使用 `scripts/committer --fast "<message>" <files...>` 来仅跳过更改作用域的 hook 重跑。暂存的格式化/检查（format/lint）仍会运行。请在交接说明中提及已完成的门禁检查。在独立的偶发性 hook 失败后重跑并通过了范围验证的情况下，这也是可以接受的。
  - 当更改的路径清晰地映射到较小的测试套件时，`pnpm test:changed` 会通过特定作用域的通道（scoped lanes）进行路由。
  - `pnpm test:max` 和 `pnpm test:changed:max` 保持相同的路由行为，只是具有更高的 worker 上限。
  - 本地 worker 自动扩容现在有意保持保守，并且当主机负载平均值已经很高时也会退避，因此默认情况下，多个并发的 Vitest 运行造成的损害较小。
  - 基础 Vitest 配置将项目/配置文件标记为 `forceRerunTriggers`，以便在测试连接发生变化时，更改模式（changed-mode）的重跑仍然保持正确。
  - 该配置在支持的主机上保持 `OPENCLAW_VITEST_FS_MODULE_CACHE` 启用；如果您希望为直接性能分析指定一个明确的缓存位置，请设置 `OPENCLAW_VITEST_FS_MODULE_CACHE_PATH=/abs/path`。
- 性能调试说明：
  - `pnpm test:perf:imports` 启用了 Vitest 导入耗时报告以及导入细分输出。
  - `pnpm test:perf:imports:changed` 将相同的分析视图范围限定为自 `origin/main` 以来更改的文件。
- `pnpm test:perf:changed:bench -- --ref <git-ref>` 将路由的 `test:changed` 与该提交差异的本机根项目路径进行比较，并打印运行时间以及 macOS 最大 RSS。
- `pnpm test:perf:changed:bench -- --worktree` 通过 `scripts/test-projects.mjs` 和根 Vitest 配置路由更改文件列表，从而对当前脏树进行基准测试。
  - `pnpm test:perf:profile:main` 为 Vitest/Vite 启动和转换开销编写主线程 CPU 配置文件。
  - `pnpm test:perf:profile:runner` 为单元测试套件写入运行器 CPU 和堆内存分析文件，并禁用文件并行。

### 稳定性（Gateway）

- 命令：`pnpm test:stability:gateway`
- 配置：`vitest.gateway.config.ts`，强制使用一个工作线程
- 范围：
  - 启动一个启用了诊断功能的真实环回 Gateway(网关)
  - 通过诊断事件路径驱动合成网关消息、内存和大负载 churn
  - 通过 Gateway(网关) WS RPC 查询 `diagnostics.stability`
  - 涵盖诊断稳定性包持久化辅助程序
  - 断言记录器保持有界，合成 RSS 样本保持在压力预算之下，且每个会话的队列深度会回落到零
- 预期：
  - CI 安全且无密钥
  - 稳定性回归跟进的狭窄通道，不能替代完整的 Gateway(网关) 测试套件

### E2E（Gateway 冒烟测试）

- 命令：`pnpm test:e2e`
- 配置： `vitest.e2e.config.ts`
- 文件： `src/**/*.e2e.test.ts`、 `test/**/*.e2e.test.ts` 以及 `extensions/` 下的 bundled-plugin E2E 测试
- 运行时默认设置：
  - 使用 Vitest `threads` 并配合 `isolate: false`，与仓库中的其余部分保持一致。
  - 使用自适应工作线程（CI：最多 2 个，本地：默认 1 个）。
  - 默认以静默模式运行，以减少控制台 I/O 开销。
- 有用的覆盖选项：
  - `OPENCLAW_E2E_WORKERS=<n>` 用于强制工作线程数量（上限为 16）。
  - `OPENCLAW_E2E_VERBOSE=1` 用于重新启用详细的控制台输出。
- 范围：
  - 多实例网关端到端行为
  - WebSocket/HTTP 表面、节点配对和更繁重的网络处理
- 预期：
  - 在 CI 中运行（当在管道中启用时）
  - 不需要真实的密钥
  - 比单元测试有更多活动部件（可能会更慢）

### E2E：OpenShell 后端冒烟测试

- 命令： `pnpm test:e2e:openshell`
- 文件：`extensions/openshell/src/backend.e2e.test.ts`
- 范围：
  - 通过 Docker 在主机上启动隔离的 OpenShell 网关
  - 从临时本地 Dockerfile 创建沙箱
  - 通过真实的 `sandbox ssh-config` + SSH exec 测试 OpenClaw 的 OpenShell 后端
  - 通过沙箱 fs 桥接验证远程规范文件系统行为
- 预期：
  - 仅限选择加入；不是默认 `pnpm test:e2e` 运行的一部分
  - 需要本地 `openshell` CLI 以及可运行的 Docker 守护进程
  - 使用隔离的 `HOME` / `XDG_CONFIG_HOME`，然后销毁测试网关和沙箱
- 有用的覆盖选项：
  - `OPENCLAW_E2E_OPENSHELL=1` 以在手动运行更广泛的 e2e 套件时启用测试
  - `OPENCLAW_E2E_OPENSHELL_COMMAND=/path/to/openshell` 以指向非默认 CLI 二进制文件或包装脚本

### 实时（真实提供商 + 真实模型）

- 命令：`pnpm test:live`
- 配置：`vitest.live.config.ts`
- 文件：`src/**/*.live.test.ts`、`test/**/*.live.test.ts` 以及 `extensions/` 下的 bundled-plugin 实时测试
- 默认：由 `pnpm test:live` **启用**（设置 `OPENCLAW_LIVE_TEST=1`）
- 范围：
  - “此提供商/模型在今天使用真实凭据是否真的有效？”
  - 捕获提供商格式变更、工具调用怪癖、身份验证问题以及速率限制行为
- 预期：
  - 设计上不保证 CI 稳定性（真实网络、真实提供商策略、配额、服务中断）
  - 花费资金 / 使用速率限制
  - 优先运行缩小的子集，而不是“所有内容”
- Live 运行 source `~/.profile` 以获取缺失的 API 密钥。
- 默认情况下，live 运行仍然隔离 `HOME` 并将配置/身份验证材料复制到临时测试主目录中，以便单元测试装置不会更改您的实际 `~/.openclaw`。
- 仅当您确实需要实时测试使用您的主目录时，才设置 `OPENCLAW_LIVE_USE_REAL_HOME=1`。
- `pnpm test:live` 现在默认为更安静的模式：它保留 `[live] ...` 进度输出，但抑制额外的 `~/.profile` 通知并使网引导启动日志/Bonjour 聊天静音。如果您想要完整的启动日志，请设置 `OPENCLAW_LIVE_TEST_QUIET=0`。
- API 密钥轮换（特定于提供商）：设置 `*_API_KEYS` 使用逗号/分号格式或 `*_API_KEY_1`，`*_API_KEY_2`（例如 `OPENAI_API_KEYS`，`ANTHROPIC_API_KEYS`，`GEMINI_API_KEYS`）或通过 `OPENCLAW_LIVE_*_KEY` 进行每次实时覆盖；测试在收到速率限制响应时重试。
- 进度/心跳输出：
  - Live 套件现在向 stderr 输出进度行，以便即使 Vitest 控制台捕获处于静默状态，长时间的提供商调用也能明显显示为活动状态。
  - `vitest.live.config.ts` 禁用 Vitest 控制台拦截，以便提供商/网关进度行在实时运行期间立即流式传输。
  - 使用 `OPENCLAW_LIVE_HEARTBEAT_MS` 调整直接模型心跳。
  - 使用 `OPENCLAW_LIVE_GATEWAY_HEARTBEAT_MS` 调整网关/探针心跳。

## 我应该运行哪个套件？

使用此决策表：

- 编辑逻辑/测试：运行 `pnpm test`（如果进行了大量更改，还需要运行 `pnpm test:coverage`）
- 涉及网关网络 / WS 协议 / 配对：添加 `pnpm test:e2e`
- 调试“我的机器人已挂机” / 特定于提供商的故障 / 工具调用：运行一个缩小范围的 `pnpm test:live`

## 实时：Android 节点能力扫描

- 测试：`src/gateway/android-node.capabilities.live.test.ts`
- 脚本：`pnpm android:test:integration`
- 目标：调用已连接的 Android 节点当前宣传的**所有命令**，并断言命令契约行为。
- 范围：
  - 预置/手动设置（该套件不安装/运行/配对应用）。
  - 针对所选 Android 节点逐条命令的网关 `node.invoke` 验证。
- 所需的预设置：
  - Android 应用已连接并配对到网关。
  - 应用保持在前台。
  - 已为您预期通过的功能授予权限/捕获同意。
- 可选的目标覆盖：
  - `OPENCLAW_ANDROID_NODE_ID` 或 `OPENCLAW_ANDROID_NODE_NAME`。
  - `OPENCLAW_ANDROID_GATEWAY_URL` / `OPENCLAW_ANDROID_GATEWAY_TOKEN` / `OPENCLAW_ANDROID_GATEWAY_PASSWORD`。
- 完整的 Android 设置详情：[Android 应用](/zh/platforms/android)

## 实时：模型冒烟测试（配置文件密钥）

实时测试分为两层，以便我们可以隔离故障：

- “直接模型”告诉我们提供商/模型是否可以使用给定密钥进行回答。
- “Gateway(网关) 冒烟测试”告诉我们完整的 gateway+agent 流水线对该模型是否有效（会话、历史记录、工具、沙箱策略等）。

### 第 1 层：直接模型补全（无 gateway）

- 测试：`src/agents/models.profiles.live.test.ts`
- 目标：
  - 枚举已发现的模型
  - 使用 `getApiKeyForModel` 选择您拥有凭据的模型
  - 对每个模型运行一次小规模的补全（并在需要时进行针对性的回归测试）
- 如何启用：
  - `pnpm test:live`（如果直接调用 Vitest，则使用 `OPENCLAW_LIVE_TEST=1`）
- 设置 `OPENCLAW_LIVE_MODELS=modern`（或 `all`，modern 的别名）以实际运行此套件；否则它会跳过，以保持 `pnpm test:live` 专注于网关冒烟测试
- 如何选择模型：
  - `OPENCLAW_LIVE_MODELS=modern` 用于运行现代允许列表（Opus/Sonnet 4.6+、GPT-5.x + Codex、Gemini 3、GLM 4.7、MiniMax M2.7、Grok 4）
  - `OPENCLAW_LIVE_MODELS=all` 是现代允许列表的别名
  - 或 `OPENCLAW_LIVE_MODELS="openai/gpt-5.4,anthropic/claude-opus-4-6,..."`（逗号分隔的允许列表）
  - Modern/all 扫描默认采用精心策划的高信号上限；设置 `OPENCLAW_LIVE_MAX_MODELS=0` 以进行详尽的现代扫描，或设置正数以使用更小的上限。
- 如何选择提供商：
  - `OPENCLAW_LIVE_PROVIDERS="google,google-antigravity,google-gemini-cli"`（逗号分隔的允许列表）
- 密钥来源：
  - 默认：配置文件存储和环境变量回退
  - 设置 `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` 以仅强制执行**配置文件存储**
- 存在原因：
  - 将“提供商 API 已损坏 / 密钥无效”与“Gateway 代理流水线已损坏”区分开来
  - 包含小型、孤立的回归（示例：OpenAI Responses/Codex Responses 推理回放 + 工具调用流程）

### 第 2 层：Gateway(网关) + 开发代理冒烟测试（即 "@openclaw" 实际执行的操作）

- 测试：`src/gateway/gateway-models.profiles.live.test.ts`
- 目标：
  - 启动进程内 Gateway
  - 创建/修补 `agent:dev:*` 会话（每次运行的模型覆盖）
  - 迭代带密钥的模型并断言：
    - “有意义的”响应（无工具）
    - 实际工具调用有效（读取探测）
    - 可选的额外工具探测（执行+读取探测）
    - OpenAI 回归路径（仅工具调用 → 后续跟进）保持正常工作
- 探测详细信息（以便您可以快速解释失败原因）：
  - `read` probe: 测试在工作区中写入一个 nonce 文件，并要求代理 `read` 该文件并回显该 nonce。
  - `exec+read` probe: 测试要求代理将 nonce `exec`-写入临时文件，然后将其 `read` 回来。
  - image probe: 测试附加一个生成的 PNG（cat + 随机代码）并期望模型返回 `cat <CODE>`。
  - 实现参考：`src/gateway/gateway-models.profiles.live.test.ts` 和 `src/gateway/live-image-probe.ts`。
- 如何启用：
  - `pnpm test:live`（或者如果直接调用 Vitest，则使用 `OPENCLAW_LIVE_TEST=1`）
- 如何选择模型：
  - 默认：现代允许列表（Opus/Sonnet 4.6+, GPT-5.x + Codex, Gemini 3, GLM 4.7, MiniMax M2.7, Grok 4）
  - `OPENCLAW_LIVE_GATEWAY_MODELS=all` 是现代允许列表的别名
  - 或设置 `OPENCLAW_LIVE_GATEWAY_MODELS="provider/model"`（或逗号分隔列表）进行筛选
  - Modern/all gateway 扫描默认采用精选的高信号上限；设置 `OPENCLAW_LIVE_GATEWAY_MAX_MODELS=0` 以进行详尽的 modern 扫描，或设置正数以使用较小的上限。
- 如何选择提供商（避免“所有 OpenRouter”）：
  - `OPENCLAW_LIVE_GATEWAY_PROVIDERS="google,google-antigravity,google-gemini-cli,openai,anthropic,zai,minimax"`（逗号分隔白名单）
- 在此实时测试中，工具和图像探测始终开启：
  - `read` 探测 + `exec+read` 探测（工具压力测试）
  - 当模型声明支持图像输入时，运行图像探测
  - 流程（高层级）：
    - 测试生成一个带有“CAT”+随机代码的微型 PNG（`src/gateway/live-image-probe.ts`）
    - 通过 `agent` `attachments: [{ mimeType: "image/png", content: "<base64>" }]` 发送它
    - Gateway(网关) 将附件解析为 `images[]`（`src/gateway/server-methods/agent.ts` + `src/gateway/chat-attachments.ts`）
    - 嵌入式代理将多模态用户消息转发给模型
    - 断言：回复包含 `cat` 和代码（OCR 容差：允许轻微错误）

提示：要查看您可以在机器上测试什么（以及确切的 `provider/model` id），请运行：

```bash
openclaw models list
openclaw models list --json
```

## 实时：CLI 后端冒烟测试（Claude、Codex、Gemini 或其他本地 CLIs）

- 测试：`src/gateway/gateway-cli-backend.live.test.ts`
- 目标：使用本地 Gateway(网关) 后端验证 CLI + 代理管道，而不触及您的默认配置。
- 特定于后端的冒烟测试默认值驻留在所属扩展的 `cli-backend.ts` 定义中。
- 启用：
  - `pnpm test:live`（如果直接调用 Vitest，则为 `OPENCLAW_LIVE_TEST=1`）
  - `OPENCLAW_LIVE_CLI_BACKEND=1`
- 默认值：
  - 默认提供商/模型：`claude-cli/claude-sonnet-4-6`
  - 命令/参数/图像行为来自所属 CLI 后端插件元数据。
- 覆盖（可选）：
  - `OPENCLAW_LIVE_CLI_BACKEND_MODEL="codex-cli/gpt-5.4"`
  - `OPENCLAW_LIVE_CLI_BACKEND_COMMAND="/full/path/to/codex"`
  - `OPENCLAW_LIVE_CLI_BACKEND_ARGS='["exec","--json","--color","never","--sandbox","read-only","--skip-git-repo-check"]'`
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_PROBE=1` 用于发送真实的图片附件（路径会被注入到提示词中）。
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_ARG="--image"` 用于将图片文件路径作为 CLI 参数传递，而不是通过提示词注入。
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_MODE="repeat"`（或 `"list"`）用于在设置 `IMAGE_ARG` 时控制图片参数的传递方式。
  - `OPENCLAW_LIVE_CLI_BACKEND_RESUME_PROBE=1` 用于发送第二轮交互并验证恢复流程。
  - `OPENCLAW_LIVE_CLI_BACKEND_MODEL_SWITCH_PROBE=0` 用于禁用默认的 Claude Sonnet -> Opus 同一会话连续性探测（设置为 `1` 可在所选模型支持切换目标时强制启用）。

示例：

```bash
OPENCLAW_LIVE_CLI_BACKEND=1 \
  OPENCLAW_LIVE_CLI_BACKEND_MODEL="codex-cli/gpt-5.4" \
  pnpm test:live src/gateway/gateway-cli-backend.live.test.ts
```

Docker 配方：

```bash
pnpm test:docker:live-cli-backend
```

单一提供商 Docker 配方：

```bash
pnpm test:docker:live-cli-backend:claude
pnpm test:docker:live-cli-backend:claude-subscription
pnpm test:docker:live-cli-backend:codex
pnpm test:docker:live-cli-backend:gemini
```

注：

- Docker 运行程序位于 `scripts/test-live-cli-backend-docker.sh`。
- 它在仓库 CLI 镜像中以非 root `node` 用户身份运行 live Docker-backend smoke。
- 它从所属扩展解析 CLI smoke 元数据，然后将匹配的 Linux CLI 包（`@anthropic-ai/claude-code`、`@openai/codex` 或 `@google/gemini-cli`）安装到 `OPENCLAW_DOCKER_CLI_TOOLS_DIR` 处的可写缓存前缀（默认：`~/.cache/openclaw/docker-cli-tools`）。
- `pnpm test:docker:live-cli-backend:claude-subscription` 需要通过带有 `claudeAiOauth.subscriptionType` 的 `~/.claude/.credentials.json` 或来自 `claude setup-token` 的 `CLAUDE_CODE_OAUTH_TOKEN` 获取便携式 Claude Code 订阅 OAuth。它首先证明 Docker 中的直接 `claude -p`，然后在不保留 Gateway(网关) CLI 密钥环境变量的情况下运行两个 Anthropic API 后端轮次。此订阅通道默认禁用 Claude MCP/工具和图像探测，因为 Claude 目前通过额外使用计费而非普通订阅计划限制来路由第三方应用程序使用。
- 实时 CLI 后端冒烟测试现在针对 Claude、Codex 和 Gemini 执行相同的端到端流程：文本轮次、图像分类轮次，然后是通过网关 CLI 验证的 MCP `cron` 工具调用。
- Claude 的默认冒烟测试还将会话从 Sonnet 打补丁升级到 Opus，并验证恢复的会话仍然记得之前的笔记。

## Live: ACP bind smoke (`/acp spawn ... --bind here`)

- Test: `src/gateway/gateway-acp-bind.live.test.ts`
- 目标：通过真实的 ACP 代理验证真实的 ACP 会话绑定流程：
  - send `/acp spawn <agent> --bind here`
  - 原地绑定一个合成消息渠道会话
  - 在该同一会话上发送正常的后续消息
  - 验证后续消息已到达绑定的 ACP 会话记录中
- 启用：
  - `pnpm test:live src/gateway/gateway-acp-bind.live.test.ts`
  - `OPENCLAW_LIVE_ACP_BIND=1`
- 默认值：
  - Docker 中的 ACP 代理：`claude,codex,gemini`
  - 用于直接 `pnpm test:live ...` 的 ACP 代理：`claude`
  - 合成渠道：Slack 私信风格的会话上下文
  - ACP 后端：`acpx`
- 覆盖：
  - `OPENCLAW_LIVE_ACP_BIND_AGENT=claude`
  - `OPENCLAW_LIVE_ACP_BIND_AGENT=codex`
  - `OPENCLAW_LIVE_ACP_BIND_AGENT=gemini`
  - `OPENCLAW_LIVE_ACP_BIND_AGENTS=claude,codex,gemini`
  - `OPENCLAW_LIVE_ACP_BIND_AGENT_COMMAND='npx -y @agentclientprotocol/claude-agent-acp@<version>'`
  - `OPENCLAW_LIVE_ACP_BIND_CODEX_MODEL=gpt-5.4`
- 注：
  - 此通道使用网关 `chat.send` 表面，其中包含仅限管理员使用的合成 originating-route 字段，以便测试可以在不模拟外部投递的情况下附加消息渠道上下文。
  - 当未设置 `OPENCLAW_LIVE_ACP_BIND_AGENT_COMMAND` 时，测试使用嵌入式 `acpx` 插件的内置代理注册表来获取所选的 ACP harness 代理。

示例：

```bash
OPENCLAW_LIVE_ACP_BIND=1 \
  OPENCLAW_LIVE_ACP_BIND_AGENT=claude \
  pnpm test:live src/gateway/gateway-acp-bind.live.test.ts
```

Docker 食谱：

```bash
pnpm test:docker:live-acp-bind
```

单代理 Docker 食谱：

```bash
pnpm test:docker:live-acp-bind:claude
pnpm test:docker:live-acp-bind:codex
pnpm test:docker:live-acp-bind:gemini
```

Docker 说明：

- Docker 运行器位于 `scripts/test-live-acp-bind-docker.sh`。
- 默认情况下，它会按顺序对所有支持的实时 CLI 代理运行 ACP bind smoke：`claude`、`codex`，然后是 `gemini`。
- 使用 `OPENCLAW_LIVE_ACP_BIND_AGENTS=claude`、`OPENCLAW_LIVE_ACP_BIND_AGENTS=codex` 或 `OPENCLAW_LIVE_ACP_BIND_AGENTS=gemini` 来缩小矩阵范围。
- 它会获取 `~/.profile`，将匹配的 CLI 认证材料暂存到容器中，将 `acpx` 安装到可写的 npm 前缀中，然后（如果缺失）安装请求的实时 CLI（`@anthropic-ai/claude-code`、`@openai/codex` 或 `@google/gemini-cli`）。
- 在 Docker 内部，运行程序设置 `OPENCLAW_LIVE_ACP_BIND_ACPX_COMMAND=$HOME/.npm-global/bin/acpx`，以便 acpx 保持来自获取的配置文件的提供商环境变量对子 harness CLI 可用。

## Live: Codex app-server harness smoke

- 目标：通过普通网关 `agent` 方法验证插件拥有的 Codex 测试线束：
  - 加载打包的 `codex` 插件
  - 选择 `OPENCLAW_AGENT_RUNTIME=codex`
  - 向 `codex/gpt-5.4` 发送第一个网关代理轮次
  - 向同一个 OpenClaw 会话发送第二个轮次，并验证应用服务器线程可以恢复
  - 通过相同的网关命令路径运行 `/codex status` 和 `/codex models`
  - 可选运行两个 Guardian 审查的升级 Shell 探针：一个应该被批准的良性命令和一个应该被拒绝的虚假密钥上传，以便代理进行回询
- 测试：`src/gateway/gateway-codex-harness.live.test.ts`
- 启用：`OPENCLAW_LIVE_CODEX_HARNESS=1`
- 默认模型：`codex/gpt-5.4`
- 可选图像探针：`OPENCLAW_LIVE_CODEX_HARNESS_IMAGE_PROBE=1`
- 可选的 MCP/工具探测：`OPENCLAW_LIVE_CODEX_HARNESS_MCP_PROBE=1`
- 可选的 Guardian 探测：`OPENCLAW_LIVE_CODEX_HARNESS_GUARDIAN_PROBE=1`
- 冒烟测试设置了 `OPENCLAW_AGENT_HARNESS_FALLBACK=none`，因此损坏的 Codex
  线束无法通过静默回退到 PI 来通过测试。
- 身份验证：来自 shell/profile 的 `OPENAI_API_KEY`，以及可选复制的
  `~/.codex/auth.json` 和 `~/.codex/config.toml`

本地配方：

```bash
source ~/.profile
OPENCLAW_LIVE_CODEX_HARNESS=1 \
  OPENCLAW_LIVE_CODEX_HARNESS_IMAGE_PROBE=1 \
  OPENCLAW_LIVE_CODEX_HARNESS_MCP_PROBE=1 \
  OPENCLAW_LIVE_CODEX_HARNESS_GUARDIAN_PROBE=1 \
  OPENCLAW_LIVE_CODEX_HARNESS_MODEL=codex/gpt-5.4 \
  pnpm test:live -- src/gateway/gateway-codex-harness.live.test.ts
```

Docker 配方：

```bash
source ~/.profile
pnpm test:docker:live-codex-harness
```

Docker 说明：

- Docker 运行器位于 `scripts/test-live-codex-harness-docker.sh`。
- 它获取挂载的 `~/.profile`，传递 `OPENAI_API_KEY`，在存在时复制 Codex CLI
  身份验证文件，将 `@openai/codex` 安装到可写的挂载 npm
  前缀中，暂存源代码树，然后仅运行 Codex 线束实时测试。
- Docker 默认启用镜像、MCP/工具和 Guardian 探测。当你需要范围更窄的调试运行时，请设置 `OPENCLAW_LIVE_CODEX_HARNESS_IMAGE_PROBE=0` 或 `OPENCLAW_LIVE_CODEX_HARNESS_MCP_PROBE=0` 或 `OPENCLAW_LIVE_CODEX_HARNESS_GUARDIAN_PROBE=0`。
- Docker 还导出 `OPENCLAW_AGENT_HARNESS_FALLBACK=none`，与实时测试配置相匹配，因此 `openai-codex/*` 或 PI 回退无法掩盖 Codex 线束回归。

### 推荐的实时配方

狭窄、明确的允许列表是最快且最不稳定的：

- 单一模型，直连（无网关）：
  - `OPENCLAW_LIVE_MODELS="openai/gpt-5.4" pnpm test:live src/agents/models.profiles.live.test.ts`

- 单一模型，网关冒烟测试：
  - `OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.4" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

- 跨多个提供商的工具调用：
  - `OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.4,anthropic/claude-opus-4-6,google/gemini-3-flash-preview,zai/glm-4.7,minimax/MiniMax-M2.7" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

- Google 侧重（Gemini API 密钥 + Antigravity）：
  - Gemini（API 密钥）： `OPENCLAW_LIVE_GATEWAY_MODELS="google/gemini-3-flash-preview" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`
  - Antigravity（OAuth）： `OPENCLAW_LIVE_GATEWAY_MODELS="google-antigravity/claude-opus-4-6-thinking,google-antigravity/gemini-3-pro-high" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

注意：

- `google/...` 使用 Gemini API (API 密钥)。
- `google-antigravity/...` 使用 Antigravity OAuth 网桥 (Cloud Code Assist 风格的代理端点)。
- `google-gemini-cli/...` 使用你机器上的本地 Gemini CLI (单独的身份验证 + 工具怪癖)。
- Gemini API vs Gemini CLI：
  - API：OpenClaw 通过 HTTP 调用 Google 托管的 Gemini API (API 密钥 / 配置文件身份验证); 这是大多数用户所指的 “Gemini”。
  - CLI：OpenClaw 调用本地 `gemini` 二进制文件；它有自己的身份验证，并且行为可能有所不同 (流式传输/工具支持/版本偏差)。

## Live: 模型矩阵 (我们覆盖的内容)

没有固定的 “CI 模型列表” (Live 是可选加入的)，但这些是在开发机器上使用密钥定期覆盖的**推荐**模型。

### 现代冒烟测试集 (工具调用 + 图像)

这是我们期望保持正常工作的 “常用模型” 运行：

- OpenAI (non-Codex): `openai/gpt-5.4` (可选: `openai/gpt-5.4-mini`)
- OpenAI Codex: `openai-codex/gpt-5.4`
- Anthropic: `anthropic/claude-opus-4-6` (或 `anthropic/claude-sonnet-4-6`)
- Google (Gemini API): `google/gemini-3.1-pro-preview` 和 `google/gemini-3-flash-preview` (避免使用旧版 Gemini 2.x 模型)
- Google (Antigravity): `google-antigravity/claude-opus-4-6-thinking` 和 `google-antigravity/gemini-3-flash`
- Z.AI (GLM): `zai/glm-4.7`
- MiniMax: `minimax/MiniMax-M2.7`

运行包含工具 + 图像的 gateway smoke:
`OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.4,openai-codex/gpt-5.4,anthropic/claude-opus-4-6,google/gemini-3.1-pro-preview,google/gemini-3-flash-preview,google-antigravity/claude-opus-4-6-thinking,google-antigravity/gemini-3-flash,zai/glm-4.7,minimax/MiniMax-M2.7" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

### 基准：工具调用 (读取 + 可选执行)

每个提供商系列至少选择一个：

- OpenAI: `openai/gpt-5.4` (或 `openai/gpt-5.4-mini`)
- Anthropic: `anthropic/claude-opus-4-6` (或 `anthropic/claude-sonnet-4-6`)
- Google: `google/gemini-3-flash-preview` (或 `google/gemini-3.1-pro-preview`)
- Z.AI (GLM): `zai/glm-4.7`
- MiniMax: `minimax/MiniMax-M2.7`

可选的额外覆盖（最好有）：

- xAI: `xai/grok-4` (或最新可用版本)
- Mistral: `mistral/`… (选择一个您已启用的支持“工具”的模型)
- Cerebras: `cerebras/`… (如果您有权限)
- LM Studio: `lmstudio/`… (本地；工具调用取决于 API 模式)

### 视觉：图像发送（附件 → 多模态消息）

在 `OPENCLAW_LIVE_GATEWAY_MODELS` 中至少包含一个支持图像的模型（Claude/Gemini/OpenAI 支持视觉的变体等），以测试图像探测功能。

### 聚合器 / 备用网关

如果您启用了密钥，我们还支持通过以下方式进行测试：

- OpenRouter: `openrouter/...` (数百个模型；使用 `openclaw models scan` 查找支持工具和图像的候选模型)
- OpenCode: `opencode/...` 用于 Zen，`opencode-go/...` 用于 Go（通过 `OPENCODE_API_KEY` / `OPENCODE_ZEN_API_KEY` 进行身份验证）

您可以包含在实时矩阵中的更多提供商（如果您有凭据/配置）：

- 内置：`openai`、`openai-codex`、`anthropic`、`google`、`google-vertex`、`google-antigravity`、`google-gemini-cli`、`zai`、`openrouter`、`opencode`、`opencode-go`、`xai`、`groq`、`cerebras`、`mistral`、`github-copilot`
- 通过 `models.providers`（自定义端点）：`minimax`（云/API），加上任何兼容 API/OpenAI 的代理（LM Studio、vLLM、LiteLLM 等）

提示：不要试图在文档中硬编码“所有模型”。权威列表是 `discoverModels(...)` 在你的机器上返回的内容加上可用的密钥。

## 凭证（切勿提交）

Live 测试以与 CLI 相同的方式发现凭证。实际影响：

- 如果 CLI 能正常工作，Live 测试应该能找到相同的密钥。
- 如果 Live 测试提示“no creds”，请像调试 `openclaw models list` / 模型选择那样进行调试。

- 按代理划分的认证配置文件：`~/.openclaw/agents/<agentId>/agent/auth-profiles.json`（这就是 Live 测试中“profile keys”的含义）
- 配置：`~/.openclaw/openclaw.json`（或 `OPENCLAW_CONFIG_PATH`）
- 旧版状态目录：`~/.openclaw/credentials/`（如果存在，会将其复制到暂存的 Live 主目录中，但不是主要的配置文件密钥存储）
- 实时本地运行默认会将活动配置、每个代理的 `auth-profiles.json` 文件、旧版 `credentials/` 以及支持的外部 CLI 认证目录复制到临时测试主目录中；暂存的实时主目录会跳过 `workspace/` 和 `sandboxes/`，并且 `agents.*.workspace` / `agentDir` 路径覆盖项会被剥离，以便探测器不会干扰您真实的主机工作区。

如果您想依赖环境密钥（例如在您的 `~/.profile` 中导出的），请在 `source ~/.profile` 之后运行本地测试，或使用下面的 Docker 运行器（它们可以将 `~/.profile` 挂载到容器中）。

## Deepgram 实时（音频转录）

- 测试：`extensions/deepgram/audio.live.test.ts`
- 启用：`DEEPGRAM_API_KEY=... DEEPGRAM_LIVE_TEST=1 pnpm test:live extensions/deepgram/audio.live.test.ts`

## BytePlus 编码计划实时

- 测试：`extensions/byteplus/live.test.ts`
- 启用：`BYTEPLUS_API_KEY=... BYTEPLUS_LIVE_TEST=1 pnpm test:live extensions/byteplus/live.test.ts`
- 可选模型覆盖：`BYTEPLUS_CODING_MODEL=ark-code-latest`

## ComfyUI 工作流媒体实时

- 测试：`extensions/comfy/comfy.live.test.ts`
- 启用：`OPENCLAW_LIVE_TEST=1 COMFY_LIVE_TEST=1 pnpm test:live -- extensions/comfy/comfy.live.test.ts`
- 范围：
  - 测试打包的 comfy 图像、视频和 `music_generate` 路径
  - 除非配置了 `models.providers.comfy.<capability>`，否则跳过每项功能
  - 在更改 comfy 工作流提交、轮询、下载或插件注册后很有用

## 图像生成实时

- 测试：`test/image-generation.runtime.live.test.ts`
- 命令：`pnpm test:live test/image-generation.runtime.live.test.ts`
- 工具：`pnpm test:live:media image`
- 范围：
  - 枚举每个注册的图像生成提供商插件
  - 在探测之前，从您的登录 shell 加载缺失的提供商环境变量（`~/.profile`）
  - 默认优先使用实时/环境的 API 密钥，而不是存储的身份验证配置文件，因此 `auth-profiles.json` 中过时的测试密钥不会掩盖真实的 shell 凭证
  - 跳过没有可用 auth/profile/模型 的提供商
  - 通过共享运行时功能运行标准图像生成变体：
    - `google:flash-generate`
    - `google:pro-generate`
    - `google:pro-edit`
    - `openai:default-generate`
- 当前涵盖的捆绑提供商：
  - `fal`
  - `google`
  - `minimax`
  - `openai`
  - `vydra`
  - `xai`
- 可选的缩小范围：
  - `OPENCLAW_LIVE_IMAGE_GENERATION_PROVIDERS="openai,google,xai"`
  - `OPENCLAW_LIVE_IMAGE_GENERATION_MODELS="openai/gpt-image-2,google/gemini-3.1-flash-image-preview,xai/grok-imagine-image"`
  - `OPENCLAW_LIVE_IMAGE_GENERATION_CASES="google:flash-generate,google:pro-edit,xai:default-generate,xai:default-edit"`
- 可选的身份验证行为：
  - `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` 用于强制 profile-store 身份验证并忽略仅限环境的覆盖

## 音乐生成实时测试

- 测试：`extensions/music-generation-providers.live.test.ts`
- 启用：`OPENCLAW_LIVE_TEST=1 pnpm test:live -- extensions/music-generation-providers.live.test.ts`
- 测试工具：`pnpm test:live:media music`
- 范围：
  - 运行共享的捆绑音乐生成提供商路径
  - 目前涵盖 Google 和 MiniMax
  - 在探测之前，从您的登录 shell (`~/.profile`) 加载提供商环境变量
  - 默认优先使用实时/环境 API 密钥而非存储的身份验证配置文件，因此 `auth-profiles.json` 中的过时测试密钥不会掩盖真实的 shell 凭据
  - 跳过没有可用身份验证/配置文件/模型的提供商
  - 在可用时运行两个声明的运行时模式：
    - `generate` 使用仅提示词输入
    - 当提供商声明 `capabilities.edit.enabled` 时，使用 `edit`
  - 当前共享通道覆盖范围：
    - `google`: `generate`, `edit`
    - `minimax`: `generate`
    - `comfy`: 单独的 Comfy live 文件，而不是这个共享 sweep
- 可选的缩小范围：
  - `OPENCLAW_LIVE_MUSIC_GENERATION_PROVIDERS="google,minimax"`
  - `OPENCLAW_LIVE_MUSIC_GENERATION_MODELS="google/lyria-3-clip-preview,minimax/music-2.5+"`
- 可选的 auth 行为：
  - `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` 以强制 profile-store auth 并忽略仅环境的覆盖

## 视频生成 live

- 测试：`extensions/video-generation-providers.live.test.ts`
- 启用：`OPENCLAW_LIVE_TEST=1 pnpm test:live -- extensions/video-generation-providers.live.test.ts`
- 工具：`pnpm test:live:media video`
- 范围：
  - 运行共享的捆绑视频生成提供商路径
  - 默认采用发布安全的冒烟测试路径：非 FAL 提供商，每个提供商一个文本生成视频请求，一秒钟的龙虾提示词，以及来自 `OPENCLAW_LIVE_VIDEO_GENERATION_TIMEOUT_MS` 的每个提供商的操作上限（默认为 `180000`）
  - 默认跳过 FAL，因为提供商端的队列延迟可能会主导发布时间；传递 `--video-providers fal` 或 `OPENCLAW_LIVE_VIDEO_GENERATION_PROVIDERS="fal"` 以显式运行它
  - 在探测之前从您的登录 Shell（`~/.profile`）加载提供商环境变量
  - 默认优先使用实时/环境 API 密钥，而不是存储的身份验证配置文件，因此 `auth-profiles.json` 中的过时测试密钥不会掩盖真实的 Shell 凭据
  - 跳过没有可用身份验证/配置文件/模型的提供商
  - 默认只运行 `generate`
  - 设置 `OPENCLAW_LIVE_VIDEO_GENERATION_FULL_MODES=1` 以在可用时也运行声明的转换模式：
    - `imageToVideo` 当提供商声明 `capabilities.imageToVideo.enabled` 且选定的提供商/模型在共享扫描中接受缓冲区支持的本地图像输入时
    - `videoToVideo` 当提供商声明 `capabilities.videoToVideo.enabled` 且选定的提供商/模型在共享扫描中接受缓冲区支持的本地视频输入时
  - 当前在共享扫描中已声明但跳过的 `imageToVideo` 提供商：
    - `vydra` 因为捆绑的 `veo3` 仅支持文本，而捆绑的 `kling` 需要远程图像 URL
  - 特定提供商的 Vydra 覆盖范围：
    - `OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_VYDRA_VIDEO=1 pnpm test:live -- extensions/vydra/vydra.live.test.ts`
    - 该文件运行 `veo3` 文本生成视频，外加一个默认使用远程图像 URL 测试装置的 `kling` 车道
  - 当前的 `videoToVideo` 实时覆盖率：
    - 仅当所选模型是 `runway/gen4_aleph` 时才 `runway`
  - 当前在共享扫描中已声明但跳过的 `videoToVideo` 提供商：
    - `alibaba`、`qwen`、`xai`，因为这些路径目前需要远程 `http(s)` / MP4 参考 URL
    - `google`，因为当前的共享 Gemini/Veo 通道使用本地缓冲区支持的输入，而该路径在共享扫描中不被接受
    - `openai`，因为当前的共享通道缺乏特定于组织的视频重绘/混音访问保证
- 可选缩小范围：
  - `OPENCLAW_LIVE_VIDEO_GENERATION_PROVIDERS="google,openai,runway"`
  - `OPENCLAW_LIVE_VIDEO_GENERATION_MODELS="google/veo-3.1-fast-generate-preview,openai/sora-2,runway/gen4_aleph"`
  - `OPENCLAW_LIVE_VIDEO_GENERATION_SKIP_PROVIDERS=""` 以在默认扫描中包含每个提供商，包括 FAL
  - `OPENCLAW_LIVE_VIDEO_GENERATION_TIMEOUT_MS=60000` 以减少每个提供商的操作上限，进行激进的冒烟测试运行
- 可选的身份验证行为：
  - `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` 以强制使用 profile-store 身份验证并忽略仅限环境的覆盖

## Media live harness

- 命令：`pnpm test:live:media`
- 目的：
  - 通过一个仓库原生入口运行共享的图像、音乐和视频 live 套件
  - 自动从 `~/.profile` 加载缺失的提供商环境变量
  - 默认自动将每个套件缩小到当前具有可用身份验证的提供商
  - 重用 `scripts/test-live.mjs`，因此心跳和静默模式行为保持一致
- 示例：
  - `pnpm test:live:media`
  - `pnpm test:live:media image video --providers openai,google,minimax`
  - `pnpm test:live:media video --video-providers openai,runway --all-providers`
  - `pnpm test:live:media music --quiet`

## Docker 运行器（可选的“在 Linux 中工作”检查）

这些 Docker 运行器分为两类：

- Live-模型 运行器：`test:docker:live-models` 和 `test:docker:live-gateway` 仅在仓库 Docker 镜像内运行与其匹配的 profile-key live 文件（`src/agents/models.profiles.live.test.ts` 和 `src/gateway/gateway-models.profiles.live.test.ts`），同时挂载本地配置目录和工作区（如果挂载了 `~/.profile`，也会获取它）。匹配的本地入口点是 `test:live:models-profiles` 和 `test:live:gateway-profiles`。
- Docker 实时运行器默认使用较小的冒烟测试上限，以便完整的 Docker 扫描保持实用：
  `test:docker:live-models` 默认为 `OPENCLAW_LIVE_MAX_MODELS=12`，且
  `test:docker:live-gateway` 默认为 `OPENCLAW_LIVE_GATEWAY_SMOKE=1`、
  `OPENCLAW_LIVE_GATEWAY_MAX_MODELS=8`、
  `OPENCLAW_LIVE_GATEWAY_STEP_TIMEOUT_MS=45000` 和
  `OPENCLAW_LIVE_GATEWAY_MODEL_TIMEOUT_MS=90000`。当您明确需要更大的全面扫描时，请覆盖这些环境变量。
- `test:docker:all` 通过 `test:docker:live-build` 构建实时 Docker 镜像一次，然后在两个实时 Docker 通道中复用它。它还通过 `test:docker:e2e-build` 构建一个共享的 `scripts/e2e/Dockerfile` 镜像，并将其复用于测试构建应用程序的 E2E 容器冒烟运行器。
- 容器冒烟运行器：`test:docker:openwebui`、`test:docker:onboard`、`test:docker:npm-onboard-channel-agent`、`test:docker:gateway-network`、`test:docker:mcp-channels`、`test:docker:pi-bundle-mcp-tools`、`test:docker:cron-mcp-cleanup`、`test:docker:plugins`、`test:docker:plugin-update` 和 `test:docker:config-reload` 会启动一个或多个真实容器，并验证更高级别的集成路径。

实时模型 Docker 运行器还仅绑定挂载所需的 CLI 认证主目录（或者在运行范围未缩窄时挂载所有支持的目录），然后在运行前将其复制到容器主目录中，以便外部 CLI OAuth 可以刷新令牌而无需更改主机认证存储：

- 直接模型：`pnpm test:docker:live-models`（脚本：`scripts/test-live-models-docker.sh`）
- ACP 绑定冒烟测试：`pnpm test:docker:live-acp-bind`（脚本：`scripts/test-live-acp-bind-docker.sh`）
- CLI 后端冒烟测试：`pnpm test:docker:live-cli-backend`（脚本：`scripts/test-live-cli-backend-docker.sh`）
- Codex 应用服务器线束冒烟测试：`pnpm test:docker:live-codex-harness`（脚本：`scripts/test-live-codex-harness-docker.sh`）
- Gateway(网关) + 开发代理：`pnpm test:docker:live-gateway`（脚本：`scripts/test-live-gateway-models-docker.sh`）
- Open WebUI 实时冒烟测试：`pnpm test:docker:openwebui`（脚本：`scripts/e2e/openwebui-docker.sh`）
- 新手引导向导（TTY，完整脚手架）：`pnpm test:docker:onboard`（脚本：`scripts/e2e/onboard-docker.sh`）
- Npm tarball 新手引导/渠道/agent smoke: `pnpm test:docker:npm-onboard-channel-agent` 在 OpenClaw 中全局安装打包的 Docker tarball，通过 env-ref 新手引导配置 OpenAI 并默认配置 Telegram，验证启用插件会按需安装其运行时依赖，运行 doctor，并运行一次模拟的 OpenAI agent 轮次。使用 `OPENCLAW_NPM_ONBOARD_PACKAGE_TGZ=/path/to/openclaw-*.tgz` 重用预构建的 tarball，使用 `OPENCLAW_NPM_ONBOARD_HOST_BUILD=0` 跳过主机重建，或使用 `OPENCLAW_NPM_ONBOARD_CHANNEL=discord` 切换渠道。
- Gateway(网关) 网络（两个容器，WS 认证 + 运行状况检查）: `pnpm test:docker:gateway-network` (脚本: `scripts/e2e/gateway-network-docker.sh`)
- OpenAI Responses web_search 最小推理回归：`pnpm test:docker:openai-web-search-minimal`（脚本：`scripts/e2e/openai-web-search-minimal-docker.sh`）通过 OpenAI 运行模拟的 Gateway(网关) 服务器，验证 `web_search` 将 `reasoning.effort` 从 `minimal` 提升到 `low`，然后强制提供商 schema 拒绝，并检查原始详细信息是否出现在 Gateway(网关) 日志中。
- MCP 渠道桥接（已播种的 Gateway(网关) + stdio 桥接 + 原始 Claude 通知帧冒烟测试）：`pnpm test:docker:mcp-channels`（脚本：`scripts/e2e/mcp-channels-docker.sh`）
- Pi 捆绑 MCP 工具（真实 stdio MCP 服务器 + 嵌入式 Pi 配置文件允许/拒绝冒烟测试）：`pnpm test:docker:pi-bundle-mcp-tools`（脚本：`scripts/e2e/pi-bundle-mcp-tools-docker.sh`）
- Cron/subagent MCP 清理（隔离的 cron 和一次性子代理运行后的真实 Gateway(网关) + stdio MCP 子进程拆除）：`pnpm test:docker:cron-mcp-cleanup`（脚本：`scripts/e2e/cron-mcp-cleanup-docker.sh`）
- 插件（安装冒烟测试 + `/plugin` 别名 + Claude-bundle 重启语义）：`pnpm test:docker:plugins`（脚本：`scripts/e2e/plugins-docker.sh`）
- 插件更新未更改冒烟测试：`pnpm test:docker:plugin-update`（脚本：`scripts/e2e/plugin-update-unchanged-docker.sh`）
- 配置重新加载元数据冒烟测试：`pnpm test:docker:config-reload`（脚本：`scripts/e2e/config-reload-source-docker.sh`）
- 捆绑的插件运行时依赖项：`pnpm test:docker:bundled-channel-deps` 默认构建一个小型 Docker 运行器镜像，在宿主机上构建并打包 OpenClaw 一次，然后将该 tarball 挂载到每个 Linux 安装场景中。使用 `OPENCLAW_SKIP_DOCKER_BUILD=1` 重用该镜像，在全新本地构建后使用 `OPENCLAW_BUNDLED_CHANNEL_HOST_BUILD=0` 跳过宿主机重建，或使用 `OPENCLAW_BUNDLED_CHANNEL_PACKAGE_TGZ=/path/to/openclaw-*.tgz` 指向现有的 tarball。
- 在迭代过程中，可以通过禁用不相关的场景来缩小捆绑的插件运行时依赖项范围，例如：
  `OPENCLAW_BUNDLED_CHANNEL_SCENARIOS=0 OPENCLAW_BUNDLED_CHANNEL_UPDATE_SCENARIO=0 OPENCLAW_BUNDLED_CHANNEL_ROOT_OWNED_SCENARIO=0 OPENCLAW_BUNDLED_CHANNEL_SETUP_ENTRY_SCENARIO=0 pnpm test:docker:bundled-channel-deps`。

要手动预构建和重用共享的 built-app 镜像：

```bash
OPENCLAW_DOCKER_E2E_IMAGE=openclaw-docker-e2e:local pnpm test:docker:e2e-build
OPENCLAW_DOCKER_E2E_IMAGE=openclaw-docker-e2e:local OPENCLAW_SKIP_DOCKER_BUILD=1 pnpm test:docker:mcp-channels
```

特定于套件的镜像覆盖（例如 `OPENCLAW_GATEWAY_NETWORK_E2E_IMAGE`）在设置时仍然优先。当 `OPENCLAW_SKIP_DOCKER_BUILD=1` 指向远程共享镜像时，如果本地尚未存在，脚本会将其拉取。QR 和安装程序 Docker 测试保留了自己的 Dockerfile，因为它们验证的是包/安装行为，而不是共享的构建应用运行时。

live-模型 Docker 运行器还会以只读方式绑定挂载当前的检出代码，并将其暂存到容器内部的临时工作目录中。这既使运行时镜像保持精简，又能针对您的确切的本地源代码/配置运行 Vitest。暂存步骤会跳过大型本地缓存和应用构建输出，例如 `.pnpm-store`、`.worktrees`、`__openclaw_vitest__` 以及应用本地的 `.build` 或 Gradle 输出目录，这样 Docker 实时运行就不会花费数分钟来复制特定于机器的产物。它们还设置了 `OPENCLAW_SKIP_CHANNELS=1`，这样 gateway 实时探测就不会在容器内启动真正的 Telegram/Discord/等渠道工作进程。`test:docker:live-models` 仍然会运行 `pnpm test:live`，因此当您需要缩小或排除该 Docker 通道中的 gateway 实时覆盖范围时，也请传递 `OPENCLAW_LIVE_GATEWAY_*`。`test:docker:openwebui` 是一个更高级别的兼容性冒烟测试：它启动一个启用了 OpenClaw 兼容 HTTP 端点的 OpenAI gateway 容器，针对该 gateway 启动一个固定的 Open WebUI 容器，通过 Open WebUI 登录，验证 `/api/models` 暴露了 `openclaw/default`，然后通过 Open WebUI 的 `/api/chat/completions` 代理发送一个真实的聊天请求。第一次运行可能会明显慢一些，因为 Docker 可能需要拉取 Open WebUI 镜像，且 Open WebUI 可能需要完成其自身的冷启动设置。该通道需要一个可用的实时模型密钥，而 `OPENCLAW_PROFILE_FILE`（默认为 `~/.profile`）是在 Telegram 化运行中提供该密钥的主要方式。成功的运行会打印一个小型的 JSON 载荷，例如 `{ "ok": true, "模型": "openclaw/default", ... }`。`test:docker:mcp-channels` 是有意确定性的，不需要真实的 Discord、iMessage 或 Gateway(网关) 账户。它会启动一个已设定种子的 Docker 容器，启动一个生成 `openclaw mcp serve` 的第二个容器，然后验证路由对话发现、转录读取、附件元数据、实时事件队列行为、出站发送路由，以及通过真实的 stdio MCP 桥接进行的 Claude 风格渠道 + 权限通知。通知检查会直接检查原始 stdio MCP 帧，因此该冒烟测试验证的是桥接实际发出的内容，而不仅仅是特定客户端 SDK 恰好显示的内容。`test:docker:pi-bundle-mcp-tools` 是确定性的，不需要实时模型密钥。它会构建仓库 Gateway(网关) 镜像，在容器内启动一个真实的 stdio MCP 探测服务器，通过嵌入式 Pi 包 MCP 运行时实例化该服务器，执行该工具，然后验证 `coding` 和 `messaging` 保留了 `bundle-mcp` 工具，而 `minimal` 和 `tools.deny: ["bundle-mcp"]` 会过滤它们。`test:docker:cron-mcp-cleanup` 是确定性的，不需要实时模型密钥。它会启动一个带有真实 stdio MCP 探测服务器的已设定种子的 Gateway(网关)，运行一个隔离的 cron 轮询和一个 `/subagents spawn` 一次性子轮询，然后验证 MCP 子进程在每次运行后退出。

手动 ACP 自然语言线程冒烟测试（非 CI）：

- `bun scripts/dev/discord-acp-plain-language-smoke.ts --channel <discord-channel-id> ...`
- 保留此脚本用于回归/调试工作流。未来可能再次需要它来进行 ACP 线程路由验证，因此请勿删除它。

有用的环境变量：

- `OPENCLAW_CONFIG_DIR=...`（默认：`~/.openclaw`）挂载到 `/home/node/.openclaw`
- `OPENCLAW_WORKSPACE_DIR=...`（默认：`~/.openclaw/workspace`）挂载到 `/home/node/.openclaw/workspace`
- `OPENCLAW_PROFILE_FILE=...`（默认：`~/.profile`）挂载到 `/home/node/.profile` 并在运行测试之前 source
- `OPENCLAW_DOCKER_PROFILE_ENV_ONLY=1` 以仅验证从 `OPENCLAW_PROFILE_FILE` source 的环境变量，使用临时配置/工作区目录且无外部 CLI 认证挂载
- `OPENCLAW_DOCKER_CLI_TOOLS_DIR=...` (默认值：`~/.cache/openclaw/docker-cli-tools`) 挂载到 `/home/node/.npm-global`，用于在 CLI 内部缓存 Docker 安装
- 位于 `$HOME` 下的外部 CLI 认证目录/文件以只读方式挂载到 `/host-auth...` 下，然后在测试开始前复制到 `/home/node/...`
  - 默认目录：`.minimax`
  - 默认文件：`~/.codex/auth.json`、`~/.codex/config.toml`、`.claude.json`、`~/.claude/.credentials.json`、`~/.claude/settings.json`、`~/.claude/settings.local.json`
  - 缩窄的提供商运行仅挂载从 `OPENCLAW_LIVE_PROVIDERS` / `OPENCLAW_LIVE_GATEWAY_PROVIDERS` 推断出的所需目录/文件
  - 使用 `OPENCLAW_DOCKER_AUTH_DIRS=all`、`OPENCLAW_DOCKER_AUTH_DIRS=none` 或类似 `OPENCLAW_DOCKER_AUTH_DIRS=.claude,.codex` 的逗号列表进行手动覆盖
- `OPENCLAW_LIVE_GATEWAY_MODELS=...` / `OPENCLAW_LIVE_MODELS=...` 用于缩小运行范围
- `OPENCLAW_LIVE_GATEWAY_PROVIDERS=...` / `OPENCLAW_LIVE_PROVIDERS=...` 用于在容器内过滤提供商
- `OPENCLAW_SKIP_DOCKER_BUILD=1` 用于复用现有的 `openclaw:local-live` 镜像，以避免不需要重新构建的重新运行
- `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` 用于确保凭据来自配置文件存储（而非环境变量）
- `OPENCLAW_OPENWEBUI_MODEL=...` 用于选择网关为 Open WebUI 冒烟测试暴露的模型
- `OPENCLAW_OPENWEBUI_PROMPT=...` 用于覆盖 Open WebUI 冒烟测试使用的 nonce 检查提示词
- `OPENWEBUI_IMAGE=...` 用于覆盖固定的 Open WebUI 镜像标签

## 文档完整性检查

在编辑文档后运行文档检查：`pnpm check:docs`。
当您也需要页面内标题检查时，运行完整的 Mintlify 锚点验证：`pnpm docs:check-links:anchors`。

## 离线回归测试 (CI 安全)

这些是“真实管道”回归测试，但不使用真实的提供商：

- Gateway(网关) 工具调用（模拟 OpenAI，真实的 gateway + agent 循环）：`src/gateway/gateway.test.ts` (case: "runs a mock OpenAI 工具 call end-to-end via gateway agent loop")
- Gateway(网关) 向导（WS `wizard.start`/`wizard.next`，写入配置 + 强制执行身份验证）：`src/gateway/gateway.test.ts` (case: "runs wizard over ws and writes auth token config")

## Agent 可靠性评估 (skills)

我们已经有一些 CI 安全的测试，其行为类似于“agent 可靠性评估”：

- 通过真实的 gateway + agent 循环模拟工具调用 (`src/gateway/gateway.test.ts`)。
- 用于验证会话连接和配置效果的端到端向导流程 (`src/gateway/gateway.test.ts`)。

Skills 仍然缺失的内容（请参阅 [Skills](/zh/tools/skills)）：

- **决策制定：** 当 prompt 中列出了 Skills 时，agent 是否会选择正确的 Skill（或避免不相关的 Skill）？
- **合规性：** agent 在使用前是否会阅读 `SKILL.md` 并遵循所需的步骤/参数？
- **工作流约定：** 断言工具顺序、会话历史延续和沙盒边界的多轮场景。

未来的评估应首先保持确定性：

- 使用模拟提供程序断言工具调用 + 顺序、Skill 文件读取和会话连接的场景运行器。
- 一小套以 Skill 为中心的场景（使用 vs 避免、守卫、prompt 注入）。
- 仅在建立了 CI 安全套件之后，才进行可选的实时评估（选择性加入、环境守卫）。

## 契约测试（插件和渠道形状）

合约测试验证每个注册的插件和渠道是否符合其接口合约。它们遍历所有发现的插件并运行一系列形状和行为断言。默认的 `pnpm test` 单元赛道会故意跳过这些共享 seam 和冒烟文件；当你接触共享渠道或提供商接口时，请显式运行合约命令。

### 命令

- 所有合约：`pnpm test:contracts`
- 仅渠道合约：`pnpm test:contracts:channels`
- 仅提供商合约：`pnpm test:contracts:plugins`

### 渠道合约

位于 `src/channels/plugins/contracts/*.contract.test.ts`：

- **plugin** - 基本插件形状（id、名称、功能）
- **setup** - 设置向导合约
- **会话-binding** - 会话绑定行为
- **outbound-payload** - 消息载荷结构
- **inbound** - 入站消息处理
- **actions** - 渠道动作处理程序
- **threading** - Thread ID 处理
- **directory** - Directory/roster API
- **group-policy** - 组策略执行

### 提供商状态契约

位于 `src/plugins/contracts/*.contract.test.ts`。

- **status** - 渠道状态探测
- **registry** - 插件注册表形状

### 提供商契约

位于 `src/plugins/contracts/*.contract.test.ts`：

- **auth** - 认证流程契约
- **auth-choice** - 认证选择/选取
- **catalog** - Model catalog API
- **discovery** - 插件发现
- **loader** - 插件加载
- **runtime** - 提供商运行时
- **shape** - 插件形状/接口
- **wizard** - 设置向导

### 何时运行

- 在更改 plugin-sdk 导出或子路径之后
- 在添加或修改渠道或提供商插件之后
- 在重构插件注册或发现之后

契约测试在 CI 中运行，不需要真实的 API 密钥。

## 添加回归测试（指导）

当您修复在 live 中发现的提供商/模型问题时：

- 如果可能，添加一个 CI 安全的回归测试（模拟/存根提供商，或捕获精确的请求形状转换）
- 如果它本质上仅限于 live（速率限制、身份验证策略），请保持 live 测试狭窄并通过环境变量选择加入
- 优先定位捕获该 bug 的最小层：
  - 提供商请求转换/重放 bug → 直接模型测试
  - 网关会话/历史/工具管道 bug → 网关 live 冒烟测试或 CI 安全的网关模拟测试
- SecretRef 遍历护栏：
  - `src/secrets/exec-secret-ref-id-parity.test.ts` 从注册表元数据 (`listSecretTargetRegistryEntries()`) 中为每个 SecretRef 类派生一个采样目标，然后断言遍历段执行 ID 被拒绝。
  - 如果在 `src/secrets/target-registry-data.ts` 中添加了新的 `includeInPlan` SecretRef 目标系列，请在该测试中更新 `classifyTargetClass`。该测试会在未分类的目标 ID 上故意失败，以便新类别不会被静默跳过。
