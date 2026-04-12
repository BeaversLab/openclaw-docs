---
summary: "测试套件：单元/e2e/live 套件、Docker 运行器以及每个测试涵盖的内容"
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

- 完整门控（推送前预期运行）：`pnpm build && pnpm check && pnpm test`
- 在配置较高的机器上更快的本地完整套件运行：`pnpm test:max`
- 直接 Vitest 监视循环：`pnpm test:watch`
- 直接文件定位现在也会路由扩展/渠道路径：`pnpm test extensions/discord/src/monitor/message-handler.preflight.test.ts`
- 当您正在针对单个失败进行迭代时，请优先使用定向运行。
- 基于 Docker 的 QA 站点：`pnpm qa:lab:up`
- 基于 Linux VM 的 QA 通道：`pnpm openclaw qa suite --runner multipass --scenario channel-chat-baseline`

当您接触测试或需要额外的信心时：

- 覆盖率门控：`pnpm test:coverage`
- E2E 套件：`pnpm test:e2e`

调试真实提供商/模型时（需要真实凭证）：

- Live 套件（模型 + 网关工具/镜像探测）：`pnpm test:live`
- 静默定位单个 live 文件：`pnpm test:live -- src/agents/models.profiles.live.test.ts`

提示：当您只需要一个失败用例时，请优先使用下面描述的 allowlist 环境变量来缩小 live 测试范围。

## QA 专用运行器

当您需要 QA 实验室的真实感时，这些命令与主测试套件并存：

- `pnpm openclaw qa suite`
  - 直接在主机上运行基于仓库的 QA 场景。
  - 默认情况下，使用隔离的网关工作进程并行运行多个选定的场景，最多 64 个工作进程或选定的场景数量。使用
    `--concurrency <count>` 调整工作进程数量，或使用 `--concurrency 1` 进行
    旧的串行通道运行。
- `pnpm openclaw qa suite --runner multipass`
  - 在一次性 Multipass Linux VM 内运行相同的 QA 套件。
  - 保持与主机上的 `qa suite` 相同的场景选择行为。
  - 重用与 `qa suite` 相同的提供商/模型选择标志。
  - Live 运行转发对访客来说实用的受支持 QA 认证输入：
    基于环境的提供商密钥、QA live 提供商配置路径，以及 `CODEX_HOME`
    （如果存在）。
  - 输出目录必须保留在仓库根目录下，以便访客可以通过挂载的工作区写回。
  - 写入正常的 QA 报告 + 摘要以及位于
    `.artifacts/qa-e2e/...` 下的 Multipass 日志。
- `pnpm qa:lab:up`
  - 启动基于 Docker 的 QA 站点，用于操作员风格的 QA 工作。
- `pnpm openclaw qa matrix`
  - 针对一次性的 Matrix 支持的 Tuwunel 家庭服务器，运行 Docker 实时 QA 通道。
  - 配置三个临时的 Matrix 用户（`driver`、`sut`、`observer`）以及一个私人房间，然后使用真实的 Matrix 插件作为 SUT 传输，启动一个 QA 网关子进程。
  - 默认使用固定的稳定 Tuwunel 镜像 `ghcr.io/matrix-construct/tuwunel:v1.5.1`。当需要测试不同的镜像时，用 `OPENCLAW_QA_MATRIX_TUWUNEL_IMAGE` 覆盖。
  - 在 `.artifacts/qa-e2e/...` 下写入 Matrix QA 报告、摘要和观察到的工件。
- `pnpm openclaw qa telegram`
  - 使用来自环境变量的驱动程序和 SUT 机器人令牌，针对真实的私人小组运行 Telegram 实时 QA 通道。
  - 需要 `OPENCLAW_QA_TELEGRAM_GROUP_ID`、`OPENCLAW_QA_TELEGRAM_DRIVER_BOT_TOKEN` 和 `OPENCLAW_QA_TELEGRAM_SUT_BOT_TOKEN`。组 ID 必须是数字 Telegram 聊天 ID。
  - 需要在同一个私人小组中有两个不同的机器人，且 SUT 机器人暴露 Telegram 用户名。
  - 为了稳定的机器人对机器人观察，请在 `@BotFather` 中为两个机器人启用 Bot-to-Bot 通信模式，并确保驱动程序机器人可以观察组机器人流量。
  - 在 `.artifacts/qa-e2e/...` 下写入 Telegram QA 报告、摘要和观察到的消息工件。

实时传输通道共享一个标准合约，以免新传输出现偏差：

`qa-channel` 仍然是广泛的综合 QA 套件，不是实时
传输覆盖率矩阵的一部分。

| 通道     | Canary | 提及门控 | 允许列表块 | 顶级回复 | 重启恢复 | 线程跟进 | 线程隔离 | 反应观察 | 帮助命令 |
| -------- | ------ | -------- | ---------- | -------- | -------- | -------- | -------- | -------- | -------- |
| Matrix   | x      | x        | x          | x        | x        | x        | x        | x        |          |
| Telegram | x      |          |            |          |          |          |          |          | x        |

## 测试套件（在哪里运行什么）

可以将套件视为“真实性递增”（以及不稳定性/成本递增）：

### 单元 / 集成（默认）

- 命令：`pnpm test`
- 配置：在现有的作用域 Vitest 项目上运行十次顺序分片运行（`vitest.full-*.config.ts`）
- 文件：位于 `src/**/*.test.ts`、`packages/**/*.test.ts`、`test/**/*.test.ts` 之下的 core/unit 清单，以及由 `vitest.unit.config.ts` 覆盖的白名单 `ui` 节点测试
- 范围：
  - 纯单元测试
  - 进程内集成测试（网关认证、路由、工具、解析、配置）
  - 针对已知 Bug 的确定性回归测试
- 预期：
  - 在 CI 中运行
  - 不需要真实的密钥
  - 应该快速且稳定
- 项目说明：
  - 非定向的 `pnpm test` 现在运行十一个较小的分片配置（`core-unit-src`、`core-unit-security`、`core-unit-ui`、`core-unit-support`、`core-support-boundary`、`core-contracts`、`core-bundled`、`core-runtime`、`agentic`、`auto-reply`、`extensions`），而不是一个巨大的原生根项目进程。这可以降低负载机器上的峰值 RSS 占用，并避免自动回复/扩展 工作导致不相关的测试套件资源匮乏。
  - `pnpm test --watch` 仍然使用原生根 `vitest.config.ts` 项目图，因为多分片监听循环并不实用。
  - `pnpm test`、`pnpm test:watch` 和 `pnpm test:perf:imports` 首先通过限定作用域的通道 路由显式文件/目录目标，因此 `pnpm test extensions/discord/src/monitor/message-handler.preflight.test.ts` 避免了支付完整的根项目启动开销。
  - 当差异仅触及可路由的源/测试文件时，`pnpm test:changed` 会将更改的 git 路径扩展到相同的限定作用域通道；配置/设置编辑仍回退到广泛的根项目重跑。
  - 来自 agents、commands、plugins、auto-reply helpers、`plugin-sdk` 和类似纯实用程序区域的轻导入 单元测试通过 `unit-fast` 通道进行路由，该通道跳过 `test/setup-openclaw-runtime.ts`；有状态/重度运行时的文件保留在现有通道上。
  - 选定的 `plugin-sdk` 和 `commands` 辅助源文件还将变更模式运行映射到这些轻量级车道中的显式同级测试，因此对辅助文件的编辑可以避免为该目录重新运行完整的重量级套件。
  - `auto-reply` 现在有三个专用存储桶：顶级核心辅助程序、顶级 `reply.*` 集成测试以及 `src/auto-reply/reply/**` 子树。这将最繁重的回复线束工作与廉价的状态/区块/令牌测试隔离开来。
- 嵌入式运行器说明：
  - 当您更改消息-工具发现输入或压缩运行时上下文时，
    请保持两个级别的覆盖率。
  - 为纯路由/规范化边界添加聚焦的辅助回归测试。
  - 同时还要保持嵌入式运行器集成套件的健康：
    `src/agents/pi-embedded-runner/compact.hooks.test.ts`，
    `src/agents/pi-embedded-runner/run.overflow-compaction.test.ts` 和
    `src/agents/pi-embedded-runner/run.overflow-compaction.loop.test.ts`。
  - 这些套件验证作用域 ID 和压缩行为仍然
    通过真实的 `run.ts` / `compact.ts` 路径流动；仅辅助程序的测试不能
    充分替代这些集成路径。
- 池说明：
  - 基础 Vitest 配置现在默认为 `threads`。
  - 共享的 Vitest 配置还修复了 `isolate: false`，并在根项目、e2e 和 live 配置中使用了非隔离运行器。
  - 根 UI 车道保留其 `jsdom` 设置和优化器，但现在也在共享的非隔离运行器上运行。
  - 每个 `pnpm test` 分片都从共享的 Vitest 配置继承相同的 `threads` + `isolate: false` 默认值。
  - 共享的 `scripts/run-vitest.mjs` 启动器现在默认还为 Vitest 子 Node 进程添加 `--no-maglev`，以减少大型本地运行期间的 V8 编译抖动。如果您需要与标准 V8 行为进行比较，请设置 `OPENCLAW_VITEST_ENABLE_MAGLEV=1`。
- 快速本地迭代说明：
  - 当更改的路径清晰地映射到较小的套件时，`pnpm test:changed` 会通过作用域车道进行路由。
  - `pnpm test:max` 和 `pnpm test:changed:max` 保持相同的路由行为，只是具有更高的 Worker 上限。
  - 本地 Worker 自动扩缩现在故意设置得比较保守，并且当主机负载平均值已经很高时也会进行退避，因此默认情况下，多个并发的 Vitest 运行造成的损害较小。
  - 基础 Vitest 配置将项目/配置文件标记为 `forceRerunTriggers`，以便在测试布线发生变化时，变更模式下的重新运行保持正确。
  - 该配置在受支持的主机上保持启用 `OPENCLAW_VITEST_FS_MODULE_CACHE`；如果您想要一个明确的缓存位置以便直接分析，请设置 `OPENCLAW_VITEST_FS_MODULE_CACHE_PATH=/abs/path`。
- 性能调试说明：
  - `pnpm test:perf:imports` 启用 Vitest 导入时长报告以及导入细分输出。
  - `pnpm test:perf:imports:changed` 将相同的分析视图限定在自 `origin/main` 以来更改的文件。
- `pnpm test:perf:changed:bench -- --ref <git-ref>` 将路由的 `test:changed` 与该提交差异的原生根项目路径进行比较，并打印 wall time 和 macOS max RSS。
- `pnpm test:perf:changed:bench -- --worktree` 通过 `scripts/test-projects.mjs` 和根 Vitest 配置路由更改文件列表，从而对当前的脏代码树进行基准测试。
  - `pnpm test:perf:profile:main` 为 Vitest/Vite 启动和转换开销写入主线程 CPU 分析文件。
  - `pnpm test:perf:profile:runner` 在禁用文件并行性的情况下，为单元测试套件写入运行器 CPU 和堆分析文件。

### E2E（网关冒烟测试）

- 命令：`pnpm test:e2e`
- 配置：`vitest.e2e.config.ts`
- 文件：`src/**/*.e2e.test.ts`、`test/**/*.e2e.test.ts`
- 运行时默认值：
  - 使用 Vitest `threads` 和 `isolate: false`，与仓库的其余部分相匹配。
  - 使用自适应 Worker（CI：最多 2 个，本地：默认 1 个）。
  - 默认以静默模式运行，以减少控制台 I/O 开销。
- 有用的覆盖设置：
  - `OPENCLAW_E2E_WORKERS=<n>` 强制 Worker 数量（上限为 16）。
  - `OPENCLAW_E2E_VERBOSE=1` 重新启用详细控制台输出。
- 范围：
  - 多实例网关端到端行为
  - WebSocket/HTTP 表面、节点配对和繁重的网络操作
- 预期：
  - 在 CI 中运行（在管道中启用时）
  - 不需要真实的密钥
  - 比单元测试有更多活动部件（可能会更慢）

### E2E：OpenShell 后端冒烟测试

- 命令：`pnpm test:e2e:openshell`
- 文件：`test/openshell-sandbox.e2e.test.ts`
- 范围：
  - 通过 Docker 在主机上启动隔离的 OpenShell 网关
  - 从临时的本地 Dockerfile 创建沙箱
  - 通过真实的 `sandbox ssh-config` + SSH exec 对 OpenClaw 的 OpenShell 后端进行测试
  - 通过沙箱 fs 桥验证远程规范文件系统行为
- 预期：
  - 可选加入；不是默认 `pnpm test:e2e` 运行的一部分
  - 需要本地 `openshell` CLI 以及正常工作的 Docker 守护进程
  - 使用隔离的 `HOME` / `XDG_CONFIG_HOME`，然后销毁测试网关和沙箱
- 有用的覆盖选项：
  - `OPENCLAW_E2E_OPENSHELL=1` 用于在手动运行更广泛的 e2e 套件时启用此测试
  - `OPENCLAW_E2E_OPENSHELL_COMMAND=/path/to/openshell` 用于指向非默认的 CLI 二进制文件或包装脚本

### 实时（真实提供商 + 真实模型）

- 命令：`pnpm test:live`
- 配置：`vitest.live.config.ts`
- 文件：`src/**/*.live.test.ts`
- 默认：通过 `pnpm test:live` **启用**（设置 `OPENCLAW_LIVE_TEST=1`）
- 范围：
  - “此提供商/模型在 _今天_ 使用真实凭据真的能工作吗？”
  - 捕获提供商格式更改、工具调用怪癖、身份验证问题和速率限制行为
- 预期：
  - 设计上不适合 CI（真实网络、真实提供商策略、配额、故障）
  - 花费金钱 / 使用速率限制
  - 首选运行缩小的子集，而不是“全部”
- 实时运行 source `~/.profile` 以获取缺失的 API 密钥。
- 默认情况下，实时运行仍然隔离 `HOME` 并将配置/身份验证材料复制到临时测试主目录，以便单元夹具不会更改您的真实 `~/.openclaw`。
- 仅当您有意需要实时测试使用真实主目录时，才设置 `OPENCLAW_LIVE_USE_REAL_HOME=1`。
- `pnpm test:live` 现在默认为更安静的模式：它保留 `[live] ...` 进度输出，但抑制额外的 `~/.profile` 通知并使网关引导日志/Bonjour 闲聊静音。如果您想恢复完整的启动日志，请设置 `OPENCLAW_LIVE_TEST_QUIET=0`。
- API 密钥轮换（特定于提供商）：使用逗号/分号格式设置 `*_API_KEYS` 或 `*_API_KEY_1`、`*_API_KEY_2`（例如 `OPENAI_API_KEYS`、`ANTHROPIC_API_KEYS`、`GEMINI_API_KEYS`），或通过 `OPENCLAW_LIVE_*_KEY` 进行每次实时覆盖；测试会在速率限制响应时重试。
- 进度/心跳输出：
  - Live 套件现在向 stderr 输出进度行，以便即使 Vitest 控制台捕获处于静默状态，长时间的提供商调用也明显处于活动状态。
  - `vitest.live.config.ts` 禁用 Vitest 控制台拦截，以便提供商/网关进度行在实时运行期间立即流式传输。
  - 使用 `OPENCLAW_LIVE_HEARTBEAT_MS` 调整直接模型的心跳。
  - 使用 `OPENCLAW_LIVE_GATEWAY_HEARTBEAT_MS` 调整网关/探针的心跳。

## 我应该运行哪个套件？

使用此决策表：

- 编辑逻辑/测试：运行 `pnpm test`（如果更改较多，则运行 `pnpm test:coverage`）
- 涉及网关网络/WS 协议/配对：添加 `pnpm test:e2e`
- 调试“我的机器人已停机”/特定于提供商的故障/工具调用：运行范围缩小的 `pnpm test:live`

## Live：Android 节点功能扫描

- 测试：`src/gateway/android-node.capabilities.live.test.ts`
- 脚本：`pnpm android:test:integration`
- 目标：调用连接的 Android 节点**当前通告的每个命令**，并断言命令契约行为。
- 范围：
  - 预先准备/手动设置（该套件不安装/运行/配对应用）。
  - 针对所选 Android 节点的逐命令网关 `node.invoke` 验证。
- 所需的预先设置：
  - Android 应用已连接并配对到网关。
  - 应用保持在前台。
  - 已为您期望通过的功能授予权限/捕获同意。
- 可选的目标覆盖：
  - `OPENCLAW_ANDROID_NODE_ID` 或 `OPENCLAW_ANDROID_NODE_NAME`。
  - `OPENCLAW_ANDROID_GATEWAY_URL` / `OPENCLAW_ANDROID_GATEWAY_TOKEN` / `OPENCLAW_ANDROID_GATEWAY_PASSWORD`。
- 完整的 Android 设置详情：[Android App](/en/platforms/android)

## Live：模型冒烟测试（配置文件密钥）

Live 测试分为两层，以便我们可以隔离故障：

- “Direct 模型” 告诉我们提供商/模型是否可以使用给定的密钥进行回答。
- “Gateway(网关) smoke” 告诉我们完整的 gateway+agent 管道对该模型是否有效（会话、历史记录、工具、沙箱策略等）。

### 第 1 层：直接模型补全（无 gateway）

- 测试：`src/agents/models.profiles.live.test.ts`
- 目标：
  - 枚举已发现的模型
  - 使用 `getApiKeyForModel` 选择你有凭据的模型
  - 对每个模型运行一个小型补全（以及在需要时运行定向回归测试）
- 如何启用：
  - `pnpm test:live` （或者如果直接调用 Vitest，则使用 `OPENCLAW_LIVE_TEST=1`）
- 设置 `OPENCLAW_LIVE_MODELS=modern` （或 `all`，modern 的别名）以实际运行此套件；否则它会跳过，以保持 `pnpm test:live` 专注于 gateway smoke
- 如何选择模型：
  - `OPENCLAW_LIVE_MODELS=modern` 运行 modern allowlist（Opus/Sonnet 4.6+、GPT-5.x + Codex、Gemini 3、GLM 4.7、MiniMax M2.7、Grok 4）
  - `OPENCLAW_LIVE_MODELS=all` 是 modern allowlist 的别名
  - 或 `OPENCLAW_LIVE_MODELS="openai/gpt-5.4,anthropic/claude-opus-4-6,..."` （逗号分隔 allowlist）
  - Modern/all 扫描默认采用精选的高信号上限；设置 `OPENCLAW_LIVE_MAX_MODELS=0` 以进行详尽的 modern 扫描，或设置一个正数以获得更小的上限。
- 如何选择提供商：
  - `OPENCLAW_LIVE_PROVIDERS="google,google-antigravity,google-gemini-cli"` （逗号分隔 allowlist）
- 密钥来源：
  - 默认：配置文件存储和环境变量备选
  - 设置 `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` 以强制仅使用 **配置文件存储**
- 存在原因：
  - 将“提供商 API 已损坏 / 密钥无效”与“gateway agent 管道已损坏”区分开来
  - 包含小型、独立的回归测试（例如：OpenAI Responses/Codex Responses 推理重放 + 工具调用流程）

### 第 2 层：Gateway(网关) + dev agent smoke（即 "@openclaw" 实际执行的操作）

- 测试：`src/gateway/gateway-models.profiles.live.test.ts`
- 目标：
  - 启动进程内 gateway
  - 创建/修补 `agent:dev:*` 会话（每次运行的模型覆盖）
  - 迭代带有密钥的模型并断言：
    - “有意义的”响应（无工具）
    - 真实的工具调用有效（读取探针）
    - 可选的额外工具探针（exec+read 探针）
    - OpenAI 回归路径（仅工具调用 → 后续跟进）保持正常工作
- 探针详细信息（以便您可以快速解释失败原因）：
  - `read` 探针：测试在工作区中写入一个 nonce 文件，并要求代理 `read` 该文件并回显 nonce。
  - `exec+read` 探针：测试要求代理 `exec` 写入一个 nonce 到临时文件中，然后 `read` 读回它。
  - 图像探针：测试附加一个生成的 PNG（cat + 随机代码）并期望模型返回 `cat <CODE>`。
  - 实现参考：`src/gateway/gateway-models.profiles.live.test.ts` 和 `src/gateway/live-image-probe.ts`。
- 如何启用：
  - `pnpm test:live`（或者如果直接调用 Vitest，则使用 `OPENCLAW_LIVE_TEST=1`）
- 如何选择模型：
  - 默认：现代白名单（Opus/Sonnet 4.6+，GPT-5.x + Codex，Gemini 3，GLM 4.7，MiniMax M2.7，Grok 4）
  - `OPENCLAW_LIVE_GATEWAY_MODELS=all` 是现代白名单的别名
  - 或者设置 `OPENCLAW_LIVE_GATEWAY_MODELS="provider/model"`（或逗号列表）以缩小范围
  - 现代/所有 Gateway 扫描默认为精选的高信号上限；设置 `OPENCLAW_LIVE_GATEWAY_MAX_MODELS=0` 以进行详尽的现代扫描，或设置正数以使用较小的上限。
- 如何选择提供商（避免“OpenRouter 全选”）：
  - `OPENCLAW_LIVE_GATEWAY_PROVIDERS="google,google-antigravity,google-gemini-cli,openai,anthropic,zai,minimax"`（逗号白名单）
- 在此实时测试中，工具 + 图像探针始终开启：
  - `read` 探针 + `exec+read` 探针（工具压力测试）
  - 当模型声明支持图像输入时运行图像探针
  - 流程（高层级）：
    - 测试生成一个带有“CAT” + 随机代码的微型 PNG（`src/gateway/live-image-probe.ts`）
    - 通过 `agent` `attachments: [{ mimeType: "image/png", content: "<base64>" }]` 发送它
    - Gateway(网关) 将附件解析为 `images[]`（`src/gateway/server-methods/agent.ts` + `src/gateway/chat-attachments.ts`）
    - 嵌入式代理向模型转发多模态用户消息
    - 断言：回复包含 `cat` + 代码（OCR 容差：允许小错误）

提示：要查看您可以在机器上测试的内容（以及确切的 `provider/model` ID），请运行：

```bash
openclaw models list
openclaw models list --json
```

## Live: CLI 后端冒烟测试（Claude，Codex，Gemini 或其他本地 CLIs）

- 测试：`src/gateway/gateway-cli-backend.live.test.ts`
- 目标：使用本地 Gateway(网关) 后端验证 Gateway + 代理管道，而不触及您的默认配置。
- 特定于后端的冒烟默认值位于所属扩展的 `cli-backend.ts` 定义中。
- 启用：
  - `pnpm test:live` （如果直接调用 Vitest，则使用 `OPENCLAW_LIVE_TEST=1`）
  - `OPENCLAW_LIVE_CLI_BACKEND=1`
- 默认值：
  - 默认提供商/模型：`claude-cli/claude-sonnet-4-6`
  - 命令/参数/镜像行为来自所属 CLI 后端插件元数据。
- 覆盖（可选）：
  - `OPENCLAW_LIVE_CLI_BACKEND_MODEL="codex-cli/gpt-5.4"`
  - `OPENCLAW_LIVE_CLI_BACKEND_COMMAND="/full/path/to/codex"`
  - `OPENCLAW_LIVE_CLI_BACKEND_ARGS='["exec","--json","--color","never","--sandbox","read-only","--skip-git-repo-check"]'`
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_PROBE=1` 发送真实的图像附件（路径会被注入到提示词中）。
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_ARG="--image"` 将图像文件路径作为 CLI 参数传递，而不是通过提示词注入。
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_MODE="repeat"` （或 `"list"`） 以控制在设置 `IMAGE_ARG` 时如何传递图像参数。
  - `OPENCLAW_LIVE_CLI_BACKEND_RESUME_PROBE=1` 发送第二轮对话并验证恢复流程。
  - `OPENCLAW_LIVE_CLI_BACKEND_MODEL_SWITCH_PROBE=0` 禁用默认的 Claude Sonnet -> Opus 同一会话连续性探测（当所选模型支持切换目标时，设置为 `1` 以强制开启）。

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

注意：

- Docker 运行程序位于 `scripts/test-live-cli-backend-docker.sh`。
- 它在仓库 CLI 镜像中作为非 root `node` 用户运行实况 Docker 后端冒烟测试。
- 它从所属扩展解析 CLI 冒烟元数据，然后将匹配的 Linux CLI 软件包（`@anthropic-ai/claude-code`、`@openai/codex` 或 `@google/gemini-cli`）安装到 `OPENCLAW_DOCKER_CLI_TOOLS_DIR` 处的可写缓存前缀中（默认：`~/.cache/openclaw/docker-cli-tools`）。
- `pnpm test:docker:live-cli-backend:claude-subscription` 需要通过带有 `claudeAiOauth.subscriptionType` 的 `~/.claude/.credentials.json` 或来自 `claude setup-token` 的 `CLAUDE_CODE_OAUTH_TOKEN` 进行可移植 Claude Code 订阅 OAuth 认证。它首先在 Docker 中证明直接的 `claude -p`，然后运行两轮 Gateway(网关) CLI 后端交互，且不保留 Anthropic API 密钥的环境变量。此订阅通道默认禁用 Claude MCP/工具和图像探测，因为 Claude 目前将第三方应用程序使用路由到额外使用计费，而不是正常的订阅计划限制。
- 实时 CLI 后端冒烟测试现在针对 Claude、Codex 和 Gemini 执行相同的端到端流程：文本轮次、图像分类轮次，然后是通过 Gateway(网关) CLI 验证的 MCP `cron` 工具调用。
- Claude 的默认冒烟测试还会将会话从 Sonnet 修补为 Opus，并验证恢复的会话仍然记得之前的笔记。

## 实时：ACP 绑定冒烟测试 (`/acp spawn ... --bind here`)

- 测试：`src/gateway/gateway-acp-bind.live.test.ts`
- 目标：通过实时 ACP 代理验证真实的 ACP 会话绑定流程：
  - 发送 `/acp spawn <agent> --bind here`
  - 在适当位置绑定一个合成的消息渠道 会话
  - 在同一会话上发送正常的后续消息
  - 验证后续消息落入绑定的 ACP 会话记录中
- 启用：
  - `pnpm test:live src/gateway/gateway-acp-bind.live.test.ts`
  - `OPENCLAW_LIVE_ACP_BIND=1`
- 默认值：
  - Docker 中的 ACP 代理：`claude,codex,gemini`
  - 用于直接 `pnpm test:live ...` 的 ACP 代理：`claude`
  - 合成渠道：Slack 私信 样式的会话上下文
  - ACP 后端：`acpx`
- 覆盖项：
  - `OPENCLAW_LIVE_ACP_BIND_AGENT=claude`
  - `OPENCLAW_LIVE_ACP_BIND_AGENT=codex`
  - `OPENCLAW_LIVE_ACP_BIND_AGENT=gemini`
  - `OPENCLAW_LIVE_ACP_BIND_AGENTS=claude,codex,gemini`
  - `OPENCLAW_LIVE_ACP_BIND_AGENT_COMMAND='npx -y @agentclientprotocol/claude-agent-acp@<version>'`
- 说明：
  - 此通道使用 Gateway(网关) `chat.send` 接口，该接口具有仅限管理员的合成 originating-route 字段，因此测试可以附加消息渠道上下文，而无需假装在外部进行传递。
  - 当 `OPENCLAW_LIVE_ACP_BIND_AGENT_COMMAND` 未设置时，测试使用嵌入式 `acpx` 插件的内置代理注册表来获取所选 ACP harness 代理。

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

Docker 注意事项：

- Docker 运行程序位于 `scripts/test-live-acp-bind-docker.sh`。
- 默认情况下，它依次对所有支持的实时 CLI 代理运行 ACP bind smoke 测试：`claude`、`codex`，然后是 `gemini`。
- 使用 `OPENCLAW_LIVE_ACP_BIND_AGENTS=claude`、`OPENCLAW_LIVE_ACP_BIND_AGENTS=codex` 或 `OPENCLAW_LIVE_ACP_BIND_AGENTS=gemini` 来缩小矩阵范围。
- 它导入 `~/.profile`，将匹配的 CLI 认证材料暂存到容器中，将 `acpx` 安装到可写的 npm 前缀中，然后如果缺少请求的实时 CLI (`@anthropic-ai/claude-code`、`@openai/codex` 或 `@google/gemini-cli`) 则进行安装。
- 在 Docker 内部，运行程序设置 `OPENCLAW_LIVE_ACP_BIND_ACPX_COMMAND=$HOME/.npm-global/bin/acpx`，以便 acpx 保持从导入的配置文件中的提供商环境变量可用于子 harness CLI。

## 实时：Codex app-server harness smoke

- 目标：通过正常的网关 `agent` 方法验证插件拥有的 Codex harness：
  - 加载捆绑的 `codex` 插件
  - 选择 `OPENCLAW_AGENT_RUNTIME=codex`
  - 向 `codex/gpt-5.4` 发送第一个网关代理轮次
  - 向同一个 OpenClaw 会话发送第二个轮次，并验证 app-server 线程是否可以恢复
  - 通过相同的网关命令路径运行 `/codex status` 和 `/codex models`
- 测试：`src/gateway/gateway-codex-harness.live.test.ts`
- 启用：`OPENCLAW_LIVE_CODEX_HARNESS=1`
- 默认模型：`codex/gpt-5.4`
- 可选图像探测：`OPENCLAW_LIVE_CODEX_HARNESS_IMAGE_PROBE=1`
- 可选 MCP/工具探测：`OPENCLAW_LIVE_CODEX_HARNESS_MCP_PROBE=1`
- 该 smoke 测试设置了 `OPENCLAW_AGENT_HARNESS_FALLBACK=none`，因此损坏的 Codex harness 无法通过静默回退到 PI 来通过测试。
- 认证：来自 shell/配置文件的 `OPENAI_API_KEY`，加上可选复制的 `~/.codex/auth.json` 和 `~/.codex/config.toml`

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

Docker 注意事项：

- Docker 运行程序位于 `scripts/test-live-codex-harness-docker.sh`。
- 它获取挂载的 `~/.profile`，传递 `OPENAI_API_KEY`，在存在时复制 Codex CLI 认证文件，将 `@openai/codex` 安装到可写的已挂载 npm 前缀中，暂存源代码树，然后仅运行 Codex-harness 实时测试。
- Docker 默认启用镜像和 MCP/工具探测。当您需要进行更狭窄的调试运行时，请设置 `OPENCLAW_LIVE_CODEX_HARNESS_IMAGE_PROBE=0` 或 `OPENCLAW_LIVE_CODEX_HARNESS_MCP_PROBE=0`。
- Docker 还会导出 `OPENCLAW_AGENT_HARNESS_FALLBACK=none`，以匹配实时测试配置，从而防止 `openai-codex/*` 或 PI 回退掩盖 Codex harness 回归。

### 推荐的实时配方

狭窄、明确的允许列表是最快且最不稳定的：

- 单个模型，直连（无网关）：
  - `OPENCLAW_LIVE_MODELS="openai/gpt-5.4" pnpm test:live src/agents/models.profiles.live.test.ts`

- 单个模型，网关冒烟测试：
  - `OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.4" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

- 跨多个提供商的工具调用：
  - `OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.4,anthropic/claude-opus-4-6,google/gemini-3-flash-preview,zai/glm-4.7,minimax/MiniMax-M2.7" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

- Google 侧重（Gemini API 密钥 + Antigravity）：
  - Gemini (API 密钥): `OPENCLAW_LIVE_GATEWAY_MODELS="google/gemini-3-flash-preview" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`
  - Antigravity (OAuth): `OPENCLAW_LIVE_GATEWAY_MODELS="google-antigravity/claude-opus-4-6-thinking,google-antigravity/gemini-3-pro-high" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

备注：

- `google/...` 使用 Gemini API (API 密钥)。
- `google-antigravity/...` 使用 Antigravity OAuth 网桥（Cloud Code Assist 风格的代理端点）。
- `google-gemini-cli/...` 使用您机器上的本地 Gemini CLI（单独的认证 + 工具怪癖）。
- Gemini API 与 Gemini CLI 对比：
  - API：OpenClaw 通过 HTTP 调用 Google 托管的 Gemini API（API 密钥 / 配置文件认证）；这是大多数用户所说的“Gemini”。
  - CLI：OpenClaw 调用本地 `gemini` 二进制文件；它有自己的认证，并且行为可能有所不同（流式传输/工具支持/版本偏差）。

## Live: 模型 matrix (what we cover)

没有固定的“CI 模型列表”（实时是可选的），但这些是建议在有密钥的开发机器上定期覆盖的 **recommended** 模型。

### Modern smoke set (工具 calling + image)

这是我们期望保持运行的“通用模型”运行：

- OpenAI (非 Codex): `openai/gpt-5.4` (可选: `openai/gpt-5.4-mini`)
- OpenAI Codex: `openai-codex/gpt-5.4`
- Anthropic: `anthropic/claude-opus-4-6` (或 `anthropic/claude-sonnet-4-6`)
- Google (Gemini API): `google/gemini-3.1-pro-preview` 和 `google/gemini-3-flash-preview` (避免使用较旧的 Gemini 2.x 模型)
- Google (Antigravity): `google-antigravity/claude-opus-4-6-thinking` 和 `google-antigravity/gemini-3-flash`
- Z.AI (GLM): `zai/glm-4.7`
- MiniMax: `minimax/MiniMax-M2.7`

运行包含工具 + 图像的网关冒烟测试：
`OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.4,openai-codex/gpt-5.4,anthropic/claude-opus-4-6,google/gemini-3.1-pro-preview,google/gemini-3-flash-preview,google-antigravity/claude-opus-4-6-thinking,google-antigravity/gemini-3-flash,zai/glm-4.7,minimax/MiniMax-M2.7" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

### 基线：工具调用 (读取 + 可选执行)

每个提供商系列至少选择一个：

- OpenAI: `openai/gpt-5.4` (或 `openai/gpt-5.4-mini`)
- Anthropic: `anthropic/claude-opus-4-6` (或 `anthropic/claude-sonnet-4-6`)
- Google: `google/gemini-3-flash-preview` (或 `google/gemini-3.1-pro-preview`)
- Z.AI (GLM): `zai/glm-4.7`
- MiniMax: `minimax/MiniMax-M2.7`

可选的额外覆盖范围 (最好有)：

- xAI: `xai/grok-4` (或最新可用版本)
- Mistral: `mistral/`… (选择一个你已启用的具备“工具”能力的模型)
- Cerebras: `cerebras/`… (如果你有访问权限)
- LM Studio: `lmstudio/`… (本地；工具调用取决于 API 模式)

### 视觉：图像发送 (附件 → 多模态消息)

在 `OPENCLAW_LIVE_GATEWAY_MODELS` 中至少包含一个支持图像的模型 (Claude/Gemini/OpenAI 支持视觉的变体等) 以测试图像探针。

### 聚合器 / 备用网关

如果你启用了密钥，我们也支持通过以下方式进行测试：

- OpenRouter: `openrouter/...` (数百个模型；使用 `openclaw models scan` 查找支持工具+图像的候选项)
- OpenCode: `opencode/...` 用于 Zen，`opencode-go/...` 用于 Go (通过 `OPENCODE_API_KEY` / `OPENCODE_ZEN_API_KEY` 进行身份验证)

更多你可以包含在实时矩阵中的提供商 (如果你有凭据/配置)：

- 内置：`openai`，`openai-codex`，`anthropic`，`google`，`google-vertex`，`google-antigravity`，`google-gemini-cli`，`zai`，`openrouter`，`opencode`，`opencode-go`，`xai`，`groq`，`cerebras`，`mistral`，`github-copilot`
- 通过 `models.providers`（自定义端点）：`minimax`（云/API），以及任何与 OpenAI/Anthropic 兼容的代理（LM Studio、vLLM、LiteLLM 等）

提示：不要尝试在文档中硬编码“所有模型”。权威列表是 `discoverModels(...)` 在您的机器上返回的内容加上可用的任何密钥。

## 凭据（切勿提交）

实时测试以与 CLI 相同的方式发现凭据。实际影响如下：

- 如果 CLI 可以正常工作，实时测试应该能找到相同的密钥。
- 如果实时测试显示“no creds”，请按照调试 `openclaw models list` / 模型选择的方式进行调试。

- 每个代理的身份验证配置文件：`~/.openclaw/agents/<agentId>/agent/auth-profiles.json`（这就是“profile keys”在实时测试中的含义）
- 配置：`~/.openclaw/openclaw.json`（或 `OPENCLAW_CONFIG_PATH`）
- 旧版状态目录：`~/.openclaw/credentials/`（如果存在，会复制到暂存的实时主目录中，但不是主要的配置文件密钥存储）
- 实时本地运行默认会将活动配置、每个代理的 `auth-profiles.json` 文件、旧版 `credentials/` 以及受支持的外部 CLI 身份验证目录复制到临时测试主目录中；暂存的实时主目录会跳过 `workspace/` 和 `sandboxes/`，并且 `agents.*.workspace` / `agentDir` 路径覆盖会被剥离，以便探测不会干扰您真实的主机工作区。

如果您想依赖环境密钥（例如在您的 `~/.profile` 中导出的），请在 `source ~/.profile` 之后运行本地测试，或使用下方的 Docker 运行器（它们可以将 `~/.profile` 挂载到容器中）。

## Deepgram 实时（音频转录）

- 测试：`src/media-understanding/providers/deepgram/audio.live.test.ts`
- 启用：`DEEPGRAM_API_KEY=... DEEPGRAM_LIVE_TEST=1 pnpm test:live src/media-understanding/providers/deepgram/audio.live.test.ts`

## BytePlus 编码计划实时

- 测试：`src/agents/byteplus.live.test.ts`
- 启用：`BYTEPLUS_API_KEY=... BYTEPLUS_LIVE_TEST=1 pnpm test:live src/agents/byteplus.live.test.ts`
- 可选的模型覆盖：`BYTEPLUS_CODING_MODEL=ark-code-latest`

## ComfyUI 工作流媒体实时

- 测试：`extensions/comfy/comfy.live.test.ts`
- 启用：`OPENCLAW_LIVE_TEST=1 COMFY_LIVE_TEST=1 pnpm test:live -- extensions/comfy/comfy.live.test.ts`
- 范围：
  - 演练捆绑的 comfy 图像、视频和 `music_generate` 路径
  - 除非配置了 `models.providers.comfy.<capability>`，否则跳过每个功能
  - 在更改 comfy 工作流提交、轮询、下载或插件注册后很有用

## 图像生成实时

- 测试：`src/image-generation/runtime.live.test.ts`
- 命令：`pnpm test:live src/image-generation/runtime.live.test.ts`
- 线束：`pnpm test:live:media image`
- 范围：
  - 枚举每个已注册的图像生成提供商插件
  - 在探测之前从您的登录 shell (`~/.profile`) 加载缺失的提供商环境变量
  - 默认优先使用实时/环境的 API 密钥而不是存储的身份验证配置文件，因此 `auth-profiles.json` 中过时的测试密钥不会掩盖真实的 shell 凭据
  - 跳过没有可用身份验证/配置文件/模型的提供商
  - 通过共享运行时功能运行标准图像生成变体：
    - `google:flash-generate`
    - `google:pro-generate`
    - `google:pro-edit`
    - `openai:default-generate`
- 当前涵盖的捆绑提供商：
  - `openai`
  - `google`
- 可选缩小范围：
  - `OPENCLAW_LIVE_IMAGE_GENERATION_PROVIDERS="openai,google"`
  - `OPENCLAW_LIVE_IMAGE_GENERATION_MODELS="openai/gpt-image-1,google/gemini-3.1-flash-image-preview"`
  - `OPENCLAW_LIVE_IMAGE_GENERATION_CASES="google:flash-generate,google:pro-edit"`
- 可选身份验证行为：
  - `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` 强制配置文件存储身份验证并忽略仅环境变量的覆盖

## 音乐生成实时

- 测试：`extensions/music-generation-providers.live.test.ts`
- 启用：`OPENCLAW_LIVE_TEST=1 pnpm test:live -- extensions/music-generation-providers.live.test.ts`
- 线束：`pnpm test:live:media music`
- 范围：
  - 演练共享的捆绑音乐生成提供商路径
  - 目前涵盖 Google 和 MiniMax
  - 在探测之前从您的登录 shell (`~/.profile`) 加载提供商环境变量
  - 默认优先使用实时/环境 API 密钥而非存储的身份验证配置文件，因此 `auth-profiles.json` 中的过时测试密钥不会掩盖真实的 shell 凭据
  - 跳过没有可用身份验证/配置文件/模型的提供商
  - 在可用时运行两种声明的运行时模式：
    - `generate` 配合仅提示词输入
    - 当提供商声明 `capabilities.edit.enabled` 时运行 `edit`
  - 当前共享通道覆盖率：
    - `google`: `generate`, `edit`
    - `minimax`: `generate`
    - `comfy`: 独立的 Comfy 实时文件，而非此共享扫描
- 可选的缩小范围：
  - `OPENCLAW_LIVE_MUSIC_GENERATION_PROVIDERS="google,minimax"`
  - `OPENCLAW_LIVE_MUSIC_GENERATION_MODELS="google/lyria-3-clip-preview,minimax/music-2.5+"`
- 可选的身份验证行为：
  - `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` 强制使用配置文件存储的身份验证并忽略仅限环境的覆盖设置

## 视频生成实时测试

- 测试: `extensions/video-generation-providers.live.test.ts`
- 启用: `OPENCLAW_LIVE_TEST=1 pnpm test:live -- extensions/video-generation-providers.live.test.ts`
- 测试框架: `pnpm test:live:media video`
- 范围：
  - 测试共享的捆绑视频生成提供商路径
  - 在探测之前从您的登录 shell (`~/.profile`) 加载提供商环境变量
  - 默认优先使用实时/环境 API 密钥而非存储的身份验证配置文件，因此 `auth-profiles.json` 中的过时测试密钥不会掩盖真实的 shell 凭据
  - 跳过没有可用身份验证/配置文件/模型的提供商
  - 在可用时运行两种声明的运行时模式：
    - `generate` 配合仅提示词输入
    - 当提供商声明 `capabilities.imageToVideo.enabled` 且所选提供商/模型在共享扫描中接受基于缓冲区的本地图像输入时，运行 `imageToVideo`
    - 当提供商声明 `capabilities.videoToVideo.enabled` 且所选提供商/模型在共享扫描中接受基于缓冲区的本地视频输入时，运行 `videoToVideo`
  - 当前在共享扫描中已声明但跳过的 `imageToVideo` 提供商：
    - `vydra` 因为捆绑的 `veo3` 仅支持文本，且捆绑的 `kling` 需要远程图像 URL
  - 提供商特定的 Vydra 覆盖率：
    - `OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_VYDRA_VIDEO=1 pnpm test:live -- extensions/vydra/vydra.live.test.ts`
    - 该文件运行 `veo3` text-to-video 加上一个 `kling` lane，默认使用远程图像 URL fixture
  - 当前的 `videoToVideo` live 覆盖率：
    - 仅当选定的模型为 `runway/gen4_aleph` 时才 `runway`
  - 当前在 shared sweep 中已声明但跳过的 `videoToVideo` 提供商：
    - `alibaba`，`qwen`，`xai`，因为这些路径当前需要远程 `http(s)` / MP4 参考 URL
    - `google`，因为当前的共享 Gemini/Veo lane 使用本地 buffer-backed 输入，而该路径不被 shared sweep 接受
    - `openai`，因为当前的共享 lane 缺少特定于组织的视频修复/remix 访问保证
- 可选的筛选：
  - `OPENCLAW_LIVE_VIDEO_GENERATION_PROVIDERS="google,openai,runway"`
  - `OPENCLAW_LIVE_VIDEO_GENERATION_MODELS="google/veo-3.1-fast-generate-preview,openai/sora-2,runway/gen4_aleph"`
- 可选的身份验证行为：
  - `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` 以强制 profile-store 身份验证并忽略仅限环境的覆盖

## Media live harness

- 命令：`pnpm test:live:media`
- 目的：
  - 通过一个 repo-native 入口点运行共享的图像、音乐和视频 live 套件
  - 从 `~/.profile` 自动加载缺失的提供商环境变量
  - 默认将每个套件自动筛选到当前具有可用身份验证的提供商
  - 重用 `scripts/test-live.mjs`，因此心跳和静默模式行为保持一致
- 示例：
  - `pnpm test:live:media`
  - `pnpm test:live:media image video --providers openai,google,minimax`
  - `pnpm test:live:media video --video-providers openai,runway --all-providers`
  - `pnpm test:live:media music --quiet`

## Docker 跑步者（可选的“在 Linux 上工作”检查）

这些 Docker 跑步者分为两类：

- Live-模型 跑步者：`test:docker:live-models` 和 `test:docker:live-gateway` 仅在 repo Docker 镜像（`src/agents/models.profiles.live.test.ts` 和 `src/gateway/gateway-models.profiles.live.test.ts`）内运行其匹配的 profile-key live 文件，挂载本地配置目录和工作区（如果已挂载，则获取 `~/.profile`）。匹配的本地入口点是 `test:live:models-profiles` 和 `test:live:gateway-profiles`。
- Docker 实时运行器默认较小的冒烟测试上限，以便完整的 Docker 扫描保持实用：
  `test:docker:live-models` 默认为 `OPENCLAW_LIVE_MAX_MODELS=12`，且
  `test:docker:live-gateway` 默认为 `OPENCLAW_LIVE_GATEWAY_SMOKE=1`，
  `OPENCLAW_LIVE_GATEWAY_MAX_MODELS=8`，
  `OPENCLAW_LIVE_GATEWAY_STEP_TIMEOUT_MS=45000`，和
  `OPENCLAW_LIVE_GATEWAY_MODEL_TIMEOUT_MS=90000`。当您
  明确想要更大的全面扫描时，请覆盖那些环境变量。
- `test:docker:all` 通过 `test:docker:live-build` 一次性构建实时 Docker 镜像，然后在两个实时 Docker 车道中重用它。
- 容器冒烟运行器：`test:docker:openwebui`、`test:docker:onboard`、`test:docker:gateway-network`、`test:docker:mcp-channels` 和 `test:docker:plugins` 启动一个或多个真实容器并验证更高级别的集成路径。

实时模型 Docker 运行器还仅绑定挂载所需的 CLI 认证主目录（或者在运行未限定时挂载所有支持的目录），然后在运行前将其复制到容器主目录，以便外部 CLI OAuth 可以刷新令牌而无需变更主机认证存储：

- 直连模型：`pnpm test:docker:live-models`（脚本：`scripts/test-live-models-docker.sh`）
- ACP 绑定冒烟：`pnpm test:docker:live-acp-bind`（脚本：`scripts/test-live-acp-bind-docker.sh`）
- CLI 后端冒烟：`pnpm test:docker:live-cli-backend`（脚本：`scripts/test-live-cli-backend-docker.sh`）
- Codex 应用服务器工具冒烟：`pnpm test:docker:live-codex-harness`（脚本：`scripts/test-live-codex-harness-docker.sh`）
- Gateway(网关) + 开发代理：`pnpm test:docker:live-gateway`（脚本：`scripts/test-live-gateway-models-docker.sh`）
- Open WebUI 实时冒烟：`pnpm test:docker:openwebui`（脚本：`scripts/e2e/openwebui-docker.sh`）
- 新手引导向导（TTY，完整脚手架）：`pnpm test:docker:onboard`（脚本：`scripts/e2e/onboard-docker.sh`）
- Gateway(网关) 网络（两个容器，WS 认证 + 健康检查）：`pnpm test:docker:gateway-network`（脚本：`scripts/e2e/gateway-network-docker.sh`）
- MCP 渠道桥接（已播种的 Gateway(网关) + stdio 桥接 + 原始 Claude 通知帧冒烟）：`pnpm test:docker:mcp-channels`（脚本：`scripts/e2e/mcp-channels-docker.sh`）
- 插件（安装冒烟测试 + `/plugin` 别名 + Claude-bundle 重启语义）：`pnpm test:docker:plugins`（脚本：`scripts/e2e/plugins-docker.sh`）

实时模型 Docker 运行器还会将当前检出的代码以只读方式绑定挂载，并将其暂存到容器内的临时工作目录中。这既保持了运行时镜像的精简，又能针对您的本地源代码/配置运行 Vitest。暂存步骤会跳过大型本地缓存和应用程序构建输出，例如 `.pnpm-store`、`.worktrees`、`__openclaw_vitest__` 和应用程序本地的 `.build` 或 Gradle 输出目录，因此 Docker 实时运行不会花费数分钟来复制特定于机器的构件。
它们还会设置 `OPENCLAW_SKIP_CHANNELS=1`，以便网关实时探测不会在容器内启动真正的 Telegram/Discord/等渠道工作进程。`test:docker:live-models` 仍会运行 `pnpm test:live`，因此当您需要从该 Docker 通道缩小或排除网关实时覆盖范围时，也要传递 `OPENCLAW_LIVE_GATEWAY_*`。
`test:docker:openwebui` 是更高级别的兼容性冒烟测试：它启动一个启用了 OpenClaw 兼容 HTTP 端点的 OpenAI 网关容器，针对该网关启动一个固定的 Open WebUI 容器，通过 Open WebUI 登录，验证 `/api/models` 暴露了 `openclaw/default`，然后通过 Open WebUI 的 `/api/chat/completions` 代理发送真实的聊天请求。
首次运行可能会明显变慢，因为 Docker 可能需要拉取 Open WebUI 镜像，而且 Open WebUI 可能需要完成其自身的冷启动设置。
此通道需要可用的实时模型密钥，而 `OPENCLAW_PROFILE_FILE`（默认为 `~/.profile`）是在 Telegram 化运行中提供该密钥的主要方式。
成功的运行会打印出类似 `{ "ok": true, "模型": "openclaw/default", ... }` 的小型 JSON 负载。
`test:docker:mcp-channels` 是有意确定性的，不需要真实的 Discord、iMessage 或 Gateway(网关) 账户。它会启动一个带有种子的 Gateway(网关) 容器，启动一个生成 `openclaw mcp serve` 的第二个容器，然后通过真实的 stdio MCP 桥接验证路由对话发现、记录读取、附件元数据、实时事件队列行为、出站发送路由，以及 Claude 风格的渠道 + 权限通知。通知检查会直接检查原始的 stdio MCP 帧，因此冒烟测试验证的是桥接实际发出的内容，而不仅仅是特定客户端 SDK 恰好呈现的内容。

手动 ACP 自然语言线程冒烟测试（非 CI）：

- `bun scripts/dev/discord-acp-plain-language-smoke.ts --channel <discord-channel-id> ...`
- 保留此脚本用于回归/调试工作流。它可能再次需要用于 ACP 线程路由验证，因此请勿删除它。

有用的环境变量：

- `OPENCLAW_CONFIG_DIR=...`（默认：`~/.openclaw`）挂载到 `/home/node/.openclaw`
- `OPENCLAW_WORKSPACE_DIR=...`（默认：`~/.openclaw/workspace`）挂载到 `/home/node/.openclaw/workspace`
- `OPENCLAW_PROFILE_FILE=...`（默认：`~/.profile`）挂载到 `/home/node/.profile` 并在运行测试之前加载
- `OPENCLAW_DOCKER_CLI_TOOLS_DIR=...`（默认：`~/.cache/openclaw/docker-cli-tools`）挂载到 `/home/node/.npm-global` 以便在 CLI 内部缓存 Docker 安装
- `$HOME` 下的外部 CLI 身份验证目录/文件以只读方式挂载到 `/host-auth...` 下，然后在测试开始前复制到 `/home/node/...` 中
  - 默认目录：`.minimax`
  - 默认文件：`~/.codex/auth.json`、`~/.codex/config.toml`、`.claude.json`、`~/.claude/.credentials.json`、`~/.claude/settings.json`、`~/.claude/settings.local.json`
  - 缩小的提供商运行仅挂载从 `OPENCLAW_LIVE_PROVIDERS` / `OPENCLAW_LIVE_GATEWAY_PROVIDERS` 推断所需的目录/文件
  - 使用 `OPENCLAW_DOCKER_AUTH_DIRS=all`、`OPENCLAW_DOCKER_AUTH_DIRS=none` 或逗号列表（如 `OPENCLAW_DOCKER_AUTH_DIRS=.claude,.codex`）手动覆盖
- `OPENCLAW_LIVE_GATEWAY_MODELS=...` / `OPENCLAW_LIVE_MODELS=...` 以缩小运行范围
- `OPENCLAW_LIVE_GATEWAY_PROVIDERS=...` / `OPENCLAW_LIVE_PROVIDERS=...` 以在容器内过滤提供商
- `OPENCLAW_SKIP_DOCKER_BUILD=1` 以重用现有的 `openclaw:local-live` 映像，用于不需要重新构建的重新运行
- `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` 以确保凭据来自配置文件存储（而非环境）
- `OPENCLAW_OPENWEBUI_MODEL=...` 以选择网关为 Open WebUI 冒烟测试暴露的模型
- `OPENCLAW_OPENWEBUI_PROMPT=...` 以覆盖 Open WebUI 冒烟测试使用的 nonce 检查提示
- `OPENWEBUI_IMAGE=...` 以覆盖固定的 Open WebUI 映像标签

## 文档完整性检查

文档编辑后运行文档检查：`pnpm check:docs`。
当您还需要页面内标题检查时，请运行完整的 Mintlify 锚点验证：`pnpm docs:check-links:anchors`。

## 离线回归测试（CI 安全）

这些是没有真实提供商的“真实管道”回归测试：

- Gateway(网关) 工具调用（模拟 OpenAI，真实 gateway + agent 循环）：`src/gateway/gateway.test.ts`（用例：“runs a mock OpenAI 工具 call end-to-end via gateway agent loop”）
- Gateway(网关) 向导（WS `wizard.start`/`wizard.next`，写入配置 + 强制执行身份验证）：`src/gateway/gateway.test.ts`（用例：“runs wizard over ws and writes auth token config”）

## Agent 可靠性评估（Skills）

我们已经有一些 CI 安全的测试，其行为类似于“agent 可靠性评估”：

- 通过真实的 gateway + agent 循环进行模拟工具调用（`src/gateway/gateway.test.ts`）。
- 端到端向导流程，用于验证会话连线和配置效果（`src/gateway/gateway.test.ts`）。

Skills 仍然缺少什么（请参阅 [Skills](/en/tools/skills)）：

- **决策制定：** 当 prompt 中列出了 skills 时，agent 是否选择了正确的 skill（或避免了无关的 skill）？
- **合规性：** agent 是否在使用前阅读了 `SKILL.md` 并遵循了必需的步骤/参数？
- **工作流契约：** 断言工具顺序、会话历史继承和沙箱边界的多轮场景。

未来的评估应首先保持确定性：

- 使用模拟提供商的场景运行器，以断言工具调用 + 顺序、skill 文件读取和会话连线。
- 一小套专注于 skill 的场景（使用 vs 避免、门控、prompt 注入）。
- 只有在 CI 安全套件到位后，才进行可选的实时评估（选择性加入、环境限制）。

## 契约测试（插件和渠道结构）

契约测试验证每个注册的插件和渠道是否符合其
接口契约。它们遍历所有发现的插件并运行一套
结构和行为断言。默认的 `pnpm test` 单元通道有意
跳过这些共享的 seam 和 smoke 文件；当您接触共享渠道或提供商接口时，请显式
运行契约命令。

### 命令

- 所有契约测试：`pnpm test:contracts`
- 仅限渠道合同：`pnpm test:contracts:channels`
- 仅限提供商合同：`pnpm test:contracts:plugins`

### 渠道合同

位于 `src/channels/plugins/contracts/*.contract.test.ts`：

- **plugin** - 基本插件形状 (id, name, capabilities)
- **setup** - 设置向导合同
- **会话-binding** - 会话绑定行为
- **outbound-payload** - 消息负载结构
- **inbound** - 入站消息处理
- **actions** - 渠道操作处理程序
- **threading** - 线程 ID 处理
- **directory** - 目录/名册 API
- **group-policy** - 组策略执行

### 提供商状态合同

位于 `src/plugins/contracts/*.contract.test.ts`。

- **status** - 渠道状态探测
- **registry** - 插件注册表形状

### 提供商合同

位于 `src/plugins/contracts/*.contract.test.ts`：

- **auth** - 认证流程合同
- **auth-choice** - 认证选择/选定
- **catalog** - 模型目录 API
- **discovery** - 插件发现
- **loader** - 插件加载
- **runtime** - 提供商运行时
- **shape** - 插件形状/接口
- **wizard** - 设置向导

### 何时运行

- 在更改 plugin-sdk 导出或子路径之后
- 在添加或修改渠道或提供商插件之后
- 在重构插件注册或发现之后

合同测试在 CI 中运行，不需要真实的 API 密钥。

## 添加回归测试（指导）

当你在 live 中修复了一个发现的提供商/模型问题时：

- 如果可能，添加一个 CI 安全的回归测试（模拟/存根提供商，或捕获确切的请求形状转换）
- 如果它本质上仅限 live（速率限制、认证策略），请保持 live 测试狭窄并通过环境变量选择加入
- 优先针对捕获该 bug 的最小层：
  - 提供商请求转换/回放 bug → 直接模型测试
  - 网关会话/历史/工具流水线 bug → 网关 live 冒烟测试或 CI 安全的网关模拟测试
- SecretRef 遍历防护：
  - `src/secrets/exec-secret-ref-id-parity.test.ts` 从注册表元数据 (`listSecretTargetRegistryEntries()`) 中为每个 SecretRef 类派生一个抽样目标，然后断言遍历片段 exec id 被拒绝。
  - 如果您在 `src/secrets/target-registry-data.ts` 中添加了新的 `includeInPlan` SecretRef 目标系列，请在该测试中更新 `classifyTargetClass`。该测试针对未分类的目标 id 故意会失败，以确保新的类不会被静默跳过。
