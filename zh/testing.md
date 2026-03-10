---
summary: "测试套件: 单元/e2e/live测试套件、Docker运行器以及每个测试覆盖的内容"
read_when:
  - Running tests locally or in CI
  - Adding regressions for model/provider bugs
  - Debugging gateway + agent behavior
title: "Testing"
---

# Testing

OpenClaw有三个Vitest测试套件(单元/集成、e2e、live)和一组小型Docker运行器。

本文档是一份"我们如何测试"的指南:

- 每个测试套件覆盖的内容(以及它故意不覆盖的内容)
- 针对常见工作流程运行的命令(本地、预推送、调试)
- live测试如何发现凭据并选择模型/provider
- 如何为真实的model/provider问题添加回归测试

## 快速开始

大多数情况下:

- 完整检查(推送前预期): `pnpm build && pnpm check && pnpm test`

当您修改测试或想要额外的信心时:

- 覆盖率检查: `pnpm test:coverage`
- E2E套件: `pnpm test:e2e`

调试真实的provider/模型时(需要真实凭据):

- Live套件(模型 + gateway工具/图像探测): `pnpm test:live`

提示: 当您只需要一个失败的用例时，优先通过下面描述的allowlist环境变量来缩小live测试范围。

## 测试套件(什么在哪里运行)

将套件视为"递增的真实性"(以及递增的不稳定性/成本):

### 单元/集成(默认)

- 命令: `pnpm test`
- 配置: `vitest.config.ts`
- 文件: `src/**/*.test.ts`
- 范围:
  - 纯单元测试
  - 进程内集成测试(gateway认证、路由、工具、解析、配置)
  - 已知bug的确定性回归测试
- 预期:
  - 在CI中运行
  - 不需要真实密钥
  - 应该快速且稳定

### E2E (gateway冒烟测试)

- 命令: `pnpm test:e2e`
- 配置: `vitest.e2e.config.ts`
- 文件: `src/**/*.e2e.test.ts`
- 范围:
  - 多实例gateway端到端行为
  - WebSocket/HTTP接口、节点配对和更重的网络功能
- 预期:
  - 在CI中运行(在管道中启用时)
  - 不需要真实密钥
  - 比单元测试有更多移动部件(可能更慢)

### Live (真实provider + 真实模型)

- 命令: `pnpm test:live`
- 配置: `vitest.live.config.ts`
- 文件: `src/**/*.live.test.ts`
- 默认: 被`pnpm test:live`**启用**(设置`OPENCLAW_LIVE_TEST=1`)
- 范围:
  - "该provider/model在今天是否能用真实凭据正常工作？"
  - 捕获provider格式变更、工具调用怪癖、认证问题和速率限制行为
- 预期:
  - 设计上在CI中不稳定(真实网络、真实provider策略、配额、中断)
  - 花费金钱/使用速率限制
  - 优先运行缩小的子集而不是"所有"
  - Live运行将source `~/.profile`以获取缺失的API密钥
  - Anthropic密钥轮换: 设置`OPENCLAW_LIVE_ANTHROPIC_KEYS="sk-...,sk-..."`(或`OPENCLAW_LIVE_ANTHROPIC_KEY=sk-...`)或多个`ANTHROPIC_API_KEY*`变量；测试将在速率限制时重试

## 我应该运行哪个套件？

使用这个决策表:

- 编辑逻辑/测试: 运行`pnpm test`(如果您修改了很多，运行`pnpm test:coverage`)
- 触及gateway网络/WS协议/配对: 添加`pnpm test:e2e`
- 调试"我的机器人挂了"/provider特定失败/工具调用: 运行缩小的`pnpm test:live`

## Live: 模型冒烟测试(profile密钥)

Live测试分为两层，以便我们可以隔离故障:

- "直接模型"告诉我们provider/模型能否使用给定密钥回答。
- "Gateway冒烟"告诉我们完整的gateway+agent管道对该模型是否有效(会话、历史、工具、沙箱策略等)。

### 第1层: 直接模型完成(无gateway)

- 测试: `src/agents/models.profiles.live.test.ts`
- 目标:
  - 枚举发现的模型
  - 使用`getApiKeyForModel`选择您有凭据的模型
  - 为每个模型运行一个小型完成(以及针对的回归测试，如需要)
- 如何启用:
  - `pnpm test:live`(或如果直接调用Vitest则为`OPENCLAW_LIVE_TEST=1`)
  - 设置`OPENCLAW_LIVE_MODELS=modern`(或`all`，modern的别名)以实际运行此套件；否则它跳过以保持`pnpm test:live`专注于gateway冒烟
- 如何选择模型:
  - `OPENCLAW_LIVE_MODELS=modern`以运行modern允许列表(Opus/Sonnet/Haiku 4.5、GPT-5.x + Codex、Gemini 3、GLM 4.7、MiniMax M2.1、Grok 4)
  - `OPENCLAW_LIVE_MODELS=all`是modern允许列表的别名
  - 或`OPENCLAW_LIVE_MODELS="openai/gpt-5.2,anthropic/claude-opus-4-5,..."`(逗号允许列表)
- 如何选择provider:
  - `OPENCLAW_LIVE_PROVIDERS="google,google-antigravity,google-gemini-cli"`(逗号允许列表)
- 密钥来源:
  - 默认: profile存储和env回退
  - 设置`OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1`以强制仅使用**profile存储**
- 为什么存在:
  - 将"provider API损坏/密钥无效"与"gateway agent管道损坏"分离
  - 包含小型、隔离的回归测试(例如: OpenAI Responses/Codex Responses推理重放 + 工具调用流程)

### 第2层: Gateway + dev agent冒烟测试("@openclaw"实际做的事情)

- 测试: `src/gateway/gateway-models.profiles.live.test.ts`
- 目标:
  - 启动进程内gateway
  - 创建/补丁`agent:dev:*`会话(每次运行的模型覆盖)
  - 迭代有密钥的模型并断言:
    - "有意义"的响应(无工具)
    - 真实的工具调用有效(read探测)
    - 可选的额外工具探测(exec+read探测)
    - OpenAI回归路径(仅工具调用→后续)保持有效
- 探测详情(以便您可以快速解释失败):
  - `read`探测: 测试在工作空间中写入一个nonce文件，并要求agent `read`它并将nonce回传。
  - `exec+read`探测: 测试要求agent `exec`将nonce写入临时文件，然后`read`它回来。
  - 图像探测: 测试附加一个生成的PNG(cat + 随机代码)并期望模型返回`cat <CODE>`。
  - 实现参考: `src/gateway/gateway-models.profiles.live.test.ts`和`src/gateway/live-image-probe.ts`。
- 如何启用:
  - `pnpm test:live`(或如果直接调用Vitest则为`OPENCLAW_LIVE_TEST=1`)
- 如何选择模型:
  - 默认: modern允许列表(Opus/Sonnet/Haiku 4.5、GPT-5.x + Codex、Gemini 3、GLM 4.7、MiniMax M2.1、Grok 4)
  - `OPENCLAW_LIVE_GATEWAY_MODELS=all`是modern允许列表的别名
  - 或设置`OPENCLAW_LIVE_GATEWAY_MODELS="provider/model"`(或逗号列表)以缩小范围
- 如何选择provider(避免"OpenRouter一切"):
  - `OPENCLAW_LIVE_GATEWAY_PROVIDERS="google,google-antigravity,google-gemini-cli,openai,anthropic,zai,minimax"`(逗号允许列表)
- 工具 + 图像探测在此live测试中始终开启:
  - `read`探测 + `exec+read`探测(工具压力)
  - 当模型声明支持图像输入时运行图像探测
  - 流程(高级):
    - 测试生成一个带有"CAT" + 随机代码的微型PNG(`src/gateway/live-image-probe.ts`)
    - 通过`agent` `attachments: [{ mimeType: "image/png", content: "<base64>" }]`发送它
    - Gateway将附件解析为`images[]`(`src/gateway/server-methods/agent.ts` + `src/gateway/chat-attachments.ts`)
    - 嵌入式agent将多模态用户消息转发给模型
    - 断言: 回复包含`cat` + 代码(OCR容差: 允许小错误)

提示: 要查看您可以在机器上测试的内容(以及确切的`provider/model` id)，运行:

```bash
openclaw models list
openclaw models list --json
```

## Live: Anthropic setup-token冒烟测试

- 测试: `src/agents/anthropic.setup-token.live.test.ts`
- 目标: 验证Claude Code CLI setup-token(或粘贴的setup-token profile)可以完成Anthropic提示。
- 启用:
  - `pnpm test:live`(或如果直接调用Vitest则为`OPENCLAW_LIVE_TEST=1`)
  - `OPENCLAW_LIVE_SETUP_TOKEN=1`
- Token来源(选择一个):
  - Profile: `OPENCLAW_LIVE_SETUP_TOKEN_PROFILE=anthropic:setup-token-test`
  - 原始token: `OPENCLAW_LIVE_SETUP_TOKEN_VALUE=sk-ant-oat01-...`
- 模型覆盖(可选):
  - `OPENCLAW_LIVE_SETUP_TOKEN_MODEL=anthropic/claude-opus-4-5`

设置示例:

```bash
openclaw models auth paste-token --provider anthropic --profile-id anthropic:setup-token-test
OPENCLAW_LIVE_SETUP_TOKEN=1 OPENCLAW_LIVE_SETUP_TOKEN_PROFILE=anthropic:setup-token-test pnpm test:live src/agents/anthropic.setup-token.live.test.ts
```

## Live: CLI后端冒烟测试(Claude Code CLI或其他本地CLI)

- 测试: `src/gateway/gateway-cli-backend.live.test.ts`
- 目标: 使用本地CLI后端验证Gateway + agent管道，而不触及您的默认配置。
- 启用:
  - `pnpm test:live`(或如果直接调用Vitest则为`OPENCLAW_LIVE_TEST=1`)
  - `OPENCLAW_LIVE_CLI_BACKEND=1`
- 默认值:
  - 模型: `claude-cli/claude-sonnet-4-5`
  - 命令: `claude`
  - 参数: `["-p","--output-format","json","--dangerously-skip-permissions"]`
- 覆盖(可选):
  - `OPENCLAW_LIVE_CLI_BACKEND_MODEL="claude-cli/claude-opus-4-5"`
  - `OPENCLAW_LIVE_CLI_BACKEND_MODEL="codex-cli/gpt-5.2-codex"`
  - `OPENCLAW_LIVE_CLI_BACKEND_COMMAND="/full/path/to/claude"`
  - `OPENCLAW_LIVE_CLI_BACKEND_ARGS='["-p","--output-format","json","--permission-mode","bypassPermissions"]'`
  - `OPENCLAW_LIVE_CLI_BACKEND_CLEAR_ENV='["ANTHROPIC_API_KEY","ANTHROPIC_API_KEY_OLD"]'`
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_PROBE=1`以发送真实图像附件(路径被注入到提示中)。
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_ARG="--image"`以将图像文件路径作为CLI参数而不是提示注入传递。
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_MODE="repeat"`(或`"list"`)以控制在设置`IMAGE_ARG`时如何传递图像参数。
  - `OPENCLAW_LIVE_CLI_BACKEND_RESUME_PROBE=1`以发送第二轮并验证恢复流程。
  - `OPENCLAW_LIVE_CLI_BACKEND_DISABLE_MCP_CONFIG=0`以保持Claude Code CLI MCP配置启用(默认使用临时空文件禁用MCP配置)。

示例:

```bash
OPENCLAW_LIVE_CLI_BACKEND=1 \
  OPENCLAW_LIVE_CLI_BACKEND_MODEL="claude-cli/claude-sonnet-4-5" \
  pnpm test:live src/gateway/gateway-cli-backend.live.test.ts
```

### 推荐的live配方

缩小、明确的允许列表是最快且最不稳定的:

- 单个模型，直接(无gateway):
  - `OPENCLAW_LIVE_MODELS="openai/gpt-5.2" pnpm test:live src/agents/models.profiles.live.test.ts`

- 单个模型，gateway冒烟:
  - `OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.2" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

- 跨多个provider的工具调用:
  - `OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.2,anthropic/claude-opus-4-5,google/gemini-3-flash-preview,zai/glm-4.7,minimax/minimax-m2.1" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

- Google专注(Gemini API密钥 + Antigravity):
  - Gemini (API密钥): `OPENCLAW_LIVE_GATEWAY_MODELS="google/gemini-3-flash-preview" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`
  - Antigravity (OAuth): `OPENCLAW_LIVE_GATEWAY_MODELS="google-antigravity/claude-opus-4-5-thinking,google-antigravity/gemini-3-pro-high" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

注意事项:

- `google/...`使用Gemini API(API密钥)。
- `google-antigravity/...`使用Antigravity OAuth桥接(Cloud Code Assist风格的agent端点)。
- `google-gemini-cli/...`使用您机器上的本地Gemini CLI(单独的认证 + 工具怪癖)。
- Gemini API vs Gemini CLI:
  - API: OpenClaw通过HTTP调用Google托管的Gemini API(API密钥/profile认证)；这是大多数用户所说的"Gemini"。
  - CLI: OpenClaw shell调用本地`gemini`二进制文件；它有自己的认证，可能表现不同(流/工具支持/版本偏差)。

## Live: 模型矩阵(我们覆盖的内容)

没有固定的"CI模型列表"(live是可选的)，但这些是**推荐**在有密钥的开发机器上定期覆盖的模型。

### Modern冒烟集(工具调用 + 图像)

这是我们期望保持工作的"常用模型"运行:

- OpenAI (非Codex): `openai/gpt-5.2`(可选: `openai/gpt-5.1`)
- OpenAI Codex: `openai-codex/gpt-5.2`(可选: `openai-codex/gpt-5.2-codex`)
- Anthropic: `anthropic/claude-opus-4-5`(或`anthropic/claude-sonnet-4-5`)
- Google (Gemini API): `google/gemini-3-pro-preview`和`google/gemini-3-flash-preview`(避免较旧的Gemini 2.x模型)
- Google (Antigravity): `google-antigravity/claude-opus-4-5-thinking`和`google-antigravity/gemini-3-flash`
- Z.AI (GLM): `zai/glm-4.7`
- MiniMax: `minimax/minimax-m2.1`

使用工具 + 图像运行gateway冒烟:
`OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.2,openai-codex/gpt-5.2,anthropic/claude-opus-4-5,google/gemini-3-pro-preview,google/gemini-3-flash-preview,google-antigravity/claude-opus-4-5-thinking,google-antigravity/gemini-3-flash,zai/glm-4.7,minimax/minimax-m2.1" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

### 基线: 工具调用(Read + 可选Exec)

每个provider系列至少选择一个:

- OpenAI: `openai/gpt-5.2`(或`openai/gpt-5-mini`)
- Anthropic: `anthropic/claude-opus-4-5`(或`anthropic/claude-sonnet-4-5`)
- Google: `google/gemini-3-flash-preview`(或`google/gemini-3-pro-preview`)
- Z.AI (GLM): `zai/glm-4.7`
- MiniMax: `minimax/minimax-m2.1`

可选的额外覆盖(最好有):

- xAI: `xai/grok-4`(或最新可用)
- Mistral: `mistral/`…(选择一个您启用的支持"工具"的模型)
- Cerebras: `cerebras/`…(如果您有访问权限)
- LM Studio: `lmstudio/`…(本地；工具调用取决于API模式)

### 视觉: 图像发送(附件 → 多模态消息)

在`OPENCLAW_LIVE_GATEWAY_MODELS`中至少包含一个支持图像的模型(Claude/Gemini/OpenAI支持视觉的变体等)以运行图像探测。

### 聚合器/备用gateway

如果您启用了密钥，我们还支持通过以下方式测试:

- OpenRouter: `openrouter/...`(数百个模型；使用`openclaw models scan`找到支持工具+图像的候选)
- OpenCode Zen: `opencode/...`(通过`OPENCODE_API_KEY`/`OPENCODE_ZEN_API_KEY`认证)

您可以在live矩阵中包含的更多provider(如果您有凭据/配置):

- 内置: `openai`、`openai-codex`、`anthropic`、`google`、`google-vertex`、`google-antigravity`、`google-gemini-cli`、`zai`、`openrouter`、`opencode`、`xai`、`groq`、`cerebras`、`mistral`、`github-copilot`
- 通过`models.providers`(自定义端点): `minimax`(云/API)，以及任何OpenAI/Anthropic兼容的代理(LM Studio、vLLM、LiteLLM等)

提示: 不要试图在文档中硬编码"所有模型"。权威列表是您的机器上`discoverModels(...)`返回的内容以及可用的任何密钥。

## 凭据(永远不要提交)

Live测试以与CLI相同的方式发现凭据。实际影响:

- 如果CLI有效，live测试应该找到相同的密钥。
- 如果live测试说"没有凭据"，以与调试`openclaw models list`/模型选择相同的方式调试。

- Profile存储: `~/.openclaw/credentials/`(首选；测试中的"profile密钥"的含义)
- 配置: `~/.openclaw/openclaw.json`(或`OPENCLAW_CONFIG_PATH`)

如果您想依赖env密钥(例如在您的`~/.profile`中导出)，在`source ~/.profile`后运行本地测试，或使用下面的Docker运行器(它们可以将`~/.profile`挂载到容器中)。

## Deepgram live(音频转录)

- 测试: `src/media-understanding/providers/deepgram/audio.live.test.ts`
- 启用: `DEEPGRAM_API_KEY=... DEEPGRAM_LIVE_TEST=1 pnpm test:live src/media-understanding/providers/deepgram/audio.live.test.ts`

## Docker运行器(可选的"在Linux中工作"检查)

这些在repo Docker镜像内运行`pnpm test:live`，挂载您的本地配置目录和工作空间(如果挂载则source `~/.profile`):

- 直接模型: `pnpm test:docker:live-models`(脚本: `scripts/test-live-models-docker.sh`)
- Gateway + dev agent: `pnpm test:docker:live-gateway`(脚本: `scripts/test-live-gateway-models-docker.sh`)
- 入职向导(TTY、完整脚手架): `pnpm test:docker:onboard`(脚本: `scripts/e2e/onboard-docker.sh`)
- Gateway网络(两个容器、WS认证 + 健康): `pnpm test:docker:gateway-network`(脚本: `scripts/e2e/gateway-network-docker.sh`)
- 插件(自定义扩展加载 + 注册表冒烟): `pnpm test:docker:plugins`(脚本: `scripts/e2e/plugins-docker.sh`)

有用的环境变量:

- `OPENCLAW_CONFIG_DIR=...`(默认: `~/.openclaw`)挂载到`/home/node/.openclaw`
- `OPENCLAW_WORKSPACE_DIR=...`(默认: `~/.openclaw/workspace`)挂载到`/home/node/.openclaw/workspace`
- `OPENCLAW_PROFILE_FILE=...`(默认: `~/.profile`)挂载到`/home/node/.profile`并在运行测试前source
- `OPENCLAW_LIVE_GATEWAY_MODELS=...`/`OPENCLAW_LIVE_MODELS=...`以缩小运行范围
- `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1`以确保凭据来自profile存储(而非env)

## 文档完整性

在文档编辑后运行文档检查: `pnpm docs:list`。

## 离线回归测试(CI安全)

这些是没有真实provider的"真实管道"回归测试:

- Gateway工具调用(mock OpenAI、真实gateway + agent循环): `src/gateway/gateway.tool-calling.mock-openai.test.ts`
- Gateway向导(WS `wizard.start`/`wizard.next`、写入配置 + 认证强制): `src/gateway/gateway.wizard.e2e.test.ts`

## Agent可靠性评估(skills)

我们已经有几个CI安全的测试，其行为类似于"agent可靠性评估":

- 通过真实gateway + agent循环的mock工具调用(`src/gateway/gateway.tool-calling.mock-openai.test.ts`)。
- 验证会话连线和配置效果的端到端向导流程(`src/gateway/gateway.wizard.e2e.test.ts`)。

skills仍然缺少的内容(参见[Skills](/zh/tools/skills)):

- **决策:** 当skills在提示中列出时，agent是否选择正确的skill(或避免不相关的)？
- **合规性:** agent是否在使用前读取`SKILL.md`并遵循所需的步骤/参数？
- **工作流契约:** 断言工具顺序、会话历史延续和沙箱边界的多轮场景。

未来的评估应首先保持确定性:

- 使用mock provider断言工具调用 + 顺序、skill文件读取和会话连线的场景运行器。
- 一组专注于skill的小型场景(使用vs避免、门控、提示注入)。
- 仅在CI安全套件到位后，可选的live评估(可选、env门控)。

## 添加回归测试(指导)

当您修复在live中发现的provider/模型问题时:

- 如果可能，添加CI安全的回归测试(mock/stub provider，或捕获确切的请求形状转换)
- 如果本质上是仅live的(速率限制、认证策略)，保持live测试狭窄并通过env变量可选
- 优先针对捕获bug的最小层:
  - provider请求转换/重放bug → 直接模型测试
  - gateway会话/历史/工具管道bug → gateway live冒烟或CI安全的gateway mock测试
