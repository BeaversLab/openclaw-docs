---
summary: "Testing kit: unit/e2e/live suites, Docker runners, and what each test covers"
read_when:
  - Running tests locally or in CI
  - Adding regressions for 模型/提供商 bugs
  - Debugging gateway + agent behavior
title: "Testing"
---

# Testing

OpenClaw has three Vitest suites (unit/integration, e2e, live) and a small set of Docker runners.

This doc is a “how we test” guide:

- What each suite covers (and what it deliberately does _not_ cover)
- Which commands to run for common workflows (local, pre-push, debugging)
- How live tests discover credentials and select models/providers
- How to add regressions for real-world 模型/提供商 issues

## 快速开始

Most days:

- Full gate (expected before push): `pnpm build && pnpm check && pnpm test`

When you touch tests or want extra confidence:

- Coverage gate: `pnpm test:coverage`
- E2E suite: `pnpm test:e2e`

When debugging real providers/models (requires real creds):

- Live suite (models + gateway 工具/image probes): `pnpm test:live`

Tip: when you only need one failing case, prefer narrowing live tests via the allowlist 环境变量 described below.

## Test suites (what runs where)

Think of the suites as “increasing realism” (and increasing flakiness/cost):

### Unit / integration (default)

- Command: `pnpm test`
- Config: `scripts/test-parallel.mjs` (runs `vitest.unit.config.ts`, `vitest.extensions.config.ts`, `vitest.gateway.config.ts`)
- Files: `src/**/*.test.ts`, `extensions/**/*.test.ts`
- Scope:
  - Pure unit tests
  - In-process integration tests (gateway auth, routing, tooling, parsing, config)
  - Deterministic regressions for known bugs
- Expectations:
  - Runs in CI
  - No real keys required
  - Should be fast and stable
- Embedded runner note:
  - When you change message-工具 discovery inputs or compaction runtime context,
    keep both levels of coverage.
  - Add focused helper regressions for pure routing/normalization boundaries.
  - Also keep the embedded runner integration suites healthy:
    `src/agents/pi-embedded-runner/compact.hooks.test.ts`,
    `src/agents/pi-embedded-runner/run.overflow-compaction.test.ts`, and
    `src/agents/pi-embedded-runner/run.overflow-compaction.loop.test.ts`.
  - 这些测试套件验证了作用域 ID 和压缩行为是否仍然通过真实的 `run.ts` / `compact.ts` 路径；仅针对辅助功能的测试不足以替代这些集成路径。
- Pool 说明：
  - OpenClaw 在 Node 22、23 和 24 上使用 Vitest `vmForks` 以实现更快的单元分片。
  - 在 Node 25+ 上，OpenClaw 会自动回退到常规 `forks`，直到在该版本上重新验证代码库。
  - 使用 `OPENCLAW_TEST_VM_FORKS=0`（强制 `forks`）或 `OPENCLAW_TEST_VM_FORKS=1`（强制 `vmForks`）手动覆盖。

### E2E (gateway smoke)

- 命令：`pnpm test:e2e`
- 配置：`vitest.e2e.config.ts`
- 文件：`src/**/*.e2e.test.ts`, `test/**/*.e2e.test.ts`
- 运行时默认值：
  - 使用 Vitest `vmForks` 以实现更快的文件启动。
  - 使用自适应工作线程（CI: 2-4，本地: 4-8）。
  - 默认以静默模式运行，以减少控制台 I/O 开销。
- 有用的覆盖选项：
  - 使用 `OPENCLAW_E2E_WORKERS=<n>` 强制设置工作线程数量（上限为 16）。
  - 使用 `OPENCLAW_E2E_VERBOSE=1` 重新启用详细控制台输出。
- 范围：
  - 多实例网关端到端行为
  - WebSocket/HTTP 表面、节点配对和较重的网络操作
- 预期：
  - 在 CI 中运行（在管道中启用时）
  - 不需要真实的密钥
  - 比单元测试涉及更多组件（可能较慢）

### E2E: OpenShell backend smoke

- 命令：`pnpm test:e2e:openshell`
- 文件：`test/openshell-sandbox.e2e.test.ts`
- 范围：
  - 通过 Docker 在主机上启动一个隔离的 OpenShell 网关
  - 从临时本地 Dockerfile 创建沙箱
  - 通过真实的 `sandbox ssh-config` + SSH exec 运行 OpenClaw 的 OpenShell 后端
  - 通过沙箱 fs 桥接验证远程规范文件系统行为
- 预期：
  - 仅限选择加入；不属于默认 `pnpm test:e2e` 运行的一部分
  - 需要本地 `openshell` CLI 以及正常工作的 Docker 守护进程
  - 使用隔离的 `HOME` / `XDG_CONFIG_HOME`，然后销毁测试网关和沙箱
- 有用的覆盖选项：
  - `OPENCLAW_E2E_OPENSHELL=1` 以在手动运行更广泛的 e2e 套件时启用该测试
  - `OPENCLAW_E2E_OPENSHELL_COMMAND=/path/to/openshell` 指向非默认的 CLI 二进制文件或包装脚本

### Live（真实的提供商 + 真实的模型）

- 命令：`pnpm test:live`
- 配置：`vitest.live.config.ts`
- 文件：`src/**/*.live.test.ts`
- 默认：通过 `pnpm test:live` **启用**（设置 `OPENCLAW_LIVE_TEST=1`）
- 范围：
  - “该提供商/模型在真实的凭据下今天真的能工作吗？”
  - 捕获提供商格式变更、工具调用怪癖、身份验证问题和速率限制行为
- 预期：
  - 设计上不支持 CI 稳定性（真实的网络、真实的提供商策略、配额、中断）
  - 花费金钱 / 使用速率限制
  - 优先运行缩小的子集而不是“所有内容”
  - Live 运行将获取 `~/.profile` 以拾取缺失的 API 密钥
- API 密钥轮换（特定于提供商）：使用逗号/分号格式设置 `*_API_KEYS` 或 `*_API_KEY_1`，`*_API_KEY_2`（例如 `OPENAI_API_KEYS`，`ANTHROPIC_API_KEYS`，`GEMINI_API_KEYS`）或通过 `OPENCLAW_LIVE_*_KEY` 进行每次 live 的覆盖；测试会在速率限制响应上重试。

## 我应该运行哪个套件？

使用此决策表：

- 编辑逻辑/测试：运行 `pnpm test`（如果修改很多，则运行 `pnpm test:coverage`）
- 涉及网关网络 / WS 协议 / 配对：添加 `pnpm test:e2e`
- 调试“我的机器人挂了”/ 特定于提供商的故障 / 工具调用：运行缩小范围的 `pnpm test:live`

## Live：Android 节点功能扫描

- 测试：`src/gateway/android-node.capabilities.live.test.ts`
- 脚本：`pnpm android:test:integration`
- 目标：调用已连接的 Android 节点当前发布的**所有命令**并断言命令契约行为。
- 范围：
  - 预条件/手动设置（该套件不安装/运行/配对应用）。
  - 针对所选 Android 节点的逐个命令网关 `node.invoke` 验证。
- 必需的预先设置：
  - Android 应用已连接并与网关配对。
  - 应用保持在前台。
  - 已为您期望通过的功能授予权限/捕获同意。
- 可选的目标覆盖：
  - `OPENCLAW_ANDROID_NODE_ID` 或 `OPENCLAW_ANDROID_NODE_NAME`。
  - `OPENCLAW_ANDROID_GATEWAY_URL` / `OPENCLAW_ANDROID_GATEWAY_TOKEN` / `OPENCLAW_ANDROID_GATEWAY_PASSWORD`。
- 完整的 Android 设置详情：[Android App](/zh/platforms/android)

## 实时：模型冒烟测试 (profile keys)

实时测试分为两层，以便我们隔离故障：

- “直接模型”告诉我们提供商/模型是否能使用给定的密钥做出回应。
- “Gateway(网关) 冒烟测试”告诉我们完整的 gateway+agent 流程是否适用于该模型（会话、历史记录、工具、沙箱策略等）。

### 第 1 层：直接模型补全（无 gateway）

- 测试：`src/agents/models.profiles.live.test.ts`
- 目标：
  - 枚举已发现的模型
  - 使用 `getApiKeyForModel` 选择你拥有凭据的模型
  - 为每个模型运行一个小型补全（并在需要时运行针对性的回归测试）
- 如何启用：
  - `pnpm test:live`（或者如果直接调用 Vitest，则使用 `OPENCLAW_LIVE_TEST=1`）
- 设置 `OPENCLAW_LIVE_MODELS=modern`（或 `all`，modern 的别名）以实际运行此套件；否则它会跳过，以保持 `pnpm test:live` 专注于 gateway 冒烟测试
- 如何选择模型：
  - `OPENCLAW_LIVE_MODELS=modern` 运行 modern 允许列表 (Opus/Sonnet/Haiku 4.5, GPT-5.x + Codex, Gemini 3, GLM 4.7, MiniMax M2.5, Grok 4)
  - `OPENCLAW_LIVE_MODELS=all` 是 modern 允许列表的别名
  - 或者 `OPENCLAW_LIVE_MODELS="openai/gpt-5.2,anthropic/claude-opus-4-6,..."`（逗号分隔允许列表）
- 如何选择提供商：
  - `OPENCLAW_LIVE_PROVIDERS="google,google-antigravity,google-gemini-cli"`（逗号分隔允许列表）
- 密钥来源：
  - 默认情况下：配置文件存储和环境变量后备
  - 设置 `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` 以强制仅使用 **配置文件存储**
- 存在原因：
  - 将“提供商 API 损坏 / 密钥无效”与“gateway agent 流程损坏”区分开来
  - 包含小型、隔离的回归测试（例如：OpenAI Responses/Codex Responses 推理重放 + 工具调用流程）

### 第 2 层：Gateway(网关) + dev agent 冒烟测试（即“@openclaw”实际执行的操作）

- 测试：`src/gateway/gateway-models.profiles.live.test.ts`
- 目标：
  - 启动进程内 gateway
  - 创建/修补 `agent:dev:*` 会话（每次运行的模型覆盖）
  - 迭代带密钥的模型并断言：
    - “有意义”的响应（无工具）
    - 真实的工具调用有效（读取探针）
    - 可选的额外工具探针（执行+读取探针）
    - OpenAI 回归路径（仅工具调用 → 后续跟进）保持正常工作
- 探针详情（以便您可以快速解释失败原因）：
  - `read` 探针：测试在工作区中写入一个 nonce 文件，并要求代理 `read` 该文件并将 nonce 回显。
  - `exec+read` 探针：测试要求代理将 nonce `exec`-写入到临时文件中，然后 `read` 读取该文件。
  - 图像探针：测试附加一个生成的 PNG（猫 + 随机代码），并期望模型返回 `cat <CODE>`。
  - 实现参考：`src/gateway/gateway-models.profiles.live.test.ts` 和 `src/gateway/live-image-probe.ts`。
- 如何启用：
  - `pnpm test:live` （或者如果直接调用 Vitest 则使用 `OPENCLAW_LIVE_TEST=1`）
- 如何选择模型：
  - 默认：现代允许列表（Opus/Sonnet/Haiku 4.5、GPT-5.x + Codex、Gemini 3、GLM 4.7、MiniMax M2.5、Grok 4）
  - `OPENCLAW_LIVE_GATEWAY_MODELS=all` 是现代允许列表的别名
  - 或者设置 `OPENCLAW_LIVE_GATEWAY_MODELS="provider/model"` （或逗号分隔的列表）以缩小范围
- 如何选择提供商（避免“全部使用 OpenRouter”）：
  - `OPENCLAW_LIVE_GATEWAY_PROVIDERS="google,google-antigravity,google-gemini-cli,openai,anthropic,zai,minimax"` （逗号分隔的允许列表）
- 在此实时测试中，工具 + 图像探针始终开启：
  - `read` 探针 + `exec+read` 探针（工具压力测试）
  - 当模型宣称支持图像输入时，运行图像探针
  - 流程（高层级）：
    - 测试生成一个带有“CAT” + 随机代码的微型 PNG（`src/gateway/live-image-probe.ts`）
    - 通过 `agent` `attachments: [{ mimeType: "image/png", content: "<base64>" }]` 发送
    - Gateway(网关) 将附件解析为 `images[]` （`src/gateway/server-methods/agent.ts` + `src/gateway/chat-attachments.ts`）
    - 嵌入式代理向模型转发多模态用户消息
    - 断言：回复包含 `cat` + 代码（OCR 容差：允许轻微错误）

提示：要查看您可以在机器上测试的内容（以及确切的 `provider/model` id），请运行：

```bash
openclaw models list
openclaw models list --json
```

## 实时：Anthropic setup-token 冒烟测试

- 测试：`src/agents/anthropic.setup-token.live.test.ts`
- 目标：验证 Claude Code CLI setup-token（或粘贴的 setup-token 配置文件）能否完成 Anthropic 提示。
- 启用：
  - `pnpm test:live`（如果直接调用 Vitest，则使用 `OPENCLAW_LIVE_TEST=1`）
  - `OPENCLAW_LIVE_SETUP_TOKEN=1`
- 令牌来源（选择一项）：
  - 配置文件：`OPENCLAW_LIVE_SETUP_TOKEN_PROFILE=anthropic:setup-token-test`
  - 原始令牌：`OPENCLAW_LIVE_SETUP_TOKEN_VALUE=sk-ant-oat01-...`
- 模型覆盖（可选）：
  - `OPENCLAW_LIVE_SETUP_TOKEN_MODEL=anthropic/claude-opus-4-6`

设置示例：

```bash
openclaw models auth paste-token --provider anthropic --profile-id anthropic:setup-token-test
OPENCLAW_LIVE_SETUP_TOKEN=1 OPENCLAW_LIVE_SETUP_TOKEN_PROFILE=anthropic:setup-token-test pnpm test:live src/agents/anthropic.setup-token.live.test.ts
```

## Live: CLI backend smoke (Claude Code CLI 或其他本地 CLIs)

- 测试：`src/gateway/gateway-cli-backend.live.test.ts`
- 目标：使用本地 Gateway(网关) 后端验证 CLI + agent 管道，而不触及您的默认配置。
- 启用：
  - `pnpm test:live`（如果直接调用 Vitest，则使用 `OPENCLAW_LIVE_TEST=1`）
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
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_PROBE=1` 用于发送真实的图片附件（路径会被注入到提示词中）。
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_ARG="--image"` 用于将图片文件路径作为 CLI 参数传递，而不是提示词注入。
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_MODE="repeat"`（或 `"list"`）用于控制当设置了 `IMAGE_ARG` 时如何传递图片参数。
  - `OPENCLAW_LIVE_CLI_BACKEND_RESUME_PROBE=1` 用于发送第二轮并验证恢复流程。
- `OPENCLAW_LIVE_CLI_BACKEND_DISABLE_MCP_CONFIG=0` 用于保持 Claude Code CLI MCP 配置启用（默认情况下会使用临时空文件禁用 MCP 配置）。

示例：

```bash
OPENCLAW_LIVE_CLI_BACKEND=1 \
  OPENCLAW_LIVE_CLI_BACKEND_MODEL="claude-cli/claude-sonnet-4-6" \
  pnpm test:live src/gateway/gateway-cli-backend.live.test.ts
```

### 推荐的 Live 配方

狭窄且明确的允许列表是最快且最不易出错的：

- 单个模型，直连（无 gateway）：
  - `OPENCLAW_LIVE_MODELS="openai/gpt-5.2" pnpm test:live src/agents/models.profiles.live.test.ts`

- 单个模型，gateway smoke：
  - `OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.2" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

- 跨多个提供商的工具调用：
  - `OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.2,anthropic/claude-opus-4-6,google/gemini-3-flash-preview,zai/glm-4.7,minimax/minimax-m2.5" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

- Google 侧重（Gemini API 密钥 + Antigravity）：
  - Gemini（API 密钥）：`OPENCLAW_LIVE_GATEWAY_MODELS="google/gemini-3-flash-preview" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`
  - Antigravity（OAuth）：`OPENCLAW_LIVE_GATEWAY_MODELS="google-antigravity/claude-opus-4-6-thinking,google-antigravity/gemini-3-pro-high" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

注意：

- `google/...` 使用 Gemini API（API 密钥）。
- `google-antigravity/...` 使用 Antigravity OAuth 桥接（Cloud Code Assist 风格的代理端点）。
- `google-gemini-cli/...` 使用您机器上的本地 Gemini CLI（独立的身份验证 + 工具怪癖）。
- Gemini API 与 Gemini CLI：
  - API：OpenClaw 通过 HTTP 调用 Google 托管的 Gemini API（API 密钥 / 配置文件身份验证）；这就是大多数用户所说的“Gemini”。
  - CLI：OpenClaw 调用本地的 `gemini` 二进制文件；它有自己的身份验证，并且行为可能有所不同（流式传输/工具支持/版本偏差）。

## Live: 模型矩阵（我们涵盖的内容）

没有固定的“CI 模型列表”（Live 是可选参与的），但这些是在拥有密钥的开发机器上定期覆盖的**推荐**模型。

### Modern smoke set（工具调用 + 图像）

这是我们期望持续运行的“通用模型”运行："

- OpenAI（非 Codex）：`openai/gpt-5.2`（可选：`openai/gpt-5.1`）
- OpenAI Codex：`openai-codex/gpt-5.4`
- Anthropic：`anthropic/claude-opus-4-6`（或 `anthropic/claude-sonnet-4-5`）
- Google（Gemini API）：`google/gemini-3.1-pro-preview` 和 `google/gemini-3-flash-preview`（避免使用较旧的 Gemini 2.x 模型）
- Google (Antigravity)：`google-antigravity/claude-opus-4-6-thinking` 和 `google-antigravity/gemini-3-flash`
- Z.AI (GLM)：`zai/glm-4.7`
- MiniMax：`minimax/minimax-m2.5`

使用工具 + 图像运行网关冒烟测试：
`OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.2,openai-codex/gpt-5.4,anthropic/claude-opus-4-6,google/gemini-3.1-pro-preview,google/gemini-3-flash-preview,google-antigravity/claude-opus-4-6-thinking,google-antigravity/gemini-3-flash,zai/glm-4.7,minimax/minimax-m2.5" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

### 基准：工具调用（读取 + 可选执行）

每个提供商系列至少选择一个：

- OpenAI：`openai/gpt-5.2`（或 `openai/gpt-5-mini`）
- Anthropic：`anthropic/claude-opus-4-6`（或 `anthropic/claude-sonnet-4-5`）
- Google：`google/gemini-3-flash-preview`（或 `google/gemini-3.1-pro-preview`）
- Z.AI (GLM)：`zai/glm-4.7`
- MiniMax：`minimax/minimax-m2.5`

可选的额外覆盖（最好有）：

- xAI：`xai/grok-4`（或最新的可用版本）
- Mistral：`mistral/`…（选择一个您已启用的支持“工具”的模型）
- Cerebras：`cerebras/`…（如果您有访问权限）
- LM Studio：`lmstudio/`…（本地；工具调用取决于 API 模式）

### Vision: image send (attachment → multimodal message)

Include at least one image-capable 模型 in `OPENCLAW_LIVE_GATEWAY_MODELS` (Claude/Gemini/OpenAI vision-capable variants, etc.) to exercise the image probe.

### Aggregators / alternate gateways

If you have keys enabled, we also support testing via:

- OpenRouter: `openrouter/...` (hundreds of models; use `openclaw models scan` to find 工具+image capable candidates)
- OpenCode: `opencode/...` for Zen and `opencode-go/...` for Go (auth via `OPENCODE_API_KEY` / `OPENCODE_ZEN_API_KEY`)

More providers you can include in the live matrix (if you have creds/config):

- Built-in: `openai`, `openai-codex`, `anthropic`, `google`, `google-vertex`, `google-antigravity`, `google-gemini-cli`, `zai`, `openrouter`, `opencode`, `opencode-go`, `xai`, `groq`, `cerebras`, `mistral`, `github-copilot`
- Via `models.providers` (custom endpoints): `minimax` (cloud/API), plus any OpenAI/Anthropic-compatible proxy (LM Studio, vLLM, LiteLLM, etc.)

Tip: don’t try to hardcode “all models” in docs. The authoritative list is whatever `discoverModels(...)` returns on your machine + whatever keys are available.

## Credentials (never commit)

Live tests discover credentials the same way the CLI does. Practical implications:

- If the CLI works, live tests should find the same keys.
- If a live test says “no creds”, debug the same way you’d debug `openclaw models list` / 模型 selection.

- Profile store: `~/.openclaw/credentials/` (preferred; what “profile keys” means in the tests)
- Config: `~/.openclaw/openclaw.json` (or `OPENCLAW_CONFIG_PATH`)

如果您想依赖环境密钥（例如在您的 `~/.profile` 中导出的），请在 `source ~/.profile` 之后运行本地测试，或者使用下面的 Docker 运行器（它们可以将 `~/.profile` 挂载到容器中）。

## Deepgram live（音频转录）

- 测试：`src/media-understanding/providers/deepgram/audio.live.test.ts`
- 启用：`DEEPGRAM_API_KEY=... DEEPGRAM_LIVE_TEST=1 pnpm test:live src/media-understanding/providers/deepgram/audio.live.test.ts`

## BytePlus 编码计划实时测试

- 测试：`src/agents/byteplus.live.test.ts`
- 启用：`BYTEPLUS_API_KEY=... BYTEPLUS_LIVE_TEST=1 pnpm test:live src/agents/byteplus.live.test.ts`
- 可选的模型覆盖：`BYTEPLUS_CODING_MODEL=ark-code-latest`

## 图像生成实时测试

- 测试：`src/image-generation/runtime.live.test.ts`
- 命令：`pnpm test:live src/image-generation/runtime.live.test.ts`
- 范围：
  - 枚举每个已注册的图像生成提供商插件
  - 在探测之前，从您的登录 shell (`~/.profile`) 加载缺失的提供商环境变量
  - 默认优先使用实时/环境 API 密钥而非存储的身份验证配置文件，因此 `auth-profiles.json` 中的陈旧测试密钥不会掩盖真实的 shell 凭据
  - 跳过没有可用身份验证/配置文件/模型的提供商
  - 通过共享运行时能力运行标准图像生成变体：
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
- 可选的身份验证行为：
  - `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` 以强制使用配置文件存储的身份验证并忽略仅环境的覆盖

## Docker 运行器（可选的“在 Linux 中工作”检查）

这些在仓库 Docker 镜像内运行 `pnpm test:live`，挂载您的本地配置目录和工作区（如果挂载了则获取 `~/.profile`）。它们还会在存在时绑定挂载 CLI 身份验证主目录，如 `~/.codex`、`~/.claude`、`~/.qwen` 和 `~/.minimax`，然后在运行前将其复制到容器主目录中，以便外部 CLI OAuth 可以刷新令牌而无需更改主机身份验证存储：

- 直接模型：`pnpm test:docker:live-models`（脚本：`scripts/test-live-models-docker.sh`）
- Gateway(网关) + 开发代理：`pnpm test:docker:live-gateway`（脚本：`scripts/test-live-gateway-models-docker.sh`）
- 新手引导向导（TTY，完整脚手架）：`pnpm test:docker:onboard`（脚本：`scripts/e2e/onboard-docker.sh`）
- Gateway(网关) 网络（两个容器，WS 认证 + 健康）：`pnpm test:docker:gateway-network`（脚本：`scripts/e2e/gateway-network-docker.sh`）
- 插件（自定义扩展加载 + 注册冒烟测试）：`pnpm test:docker:plugins`（脚本：`scripts/e2e/plugins-docker.sh`）

实时模型 Docker 运行器还会将当前检出目录以只读方式挂载，并将其暂存到容器内部的临时工作目录中。这既使运行时镜像保持精简，又能针对您确切的本地源代码/配置运行 Vitest。`test:docker:live-models` 仍运行 `pnpm test:live`，因此当您需要缩小或排除该 Docker 路径中的 Gateway(网关) 实时覆盖范围时，也请传递 `OPENCLAW_LIVE_GATEWAY_*`。

手动 ACP 纯语言线程冒烟测试（非 CI）：

- `bun scripts/dev/discord-acp-plain-language-smoke.ts --channel <discord-channel-id> ...`
- 保留此脚本用于回归/调试工作流。以后可能还需要用它进行 ACP 线程路由验证，因此请勿删除。

有用的环境变量：

- `OPENCLAW_CONFIG_DIR=...`（默认值：`~/.openclaw`）挂载到 `/home/node/.openclaw`
- `OPENCLAW_WORKSPACE_DIR=...`（默认值：`~/.openclaw/workspace`）挂载到 `/home/node/.openclaw/workspace`
- `OPENCLAW_PROFILE_FILE=...`（默认值：`~/.profile`）挂载到 `/home/node/.profile` 并在运行测试之前加载
- `$HOME` 下的外部 CLI 认证目录（`.codex`、`.claude`、`.qwen`、`.minimax`）以只读方式挂载到 `/host-auth/...` 下，然后在测试开始前复制到 `/home/node/...` 中
- `OPENCLAW_LIVE_GATEWAY_MODELS=...` / `OPENCLAW_LIVE_MODELS=...` 以缩小运行范围
- `OPENCLAW_LIVE_GATEWAY_PROVIDERS=...` / `OPENCLAW_LIVE_PROVIDERS=...` 以在容器内过滤提供商
- `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` 以确保凭证来自配置文件存储（而非环境变量）

## 文档合理性检查

在文档编辑后运行文档检查：`pnpm docs:list`。

## 离线回归测试（CI 安全）

这些是没有真实提供商的“真实管道”回归测试：

- Gateway(网关) 工具调用（模拟 OpenAI，真实 gateway + agent 循环）：`src/gateway/gateway.test.ts`（案例：“通过 gateway agent 循环端到端运行模拟 OpenAI 工具调用”）
- Gateway(网关) 向导（WS `wizard.start`/`wizard.next`，写入配置 + 强制执行身份验证）：`src/gateway/gateway.test.ts`（案例：“通过 ws 运行向导并写入身份验证令牌配置”）

## Agent 可靠性评估（Skills）

我们已经有了一些 CI 安全的测试，其行为类似于“agent 可靠性评估”：

- 通过真实 gateway + agent 循环进行模拟工具调用（`src/gateway/gateway.test.ts`）。
- 验证会话连接和配置效果的端到端向导流程（`src/gateway/gateway.test.ts`）。

Skills 仍然缺少什么（请参阅 [Skills](/zh/tools/skills)）：

- **决策制定：**当提示中列出了 Skills 时，agent 是否会选择正确的 Skill（或避开不相关的 Skill）？
- **合规性：**agent 在使用之前是否阅读 `SKILL.md` 并遵循所需的步骤/参数？
- **工作流合约：**断言工具顺序、会话历史继承和沙箱边界的多轮场景。

未来的评估应首先保持确定性：

- 使用模拟提供商的场景运行器，用于断言工具调用 + 顺序、Skill 文件读取和会话连接。
- 一小套专注于 Skills 的场景（使用 vs 避开、门控、提示注入）。
- 只有在 CI 安全套件到位后，才进行可选的实时评估（可选、环境限制）。

## 添加回归测试（指导）

当您修复在实时测试中发现的提供商/模型问题时：

- 如果可能，请添加 CI 安全的回归测试（模拟/存根提供商，或捕获确切的请求形状转换）
- 如果它本质上仅限于实时环境（速率限制、身份验证策略），请保持实时测试狭窄并通过环境变量选择加入
- 优先定位捕获错误的最小层：
  - 提供商请求转换/重放错误 → 直接模型测试
  - gateway 会话/历史/工具管道错误 → gateway 实时冒烟测试或 CI 安全 gateway 模拟测试
- SecretRef 遍历防护措施：
  - `src/secrets/exec-secret-ref-id-parity.test.ts` 从注册表元数据 (`listSecretTargetRegistryEntries()`) 为每个 SecretRef 类派生一个采样目标，然后断言遍历段执行 ID 被拒绝。
  - 如果在 `src/secrets/target-registry-data.ts` 中添加了新的 `includeInPlan` SecretRef 目标系列，请在该测试中更新 `classifyTargetClass`。该测试会在未分类的目标 ID 上故意失败，以便新类不会被静默跳过。

import en from "/components/footer/en.mdx";

<en />
