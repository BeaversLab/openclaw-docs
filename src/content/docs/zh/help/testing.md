---
summary: "测试套件：单元/E2E/Live 套件、Docker 运行器以及每个测试涵盖的内容"
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

- 完整网关（推送前预期）：`pnpm build && pnpm check && pnpm test`
- 在配置较高的机器上更快的本地完整套件运行：`pnpm test:max`
- 直接 Vitest 监视循环：`pnpm test:watch`
- 直接的文件定位现在也支持路由扩展/渠道路径：`pnpm test extensions/discord/src/monitor/message-handler.preflight.test.ts`
- 基于 Docker 的 QA 站点：`pnpm qa:lab:up`

当您修改测试或需要额外的信心时：

- 覆盖率网关：`pnpm test:coverage`
- E2E 套件：`pnpm test:e2e`

当调试真实的提供商/模型时（需要真实的凭据）：

- Live 套件（模型 + 网关工具/镜像探测）：`pnpm test:live`
- 安静地定位一个 Live 文件：`pnpm test:live -- src/agents/models.profiles.live.test.ts`

提示：当您只需要一个失败的案例时，建议通过下面描述的允许列表环境变量来缩小 Live 测试范围。

## 测试套件（什么在哪里运行）

可以将这些套件视为“现实感递增”（同时也伴随着不稳定性/成本递增）：

### 单元 / 集成（默认）

- 命令：`pnpm test`
- 配置：在现有的限定范围的 Vitest 项目上进行十次顺序分片运行（`vitest.full-*.config.ts`）
- 文件：`src/**/*.test.ts`、`packages/**/*.test.ts` 和 `test/**/*.test.ts` 下的 core/unit 清单，以及由 `vitest.unit.config.ts` 覆盖的白名单 `ui` 节点测试
- 范围：
  - 纯单元测试
  - 进程内集成测试（网关认证、路由、工具、解析、配置）
  - 针对已知 Bug 的确定性回归测试
- 预期：
  - 在 CI 中运行
  - 不需要真实的密钥
  - 应该快速且稳定
- 项目说明：
  - 无目标的 `pnpm test` 现在运行 11 个较小的分片配置（`core-unit-src`, `core-unit-security`, `core-unit-ui`, `core-unit-support`, `core-support-boundary`, `core-contracts`, `core-bundled`, `core-runtime`, `agentic`, `auto-reply`, `extensions`），而不是一个巨大的原生根项目进程。这可以降低负载机器上的峰值 RSS（常驻集大小），并避免自动回复/扩展 工作导致不相关的测试套件资源匮乏。
  - `pnpm test --watch` 仍然使用原生根 `vitest.config.ts` 项目图，因为多分片监视 循环不切实际。
  - `pnpm test`、`pnpm test:watch` 和 `pnpm test:perf:imports` 首先通过限定范围的通道 路由显式的文件/目录目标，因此 `pnpm test extensions/discord/src/monitor/message-handler.preflight.test.ts` 可以避免支付完整的根项目启动开销。
  - 当差异仅涉及可路由的源/测试文件时，`pnpm test:changed` 会将更改的 git 路径扩展到相同的限定通道中；配置/设置的编辑仍然会回退到广泛的根项目重新运行。
  - 选定的 `plugin-sdk` 和 `commands` 测试也通过专用的轻量通道 路由，这些通道会跳过 `test/setup-openclaw-runtime.ts`；有状态/运行时繁重的文件则保留在现有通道上。
  - 选定的 `plugin-sdk` 和 `commands` 辅助源文件还将更改模式运行映射到这些轻量通道中的显式同级测试，因此辅助文件的编辑可以避免为该目录重新运行完整的繁重测试套件。
  - `auto-reply` 现在有三个专用的存储桶：顶级核心辅助程序、顶级 `reply.*` 集成测试以及 `src/auto-reply/reply/**` 子树。这可以使最繁重的回复装置 工作与廉价的 status/chunk/token 测试分离。
- 嵌入式运行器 说明：
  - 当您更改 message-工具 发现输入或压缩 运行时上下文时，
    请保持两个级别的覆盖率。
  - 为纯路由/规范化边界添加有针对性的辅助程序 回归测试。
  - 同时请保持嵌入式运行器集成套件的健康：
    `src/agents/pi-embedded-runner/compact.hooks.test.ts`、
    `src/agents/pi-embedded-runner/run.overflow-compaction.test.ts` 和
    `src/agents/pi-embedded-runner/run.overflow-compaction.loop.test.ts`。
  - 这些套件验证了作用域 ID 和压缩行为是否仍然流经
    真实的 `run.ts` / `compact.ts` 路径；仅基于辅助函数的测试
    不足以替代这些集成路径。
- 池注意：
  - 基础 Vitest 配置现在默认为 `threads`。
  - 共享的 Vitest 配置还修复了 `isolate: false`，并在根项目、e2e 和 live 配置中使用了非隔离运行器。
  - 根 UI 通道保留了其 `jsdom` 设置和优化器，但现在也在共享的非隔离运行器上运行。
  - 每个 `pnpm test` 分片都从共享的 Vitest 配置继承了相同的 `threads` + `isolate: false` 默认值。
  - 共享的 `scripts/run-vitest.mjs` 启动器现在默认还为 Vitest 子 Node 进程添加 `--no-maglev`，以减少大型本地运行期间的 V8 编译颠簸。如果需要与标准 V8 行为进行比较，请设置 `OPENCLAW_VITEST_ENABLE_MAGLEV=1`。
- 快速本地迭代说明：
  - 当更改的路径清晰地映射到较小的套件时，`pnpm test:changed` 会通过作用域通道进行路由。
  - `pnpm test:max` 和 `pnpm test:changed:max` 保持相同的路由行为，只是具有更高的 Worker 上限。
  - 本地 Worker 自动扩缩现在故意保持保守，并且在主机负载平均值已经很高时会退避，因此默认情况下，多个并发 Vitest 运行造成的破坏较小。
  - 基础 Vitest 配置将项目/配置文件标记为 `forceRerunTriggers`，以便在测试接线发生变化时，更改模式下的重新运行保持正确。
  - 该配置在受支持的主机上保持 `OPENCLAW_VITEST_FS_MODULE_CACHE` 启用；如果您想要一个明确的缓存位置用于直接分析，请设置 `OPENCLAW_VITEST_FS_MODULE_CACHE_PATH=/abs/path`。
- 性能调试说明：
  - `pnpm test:perf:imports` 启用 Vitest 导入持续时间报告以及导入细分输出。
  - `pnpm test:perf:imports:changed` 将相同的分析视图限定为自 `origin/main` 以来更改的文件。
- `pnpm test:perf:changed:bench -- --ref <git-ref>` 将路由的 `test:changed` 与该提交差异的原生根项目路径进行比较，并打印墙钟时间和 macOS 最大 RSS。
- `pnpm test:perf:changed:bench -- --worktree` 通过 `scripts/test-projects.mjs` 和根 Vitest 配置路由更改的文件列表，从而对当前脏树进行基准测试。
  - `pnpm test:perf:profile:main` 为 Vitest/Vite 启动和转换开销写入主线程 CPU 分析文件。
  - `pnpm test:perf:profile:runner` 在禁用文件并行性的情况下为单元套件写入运行程序 CPU 和堆分析文件。

### E2E（网关冒烟测试）

- 命令：`pnpm test:e2e`
- 配置：`vitest.e2e.config.ts`
- 文件：`src/**/*.e2e.test.ts`、`test/**/*.e2e.test.ts`
- 运行时默认值：
  - 使用带有 `isolate: false` 的 Vitest `threads`，与仓库的其余部分保持一致。
  - 使用自适应 Workers（CI：最多 2 个，本地：默认 1 个）。
  - 默认以静默模式运行以减少控制台 I/O 开销。
- 有用的覆盖选项：
  - `OPENCLAW_E2E_WORKERS=<n>` 强制 Worker 数量（上限为 16）。
  - `OPENCLAW_E2E_VERBOSE=1` 重新启用详细的控制台输出。
- 范围：
  - 多实例网关端到端行为
  - WebSocket/HTTP 表面、节点配对和繁重的网络操作
- 预期：
  - 在 CI 中运行（当在流水线中启用时）
  - 不需要真实的密钥
  - 比单元测试有更多的变动部分（可能会更慢）

### E2E：OpenShell 后端冒烟测试

- 命令：`pnpm test:e2e:openshell`
- 文件：`test/openshell-sandbox.e2e.test.ts`
- 范围：
  - 通过 Docker 在主机上启动一个隔离的 OpenShell 网关
  - 从临时的本地 Dockerfile 创建一个沙箱
  - 通过真实的 `sandbox ssh-config` + SSH exec 测试 OpenClaw 的 OpenShell 后端
  - 通过沙箱 fs 桥接验证远程规范化文件系统行为
- 预期：
  - 仅限手动启用；不是默认 `pnpm test:e2e` 运行的一部分
  - 需要本地 `openshell` CLI 以及一个可工作的 Docker 守护进程
  - 使用隔离的 `HOME` / `XDG_CONFIG_HOME`，然后销毁测试网关和沙箱
- 有用的覆盖选项：
  - `OPENCLAW_E2E_OPENSHELL=1` 在手动运行更广泛的 e2e 套件时启用该测试
  - `OPENCLAW_E2E_OPENSHELL_COMMAND=/path/to/openshell` 指向非默认 CLI 二进制文件或包装器脚本

### Live（真实的提供商 + 真实的模型）

- 命令：`pnpm test:live`
- 配置：`vitest.live.config.ts`
- 文件：`src/**/*.live.test.ts`
- 默认：`pnpm test:live` **已启用**（设置 `OPENCLAW_LIVE_TEST=1`）
- 范围：
  - “此提供商/模型在*今天*使用真实凭据是否真的有效？”
  - 捕获提供商格式更改、工具调用怪癖、身份验证问题和速率限制行为
- 预期：
  - 设计上不具备 CI 稳定性（真实的网络、真实的提供商策略、配额、中断）
  - 花费金钱/使用速率限制
  - 优先运行缩小的子集，而不是“所有内容”
- Live 运行源 `~/.profile` 以获取缺失的 API 密钥。
- 默认情况下，Live 运行仍然隔离 `HOME` 并将配置/身份验证材料复制到临时测试主目录，以便单元装置不会改变您的真实 `~/.openclaw`。
- 仅当您有意需要 Live 测试使用您的真实主目录时，才设置 `OPENCLAW_LIVE_USE_REAL_HOME=1`。
- `pnpm test:live` 现在默认为更安静的模式：它保留 `[live] ...` 进度输出，但抑制额外的 `~/.profile` 通知并静音网引导启动日志/Bonjour 聊天。如果您想要完整的启动日志，请设置 `OPENCLAW_LIVE_TEST_QUIET=0`。
- API 密钥轮换（特定于提供商）：使用逗号/分号格式设置 `*_API_KEYS` 或 `*_API_KEY_1`，`*_API_KEY_2`（例如 `OPENAI_API_KEYS`，`ANTHROPIC_API_KEYS`，`GEMINI_API_KEYS`）或通过 `OPENCLAW_LIVE_*_KEY` 进行每次 Live 覆盖；测试在收到速率限制响应时重试。
- 进度/心跳输出：
  - Live 套件现在向 stderr 发出进度行，以便即使 Vitest 控制台捕获处于安静状态，长时间的提供商调用也能保持可见的活动状态。
  - `vitest.live.config.ts` 禁用 Vitest 控制台拦截，以便提供商/网关进度行在 Live 运行期间立即流式传输。
  - 使用 `OPENCLAW_LIVE_HEARTBEAT_MS` 调整直接模型心跳。
  - 使用 `OPENCLAW_LIVE_GATEWAY_HEARTBEAT_MS` 调整 Gateway/probe 心跳。

## 我应该运行哪个测试套件？

请参考此决策表：

- 编辑逻辑/测试：运行 `pnpm test`（如果修改较多，还需运行 `pnpm test:coverage`）
- 涉及 Gateway 网络 / WS 协议 / 配对：添加 `pnpm test:e2e`
- 调试“我的机器人已下线”/ 提供商特定故障 / 工具调用：运行范围缩小的 `pnpm test:live`

## Live：Android 节点能力扫描

- 测试：`src/gateway/android-node.capabilities.live.test.ts`
- 脚本：`pnpm android:test:integration`
- 目标：调用连接的 Android 节点当前通告的**每个命令**，并断言命令契约行为。
- 范围：
  - 预先准备/手动设置（该套件不安装/运行/配对应用）。
  - 针对所选 Android 节点的逐条命令 Gateway `node.invoke` 验证。
- 所需预先设置：
  - Android 应用已连接并与 Gateway 配对。
  - 应用保持在前台。
  - 已授予预期通过能力的权限/捕获许可。
- 可选目标覆盖：
  - `OPENCLAW_ANDROID_NODE_ID` 或 `OPENCLAW_ANDROID_NODE_NAME`。
  - `OPENCLAW_ANDROID_GATEWAY_URL` / `OPENCLAW_ANDROID_GATEWAY_TOKEN` / `OPENCLAW_ANDROID_GATEWAY_PASSWORD`。
- 完整的 Android 设置详情：[Android 应用](/en/platforms/android)

## Live：模型冒烟测试（配置文件密钥）

Live 测试分为两层，以便我们隔离故障：

- “直接模型”告诉我们提供商/模型能否使用给定密钥进行应答。
- “Gateway(网关) 冒烟测试”告诉我们完整的 Gateway(网关)+agent 管道对该模型是否有效（会话、历史、工具、沙箱策略等）。

### 第 1 层：直接模型补全（无 Gateway）

- 测试：`src/agents/models.profiles.live.test.ts`
- 目标：
  - 枚举已发现的模型
  - 使用 `getApiKeyForModel` 选择您拥有凭据的模型
  - 对每个模型运行一个小型补全（并在需要时运行针对性的回归测试）
- 如何启用：
  - `pnpm test:live`（如果直接调用 Vitest，则使用 `OPENCLAW_LIVE_TEST=1`）
- 设置 `OPENCLAW_LIVE_MODELS=modern`（或 `all`，即 modern 的别名）以实际运行此套件；否则它将跳过，以保持 `pnpm test:live` 专注于 Gateway 冒烟测试
- 如何选择模型：
  - `OPENCLAW_LIVE_MODELS=modern` 运行现代白名单 (Opus/Sonnet 4.6+, GPT-5.x + Codex, Gemini 3, GLM 4.7, MiniMax M2.7, Grok 4)
  - `OPENCLAW_LIVE_MODELS=all` 是现代白名单的别名
  - 或 `OPENCLAW_LIVE_MODELS="openai/gpt-5.4,anthropic/claude-opus-4-6,..."` (逗号分隔白名单)
- 如何选择提供商：
  - `OPENCLAW_LIVE_PROVIDERS="google,google-antigravity,google-gemini-cli"` (逗号分隔白名单)
- 密钥来源：
  - 默认：profile store 和环境变量回退
  - 设置 `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` 以强制仅使用 **profile store**
- 存在原因：
  - 将“提供商 API 损坏 / 密钥无效”与“gateway agent 管道损坏”区分开来
  - 包含小型、隔离的回归测试 (例如：OpenAI Responses/Codex Responses 推理重放 + 工具调用流程)

### 第 2 层：Gateway(网关) + dev agent 冒烟测试 (即 "@openclaw" 实际执行的操作)

- 测试：`src/gateway/gateway-models.profiles.live.test.ts`
- 目标：
  - 启动进程内 gateway
  - 创建/修补 `agent:dev:*` 会话 (每次运行覆盖模型)
  - 迭代模型与密钥并断言：
    - “有意义”的响应 (无工具)
    - 真实的工具调用有效 (读取探测)
    - 可选的额外工具探测 (执行+读取探测)
    - OpenAI 回归路径 (仅工具调用 → 后续跟进) 保持正常工作
- 探测详情 (以便快速解释故障原因)：
  - `read` 探测：测试在工作区中写入一个 nonce 文件，并要求 agent `read` 读取该文件并将 nonce 回显。
  - `exec+read` 探测：测试要求 agent `exec` 写入一个 nonce 到临时文件，然后 `read` 读回。
  - 图像探测：测试附加一个生成的 PNG (cat + 随机代码)，并期望模型返回 `cat <CODE>`。
  - 实现参考：`src/gateway/gateway-models.profiles.live.test.ts` 和 `src/gateway/live-image-probe.ts`。
- 如何启用：
  - `pnpm test:live` (如果直接调用 Vitest，则为 `OPENCLAW_LIVE_TEST=1`)
- 如何选择模型：
  - 默认：现代白名单 (Opus/Sonnet 4.6+, GPT-5.x + Codex, Gemini 3, GLM 4.7, MiniMax M2.7, Grok 4)
  - `OPENCLAW_LIVE_GATEWAY_MODELS=all` 是现代白名单的别名
  - 或者设置 `OPENCLAW_LIVE_GATEWAY_MODELS="provider/model"` (或逗号列表) 以缩小范围
- 如何选择提供商（避免“OpenRouter 一切”）：
  - `OPENCLAW_LIVE_GATEWAY_PROVIDERS="google,google-antigravity,google-gemini-cli,openai,anthropic,zai,minimax"`（逗号分隔的允许列表）
- 在此实时测试中，工具 + 图像探测始终开启：
  - `read` 探测 + `exec+read` 探测（工具压力测试）
  - 当模型广告支持图像输入时，运行图像探测
  - 流程（高层级）：
    - 测试生成一个带有“CAT”+ 随机代码的微型 PNG (`src/gateway/live-image-probe.ts`)
    - 通过 `agent` `attachments: [{ mimeType: "image/png", content: "<base64>" }]` 发送它
    - Gateway(网关) 将附件解析为 `images[]` (`src/gateway/server-methods/agent.ts` + `src/gateway/chat-attachments.ts`)
    - 嵌入式代理向模型转发多模态用户消息
    - 断言：回复包含 `cat` + 代码（OCR 容差：允许小错误）

提示：要查看您可以在机器上测试什么（以及确切的 `provider/model` id），请运行：

```bash
openclaw models list
openclaw models list --json
```

## 实时：CLI 后端冒烟测试（Claude、Codex、Gemini 或其他本地 CLI）

- 测试：`src/gateway/gateway-cli-backend.live.test.ts`
- 目标：使用本地 Gateway(网关) 后端验证 CLI + 代理管道，而不触及您的默认配置。
- 特定于后端的冒烟测试默认值与所属扩展的 `cli-backend.ts` 定义共存。
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
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_PROBE=1` 发送真实图像附件（路径被注入到提示中）。
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_ARG="--image"` 将图像文件路径作为 CLI 参数传递，而不是提示注入。
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_MODE="repeat"`（或 `"list"`）以控制在设置 `IMAGE_ARG` 时如何传递图像参数。
  - `OPENCLAW_LIVE_CLI_BACKEND_RESUME_PROBE=1` 发送第二轮并验证恢复流程。
  - `OPENCLAW_LIVE_CLI_BACKEND_MODEL_SWITCH_PROBE=0` 以禁用默认的 Claude Sonnet -> Opus 同一会话连续性探测（当选定的模型支持切换目标时，设置为 `1` 以强制启用）。

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
pnpm test:docker:live-cli-backend:codex
pnpm test:docker:live-cli-backend:gemini
```

说明：

- Docker 运行器位于 `scripts/test-live-cli-backend-docker.sh`。
- 它在仓库 CLI 镜像中以非 root `node` 用户身份运行实时 Docker-backend 冒烟测试。
- 它从所属扩展解析 CLI 冒烟测试元数据，然后将匹配的 Linux CLI 包（`@anthropic-ai/claude-code`、`@openai/codex` 或 `@google/gemini-cli`）安装到位于 `OPENCLAW_DOCKER_CLI_TOOLS_DIR`（默认：`~/.cache/openclaw/docker-cli-tools`）的缓存可写前缀中。
- 实时 CLI-backend 冒烟测试现在对 Claude、Codex 和 Gemini 执行相同的端到端流程：文本轮次、图像分类轮次，然后是通过网关 CLI 验证的 MCP `cron` 工具调用。
- Claude 的默认冒烟测试还会将会话从 Sonnet 更换为 Opus，并验证恢复的会话仍然记得之前的记录。

## 实时：ACP 绑定冒烟测试 (`/acp spawn ... --bind here`)

- 测试：`src/gateway/gateway-acp-bind.live.test.ts`
- 目标：使用实时 ACP 代理验证真实的 ACP 会话绑定流程：
  - 发送 `/acp spawn <agent> --bind here`
  - 原地绑定一个合成消息渠道会话
  - 在同一会话上发送正常的后续消息
  - 验证后续消息出现在绑定的 ACP 会话记录中
- 启用：
  - `pnpm test:live src/gateway/gateway-acp-bind.live.test.ts`
  - `OPENCLAW_LIVE_ACP_BIND=1`
- 默认值：
  - Docker 中的 ACP 代理：`claude,codex,gemini`
  - 用于直接 `pnpm test:live ...` 的 ACP 代理：`claude`
  - 合成渠道：Slack 私信风格的会话上下文
  - ACP 后端：`acpx`
- 覆盖项：
  - `OPENCLAW_LIVE_ACP_BIND_AGENT=claude`
  - `OPENCLAW_LIVE_ACP_BIND_AGENT=codex`
  - `OPENCLAW_LIVE_ACP_BIND_AGENT=gemini`
  - `OPENCLAW_LIVE_ACP_BIND_AGENTS=claude,codex,gemini`
  - `OPENCLAW_LIVE_ACP_BIND_AGENT_COMMAND='npx -y @agentclientprotocol/claude-agent-acp@<version>'`
- 说明：
  - 此通道使用网关 `chat.send` 表面以及仅管理员可见的合成源路由字段，以便测试可以附加消息渠道上下文而无需模拟外部投递。
  - 当 `OPENCLAW_LIVE_ACP_BIND_AGENT_COMMAND` 未设置时，测试使用嵌入式 `acpx` 插件的内置代理注册表来获取所选 ACP 线束代理。

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

- Docker 运行器位于 `scripts/test-live-acp-bind-docker.sh`。
- 默认情况下，它会依次对所有支持的实时 CLI 代理运行 ACP 绑定冒烟测试：`claude`，`codex`，然后是 `gemini`。
- 使用 `OPENCLAW_LIVE_ACP_BIND_AGENTS=claude`，`OPENCLAW_LIVE_ACP_BIND_AGENTS=codex` 或 `OPENCLAW_LIVE_ACP_BIND_AGENTS=gemini` 来缩小范围。
- 它获取 `~/.profile`，将匹配的 CLI 认证材料暂存到容器中，将 `acpx` 安装到可写的 npm 前缀中，然后安装所需的实时 CLI（`@anthropic-ai/claude-code`，`@openai/codex` 或 `@google/gemini-cli`）（如果缺失）。
- 在 Docker 内部，运行器设置 `OPENCLAW_LIVE_ACP_BIND_ACPX_COMMAND=$HOME/.npm-global/bin/acpx`，以便 acpx 使来自所获取配置文件的提供商环境变量可用于子线束 CLI。

### 推荐的实时配方

狭窄且明确的允许列表速度最快且最不稳定：

- 单个模型，直连（无网关）：
  - `OPENCLAW_LIVE_MODELS="openai/gpt-5.4" pnpm test:live src/agents/models.profiles.live.test.ts`

- 单个模型，网关冒烟测试：
  - `OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.4" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

- 跨多个提供商的工具调用：
  - `OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.4,anthropic/claude-opus-4-6,google/gemini-3-flash-preview,zai/glm-4.7,minimax/MiniMax-M2.7" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

- Google 重点（Gemini API 密钥 + Antigravity）：
  - Gemini（API 密钥）：`OPENCLAW_LIVE_GATEWAY_MODELS="google/gemini-3-flash-preview" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`
  - Antigravity（OAuth）：`OPENCLAW_LIVE_GATEWAY_MODELS="google-antigravity/claude-opus-4-6-thinking,google-antigravity/gemini-3-pro-high" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

注意事项：

- `google/...` 使用 Gemini API（API 密钥）。
- `google-antigravity/...` 使用 Antigravity OAuth 网桥（Cloud Code Assist 风格的代理端点）。
- `google-gemini-cli/...` 使用您机器上的本地 Gemini CLI（单独的认证 + 工具怪癖）。
- Gemini API 与 Gemini CLI：
  - API：OpenClaw 通过 HTTP 调用 Google 托管的 Gemini API（API 密钥 / 配置文件认证）；这是大多数用户所说的“Gemini”的含义。
  - CLI：OpenClaw 调用本地 `gemini` 二进制文件；它有自己的身份验证，并且行为可能有所不同（流式传输/工具支持/版本偏差）。

## Live：模型矩阵（我们涵盖的内容）

没有固定的“CI 模型列表”（Live 是可选参与的），但这些是在开发机器上使用密钥定期覆盖的**推荐**模型。

### 现代冒烟测试集（工具调用 + 图像）

这是我们期望保持正常工作的“通用模型”运行：

- OpenAI（非 Codex）：`openai/gpt-5.4`（可选：`openai/gpt-5.4-mini`）
- OpenAI Codex：`openai-codex/gpt-5.4`
- Anthropic：`anthropic/claude-opus-4-6`（或 `anthropic/claude-sonnet-4-6`）
- Google (Gemini API)：`google/gemini-3.1-pro-preview` 和 `google/gemini-3-flash-preview`（避免较旧的 Gemini 2.x 模型）
- Google (Antigravity)：`google-antigravity/claude-opus-4-6-thinking` 和 `google-antigravity/gemini-3-flash`
- Z.AI (GLM)：`zai/glm-4.7`
- MiniMax：`minimax/MiniMax-M2.7`

运行包含工具和图像的网关冒烟测试：
`OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.4,openai-codex/gpt-5.4,anthropic/claude-opus-4-6,google/gemini-3.1-pro-preview,google/gemini-3-flash-preview,google-antigravity/claude-opus-4-6-thinking,google-antigravity/gemini-3-flash,zai/glm-4.7,minimax/MiniMax-M2.7" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

### 基线：工具调用（Read + 可选 Exec）

每个提供商系列至少选择一个：

- OpenAI：`openai/gpt-5.4`（或 `openai/gpt-5.4-mini`）
- Anthropic：`anthropic/claude-opus-4-6`（或 `anthropic/claude-sonnet-4-6`）
- Google：`google/gemini-3-flash-preview`（或 `google/gemini-3.1-pro-preview`）
- Z.AI (GLM)：`zai/glm-4.7`
- MiniMax：`minimax/MiniMax-M2.7`

可选的额外覆盖（最好有）：

- xAI：`xai/grok-4`（或最新可用版本）
- Mistral：`mistral/`…（选择一个你已启用的支持“工具”的模型）
- Cerebras：`cerebras/`…（如果你有访问权限）
- LM Studio：`lmstudio/`…（本地；工具调用取决于 API 模式）

### Vision：图像发送（附件 → 多模态消息）

在 `OPENCLAW_LIVE_GATEWAY_MODELS` 中至少包含一个支持图像的模型（Claude/Gemini/OpenAI 支持视觉的变体等）以测试图像探测功能。

### 聚合器 / 备用网关

如果你启用了密钥，我们也支持通过以下方式进行测试：

- OpenRouter：`openrouter/...`（数百个模型；使用 `openclaw models scan` 查找支持工具和图像的候选模型）
- OpenCode：Zen 使用 `opencode/...`，Go 使用 `opencode-go/...`（通过 `OPENCODE_API_KEY` / `OPENCODE_ZEN_API_KEY` 进行身份验证）

您可以包含在实时矩阵中的更多提供商（如果您有凭据/配置）：

- 内置：`openai`、`openai-codex`、`anthropic`、`google`、`google-vertex`、`google-antigravity`、`google-gemini-cli`、`zai`、`openrouter`、`opencode`、`opencode-go`、`xai`、`groq`、`cerebras`、`mistral`、`github-copilot`
- 通过 `models.providers`（自定义端点）：`minimax`（云/API），以及任何兼容 OpenAI/Anthropic 的代理（LM Studio、vLLM、LiteLLM 等）

提示：不要尝试在文档中硬编码“所有模型”。权威列表是 `discoverModels(...)` 在您的机器上返回的内容加上任何可用的密钥。

## 凭据（切勿提交）

实时测试发现凭据的方式与 CLI 相同。实际含义如下：

- 如果 CLI 可以工作，实时测试应该能找到相同的密钥。
- 如果实时测试提示“无凭据”，请按照调试 `openclaw models list` / 模型选择的方式进行调试。

- 每个代理的身份验证配置文件：`~/.openclaw/agents/<agentId>/agent/auth-profiles.json`（这就是实时测试中“配置文件密钥”的含义）
- 配置：`~/.openclaw/openclaw.json`（或 `OPENCLAW_CONFIG_PATH`）
- 旧版状态目录：`~/.openclaw/credentials/`（如果存在，会复制到暂存的实时主目录中，但不是主要的配置文件密钥存储）
- 默认情况下，实时本地运行会将活动配置、每个代理的 `auth-profiles.json` 文件、旧的 `credentials/` 以及受支持的外部 CLI 身份验证目录复制到一个临时测试主目录中；暂存的实时主目录会跳过 `workspace/` 和 `sandboxes/`，并且 `agents.*.workspace` / `agentDir` 路径覆盖项会被剥离，以便探测不会干扰您真实的主机工作区。

如果您想依赖环境变量键（例如在您的 `~/.profile` 中导出的），请在 `source ~/.profile` 之后运行本地测试，或使用下面的 Docker 运行器（它们可以将 `~/.profile` 挂载到容器中）。

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
  - 执行捆绑的 comfy 图像、视频和 `music_generate` 路径
  - 除非配置了 `models.providers.comfy.<capability>`，否则跳过每个功能
  - 在更改 comfy 工作流提交、轮询、下载或插件注册后有用

## 图像生成实时

- 测试：`src/image-generation/runtime.live.test.ts`
- 命令：`pnpm test:live src/image-generation/runtime.live.test.ts`
- 测试框架：`pnpm test:live:media image`
- 范围：
  - 枚举每个已注册的图像生成提供商插件
  - 在探测之前从您的登录 shell (`~/.profile`) 加载缺失的提供商环境变量
  - 默认情况下优先使用实时/环境 API 键而非存储的身份验证配置文件，因此 `auth-profiles.json` 中的陈旧测试键不会掩盖真实的 shell 凭据
  - 跳过没有可用身份验证/配置文件/模型的提供商
  - 通过共享运行时功能运行标准图像生成变体：
    - `google:flash-generate`
    - `google:pro-generate`
    - `google:pro-edit`
    - `openai:default-generate`
- 当前涵盖的捆绑提供商：
  - `openai`
  - `google`
- 可选的缩小范围：
  - `OPENCLAW_LIVE_IMAGE_GENERATION_PROVIDERS="openai,google"`
  - `OPENCLAW_LIVE_IMAGE_GENERATION_MODELS="openai/gpt-image-1,google/gemini-3.1-flash-image-preview"`
  - `OPENCLAW_LIVE_IMAGE_GENERATION_CASES="google:flash-generate,google:pro-edit"`
- 可选的身份验证行为：
  - `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` 以强制配置文件存储身份验证并忽略仅限环境的覆盖

## 音乐生成实时测试

- 测试：`extensions/music-generation-providers.live.test.ts`
- 启用：`OPENCLAW_LIVE_TEST=1 pnpm test:live -- extensions/music-generation-providers.live.test.ts`
- 测试工具：`pnpm test:live:media music`
- 范围：
  - 执行共享的捆绑音乐生成提供商路径
  - 目前涵盖 Google 和 MiniMax
  - 在探测之前从您的登录 Shell (`~/.profile`) 加载提供商环境变量
  - 默认优先使用实时/环境 API 密钥而非存储的身份验证配置文件，因此 `auth-profiles.json` 中的过期测试密钥不会掩盖真实的 Shell 凭据
  - 跳过没有可用身份验证/配置文件/模型的提供商
  - 在可用时运行两种声明的运行时模式：
    - `generate` 配合仅提示词输入
    - 当提供商声明 `capabilities.edit.enabled` 时运行 `edit`
  - 当前共享通道覆盖范围：
    - `google`：`generate`，`edit`
    - `minimax`：`generate`
    - `comfy`：单独的 Comfy 实时文件，而非此共享扫描
- 可选的范围缩小：
  - `OPENCLAW_LIVE_MUSIC_GENERATION_PROVIDERS="google,minimax"`
  - `OPENCLAW_LIVE_MUSIC_GENERATION_MODELS="google/lyria-3-clip-preview,minimax/music-2.5+"`
- 可选的身份验证行为：
  - `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` 以强制配置文件存储身份验证并忽略仅限环境的覆盖

## 视频生成实时测试

- 测试：`extensions/video-generation-providers.live.test.ts`
- 启用：`OPENCLAW_LIVE_TEST=1 pnpm test:live -- extensions/video-generation-providers.live.test.ts`
- 测试工具：`pnpm test:live:media video`
- 范围：
  - 执行共享的捆绑视频生成提供商路径
  - 在探测之前从您的登录 Shell (`~/.profile`) 加载提供商环境变量
  - 默认优先使用实时/环境 API 密钥而非存储的身份验证配置文件，因此 `auth-profiles.json` 中的过期测试密钥不会掩盖真实的 Shell 凭据
  - 跳过没有可用身份验证/配置文件/模型的提供商
  - 在可用时运行两种声明的运行时模式：
    - `generate` 配合仅提示词输入
    - 当提供商声明了 `capabilities.imageToVideo.enabled` 并且所选提供商/模型在共享扫描中接受基于缓冲区的本地图像输入时，运行 `imageToVideo`
    - 当提供商声明了 `capabilities.videoToVideo.enabled` 并且所选提供商/模型在共享扫描中接受基于缓冲区的本地视频输入时，运行 `videoToVideo`
  - 当前在共享扫描中已声明但跳过的 `imageToVideo` 提供商：
    - `vydra`，因为捆绑的 `veo3` 仅支持文本，而捆绑的 `kling` 需要远程图像 URL
  - 特定于提供商的 Vydra 覆盖范围：
    - `OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_VYDRA_VIDEO=1 pnpm test:live -- extensions/vydra/vydra.live.test.ts`
    - 该文件运行 `veo3` 文本生成视频，外加一条默认使用远程图像 URL 固件的 `kling` 路径
  - 当前 `videoToVideo` 实时覆盖范围：
    - `runway` 仅当所选模型为 `runway/gen4_aleph` 时
  - 当前在共享扫描中已声明但跳过的 `videoToVideo` 提供商：
    - `alibaba`、`qwen`、`xai`，因为这些路径目前需要远程 `http(s)` / MP4 参考 URL
    - `google`，因为当前的共享 Gemini/Veo 路径使用基于本地缓冲区的输入，而该路径在共享扫描中不被接受
    - `openai`，因为当前的共享路径缺乏特定于组织的视频重绘/混音访问权限保证
- 可选范围缩小：
  - `OPENCLAW_LIVE_VIDEO_GENERATION_PROVIDERS="google,openai,runway"`
  - `OPENCLAW_LIVE_VIDEO_GENERATION_MODELS="google/veo-3.1-fast-generate-preview,openai/sora-2,runway/gen4_aleph"`
- 可选认证行为：
  - `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` 强制执行配置文件存储认证，并忽略仅限环境变量的覆盖设置

## 媒体实时测试工具

- 命令：`pnpm test:live:media`
- 目的：
  - 通过一个仓库原生入口运行共享的图像、音乐和视频实时测试套件
  - 自动从 `~/.profile` 加载缺失的提供商环境变量
  - 默认情况下自动将每个套件缩小至当前拥有可用认证的提供商
  - 重用 `scripts/test-live.mjs`，因此心跳和静默模式行为保持一致
- 示例：
  - `pnpm test:live:media`
  - `pnpm test:live:media image video --providers openai,google,minimax`
  - `pnpm test:live:media video --video-providers openai,runway --all-providers`
  - `pnpm test:live:media music --quiet`

## Docker 运行器（可选的“在 Linux 下工作”检查）

这些 Docker 运行器分为两大类：

- Live-模型 运行器：`test:docker:live-models` 和 `test:docker:live-gateway` 仅在仓库 Docker 映像（`src/agents/models.profiles.live.test.ts` 和 `src/gateway/gateway-models.profiles.live.test.ts`）内运行其匹配的配置键 live 文件，并挂载本地配置目录和工作区（如果挂载了 `~/.profile` 也会获取）。匹配的本地入口点是 `test:live:models-profiles` 和 `test:live:gateway-profiles`。
- Docker live 运行器默认使用较小的 smoke 上限，以便完整的 Docker 扫描保持实用：
  `test:docker:live-models` 默认为 `OPENCLAW_LIVE_MAX_MODELS=12`，且
  `test:docker:live-gateway` 默认为 `OPENCLAW_LIVE_GATEWAY_SMOKE=1`、
  `OPENCLAW_LIVE_GATEWAY_MAX_MODELS=8`、
  `OPENCLAW_LIVE_GATEWAY_STEP_TIMEOUT_MS=45000` 和
  `OPENCLAW_LIVE_GATEWAY_MODEL_TIMEOUT_MS=90000`。当您
  明确需要更大的详尽扫描时，请覆盖这些环境变量。
- `test:docker:all` 通过 `test:docker:live-build` 构建一次 live Docker 映像，然后在两个 live Docker 通道中重复使用它。
- 容器 smoke 运行器：`test:docker:openwebui`、`test:docker:onboard`、`test:docker:gateway-network`、`test:docker:mcp-channels` 和 `test:docker:plugins` 启动一个或多个真实容器并验证更高级别的集成路径。

Live-模型 Docker 运行器还仅绑定挂载所需的 CLI 认证主目录（当运行未缩小时，则挂载所有支持的目录），然后在运行前将其复制到容器主目录中，以便外部 CLI OAuth 可以刷新令牌而无需改变主机认证存储：

- Direct 模型：`pnpm test:docker:live-models`（脚本：`scripts/test-live-models-docker.sh`）
- ACP 绑定 smoke：`pnpm test:docker:live-acp-bind`（脚本：`scripts/test-live-acp-bind-docker.sh`）
- CLI 后端 smoke：`pnpm test:docker:live-cli-backend`（脚本：`scripts/test-live-cli-backend-docker.sh`）
- Gateway(网关) + 开发代理：`pnpm test:docker:live-gateway`（脚本：`scripts/test-live-gateway-models-docker.sh`）
- Open WebUI 实时冒烟测试：`pnpm test:docker:openwebui`（脚本：`scripts/e2e/openwebui-docker.sh`）
- 新手引导向导（TTY，完整脚手架）：`pnpm test:docker:onboard`（脚本：`scripts/e2e/onboard-docker.sh`）
- Gateway(网关) 网络（两个容器，WS 身份验证 + 健康检查）：`pnpm test:docker:gateway-network`（脚本：`scripts/e2e/gateway-network-docker.sh`）
- MCP 渠道桥接（已配置 Gateway(网关) + stdio 桥接 + 原始 Claude 通知帧冒烟测试）：`pnpm test:docker:mcp-channels`（脚本：`scripts/e2e/mcp-channels-docker.sh`）
- 插件（安装冒烟测试 + `/plugin` 别名 + Claude 包重启语义）：`pnpm test:docker:plugins`（脚本：`scripts/e2e/plugins-docker.sh`）

实时模型 Docker 运行器也会将当前检出的代码以只读方式绑定挂载，并将其暂存到容器内的临时工作目录中。这既保持了运行时镜像的精简，又能针对您的本地源代码/配置运行 Vitest。暂存步骤会跳过大型仅限本地的缓存和应用构建输出，例如 `.pnpm-store`、`.worktrees`、`__openclaw_vitest__` 和应用本地的 `.build` 或 Gradle 输出目录，从而避免 Docker 实时运行花费数分钟复制特定于机器的构件。它们还设置了 `OPENCLAW_SKIP_CHANNELS=1`，这样 Gateway(网关) 实时探针就不会在容器内启动真正的 Telegram/Discord 等渠道工作进程。`test:docker:live-models` 仍然会运行 `pnpm test:live`，因此当您需要从该 Docker 通道缩小或排除 Gateway(网关) 实时覆盖范围时，也请传入 `OPENCLAW_LIVE_GATEWAY_*`。`test:docker:openwebui` 是一个更高级别的兼容性冒烟测试：它启动一个启用了 OpenAI 兼容 HTTP 端点的 OpenClaw Gateway(网关) 容器，针对该 Gateway(网关) 启动一个固定的 Open WebUI 容器，通过 Open WebUI 登录，验证 `/api/models` 公开了 `openclaw/default`，然后通过 Open WebUI 的 `/api/chat/completions` 代理发送真正的聊天请求。首次运行可能会明显变慢，因为 Docker 可能需要拉取 Open WebUI 镜像，而 Open WebUI 可能需要完成其自身的冷启动设置。此通道期望一个可用的实时模型密钥，而 `OPENCLAW_PROFILE_FILE`（默认为 `~/.profile`）是在 Docker 化运行中提供它的主要方式。成功的运行会打印出一个小的 JSON 载荷，例如 `{ "ok": true, "模型": "openclaw/default", ... }`。`test:docker:mcp-channels` 是有意的确定性测试，不需要真正的 Telegram、Discord 或 iMessage 账户。它会启动一个已播种的 Gateway(网关) 容器，启动一个生成 `openclaw mcp serve` 的第二个容器，然后验证路由对话发现、脚本读取、附件元数据、实时事件队列行为、出站发送路由，以及通过真实的 stdio MCP 网桥进行的 Claude 风格渠道 + 权限通知。通知检查会直接检查原始 stdio MCP 帧，因此冒烟测试验证的是网桥实际发出的内容，而不仅仅是特定客户端 SDK 恰好显示的内容。

手动 ACP 自然语言线程冒烟测试（非 CI）：

- `bun scripts/dev/discord-acp-plain-language-smoke.ts --channel <discord-channel-id> ...`
- 保留此脚本用于回归/调试工作流。ACP 线程路由验证可能再次需要它，因此请勿将其删除。

有用的环境变量：

- `OPENCLAW_CONFIG_DIR=...`（默认值：`~/.openclaw`）挂载到 `/home/node/.openclaw`
- `OPENCLAW_WORKSPACE_DIR=...`（默认值：`~/.openclaw/workspace`）挂载到 `/home/node/.openclaw/workspace`
- `OPENCLAW_PROFILE_FILE=...`（默认值：`~/.profile`）挂载到 `/home/node/.profile` 并在运行测试之前获取
- `OPENCLAW_DOCKER_CLI_TOOLS_DIR=...`（默认值：`~/.cache/openclaw/docker-cli-tools`）挂载到 `/home/node/.npm-global`，用于 Docker 内部缓存的 CLI 安装
- `$HOME` 下的外部 CLI 认证目录/文件以只读方式挂载到 `/host-auth...` 下，然后在测试开始前复制到 `/home/node/...`
  - 默认目录：`.minimax`
  - 默认文件：`~/.codex/auth.json`、`~/.codex/config.toml`、`.claude.json`、`~/.claude/.credentials.json`、`~/.claude/settings.json`、`~/.claude/settings.local.json`
  - 缩小的提供商运行仅挂载从 `OPENCLAW_LIVE_PROVIDERS` / `OPENCLAW_LIVE_GATEWAY_PROVIDERS` 推断出的所需目录/文件
  - 使用 `OPENCLAW_DOCKER_AUTH_DIRS=all`、`OPENCLAW_DOCKER_AUTH_DIRS=none` 或类似 `OPENCLAW_DOCKER_AUTH_DIRS=.claude,.codex` 的逗号列表手动覆盖
- 使用 `OPENCLAW_LIVE_GATEWAY_MODELS=...` / `OPENCLAW_LIVE_MODELS=...` 缩小运行范围
- 使用 `OPENCLAW_LIVE_GATEWAY_PROVIDERS=...` / `OPENCLAW_LIVE_PROVIDERS=...` 在容器内过滤提供商
- `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` 确保凭据来自配置文件存储（而非环境变量）
- `OPENCLAW_OPENWEBUI_MODEL=...` 用于选择网关为 Open WebUI 冒烟测试暴露的模型
- `OPENCLAW_OPENWEBUI_PROMPT=...` 用于覆盖 Open WebUI 冒烟测试使用的 nonce 检查提示
- `OPENWEBUI_IMAGE=...` 用于覆盖固定的 Open WebUI 镜像标签

## 文档健全性检查

文档编辑后运行文档检查：`pnpm check:docs`。
当您还需要页面内标题检查时，运行完整的 Mintlify 锚点验证：`pnpm docs:check-links:anchors`。

## 离线回归（CI 安全）

这些是没有真实提供商的“真实管道”回归测试：

- Gateway(网关) 工具调用（模拟 OpenAI，真实 gateway + agent 循环）：`src/gateway/gateway.test.ts`（案例：“通过 gateway agent 循环端到端运行模拟 OpenAI 工具调用”）
- Gateway(网关) 向导（WS `wizard.start`/`wizard.next`，写入配置 + 强制执行身份验证）：`src/gateway/gateway.test.ts`（案例：“通过 ws 运行向导并写入身份验证令牌配置”）

## Agent 可靠性评估（Skills）

我们已经有一些行为类似“agent 可靠性评估”的 CI 安全测试：

- 通过真实的 gateway + agent 循环进行模拟工具调用（`src/gateway/gateway.test.ts`）。
- 验证会话连线和配置效果的端到端向导流程（`src/gateway/gateway.test.ts`）。

Skills 仍然缺失的内容（参见 [Skills](/en/tools/skills)）：

- **决策：** 当 Skills 在提示词中列出时，agent 是否会选择正确的 Skill（或避免不相关的 Skill）？
- **合规性：** agent 是否在使用前读取 `SKILL.md` 并遵循所需的步骤/参数？
- **工作流契约：** 断言工具顺序、会话历史继承和沙箱边界的多轮场景。

未来的评估应首先保持确定性：

- 使用模拟提供商来断言工具调用和顺序、Skill 文件读取以及会话连线的场景运行器。
- 一套专注于 Skills 的小型场景（使用与避免、 gating、提示词注入）。
- 仅在 CI 安全套件就位后，才进行可选的实时评估（需手动选择、环境限制）。

## 契约测试（插件和渠道结构）

契约测试验证每个注册的插件和渠道是否符合其接口契约。它们遍历所有发现的插件并运行一套结构和行为断言。默认的 `pnpm test` 单元车道会故意跳过这些共享的 seam 和 smoke 文件；当您接触共享渠道或提供商表面时，请显式运行契约命令。

### 命令

- 所有契约：`pnpm test:contracts`
- 仅渠道契约：`pnpm test:contracts:channels`
- 仅限提供商合约：`pnpm test:contracts:plugins`

### 渠道合约

位于 `src/channels/plugins/contracts/*.contract.test.ts`：

- **plugin** - 基本插件形状（id，name，capabilities）
- **setup** - 设置向导弹约
- **会话-binding** - 会话绑定行为
- **outbound-payload** - 消息载荷结构
- **inbound** - 入站消息处理
- **actions** - 渠道操作处理器
- **threading** - 线程 ID 处理
- **directory** - 目录/名册 API
- **group-policy** - 组策略执行

### 提供商状态合约

位于 `src/plugins/contracts/*.contract.test.ts`。

- **status** - 渠道状态探测
- **registry** - 插件注册表形状

### 提供商合约

位于 `src/plugins/contracts/*.contract.test.ts`：

- **auth** - 认证流程合约
- **auth-choice** - 认证选择/筛选
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

合约测试在 CI 中运行，不需要真实的 API 密钥。

## 添加回归测试（指导）

当您修复在 live 中发现的提供商/模型问题时：

- 如果可能，添加 CI 安全的回归测试（模拟/存根提供商，或捕获精确的请求形状转换）
- 如果它本质上是仅限 live 的（速率限制、认证策略），请保持 live 测试狭窄并通过环境变量选择加入
- 优先定位捕获错误的最小层：
  - 提供商请求转换/重放错误 → 直接模型测试
  - 网关会话/历史/工具管道错误 → 网关 live 烟雾测试或 CI 安全网关模拟测试
- SecretRef 遍历防护：
  - `src/secrets/exec-secret-ref-id-parity.test.ts` 从注册表元数据（`listSecretTargetRegistryEntries()`）为每个 SecretRef 类派生一个采样目标，然后断言遍历段执行 ID 被拒绝。
  - 如果在 `src/secrets/target-registry-data.ts` 中添加新的 `includeInPlan` SecretRef 目标系列，请更新该测试中的 `classifyTargetClass`。该测试故意在未分类的目标 ID 上失败，以便新类无法被静默跳过。
