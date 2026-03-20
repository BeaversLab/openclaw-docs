---
summary: "测试套件：单元/e2e/live 套件、Docker 运行器以及每个测试涵盖的内容"
read_when:
  - 在本地或 CI 中运行测试
  - 为模型/提供商 bug 添加回归测试
  - 调试网关 + 代理行为
title: "Testing"
---

# 测试

OpenClaw 拥有三个 Vitest 套件（单元/集成、e2e、live）和少量的 Docker 运行器。

本文档是一份“我们如何测试”指南：

- 每个套件涵盖的内容（以及它故意_不_涵盖的内容）
- 针对常见工作流（本地、推送前、调试）运行哪些命令
- Live 测试如何发现凭证并选择模型/提供商
- 如何为现实世界的模型/提供商问题添加回归测试

## 快速开始

大多数时候：

- 完整关卡（推送前预期）：`pnpm build && pnpm check && pnpm test`

当你接触测试或需要额外的信心时：

- 覆盖率关卡：`pnpm test:coverage`
- E2E 套件：`pnpm test:e2e`

调试真实提供商/模型时（需要真实凭证）：

- Live 套件（模型 + 网关工具/镜像探测）：`pnpm test:live`

提示：当你只需要一个失败用例时，最好通过下面描述的 allowlist 环境变量来缩小 live 测试范围。

## 测试套件（在哪里运行什么）

可以将这些套件视为“真实性递增”（以及不稳定性/成本递增）：

### 单元 / 集成（默认）

- 命令：`pnpm test`
- 配置：`vitest.config.ts`
- 文件：`src/**/*.test.ts`
- 范围：
  - 纯单元测试
  - 进程内集成测试（网关身份验证、路由、工具、解析、配置）
  - 针对已知 bug 的确定性回归测试
- 预期：
  - 在 CI 中运行
  - 不需要真实的密钥
  - 应该快速且稳定

### E2E（网关冒烟测试）

- 命令：`pnpm test:e2e`
- 配置：`vitest.e2e.config.ts`
- 文件：`src/**/*.e2e.test.ts`
- 范围：
  - 多实例网关端到端行为
  - WebSocket/HTTP 接口、节点配对以及更重的网络交互
- 预期：
  - 在 CI 中运行（当在流水线中启用时）
  - 不需要真实的密钥
  - 比单元测试有更多移动部件（可能会更慢）

### Live（真实提供商 + 真实模型）

- 命令：`pnpm test:live`
- 配置：`vitest.live.config.ts`
- 文件：`src/**/*.live.test.ts`
- 默认：通过 `pnpm test:live` **启用**（设置 `OPENCLAW_LIVE_TEST=1`）
- 范围：
  - “此提供商/模型在今天使用真实凭证是否真的能工作？”
  - 捕获提供商格式变更、工具调用怪癖、认证问题以及速率限制行为
- 预期：
  - 设计上非 CI 稳定（真实网络、真实提供商策略、配额、中断）
  - 消耗资金 / 使用速率限制
  - 首选运行缩小的子集而非“所有内容”
  - Live 运行将 source `~/.profile` 以获取缺失的 API 密钥
  - Anthropic 密钥轮换：设置 `OPENCLAW_LIVE_ANTHROPIC_KEYS="sk-...,sk-..."`（或 `OPENCLAW_LIVE_ANTHROPIC_KEY=sk-...`）或多个 `ANTHROPIC_API_KEY*` 变量；测试将在遇到速率限制时重试

## 我应该运行哪个套件？

使用此决策表：

- 编辑逻辑/测试：运行 `pnpm test`（如果改动较大，则运行 `pnpm test:coverage`）
- 涉及网关网络 / WS 协议 / 配对：添加 `pnpm test:e2e`
- 调试“我的机器人挂了”/ 特定于提供商的故障 / 工具调用：运行缩小范围的 `pnpm test:live`

## Live：模型冒烟测试（配置文件密钥）

Live 测试分为两层，以便我们隔离故障：

- “直接模型”告诉我们提供商/模型是否能在给定密钥下做出响应。
- “Gateway(网关) 冒烟测试”告诉我们完整的 gateway+agent 流水线对该模型是否有效（会话、历史、工具、沙箱策略等）。

### 第 1 层：直接模型补全（无 gateway）

- 测试：`src/agents/models.profiles.live.test.ts`
- 目标：
  - 枚举已发现的模型
  - 使用 `getApiKeyForModel` 选择你有凭证的模型
  - 对每个模型运行一个小型补全（以及在需要的地方运行定向回归测试）
- 如何启用：
  - `pnpm test:live`（如果直接调用 Vitest，则为 `OPENCLAW_LIVE_TEST=1`）
- 设置 `OPENCLAW_LIVE_MODELS=modern`（或 `all`，modern 的别名）以实际运行此套件；否则它将跳过，以保持 `pnpm test:live` 专注于 gateway 冒烟测试
- 如何选择模型：
  - `OPENCLAW_LIVE_MODELS=modern` 以运行 modern 白名单（Opus/Sonnet/Haiku 4.5、GPT-5.x + Codex、Gemini 3、GLM 4.7、MiniMax M2.1、Grok 4）
  - `OPENCLAW_LIVE_MODELS=all` 是 modern 白名单的别名
  - 或 `OPENCLAW_LIVE_MODELS="openai/gpt-5.2,anthropic/claude-opus-4-5,..."`（逗号分隔的允许列表）
- 如何选择提供商：
  - `OPENCLAW_LIVE_PROVIDERS="google,google-antigravity,google-gemini-cli"`（逗号分隔的允许列表）
- 密钥来源：
  - 默认：配置文件存储和环境变量后备
  - 设置 `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` 以强制仅使用 **配置文件存储**
- 存在原因：
  - 区分“提供商 API 损坏 / 密钥无效”与“网关代理管道损坏”
  - 包含小型、孤立的回归测试（例如：OpenAI 响应/Codex 响应重放 + 工具调用流程）

### 第 2 层：Gateway(网关) + 开发代理冒烟测试（“@openclaw”实际执行的操作）

- 测试：`src/gateway/gateway-models.profiles.live.test.ts`
- 目标：
  - 启动进程内网关
  - 创建/修补 `agent:dev:*` 会话（每次运行覆盖模型）
  - 迭代带密钥的模型并断言：
    - “有意义”的响应（无工具）
    - 真实的工具调用正常工作（读取探测）
    - 可选的额外工具探测（执行+读取探测）
    - OpenAI 回归路径（仅工具调用 → 后续跟进）保持正常工作
- 探测详情（以便您可以快速解释失败原因）：
  - `read` 探测：测试在工作区中写入一个随机数文件，并要求代理 `read` 该文件并回显随机数。
  - `exec+read` 探测：测试要求代理将随机数 `exec` 写入临时文件，然后 `read` 回来。
  - 图像探测：测试附加一个生成的 PNG（猫 + 随机代码）并期望模型返回 `cat <CODE>`。
  - 实现参考：`src/gateway/gateway-models.profiles.live.test.ts` 和 `src/gateway/live-image-probe.ts`。
- 如何启用：
  - `pnpm test:live`（如果直接调用 Vitest，则使用 `OPENCLAW_LIVE_TEST=1`）
- 如何选择模型：
  - 默认：现代允许列表（Opus/Sonnet/Haiku 4.5、GPT-5.x + Codex、Gemini 3、GLM 4.7、MiniMax M2.1、Grok 4）
  - `OPENCLAW_LIVE_GATEWAY_MODELS=all` 是现代允许列表的别名
  - 或设置 `OPENCLAW_LIVE_GATEWAY_MODELS="provider/model"`（或逗号列表）以缩小范围
- 如何选择提供商（避免“OpenRouter 万能”）：
  - `OPENCLAW_LIVE_GATEWAY_PROVIDERS="google,google-antigravity,google-gemini-cli,openai,anthropic,zai,minimax"`（逗号分隔的允许列表）
- 在此实时测试中，工具和图像探测始终开启：
  - `read` 探测 + `exec+read` 探测（工具压力测试）
  - 当模型宣称支持图像输入时，运行图像探测
  - 流程（高级）：
    - 测试生成一个包含“CAT”+ 随机代码的微型 PNG (`src/gateway/live-image-probe.ts`)
    - 通过 `agent` `attachments: [{ mimeType: "image/png", content: "<base64>" }]` 发送它
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
- Token 来源（任选其一）：
  - 配置文件：`OPENCLAW_LIVE_SETUP_TOKEN_PROFILE=anthropic:setup-token-test`
  - 原始 token：`OPENCLAW_LIVE_SETUP_TOKEN_VALUE=sk-ant-oat01-...`
- 模型覆盖（可选）：
  - `OPENCLAW_LIVE_SETUP_TOKEN_MODEL=anthropic/claude-opus-4-5`

设置示例：

```bash
openclaw models auth paste-token --provider anthropic --profile-id anthropic:setup-token-test
OPENCLAW_LIVE_SETUP_TOKEN=1 OPENCLAW_LIVE_SETUP_TOKEN_PROFILE=anthropic:setup-token-test pnpm test:live src/agents/anthropic.setup-token.live.test.ts
```

## Live: CLI backend smoke (Claude Code CLI or other local CLIs)

- 测试：`src/gateway/gateway-cli-backend.live.test.ts`
- 目标：使用本地 CLI 后端验证 Gateway + 代理管道，且不触碰您的默认配置。
- 启用：
  - `pnpm test:live` （如果直接调用 Vitest，则为 `OPENCLAW_LIVE_TEST=1`）
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
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_PROBE=1` 发送真实的图像附件（路径会被注入到提示中）。
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_ARG="--image"` 将图像文件路径作为 CLI 参数传递，而不是提示注入。
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_MODE="repeat"` （或 `"list"`）用于在设置 `IMAGE_ARG` 时控制如何传递图像参数。
  - `OPENCLAW_LIVE_CLI_BACKEND_RESUME_PROBE=1` 发送第二轮并验证恢复流程。
- `OPENCLAW_LIVE_CLI_BACKEND_DISABLE_MCP_CONFIG=0` 保持 Claude Code CLI MCP 配置启用（默认情况下通过临时空文件禁用 MCP 配置）。

示例：

```bash
OPENCLAW_LIVE_CLI_BACKEND=1 \
  OPENCLAW_LIVE_CLI_BACKEND_MODEL="claude-cli/claude-sonnet-4-5" \
  pnpm test:live src/gateway/gateway-cli-backend.live.test.ts
```

### 推荐的实时配方

狭窄、明确的允许列表最快且最稳定：

- 单一模型，直接（无网关）：
  - `OPENCLAW_LIVE_MODELS="openai/gpt-5.2" pnpm test:live src/agents/models.profiles.live.test.ts`

- 单一模型，网关冒烟测试：
  - `OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.2" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

- 跨多个提供商的工具调用：
  - `OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.2,anthropic/claude-opus-4-5,google/gemini-3-flash-preview,zai/glm-4.7,minimax/minimax-m2.1" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

- Google 重点 (Gemini API 密钥 + Antigravity)：
  - Gemini (API 密钥)：`OPENCLAW_LIVE_GATEWAY_MODELS="google/gemini-3-flash-preview" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`
  - Antigravity (OAuth)：`OPENCLAW_LIVE_GATEWAY_MODELS="google-antigravity/claude-opus-4-5-thinking,google-antigravity/gemini-3-pro-high" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

备注：

- `google/...` 使用 Gemini API (API 密钥)。
- `google-antigravity/...` 使用 Antigravity OAuth 网桥（Cloud Code Assist 风格的代理端点）。
- `google-gemini-cli/...` 使用你机器上的本地 Gemini CLI（独立的认证 + 工具特性）。
- Gemini API 与 Gemini CLI：
  - API：OpenClaw 通过 HTTP 调用 Google 托管的 Gemini API（API 密钥 / profile 认证）；这是大多数用户所指的“Gemini”。
  - CLI：OpenClaw 调用本地 `gemini` 二进制文件；它有自己的认证机制，并且行为可能有所不同（流式传输/工具支持/版本偏差）。

## 实时：模型矩阵（我们涵盖的内容）

没有固定的“CI 模型列表”（实时测试是可选的），但建议在拥有密钥的开发机器上定期覆盖以下**推荐**模型。

### 现代冒烟测试集（工具调用 + 图像）

这是我们期望保持正常工作的“通用模型”运行：

- OpenAI (非 Codex)：`openai/gpt-5.2`（可选：`openai/gpt-5.1`）
- OpenAI Codex：`openai-codex/gpt-5.2`（可选：`openai-codex/gpt-5.2-codex`）
- Anthropic：`anthropic/claude-opus-4-5`（或 `anthropic/claude-sonnet-4-5`）
- Google (Gemini API)：`google/gemini-3-pro-preview` 和 `google/gemini-3-flash-preview`（避免较旧的 Gemini 2.x 模型）
- Google (Antigravity)：`google-antigravity/claude-opus-4-5-thinking` 和 `google-antigravity/gemini-3-flash`
- Z.AI (GLM)：`zai/glm-4.7`
- MiniMax：`minimax/minimax-m2.1`

运行带有工具和图像的网关冒烟测试：
`OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.2,openai-codex/gpt-5.2,anthropic/claude-opus-4-5,google/gemini-3-pro-preview,google/gemini-3-flash-preview,google-antigravity/claude-opus-4-5-thinking,google-antigravity/gemini-3-flash,zai/glm-4.7,minimax/minimax-m2.1" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

### 基准：工具调用（读取 + 可选执行）

每个提供商系列至少选择一个：

- OpenAI: `openai/gpt-5.2` (or `openai/gpt-5-mini`)
- Anthropic: `anthropic/claude-opus-4-5` (or `anthropic/claude-sonnet-4-5`)
- Google: `google/gemini-3-flash-preview` (or `google/gemini-3-pro-preview`)
- Z.AI (GLM): `zai/glm-4.7`
- MiniMax: `minimax/minimax-m2.1`

可选的额外覆盖（最好有）：

- xAI: `xai/grok-4` (or latest available)
- Mistral: `mistral/`… (pick one “tools” capable 模型 you have enabled)
- Cerebras: `cerebras/`… (if you have access)
- LM Studio: `lmstudio/`… (local; 工具 calling depends on API mode)

### 视觉：图像发送（附件 → 多模态消息）

在 `OPENCLAW_LIVE_GATEWAY_MODELS` 中至少包含一个具备图像能力的模型（Claude/Gemini/OpenAI 具备视觉能力的变体等），以测试图像探针。

### 聚合器 / 备选网关

如果您启用了密钥，我们还支持通过以下方式进行测试：

- OpenRouter: `openrouter/...` (hundreds of models; use `openclaw models scan` to find 工具+image capable candidates)
- OpenCode Zen: `opencode/...` (auth via `OPENCODE_API_KEY` / `OPENCODE_ZEN_API_KEY`)

您可以在实时矩阵中包含更多提供商（如果您有凭证/配置）：

- 内置: `openai`, `openai-codex`, `anthropic`, `google`, `google-vertex`, `google-antigravity`, `google-gemini-cli`, `zai`, `openrouter`, `opencode`, `xai`, `groq`, `cerebras`, `mistral`, `github-copilot`
- 通过 `models.providers` (自定义端点): `minimax` (cloud/API), 以及任何 OpenAI/Anthropic 兼容的代理 (LM Studio, vLLM, LiteLLM 等)

提示：不要尝试在文档中硬编码“所有模型”。权威列表是 `discoverModels(...)` 在您的机器上返回的内容以及可用的密钥。

## 凭证（切勿提交）

Live 测试以与 CLI 相同的方式发现凭证。实际影响：

- 如果 CLI 可以工作，Live 测试应该能找到相同的密钥。
- 如果 Live 测试显示“no creds”，请像调试 `openclaw models list` / 模型选择一样进行调试。

- 配置文件存储：`~/.openclaw/credentials/`（首选；即测试中“profile keys”的含义）
- 配置：`~/.openclaw/openclaw.json`（或 `OPENCLAW_CONFIG_PATH`）

如果您想依赖环境变量密钥（例如在您的 `~/.profile` 中导出的），请在 `source ~/.profile` 之后运行本地测试，或使用下方的 Docker 运行器（它们可以将 `~/.profile` 挂载到容器中）。

## Deepgram live（音频转录）

- 测试：`src/media-understanding/providers/deepgram/audio.live.test.ts`
- 启用：`DEEPGRAM_API_KEY=... DEEPGRAM_LIVE_TEST=1 pnpm test:live src/media-understanding/providers/deepgram/audio.live.test.ts`

## Docker 运行器（可选的“在 Linux 上可用”检查）

这些运行器在仓库的 Docker 镜像内运行 `pnpm test:live`，挂载您的本地配置目录和工作区（并在挂载时获取 `~/.profile`）：

- 直连模型：`pnpm test:docker:live-models`（脚本：`scripts/test-live-models-docker.sh`）
- Gateway(网关) + 开发代理：`pnpm test:docker:live-gateway`（脚本：`scripts/test-live-gateway-models-docker.sh`）
- 新手引导向导（TTY，完整脚手架）：`pnpm test:docker:onboard`（脚本：`scripts/e2e/onboard-docker.sh`）
- Gateway(网关) 网络（两个容器，WS 认证 + 健康检查）：`pnpm test:docker:gateway-network`（脚本：`scripts/e2e/gateway-network-docker.sh`）
- 插件（自定义扩展加载 + 注册冒烟测试）：`pnpm test:docker:plugins`（脚本：`scripts/e2e/plugins-docker.sh`）

有用的环境变量：

- `OPENCLAW_CONFIG_DIR=...`（默认：`~/.openclaw`）挂载到 `/home/node/.openclaw`
- `OPENCLAW_WORKSPACE_DIR=...`（默认：`~/.openclaw/workspace`）挂载到 `/home/node/.openclaw/workspace`
- `OPENCLAW_PROFILE_FILE=...`（默认：`~/.profile`）挂载到 `/home/node/.profile` 并在运行测试之前获取
- `OPENCLAW_LIVE_GATEWAY_MODELS=...` / `OPENCLAW_LIVE_MODELS=...` 以缩小运行范围
- `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` 以确保凭据来自配置文件存储（而非环境变量）

## 文档健全性

在编辑文档后运行文档检查：`pnpm docs:list`。

## 离线回归（CI 安全）

这些是“真实管道”回归测试，但不涉及真实的提供商：

- Gateway 工具调用（模拟 Gateway(网关)，真实 gateway + 代理循环）：`src/gateway/gateway.tool-calling.mock-openai.test.ts`
- Gateway 向导（WS `wizard.start`/`wizard.next`，写入配置 + 强制身份验证）：`src/gateway/gateway.wizard.e2e.test.ts`

## 代理可靠性评估（Skills）

我们已经有几个类似“代理可靠性评估”的 CI 安全测试：

- 通过真实 gateway + 代理循环模拟工具调用（`src/gateway/gateway.tool-calling.mock-openai.test.ts`）。
- 验证会话接线和配置效果的端到端向导流程（`src/gateway/gateway.wizard.e2e.test.ts`）。

Skills 目前仍然缺少什么（请参阅 [Skills](/zh/tools/skills))：

- **决策制定：** 当提示词中列出了 Skills 时，代理是否会选择正确的 Skill（或避开不相关的 Skill）？
- **合规性：** 代理是否在使用前阅读 `SKILL.md` 并遵循所需的步骤/参数？
- **工作流契约：** 断言工具顺序、会话历史延续和沙箱边界的多轮场景。

未来的评估应首先保持确定性：

- 使用模拟提供商的场景运行器，以断言工具调用 + 顺序、Skill 文件读取和会话接线。
- 一小套专注于 Skills 的场景（使用 vs 避开、准入控制、提示注入）。
- 仅在 CI 安全套件就绪后，才进行可选的实时评估（选择性加入、环境变量控制）。

## 添加回归测试（指南）

当您修复在实时测试中发现的提供商/模型问题时：

- 如果可能，添加 CI 安全的回归测试（模拟/存根提供商，或捕获确切的请求形状转换）
- 如果它本质上仅限实时测试（速率限制、身份验证策略），请保持实时测试的范围狭窄，并通过环境变量选择性加入
- 优先定位捕获该错误的最小层：
  - 提供商请求转换/重放错误 → 直接模型测试
  - gateway 会话/历史/工具管道错误 → gateway 实时冒烟测试或 CI 安全 gateway 模拟测试

import en from "/components/footer/en.mdx";

<en />
