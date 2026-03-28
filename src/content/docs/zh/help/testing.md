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

- 完整门控（推送前预期运行）： `pnpm build && pnpm check && pnpm test`

当您修改测试或需要额外的信心时：

- 覆盖率门控： `pnpm test:coverage`
- E2E 套件： `pnpm test:e2e`

调试真实的提供商/模型时（需要真实的凭证）：

- Live 套件（模型 + 网关工具/图像探针）： `pnpm test:live`

提示：当您只需要一个失败用例时，优先使用下面描述的允许列表 环境变量来缩小 Live 测试范围。

## 测试套件（哪里运行什么）

可以将这些套件视为“真实性递增”（以及不稳定性/成本递增）：

### 单元 / 集成（默认）

- 命令： `pnpm test`
- 配置： `scripts/test-parallel.mjs` （运行 `vitest.unit.config.ts`、 `vitest.extensions.config.ts`、 `vitest.gateway.config.ts`）
- 文件： `src/**/*.test.ts`、 `extensions/**/*.test.ts`
- 范围：
  - 纯单元测试
  - 进程内集成测试（网关认证、路由、工具、解析、配置）
  - 针对已知错误的确定性回归测试
- 预期：
  - 在 CI 中运行
  - 不需要真实的密钥
  - 应该快速且稳定
- 调度器说明：
  - `pnpm test` 现在会保留一个小型的已检入行为清单，用于真正的池/隔离覆盖，以及一个单独的时间快照，用于记录最慢的单元文件。
  - 共享单元覆盖率现在默认为 `threads`，而清单则明确保留了已测量的仅限 fork 的例外和繁重的单例通道。
  - 共享扩展通道仍然默认为 `threads`；当文件无法安全共享非隔离工作进程时，包装器会在 `test/fixtures/test-parallel.behavior.json` 中保留明确的仅限 fork 的例外。
  - 渠道套件 (`vitest.channels.config.ts`) 现在也默认为 `threads`；2026 年 3 月 22 日的直接全套件控制运行顺利通过，没有特定于渠道的 fork 例外。
  - 包装器将测量到的最繁重的文件剥离到专用通道中，而不是依赖不断增长的手动维护的排除列表。
  - 在套件结构发生重大变更后，使用 `pnpm test:perf:update-timings` 刷新计时快照。
- 嵌入式运行器说明：
  - 当您更改消息工具发现输入或压缩运行时上下文时，请保持两个级别的覆盖率。
  - 为纯路由/规范化边界添加有针对性的辅助回归测试。
  - 同时保持嵌入式运行器集成套件的正常状态：`src/agents/pi-embedded-runner/compact.hooks.test.ts`、`src/agents/pi-embedded-runner/run.overflow-compaction.test.ts` 和 `src/agents/pi-embedded-runner/run.overflow-compaction.loop.test.ts`。
  - 这些套件验证了作用域 ID 和压缩行为仍然通过真实的 `run.ts` / `compact.ts` 路径流转；仅限辅助的测试不足以替代这些集成路径。
- 池说明：
  - 基础 Vitest 配置仍然默认为 `forks`。
  - 单元包装器通道默认为 `threads`，并在清单中明确列出了仅限 fork 的例外。
  - 扩展作用域配置默认为 `threads`。
  - 渠道作用域配置默认为 `threads`。
  - 单元、渠道和扩展配置默认为 `isolate: false` 以加快文件启动速度。
  - `pnpm test` 也会在包装器级别传递 `--isolate=false`。
  - 使用 `OPENCLAW_TEST_ISOLATE=1 pnpm test` 重新选择加入 Vitest 文件隔离。
  - `OPENCLAW_TEST_NO_ISOLATE=0` 或 `OPENCLAW_TEST_NO_ISOLATE=false` 也会强制隔离运行。
- 快速本地迭代说明：
  - `pnpm test:changed` 使用 `--changed origin/main` 运行包装器。
  - 基础 Vitest 配置将包装器清单/配置文件标记为 `forceRerunTriggers`，以便当调度器输入发生变化时，更改模式的重新运行保持正确。
  - Vitest 的文件系统模块缓存现在默认为 Node 端的测试重新运行启用。
  - 如果您怀疑转换缓存行为过时，请使用 `OPENCLAW_VITEST_FS_MODULE_CACHE=0` 或 `OPENCLAW_VITEST_FS_MODULE_CACHE=false` 退出。
- 性能调试说明：
  - `pnpm test:perf:imports` 启用 Vitest 导入持续时间报告以及导入细分输出。
  - `pnpm test:perf:imports:changed` 将相同的分析视图范围限定为自 `origin/main` 以来更改的文件。
  - `pnpm test:perf:profile:main` 为 Vitest/Vite 启动和转换开销写入主线程 CPU 配置文件。
  - `pnpm test:perf:profile:runner` 在禁用文件并行性的情况下，为单元套件写入运行器 CPU + 堆配置文件。

### E2E（网关冒烟测试）

- 命令：`pnpm test:e2e`
- 配置：`vitest.e2e.config.ts`
- 文件：`src/**/*.e2e.test.ts`，`test/**/*.e2e.test.ts`
- 运行时默认值：
  - 使用 Vitest `forks` 实现确定性的跨文件隔离。
  - 使用自适应工作线程（CI：最多 2 个，本地：默认 1 个）。
  - 默认以静默模式运行以减少控制台 I/O 开销。
- 有用的覆盖选项：
  - `OPENCLAW_E2E_WORKERS=<n>` 强制工作线程数量（上限为 16）。
  - `OPENCLAW_E2E_VERBOSE=1` 重新启用详细的控制台输出。
- 范围：
  - 多实例网关端到端行为
  - WebSocket/HTTP 接口、节点配对和繁重的网络操作
- 预期：
  - 在 CI 中运行（当在管道中启用时）
  - 不需要真实的密钥
  - 比单元测试有更多的移动部件（可能会更慢）

### E2E：OpenShell 后端冒烟测试

- 命令：`pnpm test:e2e:openshell`
- 文件：`test/openshell-sandbox.e2e.test.ts`
- 范围：
  - 通过 Docker 在主机上启动隔离的 OpenShell 网关
  - 从临时的本地 Dockerfile 创建沙箱
  - 通过真实的 `sandbox ssh-config` + SSH exec 对 OpenClaw 的 OpenShell 后端进行测试
  - 通过沙箱 fs 桥验证远程规范文件系统行为
- 预期：
  - 仅限选择加入；不是默认 `pnpm test:e2e` 运行的一部分
  - 需要本地 `openshell` CLI 以及正常工作的 Docker 守护进程
  - 使用隔离的 `HOME` / `XDG_CONFIG_HOME`，然后销毁测试网关和沙箱
- 有用的覆盖选项：
  - `OPENCLAW_E2E_OPENSHELL=1` 用于在手动运行更广泛的 e2e 套件时启用该测试
  - `OPENCLAW_E2E_OPENSHELL_COMMAND=/path/to/openshell` 用于指向非默认的 CLI 二进制文件或包装脚本

### Live（真实提供商 + 真实模型）

- 命令：`pnpm test:live`
- 配置：`vitest.live.config.ts`
- 文件：`src/**/*.live.test.ts`
- 默认：`pnpm test:live` 默认**启用**（设置 `OPENCLAW_LIVE_TEST=1`）
- 范围：
  - “此提供商/模型在拥有真实凭证的情况下*今天*真的能工作吗？”
  - 捕获提供商格式更改、工具调用怪癖、身份验证问题和速率限制行为
- 预期：
  - 按设计在 CI 中不稳定（真实网络、真实提供商策略、配额、中断）
  - 花费金钱 / 使用速率限制
  - 优先运行缩小的子集，而不是“所有内容”
  - Live 运行将获取 `~/.profile` 以拾取缺失的 API 密钥
- API 密钥轮换（特定于提供商）：使用逗号/分号格式设置 `*_API_KEYS` 或 `*_API_KEY_1`、`*_API_KEY_2`（例如 `OPENAI_API_KEYS`、`ANTHROPIC_API_KEYS`、`GEMINI_API_KEYS`）或通过 `OPENCLAW_LIVE_*_KEY` 进行每个 live 的覆盖；测试在遇到速率限制响应时会重试。
- 进度/心跳输出：
  - Live 套件现在会向 stderr 输出进度行，以便即使 Vitest 控制台捕获处于静默状态，长时间运行的提供商调用也明显处于活动状态。
  - `vitest.live.config.ts` 禁用 Vitest 控制台拦截，以便提供商/网关进度行在 live 运行期间立即流式传输。
  - 使用 `OPENCLAW_LIVE_HEARTBEAT_MS` 调整直接模型心跳。
  - 使用 `OPENCLAW_LIVE_GATEWAY_HEARTBEAT_MS` 调整网关/探测心跳。

## 我应该运行哪个套件？

使用此决策表：

- 编辑逻辑/测试：运行 `pnpm test`（如果您进行了大量更改，则还要运行 `pnpm test:coverage`）
- 涉及网关网络 / WS 协议 / 配对：添加 `pnpm test:e2e`
- 调试“我的机器人宕机” / 特定于提供商的故障 / 工具调用：运行缩小的 `pnpm test:live`

## 实时：Android 节点功能扫描

- 测试：`src/gateway/android-node.capabilities.live.test.ts`
- 脚本：`pnpm android:test:integration`
- 目标：调用已连接 Android 节点当前通告的**所有命令**，并断言命令契约行为。
- 范围：
  - 预条件/手动设置（该套件不安装/运行/配对应用）。
  - 针对所选 Android 节点的逐命令 gateway `node.invoke` 验证。
- 所需的预先设置：
  - Android 应用已连接并配对到 gateway。
  - 应用保持在前台。
  - 已为您预期通过的功能授予权限/采集同意。
- 可选的目标覆盖：
  - `OPENCLAW_ANDROID_NODE_ID` 或 `OPENCLAW_ANDROID_NODE_NAME`。
  - `OPENCLAW_ANDROID_GATEWAY_URL` / `OPENCLAW_ANDROID_GATEWAY_TOKEN` / `OPENCLAW_ANDROID_GATEWAY_PASSWORD`。
- 完整的 Android 设置详情：[Android App](/zh/platforms/android)

## 实时：模型冒烟测试（配置文件密钥）

实时测试分为两层，以便我们隔离故障：

- “直接模型”告诉我们提供商/模型是否可以使用给定密钥进行回答。
- “Gateway 冒烟测试”告诉我们完整的 gateway+agent 流水线对该模型是否有效（会话、历史、工具、沙箱策略等）。

### 第 1 层：直接模型补全（无 gateway）

- 测试：`src/agents/models.profiles.live.test.ts`
- 目标：
  - 枚举已发现的模型
  - 使用 `getApiKeyForModel` 选择您拥有凭据的模型
  - 为每个模型运行一个小型补全（并在需要的地方运行针对性回归）
- 如何启用：
  - `pnpm test:live` （如果直接调用 Vitest，则使用 `OPENCLAW_LIVE_TEST=1`）
- 设置 `OPENCLAW_LIVE_MODELS=modern` （或 `all`，modern 的别名）以实际运行此套件；否则它会跳过，以保持 `pnpm test:live` 专注于 gateway 冒烟测试
- 如何选择模型：
  - `OPENCLAW_LIVE_MODELS=modern` 运行现代化允许列表（Opus/Sonnet/Haiku 4.5、GPT-5.x + Codex、Gemini 3、GLM 4.7、MiniMax M2.7、Grok 4）
  - `OPENCLAW_LIVE_MODELS=all` 是现代化允许列表的别名
  - 或 `OPENCLAW_LIVE_MODELS="openai/gpt-5.2,anthropic/claude-opus-4-6,..."` （逗号允许列表）
- 如何选择提供商：
  - `OPENCLAW_LIVE_PROVIDERS="google,google-antigravity,google-gemini-cli"` （逗号允许列表）
- 密钥来源：
  - 默认情况下：配置文件存储和环境变量回退
  - 设置 `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` 以仅强制执行 **配置文件存储**
- 存在原因：
  - 区分“提供商 API 损坏/密钥无效”与“Gateway 代理管道损坏”
  - 包含小型、孤立的回归测试（例如：OpenAI Responses/Codex Responses 推理重放 + 工具调用流程）

### 第 2 层：Gateway(网关) + 开发代理冒烟测试（即“@openclaw”实际执行的操作）

- 测试：`src/gateway/gateway-models.profiles.live.test.ts`
- 目标：
  - 启动进程内 Gateway
  - 创建/修补 `agent:dev:*` 会话（每次运行模型覆盖）
  - 迭代带密钥的模型并断言：
    - “有意义”的响应（无工具）
    - 真实的工具调用有效（读取探测）
    - 可选的额外工具探测（exec+read 探测）
    - OpenAI 回归路径（仅工具调用 → 后续跟进）保持正常工作
- 探测细节（以便您可以快速解释失败原因）：
  - `read` 探测：测试在工作区中写入一个 nonce 文件，并要求代理 `read` 该文件并回显 nonce。
  - `exec+read` 探测：测试要求代理 `exec`-写入一个 nonce 到临时文件，然后 `read` 该文件。
  - 图像探测：测试附加一个生成的 PNG（cat + 随机代码）并期望模型返回 `cat <CODE>`。
  - 实现参考：`src/gateway/gateway-models.profiles.live.test.ts` 和 `src/gateway/live-image-probe.ts`。
- 如何启用：
  - `pnpm test:live`（如果直接调用 Vitest，则为 `OPENCLAW_LIVE_TEST=1`）
- 如何选择模型：
  - 默认：现代允许列表（Opus/Sonnet/Haiku 4.5、GPT-5.x + Codex、Gemini 3、GLM 4.7、MiniMax M2.7、Grok 4）
  - `OPENCLAW_LIVE_GATEWAY_MODELS=all` 是现代允许列表的别名
  - 或者设置 `OPENCLAW_LIVE_GATEWAY_MODELS="provider/model"`（或逗号分隔列表）以缩小范围
- 如何选择提供商（避免“全部使用 OpenRouter”）：
  - `OPENCLAW_LIVE_GATEWAY_PROVIDERS="google,google-antigravity,google-gemini-cli,openai,anthropic,zai,minimax"`（逗号分隔允许列表）
- 在此实时测试中，工具和图像探测始终开启：
  - `read` 探测 + `exec+read` 探测（工具压力测试）
  - 当模型声明支持图像输入时运行图像探测
  - 流程（高层级）：
    - 测试生成一个带有“CAT” + 随机代码的微型 PNG（`src/gateway/live-image-probe.ts`）
    - 通过 `agent` `attachments: [{ mimeType: "image/png", content: "<base64>" }]` 发送
    - Gateway 将附件解析为 `images[]` (`src/gateway/server-methods/agent.ts` + `src/gateway/chat-attachments.ts`)
    - 嵌入式代理将多模态用户消息转发给模型
    - 断言：回复包含 `cat` + 代码（OCR 容差：允许轻微错误）

提示：要查看您可以在机器上测试的内容（以及确切的 `provider/model` id），请运行：

```bash
openclaw models list
openclaw models list --json
```

## Live: Anthropic setup-token smoke

- 测试：`src/agents/anthropic.setup-token.live.test.ts`
- 目标：验证 Claude Code CLI setup-token（或粘贴的 setup-token 配置文件）能否完成 Anthropic 提示。
- 启用：
  - `pnpm test:live` （如果直接调用 Vitest，则为 `OPENCLAW_LIVE_TEST=1`）
  - `OPENCLAW_LIVE_SETUP_TOKEN=1`
- Token 来源（选择一个）：
  - 配置文件：`OPENCLAW_LIVE_SETUP_TOKEN_PROFILE=anthropic:setup-token-test`
  - 原始 token：`OPENCLAW_LIVE_SETUP_TOKEN_VALUE=sk-ant-oat01-...`
- 模型覆盖（可选）：
  - `OPENCLAW_LIVE_SETUP_TOKEN_MODEL=anthropic/claude-opus-4-6`

设置示例：

```bash
openclaw models auth paste-token --provider anthropic --profile-id anthropic:setup-token-test
OPENCLAW_LIVE_SETUP_TOKEN=1 OPENCLAW_LIVE_SETUP_TOKEN_PROFILE=anthropic:setup-token-test pnpm test:live src/agents/anthropic.setup-token.live.test.ts
```

## Live: CLI 后端 smoke (Claude Code CLI 或其他本地 CLI)

- 测试：`src/gateway/gateway-cli-backend.live.test.ts`
- 目标：使用本地 CLI 后端验证 Gateway + 代理流水线，而不影响您的默认配置。
- 启用：
  - `pnpm test:live` （如果直接调用 Vitest，则为 `OPENCLAW_LIVE_TEST=1`）
  - `OPENCLAW_LIVE_CLI_BACKEND=1`
- 默认值：
  - 模型：`claude-cli/claude-sonnet-4-6`
  - 命令：`claude`
  - 参数：`["-p","--output-format","json","--permission-mode","bypassPermissions"]`
- 覆盖（可选）：
  - `OPENCLAW_LIVE_CLI_BACKEND_MODEL="claude-cli/claude-opus-4-6"`
  - `OPENCLAW_LIVE_CLI_BACKEND_MODEL="codex-cli/gpt-5.4"`
  - `OPENCLAW_LIVE_CLI_BACKEND_COMMAND="/full/path/to/claude"`
  - `OPENCLAW_LIVE_CLI_BACKEND_ARGS='["-p","--output-format","json","--permission-mode","bypassPermissions"]'`
  - `OPENCLAW_LIVE_CLI_BACKEND_CLEAR_ENV='["ANTHROPIC_API_KEY","ANTHROPIC_API_KEY_OLD"]'`
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_PROBE=1` 发送真实的图像附件（路径被注入到提示中）。
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_ARG="--image"` 将图像文件路径作为 CLI 参数传递，而不是提示注入。
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_MODE="repeat"` （或 `"list"` ）用于在设置 `IMAGE_ARG` 时控制如何传递图像参数。
  - `OPENCLAW_LIVE_CLI_BACKEND_RESUME_PROBE=1` 发送第二轮对话并验证恢复流程。
- `OPENCLAW_LIVE_CLI_BACKEND_DISABLE_MCP_CONFIG=0` 以保持 Claude Code CLI MCP 配置启用（默认情况下使用临时空文件禁用 MCP 配置）。

示例：

```bash
OPENCLAW_LIVE_CLI_BACKEND=1 \
  OPENCLAW_LIVE_CLI_BACKEND_MODEL="claude-cli/claude-sonnet-4-6" \
  pnpm test:live src/gateway/gateway-cli-backend.live.test.ts
```

### 推荐的实时测试方案

狭窄、明确的允许列表是最快且最不稳定的：

- 单个模型，直连（无网关）：
  - `OPENCLAW_LIVE_MODELS="openai/gpt-5.2" pnpm test:live src/agents/models.profiles.live.test.ts`

- 单个模型，网关冒烟测试：
  - `OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.2" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

- 跨多个提供商的工具调用：
  - `OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.2,anthropic/claude-opus-4-6,google/gemini-3-flash-preview,zai/glm-4.7,minimax/MiniMax-M2.7" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

- Google 重点关注（Gemini API 密钥 + Antigravity）：
  - Gemini (API 密钥): `OPENCLAW_LIVE_GATEWAY_MODELS="google/gemini-3-flash-preview" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`
  - Antigravity (OAuth): `OPENCLAW_LIVE_GATEWAY_MODELS="google-antigravity/claude-opus-4-6-thinking,google-antigravity/gemini-3-pro-high" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

备注：

- `google/...` 使用 Gemini API (API 密钥)。
- `google-antigravity/...` 使用 Antigravity OAuth 桥接（Cloud Code Assist 风格的代理端点）。
- `google-gemini-cli/...` 使用您机器上的本地 Gemini CLI（独立的身份验证 + 工具怪癖）。
- Gemini API 与 Gemini CLI：
  - API：OpenClaw 通过 HTTP 调用 Google 托管的 Gemini API（API 密钥 / 配置文件身份验证）；这是大多数用户所说的“Gemini”。
  - CLI：OpenClaw 调用本地 `gemini` 二进制文件；它有自己的身份验证，并且可能表现不同（流式传输/工具支持/版本偏差）。

## 实时：模型矩阵（我们涵盖的内容）

没有固定的“CI 模型列表”（实时测试是可选的），但这些是在带有密钥的开发机器上定期覆盖的**推荐**模型。

### 现代冒烟测试集（工具调用 + 图像）

这是我们期望保持正常运行的“通用模型”运行：

- OpenAI (非 Codex): `openai/gpt-5.2` (可选: `openai/gpt-5.1`)
- OpenAI Codex: `openai-codex/gpt-5.4`
- Anthropic: `anthropic/claude-opus-4-6` (或 `anthropic/claude-sonnet-4-6`)
- Google (Gemini API): `google/gemini-3.1-pro-preview` 和 `google/gemini-3-flash-preview` (避免使用较旧的 Gemini 2.x 模型)
- Google (Antigravity): `google-antigravity/claude-opus-4-6-thinking` 和 `google-antigravity/gemini-3-flash`
- Z.AI (GLM): `zai/glm-4.7`
- MiniMax: `minimax/MiniMax-M2.7`

使用工具 + 图像运行网关冒烟测试：
`OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.2,openai-codex/gpt-5.4,anthropic/claude-opus-4-6,google/gemini-3.1-pro-preview,google/gemini-3-flash-preview,google-antigravity/claude-opus-4-6-thinking,google-antigravity/gemini-3-flash,zai/glm-4.7,minimax/MiniMax-M2.7" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

### 基线：工具调用（读取 + 可选执行）

每个提供商系列至少选择一个：

- OpenAI：`openai/gpt-5.2`（或 `openai/gpt-5-mini`）
- Anthropic：`anthropic/claude-opus-4-6`（或 `anthropic/claude-sonnet-4-6`）
- Google：`google/gemini-3-flash-preview`（或 `google/gemini-3.1-pro-preview`）
- Z.AI (GLM)：`zai/glm-4.7`
- MiniMax：`minimax/MiniMax-M2.7`

可选的额外覆盖（最好有）：

- xAI：`xai/grok-4`（或最新可用版本）
- Mistral：`mistral/`…（选择一个您已启用的支持“工具”的模型）
- Cerebras：`cerebras/`…（如果您有访问权限）
- LM Studio：`lmstudio/`…（本地；工具调用取决于 API 模式）

### 视觉：图像发送（附件 → 多模态消息）

在 `OPENCLAW_LIVE_GATEWAY_MODELS` 中至少包含一个支持图像的模型（Claude/Gemini/OpenAI 支持视觉的变体等），以测试图像探测功能。

### 聚合器 / 备用网关

如果您启用了密钥，我们也支持通过以下方式进行测试：

- OpenRouter：`openrouter/...`（数百个模型；使用 `openclaw models scan` 查找支持工具和图像的候选者）
- OpenCode：`opencode/...` 用于 Zen，`opencode-go/...` 用于 Go（通过 `OPENCODE_API_KEY` / `OPENCODE_ZEN_API_KEY` 进行身份验证）

您可以在实时矩阵中包含更多提供商（如果您有凭据/配置）：

- 内置：`openai`，`openai-codex`，`anthropic`，`google`，`google-vertex`，`google-antigravity`，`google-gemini-cli`，`zai`，`openrouter`，`opencode`，`opencode-go`，`xai`，`groq`，`cerebras`，`mistral`，`github-copilot`
- 通过 `models.providers`（自定义端点）：`minimax`（云/API），加上任何 OpenAI/Anthropic 兼容的代理（LM Studio、vLLM、LiteLLM 等）

提示：不要试图在文档中硬编码“所有模型”。权威列表取决于 `discoverModels(...)` 在您的机器上返回的内容以及可用的密钥。

## 凭证（切勿提交）

Live 测试发现凭证的方式与 CLI 相同。实际影响如下：

- 如果 CLI 可以工作，Live 测试应该能找到相同的密钥。
- 如果 Live 测试提示“no creds”（无凭证），请按照调试 `openclaw models list` / 模型选择的方式进行调试。

- 配置存储：`~/.openclaw/credentials/`（首选；即测试中“profile keys”所指的内容）
- 配置：`~/.openclaw/openclaw.json`（或 `OPENCLAW_CONFIG_PATH`）

如果您想依赖环境密钥（例如在您的 `~/.profile` 中导出的），请在 `source ~/.profile` 之后运行本地测试，或使用下方的 Docker 运行器（它们可以将 `~/.profile` 挂载到容器中）。

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
  - 默认优先使用 Live/环境 API 密钥而非存储的身份配置文件，因此 `auth-profiles.json` 中过时的测试密钥不会掩盖真实的 Shell 凭证
  - 跳过没有可用身份/配置文件/模型的提供商
  - 通过共享运行时功能运行标准图像生成变体：
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
- 可选身份行为：
  - `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` 以强制使用配置存储身份验证并忽略仅限环境的覆盖

## Docker 运行器（可选的“在 Docker 下工作”检查）

这些 Docker 运行器分为两类：

- 实时模型运行器：`test:docker:live-models` 和 `test:docker:live-gateway` 在仓库 Docker 镜像内运行 `pnpm test:live`，挂载你的本地配置目录和工作区（如果挂载了，还会获取 `~/.profile`）。
- 容器冒烟运行器：`test:docker:openwebui`、`test:docker:onboard`、`test:docker:gateway-network` 和 `test:docker:plugins` 启动一个或多个真实容器并验证更高级别的集成路径。

实时模型 Docker 运行器还仅绑定挂载所需的 CLI 认证主目录（当运行未限定范围时，则挂载所有支持的主目录），然后在运行前将其复制到容器主目录，以便外部 CLI OAuth 可以刷新令牌而无需修改主机认证存储：

- 直接模型：`pnpm test:docker:live-models`（脚本：`scripts/test-live-models-docker.sh`）
- Gateway(网关) + 开发代理：`pnpm test:docker:live-gateway`（脚本：`scripts/test-live-gateway-models-docker.sh`）
- Open WebUI 实时冒烟测试：`pnpm test:docker:openwebui`（脚本：`scripts/e2e/openwebui-docker.sh`）
- 新手引导向导（TTY，完整脚手架）：`pnpm test:docker:onboard`（脚本：`scripts/e2e/onboard-docker.sh`）
- Gateway(网关) 网络（两个容器，WS 认证 + 健康检查）：`pnpm test:docker:gateway-network`（脚本：`scripts/e2e/gateway-network-docker.sh`）
- 插件（安装冒烟测试 + `/plugin` 别名 + Claude-bundle 重启语义）：`pnpm test:docker:plugins`（脚本：`scripts/e2e/plugins-docker.sh`）

live-模型 Docker 运行器也会以只读方式 bind-mount 当前检出目录，并将其暂存到容器内的临时工作目录中。这既保持了运行时镜像的精简，又能针对您的本地源代码/配置运行 Vitest。它们还设置了 `OPENCLAW_SKIP_CHANNELS=1`，以便 gateway live probes 不会在容器内启动真正的 Telegram/Discord 等渠道工作进程。`test:docker:live-models` 仍然运行 `pnpm test:live`，因此当您需要缩小或排除该 Docker 跑道中的 gateway live 覆盖范围时，也要传递 `OPENCLAW_LIVE_GATEWAY_*`。`test:docker:openwebui` 是更高级别的兼容性冒烟测试：它启动一个启用了 OpenClaw 兼容 HTTP 端点的 OpenAI 网关容器，针对该网关启动一个固定的 Open WebUI 容器，通过 Open WebUI 登录，验证 `/api/models` 暴露了 `openclaw/default`，然后通过 Open WebUI 的 `/api/chat/completions` 代理发送真实的聊天请求。首次运行可能会明显较慢，因为 Docker 可能需要拉取 Open WebUI 镜像，且 Open WebUI 可能需要完成其自身的冷启动设置。该跑道需要可用的 live 模型密钥，而 `OPENCLAW_PROFILE_FILE`（默认为 `~/.profile`）是在 Docker 化运行中提供它的主要方式。成功的运行会打印一个小的 JSON 载荷，例如 `{ "ok": true, "模型": "openclaw/default", ... }`。

手动 ACP 自然语言线程冒烟测试（非 CI）：

- `bun scripts/dev/discord-acp-plain-language-smoke.ts --channel <discord-channel-id> ...`
- 将此脚本保留用于回归/调试工作流。以后可能再次需要它来进行 ACP 线程路由验证，因此请勿删除它。

有用的环境变量：

- `OPENCLAW_CONFIG_DIR=...`（默认：`~/.openclaw`）挂载到 `/home/node/.openclaw`
- `OPENCLAW_WORKSPACE_DIR=...`（默认：`~/.openclaw/workspace`）挂载到 `/home/node/.openclaw/workspace`
- `OPENCLAW_PROFILE_FILE=...`（默认：`~/.profile`）挂载到 `/home/node/.profile` 并在运行测试之前 source
- 位于 `$HOME` 下的外部 CLI 认证目录以只读方式挂载到 `/host-auth/...` 下，然后在测试开始前复制到 `/home/node/...` 中
  - 默认：挂载所有支持的目录 (`.codex`, `.claude`, `.qwen`, `.minimax`)
  - 缩小的提供商运行仅挂载从 `OPENCLAW_LIVE_PROVIDERS` / `OPENCLAW_LIVE_GATEWAY_PROVIDERS` 推断出的所需目录
  - 使用 `OPENCLAW_DOCKER_AUTH_DIRS=all`、`OPENCLAW_DOCKER_AUTH_DIRS=none` 或类似 `OPENCLAW_DOCKER_AUTH_DIRS=.claude,.codex` 的逗号列表手动覆盖
- 使用 `OPENCLAW_LIVE_GATEWAY_MODELS=...` / `OPENCLAW_LIVE_MODELS=...` 缩小运行范围
- 使用 `OPENCLAW_LIVE_GATEWAY_PROVIDERS=...` / `OPENCLAW_LIVE_PROVIDERS=...` 在容器内过滤提供商
- 使用 `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` 确保凭据来自配置文件存储（而非环境变量）
- 使用 `OPENCLAW_OPENWEBUI_MODEL=...` 选择网关为 Open WebUI 冒烟测试暴露的模型
- 使用 `OPENCLAW_OPENWEBUI_PROMPT=...` 覆盖 Open WebUI 冒烟测试使用的 nonce 检查提示
- 使用 `OPENWEBUI_IMAGE=...` 覆盖固定的 Open WebUI 镜像标签

## 文档健全性检查

文档编辑后运行文档检查：`pnpm docs:list`。

## 离线回归 (CI 安全)

这些是没有真实提供商的“真实管道”回归：

- Gateway(网关) 工具调用 (模拟 Gateway(网关), 真实 gateway + agent 循环): `src/gateway/gateway.test.ts` (case: "runs a mock OpenAI 工具 call end-to-end via gateway agent loop")
- Gateway(网关) 向导 (WS `wizard.start`/`wizard.next`, 写入配置 + 强制执行身份验证): `src/gateway/gateway.test.ts` (case: "runs wizard over ws and writes auth token config")

## Agent 可靠性评估

我们已经有一些 CI 安全的测试，其行为类似于“agent 可靠性评估”：

- 通过真实的 gateway + agent 循环模拟工具调用 (`src/gateway/gateway.test.ts`)。
- 验证会话连线和配置效果的端到端向导流程 (`src/gateway/gateway.test.ts`)。

Skills 目前仍然缺失的内容 (参见 [Skills](/zh/tools/skills))：

- **决策制定：** 当提示中列出了 Skills 时，agent 是否会选择正确的 skill（或避开不相关的 skill）？
- **合规性：** agent 在使用前是否会阅读 `SKILL.md` 并遵循所需的步骤/参数？
- **工作流合约：** 断言工具顺序、会话历史继承和沙箱边界的多轮场景。

未来的评估应首先保持确定性：

- 使用模拟提供商断言工具调用和顺序、技能文件读取以及会话连接的场景运行器。
- 一小套专注于技能的场景（使用与避免、门控、提示注入）。
- 仅在设置了 CI 安全套件后才进行可选的实时评估（选择性加入、环境门控）。

## 合约测试（插件和渠道形状）

合约测试验证每个注册的插件和渠道是否符合其接口合约。它们遍历所有发现的插件并运行一系列形状和行为断言。

### 命令

- 所有合约： `pnpm test:contracts`
- 仅渠道合约： `pnpm test:contracts:channels`
- 仅提供商合约： `pnpm test:contracts:plugins`

### 渠道合约

位于 `src/channels/plugins/contracts/*.contract.test.ts`：

- **plugin** - 基本插件形状（id、name、capabilities）
- **setup** - 设置向导弹约
- **会话-binding** - 会话绑定行为
- **outbound-payload** - 消息有效载荷结构
- **inbound** - 入站消息处理
- **actions** - 渠道操作处理程序
- **threading** - 线程 ID 处理
- **directory** - 目录/名册 API
- **group-policy** - 组策略执行
- **status** - 渠道状态探测
- **registry** - 插件注册表形状

### 提供商合约

位于 `src/plugins/contracts/*.contract.test.ts`：

- **auth** - 认证流程合约
- **auth-choice** - 认证选择/选择
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

当您修复在实时测试中发现的提供商/模型问题时：

- 如果可能，添加一个 CI 安全的回归测试（模拟/存根提供商，或捕获确切的请求形状转换）
- 如果它本质上仅限实时（速率限制、认证策略），请保持实时测试狭窄并通过环境变量选择性加入
- 优先定位能捕获该问题的最小层：
  - 提供商 请求转换/重放错误 → 直接模型测试
  - 网关会话/历史/工具 管道错误 → 网关实时冒烟测试或 CI 安全的网关模拟测试
- SecretRef 遍历防护：
  - `src/secrets/exec-secret-ref-id-parity.test.ts` 从注册表元数据 (`listSecretTargetRegistryEntries()`) 中为每个 SecretRef 类派生一个采样目标，然后断言遍历段执行 ID 被拒绝。
  - 如果在 `src/secrets/target-registry-data.ts` 中添加了新的 `includeInPlan` SecretRef 目标系列，请在该测试中更新 `classifyTargetClass`。该测试会在未分类的目标 ID 上故意失败，以免新类别被默默跳过。
