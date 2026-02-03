---
title: "测试"
summary: "测试工具包：单元/e2e/live 套件、Docker 运行器，以及每个测试覆盖范围"
read_when:
  - 在本地或 CI 运行测试
  - 为模型/provider bug 添加回归
  - 调试 gateway + agent 行为
---

# 测试

OpenClaw 有三套 Vitest 套件（unit/integration、e2e、live）以及一小组 Docker 运行器。

本文是“我们如何测试”的指南：

- 每个套件覆盖什么（以及 _不_ 覆盖什么）
- 常见工作流应该运行哪些命令（本地、pre-push、调试）
- live 测试如何发现凭据并选择模型/provider
- 如何为真实世界的模型/provider 问题添加回归

## 快速开始

大多数情况下：

- 完整门禁（推送前期望运行）：`pnpm lint && pnpm build && pnpm test`

当你改动了测试或需要更高信心：

- 覆盖率门禁：`pnpm test:coverage`
- E2E 套件：`pnpm test:e2e`

当调试真实 provider/模型（需要真实凭据）：

- Live 套件（模型 + gateway 工具/图像探针）：`pnpm test:live`

提示：如果只需要一个失败用例，优先用下文的 allowlist 环境变量收窄 live 测试范围。

## 测试套件（在哪跑，覆盖什么）

可以理解为“现实程度”递增（并且 flakiness/成本递增）：

### Unit / integration（默认）

- 命令：`pnpm test`
- 配置：`vitest.config.ts`
- 文件：`src/**/*.test.ts`
- 范围：
  - 纯单元测试
  - 进程内集成测试（gateway auth、路由、工具、解析、配置）
  - 已知 bug 的确定性回归
- 期望：
  - 在 CI 运行
  - 不需要真实 key
  - 快且稳定

### E2E（gateway 冒烟）

- 命令：`pnpm test:e2e`
- 配置：`vitest.e2e.config.ts`
- 文件：`src/**/*.e2e.test.ts`
- 范围：
  - 多实例 gateway 的端到端行为
  - WebSocket/HTTP 面、node 配对与更重的网络路径
- 期望：
  - 在 CI 运行（若 pipeline 启用）
  - 不需要真实 key
  - 比 unit 测试更慢、更多组件

### Live（真实 provider + 真实模型）

- 命令：`pnpm test:live`
- 配置：`vitest.live.config.ts`
- 文件：`src/**/*.live.test.ts`
- 默认：由 `pnpm test:live` 启用（设置 `OPENCLAW_LIVE_TEST=1`）
- 范围：
  - “这个 provider/模型 **今天** 是否在真实凭据下可用？”
  - 捕捉 provider 格式变更、工具调用差异、认证问题、限流行为
- 期望：
  - 有意地不稳定（真实网络、真实策略、配额、宕机）
  - 需要费用/配额
  - 优先运行收窄子集，而不是“全量”
  - Live 会从 `~/.profile` 读取缺失的 API key
  - Anthropic key 轮换：设置 `OPENCLAW_LIVE_ANTHROPIC_KEYS="sk-...,sk-..."`（或 `OPENCLAW_LIVE_ANTHROPIC_KEY=sk-...`）或多个 `ANTHROPIC_API_KEY*` 变量；测试在限流时会重试

## 我应该运行哪个套件？

使用以下决策表：

- 修改逻辑/测试：运行 `pnpm test`（若改动较大，加 `pnpm test:coverage`）
- 修改 gateway 网络 / WS 协议 / 配对：加 `pnpm test:e2e`
- 调试“机器人挂了”/provider 特定失败/工具调用：运行收窄后的 `pnpm test:live`

## Live：模型冒烟（profile keys）

Live 测试分两层，以便隔离失败：

- “Direct model” 判断 provider/模型是否能在给定 key 下回答。
- “Gateway smoke” 判断完整 gateway+agent 流水线是否可用（会话、历史、工具、sandbox 策略等）。

### Layer 1：Direct model completion（无 gateway）

- 测试：`src/agents/models.profiles.live.test.ts`
- 目标：
  - 枚举发现的模型
  - 使用 `getApiKeyForModel` 选择有凭据的模型
  - 对每个模型运行一次小型 completion（并在需要时运行定向回归）
- 如何启用：
  - `pnpm test:live`（或直接调用 Vitest 时设置 `OPENCLAW_LIVE_TEST=1`）
- 设 `OPENCLAW_LIVE_MODELS=modern`（或 `all`，是 modern 别名）才会实际跑该套件；否则跳过，以保持 `pnpm test:live` 专注于 gateway 冒烟
- 如何选择模型：
  - `OPENCLAW_LIVE_MODELS=modern` 运行 modern allowlist（Opus/Sonnet/Haiku 4.5、GPT-5.x + Codex、Gemini 3、GLM 4.7、MiniMax M2.1、Grok 4）
  - `OPENCLAW_LIVE_MODELS=all` 为 modern allowlist 的别名
  - 或 `OPENCLAW_LIVE_MODELS="openai/gpt-5.2,anthropic/claude-opus-4-5,..."`（逗号 allowlist）
- 如何选择 provider：
  - `OPENCLAW_LIVE_PROVIDERS="google,google-antigravity,google-gemini-cli"`（逗号 allowlist）
- Key 来源：
  - 默认：profile store + env 回退
  - 设置 `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` 可强制仅使用 **profile store**
- 目的：
  - 区分 “provider API 故障/无效 key” 与 “gateway agent 流水线故障”
  - 容纳小而独立的回归（例如 OpenAI Responses/Codex Responses 的 reasoning replay + tool-call 流程）

### Layer 2：Gateway + dev agent 冒烟（“@openclaw” 的真实行为）

- 测试：`src/gateway/gateway-models.profiles.live.test.ts`
- 目标：
  - 启动进程内 gateway
  - 创建/补丁 `agent:dev:*` 会话（每次运行覆盖模型）
  - 遍历具备 key 的模型并断言：
    - “有意义”的回复（无工具）
    - 真实工具调用可用（read 探针）
    - 可选工具探针（exec+read）
    - OpenAI 回归路径（tool-call-only → follow-up）仍可用
- 探针细节（便于快速解释失败）：
  - `read` 探针：测试在工作区写入一个 nonce 文件，然后让 agent `read` 并回显 nonce。
  - `exec+read` 探针：测试让 agent `exec` 写入 nonce 到临时文件，再 `read` 回来。
  - image 探针：测试附加生成 PNG（cat + 随机 code），期望模型返回 `cat <CODE>`。
  - 实现参考：`src/gateway/gateway-models.profiles.live.test.ts` 与 `src/gateway/live-image-probe.ts`。
- 如何启用：
  - `pnpm test:live`（或直接调用 Vitest 时设置 `OPENCLAW_LIVE_TEST=1`）
- 如何选择模型：
  - 默认：modern allowlist（Opus/Sonnet/Haiku 4.5、GPT-5.x + Codex、Gemini 3、GLM 4.7、MiniMax M2.1、Grok 4）
  - `OPENCLAW_LIVE_GATEWAY_MODELS=all` 为 modern allowlist 的别名
  - 或设置 `OPENCLAW_LIVE_GATEWAY_MODELS="provider/model"`（或逗号列表）以收窄
- 如何选择 provider（避免“OpenRouter 全量”）：
  - `OPENCLAW_LIVE_GATEWAY_PROVIDERS="google,google-antigravity,google-gemini-cli,openai,anthropic,zai,minimax"`（逗号 allowlist）
- 工具 + 图像探针在该 live 测试中始终开启：
  - `read` 探针 + `exec+read` 探针（工具压力）
  - 当模型声明支持图像输入时运行 image 探针
  - 流程（高层）：
    - 测试生成一个写有 “CAT” + 随机 code 的小 PNG（`src/gateway/live-image-probe.ts`）
    - 通过 `agent` 发送 `attachments: [{ mimeType: "image/png", content: "<base64>" }]`
    - Gateway 将附件解析为 `images[]`（`src/gateway/server-methods/agent.ts` + `src/gateway/chat-attachments.ts`）
    - 内置 agent 将多模态用户消息转发给模型
    - 断言：回复包含 `cat` + code（OCR 容错：允许轻微错误）

提示：查看你机器上能测什么（以及精确的 `provider/model` id）：

```bash
openclaw models list
openclaw models list --json
```

## Live：Anthropic setup-token 冒烟

- 测试：`src/agents/anthropic.setup-token.live.test.ts`
- 目标：验证 Claude Code CLI 的 setup-token（或粘贴的 setup-token profile）可完成 Anthropic prompt。
- 启用：
  - `pnpm test:live`（或直接调用 Vitest 时设置 `OPENCLAW_LIVE_TEST=1`）
  - `OPENCLAW_LIVE_SETUP_TOKEN=1`
- Token 来源（任选其一）：
  - Profile：`OPENCLAW_LIVE_SETUP_TOKEN_PROFILE=anthropic:setup-token-test`
  - Raw token：`OPENCLAW_LIVE_SETUP_TOKEN_VALUE=sk-ant-oat01-...`
- 模型覆盖（可选）：
  - `OPENCLAW_LIVE_SETUP_TOKEN_MODEL=anthropic/claude-opus-4-5`

示例：

```bash
openclaw models auth paste-token --provider anthropic --profile-id anthropic:setup-token-test
OPENCLAW_LIVE_SETUP_TOKEN=1 OPENCLAW_LIVE_SETUP_TOKEN_PROFILE=anthropic:setup-token-test pnpm test:live src/agents/anthropic.setup-token.live.test.ts
```

## Live：CLI backend 冒烟（Claude Code CLI 或其他本地 CLI）

- 测试：`src/gateway/gateway-cli-backend.live.test.ts`
- 目标：不触碰默认配置的情况下，验证 Gateway + agent 流水线使用本地 CLI backend。
- 启用：
  - `pnpm test:live`（或直接调用 Vitest 时设置 `OPENCLAW_LIVE_TEST=1`）
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
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_PROBE=1` 发送真实图片附件（路径注入到提示中）。
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_ARG="--image"` 将图片路径作为 CLI 参数传递，而非提示注入。
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_MODE="repeat"`（或 `"list"`）控制在设置 `IMAGE_ARG` 时如何传递图片参数。
  - `OPENCLAW_LIVE_CLI_BACKEND_RESUME_PROBE=1` 发送第二轮并验证 resume 流程。
- `OPENCLAW_LIVE_CLI_BACKEND_DISABLE_MCP_CONFIG=0` 保持 Claude Code CLI MCP 配置启用（默认会用临时空文件禁用 MCP 配置）。

示例：

```bash
OPENCLAW_LIVE_CLI_BACKEND=1   OPENCLAW_LIVE_CLI_BACKEND_MODEL="claude-cli/claude-sonnet-4-5"   pnpm test:live src/gateway/gateway-cli-backend.live.test.ts
```

### 推荐的 live 配方

更窄、更明确的 allowlist 最快也最稳定：

- 单模型、直连（无 gateway）：
  - `OPENCLAW_LIVE_MODELS="openai/gpt-5.2" pnpm test:live src/agents/models.profiles.live.test.ts`

- 单模型、gateway 冒烟：
  - `OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.2" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

- 多 provider 的工具调用：
  - `OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.2,anthropic/claude-opus-4-5,google/gemini-3-flash-preview,zai/glm-4.7,minimax/minimax-m2.1" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

- Google 聚焦（Gemini API key + Antigravity）：
  - Gemini（API key）：`OPENCLAW_LIVE_GATEWAY_MODELS="google/gemini-3-flash-preview" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`
  - Antigravity（OAuth）：`OPENCLAW_LIVE_GATEWAY_MODELS="google-antigravity/claude-opus-4-5-thinking,google-antigravity/gemini-3-pro-high" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

说明：

- `google/...` 使用 Gemini API（API key）。
- `google-antigravity/...` 使用 Antigravity OAuth 桥（Cloud Code Assist 风格 agent 端点）。
- `google-gemini-cli/...` 使用本机的 Gemini CLI（单独认证 + 工具差异）。
- Gemini API vs Gemini CLI：
  - API：OpenClaw 通过 HTTP 调用 Google 托管的 Gemini API（API key/profile 认证）；通常用户所说的“Gemini”。
  - CLI：OpenClaw 调用本地 `gemini` 二进制；它有独立认证，行为可能不同（流式/工具支持/版本差异）。

## Live：模型矩阵（覆盖范围）

没有固定的“CI 模型清单”（live 是 opt-in），但这些是 **推荐** 的常规覆盖模型（在具备 key 的开发机上）。

### Modern 冒烟集（工具调用 + 图像）

这是我们期望保持可用的“常见模型”运行：

- OpenAI（非 Codex）：`openai/gpt-5.2`（可选：`openai/gpt-5.1`）
- OpenAI Codex：`openai-codex/gpt-5.2`（可选：`openai-codex/gpt-5.2-codex`）
- Anthropic：`anthropic/claude-opus-4-5`（或 `anthropic/claude-sonnet-4-5`）
- Google（Gemini API）：`google/gemini-3-pro-preview` 与 `google/gemini-3-flash-preview`（避免较老的 Gemini 2.x）
- Google（Antigravity）：`google-antigravity/claude-opus-4-5-thinking` 与 `google-antigravity/gemini-3-flash`
- Z.AI（GLM）：`zai/glm-4.7`
- MiniMax：`minimax/minimax-m2.1`

运行 gateway 冒烟（含工具 + 图像）：
`OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.2,openai-codex/gpt-5.2,anthropic/claude-opus-4-5,google/gemini-3-pro-preview,google/gemini-3-flash-preview,google-antigravity/claude-opus-4-5-thinking,google-antigravity/gemini-3-flash,zai/glm-4.7,minimax/minimax-m2.1" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

### 基线：工具调用（Read + 可选 Exec）

每个 provider 家族至少选择一个：

- OpenAI：`openai/gpt-5.2`（或 `openai/gpt-5-mini`）
- Anthropic：`anthropic/claude-opus-4-5`（或 `anthropic/claude-sonnet-4-5`）
- Google：`google/gemini-3-flash-preview`（或 `google/gemini-3-pro-preview`）
- Z.AI（GLM）：`zai/glm-4.7`
- MiniMax：`minimax/minimax-m2.1`

可选的额外覆盖（锦上添花）：

- xAI：`xai/grok-4`（或最新可用）
- Mistral：`mistral/`…（选择一个已启用 tools 的模型）
- Cerebras：`cerebras/`…（如果你有权限）
- LM Studio：`lmstudio/`…（本地；工具调用取决于 API 模式）

### 视觉：发送图片（附件 → 多模态消息）

在 `OPENCLAW_LIVE_GATEWAY_MODELS` 中至少包含一个支持图片的模型（Claude/Gemini/OpenAI 的视觉变体等）以触发 image 探针。

### 聚合器 / 替代网关

若你有相关 key，也支持通过以下方式测试：

- OpenRouter：`openrouter/...`（数百模型；用 `openclaw models scan` 查找支持工具+图像的候选）
- OpenCode Zen：`opencode/...`（认证 `OPENCODE_API_KEY` / `OPENCODE_ZEN_API_KEY`）

更多可纳入 live 矩阵的 provider（如果你有凭据/配置）：

- 内置：`openai`, `openai-codex`, `anthropic`, `google`, `google-vertex`, `google-antigravity`, `google-gemini-cli`, `zai`, `openrouter`, `opencode`, `xai`, `groq`, `cerebras`, `mistral`, `github-copilot`
- 通过 `models.providers`（自定义端点）：`minimax`（云/API），以及任意 OpenAI/Anthropic 兼容代理（LM Studio, vLLM, LiteLLM 等）

提示：不要在文档中硬编码“所有模型”。权威列表是你本机 `discoverModels(...)` 返回的内容 + 当前可用 key。

## 凭据（永不提交）

Live 测试发现凭据的方式与 CLI 相同。实际含义：

- CLI 可用时，live 测试应能找到相同 key。
- 若 live 测试提示“no creds”，用 `openclaw models list` / 模型选择的方式调试。

- Profile store：`~/.openclaw/credentials/`（优先；测试中的 “profile keys” 指这个）
- 配置：`~/.openclaw/openclaw.json`（或 `OPENCLAW_CONFIG_PATH`）

若你想依赖环境变量 key（例如在 `~/.profile` 中导出），请在 `source ~/.profile` 后运行本地测试，或使用下方 Docker 运行器（它们可将 `~/.profile` 挂载进容器）。

## Deepgram live（音频转写）

- 测试：`src/media-understanding/providers/deepgram/audio.live.test.ts`
- 启用：`DEEPGRAM_API_KEY=... DEEPGRAM_LIVE_TEST=1 pnpm test:live src/media-understanding/providers/deepgram/audio.live.test.ts`

## Docker 运行器（可选的“Linux 可用性”检查）

这些会在仓库 Docker 镜像内运行 `pnpm test:live`，并挂载你的本地配置目录和工作区（若挂载了 `~/.profile` 也会 source）：

- Direct models：`pnpm test:docker:live-models`（脚本：`scripts/test-live-models-docker.sh`）
- Gateway + dev agent：`pnpm test:docker:live-gateway`（脚本：`scripts/test-live-gateway-models-docker.sh`）
- Onboarding 向导（TTY，全脚手架）：`pnpm test:docker:onboard`（脚本：`scripts/e2e/onboard-docker.sh`）
- Gateway 网络（双容器，WS auth + health）：`pnpm test:docker:gateway-network`（脚本：`scripts/e2e/gateway-network-docker.sh`）
- Plugins（自定义扩展加载 + registry 冒烟）：`pnpm test:docker:plugins`（脚本：`scripts/e2e/plugins-docker.sh`）

常用环境变量：

- `OPENCLAW_CONFIG_DIR=...`（默认：`~/.openclaw`）挂载到 `/home/node/.openclaw`
- `OPENCLAW_WORKSPACE_DIR=...`（默认：`~/.openclaw/workspace`）挂载到 `/home/node/.openclaw/workspace`
- `OPENCLAW_PROFILE_FILE=...`（默认：`~/.profile`）挂载到 `/home/node/.profile` 并在测试前 source
- `OPENCLAW_LIVE_GATEWAY_MODELS=...` / `OPENCLAW_LIVE_MODELS=...` 用于收窄运行范围
- `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` 强制凭据来自 profile store（非 env）

## 文档 sanity

文档变更后运行检查：`pnpm docs:list`。

## Offline 回归（CI 安全）

这些是“真实流水线”回归，但不需要真实 provider：

- Gateway 工具调用（mock OpenAI，真实 gateway + agent loop）：`src/gateway/gateway.tool-calling.mock-openai.test.ts`
- Gateway 向导（WS `wizard.start`/`wizard.next`，写配置 + 认证强制）：`src/gateway/gateway.wizard.e2e.test.ts`

## Agent 可靠性评估（skills）

已有一些 CI 安全测试，行为类似“agent 可靠性评估”：

- 通过真实 gateway + agent loop 的 mock 工具调用（`src/gateway/gateway.tool-calling.mock-openai.test.ts`）。
- 端到端向导流程，验证会话连接与配置效果（`src/gateway/gateway.wizard.e2e.test.ts`）。

Skills 仍缺少的内容（见 [Skills](/zh/tools/skills)）：

- **Decisioning：** prompt 中列出 skills 时，agent 是否选择正确的技能（或避免不相关技能）？
- **Compliance：** agent 是否在使用前读取 `SKILL.md`，并遵循必须的步骤/参数？
- **Workflow contracts：** 多回合场景，断言工具顺序、会话历史带入与 sandbox 边界。

未来评估应先保持确定性：

- 使用 mock provider 的场景 runner，断言工具调用 + 顺序、技能文件读取、会话连接。
- 一小组以技能为中心的场景（使用 vs 避免、门控、提示注入）。
- 可选 live eval（opt-in、env gate），仅在 CI 安全套件完善后加入。

## 添加回归（指南）

当你修复 live 中发现的 provider/model 问题时：

- 尽可能添加 CI 安全回归（mock/stub provider，或捕获精确的请求形状转换）
- 若本质上只能 live（限流、认证策略），保持 live 测试狭窄并通过 env vars opt-in
- 优先定位最小层级以捕捉 bug：
  - provider 请求转换/回放 bug → direct models 测试
  - gateway 会话/历史/工具流水线 bug → gateway live 冒烟或 CI 安全的 gateway mock 测试
