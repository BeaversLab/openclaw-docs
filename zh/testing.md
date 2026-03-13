---
summary: "测试套件：单元/e2e/live 套件、Docker 运行器以及每个测试涵盖的内容"
read_when:
  - Running tests locally or in CI
  - Adding regressions for model/provider bugs
  - Debugging gateway + agent behavior
title: "测试"
---

# 测试

OpenClaw 拥有三个 Vitest 套件（单元/集成、e2e、live）和少量的 Docker 运行器。

本文档是一份“我们如何进行测试”的指南：

- 每个套件涵盖的内容（以及它故意_不_涵盖的内容）
- 针对常见工作流程（本地、推送前、调试）运行哪些命令
- Live 测试如何发现凭证并选择模型/提供商
- 如何为现实世界中的模型/提供商问题添加回归测试

## 快速开始

大多数时候：

- 全量门禁（预期推送前）：`pnpm build && pnpm check && pnpm test`

当你接触测试代码或需要额外的信心时：

- 覆盖率门禁：`pnpm test:coverage`
- E2E 套件：`pnpm test:e2e`

调试真实提供商/模型时（需要真实凭证）：

- Live 套件（模型 + 网关工具/镜像探测）：`pnpm test:live`

提示：当你只需要一个失败的测试用例时，优先通过下文描述的 allowlist 环境变量来缩小 live 测试范围。

## 测试套件（在哪里运行什么）

可以将这些套件视为“真实性递增”（同时不稳定性/成本也递增）：

### 单元 / 集成（默认）

- 命令：`pnpm test`
- 配置：`vitest.config.ts`
- 文件：`src/**/*.test.ts`
- 范围：
  - 纯单元测试
  - 进程内集成测试（网关认证、路由、工具、解析、配置）
  - 针对已知 Bug 的确定性回归测试
- 预期：
  - 在 CI 中运行
  - 不需要真实密钥
  - 应快速且稳定

### E2E（网关冒烟测试）

- 命令：`pnpm test:e2e`
- 配置：`vitest.e2e.config.ts`
- 文件：`src/**/*.e2e.test.ts`
- 范围：
  - 多实例网关端到端行为
  - WebSocket/HTTP 接口、节点配对以及更繁重的网络操作
- 预期：
  - 在 CI 中运行（在流水线中启用时）
  - 不需要真实密钥
  - 比单元测试有更多移动部件（可能较慢）

### Live（真实提供商 + 真实模型）

- 命令：`pnpm test:live`
- 配置：`vitest.live.config.ts`
- 文件：`src/**/*.live.test.ts`
- 默认：由 `pnpm test:live` **启用**（设置 `OPENCLAW_LIVE_TEST=1`）
- 范围：
  - “此提供商/模型今天使用真实凭证真的能工作吗？”
  - 捕捉提供商格式变更、工具调用怪癖、认证问题以及速率限制行为
- 预期：
  - 设计上非 CI 稳定（真实网络、真实提供商策略、配额、故障）
  - 花费金钱/使用速率限制
  - 优先运行缩小的子集而不是“所有”
  - Live 运行将获取 `~/.profile` 以获取缺失的 API 密钥
  - Anthropic 密钥轮换：设置 `OPENCLAW_LIVE_ANTHROPIC_KEYS="sk-...,sk-..."`（或 `OPENCLAW_LIVE_ANTHROPIC_KEY=sk-...`）或多个 `ANTHROPIC_API_KEY*` 变量；测试将在速率限制时重试

## 我应该运行哪个套件？

使用此决策表：

- 编辑逻辑/测试：运行 `pnpm test`（如果更改较多，则运行 `pnpm test:coverage`）
- 涉及网关网络/WS 协议/配对：添加 `pnpm test:e2e`
- 调试“我的机器人宕机”/特定提供商故障/工具调用：运行缩小范围的 `pnpm test:live`

## Live: 模型冒烟测试 (profile keys)

Live 测试分为两层，以便我们可以隔离故障：

- “直接模型”告诉我们提供商/模型是否可以使用给定密钥进行响应。
- “网关冒烟”告诉我们完整的网关+代理流水线是否适用于该模型（会话、历史记录、工具、沙箱策略等）。

### 第 1 层：直接模型补全（无网关）

- 测试：`src/agents/models.profiles.live.test.ts`
- 目标：
  - 枚举已发现的模型
  - 使用 `getApiKeyForModel` 选择您拥有凭证的模型
  - 对每个模型运行一个小型完成（以及在需要时运行针对性的回归测试）
- 如何启用：
  - `pnpm test:live`（如果直接调用 Vitest，则为 `OPENCLAW_LIVE_TEST=1`）
- 设置 `OPENCLAW_LIVE_MODELS=modern`（或 `all`，modern 的别名）以实际运行此套件；否则它会跳过，以保持 `pnpm test:live` 专注于网关冒烟测试
- 如何选择模型：
  - `OPENCLAW_LIVE_MODELS=modern` 运行现代白名单（Opus/Sonnet/Haiku 4.5, GPT-5.x + Codex, Gemini 3, GLM 4.7, MiniMax M2.1, Grok 4）
  - `OPENCLAW_LIVE_MODELS=all` 是现代白名单的别名
  - 或 `OPENCLAW_LIVE_MODELS="openai/gpt-5.2,anthropic/claude-opus-4-5,..."`（逗号分隔白名单）
- 如何选择提供商：
  - `OPENCLAW_LIVE_PROVIDERS="google,google-antigravity,google-gemini-cli"`（逗号分隔白名单）
- 密钥来源：
  - 默认情况：配置文件存储 和环境变量回退
  - 设置 `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` 以仅强制使用 **配置文件存储**
- 存在原因：
  - 区分“提供商 API 损坏 / 密钥无效”与“网关代理流水线损坏”
  - 包含小型、独立的回归测试（例如：OpenAI Responses/Codex Responses 推理回放 + 工具调用流程）

### 第 2 层：网关 + 开发代理冒烟测试（即“@openclaw”实际执行的操作）

- 测试：`src/gateway/gateway-models.profiles.live.test.ts`
- 目标：
  - 启动一个进程内网关
  - 创建/修补 `agent:dev:*` 会话（每次运行覆盖模型）
  - 迭代带密钥的模型并断言：
    - “有意义”的响应（无工具）
    - 真实的工具调用有效（读取探测）
    - 可选的额外工具探测（exec+read 探测）
    - OpenAI 回归路径（仅工具调用 → 后续跟进）保持正常工作
- 探针详情（以便您快速解释失败原因）：
  - `read` 探测：测试在工作区写入一个 nonce 文件，并要求代理 `read` 该文件并将 nonce 回显。
  - `exec+read` 探测：测试要求代理 `exec`-写一个 nonce 到临时文件，然后 `read` 读取它。
  - 图像探测：测试附加一个生成的 PNG（cat + 随机代码），并期望模型返回 `cat <CODE>`。
  - 实现参考：`src/gateway/gateway-models.profiles.live.test.ts` 和 `src/gateway/live-image-probe.ts`。
- 如何启用：
  - `pnpm test:live`（或直接调用 Vitest 时使用 `OPENCLAW_LIVE_TEST=1`）
- 如何选择模型：
  - 默认：现代白名单（Opus/Sonnet/Haiku 4.5, GPT-5.x + Codex, Gemini 3, GLM 4.7, MiniMax M2.1, Grok 4）
  - `OPENCLAW_LIVE_GATEWAY_MODELS=all` 是现代白名单的别名
  - 或设置 `OPENCLAW_LIVE_GATEWAY_MODELS="provider/model"`（或逗号列表）以缩小范围
- 如何选择提供商（避免“全用 OpenRouter”）：
  - `OPENCLAW_LIVE_GATEWAY_PROVIDERS="google,google-antigravity,google-gemini-cli,openai,anthropic,zai,minimax"`（逗号允许列表）
- 在此实时测试中，工具和图像探针始终开启：
  - `read` 探针 + `exec+read` 探针（工具压力测试）
  - 当模型声明支持图像输入时，运行图像探针
  - 流程（高层级）：
    - 测试生成一个包含“CAT” + 随机代码的微型 PNG（`src/gateway/live-image-probe.ts`）
    - 通过 `agent` `attachments: [{ mimeType: "image/png", content: "<base64>" }]` 发送它
    - 网关将附件解析为 `images[]`（`src/gateway/server-methods/agent.ts` + `src/gateway/chat-attachments.ts`）
    - 嵌入式代理将多模态用户消息转发给模型
    - 断言：回复包含 `cat` + 该代码（OCR 容差：允许轻微错误）

提示：要查看你可以在机器上测试的内容（以及确切的 `provider/model` id），请运行：

```bash
openclaw models list
openclaw models list --json
```

## Live：Anthropic setup-token 冒烟测试

- 测试：`src/agents/anthropic.setup-token.live.test.ts`
- 目标：验证 Claude Code CLI setup-token（或粘贴的 setup-token 配置文件）能否完成 Anthropic 提示词。
- 启用：
  - `pnpm test:live`（如果直接调用 Vitest，则为 `OPENCLAW_LIVE_TEST=1`）
  - `OPENCLAW_LIVE_SETUP_TOKEN=1`
- Token 来源（选择其一）：
  - 配置文件：`OPENCLAW_LIVE_SETUP_TOKEN_PROFILE=anthropic:setup-token-test`
  - 原始令牌：`OPENCLAW_LIVE_SETUP_TOKEN_VALUE=sk-ant-oat01-...`
- 模型覆盖（可选）：
  - `OPENCLAW_LIVE_SETUP_TOKEN_MODEL=anthropic/claude-opus-4-5`

设置示例：

```bash
openclaw models auth paste-token --provider anthropic --profile-id anthropic:setup-token-test
OPENCLAW_LIVE_SETUP_TOKEN=1 OPENCLAW_LIVE_SETUP_TOKEN_PROFILE=anthropic:setup-token-test pnpm test:live src/agents/anthropic.setup-token.live.test.ts
```

## Live：CLI 后端冒烟测试（Claude Code CLI 或其他本地 CLI）

- 测试：`src/gateway/gateway-cli-backend.live.test.ts`
- 目标：使用本地 CLI 后端验证网关 + 代理管道，而不触及你的默认配置。
- 启用：
  - `pnpm test:live`（如果直接调用 Vitest，则为 `OPENCLAW_LIVE_TEST=1`）
  - `OPENCLAW_LIVE_CLI_BACKEND=1`
- 默认值：
  - 模型：`claude-cli/claude-sonnet-4-5`
  - 命令：`claude`
  - 参数：`["-p","--output-format","json","--dangerously-skip-permissions"]`
- 覆盖（可选）：
  - `OPENCLAW_LIVE_CLI_BACKEND_MODEL="claude-cli/claude-opus-4-5"`
  - `OPENCLAW_LIVE_CLI_BACKEND_MODEL="codex-cli/gpt-5.2-codex"`
  - `OPENCLAW_LIVE_CLI_BACKEND_COMMAND="/full/path/to/claude"`
  - `OPENCLAW_LIVE_CLI_BACKEND_ARGS='["-p","--output-format","json","--permission-mode","bypassPermissions"]'`
  - `OPENCLAW_LIVE_CLI_BACKEND_CLEAR_ENV='["ANTHROPIC_API_KEY","ANTHROPIC_API_KEY_OLD"]'`
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_PROBE=1` 用于发送真实的图片附件（路径会被注入到提示词中）。
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_ARG="--image"` 用于将图片文件路径作为 CLI 参数传递，而不是通过提示词注入。
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_MODE="repeat"`（或 `"list"`）用于在设置 `IMAGE_ARG` 时控制如何传递图片参数。
  - `OPENCLAW_LIVE_CLI_BACKEND_RESUME_PROBE=1` 用于发送第二轮对话并验证恢复流程。
- `OPENCLAW_LIVE_CLI_BACKEND_DISABLE_MCP_CONFIG=0` 用于保持 Claude Code CLI 的 MCP 配置启用（默认情况下会使用临时空文件禁用 MCP 配置）。

示例：

```bash
OPENCLAW_LIVE_CLI_BACKEND=1 \
  OPENCLAW_LIVE_CLI_BACKEND_MODEL="claude-cli/claude-sonnet-4-5" \
  pnpm test:live src/gateway/gateway-cli-backend.live.test.ts
```

### 推荐的实时 (Live) 配方

狭窄、明确的白名单速度最快且最稳定：

- 单一模型，直连（无网关）：
  - `OPENCLAW_LIVE_MODELS="openai/gpt-5.2" pnpm test:live src/agents/models.profiles.live.test.ts`

- 单一模型，网关冒烟测试：
  - `OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.2" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

- 跨多个提供商的工具调用：
  - `OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.2,anthropic/claude-opus-4-5,google/gemini-3-flash-preview,zai/glm-4.7,minimax/minimax-m2.1" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

- Google 专项（Gemini API 密钥 + Antigravity）：
  - Gemini (API key)：`OPENCLAW_LIVE_GATEWAY_MODELS="google/gemini-3-flash-preview" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`
  - Antigravity (OAuth)：`OPENCLAW_LIVE_GATEWAY_MODELS="google-antigravity/claude-opus-4-5-thinking,google-antigravity/gemini-3-pro-high" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

备注：

- `google/...` 使用 Gemini API（API key）。
- `google-antigravity/...` 使用 Antigravity OAuth 桥接（Cloud Code Assist 风格的代理端点）。
- `google-gemini-cli/...` 使用你机器上的本地 Gemini CLI（单独的身份验证 + 工具怪癖）。
- Gemini API 与 Gemini CLI：
  - API：OpenClaw 通过 HTTP 调用 Google 托管的 Gemini API（API key / profile auth）；这是大多数用户所指的“Gemini”。
  - CLI：OpenClaw 调用本地的 `gemini` 二进制文件；它有自己的身份验证，行为可能有所不同（流式传输/工具支持/版本偏差）。

## 实时：模型矩阵（我们覆盖的内容）

没有固定的“CI 模型列表”（实时测试是可选的），但这些是在开发机器上使用密钥定期覆盖的**推荐**模型。

### 现代冒烟测试集（工具调用 + 图像）

这是我们期望保持正常工作的“通用模型”运行：

- OpenAI (非 Codex)：`openai/gpt-5.2`（可选：`openai/gpt-5.1`）
- OpenAI Codex：`openai-codex/gpt-5.2`（可选：`openai-codex/gpt-5.2-codex`）
- Anthropic：`anthropic/claude-opus-4-5`（或 `anthropic/claude-sonnet-4-5`）
- Google (Gemini API)：`google/gemini-3-pro-preview` 和 `google/gemini-3-flash-preview`（避免使用较旧的 Gemini 2.x 模型）
- Google (Antigravity): `google-antigravity/claude-opus-4-5-thinking` 和 `google-antigravity/gemini-3-flash`
- Z.AI (GLM): `zai/glm-4.7`
- MiniMax: `minimax/minimax-m2.1`

使用工具和图像运行网关冒烟测试：
`OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.2,openai-codex/gpt-5.2,anthropic/claude-opus-4-5,google/gemini-3-pro-preview,google/gemini-3-flash-preview,google-antigravity/claude-opus-4-5-thinking,google-antigravity/gemini-3-flash,zai/glm-4.7,minimax/minimax-m2.1" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

### 基准：工具调用（Read + 可选 Exec）

每个提供商系列至少选择一个：

- OpenAI: `openai/gpt-5.2` (或 `openai/gpt-5-mini`)
- Anthropic: `anthropic/claude-opus-4-5` (或 `anthropic/claude-sonnet-4-5`)
- Google: `google/gemini-3-flash-preview` (或 `google/gemini-3-pro-preview`)
- Z.AI (GLM): `zai/glm-4.7`
- MiniMax: `minimax/minimax-m2.1`

可选的额外覆盖（最好有）：

- xAI: `xai/grok-4` (或最新的可用版本)
- Mistral: `mistral/`… (选择一个你已启用的支持“tools”的模型)
- Cerebras: `cerebras/`… (如果你有访问权限)
- LM Studio: `lmstudio/`… (本地；工具调用取决于 API 模式)

### Vision: 图片发送 (附件 → 多模态消息)

在 `OPENCLAW_LIVE_GATEWAY_MODELS` 中至少包含一个支持图像的模型（Claude/Gemini/OpenAI 支持视觉的变体等），以测试图像探测功能。

### 聚合器 / 备用网关

如果你启用了密钥，我们还支持通过以下方式进行测试：

- OpenRouter: `openrouter/...` (数百个模型；使用 `openclaw models scan` 查找支持工具+图像的候选模型)
- OpenCode Zen: `opencode/...` (通过 `OPENCODE_API_KEY` / `OPENCODE_ZEN_API_KEY` 进行身份验证)

更多你可以包含在实时矩阵中的提供商（如果你有凭据/配置）：

- 内置：`openai`, `openai-codex`, `anthropic`, `google`, `google-vertex`, `google-antigravity`, `google-gemini-cli`, `zai`, `openrouter`, `opencode`, `xai`, `groq`, `cerebras`, `mistral`, `github-copilot`
- 通过 `models.providers` (自定义端点)：`minimax` (云/API)，以及任何兼容 OpenAI/Anthropic 的代理 (LM Studio, vLLM, LiteLLM 等)

提示：不要试图在文档中硬编码“所有模型”。权威的列表是 `discoverModels(...)` 在您的机器上返回的内容加上可用的密钥。

## 凭据（切勿提交）

实时测试以与 CLI 相同的方式发现凭据。实际影响如下：

- 如果 CLI 有效，实时测试应该能找到相同的密钥。
- 如果实时测试显示“no creds”，请像调试 `openclaw models list` / 模型选择一样进行调试。

- 配置文件存储：`~/.openclaw/credentials/`（首选；即测试中“profile keys”的含义）
- 配置：`~/.openclaw/openclaw.json`（或 `OPENCLAW_CONFIG_PATH`）

如果您想依赖环境密钥（例如在 `~/.profile` 中导出的），请在 `source ~/.profile` 之后运行本地测试，或使用下面的 Docker 运行器（它们可以将 `~/.profile` 挂载到容器中）。

## Deepgram 实时（音频转录）

- 测试：`src/media-understanding/providers/deepgram/audio.live.test.ts`
- 启用：`DEEPGRAM_API_KEY=... DEEPGRAM_LIVE_TEST=1 pnpm test:live src/media-understanding/providers/deepgram/audio.live.test.ts`

## Docker 运行器（可选的“适用于 Linux”检查）

这些在仓库 Docker 镜像内运行 `pnpm test:live`，挂载您的本地配置目录和工作区（并在挂载时导入 `~/.profile`）：

- 直接模型：`pnpm test:docker:live-models`（脚本：`scripts/test-live-models-docker.sh`）
- 网关 + 开发代理：`pnpm test:docker:live-gateway`（脚本：`scripts/test-live-gateway-models-docker.sh`）
- 入职向导（TTY，完整脚手架）：`pnpm test:docker:onboard`（脚本：`scripts/e2e/onboard-docker.sh`）
- 网关网络（两个容器，WS 认证 + 健康）：`pnpm test:docker:gateway-network`（脚本：`scripts/e2e/gateway-network-docker.sh`）
- 插件（自定义扩展加载 + 注册冒烟测试）：`pnpm test:docker:plugins`（脚本：`scripts/e2e/plugins-docker.sh`）

有用的环境变量：

- `OPENCLAW_CONFIG_DIR=...`（默认：`~/.openclaw`）挂载到 `/home/node/.openclaw`
- `OPENCLAW_WORKSPACE_DIR=...`（默认：`~/.openclaw/workspace`）挂载到 `/home/node/.openclaw/workspace`
- `OPENCLAW_PROFILE_FILE=...`（默认：`~/.profile`）挂载到 `/home/node/.profile` 并在运行测试前导入
- `OPENCLAW_LIVE_GATEWAY_MODELS=...` / `OPENCLAW_LIVE_MODELS=...` 以缩小运行范围
- `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` 以确保凭证来自配置文件存储（而非环境变量）

## 文档健全性检查

文档编辑后运行文档检查：`pnpm docs:list`。

## 离线回归（CI 安全）

这些是不涉及真实提供商的“真实管道”回归测试：

- 网关工具调用（模拟 OpenAI，真实网关 + 代理循环）：`src/gateway/gateway.tool-calling.mock-openai.test.ts`
- 网关向导（WS `wizard.start`/`wizard.next`，写入配置 + 强制身份验证）：`src/gateway/gateway.wizard.e2e.test.ts`

## 代理可靠性评估（技能）

我们已经有一些 CI 安全测试，其行为类似于“代理可靠性评估”：

- 通过真实网关 + 代理循环进行模拟工具调用（`src/gateway/gateway.tool-calling.mock-openai.test.ts`）。
- 验证会话接线和配置效果的端到端向导流程（`src/gateway/gateway.wizard.e2e.test.ts`）。

对于技能（Skills）目前仍缺失的内容（请参阅 [Skills](/en/tools/skills)）：

- **决策制定 (Decisioning)：** 当提示中列出了技能时，代理是否会选择正确的技能（或避免使用不相关的技能）？
- **合规性：** 代理在使用前是否会阅读 `SKILL.md` 并遵循所需的步骤/参数？
- **工作流约定 (Workflow contracts)：** 用于断言工具顺序、会话历史延续以及沙箱边界的多轮场景。

未来的评估应首先保持确定性：

- 使用模拟提供者来断言工具调用及其顺序、技能文件读取以及会话连接的场景运行器。
- 一小套针对技能的场景测试（使用 vs 避免、权限控制、提示词注入）。
- 仅在确立了 CI 安全的测试套件之后，才进行可选的实时评估（需选择加入，且受环境变量限制）。

## 添加回归测试（指导原则）

当你在实时测试中发现并修复了提供者/模型问题时：

- 如果可能，请添加 CI 安全的回归测试（模拟/存根提供者，或捕获确切的请求形状转换）
- 如果该问题本质上仅存在于实时环境中（如速率限制、身份验证策略），请保持实时测试的狭义性，并通过环境变量设置为可选加入
- 优先定位能捕获该 Bug 的最小层级：
  - 提供者请求转换/重放 Bug → 直接模型测试
  - 网关会话/历史/工具流水线 Bug → 网关实时冒烟测试或 CI 安全的网关模拟测试

import zh from '/components/footer/zh.mdx';

<zh />
