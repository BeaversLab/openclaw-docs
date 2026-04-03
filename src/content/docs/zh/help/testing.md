---
summary: "测试套件：单元/e2e/实时套件，Docker 运行器，以及每个测试涵盖的内容"
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

- 完整门控（推送前预期）：`pnpm build && pnpm check && pnpm test`
- 在配置较高的机器上更快的本地完整套件运行：`pnpm test:max`

当您修改测试或需要额外的信心时：

- 覆盖率门控：`pnpm test:coverage`
- E2E 套件：`pnpm test:e2e`

调试真实提供商/模型时（需要真实凭证）：

- 实时套件（模型 + 网关工具/镜像探测）：`pnpm test:live`
- 安静地针对单个实时文件：`pnpm test:live -- src/agents/models.profiles.live.test.ts`

提示：当您只需要一个失败案例时，优先通过下面描述的 allowlist 环境变量来缩小实时测试范围。

## 测试套件（在哪里运行什么）

可以将这些套件视为“真实感递增”（以及不稳定性/成本递增）：

### 单元 / 集成（默认）

- 命令：`pnpm test`
- 配置：`scripts/test-parallel.mjs`（运行 `vitest.unit.config.ts`、`vitest.extensions.config.ts`、`vitest.gateway.config.ts`）
- 文件：`src/**/*.test.ts`，捆绑插件 `**/*.test.ts`
- 范围：
  - 纯单元测试
  - 进程内集成测试（网关认证、路由、工具、解析、配置）
  - 已知错误的确定性回归测试
- 预期：
  - 在 CI 中运行
  - 不需要真实的密钥
  - 应该快速且稳定
- 调度器说明：
  - `pnpm test` 现在保留一个小型的已检入行为清单，用于真正的池/隔离覆盖，以及一个单独的计时快照，用于最慢的单元文件。
  - 仅限扩展的本地运行现在也使用已检入的扩展计时快照，以及在高内存主机上使用稍微粗糙的共享批处理目标，因此当两次测量的共享运行足够时，共享扩展通道可以避免生成额外的批处理。
  - 高内存本地扩展共享批处理现在的 Worker 上限也比以前略高，这缩短了剩余的两个共享扩展批处理，而无需更改隔离扩展通道。
  - 高内存本地渠道运行现在重用已检入的渠道计时快照，将共享渠道通道拆分为几个测量的批处理，而不是一个长共享 Worker。
  - 高内存本地渠道共享批次也以比共享单元批次稍低的工作线程上限运行，这有助于在隔离渠道通道已经运行时，避免针对性渠道重跑出现 CPU 过度订阅。
  - 针对性本地渠道重跑现在会提前一点开始拆分共享渠道工作，这可以防止中等规模的针对性重跑在关键路径上留下一个超大的共享渠道批次。
  - 针对性本地单元重跑还会将中等规模的共享单元选择拆分为经过测量的批次，这有助于大型集中式重跑并行运行，而不是等待在一个长长的共享单元通道后面。
  - 高内存本地多表面运行也使用稍粗糙的共享 `unit-fast` 批次，以便混合规划器在后续表面能够并行之前，减少花在启动额外共享单元工作线程上的时间。
  - 共享单元、扩展、渠道和网关运行都保留在 Vitest `forks` 上。
  - 包装器在 `test/fixtures/test-parallel.behavior.json` 中明确保留了经过测量的分叉隔离异常和繁重的单例通道。
  - 包装器将最重的经过测量的文件剥离到专用通道中，而不是依赖不断增长的手动维护的排除列表。
  - CLI 启动基准测试现在有不同的保存输出：`pnpm test:startup:bench:smoke` 将目标烟雾测试产物写入 `.artifacts/cli-startup-bench-smoke.json`，`pnpm test:startup:bench:save` 将完整套件产物写入 `.artifacts/cli-startup-bench-all.json` 并附带 `runs=5` 和 `warmup=1`，而 `pnpm test:startup:bench:update` 则使用 `runs=5` 和 `warmup=1` 刷新 `test/fixtures/cli-startup-bench.json` 处的已检入夹具（fixture）。
  - 对于仅限本地的单层运行，单元、扩展和渠道共享车道可以重叠其隔离热点，而不是在一个串行前缀后等待。
  - 对于多表面的本地运行，包装器保持共享表面阶段的顺序，但同一共享阶段内的批次现在会一起展开，延迟的隔离工作可以与下一个共享阶段重叠，并且多余的 `unit-fast` 余量现在会提前启动该延迟工作，而不是让这些槽位闲置。
  - 在主要的套件形状更改后，使用 `pnpm test:perf:update-timings` 和 `pnpm test:perf:update-timings:extensions` 刷新时序快照。
- 嵌入式运行器说明：
  - 当您更改消息工具发现输入或压缩运行时上下文时，请保持两个级别的覆盖率。
  - 为纯路由/规范化边界添加有针对性的辅助回归测试。
  - 同时保持嵌入式运行器集成套件的健康：
    `src/agents/pi-embedded-runner/compact.hooks.test.ts`，
    `src/agents/pi-embedded-runner/run.overflow-compaction.test.ts`，以及
    `src/agents/pi-embedded-runner/run.overflow-compaction.loop.test.ts`。
  - 这些套件验证作用域 ID 和压缩行为仍然流经真实的 `run.ts` / `compact.ts` 路径；仅辅助的测试不足以替代这些集成路径。
- 池说明：
  - 基础 Vitest 配置仍默认为 `forks`。
  - 单元、渠道、扩展和网关包装车道均默认为 `forks`。
  - 单元、渠道和扩展配置默认为 `isolate: false` 以实现更快的文件启动。
  - `pnpm test` 还会在包装器级别传递 `--isolate=false`。
  - 使用 `OPENCLAW_TEST_ISOLATE=1 pnpm test` 重新启用 Vitest 文件隔离。
  - `OPENCLAW_TEST_NO_ISOLATE=0` 或 `OPENCLAW_TEST_NO_ISOLATE=false` 也会强制隔离运行。
- 快速本地迭代说明：
  - `pnpm test:changed` 使用 `--changed origin/main` 运行包装器。
  - `pnpm test:changed:max` 保持相同的更改文件过滤器，但使用包装器的激进本地规划器配置。
  - `pnpm test:max` 为完整的本地运行公开了相同的规划器配置。
  - 在支持的本地 Node 版本（包括 Node 25）上，普通配置文件可以使用顶级通道并行性。当您希望进行更激进的本地运行时，`pnpm test:max` 仍然会推动规划器更加努力。
  - 基础 Vitest 配置将包装器清单/配置文件标记为 `forceRerunTriggers`，以便在调度器输入发生更改时，更改模式下的重新运行保持正确。
  - 包装器在受支持的主机上保持 `OPENCLAW_VITEST_FS_MODULE_CACHE` 启用，但分配了一个通道本地的 `OPENCLAW_VITEST_FS_MODULE_CACHE_PATH`，以免并发的 Vitest 进程在一个共享的实验性缓存目录上发生竞争。
  - 如果您想要一个用于直接单次运行分析的显式缓存位置，请设置 `OPENCLAW_VITEST_FS_MODULE_CACHE_PATH=/abs/path`。
- 性能调试说明：
  - `pnpm test:perf:imports` 启用 Vitest 导入持续时间报告以及导入细分输出。
  - `pnpm test:perf:imports:changed` 将相同的分析视图范围限定为自 `origin/main` 以来更改的文件。
  - `pnpm test:perf:profile:main` 为 Vitest/Vite 启动和转换开销写入主线程 CPU 配置文件。
  - `pnpm test:perf:profile:runner` 为单元套件写入运行器 CPU 和堆配置文件，其中文件并行性已禁用。

### E2E（网关冒烟测试）

- 命令：`pnpm test:e2e`
- 配置：`vitest.e2e.config.ts`
- 文件：`src/**/*.e2e.test.ts`、`test/**/*.e2e.test.ts`
- 运行时默认值：
  - 使用 Vitest `forks` 进行确定性的跨文件隔离。
  - 使用自适应工作线程（CI：最多 2 个，本地：默认 1 个）。
  - 默认情况下以静默模式运行，以减少控制台 I/O 开销。
- 有用的覆盖：
  - `OPENCLAW_E2E_WORKERS=<n>` 用于强制设置工作线程数量（上限为 16）。
  - `OPENCLAW_E2E_VERBOSE=1` 用于重新启用详细控制台输出。
- 范围：
  - 多实例网关端到端行为
  - WebSocket/HTTP 表面、节点配对和更繁重的网络
- 预期：
  - 在 CI 中运行（在管道中启用时）
  - 不需要真实的密钥
  - 比单元测试有更多的活动部件（可能会更慢）

### E2E：OpenShell 后端冒烟测试

- 命令：`pnpm test:e2e:openshell`
- 文件：`test/openshell-sandbox.e2e.test.ts`
- 范围：
  - 通过 Docker 在主机上启动隔离的 OpenShell 网关
  - 从临时本地 Dockerfile 创建沙箱
  - 通过真实的 `sandbox ssh-config` + SSH exec 测试 OpenClaw 的 OpenShell 后端
  - 通过沙箱 fs 桥验证远程规范文件系统行为
- 期望：
  - 仅限选择加入；不是默认 `pnpm test:e2e` 运行的一部分
  - 需要本地 `openshell` CLI 以及可运行的 Docker 守护进程
  - 使用隔离的 `HOME` / `XDG_CONFIG_HOME`，然后销毁测试网关和沙箱
- 有用的覆盖：
  - 手动运行更广泛的 e2e 套件时，使用 `OPENCLAW_E2E_OPENSHELL=1` 启用测试
  - 使用 `OPENCLAW_E2E_OPENSHELL_COMMAND=/path/to/openshell` 指向非默认 CLI 二进制文件或包装脚本

### Live（真实提供商 + 真实模型）

- 命令：`pnpm test:live`
- 配置：`vitest.live.config.ts`
- 文件：`src/**/*.live.test.ts`
- 默认：由 `pnpm test:live` **启用**（设置 `OPENCLAW_LIVE_TEST=1`）
- 范围：
  - “该提供商/模型在今天使用真实凭据是否真的能工作？”
  - 捕获提供商格式更改、工具调用怪癖、身份验证问题和速率限制行为
- 期望：
  - 设计上不稳定于 CI（真实网络、真实提供商策略、配额、中断）
  - 花费金钱 / 使用速率限制
  - 首选运行缩小范围的子集，而不是“所有”
- Live 运行 source `~/.profile` 以获取缺失的 API 密钥。
- 默认情况下，live 运行仍然隔离 `HOME` 并将配置/身份验证材料复制到临时测试主目录，以便单元夹具不会改变您真实的 `~/.openclaw`。
- 仅当您有意需要 live 测试使用您真实的主目录时，才设置 `OPENCLAW_LIVE_USE_REAL_HOME=1`。
- `pnpm test:live` 现在默认使用更安静的模式：它保留 `[live] ...` 进度输出，但抑制额外的 `~/.profile` 通知并静默网引导日志/Bonjour 喧嚣。如果您需要完整的启动日志，请设置 `OPENCLAW_LIVE_TEST_QUIET=0`。
- API 密钥轮换（特定于提供商）：使用逗号/分号格式设置 `*_API_KEYS` 或 `*_API_KEY_1`、`*_API_KEY_2`（例如 `OPENAI_API_KEYS`、`ANTHROPIC_API_KEYS`、`GEMINI_API_KEYS`）或通过 `OPENCLAW_LIVE_*_KEY` 进行每次 live 的覆盖；测试在遇到速率限制响应时会重试。
- 进度/心跳输出：
  - Live 套件现在会向 stderr 输出进度行，以便即使 Vitest 控制台捕获处于静默状态，长时间运行的提供商调用也能保持可见的活跃状态。
  - `vitest.live.config.ts` 禁用 Vitest 控制台拦截，以便提供商/网关进度行在 live 运行期间立即流式传输。
  - 使用 `OPENCLAW_LIVE_HEARTBEAT_MS` 调整直接模型的心跳。
  - 使用 `OPENCLAW_LIVE_GATEWAY_HEARTBEAT_MS` 调整网关/探针的心跳。

## 我应该运行哪个套件？

请使用此决策表：

- 编辑逻辑/测试：运行 `pnpm test`（如果您更改了很多内容，还要运行 `pnpm test:coverage`）
- 涉及网关网络 / WS 协议 / 配对：添加 `pnpm test:e2e`
- 调试“我的机器人已停机”/ 特定于提供商的故障 / 工具调用：运行一个范围缩小的 `pnpm test:live`

## Live: Android 节点功能扫描

- 测试：`src/gateway/android-node.capabilities.live.test.ts`
- 脚本：`pnpm android:test:integration`
- 目标：调用连接的 Android 节点当前通告的**每个命令**，并断言命令契约行为。
- 范围：
  - 有条件的/手动设置（该套件不安装/运行/配对应用程序）。
  - 针对所选 Android 节点的逐个命令网关 `node.invoke` 验证。
- 必需的预先设置：
  - Android 应用已连接并配对到网关。
  - 应用保持在前台。
  - 已为您期望通过的功能授予权限/捕获同意。
- 可选的目标覆盖：
  - `OPENCLAW_ANDROID_NODE_ID` 或 `OPENCLAW_ANDROID_NODE_NAME`。
  - `OPENCLAW_ANDROID_GATEWAY_URL` / `OPENCLAW_ANDROID_GATEWAY_TOKEN` / `OPENCLAW_ANDROID_GATEWAY_PASSWORD`。
- 完整的 Android 设置详情：[Android App](/en/platforms/android)

## Live：模型冒烟测试（配置文件密钥）

Live 测试分为两层，以便我们可以隔离故障：

- “直接模型”告诉我们提供商/模型是否能使用给定的密钥进行回答。
- “Gateway(网关)冒烟测试”告诉我们完整的 Gateway(网关)+代理管道是否适用于该模型（会话、历史记录、工具、沙盒策略等）。

### 第 1 层：直接模型补全（无 Gateway(网关)）

- 测试：`src/agents/models.profiles.live.test.ts`
- 目标：
  - 枚举发现的模型
  - 使用 `getApiKeyForModel` 选择你有凭据的模型
  - 对每个模型运行一个小型的补全（并在需要时运行定向回归测试）
- 如何启用：
  - `pnpm test:live`（如果直接调用 Vitest，则使用 `OPENCLAW_LIVE_TEST=1`）
- 设置 `OPENCLAW_LIVE_MODELS=modern`（或 `all`，modern 的别名）以实际运行此套件；否则它会跳过，以保持 `pnpm test:live` 专注于 Gateway(网关) 冒烟测试
- 如何选择模型：
  - `OPENCLAW_LIVE_MODELS=modern` 运行现代允许列表（Opus/Sonnet 4.6+、GPT-5.x + Codex、Gemini 3、GLM 4.7、MiniMax M2.7、Grok 4）
  - `OPENCLAW_LIVE_MODELS=all` 是现代允许列表的别名
  - 或 `OPENCLAW_LIVE_MODELS="openai/gpt-5.2,anthropic/claude-opus-4-6,..."`（逗号分隔的允许列表）
- 如何选择提供商：
  - `OPENCLAW_LIVE_PROVIDERS="google,google-antigravity,google-gemini-cli"`（逗号分隔的允许列表）
- 密钥来源：
  - 默认情况下：配置文件存储和环境变量回退
  - 设置 `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` 以仅强制使用 **配置文件存储**
- 存在原因：
  - 将“提供商 API 已损坏/密钥无效”与“API 代理管道已损坏”区分开来
  - 包含小型、孤立的回归测试（例如：OpenAI Responses/Codex Responses 推理重放 + 工具调用流程）

### 第 2 层：Gateway(网关) + 开发代理冒烟测试（即 "@openclaw" 实际执行的操作）

- 测试：`src/gateway/gateway-models.profiles.live.test.ts`
- 目标：
  - 启动进程内 Gateway(网关)
  - 创建/修补 `agent:dev:*` 会话（每次运行的模型覆盖）
  - 迭代带密钥的模型并断言：
    - “有意义”的响应（无工具）
    - 真实的工具调用有效（读取探测）
    - 可选的额外工具探测（执行+读取探测）
    - OpenAI 回归路径（仅工具调用 → 后续）保持正常工作
- 探针详情（以便您可以快速解释失败原因）：
  - `read` 探针：测试在工作区中写入一个 nonce 文件，并要求代理 `read` 读取它并将 nonce 回传。
  - `exec+read` 探针：测试要求代理 `exec` 写入一个 nonce 到临时文件，然后 `read` 读回。
  - 图像探针：测试附加生成的 PNG（猫 + 随机代码），并期望模型返回 `cat <CODE>`。
  - 实现参考：`src/gateway/gateway-models.profiles.live.test.ts` 和 `src/gateway/live-image-probe.ts`。
- 如何启用：
  - `pnpm test:live`（如果直接调用 Vitest，则使用 `OPENCLAW_LIVE_TEST=1`）
- 如何选择模型：
  - 默认：现代允许列表（Opus/Sonnet 4.6+、GPT-5.x + Codex、Gemini 3、GLM 4.7、MiniMax M2.7、Grok 4）
  - `OPENCLAW_LIVE_GATEWAY_MODELS=all` 是现代允许列表的别名
  - 或设置 `OPENCLAW_LIVE_GATEWAY_MODELS="provider/model"`（或逗号分隔的列表）以缩小范围
- 如何选择提供商（避免“所有内容均通过 OpenRouter”）：
  - `OPENCLAW_LIVE_GATEWAY_PROVIDERS="google,google-antigravity,google-gemini-cli,openai,anthropic,zai,minimax"`（逗号分隔的允许列表）
- 在此实时测试中，工具和图像探针始终开启：
  - `read` 探针 + `exec+read` 探针（工具压力测试）
  - 当模型宣称支持图像输入时，运行图像探针
  - 流程（高层级）：
    - 测试生成一个带有“CAT”和随机代码的微型 PNG（`src/gateway/live-image-probe.ts`）
    - 通过 `agent` `attachments: [{ mimeType: "image/png", content: "<base64>" }]` 发送
    - Gateway(网关) 将附件解析为 `images[]`（`src/gateway/server-methods/agent.ts` + `src/gateway/chat-attachments.ts`）
    - 嵌入式代理将多模态用户消息转发给模型
    - 断言：回复包含 `cat` 和代码（OCR 容错：允许轻微错误）

提示：要查看您可以在机器上测试的内容（以及确切的 `provider/model` id），请运行：

```bash
openclaw models list
openclaw models list --json
```

## 实时：Anthropic setup-token 冒烟测试

- 测试：`src/agents/anthropic.setup-token.live.test.ts`
- 目标：验证 Claude Code CLI setup-token（或粘贴的 setup-token 配置文件）能否完成 Anthropic 提示。
- 启用：
  - `pnpm test:live` (或者 `OPENCLAW_LIVE_TEST=1` 如果直接调用 Vitest)
  - `OPENCLAW_LIVE_SETUP_TOKEN=1`
- Token 来源（任选其一）：
  - Profile：`OPENCLAW_LIVE_SETUP_TOKEN_PROFILE=anthropic:setup-token-test`
  - 原始 token：`OPENCLAW_LIVE_SETUP_TOKEN_VALUE=sk-ant-oat01-...`
- 模型覆盖（可选）：
  - `OPENCLAW_LIVE_SETUP_TOKEN_MODEL=anthropic/claude-opus-4-6`

设置示例：

```bash
openclaw models auth paste-token --provider anthropic --profile-id anthropic:setup-token-test
OPENCLAW_LIVE_SETUP_TOKEN=1 OPENCLAW_LIVE_SETUP_TOKEN_PROFILE=anthropic:setup-token-test pnpm test:live src/agents/anthropic.setup-token.live.test.ts
```

## Live：CLI 后端冒烟测试（Claude Code CLI 或其他本地 CLI）

- 测试：`src/gateway/gateway-cli-backend.live.test.ts`
- 目标：使用本地 Gateway(网关) 后端验证 CLI + 代理流程，而不触及您的默认配置。
- 启用：
  - `pnpm test:live` (或者 `OPENCLAW_LIVE_TEST=1` 如果直接调用 Vitest)
  - `OPENCLAW_LIVE_CLI_BACKEND=1`
- 默认值：
  - 模型：`claude-cli/claude-sonnet-4-6`
  - 命令：`claude`
  - 参数：`["-p","--output-format","json","--permission-mode","bypassPermissions"]`
- 覆盖项（可选）：
  - `OPENCLAW_LIVE_CLI_BACKEND_MODEL="claude-cli/claude-opus-4-6"`
  - `OPENCLAW_LIVE_CLI_BACKEND_MODEL="codex-cli/gpt-5.4"`
  - `OPENCLAW_LIVE_CLI_BACKEND_COMMAND="/full/path/to/claude"`
  - `OPENCLAW_LIVE_CLI_BACKEND_ARGS='["-p","--output-format","json","--permission-mode","bypassPermissions"]'`
  - `OPENCLAW_LIVE_CLI_BACKEND_CLEAR_ENV='["ANTHROPIC_API_KEY","ANTHROPIC_API_KEY_OLD"]'`
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_PROBE=1` 用于发送真实的图片附件（路径会被注入到提示词中）。
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_ARG="--image"` 用于将图片文件路径作为 CLI 参数传递，而不是通过提示词注入。
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_MODE="repeat"` (或者 `"list"`) 用于控制当设置了 `IMAGE_ARG` 时如何传递图片参数。
  - `OPENCLAW_LIVE_CLI_BACKEND_RESUME_PROBE=1` 用于发送第二轮并验证恢复流程。
- `OPENCLAW_LIVE_CLI_BACKEND_DISABLE_MCP_CONFIG=0` 用于保持 Claude Code CLI MCP 配置启用（默认情况下会使用临时空文件禁用 MCP 配置）。

示例：

```bash
OPENCLAW_LIVE_CLI_BACKEND=1 \
  OPENCLAW_LIVE_CLI_BACKEND_MODEL="claude-cli/claude-sonnet-4-6" \
  pnpm test:live src/gateway/gateway-cli-backend.live.test.ts
```

Docker 配方：

```bash
pnpm test:docker:live-cli-backend
```

注意：

- Docker 运行器位于 `scripts/test-live-cli-backend-docker.sh`。
- 它以非 root 用户 `node` 身份在仓库 CLI 镜像中运行实时 Docker-后端冒烟测试，因为当以 root 身份调用时，Claude CLI 会拒绝 `bypassPermissions`。
- 对于 `claude-cli`，它会将 Linux `@anthropic-ai/claude-code` 软件包安装到位于 `OPENCLAW_DOCKER_CLI_TOOLS_DIR` 的可写缓存前缀中（默认：`~/.cache/openclaw/docker-cli-tools`）。
- 当可用时，它会将 `~/.claude` 复制到容器中，但在 Claude 认证由 `ANTHROPIC_API_KEY` 支持的机器上，它还会通过 `OPENCLAW_LIVE_CLI_BACKEND_PRESERVE_ENV` 为子 Claude CLI 保留 `ANTHROPIC_API_KEY` / `ANTHROPIC_API_KEY_OLD`。

## Live: ACP bind smoke (`/acp spawn ... --bind here`)

- Test: `src/gateway/gateway-acp-bind.live.test.ts`
- 目标：使用实时 ACP agent 验证真实的 ACP conversation-bind 流程：
  - 发送 `/acp spawn <agent> --bind here`
  - 在适当位置绑定一个合成的 message-渠道 会话
  - 在同一会话上发送正常的后续消息
  - 验证后续消息出现在已绑定的 ACP 会话记录中
- 启用：
  - `pnpm test:live src/gateway/gateway-acp-bind.live.test.ts`
  - `OPENCLAW_LIVE_ACP_BIND=1`
- 默认值：
  - ACP agent: `claude`
  - Synthetic 渠道: Slack 私信风格会话上下文
  - ACP backend: `acpx`
- 覆盖：
  - `OPENCLAW_LIVE_ACP_BIND_AGENT=claude`
  - `OPENCLAW_LIVE_ACP_BIND_AGENT=codex`
  - `OPENCLAW_LIVE_ACP_BIND_ACPX_COMMAND=/full/path/to/acpx`
- 说明：
  - 此通道使用网关 `chat.send` 表面以及仅管理员可用的合成 originating-route 字段，以便测试可以附加 message-渠道 上下文而无需假装外部投递。
  - 当未设置 `OPENCLAW_LIVE_ACP_BIND_ACPX_COMMAND` 时，测试使用配置/捆绑的 acpx 命令。如果您的 harness 认证依赖于 `~/.profile` 中的环境变量，建议使用保留提供商环境的自定义 `acpx` 命令。

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

Docker 说明：

- Docker 运行器位于 `scripts/test-live-acp-bind-docker.sh`。
- 它加载 `~/.profile`，将匹配的 CLI 认证主目录（`~/.claude` 或 `~/.codex`）复制到容器中，将 `acpx` 安装到可写的 npm 前缀中，然后如果缺少所请求的实时 CLI（`@anthropic-ai/claude-code` 或 `@openai/codex`）则进行安装。
- 在 Docker 内部，运行器设置 `OPENCLAW_LIVE_ACP_BIND_ACPX_COMMAND=$HOME/.npm-global/bin/acpx`，以便 acpx 保持从加载的配置文件中获取的提供商环境变量可用于子 harness CLI。

### 推荐的 live 配方

狭义、显式的允许列表是最快且最不稳定的：

- 单模型，直连（无网关）：
  - `OPENCLAW_LIVE_MODELS="openai/gpt-5.2" pnpm test:live src/agents/models.profiles.live.test.ts`

- 单模型，网关冒烟测试：
  - `OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.2" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

- 跨多个提供商的工具调用：
  - `OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.2,anthropic/claude-opus-4-6,google/gemini-3-flash-preview,zai/glm-4.7,minimax/MiniMax-M2.7" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

- Google 侧重（Gemini API 密钥 + Antigravity）：
  - Gemini (API 密钥): `OPENCLAW_LIVE_GATEWAY_MODELS="google/gemini-3-flash-preview" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`
  - Antigravity (OAuth): `OPENCLAW_LIVE_GATEWAY_MODELS="google-antigravity/claude-opus-4-6-thinking,google-antigravity/gemini-3-pro-high" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

注：

- `google/...` 使用 Gemini API (API 密钥)。
- `google-antigravity/...` 使用 Antigravity OAuth 网桥（Cloud Code Assist 风格的代理端点）。
- `google-gemini-cli/...` 使用你机器上的本地 Gemini CLI（独立的身份验证 + 工具怪癖）。
- Gemini API vs Gemini CLI：
  - API：OpenClaw 通过 HTTP 调用 Google 托管的 Gemini API (API 密钥 / 配置文件身份验证)；这是大多数用户所说的 “Gemini”。
  - CLI：OpenClaw 调用本地 `gemini` 二进制文件；它有自己的身份验证，并且行为可能有所不同（流式传输/工具支持/版本偏差）。

## Live：模型矩阵（我们涵盖的内容）

没有固定的 “CI 模型列表”（Live 是可选加入的），但这些是在拥有密钥的开发机器上定期覆盖的**推荐**模型。

### 现代冒烟测试集（工具调用 + 图像）

这是我们期望保持正常工作的 “通用模型” 运行：

- OpenAI (非 Codex): `openai/gpt-5.2` (可选: `openai/gpt-5.1`)
- OpenAI Codex: `openai-codex/gpt-5.4`
- Anthropic: `anthropic/claude-opus-4-6` (或者 `anthropic/claude-sonnet-4-6`)
- Google (Gemini API): `google/gemini-3.1-pro-preview` 和 `google/gemini-3-flash-preview` (避免使用较旧的 Gemini 2.x 模型)
- Google (Antigravity): `google-antigravity/claude-opus-4-6-thinking` 和 `google-antigravity/gemini-3-flash`
- Z.AI (GLM): `zai/glm-4.7`
- MiniMax: `minimax/MiniMax-M2.7`

运行包含工具 + 图像的网关冒烟测试：
`OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.2,openai-codex/gpt-5.4,anthropic/claude-opus-4-6,google/gemini-3.1-pro-preview,google/gemini-3-flash-preview,google-antigravity/claude-opus-4-6-thinking,google-antigravity/gemini-3-flash,zai/glm-4.7,minimax/MiniMax-M2.7" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

### 基线：工具调用（读取 + 可选执行）

每个提供商系列至少选择一个：

- OpenAI: `openai/gpt-5.2` (或者 `openai/gpt-5-mini`)
- Anthropic: `anthropic/claude-opus-4-6` (或者 `anthropic/claude-sonnet-4-6`)
- Google: `google/gemini-3-flash-preview` (或者 `google/gemini-3.1-pro-preview`)
- Z.AI (GLM): `zai/glm-4.7`
- MiniMax: `minimax/MiniMax-M2.7`

可选的额外覆盖（最好具备）：

- xAI: `xai/grok-4`（或最新可用版本）
- Mistral: `mistral/`……（选择一个你已启用的支持“工具”的模型）
- Cerebras: `cerebras/`……（如果你有访问权限）
- LM Studio: `lmstudio/`……（本地；工具调用取决于 API 模式）

### 视觉：图像发送（附件 → 多模态消息）

在 `OPENCLAW_LIVE_GATEWAY_MODELS` 中至少包含一个支持图像的模型（Claude/Gemini/OpenAI 支持视觉的变体等），以测试图像探测功能。

### 聚合器 / 备用网关

如果你启用了密钥，我们也支持通过以下方式进行测试：

- OpenRouter: `openrouter/...`（数百个模型；使用 `openclaw models scan` 查找支持工具和图像的候选模型）
- OpenCode: `opencode/...` 用于 Zen，`opencode-go/...` 用于 Go（通过 `OPENCODE_API_KEY` / `OPENCODE_ZEN_API_KEY` 进行身份验证）

更多你可以包含在实时矩阵中的提供商（如果你有凭据/配置）：

- 内置：`openai`、`openai-codex`、`anthropic`、`google`、`google-vertex`、`google-antigravity`、`google-gemini-cli`、`zai`、`openrouter`、`opencode`、`opencode-go`、`xai`、`groq`、`cerebras`、`mistral`、`github-copilot`
- 通过 `models.providers`（自定义端点）：`minimax`（云/API），以及任何 OpenAI/Anthropic 兼容的代理（LM Studio、vLLM、LiteLLM 等）

提示：不要尝试在文档中硬编码“所有模型”。权威列表取决于 `discoverModels(...)` 在你的机器上返回的内容 + 可用的密钥。

## 凭据（切勿提交）

实时测试发现凭据的方式与 CLI 相同。实际影响：

- 如果 CLI 可以工作，Live 测试应该能找到相同的密钥。
- 如果 Live 测试提示“no creds”，请像调试 `openclaw models list` / 模型选择那样进行调试。

- 配置文件存储：`~/.openclaw/credentials/`（首选；即测试中“profile keys”的含义）
- 配置：`~/.openclaw/openclaw.json`（或 `OPENCLAW_CONFIG_PATH`）
- 默认情况下，Live 本地运行会将活动配置和身份验证存储复制到临时测试主目录中；在该分阶段副本中会剥离 `agents.*.workspace` / `agentDir` 路径覆盖，以便探测操作不会影响您真实的主机工作区。

如果您想依赖环境密钥（例如在您的 `~/.profile` 中导出的密钥），请在 `source ~/.profile` 之后运行本地测试，或使用下方的 Docker 运行器（它们可以将 `~/.profile` 挂载到容器中）。

## Deepgram Live（音频转录）

- 测试：`src/media-understanding/providers/deepgram/audio.live.test.ts`
- 启用：`DEEPGRAM_API_KEY=... DEEPGRAM_LIVE_TEST=1 pnpm test:live src/media-understanding/providers/deepgram/audio.live.test.ts`

## BytePlus 编码计划 Live

- 测试：`src/agents/byteplus.live.test.ts`
- 启用：`BYTEPLUS_API_KEY=... BYTEPLUS_LIVE_TEST=1 pnpm test:live src/agents/byteplus.live.test.ts`
- 可选模型覆盖：`BYTEPLUS_CODING_MODEL=ark-code-latest`

## 图像生成 Live

- 测试：`src/image-generation/runtime.live.test.ts`
- 命令：`pnpm test:live src/image-generation/runtime.live.test.ts`
- 范围：
  - 枚举每个已注册的图像生成提供商插件
  - 在探测之前从您的登录 Shell（`~/.profile`）加载缺失的提供商环境变量
  - 默认情况下，优先使用实时/环境 API 密钥，而不是存储的身份验证配置文件，因此 `auth-profiles.json` 中的过时测试密钥不会掩盖真实的 Shell 凭据
  - 跳过没有可用身份验证/配置文件/模型的提供商
  - 通过共享运行时能力运行标准的图像生成变体：
    - `google:flash-generate`
    - `google:pro-generate`
    - `google:pro-edit`
    - `openai:default-generate`
- 当前涵盖的捆绑提供商：
  - `openai`
  - `google`
- 可选范围缩小：
  - `OPENCLAW_LIVE_IMAGE_GENERATION_PROVIDERS="openai,google"`
  - `OPENCLAW_LIVE_IMAGE_GENERATION_MODELS="openai/gpt-image-1,google/gemini-3.1-flash-image-preview"`
  - `OPENCLAW_LIVE_IMAGE_GENERATION_CASES="google:flash-generate,google:pro-edit"`
- 可选身份验证行为：
  - `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` 以强制使用配置文件存储身份验证并忽略仅限环境的覆盖

## Docker 运行器（可选的“在 Docker 下工作”检查）

这些 Docker 运行器分为两类：

- 实时模型运行器：`test:docker:live-models` 和 `test:docker:live-gateway` 在仓库 Docker 镜像内运行 `pnpm test:live`，挂载您的本地配置目录和工作区（如果挂载了 `~/.profile` 也会获取它）。
- 容器冒烟测试运行器：`test:docker:openwebui`、`test:docker:onboard`、`test:docker:gateway-network`、`test:docker:mcp-channels` 和 `test:docker:plugins` 会启动一个或多个真实容器并验证更高级别的集成路径。

实时模型 Docker 运行器还会仅绑定挂载所需的 CLI 认证主目录（如果运行范围未限定，则挂载所有支持的目录），然后在运行前将其复制到容器主目录中，以便外部 CLI OAuth 可以刷新令牌而无需修改主机认证存储：

- 直连模型：`pnpm test:docker:live-models`（脚本：`scripts/test-live-models-docker.sh`）
- ACP 绑定冒烟测试：`pnpm test:docker:live-acp-bind`（脚本：`scripts/test-live-acp-bind-docker.sh`）
- CLI 后端冒烟测试：`pnpm test:docker:live-cli-backend`（脚本：`scripts/test-live-cli-backend-docker.sh`）
- Gateway(网关) + 开发代理：`pnpm test:docker:live-gateway`（脚本：`scripts/test-live-gateway-models-docker.sh`）
- Open WebUI 实时冒烟测试：`pnpm test:docker:openwebui`（脚本：`scripts/e2e/openwebui-docker.sh`）
- 新手引导向导（TTY，完整脚手架）：`pnpm test:docker:onboard`（脚本：`scripts/e2e/onboard-docker.sh`）
- Gateway(网关) 网络（两个容器，WS 认证 + 健康）：`pnpm test:docker:gateway-network`（脚本：`scripts/e2e/gateway-network-docker.sh`）
- MCP 渠道桥接（已预置 Gateway(网关) + stdio 桥接 + 原始 Claude 通知帧冒烟测试）：`pnpm test:docker:mcp-channels`（脚本：`scripts/e2e/mcp-channels-docker.sh`）
- 插件（安装冒烟测试 + `/plugin` 别名 + Claude 包重启语义）：`pnpm test:docker:plugins`（脚本：`scripts/e2e/plugins-docker.sh`）

实时模型的 Docker 运行器也会将当前检出的代码以只读方式绑定挂载，
并将其暂存到容器内的临时工作目录中。这既保持了运行时
镜像的精简，又能针对您确切的本地源代码/配置运行 Vitest。
它们还设置了 `OPENCLAW_SKIP_CHANNELS=1`，因此 Gateway(网关) 实时探测不会在
容器内启动真实的 Telegram/Discord/等渠道工作进程。
`test:docker:live-models` 仍然运行 `pnpm test:live`，因此当您需要缩小
或排除该 Docker 频道的 Gateway(网关) 实时覆盖范围时，也请透传
`OPENCLAW_LIVE_GATEWAY_*`。
`test:docker:openwebui` 是更高级别的兼容性冒烟测试：它启动一个
启用了 OpenAI 兼容 HTTP 端点的 OpenClaw Gateway(网关) 容器，
针对该 Gateway(网关) 启动一个固定的 Open WebUI 容器，通过
Open WebUI 登录，验证 `/api/models` 暴露了 `openclaw/default`，然后通过
Open WebUI 的 `/api/chat/completions` 代理发送真实的聊天请求。
第一次运行可能会明显变慢，因为 Docker 可能需要拉取
Open WebUI 镜像，且 Open WebUI 可能需要完成其自身的冷启动设置。
该频道需要一个可用的实时模型密钥，而 `OPENCLAW_PROFILE_FILE`
（默认为 `~/.profile`）是在 Docker 化运行中提供它的主要方式。
成功的运行会打印出一个小的 JSON 载荷，例如 `{ "ok": true, "模型":
"openclaw/default", ... }`。
`test:docker:mcp-channels` 是故意确定性的，不需要真实的
Telegram、Discord 或 iMessage 账户。它会启动一个已播种的 Gateway(网关)
容器，启动一个生成 `openclaw mcp serve` 的第二个容器，然后
验证路由对话发现、脚本读取、附件元数据、
实时事件队列行为、出站发送路由，以及通过真实 stdio MCP 网桥进行的
Claude 风格渠道 + 权限通知。通知检查
直接检查原始 stdio MCP 帧，因此冒烟测试验证的是
网桥实际发出的内容，而不仅仅是特定客户端 SDK 恰好呈现的内容。

ACP 纯语言线程手动冒烟测试（非 CI）：

- `bun scripts/dev/discord-acp-plain-language-smoke.ts --channel <discord-channel-id> ...`
- 请保留此脚本用于回归/调试工作流。它可能再次需要用于 ACP 线程路由验证，因此请勿删除它。

有用的环境变量：

- `OPENCLAW_CONFIG_DIR=...`（默认：`~/.openclaw`）挂载到 `/home/node/.openclaw`
- `OPENCLAW_WORKSPACE_DIR=...`（默认：`~/.openclaw/workspace`）挂载到 `/home/node/.openclaw/workspace`
- `OPENCLAW_PROFILE_FILE=...`（默认：`~/.profile`）挂载到 `/home/node/.profile` 并在运行测试之前 source
- `OPENCLAW_DOCKER_CLI_TOOLS_DIR=...`（默认：`~/.cache/openclaw/docker-cli-tools`）挂载到 `/home/node/.npm-global`，用于 CLI 内部缓存的 Docker 安装
- `$HOME` 下的外部 CLI 认证目录以只读方式挂载在 `/host-auth/...` 下，然后在测试开始前复制到 `/home/node/...`
  - 默认：挂载所有支持的目录（`.codex`、`.claude`、`.minimax`）
  - 范围缩小的提供商运行仅挂载从 `OPENCLAW_LIVE_PROVIDERS` / `OPENCLAW_LIVE_GATEWAY_PROVIDERS` 推断出的所需目录
  - 使用 `OPENCLAW_DOCKER_AUTH_DIRS=all`、`OPENCLAW_DOCKER_AUTH_DIRS=none` 或类似 `OPENCLAW_DOCKER_AUTH_DIRS=.claude,.codex` 的逗号列表手动覆盖
- `OPENCLAW_LIVE_GATEWAY_MODELS=...` / `OPENCLAW_LIVE_MODELS=...` 以缩小运行范围
- `OPENCLAW_LIVE_GATEWAY_PROVIDERS=...` / `OPENCLAW_LIVE_PROVIDERS=...` 以在容器内过滤提供商
- `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` 以确保凭据来自配置文件存储（而非环境变量）
- `OPENCLAW_OPENWEBUI_MODEL=...` 以选择 Gateway 为 Open WebUI smoke 暴露的模型
- `OPENCLAW_OPENWEBUI_PROMPT=...` 以覆盖 Open WebUI smoke 使用的 nonce-check 提示词
- `OPENWEBUI_IMAGE=...` 以覆盖固定的 Open WebUI 镜像标签

## 文档完整性检查

编辑文档后运行文档检查：`pnpm check:docs`。
当您还需要页面内标题检查时，运行完整的 Mintlify 锚点验证：`pnpm docs:check-links:anchors`。

## 离线回归测试（CI 安全）

这些是“真实管道”回归测试，但不使用真实提供商：

- Gateway(网关) 工具调用（模拟 OpenAI，真实 Gateway(网关) + 代理循环）：`src/gateway/gateway.test.ts`（案例：“通过 Gateway(网关) 代理循环端到端运行模拟的 OpenAI 工具调用”）
- Gateway(网关) 向导 (WS `wizard.start`/`wizard.next`, 写入配置 + 强制执行身份验证): `src/gateway/gateway.test.ts` (case: "runs wizard over ws and writes auth token config")

## Agent 可靠性评估

我们已经有一些 CI 安全的测试，其行为类似于“agent 可靠性评估”：

- 通过真实的 gateway + agent 循环模拟工具调用 (`src/gateway/gateway.test.ts`)。
- 验证会话连接和配置效果的端到端向导流程 (`src/gateway/gateway.test.ts`)。

对于 Skills 来说仍然缺少什么 (参见 [Skills](/en/tools/skills))：

- **决策制定：** 当 prompt 中列出了 skills 时，agent 是否会选择正确的 skill (或避免无关的 skill)？
- **合规性：** agent 在使用前是否读取 `SKILL.md` 并遵循所需的步骤/参数？
- **工作流契约：** 断言工具顺序、会话历史延续以及沙箱边界的多轮场景。

未来的评估应首先保持确定性：

- 使用模拟提供商的场景运行程序，用于断言工具调用 + 顺序、skill 文件读取和会话连接。
- 一小套专注于 skill 的场景 (使用 vs 避免、筛选、prompt 注入)。
- 仅在 CI 安全的套件就位后，才进行可选的实时评估 (opt-in, env-gated)。

## 契约测试 (插件和渠道形态)

契约测试验证每个注册的插件和渠道是否符合其接口契约。它们遍历所有发现的插件并运行一系列形态和行为断言。默认的 `pnpm test` 单元通道故意跳过这些共享接缝和冒烟文件；当您接触共享渠道或提供商表面时，请显式运行契约命令。

### 命令

- 所有契约： `pnpm test:contracts`
- 仅渠道契约： `pnpm test:contracts:channels`
- 仅提供商契约： `pnpm test:contracts:plugins`

### 渠道契约

位于 `src/channels/plugins/contracts/*.contract.test.ts`：

- **plugin** - 基本插件形态 (id, name, capabilities)
- **setup** - 设置向导契约
- **会话-binding** - 会话绑定行为
- **outbound-payload** - 消息负载结构
- **inbound** - 入站消息处理
- **actions** - 渠道操作处理程序
- **threading** - 线程 ID 处理
- **directory** - 目录/花名册 API
- **group-policy** - 组策略强制执行

### 提供商状态合约

位于 `src/plugins/contracts/*.contract.test.ts`。

- **status** - 渠道状态探针
- **registry** - 插件注册表结构

### 提供商合约

位于 `src/plugins/contracts/*.contract.test.ts`：

- **auth** - 认证流程合约
- **auth-choice** - 认证选择/选取
- **catalog** - 模型目录 API
- **discovery** - 插件发现
- **loader** - 插件加载
- **runtime** - 提供商运行时
- **shape** - 插件结构/接口
- **wizard** - 设置向导

### 何时运行

- 更改 plugin-sdk 导出或子路径后
- 添加或修改渠道或提供商插件后
- 重构插件注册或发现后

合约测试在 CI 中运行，不需要真实的 API 密钥。

## 添加回归测试（指导）

当您修复在 live 中发现的提供商/模型问题时：

- 如果可能，添加一个 CI 安全的回归测试（模拟/存根提供商，或捕获确切的请求形状转换）
- 如果它本质上仅限 live（速率限制、认证策略），请保持 live 测试狭窄并通过环境变量选择加入
- 优先定位能捕获错误的最小层：
  - 提供商请求转换/重放错误 → 直接模型测试
  - 网关会话/历史/工具管道错误 → 网关 live 冒烟测试或 CI 安全的网关模拟测试
- SecretRef 遍历防护：
  - `src/secrets/exec-secret-ref-id-parity.test.ts` 从注册表元数据（`listSecretTargetRegistryEntries()`）为每个 SecretRef 类派生一个抽样目标，然后断言拒绝遍历段的 exec id。
  - 如果您在 `src/secrets/target-registry-data.ts` 中添加了新的 `includeInPlan` SecretRef 目标系列，请在该测试中更新 `classifyTargetClass`。该测试会对未分类的目标 id 故意失败，以便不能静默跳过新类。
