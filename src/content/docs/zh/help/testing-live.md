---
summary: "Live（网络触达）测试：模型矩阵、CLI 后端、ACP、媒体提供商、凭证"
read_when:
  - Running live model matrix / CLI backend / ACP / media-provider smokes
  - Debugging live-test credential resolution
  - Adding a new provider-specific live test
title: "测试：实时套件"
sidebarTitle: "实时测试"
---

有关快速入门、QA 运行器、单元/集成测试套件和 Docker 流程，请参阅
[Testing](/zh/help/testing)。本页面涵盖 **live**（网络触达）测试
套件：模型矩阵、CLI 后端、ACP 和媒体提供商实时测试，以及
凭证处理。

## 实时：本地冒烟命令

在进行临时实时
检查之前，请在进程环境中导出所需的提供商密钥。

安全媒体冒烟：

```bash
pnpm openclaw infer tts convert --local --json \
  --text "OpenClaw live smoke." \
  --output /tmp/openclaw-live-smoke.mp3
```

安全语音呼叫就绪冒烟：

```bash
pnpm openclaw voicecall setup --json
pnpm openclaw voicecall smoke --to "+15555550123"
```

除非同时存在 `--yes`，否则 `voicecall smoke` 是一次空运行。仅当您有意进行实际通知调用时，才使用 `--yes`。
对于 Twilio、Telnyx 和 Plivo，成功的就绪性检查需要公共 Webhook URL；根据设计，仅限本地的环回/专用后备会被拒绝。

## 实时：Android 节点功能扫描

- 测试：`src/gateway/android-node.capabilities.live.test.ts`
- 脚本：`pnpm android:test:integration`
- 目标：调用已连接的 Android 节点当前**通告的每个命令**，并断言命令契约行为。
- 范围：
  - 预条件/手动设置（该套件不安装/运行/配对应用程序）。
  - 针对所选 Android 节点的逐命令网关 `node.invoke` 验证。
- 必需的预设置：
  - Android 应用程序已连接并配对到网关。
  - 应用程序保持在前台。
  - 已为您期望通过的功能授予权限/捕获同意。
- 可选目标覆盖：
  - `OPENCLAW_ANDROID_NODE_ID` 或 `OPENCLAW_ANDROID_NODE_NAME`。
  - `OPENCLAW_ANDROID_GATEWAY_URL` / `OPENCLAW_ANDROID_GATEWAY_TOKEN` / `OPENCLAW_ANDROID_GATEWAY_PASSWORD`。
- 完整的 Android 设置详细信息：[Android App](/zh/platforms/android)

## 实时：模型冒烟（配置文件密钥）

实时测试分为两层，以便我们能够隔离故障：

- “直接模型”告诉我们提供商/模型是否可以使用给定的密钥进行应答。
- “Gateway(网关) smoke”告诉我们完整的 Gateway+agent 管道是否对该模型有效（会话、历史记录、工具、沙箱策略等）。

### Layer 1: Direct 模型 completion (no gateway)

- 测试：`src/agents/models.profiles.live.test.ts`
- Goal:
  - 枚举已发现的模型
  - 使用 `getApiKeyForModel` 选择您拥有凭证的模型
  - 为每个模型运行一个小型的补全（并在需要时运行有针对性的回归测试）
- How to enable:
  - `pnpm test:live`（如果直接调用 Vitest，则为 `OPENCLAW_LIVE_TEST=1`）
- 设置 `OPENCLAW_LIVE_MODELS=modern`（或 `all`，modern 的别名）以实际运行此套件；否则它会跳过，以保持 `pnpm test:live` 专注于网关冒烟测试
- How to select models:
  - `OPENCLAW_LIVE_MODELS=modern` 运行现代白名单（Opus/Sonnet 4.6+、GPT-5.2 + Codex、Gemini 3、DeepSeek V4、GLM 4.7、MiniMax M2.7、Grok 4.3）
  - `OPENCLAW_LIVE_MODELS=all` 是现代 allowlist 的别名
  - 或 `OPENCLAW_LIVE_MODELS="openai/gpt-5.5,openai-codex/gpt-5.5,anthropic/claude-opus-4-6,..."`（逗号分隔的 allowlist）
  - Modern/all 扫描默认为精选的高信号上限；设置 `OPENCLAW_LIVE_MAX_MODELS=0` 进行全面的现代扫描，或设置正数以使用较小的上限。
  - 全面扫描使用 `OPENCLAW_LIVE_TEST_TIMEOUT_MS` 作为整个直连模型测试的超时时间。默认值：60 分钟。
  - 直连模型探测默认以 20 路并行运行；设置 `OPENCLAW_LIVE_MODEL_CONCURRENCY` 进行覆盖。
- How to select providers:
  - `OPENCLAW_LIVE_PROVIDERS="google,google-antigravity,google-gemini-cli"`（逗号分隔的 allowlist）
- Where keys come from:
  - 默认：profile store 和 env fallbacks
  - 设置 `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` 以仅强制执行 **profile store**
- Why this exists:
  - 区分“提供商 API 已损坏 / 密钥无效”和“Gateway agent 管道已损坏”
  - 包含小型、独立的回归测试（例如：OpenAI Responses/Codex Responses 推理重放 + 工具调用流）

### Layer 2: Gateway(网关) + dev agent smoke (what "@openclaw" actually does)

- 测试：`src/gateway/gateway-models.profiles.live.test.ts`
- Goal:
  - 启动一个进程内 gateway
  - 创建/修补 `agent:dev:*` 会话（每次运行覆盖模型）
  - 迭代带密钥的模型并断言：
    - “有意义”的响应（无工具）
    - 真实的工具调用有效（读取探测）
    - 可选的额外工具探测（exec+read 探测）
    - OpenAI 回归路径（仅工具调用 → 后续跟进）保持正常工作
- 探测详情（以便您能快速解释失败原因）：
  - `read` 探测：测试在工作区中写入一个 nonce 文件，并要求 agent `read` 该文件并将 nonce 回显。
  - `exec+read` 探测：测试要求 agent 将 nonce `exec`-写入临时文件，然后将其 `read` 回来。
  - 图像探测：测试附加一个生成的 PNG（cat + 随机代码），并期望模型返回 `cat <CODE>`。
  - 实现参考：`src/gateway/gateway-models.profiles.live.test.ts` 和 `test/helpers/live-image-probe.ts`。
- 如何启用：
  - `pnpm test:live`（如果直接调用 Vitest，则为 `OPENCLAW_LIVE_TEST=1`）
- 如何选择模型：
  - 默认值：现代允许列表（Opus/Sonnet 4.6+、GPT-5.2 + Codex、Gemini 3、DeepSeek V4、GLM 4.7、MiniMax M2.7、Grok 4.3）
  - `OPENCLAW_LIVE_GATEWAY_MODELS=all` 是现代 allowlist 的别名
  - 或设置 `OPENCLAW_LIVE_GATEWAY_MODELS="provider/model"`（或逗号列表）以缩小范围
  - Modern/all 网关扫描默认为精选的高信号上限；设置 `OPENCLAW_LIVE_GATEWAY_MAX_MODELS=0` 进行全面的现代扫描，或设置正数以使用较小的上限。
- 如何选择提供商（避免“OpenRouter 万能”）：
  - `OPENCLAW_LIVE_GATEWAY_PROVIDERS="google,google-antigravity,google-gemini-cli,openai,anthropic,zai,minimax"`（逗号分隔的 allowlist）
- 在此实时测试中，工具 + 图像探测始终开启：
  - `read` 探测 + `exec+read` 探测（工具压力测试）
  - 当模型声明支持图像输入时，运行图像探测
  - 流程（高级）：
    - 测试生成一个带有“CAT”+ 随机代码的微小 PNG (`test/helpers/live-image-probe.ts`)
    - 通过 `agent` `attachments: [{ mimeType: "image/png", content: "<base64>" }]` 发送
    - Gateway(网关) 将附件解析为 Gateway(网关)`images[]`（`src/gateway/server-methods/agent.ts` + `src/gateway/chat-attachments.ts`）
    - 嵌入式代理将多模态用户消息转发给模型
    - 断言：回复包含 `cat` + 代码（OCR 容错：允许小错误）

<Tip>
要查看你可以在机器上测试的内容（以及确切的 `provider/model` ID），请运行：

```bash
openclaw models list
openclaw models list --json
```

</Tip>

## Live: CLI 后端冒烟测试 (Claude, Gemini 或其他本地 CLI)

- 测试：`src/gateway/gateway-cli-backend.live.test.ts`
- 目标：使用本地 CLI 后端验证 Gateway + agent 管道，而不触及您的默认配置。
- 特定于后端的冒烟测试默认值位于所属扩展的 `cli-backend.ts` 定义中。
- 启用：
  - `pnpm test:live`（如果直接调用 Vitest，则为 `OPENCLAW_LIVE_TEST=1`）
  - `OPENCLAW_LIVE_CLI_BACKEND=1`
- 默认值：
  - 默认提供商/模型：`claude-cli/claude-sonnet-4-6`
  - 命令/参数/镜像行为来自所属 CLI 后端插件元数据。
- 覆盖（可选）：
  - `OPENCLAW_LIVE_CLI_BACKEND_MODEL="claude-cli/claude-sonnet-4-6"`
  - `OPENCLAW_LIVE_CLI_BACKEND_COMMAND="/full/path/to/claude"`
  - `OPENCLAW_LIVE_CLI_BACKEND_ARGS='["-p","--output-format","json"]'`
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_PROBE=1`Docker 发送真实的图像附件（路径会被注入到提示词中）。Docker 配方默认关闭此项，除非明确要求。
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_ARG="--image"`CLI 将图像文件路径作为 CLI 参数传递，而不是通过提示词注入。
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_MODE="repeat"`（或 `"list"`）用于控制在设置 `IMAGE_ARG` 时如何传递图像参数。
  - `OPENCLAW_LIVE_CLI_BACKEND_RESUME_PROBE=1` 发送第二轮对话并验证恢复流程。
  - `OPENCLAW_LIVE_CLI_BACKEND_MODEL_SWITCH_PROBE=1`Docker 选择加入 Claude Sonnet -> Opus 同一会话连续性探测，当所选模型支持切换目标时。Docker 配方默认关闭此项以确保总体可靠性。
  - `OPENCLAW_LIVE_CLI_BACKEND_MCP_PROBE=1`Docker 选择加入 MCP/工具 回环探测。Docker 配方默认关闭此项，除非明确要求。

示例：

```bash
  OPENCLAW_LIVE_CLI_BACKEND=1 \
  OPENCLAW_LIVE_CLI_BACKEND_MODEL="claude-cli/claude-sonnet-4-6" \
  pnpm test:live src/gateway/gateway-cli-backend.live.test.ts
```

廉价的 Gemini MCP 配置冒烟测试：

```bash
OPENCLAW_LIVE_TEST=1 \
  pnpm test:live src/agents/cli-runner/bundle-mcp.gemini.live.test.ts
```

这不会要求 Gemini 生成响应。它会写入 OpenClaw 给 Gemini 的相同系统设置，然后运行 OpenClaw`gemini --debug mcp list` 以证明保存的 `transport: "streamable-http"` 服务器已标准化为 Gemini 的 HTTP MCP 形状，并且可以连接到本地可流式传输的 HTTP MCP 服务器。

Docker 配方：

```bash
pnpm test:docker:live-cli-backend
```

单一提供商 Docker 配方：

```bash
pnpm test:docker:live-cli-backend:claude
pnpm test:docker:live-cli-backend:claude-subscription
pnpm test:docker:live-cli-backend:gemini
```

注意事项：

- Docker 运行器位于 Docker`scripts/test-live-cli-backend-docker.sh`。
- 它在仓库 Docker 镜像中以非 root CLIDocker`node` 用户运行实时 CLI 后端冒烟测试。
- 它从所属扩展解析 CLI 冒烟测试元数据，然后将匹配的 Linux CLI 包（CLILinuxCLI`@anthropic-ai/claude-code` 或 `@google/gemini-cli`）安装到 `OPENCLAW_DOCKER_CLI_TOOLS_DIR`（默认：`~/.cache/openclaw/docker-cli-tools`）的可写缓存前缀中。
- `pnpm test:docker:live-cli-backend:claude-subscription`OAuth 需要通过带有 `claudeAiOauth.subscriptionType` 的 `~/.claude/.credentials.json` 或来自 `claude setup-token` 的 `CLAUDE_CODE_OAUTH_TOKEN` 获得可移植的 Claude Code 订阅 OAuth。它首先在 Docker 中证明直接的 `claude -p`DockerGateway(网关)CLIAnthropicAPI，然后在不保留 Anthropic API 密钥环境变量的情况下运行两轮 Gateway CLI 后端。此订阅通道默认禁用 Claude MCP/工具和图像探测，因为 Claude 目前通过额外使用计费而非正常订阅计划限制来路由第三方应用使用。
- 实时 CLI 后端冒烟测试现在对 Claude 和 Gemini 执行相同的端到端流程：文本轮次、图像分类轮次，然后是通过 gateway CLI 验证的 MCP CLI`cron`CLI 工具调用。
- Claude 的默认 smoke 还将会话从 Sonnet 修补为 Opus，并验证恢复的会话仍然记得之前的备注。

## Live: APNs HTTP/2 代理可达性

- 测试：`src/infra/push-apns-http2.live.test.ts`
- 目标：通过本地 HTTP CONNECT 代理隧道连接到 Apple 的沙盒 APNs 端点，发送 APNs HTTP/2 验证请求，并断言 Apple 的真实 `403 InvalidProviderToken` 响应通过代理路径返回。
- 启用：
  - `OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_APNS_REACHABILITY=1 pnpm test:live src/infra/push-apns-http2.live.test.ts`
- 可选超时：
  - `OPENCLAW_LIVE_APNS_TIMEOUT_MS=30000`

## 实时：ACP 绑定冒烟测试 (`/acp spawn ... --bind here`)

- 测试：`src/gateway/gateway-acp-bind.live.test.ts`
- 目标：使用 live ACP agent 验证真实的 ACP conversation-bind 流程：
  - 发送 `/acp spawn <agent> --bind here`
  - 绑定一个合成的消息渠道会话
  - 在该同一会话上发送正常的后续消息
  - 验证后续消息已到达绑定的 ACP 会话记录中
- 启用：
  - `pnpm test:live src/gateway/gateway-acp-bind.live.test.ts`
  - `OPENCLAW_LIVE_ACP_BIND=1`
- 默认值：
  - Docker 中的 ACP 代理：Docker`claude,codex,gemini`
  - 用于直接 `pnpm test:live ...` 的 ACP 代理：`claude`
  - 合成渠道：Slack 私信风格的对话上下文
  - ACP 后端：`acpx`
- 覆盖：
  - `OPENCLAW_LIVE_ACP_BIND_AGENT=claude`
  - `OPENCLAW_LIVE_ACP_BIND_AGENT=codex`
  - `OPENCLAW_LIVE_ACP_BIND_AGENT=droid`
  - `OPENCLAW_LIVE_ACP_BIND_AGENT=gemini`
  - `OPENCLAW_LIVE_ACP_BIND_AGENT=opencode`
  - `OPENCLAW_LIVE_ACP_BIND_AGENTS=claude,codex,gemini`
  - `OPENCLAW_LIVE_ACP_BIND_AGENT_COMMAND='npx -y @agentclientprotocol/claude-agent-acp@<version>'`
  - `OPENCLAW_LIVE_ACP_BIND_CODEX_MODEL=gpt-5.5`
  - `OPENCLAW_LIVE_ACP_BIND_OPENCODE_MODEL=opencode/kimi-k2.6`
  - `OPENCLAW_LIVE_ACP_BIND_REQUIRE_TRANSCRIPT=1`
  - `OPENCLAW_LIVE_ACP_BIND_REQUIRE_CRON=1`
  - `OPENCLAW_LIVE_ACP_BIND_PARENT_MODEL=openai/gpt-5.5`
- 说明：
  - 此通道使用网关 `chat.send` 接口以及仅限管理员使用的合成发起路由字段，以便测试可以在无需假装外部投递的情况下附加消息渠道上下文。
  - 当未设置 `OPENCLAW_LIVE_ACP_BIND_AGENT_COMMAND` 时，测试将使用嵌入式 `acpx` 插件的内置代理注册表来获取所选的 ACP 测试工具代理。
  - 默认情况下，绑定会话 cron MCP 创建是尽力而为的，因为外部 ACP 测试工具可以在绑定/图像证明通过后取消 MCP 调用；设置 `OPENCLAW_LIVE_ACP_BIND_REQUIRE_CRON=1` 以使绑定后的 cron 探测变得严格。

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
pnpm test:docker:live-acp-bind:droid
pnpm test:docker:live-acp-bind:gemini
pnpm test:docker:live-acp-bind:opencode
```

Docker 说明：

- Docker 运行器位于 Docker`scripts/test-live-acp-bind-docker.sh`。
- 默认情况下，它会按顺序针对聚合的实时 CLI 代理运行 ACP 绑定冒烟测试：CLI`claude`、`codex`，然后是 `gemini`。
- 使用 `OPENCLAW_LIVE_ACP_BIND_AGENTS=claude`、`OPENCLAW_LIVE_ACP_BIND_AGENTS=codex`、`OPENCLAW_LIVE_ACP_BIND_AGENTS=droid`、`OPENCLAW_LIVE_ACP_BIND_AGENTS=gemini` 或 `OPENCLAW_LIVE_ACP_BIND_AGENTS=opencode` 来缩小矩阵范围。
- 它将匹配的 CLI 认证材料暂存到容器中，然后安装请求的实时 CLI（CLICLI`@anthropic-ai/claude-code`、`@openai/codex`、通过 `https://app.factory.ai/cli` 的 Factory Droid、`@google/gemini-cli` 或 `opencode-ai`）（如果缺失）。ACP 后端本身是官方 `acpx` 插件中嵌入的 `acpx/runtime` 包。
- Droid Docker 变体为设置暂存 `~/.factory`，转发 `FACTORY_API_KEY`，并且需要该 API 密钥，因为本地 Factory OAuth/keyring 身份验证无法移植到容器中。它使用 ACPX 的内置 `droid exec --output-format acp` 注册表项。
- OpenCode Docker 变体是一个严格的单代理回归通道。它从 `OPENCLAW_LIVE_ACP_BIND_OPENCODE_MODEL`（默认 `opencode/kimi-k2.6`）写入一个临时的 `OPENCODE_CONFIG_CONTENT` 默认模型，并且 `pnpm test:docker:live-acp-bind:opencode` 需要一个绑定的助手脚本，而不是接受通用的绑定后跳过。
- 直接 `acpx` CLI 调用仅是在 Gateway(网关) 外部比较行为的手动/变通方法。Docker ACP 绑定冒烟测试演练了 OpenClaw 的嵌入式 `acpx` 运行时后端。

## Live: Codex app-server harness smoke

- 目标：通过正常的网关 `agent` 方法验证插件拥有的 Codex 约束：
  - 加载捆绑的 `codex` 插件
  - 选择 `openai/gpt-5.5`，默认情况下通过 Codex 路由 OpenAI 代理轮次
  - 向 `openai/gpt-5.5` 发送第一个网关代理轮次，并选中 Codex 约束
  - 向同一个 OpenClaw 会话发送第二个轮次，并验证应用服务器
    线程可以恢复
  - 通过相同的网关命令路径运行 `/codex status` 和 `/codex models`
  - （可选）运行两个经 Guardian 审查的升级 Shell 探测：一个应被批准的良性命令和一个应被拒绝的虚假密钥上传，以便代理进行回询
- 测试：`src/gateway/gateway-codex-harness.live.test.ts`
- 启用：`OPENCLAW_LIVE_CODEX_HARNESS=1`
- 默认模型：`openai/gpt-5.5`
- 可选图像探针：`OPENCLAW_LIVE_CODEX_HARNESS_IMAGE_PROBE=1`
- 可选 MCP/工具探针：`OPENCLAW_LIVE_CODEX_HARNESS_MCP_PROBE=1`
- 可选 Guardian 探针：`OPENCLAW_LIVE_CODEX_HARNESS_GUARDIAN_PROBE=1`
- 该冒烟测试强制指定提供商/模型 `agentRuntime.id: "codex"`，因此损坏的 Codex 约束无法通过静默回退到 PI 来通过测试。
- Auth: Codex app-server auth from the local Codex subscription login. Docker
  smokes can also provide Docker`OPENAI_API_KEY` for non-Codex probes when applicable,
  plus optional copied `~/.codex/auth.json` and `~/.codex/config.toml`.

本地配方：

```bash
OPENCLAW_LIVE_CODEX_HARNESS=1 \
  OPENCLAW_LIVE_CODEX_HARNESS_IMAGE_PROBE=1 \
  OPENCLAW_LIVE_CODEX_HARNESS_MCP_PROBE=1 \
  OPENCLAW_LIVE_CODEX_HARNESS_GUARDIAN_PROBE=1 \
  OPENCLAW_LIVE_CODEX_HARNESS_MODEL=openai/gpt-5.5 \
  pnpm test:live -- src/gateway/gateway-codex-harness.live.test.ts
```

Docker 配方：

```bash
pnpm test:docker:live-codex-harness
```

Docker 说明：

- The Docker runner lives at Docker`scripts/test-live-codex-harness-docker.sh`.
- It passes `OPENAI_API_KEY`CLI, copies Codex CLI auth files when present, installs
  `@openai/codex`npm into a writable mounted npm
  prefix, stages the source tree, then runs only the Codex-harness live test.
- Docker enables the image, MCP/工具, and Guardian probes by default. Set
  Docker`OPENCLAW_LIVE_CODEX_HARNESS_IMAGE_PROBE=0` or
  `OPENCLAW_LIVE_CODEX_HARNESS_MCP_PROBE=0` or
  `OPENCLAW_LIVE_CODEX_HARNESS_GUARDIAN_PROBE=0` when you need a narrower debug
  run.
- Docker 使用相同的显式 Codex 运行时配置，因此遗留别名或 PI 回退无法掩盖 Codex 线程的回归。

### 推荐的实时配方

窄范围、显式的允许列表速度最快且最稳定：

- 单模型，直接（无网关）：
  - `OPENCLAW_LIVE_MODELS="openai/gpt-5.5" pnpm test:live src/agents/models.profiles.live.test.ts`

- 单模型，网关冒烟测试：
  - `OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.5" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

- 跨多个提供商的工具调用：
  - `OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.5,openai-codex/gpt-5.5,anthropic/claude-opus-4-6,google/gemini-3-flash-preview,deepseek/deepseek-v4-flash,zai/glm-5.1,minimax/MiniMax-M2.7" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

- Google 重点关注（Gemini API 密钥 + Antigravity）：
  - Gemini (API key): API`OPENCLAW_LIVE_GATEWAY_MODELS="google/gemini-3-flash-preview" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`
  - Antigravity (OAuth): OAuth`OPENCLAW_LIVE_GATEWAY_MODELS="google-antigravity/claude-opus-4-6-thinking,google-antigravity/gemini-3-pro-high" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

- Google 自适应思考冒烟测试：
  - Gemini 3 dynamic default: `pnpm openclaw qa manual --provider-mode live-frontier --model google/gemini-3.1-pro-preview --alt-model google/gemini-3.1-pro-preview --message '/think adaptive Reply exactly: GEMINI_ADAPTIVE_OK' --timeout-ms 180000`
  - Gemini 2.5 dynamic budget: `pnpm openclaw qa manual --provider-mode live-frontier --model google/gemini-2.5-flash --alt-model google/gemini-2.5-flash --message '/think adaptive Reply exactly: GEMINI25_ADAPTIVE_OK' --timeout-ms 180000`

Notes:

- `google/...`APIAPI uses the Gemini API (API key).
- `google-antigravity/...`OAuth uses the Antigravity OAuth bridge (Cloud Code Assist-style agent endpoint).
- `google-gemini-cli/...`CLI uses the local Gemini CLI on your machine (separate auth + tooling quirks).
- Gemini API vs Gemini CLI:
  - API: OpenClaw calls Google's hosted Gemini API over HTTP (API key / profile auth); this is what most users mean by "Gemini".
  - CLI: OpenClaw shells out to a local CLIOpenClaw`gemini` binary; it has its own auth and can behave differently (streaming/工具 support/version skew).

## Live: 模型矩阵 (我们涵盖的内容)

没有固定的“CI 模型列表”（实时测试是可选加入的），但这些是建议在带有密钥的开发机上定期覆盖的推荐模型。

### 现代冒烟测试集（工具调用 + 图像）

这是我们要保持正常工作的“通用模型”运行：

- OpenAI (非 Codex): OpenAI`openai/gpt-5.5`
- OpenAI Codex OAuth: OpenAIOAuth`openai-codex/gpt-5.5`
- Anthropic: Anthropic`anthropic/claude-opus-4-6` (或 `anthropic/claude-sonnet-4-6`)
- Google (Gemini API): API`google/gemini-3.1-pro-preview` 和 `google/gemini-3-flash-preview` (避免使用较旧的 Gemini 2.x 模型)
- Google (Antigravity): `google-antigravity/claude-opus-4-6-thinking` 和 `google-antigravity/gemini-3-flash`
- DeepSeek: `deepseek/deepseek-v4-flash` 和 `deepseek/deepseek-v4-pro`
- Z.AI (GLM): GLM`zai/glm-5.1`
- MiniMax: MiniMax`minimax/MiniMax-M2.7`

运行包含工具和图像的网关冒烟测试：
`OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.5,openai-codex/gpt-5.5,anthropic/claude-opus-4-6,google/gemini-3.1-pro-preview,google/gemini-3-flash-preview,google-antigravity/claude-opus-4-6-thinking,google-antigravity/gemini-3-flash,deepseek/deepseek-v4-flash,zai/glm-5.1,minimax/MiniMax-M2.7" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

### 基线：工具调用（读取 + 可选执行）

每个提供商系列至少选择一个：

- OpenAI: OpenAI`openai/gpt-5.5`
- Anthropic: Anthropic`anthropic/claude-opus-4-6` (或 `anthropic/claude-sonnet-4-6`)
- Google: `google/gemini-3-flash-preview` (或 `google/gemini-3.1-pro-preview`)
- DeepSeek: `deepseek/deepseek-v4-flash`
- Z.AI (GLM): GLM`zai/glm-5.1`
- MiniMax: MiniMax`minimax/MiniMax-M2.7`

可选的额外覆盖（最好有）：

- xAI: `xai/grok-4.3` (或最新的可用版本)
- Mistral: `mistral/`… (选择一个你已启用的具备“工具”能力的模型)
- Cerebras: `cerebras/`… (如果你有访问权限)
- LM Studio: `lmstudio/`API… (本地；工具调用取决于 API 模式)

### 视觉：图像发送（附件 → 多模态消息）

在 `OPENCLAW_LIVE_GATEWAY_MODELS`OpenAI 中至少包含一个具备图像处理能力的模型（Claude/Gemini/OpenAI 具备视觉能力的变体等），以测试图像探测功能。

### 聚合器 / 备选网关

如果您启用了密钥，我们还支持通过以下方式进行测试：

- OpenRouter：OpenRouter`openrouter/...`（数百个模型；使用 `openclaw models scan` 查找具备工具和图像功能的候选项）
- OpenCode：`opencode/...` 用于 Zen，`opencode-go/...` 用于 Go（通过 `OPENCODE_API_KEY` / `OPENCODE_ZEN_API_KEY` 进行身份验证）

您可以包含在实时矩阵中的更多提供商（如果您有凭据/配置）：

- 内置：`openai`、`openai-codex`、`anthropic`、`google`、`google-vertex`、`google-antigravity`、`google-gemini-cli`、`zai`、`openrouter`、`opencode`、`opencode-go`、`xai`、`groq`、`cerebras`、`mistral`、`github-copilot`
- 通过 `models.providers`（自定义端点）：`minimax`APIOpenAIAnthropic（云端/API），以及任何兼容 OpenAI/Anthropic 的代理（LM Studio、vLLM、LiteLLM 等）

<Tip>不要在文档中硬编码“所有模型”。权威列表取决于 `discoverModels(...)` 在您的机器上返回的内容以及可用的密钥。</Tip>

## 凭据（切勿提交）

实时测试发现凭据的方式与 CLI 相同。实际影响如下：

- 如果 CLI 正常工作，实时测试应该能找到相同的密钥。
- 如果实时测试提示“无凭据”，请按照调试 `openclaw models list` / 模型选择的相同方式进行调试。

- 每代理身份验证配置文件：`~/.openclaw/agents/<agentId>/agent/auth-profiles.json`（这就是实时测试中“配置文件密钥”的含义）
- 配置：`~/.openclaw/openclaw.json`（或 `OPENCLAW_CONFIG_PATH`）
- 旧版状态目录：`~/.openclaw/credentials/`（如果存在，会复制到暂存的实时主目录中，但不是主要的配置文件密钥存储）
- 实时本地运行默认会将活动配置、每个代理的 `auth-profiles.json` 文件、旧的 `credentials/`CLI 以及支持的外部 CLI 认证目录复制到临时测试主目录中；暂存实时主目录会跳过 `workspace/` 和 `sandboxes/`，并且 `agents.*.workspace` / `agentDir` 路径覆盖项会被剥离，以便探测程序不会干扰您真实的主机工作区。

如果您希望依赖环境变量密钥，请在本地测试之前导出它们，或使用下方带有明确 Docker`OPENCLAW_PROFILE_FILE` 的 Docker 运行程序。

## Deepgram 实时（音频转录）

- 测试：`extensions/deepgram/audio.live.test.ts`
- 启用：`DEEPGRAM_API_KEY=... DEEPGRAM_LIVE_TEST=1 pnpm test:live extensions/deepgram/audio.live.test.ts`

## BytePlus 编码计划实时

- 测试：`extensions/byteplus/live.test.ts`
- 启用：`BYTEPLUS_API_KEY=... BYTEPLUS_LIVE_TEST=1 pnpm test:live extensions/byteplus/live.test.ts`
- 可选模型覆盖：`BYTEPLUS_CODING_MODEL=ark-code-latest`

## ComfyUI 工作流媒体实时

- 测试：`extensions/comfy/comfy.live.test.ts`
- 启用：`OPENCLAW_LIVE_TEST=1 COMFY_LIVE_TEST=1 pnpm test:live -- extensions/comfy/comfy.live.test.ts`
- 范围：
  - 执行捆绑的 comfy 图像、视频和 `music_generate` 路径
  - 除非配置了 `plugins.entries.comfy.config.<capability>`，否则跳过每项功能
  - 在更改 comfy 工作流提交、轮询、下载或插件注册后很有用

## 图像生成实时

- 测试：`test/image-generation.runtime.live.test.ts`
- 命令：`pnpm test:live test/image-generation.runtime.live.test.ts`
- 测试工具：`pnpm test:live:media image`
- 范围：
  - 枚举每个已注册的图像生成提供商插件
  - 在探测之前使用已导出的提供商环境变量
  - 默认优先使用实时/环境 API 密钥而非存储的认证配置文件，因此 API`auth-profiles.json` 中的过时测试密钥不会掩盖真实的 Shell 凭证
  - 跳过没有可用认证/配置文件/模型的提供商
  - 通过共享的图像生成运行时运行每个配置的提供商：
    - `<provider>:generate`
    - 当提供商声明支持编辑时 `<provider>:edit`
- 涵盖的当前捆绑提供商：
  - `deepinfra`
  - `fal`
  - `google`
  - `minimax`
  - `openai`
  - `openrouter`
  - `vydra`
  - `xai`
- 可选筛选：
  - `OPENCLAW_LIVE_IMAGE_GENERATION_PROVIDERS="openai,google,openrouter,xai"`
  - `OPENCLAW_LIVE_IMAGE_GENERATION_PROVIDERS="deepinfra"`
  - `OPENCLAW_LIVE_IMAGE_GENERATION_MODELS="openai/gpt-image-2,google/gemini-3.1-flash-image-preview,openrouter/google/gemini-3.1-flash-image-preview,xai/grok-imagine-image"`
  - `OPENCLAW_LIVE_IMAGE_GENERATION_CASES="google:flash-generate,google:pro-edit,openrouter:generate,xai:default-generate,xai:default-edit"`
- 可选身份验证行为：
  - `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` 用于强制进行配置文件存储身份验证并忽略仅环境变量覆盖

对于已发布的 CLI 路径，在提供商/运行时实时测试通过后添加 `infer` 烟雾测试：

```bash
OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_INFER_CLI_TEST=1 pnpm test:live -- test/image-generation.infer-cli.live.test.ts
openclaw infer image providers --json
openclaw infer image generate \
  --model google/gemini-3.1-flash-image-preview \
  --prompt "Minimal flat test image: one blue square on a white background, no text." \
  --output ./openclaw-infer-image-smoke.png \
  --json
```

这涵盖了 CLI 参数解析、配置/默认代理解析、捆绑插件激活、共享图像生成运行时以及实时提供商请求。插件依赖项需要在运行时加载之前就绪。

## 音乐生成实时测试

- 测试：`extensions/music-generation-providers.live.test.ts`
- 启用：`OPENCLAW_LIVE_TEST=1 pnpm test:live -- extensions/music-generation-providers.live.test.ts`
- 测试工具：`pnpm test:live:media music`
- 范围：
  - 演练共享捆绑音乐生成提供商路径
  - 目前涵盖 Google 和 MiniMax
  - 探测前使用已导出的提供商环境变量
  - 默认优先使用实时/环境 API 密钥而非存储的身份验证配置文件，因此 `auth-profiles.json` 中的陈旧测试密钥不会掩盖真实的 Shell 凭据
  - 跳过没有可用身份验证/配置文件/模型的提供商
  - 如果可用，运行两种声明的运行时模式：
    - `generate` 配合仅提示词输入
    - 当提供商声明 `capabilities.edit.enabled` 时运行 `edit`
  - 当前共享通道覆盖范围：
    - `google`：`generate`、`edit`
    - `minimax`：`generate`
    - `comfy`：独立的 Comfy 实时文件，而非此共享扫描
- 可选筛选：
  - `OPENCLAW_LIVE_MUSIC_GENERATION_PROVIDERS="google,minimax"`
  - `OPENCLAW_LIVE_MUSIC_GENERATION_MODELS="google/lyria-3-clip-preview,minimax/music-2.6"`
- 可选身份验证行为：
  - `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` 用于强制进行配置文件存储身份验证并忽略仅环境变量覆盖

## 视频生成实时测试

- 测试：`extensions/video-generation-providers.live.test.ts`
- 启用：`OPENCLAW_LIVE_TEST=1 pnpm test:live -- extensions/video-generation-providers.live.test.ts`
- 测试工具：`pnpm test:live:media video`
- 范围：
  - 演练共享的捆绑式视频生成提供商路径
  - 默认为发布安全的冒烟路径：非 FAL 提供商，每个提供商一个文本生成视频请求，一秒龙虾提示，以及来自 `OPENCLAW_LIVE_VIDEO_GENERATION_TIMEOUT_MS` 的每个提供商操作上限（默认为 `180000`）
  - 默认跳过 FAL，因为提供商端的队列延迟可能会主导发布时间；传递 `--video-providers fal` 或 `OPENCLAW_LIVE_VIDEO_GENERATION_PROVIDERS="fal"` 以显式运行它
  - 在探测之前使用已导出的提供商环境变量
  - 默认优先使用实时/环境 API 密钥而不是存储的身份验证配置文件，因此 `auth-profiles.json` 中的陈旧测试密钥不会掩盖真实的 Shell 凭据
  - 跳过没有可用身份验证/配置文件/模型的提供商
  - 默认只运行 `generate`
  - 设置 `OPENCLAW_LIVE_VIDEO_GENERATION_FULL_MODES=1` 以在可用时也运行声明的转换模式：
    - 当提供商声明 `capabilities.imageToVideo.enabled` 并且选定的提供商/模型在共享扫描中接受缓冲区支持的本地图像输入时，运行 `imageToVideo`
    - 当提供商声明 `capabilities.videoToVideo.enabled` 并且选定的提供商/模型在共享扫描中接受缓冲区支持的本地视频输入时，运行 `videoToVideo`
  - 当前在共享扫描中已声明但跳过的 `imageToVideo` 提供商：
    - `vydra`，因为捆绑的 `veo3` 仅支持文本，而捆绑的 `kling` 需要远程图像 URL
  - 特定于提供商的 Vydra 覆盖范围：
    - `OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_VYDRA_VIDEO=1 pnpm test:live -- extensions/vydra/vydra.live.test.ts`
    - 该文件运行 `veo3` 文本生成视频以及一个 `kling` 通道，该通道默认使用远程图像 URL 固件
  - 当前 `videoToVideo` 实时覆盖范围：
    - 仅当所选模型为 `runway/gen4_aleph` 时才运行 `runway`
  - 当前在共享扫描中已声明但跳过的 `videoToVideo` 提供商：
    - `alibaba`、`qwen`、`xai`，因为这些路径当前需要远程 `http(s)` / MP4 参考 URL
    - `google` 因为当前共享的 Gemini/Veo 通道使用本地缓冲区支持的输入，而该路径在共享扫描中不被接受
    - `openai`，因为当前的共享通道缺少组织特定的视频编辑访问权限保证
- 可选缩小范围：
  - `OPENCLAW_LIVE_VIDEO_GENERATION_PROVIDERS="deepinfra,google,openai,runway"`
  - `OPENCLAW_LIVE_VIDEO_GENERATION_MODELS="google/veo-3.1-fast-generate-preview,openai/sora-2,runway/gen4_aleph"`
  - `OPENCLAW_LIVE_VIDEO_GENERATION_SKIP_PROVIDERS=""` 以在默认扫描中包含每个提供商，包括 FAL
  - `OPENCLAW_LIVE_VIDEO_GENERATION_TIMEOUT_MS=60000` 以减少每个提供商的操作上限，从而进行激进的冒烟测试运行
- 可选身份验证行为：
  - `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` 以强制配置文件存储身份验证并忽略仅环境变量的覆盖设置

## 媒体实时测试框架

- 命令：`pnpm test:live:media`
- 用途：
  - 通过一个仓库原生入口运行共享的图像、音乐和视频实时测试套件
  - 使用已导出的提供商环境变量
  - 默认将每个套件自动缩小至当前拥有可用身份验证的提供商
  - 复用 `scripts/test-live.mjs`，因此心跳和静默模式行为保持一致
- 示例：
  - `pnpm test:live:media`
  - `pnpm test:live:media image video --providers openai,google,minimax`
  - `pnpm test:live:media video --video-providers openai,runway --all-providers`
  - `pnpm test:live:media music --quiet`

## 相关内容

- [Testing](/zh/help/testingDocker) - 单元测试、集成测试、QA 和 Docker 套件
