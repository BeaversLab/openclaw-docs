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

- 每个套件涵盖的内容（以及它故意_不_涵盖的内容）
- 针对常见工作流（本地、推送前、调试）运行哪些命令
- Live 测试如何发现凭证并选择模型/提供商
- 如何为现实世界的模型/提供商问题添加回归测试

## 快速开始

大多数时候：

- 完整网关（推送前预期）：`pnpm build && pnpm check && pnpm test`

当您修改测试或需要额外的信心时：

- 覆盖率网关：`pnpm test:coverage`
- E2E 套件：`pnpm test:e2e`

调试真实的提供商/模型时（需要真实的凭证）：

- Live 套件（模型 + 网关工具/镜像探测）：`pnpm test:live`

提示：当您只需要一个失败用例时，优先使用下面描述的允许列表 环境变量来缩小 Live 测试范围。

## 测试套件（哪里运行什么）

可以将这些套件视为“真实性递增”（以及不稳定性/成本递增）：

### 单元 / 集成（默认）

- 命令：`pnpm test`
- 配置：`scripts/test-parallel.mjs`（运行 `vitest.unit.config.ts`、`vitest.extensions.config.ts`、`vitest.gateway.config.ts`）
- 文件：`src/**/*.test.ts`、`extensions/**/*.test.ts`
- 范围：
  - 纯单元测试
  - 进程内集成测试（网关身份验证、路由、工具、解析、配置）
  - 针对已知错误的确定性回归测试
- 预期：
  - 在 CI 中运行
  - 不需要真实的密钥
  - 应该快速且稳定
- 池说明：
  - OpenClaw 在 Node 22/23 上使用 Vitest `vmForks` 以实现更快的单元分片。
  - 在 Node 24+ 上，OpenClaw 会自动回退到常规的 `forks` 以避免 Node VM 链接错误（`ERR_VM_MODULE_LINK_FAILURE` / `module is already linked`）。
  - 可以通过 `OPENCLAW_TEST_VM_FORKS=0`（强制 `forks`）或 `OPENCLAW_TEST_VM_FORKS=1`（强制 `vmForks`）手动覆盖。

### E2E（网关冒烟测试）

- 命令：`pnpm test:e2e`
- 配置：`vitest.e2e.config.ts`
- 文件：`src/**/*.e2e.test.ts`
- 运行时默认值：
  - 使用 Vitest `vmForks` 以加快文件启动速度。
  - 使用自适应工作线程（CI: 2-4，本地: 4-8）。
  - 默认以静默模式运行以减少控制台 I/O 开销。
- 有用的覆盖选项：
  - `OPENCLAW_E2E_WORKERS=<n>` 强制工作线程数量（上限为 16）。
  - `OPENCLAW_E2E_VERBOSE=1` 重新启用详细控制台输出。
- 范围：
  - 多实例网关端到端行为
  - WebSocket/HTTP 接口、节点配对和更繁重的网络操作
- 预期：
  - 在 CI 中运行（当在管道中启用时）
  - 不需要真实的密钥
  - 比单元测试有更多活动部件（可能会更慢）

### Live（真实提供商 + 真实模型）

- 命令：`pnpm test:live`
- 配置：`vitest.live.config.ts`
- 文件：`src/**/*.live.test.ts`
- 默认：`pnpm test:live` **默认启用**（设置 `OPENCLAW_LIVE_TEST=1`）
- 范围：
  - “此提供商/模型_今天_是否真的能使用真实凭证工作？”
  - 捕获提供商格式更改、工具调用怪癖、身份验证问题和速率限制行为
- 预期：
  - 设计上不支持 CI 稳定性（真实网络、真实提供商策略、配额、中断）
  - 需要花钱 / 使用速率限制
  - 建议运行缩小的子集而不是“所有内容”
  - Live 运行将从 `~/.profile` 获取源以获取缺失的 API 密钥
- API 密钥轮换（特定于提供商）：使用逗号/分号格式设置 `*_API_KEYS` 或 `*_API_KEY_1`、`*_API_KEY_2`（例如 `OPENAI_API_KEYS`、`ANTHROPIC_API_KEYS`、`GEMINI_API_KEYS`）或通过 `OPENCLAW_LIVE_*_KEY` 进行每次 live 覆盖；测试在遇到速率限制响应时重试。

## 我应该运行哪个套件？

请使用此决策表：

- 编辑逻辑/测试：运行 `pnpm test`（如果更改较多，则同时运行 `pnpm test:coverage`）
- 涉及网关网络 / WS 协议 / 配对：添加 `pnpm test:e2e`
- 调试“我的机器人挂了”/ 特定于提供商的故障 / 工具调用：运行缩小范围的 `pnpm test:live`

## Live：Android 节点功能扫描

- 测试：`src/gateway/android-node.capabilities.live.test.ts`
- 脚本：`pnpm android:test:integration`
- 目标：调用已连接的 Android 节点当前**通告的所有命令**，并断言命令契约行为。
- 范围：
  - 预置/手动设置（该套件不安装/运行/配对应用）。
  - 针对所选 Android 节点的逐命令网关 `node.invoke` 验证。
- 必需的预先设置：
  - Android 应用已连接并与网关配对。
  - 应用保持在前台。
  - 已为您期望通过的权限授予捕获权限/同意。
- 可选的目标覆盖：
  - `OPENCLAW_ANDROID_NODE_ID` 或 `OPENCLAW_ANDROID_NODE_NAME`。
  - `OPENCLAW_ANDROID_GATEWAY_URL` / `OPENCLAW_ANDROID_GATEWAY_TOKEN` / `OPENCLAW_ANDROID_GATEWAY_PASSWORD`。
- 完整的 Android 设置详情：[Android 应用](/zh/en/platforms/android)

## Live：模型冒烟测试（配置文件密钥）

Live 测试分为两层，以便我们隔离故障：

- “直接模型”告诉我们提供商/模型是否可以使用给定的密钥进行应答。
- “网关冒烟测试”告诉我们完整的网关+代理流水线是否适用于该模型（会话、历史记录、工具、沙箱策略等）。

### 第 1 层：直接模型完成（无网关）

- 测试：`src/agents/models.profiles.live.test.ts`
- 目标：
  - 枚举已发现的模型
  - 使用 `getApiKeyForModel` 选择您拥有凭据的模型
  - 为每个模型运行一个小型的补全（以及针对性的回归测试，如需要）
- 如何启用：
  - `pnpm test:live`（或者如果直接调用 Vitest，则使用 `OPENCLAW_LIVE_TEST=1`）
- 设置 `OPENCLAW_LIVE_MODELS=modern`（或 `all`，即 modern 的别名）以实际运行此套件；否则它会跳过，以保持 `pnpm test:live` 专注于网关冒烟测试
- 如何选择模型：
  - `OPENCLAW_LIVE_MODELS=modern` 运行现代允许列表（Opus/Sonnet/Haiku 4.5、GPT-5.x + Codex、Gemini 3、GLM 4.7、MiniMax M2.5、Grok 4）
  - `OPENCLAW_LIVE_MODELS=all` 是现代允许列表的别名
  - 或 `OPENCLAW_LIVE_MODELS="openai/gpt-5.2,anthropic/claude-opus-4-6,..."`（逗号分隔的允许列表）
- 如何选择提供商：
  - `OPENCLAW_LIVE_PROVIDERS="google,google-antigravity,google-gemini-cli"`（逗号分隔的允许列表）
- 密钥来源：
  - 默认情况下：配置文件存储和环境变量回退
  - 设置 `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` 以强制仅使用**配置文件存储**
- 存在原因：
  - 将“provider API 损坏 / 密钥无效”与“gateway agent 管道损坏”区分开来
  - 包含小型、独立的回归测试（例如：OpenAI Responses/Codex Responses 推理重放 + 工具调用流程）

### Layer 2: Gateway + dev agent smoke（即 “@openclaw” 实际执行的操作）

- Test: `src/gateway/gateway-models.profiles.live.test.ts`
- Goal:
  - 启动进程内 gateway
  - 创建/修补 `agent:dev:*` session（每次运行覆盖模型）
  - 遍历带密钥的模型并断言：
    - “有意义”的响应（无工具）
    - 真实的工具调用有效（read probe）
    - 可选的额外工具探测（exec+read probe）
    - OpenAI 回归路径（tool-call-only → follow-up）保持正常工作
- Probe details（以便快速解释失败原因）：
  - `read` probe：测试在工作区写入一个 nonce 文件，并要求 agent `read` 它并回显 nonce。
  - `exec+read` probe：测试要求 agent `exec` 写入一个 nonce 到临时文件，然后 `read` 它回来。
  - image probe：测试附加一个生成的 PNG（cat + 随机代码），并期望模型返回 `cat <CODE>`。
  - 实现参考：`src/gateway/gateway-models.profiles.live.test.ts` 和 `src/gateway/live-image-probe.ts`。
- How to enable:
  - `pnpm test:live` （如果直接调用 Vitest，则为 `OPENCLAW_LIVE_TEST=1`）
- How to select models:
  - 默认：modern allowlist (Opus/Sonnet/Haiku 4.5, GPT-5.x + Codex, Gemini 3, GLM 4.7, MiniMax M2.5, Grok 4)
  - `OPENCLAW_LIVE_GATEWAY_MODELS=all` 是 modern allowlist 的别名
  - 或设置 `OPENCLAW_LIVE_GATEWAY_MODELS="provider/model"` （或逗号分隔列表）进行缩小范围
- How to select providers (avoid “OpenRouter everything”):
  - `OPENCLAW_LIVE_GATEWAY_PROVIDERS="google,google-antigravity,google-gemini-cli,openai,anthropic,zai,minimax"` （逗号分隔 allowlist）
- Tool + image probes 在此 live 测试中始终开启：
  - `read` 探针 + `exec+read` 探针（工具压力测试）
  - 当模型声明支持图像输入时，图像探针会运行
  - 流程（高层级）：
    - 测试生成一个带有“CAT”+ 随机代码的微型 PNG（`src/gateway/live-image-probe.ts`）
    - 通过 `agent` `attachments: [{ mimeType: "image/png", content: "<base64>" }]` 发送它
    - Gateway 将附件解析为 `images[]`（`src/gateway/server-methods/agent.ts` + `src/gateway/chat-attachments.ts`）
    - 嵌入式代理将多模态用户消息转发给模型
    - 断言：回复包含 `cat` + 代码（OCR 容错：允许轻微错误）

提示：要查看你可以在机器上测试的内容（以及确切的 `provider/model` id），请运行：

```bash
openclaw models list
openclaw models list --json
```

## Live：Anthropic setup-token 冒烟测试

- 测试：`src/agents/anthropic.setup-token.live.test.ts`
- 目标：验证 Claude Code CLI setup-token（或粘贴的 setup-token 配置文件）能否完成 Anthropic 提示词。
- 启用：
  - `pnpm test:live`（或 `OPENCLAW_LIVE_TEST=1`，如果直接调用 Vitest）
  - `OPENCLAW_LIVE_SETUP_TOKEN=1`
- Token 来源（选择一项）：
  - 配置文件：`OPENCLAW_LIVE_SETUP_TOKEN_PROFILE=anthropic:setup-token-test`
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
- 目标：使用本地 CLI 后端验证 Gateway + 代理管道，而不触及你的默认配置。
- 启用：
  - `pnpm test:live`（或 `OPENCLAW_LIVE_TEST=1`，如果直接调用 Vitest）
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
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_PROBE=1` 以发送真实的图像附件（路径会被注入到提示词中）。
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_ARG="--image"` 以将图像文件路径作为 CLI 参数传递，而不是通过提示词注入。
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_MODE="repeat"`（或 `"list"`）以在设置 `IMAGE_ARG` 时控制图像参数的传递方式。
  - `OPENCLAW_LIVE_CLI_BACKEND_RESUME_PROBE=1` 以发送第二轮并验证恢复流程。
- `OPENCLAW_LIVE_CLI_BACKEND_DISABLE_MCP_CONFIG=0` 以保持 Claude Code CLI MCP 配置启用（默认情况下会使用临时空文件禁用 MCP 配置）。

示例：

```bash
OPENCLAW_LIVE_CLI_BACKEND=1 \
  OPENCLAW_LIVE_CLI_BACKEND_MODEL="claude-cli/claude-sonnet-4-6" \
  pnpm test:live src/gateway/gateway-cli-backend.live.test.ts
```

### 推荐的 Live 配方

狭窄、显式的允许列表是最快且最不不稳定的：

- 单一模型，直连（无网关）：
  - `OPENCLAW_LIVE_MODELS="openai/gpt-5.2" pnpm test:live src/agents/models.profiles.live.test.ts`

- 单一模型，网关冒烟测试：
  - `OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.2" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

- 跨多个提供商的工具调用：
  - `OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.2,anthropic/claude-opus-4-6,google/gemini-3-flash-preview,zai/glm-4.7,minimax/minimax-m2.5" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

- Google 侧重（Gemini API 密钥 + Antigravity）：
  - Gemini (API 密钥): `OPENCLAW_LIVE_GATEWAY_MODELS="google/gemini-3-flash-preview" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`
  - Antigravity (OAuth): `OPENCLAW_LIVE_GATEWAY_MODELS="google-antigravity/claude-opus-4-6-thinking,google-antigravity/gemini-3-pro-high" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

注意：

- `google/...` 使用 Gemini API (API 密钥)。
- `google-antigravity/...` 使用 Antigravity OAuth 网桥（Cloud Code Assist 风格的代理端点）。
- `google-gemini-cli/...` 使用你机器上的本地 Gemini CLI（独立的身份验证 + 工具怪癖）。
- Gemini API vs Gemini CLI：
  - API: OpenClaw 通过 HTTP 调用 Google 托管的 Gemini API（API 密钥 / 配置文件身份验证）；这是大多数用户所说的“Gemini”的含义。
  - CLI: OpenClaw 调用本地 `gemini` 二进制文件；它有自己的身份验证，并且可能表现不同（流式传输/工具支持/版本偏差）。

## Live：模型矩阵（我们涵盖的内容）

没有固定的“CI 模型列表”（Live 是可选加入的），但这些是建议在拥有密钥的开发机器上定期涵盖的**推荐**模型。

### 现代冒烟测试集（工具调用 + 图像）

这是我们期望保持正常工作的“通用模型”运行：

- OpenAI (非 Codex): `openai/gpt-5.2` (可选: `openai/gpt-5.1`)
- OpenAI Codex: `openai-codex/gpt-5.4`
- Anthropic: `anthropic/claude-opus-4-6` (或 `anthropic/claude-sonnet-4-5`)
- Google (Gemini API): `google/gemini-3.1-pro-preview` 和 `google/gemini-3-flash-preview` (避免较旧的 Gemini 2.x 模型)
- Google (Antigravity): `google-antigravity/claude-opus-4-6-thinking` 和 `google-antigravity/gemini-3-flash`
- Z.AI (GLM): `zai/glm-4.7`
- MiniMax: `minimax/minimax-m2.5`

使用工具 + 图像运行网关冒烟测试：
`OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.2,openai-codex/gpt-5.4,anthropic/claude-opus-4-6,google/gemini-3.1-pro-preview,google/gemini-3-flash-preview,google-antigravity/claude-opus-4-6-thinking,google-antigravity/gemini-3-flash,zai/glm-4.7,minimax/minimax-m2.5" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

### 基准：工具调用（Read + 可选 Exec）

每个提供商系列至少选择一个：

- OpenAI: `openai/gpt-5.2` (或 `openai/gpt-5-mini`)
- Anthropic: `anthropic/claude-opus-4-6` (或 `anthropic/claude-sonnet-4-5`)
- Google: `google/gemini-3-flash-preview` (或 `google/gemini-3.1-pro-preview`)
- Z.AI (GLM): `zai/glm-4.7`
- MiniMax: `minimax/minimax-m2.5`

可选的额外覆盖（最好有）：

- xAI: `xai/grok-4` (或最新可用版本)
- Mistral: `mistral/`… (选择一个你已启用的支持“工具”的模型)
- Cerebras: `cerebras/`… (如果你有访问权限)
- LM Studio: `lmstudio/`… (本地；工具调用取决于 API 模式)

### Vision: 图像发送 (attachment → multimodal message)

在 `OPENCLAW_LIVE_GATEWAY_MODELS` 中至少包含一个支持图像的模型（Claude/Gemini/OpenAI 支持视觉的变体等），以测试图像探测功能。

### 聚合器 / 其他网关

如果你已启用密钥，我们也支持通过以下方式进行测试：

- OpenRouter: `openrouter/...` (数百个模型；使用 `openclaw models scan` 查找支持工具和图像的候选模型)
- OpenCode: `opencode/...` 用于 Zen，`opencode-go/...` 用于 Go (通过 `OPENCODE_API_KEY` / `OPENCODE_ZEN_API_KEY` 进行身份验证)

更多可以包含在实时矩阵中的提供商（如果你有凭证/配置）：

- 内置: `openai`, `openai-codex`, `anthropic`, `google`, `google-vertex`, `google-antigravity`, `google-gemini-cli`, `zai`, `openrouter`, `opencode`, `opencode-go`, `xai`, `groq`, `cerebras`, `mistral`, `github-copilot`
- 通过 `models.providers` (自定义端点): `minimax` (云/API)，以及任何兼容 OpenAI/Anthropic 的代理 (LM Studio, vLLM, LiteLLM 等)

提示：不要尝试在文档中硬编码“所有模型”。权威列表是你的机器上 `discoverModels(...)` 返回的内容加上任何可用的密钥。

## 凭证 (切勿提交)

实时测试以与 CLI 相同的方式发现凭证。实际影响：

- 如果 CLI 可以工作，实时测试应该能找到相同的密钥。
- 如果实时测试提示“no creds”，请以调试 `openclaw models list` / 模型选择的方式相同的方式进行调试。

- 配置文件存储：`~/.openclaw/credentials/`（首选；即测试中“配置文件密钥”的含义）
- 配置：`~/.openclaw/openclaw.json`（或 `OPENCLAW_CONFIG_PATH`）

如果你想依赖环境密钥（例如在 `~/.profile` 中导出），请在 `source ~/.profile` 之后运行本地测试，或使用下面的 Docker 运行器（它们可以将 `~/.profile` 挂载到容器中）。

## Deepgram 直播（音频转录）

- 测试：`src/media-understanding/providers/deepgram/audio.live.test.ts`
- 启用：`DEEPGRAM_API_KEY=... DEEPGRAM_LIVE_TEST=1 pnpm test:live src/media-understanding/providers/deepgram/audio.live.test.ts`

## BytePlus 编码计划直播

- 测试：`src/agents/byteplus.live.test.ts`
- 启用：`BYTEPLUS_API_KEY=... BYTEPLUS_LIVE_TEST=1 pnpm test:live src/agents/byteplus.live.test.ts`
- 可选模型覆盖：`BYTEPLUS_CODING_MODEL=ark-code-latest`

## Docker 运行器（可选的“在 Linux 中运行”检查）

这些在仓库 Docker 镜像内运行 `pnpm test:live`，挂载本地配置目录和工作区（并在挂载时导入 `~/.profile`）：

- 直接模型：`pnpm test:docker:live-models`（脚本：`scripts/test-live-models-docker.sh`）
- 网关 + 开发代理：`pnpm test:docker:live-gateway`（脚本：`scripts/test-live-gateway-models-docker.sh`）
- 入职向导（TTY，完整脚手架）：`pnpm test:docker:onboard`（脚本：`scripts/e2e/onboard-docker.sh`）
- 网关网络（两个容器，WS 认证 + 健康检查）：`pnpm test:docker:gateway-network`（脚本：`scripts/e2e/gateway-network-docker.sh`）
- 插件（自定义扩展加载 + 注册冒烟测试）：`pnpm test:docker:plugins`（脚本：`scripts/e2e/plugins-docker.sh`）

实时模型 Docker 运行器还将当前检出以只读方式绑定挂载，并将其暂存到容器内的临时工作目录中。这既保持运行时镜像精简，又能针对你确切的本地源码/配置运行 Vitest。

手动 ACP 纯文本线程冒烟测试（非 CI）：

- `bun scripts/dev/discord-acp-plain-language-smoke.ts --channel <discord-channel-id> ...`
- 保留此脚本用于回归/调试工作流。ACP 线程路由验证可能再次需要它，因此请勿删除。

有用的环境变量：

- `OPENCLAW_CONFIG_DIR=...`（默认：`~/.openclaw`）挂载到 `/home/node/.openclaw`
- `OPENCLAW_WORKSPACE_DIR=...`（默认：`~/.openclaw/workspace`）挂载到 `/home/node/.openclaw/workspace`
- `OPENCLAW_PROFILE_FILE=...`（默认：`~/.profile`）挂载到 `/home/node/.profile` 并在运行测试之前导入
- `OPENCLAW_LIVE_GATEWAY_MODELS=...` / `OPENCLAW_LIVE_MODELS=...` 用于缩小运行范围
- `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` 以确保凭据来自配置文件存储（而非环境变量）

## 文档完整性检查

文档编辑后运行文档检查：`pnpm docs:list`。

## 离线回归测试（CI 安全）

这些是“真实流水线”的回归测试，但不使用真实的提供商：

- 网关工具调用（模拟 OpenAI，真实网关 + Agent 循环）：`src/gateway/gateway.test.ts`（案例：“通过网关 Agent 循环端到端运行模拟 OpenAI 工具调用”）
- 网导向导（WS `wizard.start`/`wizard.next`，写入配置 + 强制执行身份验证）：`src/gateway/gateway.test.ts`（案例：“通过 WS 运行向导并写入身份验证令牌配置”）

## Agent 可靠性评估（技能）

我们已经有一些 CI 安全的测试，其行为类似于“Agent 可靠性评估”：

- 通过真实网关 + Agent 循环进行的模拟工具调用（`src/gateway/gateway.test.ts`）。
- 验证会话连线和配置效果的端到端向导流程（`src/gateway/gateway.test.ts`）。

对于技能来说，目前仍然缺失的内容（参见 [技能](/zh/en/tools/skills)）：

- **决策制定：** 当提示中列出了技能时，Agent 是否会选择正确的技能（或避免无关的技能）？
- **合规性：** Agent 是否在使用前阅读 `SKILL.md` 并遵循所需的步骤/参数？
- **工作流契约：** 断言工具顺序、会话历史继承和沙箱边界的多轮场景。

未来的评估应首先保持确定性：

- 使用模拟提供商断言工具调用 + 顺序、技能文件读取和会话连线的场景运行器。
- 一小套专注于技能的场景（使用与避免、门控、提示词注入）。
- 仅在 CI 安全套件就位后，才进行可选的实时评估（选择加入，受环境变量限制）。

## 添加回归测试（指南）

当你在实时测试中发现并修复了提供商/模型问题时：

- 如果可能，添加 CI 安全的回归测试（模拟/存根提供商，或捕获确切的请求形状转换）
- 如果它本质上仅限实时（速率限制、身份验证策略），请保持实时测试狭窄范围，并通过环境变量选择加入
- 优先定位能捕获该错误的最小层级：
  - provider 请求转换/回放 bug → 直接模型测试
  - gateway 会话/历史/工具流水线 bug → gateway live smoke 或 CI 安全的 gateway mock 测试
- SecretRef 遍历防护：
  - `src/secrets/exec-secret-ref-id-parity.test.ts` 从注册表元数据 (`listSecretTargetRegistryEntries()`) 为每个 SecretRef 类派生一个采样目标，然后断言遍历段执行 id 被拒绝。
  - 如果你在 `src/secrets/target-registry-data.ts` 中添加了新的 `includeInPlan` SecretRef 目标系列，请在相应测试中更新 `classifyTargetClass`。该测试会在未分类的目标 id 上故意失败，以确保新类不会被静默跳过。
