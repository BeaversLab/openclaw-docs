---
summary: "测试工具包：单元/e2e/live 测试套件、Docker 运行器以及每个测试涵盖的内容"
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

- 完整门控（推送前预期）：`pnpm build && pnpm check && pnpm check:test-types && pnpm test`
- 在配置较好的机器上更快的本地完整套件运行：`pnpm test:max`
- 直接 Vitest 监视循环：`pnpm test:watch`
- 直接文件定位现在也会路由扩展/渠道路径：`pnpm test extensions/discord/src/monitor/message-handler.preflight.test.ts`
- 当您正在针对单个失败进行迭代时，请优先使用定向运行。
- 基于 Docker 的 QA 站点：`pnpm qa:lab:up`
- 基于 Linux VM 的 QA 通道：`pnpm openclaw qa suite --runner multipass --scenario channel-chat-baseline`

当您接触测试或需要额外的信心时：

- 覆盖率门控：`pnpm test:coverage`
- E2E 套件：`pnpm test:e2e`

调试真实提供商/模型时（需要真实凭证）：

- Live 套件（模型 + 网关 工具/图像探测）：`pnpm test:live`
- 安静地定位一个 Live 文件：`pnpm test:live -- src/agents/models.profiles.live.test.ts`
- Moonshot/Kimi 成本冒烟测试：设置 `MOONSHOT_API_KEY` 后，运行
  `openclaw models list --provider moonshot --json`，然后针对 `moonshot/kimi-k2.6` 运行一个独立的
  `openclaw agent --local --session-id live-kimi-cost --message 'Reply exactly: KIMI_LIVE_OK' --thinking off --json`。验证 JSON 报告显示 Moonshot/K2.6 且
  助手对话记录存储了标准化的 `usage.cost`。

提示：当您只需要一个失败案例时，优先使用下面描述的 allowlist 环境变量来缩小 live 测试范围。

## QA 专用运行器

当您需要 QA 实验室的真实环境时，这些命令位于主测试套件之侧：

- `pnpm openclaw qa suite`
  - 直接在主机上运行基于仓库的 QA 场景。
  - 默认情况下，通过独立的网关工作进程并行运行多个选定的场景。
    `qa-channel` 默认并发数为 4（受选定场景数量限制）。使用 `--concurrency <count>` 调整工作进程
    数量，或使用 `--concurrency 1` 运行较旧的串行通道。
  - 当任何场景失败时，以非零状态退出。当您
    需要生成产物而不希望因失败而退出时，请使用 `--allow-failures`。
  - 支持提供商模式 `live-frontier`、`mock-openai` 和 `aimock`。
    `aimock` 启动一个本地基于 AIMock 的提供商服务器，用于实验性
    fixture 和协议模拟覆盖，而无需替换感知场景的
    `mock-openai` 通道。
- `pnpm openclaw qa suite --runner multipass`
  - 在一次性 Multipass Linux 虚拟机内运行相同的 QA 套件。
  - 保持与主机上的 `qa suite` 相同的场景选择行为。
  - 复用与 `qa suite` 相同的提供商/模型选择标志。
  - Live 运行会转发适合访客使用的受支持 QA 认证输入：
    基于环境变量的提供商密钥、QA live 提供商配置路径，以及（如果存在）`CODEX_HOME`。
  - 输出目录必须位于仓库根目录下，以便访客可以通过挂载的工作空间写回数据。
  - 写入常规 QA 报告 + 摘要，以及位于 `.artifacts/qa-e2e/...` 下的 Multipass 日志。
- `pnpm qa:lab:up`
  - 启动基于 Docker 的 QA 站点，用于操作员风格的 QA 工作。
- `pnpm test:docker:bundled-channel-deps`
  - 打包并在 Docker 中安装当前的 OpenClaw 构建，启动配置了 OpenAI 的 Gateway(网关)，然后通过配置编辑启用 Telegram 和 Discord。
  - 验证第一次 Gateway(网关)重启会按需安装每个捆绑渠道插件的运行时依赖，而第二次重启不会重新安装已激活的依赖。
- `pnpm openclaw qa aimock`
  - 仅启动本地 AIMock 提供商服务器以进行直接协议冒烟测试。
- `pnpm openclaw qa matrix`
  - 针对由 Docker 支持的一次性 Tuwunel 主服务器运行 Matrix 实时 QA 通道。
  - 目前此 QA 主机仅限仓库/开发使用。打包的 OpenClaw 安装程序不附带 `qa-lab`，因此它们不暴露 `openclaw qa`。
  - 仓库检出直接加载捆绑的运行器；无需单独的插件安装步骤。
  - 配置三个临时的 Matrix 用户（`driver`，`sut`，`observer`）加一个私人房间，然后启动一个 QA Gateway(网关)子进程，将真实的 Matrix 插件作为被测系统 (SUT) 传输。
  - 默认使用固定的稳定 Tuwunel 镜像 `ghcr.io/matrix-construct/tuwunel:v1.5.1`。当您需要测试不同的镜像时，可以使用 `OPENCLAW_QA_MATRIX_TUWUNEL_IMAGE` 覆盖。
  - Matrix 不暴露共享凭证源标志，因为该通道会在本地配置一次性用户。
  - 在 `.artifacts/qa-e2e/...` 下写入 Matrix QA 报告、摘要、观察事件构件以及合并的 stdout/stderr 输出日志。
- `pnpm openclaw qa telegram`
  - 使用来自环境变量的驱动程序和 SUT 机器人令牌，针对真实的私人组运行 Telegram 实时 QA 通道。
  - 需要 `OPENCLAW_QA_TELEGRAM_GROUP_ID`、`OPENCLAW_QA_TELEGRAM_DRIVER_BOT_TOKEN` 和 `OPENCLAW_QA_TELEGRAM_SUT_BOT_TOKEN`。组 ID 必须是数字 Telegram 聊天 ID。
  - 支持 `--credential-source convex` 用于共享池凭证。默认使用 env 模式，或设置 `OPENCLAW_QA_CREDENTIAL_SOURCE=convex` 以选择加入池租约。
  - 当任何场景失败时，以非零代码退出。当您希望在不出现失败退出代码的情况下获取构件时，请使用 `--allow-failures`。
  - 需要在同一个私人组中有两个不同的机器人，其中 SUT 机器人暴露一个 Telegram 用户名。
  - 为了稳定的机器人对机器人观察，请在两个机器人的 `@BotFather` 中启用 Bot-to-Bot Communication Mode，并确保驱动机器人可以观察到群组机器人的流量。
  - 在 `.artifacts/qa-e2e/...` 下写入 Telegram QA 报告、摘要和观察消息产物。

Live transport lanes 共享一个标准合约，因此新的传输层不会偏离：

`qa-channel` 仍然是广泛的综合 QA 套件，不属于 live
transport coverage matrix 的一部分。

| Lane     | Canary | Mention gating | Allowlist block | Top-level reply | Restart resume | Thread follow-up | Thread isolation | Reaction observation | Help command |
| -------- | ------ | -------------- | --------------- | --------------- | -------------- | ---------------- | ---------------- | -------------------- | ------------ |
| Matrix   | x      | x              | x               | x               | x              | x                | x                | x                    |              |
| Telegram | x      |                |                 |                 |                |                  |                  |                      | x            |

### 通过 Convex 共享 Telegram 凭据 (v1)

当为 `openclaw qa telegram` 启用 `--credential-source convex`（或 `OPENCLAW_QA_CREDENTIAL_SOURCE=convex`）时，QA 实验室从 Convex 支持的池中获取独占租约，在 lane 运行期间发送该租约的心跳，并在关闭时释放租约。

参考 Convex 项目脚手架：

- `qa/convex-credential-broker/`

必需的环境变量：

- `OPENCLAW_QA_CONVEX_SITE_URL` (例如 `https://your-deployment.convex.site`)
- 所选角色需要一个密钥：
  - `OPENCLAW_QA_CONVEX_SECRET_MAINTAINER` 用于 `maintainer`
  - `OPENCLAW_QA_CONVEX_SECRET_CI` 用于 `ci`
- 凭据角色选择：
  - CLI: `--credential-role maintainer|ci`
  - 环境变量默认值: `OPENCLAW_QA_CREDENTIAL_ROLE` (在 CI 中默认为 `ci`，否则为 `maintainer`)

可选的环境变量：

- `OPENCLAW_QA_CREDENTIAL_LEASE_TTL_MS` (默认为 `1200000`)
- `OPENCLAW_QA_CREDENTIAL_HEARTBEAT_INTERVAL_MS` (默认为 `30000`)
- `OPENCLAW_QA_CREDENTIAL_ACQUIRE_TIMEOUT_MS` (默认为 `90000`)
- `OPENCLAW_QA_CREDENTIAL_HTTP_TIMEOUT_MS` (默认为 `15000`)
- `OPENCLAW_QA_CONVEX_ENDPOINT_PREFIX` (默认为 `/qa-credentials/v1`)
- `OPENCLAW_QA_CREDENTIAL_OWNER_ID` (可选的追踪 ID)
- `OPENCLAW_QA_ALLOW_INSECURE_HTTP=1` 允许仅本地开发使用环回 `http://` Convex URL。

`OPENCLAW_QA_CONVEX_SITE_URL` 在正常运行中应使用 `https://`。

维护者管理员命令（pool add/remove/list）特别需要
`OPENCLAW_QA_CONVEX_SECRET_MAINTAINER`。

面向维护者的 CLI 辅助工具：

```bash
pnpm openclaw qa credentials add --kind telegram --payload-file qa/telegram-credential.json
pnpm openclaw qa credentials list --kind telegram
pnpm openclaw qa credentials remove --credential-id <credential-id>
```

在脚本和 CI 工具中使用 `--json` 以获取机器可读的输出。

默认端点合约（`OPENCLAW_QA_CONVEX_SITE_URL` + `/qa-credentials/v1`）：

- `POST /acquire`
  - 请求：`{ kind, ownerId, actorRole, leaseTtlMs, heartbeatIntervalMs }`
  - 成功：`{ status: "ok", credentialId, leaseToken, payload, leaseTtlMs?, heartbeatIntervalMs? }`
  - 耗尽/可重试：`{ status: "error", code: "POOL_EXHAUSTED" | "NO_CREDENTIAL_AVAILABLE", ... }`
- `POST /heartbeat`
  - 请求：`{ kind, ownerId, actorRole, credentialId, leaseToken, leaseTtlMs }`
  - 成功：`{ status: "ok" }`（或为空 `2xx`）
- `POST /release`
  - 请求：`{ kind, ownerId, actorRole, credentialId, leaseToken }`
  - 成功：`{ status: "ok" }`（或为空 `2xx`）
- `POST /admin/add`（仅限维护者密钥）
  - 请求：`{ kind, actorId, payload, note?, status? }`
  - 成功：`{ status: "ok", credential }`
- `POST /admin/remove`（仅限维护者密钥）
  - 请求：`{ credentialId, actorId }`
  - 成功：`{ status: "ok", changed, credential }`
  - 活跃租约保护：`{ status: "error", code: "LEASE_ACTIVE", ... }`
- `POST /admin/list`（仅限维护者密钥）
  - 请求：`{ kind?, status?, includePayload?, limit? }`
  - 成功：`{ status: "ok", credentials, count }`

Telegram 类型的 Payload 结构：

- `{ groupId: string, driverToken: string, sutToken: string }`
- `groupId` 必须是数字形式的 Telegram 聊天 ID 字符串。
- `admin/add` 会验证 `kind: "telegram"` 的此结构，并拒绝格式错误的 Payload。

### 向 QA 添加渠道

向 markdown QA 系统添加渠道需要满足以下两点：

1. 该渠道的传输适配器。
2. 一个用于测试渠道合约的场景包。

当共享的 `qa-lab` 主机可以
拥有该流程时，不要添加新的顶级 QA 命令根。

`qa-lab` 拥有共享主机机制：

- `openclaw qa` 命令根
- 套件启动和拆卸
- 工作线程并发
- 产物写入
- 报告生成
- 场景执行
- 较旧的 `qa-channel` 场景的兼容性别名

Runner 插件拥有传输协议：

- `openclaw qa <runner>` 如何挂载在共享的 `qa` 根目录下
- 如何针对该传输配置网关
- 如何检查就绪状态
- 如何注入入站事件
- 如何观察出站消息
- 如何公开脚本和标准化传输状态
- 如何执行由传输支持的操作
- 如何处理特定于传输的重置或清理

采用新渠道的最低标准是：

1. 保持 `qa-lab` 作为共享 `qa` 根目录的所有者。
2. 在共享 `qa-lab` 主机接缝上实现传输运行器。
3. 将特定于传输的机制保留在运行器插件或渠道套件内。
4. 将运行器挂载为 `openclaw qa <runner>`，而不是注册竞争的根命令。
   运行器插件应在 `openclaw.plugin.json` 中声明 `qaRunners`，并从 `runtime-api.ts` 导出匹配的 `qaRunnerCliRegistrations` 数组。
   保持 `runtime-api.ts` 轻量；延迟 CLI 和运行器执行应保留在单独的入口点之后。
5. 在主题化的 `qa/scenarios/` 目录下编写或调整 Markdown 场景。
6. 对新场景使用通用场景辅助函数。
7. 除非仓库正在进行有意的迁移，否则保持现有的兼容性别名正常工作。

决策规则是严格的：

- 如果行为可以在 `qa-lab` 中表达一次，请将其放在 `qa-lab` 中。
- 如果行为取决于一种渠道传输，请将其保留在该运行器插件或插件套件中。
- 如果场景需要多个渠道都可以使用的新功能，请添加通用辅助函数，而不是在 `suite.ts` 中添加特定于渠道的分支。
- 如果某种行为仅对一种传输有意义，请保持该场景特定于传输，并在场景契约中明确说明。

新场景的首选通用辅助函数名称为：

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

兼容性别名仍可用于现有场景，包括：

- `waitForQaChannelReady`
- `waitForOutboundMessage`
- `waitForNoOutbound`
- `formatConversationTranscript`
- `resetBus`

新的渠道工作应使用通用辅助程序名称。兼容性别名的存在是为了避免一次性大规模迁移，而不是作为新场景编写的模型。

## 测试套件（在哪里运行什么）

可以将这些套件视为“真实感递增”（以及不稳定性/成本递增）：

### 单元 / 集成（默认）

- 命令： `pnpm test`
- 配置：在现有的限定范围 Vitest 项目上进行十次连续分片运行（`vitest.full-*.config.ts`）
- 文件：`src/**/*.test.ts`、`packages/**/*.test.ts`、`test/**/*.test.ts` 下的 core/unit 清单，以及由 `vitest.unit.config.ts` 覆盖的白名单 `ui` 节点测试
- 范围：
  - 纯单元测试
  - 进程内集成测试（网关身份验证、路由、工具、解析、配置）
  - 针对已知 Bug 的确定性回归测试
- 预期：
  - 在 CI 中运行
  - 不需要真实的密钥
  - 应该快速且稳定
- 项目说明：
  - 无目标的 `pnpm test` 现在运行 11 个较小的分片配置（`core-unit-src`、`core-unit-security`、`core-unit-ui`、`core-unit-support`、`core-support-boundary`、`core-contracts`、`core-bundled`、`core-runtime`、`agentic`、`auto-reply`、`extensions`），而不是一个巨大的原生根项目进程。这降低了负载机器上的峰值 RSS，并避免了自动回复/扩展工作导致不相关套件饥饿。
  - `pnpm test --watch` 仍然使用原生根 `vitest.config.ts` 项目图，因为多分片监视循环是不切实际的。
  - `pnpm test`、`pnpm test:watch` 和 `pnpm test:perf:imports` 首先通过限定作用域的通道路由显式的文件/目录目标，因此 `pnpm test extensions/discord/src/monitor/message-handler.preflight.test.ts` 避免了支付完整的根项目启动成本。
  - 当差异仅涉及可路由的源/测试文件时，`pnpm test:changed` 会将更改的 git 路径扩展到相同的限定作用域通道中；配置/设置编辑仍然回退到广泛的根项目重新运行。
  - `pnpm check:changed` 是用于狭窄工作的常规智能本地网关。它将差异分类为核心、核心测试、扩展、扩展测试、应用、文档和工具，然后运行匹配的类型检查/检查/测试通道。公共插件 SDK 和插件契约的更改包括扩展验证，因为扩展依赖于那些核心契约。
  - 来自代理、命令、插件、自动回复助手、`plugin-sdk` 和类似纯实用工具区域的轻量级单元测试通过 `unit-fast` 通道路由，该通道跳过 `test/setup-openclaw-runtime.ts`；有状态/运行时繁重的文件保留在现有通道上。
  - 选定的 `plugin-sdk` 和 `commands` 助手源文件还将更改模式运行映射到这些轻量级通道中的显式同级测试，因此助手编辑避免了为该目录重新运行完整的繁重套件。
  - `auto-reply` 现在有三个专用存储桶：顶级核心助手、顶级 `reply.*` 集成测试和 `src/auto-reply/reply/**` 子树。这将最繁重的回复工具工作与廉价的状态/块/令牌测试隔离开来。
- 嵌入式运行器说明：
  - 当您更改消息工具发现输入或压缩运行时上下文时，
    请保持两个级别的覆盖率。
  - 为纯路由/规范化边界添加集中的助手回归测试。
  - 同时保持嵌入式运行器集成套件的正常运行：
    `src/agents/pi-embedded-runner/compact.hooks.test.ts`、
    `src/agents/pi-embedded-runner/run.overflow-compaction.test.ts` 和
    `src/agents/pi-embedded-runner/run.overflow-compaction.loop.test.ts`。
  - 那些测试套件验证了作用域 ID 和压缩行为是否仍然通过真实的 `run.ts` / `compact.ts` 路径；仅针对辅助函数的测试不足以替代这些集成路径。
- 池说明：
  - 基础 Vitest 配置现在默认为 `threads`。
  - 共享的 Vitest 配置还修复了 `isolate: false`，并在根项目、e2e 和 live 配置中使用了非隔离运行器。
  - 根 UI 车道保留了其 `jsdom` 设置和优化器，但现在也在共享的非隔离运行器上运行。
  - 每个 `pnpm test` 分片都从共享的 Vitest 配置中继承相同的 `threads` + `isolate: false` 默认值。
  - 共享的 `scripts/run-vitest.mjs` 启动器现在默认还为 Vitest 子 Node 进程添加 `--no-maglev`，以减少大型本地运行期间的 V8 编译抖动。如果需要与标准 V8 行为进行比较，请设置 `OPENCLAW_VITEST_ENABLE_MAGLEV=1`。
- 快速本地迭代说明：
  - `pnpm changed:lanes` 显示差异触发了哪些架构车道。
  - 预提交钩子在暂存的格式化/检查之后运行 `pnpm check:changed --staged`，因此仅涉及核心的提交不会支付扩展测试成本，除非它们触及面向公共扩展的合约。
  - 当更改的路径清晰地映射到较小的套件时，`pnpm test:changed` 会通过作用域车道进行路由。
  - `pnpm test:max` 和 `pnpm test:changed:max` 保持相同的路由行为，只是具有更高的 worker 上限。
  - 本地 worker 自动扩缩现在是有意保持保守的，并且当主机负载平均值已经很高时也会退缩，因此默认情况下多个并发的 Vitest 运行造成的破坏较小。
  - 基础 Vitest 配置将项目/配置文件标记为 `forceRerunTriggers`，以便当测试连接发生变化时，更改模式下的重新运行保持正确。
  - 配置在受支持的主机上保持 `OPENCLAW_VITEST_FS_MODULE_CACHE` 启用；如果您想要一个明确的缓存位置用于直接分析，请设置 `OPENCLAW_VITEST_FS_MODULE_CACHE_PATH=/abs/path`。
- 性能调试说明：
  - `pnpm test:perf:imports` 启用 Vitest 导入持续时间报告以及导入细分输出。
  - `pnpm test:perf:imports:changed` 将相同的分析视图限定为自 `origin/main` 以来的更改文件。
- `pnpm test:perf:changed:bench -- --ref <git-ref>` 将路由的 `test:changed` 与该提交差异的原生根项目路径进行比较，并打印耗时以及 macOS 最大常驻内存集（max RSS）。
- `pnpm test:perf:changed:bench -- --worktree` 通过 `scripts/test-projects.mjs` 和根 Vitest 配置路由更改文件列表，从而对当前的脏树（dirty tree）进行基准测试。
  - `pnpm test:perf:profile:main` 为 Vitest/Vite 启动和转换开销编写主线程 CPU 分析文件。
  - `pnpm test:perf:profile:runner` 在禁用文件并行的情况下，为单元测试套件编写运行器 CPU 和堆内存分析文件。

### E2E（网关冒烟测试）

- 命令：`pnpm test:e2e`
- 配置：`vitest.e2e.config.ts`
- 文件：`src/**/*.e2e.test.ts`、`test/**/*.e2e.test.ts`
- 运行时默认值：
  - 使用带有 `isolate: false` 的 Vitest `threads`，与仓库的其他部分保持一致。
  - 使用自适应工作线程（CI 中最多 2 个，本地默认 1 个）。
  - 默认以静默模式运行以减少控制台 I/O 开销。
- 有用的覆盖选项：
  - `OPENCLAW_E2E_WORKERS=<n>` 用于强制指定工作线程数量（上限为 16）。
  - `OPENCLAW_E2E_VERBOSE=1` 用于重新启用详细的控制台输出。
- 范围：
  - 多实例网关端到端行为
  - WebSocket/HTTP 表面、节点配对和更繁重的网络测试
- 预期：
  - 在 CI 中运行（当在管道中启用时）
  - 不需要真实密钥
  - 比单元测试有更多活动部件（可能会更慢）

### E2E：OpenShell 后端冒烟测试

- 命令：`pnpm test:e2e:openshell`
- 文件：`test/openshell-sandbox.e2e.test.ts`
- 范围：
  - 通过 Docker 在主机上启动隔离的 OpenShell 网关
  - 从临时的本地 Dockerfile 创建沙箱
  - 通过真实的 `sandbox ssh-config` + SSH exec 测试 OpenClaw 的 OpenShell 后端
  - 通过沙箱 fs 桥接验证远程规范文件系统行为
- 预期：
  - 仅限选择性加入；不是默认 `pnpm test:e2e` 运行的一部分
  - 需要本地 `openshell` CLI 以及可工作的 Docker 守护进程
  - 使用隔离的 `HOME` / `XDG_CONFIG_HOME`，然后销毁测试网关和沙箱
- 有用的覆盖参数：
  - `OPENCLAW_E2E_OPENSHELL=1` 以便在手动运行更广泛的 e2e 测试套件时启用该测试
  - `OPENCLAW_E2E_OPENSHELL_COMMAND=/path/to/openshell` 用于指向非默认的 CLI 二进制文件或包装脚本

### Live（真实提供商 + 真实模型）

- 命令：`pnpm test:live`
- 配置：`vitest.live.config.ts`
- 文件：`src/**/*.live.test.ts`
- 默认：由 `pnpm test:live` **启用**（设置 `OPENCLAW_LIVE_TEST=1`）
- 范围：
  - “该提供商/模型今天在使用真实凭证时真的能用吗？”
  - 捕获提供商格式变更、工具调用怪癖、身份验证问题和速率限制行为
- 预期：
  - 设计上非 CI 稳定（真实网络、真实提供商策略、配额、中断）
  - 需要花钱 / 使用速率限制
  - 优先运行缩小的子集，而不是“所有内容”
- Live 运行 source `~/.profile` 以获取缺失的 API 密钥。
- 默认情况下，live 运行仍然隔离 `HOME`，并将配置/身份验证材料复制到临时测试主目录，以便单元装置无法改变你的真实 `~/.openclaw`。
- 仅当你有意需要 live 测试使用你的真实主目录时，才设置 `OPENCLAW_LIVE_USE_REAL_HOME=1`。
- `pnpm test:live` 现在默认为更安静的模式：它保留 `[live] ...` 进度输出，但抑制额外的 `~/.profile` 通知并静默网关引导日志/Bonjour 聊天。如果你想要完整的启动日志，请设置 `OPENCLAW_LIVE_TEST_QUIET=0`。
- API 密钥轮换（特定于提供商）：使用逗号/分号格式设置 `*_API_KEYS`，或设置 `*_API_KEY_1`、`*_API_KEY_2`（例如 `OPENAI_API_KEYS`、`ANTHROPIC_API_KEYS`、`GEMINI_API_KEYS`），或通过 `OPENCLAW_LIVE_*_KEY` 进行每个 live 的覆盖；测试会在速率限制响应时重试。
- 进度/心跳输出：
  - Live 套件现在会向 stderr 发出进度行，因此即使 Vitest 控制台捕获处于静默状态，较长的提供商调用也能明显保持活动状态。
  - `vitest.live.config.ts` 禁用 Vitest 控制台拦截，以便提供商/网关进度行在 live 运行期间立即流式传输。
  - 使用 `OPENCLAW_LIVE_HEARTBEAT_MS` 调整直接模型心跳。
  - 使用 `OPENCLAW_LIVE_GATEWAY_HEARTBEAT_MS` 调整 Gateway/probe 心跳。

## 我应该运行哪个测试套件？

使用此决策表：

- 编辑逻辑/测试：运行 `pnpm test`（如果进行了大量更改，则运行 `pnpm test:coverage`）
- 涉及 Gateway 网络连接 / WS 协议 / 配对：添加 `pnpm test:e2e`
- 调试“我的机器人已宕机”/ 提供商特定故障 / 工具调用：运行缩小范围的 `pnpm test:live`

## Live: Android 节点功能扫描

- 测试：`src/gateway/android-node.capabilities.live.test.ts`
- 脚本：`pnpm android:test:integration`
- 目标：调用已连接的 Android 节点当前 advertised 的**每条命令**并断言命令契约行为。
- 范围：
  - 预条件/手动设置（该套件不安装/运行/配对应用）。
  - 针对所选 Android 节点的逐命令 gateway `node.invoke` 验证。
- 所需的前置设置：
  - Android 应用已连接并配对至 Gateway。
  - 应用保持在前台。
  - 已授予您预期通过的功能的权限/捕获同意。
- 可选的目标覆盖：
  - `OPENCLAW_ANDROID_NODE_ID` 或 `OPENCLAW_ANDROID_NODE_NAME`。
  - `OPENCLAW_ANDROID_GATEWAY_URL` / `OPENCLAW_ANDROID_GATEWAY_TOKEN` / `OPENCLAW_ANDROID_GATEWAY_PASSWORD`。
- 完整的 Android 设置详情：[Android App](/zh/platforms/android)

## Live: 模型冒烟测试 (配置密钥)

Live 测试分为两层，以便我们可以隔离故障：

- “直接模型”告诉我们提供商/模型是否可以使用给定密钥进行回答。
- “Gateway(网关) 冒烟测试”告诉我们完整的 gateway+agent 管道是否适用于该模型（会话、历史记录、工具、沙盒策略等）。

### 第一层：直接模型补全（无 Gateway）

- 测试：`src/agents/models.profiles.live.test.ts`
- 目标：
  - 枚举已发现的模型
  - 使用 `getApiKeyForModel` 选择您拥有凭据的模型
  - 为每个模型运行一个小型补全（并在需要时运行定向回归测试）
- 如何启用：
  - `pnpm test:live`（如果直接调用 Vitest，则使用 `OPENCLAW_LIVE_TEST=1`）
- 设置 `OPENCLAW_LIVE_MODELS=modern`（或 `all`，modern 的别名）以实际运行此套件；否则它会跳过，以保持 `pnpm test:live` 专注于 Gateway(网关) 冒烟测试
- 如何选择模型：
  - `OPENCLAW_LIVE_MODELS=modern` 运行现代化允许列表（Opus/Sonnet 4.6+、GPT-5.x + Codex、Gemini 3、GLM 4.7、MiniMax M2.7、Grok 4）
  - `OPENCLAW_LIVE_MODELS=all` 是现代化允许列表的别名
  - 或 `OPENCLAW_LIVE_MODELS="openai/gpt-5.4,anthropic/claude-opus-4-6,..."`（逗号分隔的允许列表）
  - Modern/all 扫描默认为经过精选的高信号上限；设置 `OPENCLAW_LIVE_MAX_MODELS=0` 以进行详尽的 modern 扫描，或设置正数以使用更小的上限。
- 如何选择提供商：
  - `OPENCLAW_LIVE_PROVIDERS="google,google-antigravity,google-gemini-cli"`（逗号分隔的允许列表）
- 密钥来源：
  - 默认：profile store 和 env 回退
  - 设置 `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` 以仅强制使用 **profile store**
- 存在原因：
  - 将“提供商 API 损坏 / 密钥无效”与“Gateway(网关) 代理管道损坏”区分开来
  - 包含小型、孤立的回归测试（例如：OpenAI Responses/Codex Responses 推理回放 + 工具调用流程）

### 第 2 层：Gateway(网关) + 开发代理冒烟测试（"@openclaw" 实际做的事情）

- 测试：`src/gateway/gateway-models.profiles.live.test.ts`
- 目标：
  - 启动进程内 Gateway(网关)
  - 创建/修补 `agent:dev:*` 会话（每次运行的模型覆盖）
  - 迭代带密钥的模型并断言：
    - “有意义”的响应（无工具）
    - 真实的工具调用有效（读取探测）
    - 可选的额外工具探测（exec+read 探测）
    - OpenAI 回归路径（仅工具调用 → 后续跟进）保持正常工作
- 探测详情（以便您快速解释失败原因）：
  - `read` 探测：测试在工作区中写入一个 nonce 文件，并要求代理 `read` 读取它并将 nonce 回显回来。
  - `exec+read` 探测：测试要求代理 `exec` 写入一个 nonce 到临时文件，然后 `read` 读回。
  - 图像探测：测试附加一个生成的 PNG（cat + 随机代码），并期望模型返回 `cat <CODE>`。
  - 实现参考：`src/gateway/gateway-models.profiles.live.test.ts` 和 `src/gateway/live-image-probe.ts`。
- 如何启用：
  - `pnpm test:live`（如果直接调用 Vitest，则为 `OPENCLAW_LIVE_TEST=1`）
- 如何选择模型：
  - 默认：现代允许列表（Opus/Sonnet 4.6+、GPT-5.x + Codex、Gemini 3、GLM 4.7、MiniMax M2.7、Grok 4）
  - `OPENCLAW_LIVE_GATEWAY_MODELS=all` 是现代允许列表的别名
  - 或者设置 `OPENCLAW_LIVE_GATEWAY_MODELS="provider/model"`（或逗号分隔列表）以缩小范围
  - 现代/所有网关扫描默认为经过策划的高信号上限；设置 `OPENCLAW_LIVE_GATEWAY_MAX_MODELS=0` 以进行全面现代扫描，或设置一个正数以使用较小的上限。
- 如何选择提供商（避免“OpenRouter 万物”）：
  - `OPENCLAW_LIVE_GATEWAY_PROVIDERS="google,google-antigravity,google-gemini-cli,openai,anthropic,zai,minimax"`（逗号允许列表）
- 在此实时测试中，工具 + 图像探针始终开启：
  - `read` 探针 + `exec+read` 探针（工具压力测试）
  - 当模型宣称支持图像输入时，运行图像探针
  - 流程（高级）：
    - 测试生成一个带有“CAT” + 随机代码的微型 PNG（`src/gateway/live-image-probe.ts`）
    - 通过 `agent` `attachments: [{ mimeType: "image/png", content: "<base64>" }]` 发送它
    - Gateway(网关) 将附件解析为 `images[]`（`src/gateway/server-methods/agent.ts` + `src/gateway/chat-attachments.ts`）
    - 嵌入式代理向模型转发多模态用户消息
    - 断言：回复包含 `cat` + 代码（OCR 容差：允许轻微错误）

提示：要查看您可以在机器上测试的内容（以及确切的 `provider/model` ID），请运行：

```bash
openclaw models list
openclaw models list --json
```

## 实时：CLI 后端冒烟测试（Claude、Codex、Gemini 或其他本地 CLI）

- 测试：`src/gateway/gateway-cli-backend.live.test.ts`
- 目标：使用本地 Gateway(网关) 后端验证 CLI + 代理管道，而不触及您的默认配置。
- 特定于后端的冒烟测试默认值与拥有扩展的 `cli-backend.ts` 定义共存。
- 启用：
  - `pnpm test:live`（如果直接调用 Vitest，则为 `OPENCLAW_LIVE_TEST=1`）
  - `OPENCLAW_LIVE_CLI_BACKEND=1`
- 默认值：
  - 默认提供商/模型：`claude-cli/claude-sonnet-4-6`
  - 命令/参数/图像行为来自拥有 CLI 后端插件的元数据。
- 覆盖（可选）：
  - `OPENCLAW_LIVE_CLI_BACKEND_MODEL="codex-cli/gpt-5.4"`
  - `OPENCLAW_LIVE_CLI_BACKEND_COMMAND="/full/path/to/codex"`
  - `OPENCLAW_LIVE_CLI_BACKEND_ARGS='["exec","--json","--color","never","--sandbox","read-only","--skip-git-repo-check"]'`
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_PROBE=1` 用于发送真实图片附件（路径会被注入到提示词中）。
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_ARG="--image"` 用于将图片文件路径作为 CLI 参数传递，而不是通过提示词注入。
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_MODE="repeat"`（或 `"list"`）用于在设置了 `IMAGE_ARG` 时控制如何传递图片参数。
  - `OPENCLAW_LIVE_CLI_BACKEND_RESUME_PROBE=1` 用于发送第二轮对话并验证恢复流程。
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

注意事项：

- Docker 运行器位于 `scripts/test-live-cli-backend-docker.sh`。
- 它以非 root 用户 `node` 的身份，在仓库 CLI 镜像内部运行 live Docker-backend 冒烟测试。
- 它从所属扩展解析 CLI 冒烟测试元数据，然后将匹配的 Linux CLI 包（`@anthropic-ai/claude-code`、`@openai/codex` 或 `@google/gemini-cli`）安装到位于 `OPENCLAW_DOCKER_CLI_TOOLS_DIR`（默认：`~/.cache/openclaw/docker-cli-tools`）的可写缓存前缀中。
- `pnpm test:docker:live-cli-backend:claude-subscription` 需要通过带有 `claudeAiOauth.subscriptionType` 的 `~/.claude/.credentials.json` 或来自 `claude setup-token` 的 `CLAUDE_CODE_OAUTH_TOKEN` 进行便携式 Claude Code 订阅 OAuth。它首先证明 Docker 中的直接 `claude -p`，然后运行两轮 Gateway(网关) CLI-backend，不保留 Anthropic API 密钥环境变量。此订阅通道默认禁用 Claude MCP/工具和图像探测，因为 Claude 目前通过额外使用计费而非普通订阅计划限制来路由第三方应用使用。
- live CLI-backend 冒烟测试现在对 Claude、Codex 和 Gemini 执行相同的端到端流程：文本轮次、图像分类轮次，然后通过 gateway CLI 验证 MCP `cron` 工具调用。
- Claude 的默认冒烟测试还会将会话从 Sonnet 打补丁到 Opus，并验证恢复的会话仍然记得之前的笔记。

## Live: ACP bind 冒烟测试 (`/acp spawn ... --bind here`)

- 测试：`src/gateway/gateway-acp-bind.live.test.ts`
- 目标：使用实时 ACP 代理验证真实的 ACP 对话绑定流程：
  - 发送 `/acp spawn <agent> --bind here`
  - 原地绑定一个合成消息渠道对话
  - 在该同一对话中发送正常的后续消息
  - 验证后续消息落入已绑定的 ACP 会话记录中
- 启用：
  - `pnpm test:live src/gateway/gateway-acp-bind.live.test.ts`
  - `OPENCLAW_LIVE_ACP_BIND=1`
- 默认值：
  - Docker 中的 ACP 代理：`claude,codex,gemini`
  - 用于直接 `pnpm test:live ...` 的 ACP 代理：`claude`
  - 合成渠道：Slack 私信风格的对话上下文
  - ACP 后端：`acpx`
- 覆盖：
  - `OPENCLAW_LIVE_ACP_BIND_AGENT=claude`
  - `OPENCLAW_LIVE_ACP_BIND_AGENT=codex`
  - `OPENCLAW_LIVE_ACP_BIND_AGENT=gemini`
  - `OPENCLAW_LIVE_ACP_BIND_AGENTS=claude,codex,gemini`
  - `OPENCLAW_LIVE_ACP_BIND_AGENT_COMMAND='npx -y @agentclientprotocol/claude-agent-acp@<version>'`
- 说明：
  - 此泳道使用网关 `chat.send` 表面以及仅限管理员使用的合成来源路由字段，以便测试可以附加消息渠道上下文而无需假装进行外部传递。
  - 当未设置 `OPENCLAW_LIVE_ACP_BIND_AGENT_COMMAND` 时，测试使用嵌入式 `acpx` 插件的内置代理注册表来获取所选的 ACP harness 代理。

示例：

```bash
OPENCLAW_LIVE_ACP_BIND=1 \
  OPENCLAW_LIVE_ACP_BIND_AGENT=claude \
  pnpm test:live src/gateway/gateway-acp-bind.live.test.ts
```

Docker 配方：

```bash
pnpm test:docker:live-acp-bind
```

单代理 Docker 配方：

```bash
pnpm test:docker:live-acp-bind:claude
pnpm test:docker:live-acp-bind:codex
pnpm test:docker:live-acp-bind:gemini
```

Docker 说明：

- Docker 运行器位于 `scripts/test-live-acp-bind-docker.sh`。
- 默认情况下，它会按顺序对所有支持的实时 CLI 代理运行 ACP bind smoke 测试：`claude`、`codex`，然后是 `gemini`。
- 使用 `OPENCLAW_LIVE_ACP_BIND_AGENTS=claude`、`OPENCLAW_LIVE_ACP_BIND_AGENTS=codex` 或 `OPENCLAW_LIVE_ACP_BIND_AGENTS=gemini` 来缩小矩阵范围。
- 它引入 `~/.profile`，将匹配的 CLI 认证材料暂存到容器中，将 `acpx` 安装到可写的 npm 前缀中，然后如果缺少请求的实时 CLI（`@anthropic-ai/claude-code`、`@openai/codex` 或 `@google/gemini-cli`）则进行安装。
- 在 Docker 内部，运行器设置 `OPENCLAW_LIVE_ACP_BIND_ACPX_COMMAND=$HOME/.npm-global/bin/acpx`，以便 acpx 保持来自所引入配置文件的提供商环境变量对子 harness CLI 可用。

## Live: Codex app-server harness smoke

- 目标：通过正常的网关 `agent` 方法验证插件拥有的 Codex 测试线束：
  - 加载打包的 `codex` 插件
  - 选择 `OPENCLAW_AGENT_RUNTIME=codex`
  - 向 `codex/gpt-5.4` 发送第一个网关代理轮次
  - 向同一个 OpenClaw 会话发送第二个轮次，并验证应用服务器线程可以恢复
  - 通过相同的网关命令路径运行 `/codex status` 和 `/codex models`
- 测试： `src/gateway/gateway-codex-harness.live.test.ts`
- 启用： `OPENCLAW_LIVE_CODEX_HARNESS=1`
- 默认模型： `codex/gpt-5.4`
- 可选图像探测： `OPENCLAW_LIVE_CODEX_HARNESS_IMAGE_PROBE=1`
- 可选 MCP/工具探测： `OPENCLAW_LIVE_CODEX_HARNESS_MCP_PROBE=1`
- 冒烟测试设置了 `OPENCLAW_AGENT_HARNESS_FALLBACK=none`，因此损坏的 Codex 测试线束无法通过静默回退到 PI 来通过测试。
- 身份验证：来自 shell/profile 的 `OPENAI_API_KEY`，加上可选复制的 `~/.codex/auth.json` 和 `~/.codex/config.toml`

本地配方：

```bash
source ~/.profile
OPENCLAW_LIVE_CODEX_HARNESS=1 \
  OPENCLAW_LIVE_CODEX_HARNESS_IMAGE_PROBE=1 \
  OPENCLAW_LIVE_CODEX_HARNESS_MCP_PROBE=1 \
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
- 它获取挂载的 `~/.profile`，传递 `OPENAI_API_KEY`，如果存在则复制 Codex CLI 身份验证文件，将 `@openai/codex` 安装到可写的挂载 npm 前缀中，暂存源树，然后仅运行 Codex-harness 实时测试。
- Docker 默认启用图像和 MCP/工具探测。当您需要更窄的调试运行时，请设置 `OPENCLAW_LIVE_CODEX_HARNESS_IMAGE_PROBE=0` 或 `OPENCLAW_LIVE_CODEX_HARNESS_MCP_PROBE=0`。
- Docker 还导出 `OPENCLAW_AGENT_HARNESS_FALLBACK=none`，匹配实时测试配置，因此 `openai-codex/*` 或 PI 回退无法掩盖 Codex 测试线束的回归。

### 推荐的实时配方

狭窄、明确的允许列表是最快且最不不稳定的：

- 单个模型，直接（无网关）：
  - `OPENCLAW_LIVE_MODELS="openai/gpt-5.4" pnpm test:live src/agents/models.profiles.live.test.ts`

- 单个模型，网关冒烟测试：
  - `OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.4" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

- 跨多个提供商的工具调用：
  - `OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.4,anthropic/claude-opus-4-6,google/gemini-3-flash-preview,zai/glm-4.7,minimax/MiniMax-M2.7" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

- Google 重点（Gemini API 密钥 + Antigravity）：
  - Gemini (API 密钥)： `OPENCLAW_LIVE_GATEWAY_MODELS="google/gemini-3-flash-preview" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`
  - Antigravity (OAuth)： `OPENCLAW_LIVE_GATEWAY_MODELS="google-antigravity/claude-opus-4-6-thinking,google-antigravity/gemini-3-pro-high" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

说明：

- `google/...` 使用 Gemini API（API 密钥）。
- `google-antigravity/...` 使用 Antigravity OAuth 桥接（Cloud Code Assist 风格的代理端点）。
- `google-gemini-cli/...` 使用您机器上的本地 Gemini CLI（独立的身份验证 + 工具怪癖）。
- Gemini API 与 Gemini CLI：
  - API：OpenClaw 通过 HTTP 调用 Google 托管的 Gemini API（API 密钥 / 配置文件身份验证）；这是大多数用户所说的“Gemini”的含义。
  - CLI：OpenClaw 调用本地 `gemini` 二进制文件；它有自己的身份验证，并且行为可能有所不同（流式传输/工具支持/版本偏差）。

## Live: 模型矩阵（我们要覆盖的内容）

没有固定的“CI 模型列表”（live 是可选加入的），但这些是建议在拥有密钥的开发机器上定期覆盖的模型。

### Modern smoke set（工具调用 + 图像）

这是我们期望保持正常工作的“通用模型”运行：

- OpenAI（非 Codex）：`openai/gpt-5.4`（可选：`openai/gpt-5.4-mini`）
- OpenAI Codex：`openai-codex/gpt-5.4`
- Anthropic：`anthropic/claude-opus-4-6`（或 `anthropic/claude-sonnet-4-6`）
- Google (Gemini API)：`google/gemini-3.1-pro-preview` 和 `google/gemini-3-flash-preview`（避免使用较旧的 Gemini 2.x 模型）
- Google (Antigravity)：`google-antigravity/claude-opus-4-6-thinking` 和 `google-antigravity/gemini-3-flash`
- Z.AI (GLM)：`zai/glm-4.7`
- MiniMax：`minimax/MiniMax-M2.7`

运行带有工具 + 图像的 gateway smoke：
`OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.4,openai-codex/gpt-5.4,anthropic/claude-opus-4-6,google/gemini-3.1-pro-preview,google/gemini-3-flash-preview,google-antigravity/claude-opus-4-6-thinking,google-antigravity/gemini-3-flash,zai/glm-4.7,minimax/MiniMax-M2.7" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

### Baseline：工具调用（读取 + 可选执行）

每个提供商系列至少选择一个：

- OpenAI：`openai/gpt-5.4`（或 `openai/gpt-5.4-mini`）
- Anthropic：`anthropic/claude-opus-4-6`（或 `anthropic/claude-sonnet-4-6`）
- Google：`google/gemini-3-flash-preview`（或 `google/gemini-3.1-pro-preview`）
- Z.AI (GLM)：`zai/glm-4.7`
- MiniMax：`minimax/MiniMax-M2.7`

可选的额外覆盖（最好有）：

- xAI：`xai/grok-4`（或最新可用版本）
- Mistral：`mistral/`……（选择一个已启用的支持“工具”的模型）
- Cerebras：`cerebras/`……（如果您有访问权限）
- LM Studio: `lmstudio/`… (本地；工具调用取决于 API 模式)

### Vision: 图像发送（附件 → 多模态消息）

在 `OPENCLAW_LIVE_GATEWAY_MODELS` 中至少包含一个支持图像的模型（Claude/Gemini/OpenAI 支持视觉的变体等），以测试图像探针。

### 聚合器 / 备选网关

如果您启用了密钥，我们还支持通过以下方式进行测试：

- OpenRouter: `openrouter/...` (数百个模型；使用 `openclaw models scan` 查找支持工具和图像的候选模型)
- OpenCode: `opencode/...` 用于 Zen，`opencode-go/...` 用于 Go (通过 `OPENCODE_API_KEY` / `OPENCODE_ZEN_API_KEY` 进行身份验证)

更多您可以包含在实时矩阵中的提供商（如果您有凭证/配置）：

- 内置: `openai`, `openai-codex`, `anthropic`, `google`, `google-vertex`, `google-antigravity`, `google-gemini-cli`, `zai`, `openrouter`, `opencode`, `opencode-go`, `xai`, `groq`, `cerebras`, `mistral`, `github-copilot`
- 通过 `models.providers` (自定义端点): `minimax` (云/API)，以及任何兼容 OpenAI/Anthropic 的代理 (LM Studio, vLLM, LiteLLM 等)

提示：不要尝试在文档中硬编码“所有模型”。权威列表取决于 `discoverModels(...)` 在您的机器上返回的内容 + 可用的密钥。

## 凭证（切勿提交）

实时测试以与 CLI 相同的方式发现凭证。实际影响如下：

- 如果 CLI 可以正常工作，实时测试应该能找到相同的密钥。
- 如果实时测试提示“无凭证”，请按照调试 `openclaw models list` / 模型选择的方式相同进行调试。

- 按代理的身份验证配置文件: `~/.openclaw/agents/<agentId>/agent/auth-profiles.json` (这就是实时测试中“配置文件密钥”的含义)
- 配置: `~/.openclaw/openclaw.json` (或 `OPENCLAW_CONFIG_PATH`)
- 旧版状态目录：`~/.openclaw/credentials/`（如果存在，会将其复制到暂存的实时主目录中，但不会复制到主配置文件密钥存储）
- 实时本地运行默认会将活动配置、每个代理的 `auth-profiles.json` 文件、旧版 `credentials/` 以及支持的外部 CLI 认证目录复制到临时测试主目录中；暂存的实时主目录会跳过 `workspace/` 和 `sandboxes/`，并且 `agents.*.workspace` / `agentDir` 路径覆盖项会被剥离，以便探测器不会干扰您真实的主机工作区。

如果您想依赖环境密钥（例如在您的 `~/.profile` 中导出的密钥），请在 `source ~/.profile` 之后运行本地测试，或使用下面的 Docker 运行器（它们可以将 `~/.profile` 挂载到容器中）。

## Deepgram 实时（音频转录）

- 测试：`src/media-understanding/providers/deepgram/audio.live.test.ts`
- 启用：`DEEPGRAM_API_KEY=... DEEPGRAM_LIVE_TEST=1 pnpm test:live src/media-understanding/providers/deepgram/audio.live.test.ts`

## BytePlus 编码计划实时

- 测试：`src/agents/byteplus.live.test.ts`
- 启用：`BYTEPLUS_API_KEY=... BYTEPLUS_LIVE_TEST=1 pnpm test:live src/agents/byteplus.live.test.ts`
- 可选模型覆盖：`BYTEPLUS_CODING_MODEL=ark-code-latest`

## ComfyUI 工作流媒体实时

- 测试：`extensions/comfy/comfy.live.test.ts`
- 启用：`OPENCLAW_LIVE_TEST=1 COMFY_LIVE_TEST=1 pnpm test:live -- extensions/comfy/comfy.live.test.ts`
- 范围：
  - 测试捆绑的 comfy 图片、视频和 `music_generate` 路径
  - 除非配置了 `models.providers.comfy.<capability>`，否则跳过每项功能
  - 在更改 comfy 工作流提交、轮询、下载或插件注册后很有用

## 图像生成实时

- 测试：`src/image-generation/runtime.live.test.ts`
- 命令：`pnpm test:live src/image-generation/runtime.live.test.ts`
- 工具：`pnpm test:live:media image`
- 范围：
  - 枚举每个已注册的图像生成提供商插件
  - 在探测之前从您的登录 Shell 加载缺失的提供商环境变量（`~/.profile`）
  - 默认优先使用实时/环境 API 密钥而不是存储的认证配置文件，因此 `auth-profiles.json` 中的陈旧测试密钥不会掩盖真实的 Shell 凭据
  - 跳过没有可用认证/配置文件/模型的提供商
  - 通过共享运行时功能运行标准图像生成变体：
    - `google:flash-generate`
    - `google:pro-generate`
    - `google:pro-edit`
    - `openai:default-generate`
- 当前覆盖的捆绑提供商：
  - `openai`
  - `google`
- 可选缩小范围：
  - `OPENCLAW_LIVE_IMAGE_GENERATION_PROVIDERS="openai,google"`
  - `OPENCLAW_LIVE_IMAGE_GENERATION_MODELS="openai/gpt-image-1,google/gemini-3.1-flash-image-preview"`
  - `OPENCLAW_LIVE_IMAGE_GENERATION_CASES="google:flash-generate,google:pro-edit"`
- 可选认证行为：
  - `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` 强制使用配置文件存储认证并忽略仅限环境变量的覆盖

## 音乐生成实时测试

- 测试： `extensions/music-generation-providers.live.test.ts`
- 启用： `OPENCLAW_LIVE_TEST=1 pnpm test:live -- extensions/music-generation-providers.live.test.ts`
- 测试工具： `pnpm test:live:media music`
- 范围：
  - 演练共享捆绑音乐生成提供商路径
  - 当前覆盖 Google 和 MiniMax
  - 在探测之前从您的登录 Shell 加载提供商环境变量 (`~/.profile`)
  - 默认优先使用实时/环境 API 密钥而非存储的认证配置文件，因此 `auth-profiles.json` 中的过时测试密钥不会掩盖真实的 Shell 凭证
  - 跳过没有可用认证/配置文件/模型的提供商
  - 如果可用，运行两种声明的运行时模式：
    - `generate` 配合仅提示词输入
    - 当提供商声明 `capabilities.edit.enabled` 时运行 `edit`
  - 当前共享通道覆盖范围：
    - `google`: `generate`, `edit`
    - `minimax`: `generate`
    - `comfy`: 单独的 Comfy 实时文件，不是此共享扫描
- 可选缩小范围：
  - `OPENCLAW_LIVE_MUSIC_GENERATION_PROVIDERS="google,minimax"`
  - `OPENCLAW_LIVE_MUSIC_GENERATION_MODELS="google/lyria-3-clip-preview,minimax/music-2.5+"`
- 可选认证行为：
  - `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` 强制使用配置文件存储认证并忽略仅限环境变量的覆盖

## 视频生成实时测试

- 测试： `extensions/video-generation-providers.live.test.ts`
- 启用： `OPENCLAW_LIVE_TEST=1 pnpm test:live -- extensions/video-generation-providers.live.test.ts`
- 测试工具： `pnpm test:live:media video`
- 范围：
  - 演练共享捆绑视频生成提供商路径
  - 默认为发布安全的冒烟路径：非 FAL 提供商，每个提供商一个文生视频请求，一秒龙虾提示词，以及来自 `OPENCLAW_LIVE_VIDEO_GENERATION_TIMEOUT_MS` 的每个提供商操作上限 (默认为 `180000`)
  - 默认跳过 FAL，因为提供商端的队列延迟可能会占据发布时间的主要部分；传递 `--video-providers fal` 或 `OPENCLAW_LIVE_VIDEO_GENERATION_PROVIDERS="fal"` 以显式运行它
  - 在探测之前从您的登录 shell (`~/.profile`) 加载提供商环境变量
  - 默认优先使用实时/环境的 API 密钥而非存储的身份验证配置文件，因此 `auth-profiles.json` 中过时的测试密钥不会掩盖真实的 shell 凭据
  - 跳过没有可用身份验证/配置文件/模型的提供商
  - 默认仅运行 `generate`
  - 设置 `OPENCLAW_LIVE_VIDEO_GENERATION_FULL_MODES=1` 以在可用时同时运行声明的转换模式：
    - 当提供商声明 `capabilities.imageToVideo.enabled` 且选定的提供商/模型在共享扫描中接受缓冲区支持的本地图像输入时，`imageToVideo`
    - 当提供商声明 `capabilities.videoToVideo.enabled` 且选定的提供商/模型在共享扫描中接受缓冲区支持的本地视频输入时，`videoToVideo`
  - 当前共享扫描中已声明但跳过的 `imageToVideo` 提供商：
    - `vydra`，因为捆绑的 `veo3` 仅支持文本，而捆绑的 `kling` 需要远程图像 URL
  - 特定于提供商的 Vydra 覆盖范围：
    - `OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_VYDRA_VIDEO=1 pnpm test:live -- extensions/vydra/vydra.live.test.ts`
    - 该文件默认运行 `veo3` 文本生成视频，外加一条使用远程图像 URL 固件的 `kling` 通道
  - 当前 `videoToVideo` 实时覆盖范围：
    - 仅当选定的模型是 `runway/gen4_aleph` 时 `runway`
  - 当前共享扫描中已声明但跳过的 `videoToVideo` 提供商：
    - `alibaba`、`qwen`、`xai`，因为这些路径当前需要远程 `http(s)` / MP4 参考 URL
    - `google`，因为当前共享的 Gemini/Veo 通道使用本地缓冲区支持的输入，而共享扫描不接受该路径
    - `openai`，因为当前共享通道缺乏特定于组织的视频重绘/混音访问保证
- 可选的缩小范围：
  - `OPENCLAW_LIVE_VIDEO_GENERATION_PROVIDERS="google,openai,runway"`
  - `OPENCLAW_LIVE_VIDEO_GENERATION_MODELS="google/veo-3.1-fast-generate-preview,openai/sora-2,runway/gen4_aleph"`
  - `OPENCLAW_LIVE_VIDEO_GENERATION_SKIP_PROVIDERS=""` 用于在默认扫描中包含每个提供商，包括 FAL
  - `OPENCLAW_LIVE_VIDEO_GENERATION_TIMEOUT_MS=60000` 用于降低每个提供商的操作上限，以进行激进的冒烟测试运行
- 可选的认证行为：
  - `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` 用于强制使用配置文件存储认证，并忽略仅限环境变量的覆盖设置

## 媒体实时测试工具

- 命令：`pnpm test:live:media`
- 目的：
  - 通过一个仓库原生入口运行共享的图像、音乐和视频实时测试套件
  - 从 `~/.profile` 自动加载缺失的提供商环境变量
  - 默认情况下，自动将每个套件的范围缩小到当前具有可用认证的提供商
  - 复用 `scripts/test-live.mjs`，因此心跳和静默模式行为保持一致
- 示例：
  - `pnpm test:live:media`
  - `pnpm test:live:media image video --providers openai,google,minimax`
  - `pnpm test:live:media video --video-providers openai,runway --all-providers`
  - `pnpm test:live:media music --quiet`

## Docker 运行程序（可选的“适用于 Linux”检查）

这些 Docker 运行程序分为两类：

- 实时模型运行程序：`test:docker:live-models` 和 `test:docker:live-gateway` 仅在仓库 Docker 镜像（`src/agents/models.profiles.live.test.ts` 和 `src/gateway/gateway-models.profiles.live.test.ts`）内运行其匹配的配置文件键实时文件，并挂载您的本地配置目录和工作区（如果挂载了 `~/.profile` 则也会获取）。匹配的本地入口点是 `test:live:models-profiles` 和 `test:live:gateway-profiles`。
- Docker 实时运行程序默认使用较小的冒烟测试上限，以便完整的 Docker 扫描保持实用：
  `test:docker:live-models` 默认为 `OPENCLAW_LIVE_MAX_MODELS=12`，且
  `test:docker:live-gateway` 默认为 `OPENCLAW_LIVE_GATEWAY_SMOKE=1`、
  `OPENCLAW_LIVE_GATEWAY_MAX_MODELS=8`、
  `OPENCLAW_LIVE_GATEWAY_STEP_TIMEOUT_MS=45000` 和
  `OPENCLAW_LIVE_GATEWAY_MODEL_TIMEOUT_MS=90000`。当您
  明确需要进行更大的全面扫描时，请覆盖这些环境变量。
- `test:docker:all` 通过 `test:docker:live-build` 构建实时 Docker 镜像一次，然后将其复用于两个 Docker 实时通道。
- 容器冒烟测试运行器：`test:docker:openwebui`、`test:docker:onboard`、`test:docker:gateway-network`、`test:docker:mcp-channels` 和 `test:docker:plugins` 会启动一个或多个真实容器并验证更高级别的集成路径。

实盘 Docker 的 Docker 运行器还仅绑定挂载所需的 CLI 认证主目录（或者在运行范围未缩小时挂载所有支持的目录），然后在运行前将其复制到容器主目录，以便外部 CLI OAuth 可以刷新令牌而无需更改主机认证存储：

- 直连模型：`pnpm test:docker:live-models`（脚本：`scripts/test-live-models-docker.sh`）
- ACP 绑定冒烟测试：`pnpm test:docker:live-acp-bind`（脚本：`scripts/test-live-acp-bind-docker.sh`）
- CLI 后端冒烟测试：`pnpm test:docker:live-cli-backend`（脚本：`scripts/test-live-cli-backend-docker.sh`）
- Codex 应用服务器线束冒烟测试：`pnpm test:docker:live-codex-harness`（脚本：`scripts/test-live-codex-harness-docker.sh`）
- Gateway(网关) + 开发代理：`pnpm test:docker:live-gateway`（脚本：`scripts/test-live-gateway-models-docker.sh`）
- Open WebUI 实盘冒烟测试：`pnpm test:docker:openwebui`（脚本：`scripts/e2e/openwebui-docker.sh`）
- 新手向导（TTY，完整脚手架）：`pnpm test:docker:onboard`（脚本：`scripts/e2e/onboard-docker.sh`）
- Gateway(网关) 网络（两个容器，WS 认证 + 健康检查）：`pnpm test:docker:gateway-network`（脚本：`scripts/e2e/gateway-network-docker.sh`）
- MCP 渠道桥接（种子 Gateway(网关) + stdio 桥接 + 原始 Claude 通知帧冒烟测试）：`pnpm test:docker:mcp-channels`（脚本：`scripts/e2e/mcp-channels-docker.sh`）
- 插件（安装冒烟测试 + `/plugin` 别名 + Claude-bundle 重启语义）：`pnpm test:docker:plugins`（脚本：`scripts/e2e/plugins-docker.sh`）

live-模型 Docker 运行器还会将当前检出以只读方式绑定挂载，并将其暂存到容器内的临时工作目录中。这既保持了运行时映像的精简，又能针对您的本地源码/配置运行 Vitest。暂存步骤会跳过大型仅限本地的缓存和应用程序构建输出，例如 `.pnpm-store`、`.worktrees`、`__openclaw_vitest__` 以及应用程序本地的 `.build` 或 Gradle 输出目录，因此 Docker 实时运行不会花费数分钟来复制特定于机器的构件。它们还设置了 `OPENCLAW_SKIP_CHANNELS=1`，这样 gateway 实时探测就不会在容器内启动真正的 Telegram/Discord/etc. 渠道工作进程。`test:docker:live-models` 仍会运行 `pnpm test:live`，因此当您需要从该 Docker 通道缩小或排除 gateway 实时覆盖范围时，也要传递 `OPENCLAW_LIVE_GATEWAY_*`。`test:docker:openwebui` 是更高级别的兼容性冒烟测试：它启动一个启用了 OpenClaw 兼容 HTTP 端点的 OpenAI gateway 容器，针对该 gateway 启动一个固定的 Open WebUI 容器，通过 Open WebUI 登录，验证 `/api/models` 暴露了 `openclaw/default`，然后通过 Open WebUI 的 `/api/chat/completions` 代理发送真正的聊天请求。首次运行可能会明显较慢，因为 Docker 可能需要拉取 Open WebUI 映像，且 Open WebUI 可能需要完成其自身的冷启动设置。该通道需要一个可用的实时模型密钥，而 `OPENCLAW_PROFILE_FILE`（默认为 `~/.profile`）是在 Telegram 化运行中提供它的主要方式。成功的运行会打印出一小段 JSON 载荷，例如 `{ "ok": true, "模型": "openclaw/default", ... }`。`test:docker:mcp-channels` 是有意确定性的，不需要真正的 Discord、iMessage 或 Gateway(网关) 账户。它会启动一个已设定种子的 Gateway(网关) 容器，启动第二个生成 `openclaw mcp serve` 的容器，然后通过真正的 stdio MCP 网桥验证路由对话发现、脚本读取、附件元数据、实时事件队列行为、出站发送路由以及 Claude 风格的渠道 + 权限通知。通知检查会直接检查原始 stdio MCP 帧，因此冒烟测试验证的是网桥实际发出的内容，而不仅仅是特定客户端 SDK 呈现的内容。

手动 ACP 自然语言线程冒烟测试（非 CI）：

- `bun scripts/dev/discord-acp-plain-language-smoke.ts --channel <discord-channel-id> ...`
- 保留此脚本用于回归/调试工作流。ACP 线程路由验证可能再次需要它，因此请勿删除。

有用的环境变量：

- `OPENCLAW_CONFIG_DIR=...`（默认值：`~/.openclaw`）挂载到 `/home/node/.openclaw`
- `OPENCLAW_WORKSPACE_DIR=...`（默认值：`~/.openclaw/workspace`）挂载到 `/home/node/.openclaw/workspace`
- `OPENCLAW_PROFILE_FILE=...`（默认值：`~/.profile`）挂载到 `/home/node/.profile` 并在运行测试之前 source
- `OPENCLAW_DOCKER_PROFILE_ENV_ONLY=1` 以仅验证从 `OPENCLAW_PROFILE_FILE` source 的环境变量，使用临时配置/工作区目录且不挂载外部 CLI 认证
- `OPENCLAW_DOCKER_CLI_TOOLS_DIR=...`（默认值：`~/.cache/openclaw/docker-cli-tools`）挂载到 `/home/node/.npm-global` 以用于 Docker 内缓存的 CLI 安装
- `$HOME` 下的外部 CLI 认证目录/文件以只读方式挂载到 `/host-auth...` 下，然后在测试开始前复制到 `/home/node/...` 中
  - 默认目录：`.minimax`
  - 默认文件：`~/.codex/auth.json`, `~/.codex/config.toml`, `.claude.json`, `~/.claude/.credentials.json`, `~/.claude/settings.json`, `~/.claude/settings.local.json`
  - 缩窄的提供商运行仅挂载从 `OPENCLAW_LIVE_PROVIDERS` / `OPENCLAW_LIVE_GATEWAY_PROVIDERS` 推断出的所需目录/文件
  - 使用 `OPENCLAW_DOCKER_AUTH_DIRS=all`、`OPENCLAW_DOCKER_AUTH_DIRS=none` 或逗号列表（如 `OPENCLAW_DOCKER_AUTH_DIRS=.claude,.codex`）手动覆盖
- `OPENCLAW_LIVE_GATEWAY_MODELS=...` / `OPENCLAW_LIVE_MODELS=...` 以缩小运行范围
- `OPENCLAW_LIVE_GATEWAY_PROVIDERS=...` / `OPENCLAW_LIVE_PROVIDERS=...` 以在容器内过滤提供商
- `OPENCLAW_SKIP_DOCKER_BUILD=1` 以重用现有的 `openclaw:local-live` 镜像，用于不需要重新构建的重新运行
- `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` 以确保凭据来自配置文件存储（而非环境变量）
- `OPENCLAW_OPENWEBUI_MODEL=...` 以选择网关为 Open WebUI 冒烟测试暴露的模型
- `OPENCLAW_OPENWEBUI_PROMPT=...` 用于覆盖 Open WebUI 烟雾测试使用的 nonce 检查提示
- `OPENWEBUI_IMAGE=...` 用于覆盖固定的 Open WebUI 镜像标签

## 文档完整性检查

在编辑文档后运行文档检查：`pnpm check:docs`。
当您还需要页面内标题检查时，运行完整的 Mintlify 锚点验证：`pnpm docs:check-links:anchors`。

## 离线回归测试（CI 安全）

这些是没有真实提供商的“真实流水线”回归测试：

- Gateway(网关) 工具调用（模拟 OpenAI，真实 Gateway + 代理循环）：`src/gateway/gateway.test.ts`（案例：“通过 Gateway 代理循环端到端运行模拟 OpenAI 工具调用”）
- Gateway(网关) 向导（WS `wizard.start`/`wizard.next`，写入配置 + 强制执行身份验证）：`src/gateway/gateway.test.ts`（案例：“通过 ws 运行向导并写入身份验证令牌配置”）

## 代理可靠性评估 (Skills)

我们已经有几个 CI 安全的测试，其行为类似于“代理可靠性评估”：

- 通过真实 Gateway(网关) + 代理循环进行的模拟工具调用（`src/gateway/gateway.test.ts`）。
- 验证会话(会话) 连线和配置效果的端到端向导流程（`src/gateway/gateway.test.ts`）。

Skills 仍然缺少的内容（参见 [Skills](/zh/tools/skills)）：

- **决策：** 当 Skills 在提示中列出时，代理是否选择正确的 Skill（或避免不相关的）？
- **合规性：** 代理是否在使用前读取 `SKILL.md` 并遵循所需的步骤/参数？
- **工作流契约：** 断言工具调用顺序、会话(会话) 历史记录延续和沙箱边界的多轮场景。

未来的评估应首先保持确定性：

- 使用模拟提供商的场景运行器，用于断言工具调用及其顺序、Skill 文件读取和会话(会话) 连线。
- 一小套专注于 Skills 的场景（使用与避免、门控、提示词注入）。
- 只有在 CI 安全的套件就位后，才进行可选的实时评估（选择性加入、环境控制）。

## 契约测试（插件和渠道形状）

契约测试验证每个已注册的插件和渠道是否符合其接口契约。它们遍历所有发现的插件并运行一系列形状和行为断言。默认的 `pnpm test` 单元泳道有意跳过这些共享接缝和冒烟文件；当你接触共享渠道或提供商接口时，请显式运行契约命令。

### 命令

- 所有契约：`pnpm test:contracts`
- 仅渠道契约：`pnpm test:contracts:channels`
- 仅提供商契约：`pnpm test:contracts:plugins`

### 渠道契约

位于 `src/channels/plugins/contracts/*.contract.test.ts`：

- **plugin** - 基本插件形状（id、名称、功能）
- **setup** - 设置向导契约
- **会话-binding** - 会话绑定行为
- **outbound-payload** - 消息负载结构
- **inbound** - 入站消息处理
- **actions** - 渠道操作处理程序
- **threading** - 线程 ID 处理
- **directory** - 目录/名册 API
- **group-policy** - 组策略执行

### 提供商状态契约

位于 `src/plugins/contracts/*.contract.test.ts`。

- **status** - 渠道状态探测
- **registry** - 插件注册表形状

### 提供商契约

位于 `src/plugins/contracts/*.contract.test.ts`：

- **auth** - 认证流程契约
- **auth-choice** - 认证选择/选项
- **catalog** - 模型目录 API
- **discovery** - 插件发现
- **loader** - 插件加载
- **runtime** - 提供商运行时
- **shape** - 插件形状/接口
- **wizard** - 设置向导

### 何时运行

- 更改 plugin-sdk 导出或子路径后
- 添加或修改渠道或提供商插件后
- 重构插件注册或发现后

契约测试在 CI 中运行，不需要真实的 API 密钥。

## 添加回归（指导）

当你在 Live 测试中修复了发现的提供商/模型问题时：

- 如果可能，请添加 CI 安全的回归测试（模拟/存根提供商，或捕获确切的请求形状转换）
- 如果它本质上仅限于 Live（速率限制、认证策略），请保持 Live 测试狭窄，并通过环境变量选择加入
- 优先针对捕获错误的最小层：
  - 提供商请求转换/重放错误 → 直接模型测试
  - 网关会话/历史/工具管道错误 → 网关 Live 冒烟测试或 CI 安全的网关模拟测试
- SecretRef 遍历护栏：
  - `src/secrets/exec-secret-ref-id-parity.test.ts` 从注册表元数据 (`listSecretTargetRegistryEntries()`) 中为每个 SecretRef 类派生一个采样目标，然后断言遍历片段执行 ID 被拒绝。
  - 如果您在 `src/secrets/target-registry-data.ts` 中添加了新的 `includeInPlan` SecretRef 目标系列，请在该测试中更新 `classifyTargetClass`。该测试会对未分类的目标 ID 故意导致失败，以便新类别不会被静默跳过。
