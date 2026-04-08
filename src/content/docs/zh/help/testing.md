---
summary: "测试工具包：单元/e2e/live 套件、Docker 运行器以及每个测试涵盖的内容"
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
- 在配置较高的机器上更快地运行本地完整套件：`pnpm test:max`
- 直接 Vitest 监视循环（现代项目配置）：`pnpm test:watch`
- 直接的文件定位现在也路由扩展/渠道路径：`pnpm test extensions/discord/src/monitor/message-handler.preflight.test.ts`

当您接触测试或需要额外的信心时：

- 覆盖率门控：`pnpm test:coverage`
- E2E 套件：`pnpm test:e2e`

调试真实提供商/模型时（需要真实凭证）：

- Live 套件（模型 + 网关工具/图像探测）：`pnpm test:live`
- 安静地定位一个 live 文件：`pnpm test:live -- src/agents/models.profiles.live.test.ts`

提示：当您只需要一个失败的用例时，建议通过下面描述的允许列表环境变量来缩小 live 测试范围。

## 测试套件（在哪里运行什么）

可以将这些套件视为“真实性递增”（以及不稳定性和成本递增）：

### 单元 / 集成（默认）

- 命令：`pnpm test`
- 配置：通过 `vitest.config.ts` 原生 Vitest `projects`
- 文件：`src/**/*.test.ts`、`packages/**/*.test.ts`、`test/**/*.test.ts` 下的核心/单元清单，以及由 `vitest.unit.config.ts` 覆盖的白名单 `ui` 节点测试
- 范围：
  - 纯单元测试
  - 进程内集成测试（网关身份验证、路由、工具、解析、配置）
  - 已知错误的确定性回归测试
- 预期：
  - 在 CI 中运行
  - 不需要真实的密钥
  - 应该快速且稳定
- 项目说明：
  - `pnpm test`、`pnpm test:watch` 和 `pnpm test:changed` 现在都使用相同的原生 Vitest 根 `projects` 配置。
  - 直接文件过滤器通过根项目图本机路由，因此 `pnpm test extensions/discord/src/monitor/message-handler.preflight.test.ts` 无需自定义包装器即可工作。
- 嵌入式运行器说明：
  - 当您更改消息工具发现输入或压缩运行时上下文时，
    请保持两个级别的覆盖率。
  - 为纯路由/规范化边界添加针对性的辅助回归测试。
  - 同时保持嵌入式运行器集成套件的健康发展：
    `src/agents/pi-embedded-runner/compact.hooks.test.ts`、
    `src/agents/pi-embedded-runner/run.overflow-compaction.test.ts` 和
    `src/agents/pi-embedded-runner/run.overflow-compaction.loop.test.ts`。
  - 这些套件验证了作用域 ID 和压缩行为是否仍然通过真正的 `run.ts` / `compact.ts` 路径；仅测试辅助程序不足以替代这些集成路径。
- Pool 说明：
  - 基础 Vitest 配置现在默认为 `threads`。
  - 共享的 Vitest 配置也修复了 `isolate: false`，并在根项目、e2e 和 live 配置中使用了非隔离运行器。
  - 根 UI 车道保留了其 `jsdom` 设置和优化器，但现在也在共享的非隔离运行器上运行。
  - `pnpm test` 从根 `vitest.config.ts` 项目配置继承了相同的 `threads` + `isolate: false` 默认值。
  - 共享的 `scripts/run-vitest.mjs` 启动器现在默认也为 Vitest 子 Node 进程添加 `--no-maglev`，以减少大型本地运行期间的 V8 编译波动。如果需要对比标准 V8 行为，请设置 `OPENCLAW_VITEST_ENABLE_MAGLEV=1`。
- 快速本地迭代说明：
  - `pnpm test:changed` 使用 `--changed origin/main` 运行本地项目配置。
  - `pnpm test:max` 和 `pnpm test:changed:max` 保持相同的本地项目配置，只是具有更高的 worker 上限。
  - 本地 worker 自动伸缩现在被故意设置得比较保守，并且在主机负载平均值已经很高时也会退缩，因此默认情况下，多个并发 Vitest 运行造成的损害较小。
  - 基础 Vitest 配置将项目/配置文件标记为 `forceRerunTriggers`，以便在测试连接发生变化时，更改模式的重运行保持正确。
  - 配置在受支持的主机上保持 `OPENCLAW_VITEST_FS_MODULE_CACHE` 启用；如果需要直接分析使用一个明确的缓存位置，请设置 `OPENCLAW_VITEST_FS_MODULE_CACHE_PATH=/abs/path`。
- 性能调试说明：
  - `pnpm test:perf:imports` 启用 Vitest 导入持续时间报告以及导入细分输出。
  - `pnpm test:perf:imports:changed` 将相同的分析范围限定在自 `origin/main` 以来更改的文件。
  - `pnpm test:perf:profile:main` 为 Vitest/Vite 启动和转换开销写入主线程 CPU 分析文件。
  - `pnpm test:perf:profile:runner` 为禁用文件并行处理的单元测试套件写入运行器 CPU+堆分析文件。

### E2E (gateway smoke)

- 命令： `pnpm test:e2e`
- 配置： `vitest.e2e.config.ts`
- 文件： `src/**/*.e2e.test.ts`, `test/**/*.e2e.test.ts`
- 运行时默认值：
  - 使用带有 `isolate: false` 的 Vitest `threads`，与仓库其余部分匹配。
  - 使用自适应工作线程（CI：最多 2 个，本地：默认 1 个）。
  - 默认以静默模式运行以减少控制台 I/O 开销。
- 有用的覆盖选项：
  - `OPENCLAW_E2E_WORKERS=<n>` 强制工作线程数量（上限为 16）。
  - `OPENCLAW_E2E_VERBOSE=1` 重新启用详细控制台输出。
- 范围：
  - 多实例网关端到端行为
  - WebSocket/HTTP 表面、节点配对和繁重的网络操作
- 预期：
  - 在 CI 中运行（在管道中启用时）
  - 不需要真实密钥
  - 比单元测试有更多移动部件（可能会更慢）

### E2E: OpenShell backend smoke

- 命令： `pnpm test:e2e:openshell`
- 文件： `test/openshell-sandbox.e2e.test.ts`
- 范围：
  - 通过 Docker 在主机上启动隔离的 OpenShell 网关
  - 从临时本地 Dockerfile 创建沙箱
  - 通过真实的 `sandbox ssh-config` + SSH 执行测试 OpenClaw 的 OpenShell 后端
  - 通过沙箱 fs 桥验证远程规范化文件系统行为
- 预期：
  - 仅限选择性加入；不是默认 `pnpm test:e2e` 运行的一部分
  - 需要本地 `openshell` CLI 以及可用的 Docker 守护进程
  - 使用隔离的 `HOME` / `XDG_CONFIG_HOME`，然后销毁测试网关和沙箱
- 有用的覆盖选项：
  - `OPENCLAW_E2E_OPENSHELL=1` 在手动运行更广泛的 e2e 套件时启用测试
  - `OPENCLAW_E2E_OPENSHELL_COMMAND=/path/to/openshell` 指向非默认 CLI 二进制文件或包装脚本

### Live (real providers + real models)

- 命令： `pnpm test:live`
- 配置： `vitest.live.config.ts`
- 文件：`src/**/*.live.test.ts`
- 默认：通过 `pnpm test:live` **启用**（设置 `OPENCLAW_LIVE_TEST=1`）
- 范围：
  - “这个提供商/模型在*今天*使用真实凭据真的能工作吗？”
  - 发现提供商格式变更、工具调用怪癖、身份验证问题以及速率限制行为
- 预期：
  - 设计上并非 CI 稳定的（真实网络、真实提供商策略、配额、中断）
  - 花费金钱 / 使用速率限制
  - 优先运行缩小的子集，而不是“所有内容”
- Live 运行源 `~/.profile` 以获取缺失的 API 密钥。
- 默认情况下，live 运行仍然隔离 `HOME` 并将配置/身份验证材料复制到临时的测试主目录中，以便单元装置不会修改您真实的 `~/.openclaw`。
- 仅当您有意需要 live 测试使用您真实的主目录时，才设置 `OPENCLAW_LIVE_USE_REAL_HOME=1`。
- `pnpm test:live` 现在默认为更安静的模式：它保留 `[live] ...` 进度输出，但抑制额外的 `~/.profile` 通知并使网引导日志/Bonjour 闲聊静音。如果您想要完整的启动日志，请设置 `OPENCLAW_LIVE_TEST_QUIET=0`。
- API 密钥轮换（特定于提供商）：使用逗号/分号格式设置 `*_API_KEYS` 或 `*_API_KEY_1`、`*_API_KEY_2`（例如 `OPENAI_API_KEYS`、`ANTHROPIC_API_KEYS`、`GEMINI_API_KEYS`）或通过 `OPENCLAW_LIVE_*_KEY` 进行每次 live 覆盖；测试在收到速率限制响应时重试。
- 进度/心跳输出：
  - Live 套件现在向 stderr 输出进度行，以便即使 Vitest 控制台捕获处于安静状态，长时间的提供商调用也能显示为活动状态。
  - `vitest.live.config.ts` 禁用 Vitest 控制台拦截，以便提供商/网关进度行在 live 运行期间立即流式传输。
  - 使用 `OPENCLAW_LIVE_HEARTBEAT_MS` 调整直接模型的心跳。
  - 使用 `OPENCLAW_LIVE_GATEWAY_HEARTBEAT_MS` 调整网关/探测的心跳。

## 我应该运行哪个套件？

使用此决策表：

- 编辑逻辑/测试：运行 `pnpm test`（如果您进行了大量更改，还请运行 `pnpm test:coverage`）
- 涉及 Gateway(网关) 网络 / WS 协议 / 配对：添加 `pnpm test:e2e`
- 调试“我的机器人挂了” / 提供商特定的故障 / 工具调用：运行一个缩小范围的 `pnpm test:live`

## Live: Android 节点功能扫描

- 测试：`src/gateway/android-node.capabilities.live.test.ts`
- 脚本：`pnpm android:test:integration`
- 目标：调用已连接的 Android 节点当前通告的**所有命令**，并断言命令契约行为。
- 范围：
  - 预置/手动设置（该套件不安装/运行/配对应用）。
  - 针对所选 Android 节点进行逐条命令的 Gateway(网关) `node.invoke` 验证。
- 必需的预设置：
  - Android 应用已连接并与 Gateway(网关)配对。
  - 应用保持在前台。
  - 已为您期望通过的功能授予权限/捕获同意。
- 可选目标覆盖：
  - `OPENCLAW_ANDROID_NODE_ID` 或 `OPENCLAW_ANDROID_NODE_NAME`。
  - `OPENCLAW_ANDROID_GATEWAY_URL` / `OPENCLAW_ANDROID_GATEWAY_TOKEN` / `OPENCLAW_ANDROID_GATEWAY_PASSWORD`。
- 完整的 Android 设置详情：[Android App](/en/platforms/android)

## Live: 模型冒烟测试（配置文件密钥）

Live 测试分为两层，以便我们隔离故障：

- “直接模型”告诉我们提供商/模型是否可以使用给定密钥进行回答。
- “Gateway(网关) 冒烟”告诉我们完整的 Gateway(网关)+agent 通道是否适用于该模型（会话、历史记录、工具、沙箱策略等）。

### 第 1 层：直接模型补全（无 Gateway(网关)）

- 测试：`src/agents/models.profiles.live.test.ts`
- 目标：
  - 枚举已发现的模型
  - 使用 `getApiKeyForModel` 选择您拥有凭证的模型
  - 为每个模型运行一个小补全（并在需要时进行针对性回归测试）
- 如何启用：
  - `pnpm test:live` （如果直接调用 Vitest，则使用 `OPENCLAW_LIVE_TEST=1`）
- 设置 `OPENCLAW_LIVE_MODELS=modern` （或 `all`，modern 的别名）以实际运行此套件；否则它将跳过，以保持 `pnpm test:live` 专注于 Gateway(网关) 冒烟测试
- 如何选择模型：
  - `OPENCLAW_LIVE_MODELS=modern` 运行现代允许列表（Opus/Sonnet 4.6+, GPT-5.x + Codex, Gemini 3, GLM 4.7, MiniMax M2.7, Grok 4）
  - `OPENCLAW_LIVE_MODELS=all` 是现代允许列表的别名
  - 或 `OPENCLAW_LIVE_MODELS="openai/gpt-5.4,anthropic/claude-opus-4-6,..."`（逗号分隔允许列表）
- 如何选择提供商：
  - `OPENCLAW_LIVE_PROVIDERS="google,google-antigravity"`（逗号分隔允许列表）
- 密钥来源：
  - 默认：配置文件存储和环境变量后备
  - 设置 `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` 以强制仅使用 **配置文件存储**
- 存在原因：
  - 将“提供商 API 已损坏 / 密钥无效”与“网关代理管道已损坏”区分开来
  - 包含小型、孤立的回归测试（例如：OpenAI Responses/Codex Responses 推理重放 + 工具调用流程）

### 第 2 层：Gateway(网关) + 开发代理冒烟测试（“@openclaw”实际执行的操作）

- 测试：`src/gateway/gateway-models.profiles.live.test.ts`
- 目标：
  - 启动进程内网关
  - 创建/修补 `agent:dev:*` 会话（每次运行覆盖模型）
  - 迭代带密钥的模型并断言：
    - “有意义”的响应（无工具）
    - 真实的工具调用有效（读取探测）
    - 可选的额外工具探测（执行+读取探测）
    - OpenAI 回归路径（仅工具调用 → 后续跟进）保持正常工作
- 探测详情（以便您快速解释故障原因）：
  - `read` 探测：测试在工作区中写入一个 nonce 文件，并要求代理 `read` 它并回显 nonce。
  - `exec+read` 探测：测试要求代理将 nonce `exec` 写入临时文件，然后 `read` 它回来。
  - 图像探测：测试附加一个生成的 PNG（猫 + 随机代码）并期望模型返回 `cat <CODE>`。
  - 实现参考：`src/gateway/gateway-models.profiles.live.test.ts` 和 `src/gateway/live-image-probe.ts`。
- 如何启用：
  - `pnpm test:live`（如果直接调用 Vitest，则使用 `OPENCLAW_LIVE_TEST=1`）
- 如何选择模型：
  - 默认：现代允许列表（Opus/Sonnet 4.6+, GPT-5.x + Codex, Gemini 3, GLM 4.7, MiniMax M2.7, Grok 4）
  - `OPENCLAW_LIVE_GATEWAY_MODELS=all` 是现代允许列表的别名
  - 或设置 `OPENCLAW_LIVE_GATEWAY_MODELS="provider/model"`（或逗号列表）以缩小范围
- 如何选择提供商（避免“OpenRouter 全包”）：
  - `OPENCLAW_LIVE_GATEWAY_PROVIDERS="google,google-antigravity,openai,anthropic,zai,minimax"`（逗号分隔允许列表）
- 在此实时测试中，工具 + 图像探测始终开启：
  - `read` 探测 + `exec+read` 探测（工具压力测试）
  - 当模型通告支持图像输入时，运行图像探针
  - 流程（高层级）：
    - 测试生成一个带有“CAT”+ 随机代码的微型 PNG (`src/gateway/live-image-probe.ts`)
    - 通过 `agent` `attachments: [{ mimeType: "image/png", content: "<base64>" }]` 发送
    - Gateway(网关) 将附件解析为 `images[]` (`src/gateway/server-methods/agent.ts` + `src/gateway/chat-attachments.ts`)
    - 嵌入式代理将多模态用户消息转发给模型
    - 断言：回复包含 `cat` + 代码（OCR 容差：允许轻微错误）

提示：要查看您可以在机器上测试的内容（以及确切的 `provider/model` ID），请运行：

```bash
openclaw models list
openclaw models list --json
```

## Live: ACP bind smoke (`/acp spawn ... --bind here`)

- 测试： `src/gateway/gateway-acp-bind.live.test.ts`
- 目标：使用真实的 ACP 代理验证真实的 ACP 会话绑定流程：
  - 发送 `/acp spawn <agent> --bind here`
  - 在原地绑定一个合成的消息渠道会话
  - 在同一会话中发送正常的后续消息
  - 验证后续消息出现在已绑定的 ACP 会话记录中
- 启用：
  - `pnpm test:live src/gateway/gateway-acp-bind.live.test.ts`
  - `OPENCLAW_LIVE_ACP_BIND=1`
- 默认值：
  - ACP agent： `claude`
  - 合成渠道： Slack 私信风格的会话上下文
  - ACP backend： `acpx`
- 覆盖：
  - `OPENCLAW_LIVE_ACP_BIND_AGENT=claude`
  - `OPENCLAW_LIVE_ACP_BIND_AGENT=codex`
  - `OPENCLAW_LIVE_ACP_BIND_AGENT_COMMAND='npx -y @agentclientprotocol/claude-agent-acp@<version>'`
- 注意：
  - 此通道使用网关 `chat.send` 表面和仅限管理员的合成起始路由字段，以便测试可以附加消息渠道上下文，而无需假装外部投递。
  - 当 `OPENCLAW_LIVE_ACP_BIND_AGENT_COMMAND` 未设置时，测试使用嵌入式 `acpx` 插件的内置代理注册表来获取所选的 ACP 测试工具代理。

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

Docker 注意事项：

- Docker 运行程序位于 `scripts/test-live-acp-bind-docker.sh`。
- 它源 `~/.profile`，将匹配的 CLI 身份验证材料暂存到容器中，将 `acpx` 安装到可写的 npm 前缀中，然后如果缺少，则安装请求的实时 CLI (`@anthropic-ai/claude-code` 或 `@openai/codex`)。
- 在 Docker 内部，运行器设置 `OPENCLAW_LIVE_ACP_BIND_ACPX_COMMAND=$HOME/.npm-global/bin/acpx`，以便 acpx 将来自源配置文件的提供商环境变量提供给子测试线束 CLI。

### 推荐的实时方案

狭窄、明确的白名单最快且最不稳定：

- 单个模型，直连（无网关）：
  - `OPENCLAW_LIVE_MODELS="openai/gpt-5.4" pnpm test:live src/agents/models.profiles.live.test.ts`

- 单个模型，网关冒烟测试：
  - `OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.4" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

- 跨多个提供商的工具调用：
  - `OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.4,anthropic/claude-opus-4-6,google/gemini-3-flash-preview,zai/glm-4.7,minimax/MiniMax-M2.7" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

- Google 重点（Gemini API 密钥 + Antigravity）：
  - Gemini (API 密钥): `OPENCLAW_LIVE_GATEWAY_MODELS="google/gemini-3-flash-preview" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`
  - Antigravity (OAuth): `OPENCLAW_LIVE_GATEWAY_MODELS="google-antigravity/claude-opus-4-6-thinking,google-antigravity/gemini-3-pro-high" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

备注：

- `google/...` 使用 Gemini API (API 密钥)。
- `google-antigravity/...` 使用 Antigravity OAuth 桥接器（Cloud Code Assist 风格的代理端点）。

## 实时：模型矩阵（我们覆盖的内容）

没有固定的“CI 模型列表”（实时测试是可选加入的），但这些是建议在开发机器上使用密钥定期覆盖的 **推荐** 模型。

### 现代冒烟测试集（工具调用 + 图像）

这是我们期望保持运行的“通用模型”运行：

- OpenAI (非 Codex): `openai/gpt-5.4` (可选: `openai/gpt-5.4-mini`)
- OpenAI Codex: `openai-codex/gpt-5.4`
- Anthropic: `anthropic/claude-opus-4-6` (或 `anthropic/claude-sonnet-4-6`)
- Google (Gemini API): `google/gemini-3.1-pro-preview` 和 `google/gemini-3-flash-preview` (避免使用较旧的 Gemini 2.x 模型)
- Google (Antigravity): `google-antigravity/claude-opus-4-6-thinking` 和 `google-antigravity/gemini-3-flash`
- Z.AI (GLM): `zai/glm-4.7`
- MiniMax: `minimax/MiniMax-M2.7`

运行包含工具和图像的网关冒烟测试：
`OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.4,openai-codex/gpt-5.4,anthropic/claude-opus-4-6,google/gemini-3.1-pro-preview,google/gemini-3-flash-preview,google-antigravity/claude-opus-4-6-thinking,google-antigravity/gemini-3-flash,zai/glm-4.7,minimax/MiniMax-M2.7" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

### 基线：工具调用（读取 + 可选执行）

每个提供商系列至少选择一个：

- OpenAI: `openai/gpt-5.4` (或 `openai/gpt-5.4-mini`)
- Anthropic: `anthropic/claude-opus-4-6` (或 `anthropic/claude-sonnet-4-6`)
- Google: `google/gemini-3-flash-preview` (或 `google/gemini-3.1-pro-preview`)
- Z.AI (GLM): `zai/glm-4.7`
- MiniMax: `minimax/MiniMax-M2.7`

可选的额外覆盖（最好有）：

- xAI: `xai/grok-4` (或最新可用版本)
- Mistral: `mistral/`… (选择一个你启用的支持“工具”的模型)
- Cerebras: `cerebras/`… (如果你有访问权限)
- LM Studio: `lmstudio/`… (本地；工具调用取决于 API 模式)

### 视觉：图片发送（附件 → 多模态消息）

在 `OPENCLAW_LIVE_GATEWAY_MODELS` 中至少包含一个支持图片的模型（Claude/Gemini/OpenAI 支持视觉的变体等），以测试图片探针。

### 聚合器 / 备选网关

如果你启用了密钥，我们还支持通过以下方式进行测试：

- OpenRouter: `openrouter/...` (数百个模型；使用 `openclaw models scan` 查找支持工具和图片的候选模型)
- OpenCode: `opencode/...` 用于 Zen，`opencode-go/...` 用于 Go（通过 `OPENCODE_API_KEY` / `OPENCODE_ZEN_API_KEY` 进行身份验证）

更多你可以包含在实时矩阵中的提供商（如果你有凭据/配置）：

- 内置：`openai`, `openai-codex`, `anthropic`, `google`, `google-vertex`, `google-antigravity`, `zai`, `openrouter`, `opencode`, `opencode-go`, `xai`, `groq`, `cerebras`, `mistral`, `github-copilot`
- 通过 `models.providers`（自定义端点）：`minimax` (云端/API)，以及任何兼容 OpenAI/Anthropic 的代理（LM Studio, vLLM, LiteLLM 等）

提示：不要尝试在文档中硬编码“所有模型”。权威列表取决于 `discoverModels(...)` 在你的机器上返回的内容 + 可用的密钥。

## 凭据（切勿提交）

实时测试发现凭据的方式与 CLI 相同。实际影响如下：

- 如果 CLI 可以工作，实时测试应该能找到相同的密钥。
- 如果实时测试提示“没有凭据”，请按照调试 `openclaw models list` / 模型选择的方式进行调试。

- Per-agent 身份验证配置文件：`~/.openclaw/agents/<agentId>/agent/auth-profiles.json`（这就是“profile keys”在实时测试中的含义）
- 配置：`~/.openclaw/openclaw.json`（或 `OPENCLAW_CONFIG_PATH`）
- 旧版状态目录：`~/.openclaw/credentials/`（如果存在，会将其复制到暂存的实时主目录中，但不是主要的 profile-key 存储区）
- Live 本地运行默认会将活动配置、每个代理的 `auth-profiles.json` 文件、旧版 `credentials/` 以及受支持的外部 CLI 身份验证目录复制到一个临时测试主目录中；在该暂存配置中，`agents.*.workspace` / `agentDir` 路径覆盖项会被去除，以便探测操作不会影响您真实的主机工作区。

如果您想依赖环境变量密钥（例如在您的 `~/.profile` 中导出的），请在 `source ~/.profile` 之后运行本地测试，或使用下方的 Docker 运行器（它们可以将 `~/.profile` 挂载到容器中）。

## Deepgram 实时（音频转录）

- 测试：`src/media-understanding/providers/deepgram/audio.live.test.ts`
- 启用：`DEEPGRAM_API_KEY=... DEEPGRAM_LIVE_TEST=1 pnpm test:live src/media-understanding/providers/deepgram/audio.live.test.ts`

## BytePlus 编码计划实时测试

- 测试：`src/agents/byteplus.live.test.ts`
- 启用：`BYTEPLUS_API_KEY=... BYTEPLUS_LIVE_TEST=1 pnpm test:live src/agents/byteplus.live.test.ts`
- 可选模型覆盖：`BYTEPLUS_CODING_MODEL=ark-code-latest`

## ComfyUI 工作流媒体实时测试

- 测试：`extensions/comfy/comfy.live.test.ts`
- 启用：`OPENCLAW_LIVE_TEST=1 COMFY_LIVE_TEST=1 pnpm test:live -- extensions/comfy/comfy.live.test.ts`
- 范围：
  - 执行捆绑的 comfy 图片、视频和 `music_generate` 路径
  - 除非配置了 `models.providers.comfy.<capability>`，否则跳过每个功能
  - 在更改 comfy 工作流提交、轮询、下载或插件注册后很有用

## 图像生成实时测试

- 测试：`src/image-generation/runtime.live.test.ts`
- 命令：`pnpm test:live src/image-generation/runtime.live.test.ts`
- 范围：
  - 枚举每个已注册的图像生成提供商插件
  - 在探测之前从您的登录 shell（`~/.profile`）加载缺失的提供商环境变量
  - 默认优先使用实时/环境 API 密钥而非存储的身份验证配置文件，因此 `auth-profiles.json` 中的过时测试密钥不会掩盖真实的 shell 凭据
  - 跳过没有可用身份验证/配置文件/模型的提供商
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
- 可选身份验证行为：
  - `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` 强制使用配置文件存储身份验证并忽略仅限环境变量的覆盖

## 音乐生成实时测试

- 测试：`extensions/music-generation-providers.live.test.ts`
- 启用：`OPENCLAW_LIVE_TEST=1 pnpm test:live -- extensions/music-generation-providers.live.test.ts`
- 范围：
  - 运行共享的捆绑音乐生成提供商路径
  - 目前涵盖 Google 和 MiniMax
  - 在探测之前从您的登录 shell 加载提供商环境变量（`~/.profile`）
  - 跳过没有可用身份验证/配置文件/模型的提供商
- 可选范围缩小：
  - `OPENCLAW_LIVE_MUSIC_GENERATION_PROVIDERS="google,minimax"`
  - `OPENCLAW_LIVE_MUSIC_GENERATION_MODELS="google/lyria-3-clip-preview,minimax/music-2.5+"`

## Docker 运行程序（可选的“在 Linux 上工作”检查）

这些 Docker 运行程序分为两类：

- 实时模型运行程序：`test:docker:live-models` 和 `test:docker:live-gateway` 仅在仓库 Docker 镜像内运行与其匹配的配置文件键实时文件（`src/agents/models.profiles.live.test.ts` 和 `src/gateway/gateway-models.profiles.live.test.ts`），挂载您的本地配置目录和工作区（如果已挂载，则导入 `~/.profile`）。匹配的本地入口点是 `test:live:models-profiles` 和 `test:live:gateway-profiles`。
- Docker 实时运行程序默认采用较小的冒烟上限，以便完整的 Docker 扫描保持实用：
  `test:docker:live-models` 默认为 `OPENCLAW_LIVE_MAX_MODELS=12`，且
  `test:docker:live-gateway` 默认为 `OPENCLAW_LIVE_GATEWAY_SMOKE=1`，
  `OPENCLAW_LIVE_GATEWAY_MAX_MODELS=8`，
  `OPENCLAW_LIVE_GATEWAY_STEP_TIMEOUT_MS=45000`，以及
  `OPENCLAW_LIVE_GATEWAY_MODEL_TIMEOUT_MS=90000`。当您
  明确需要较大的详尽扫描时，请覆盖这些环境变量。
- `test:docker:all` 通过 `test:docker:live-build` 构建一次实时 Docker 镜像，然后将其用于两个实时 Docker 通道。
- 容器冒烟运行器：`test:docker:openwebui`、`test:docker:onboard`、`test:docker:gateway-network`、`test:docker:mcp-channels` 和 `test:docker:plugins` 会启动一个或多个真实容器并验证更高级别的集成路径。

实时模型 Docker 运行器还仅绑定挂载所需的 CLI 认证主目录（或者在运行未缩窄时挂载所有支持的目录），然后在运行前将其复制到容器主目录中，以便外部 CLI OAuth 可以刷新令牌而无需更改主机认证存储：

- 直连模型：`pnpm test:docker:live-models`（脚本：`scripts/test-live-models-docker.sh`）
- ACP 绑定冒烟测试：`pnpm test:docker:live-acp-bind`（脚本：`scripts/test-live-acp-bind-docker.sh`）
- Gateway(网关) + 开发代理：`pnpm test:docker:live-gateway`（脚本：`scripts/test-live-gateway-models-docker.sh`）
- Open WebUI 实时冒烟测试：`pnpm test:docker:openwebui`（脚本：`scripts/e2e/openwebui-docker.sh`）
- 新手引导向导 (TTY, 完整脚手架)：`pnpm test:docker:onboard`（脚本：`scripts/e2e/onboard-docker.sh`）
- Gateway(网关) 网络（两个容器，WS 认证 + 健康检查）：`pnpm test:docker:gateway-network`（脚本：`scripts/e2e/gateway-network-docker.sh`）
- MCP 渠道桥接（预置 Gateway(网关) + stdio 桥接 + 原始 Claude 通知帧冒烟测试）：`pnpm test:docker:mcp-channels`（脚本：`scripts/e2e/mcp-channels-docker.sh`）
- 插件（安装冒烟测试 + `/plugin` 别名 + Claude 包重启语义）：`pnpm test:docker:plugins`（脚本：`scripts/e2e/plugins-docker.sh`）

live-模型 Docker 运行器也会将当前检出目录以只读方式绑定挂载，
并将其暂存到容器内的临时工作目录中。这既保持了运行时
镜像的精简，又能针对您的确切本地源码/配置运行 Vitest。
暂存步骤会跳过大型本地缓存和应用构建输出，例如
`.pnpm-store`、`.worktrees`、`__openclaw_vitest__` 以及应用本地的 `.build` 或
Gradle 输出目录，这样 Docker 实时运行就不会花费几分钟来复制
特定于机器的构建产物。
它们还设置了 `OPENCLAW_SKIP_CHANNELS=1`，这样 Gateway 实时探针就不会在容器内启动
真正的 Telegram/Discord/等渠道工作进程。
`test:docker:live-models` 仍然运行 `pnpm test:live`，因此当您需要缩小或排除
该 Docker 通道中的 Gateway 实时覆盖范围时，也需要
传递 `OPENCLAW_LIVE_GATEWAY_*`。
`test:docker:openwebui` 是一个更高级别的兼容性冒烟测试：它启动一个
启用了 OpenClaw 兼容 HTTP 端点的 OpenAI Gateway 容器，
针对该 Gateway 启动一个固定的 Open WebUI 容器，通过
Open WebUI 登录，验证 `/api/models` 暴露了 `openclaw/default`，然后通过
Open WebUI 的 `/api/chat/completions` 代理发送一个真实的聊天请求。
第一次运行可能会明显较慢，因为 Docker 可能需要拉取
Open WebUI 镜像，且 Open WebUI 可能需要完成其自身的冷启动设置。
此通道需要一个可用的实时模型密钥，而 `OPENCLAW_PROFILE_FILE`
（默认为 `~/.profile`）是在 Telegram 化运行中提供它的主要方式。
成功的运行会打印一个小的 JSON 载荷，如 `{ "ok": true, "模型":
"openclaw/default", ... }`。
`test:docker:mcp-channels` 是有意确定性的，不需要真实的
Discord、iMessage 或 Gateway(网关) 账户。它会启动一个已设定种子的 Gateway
容器，启动一个生成 `openclaw mcp serve` 的第二个容器，然后
验证路由对话发现、转录读取、附件元数据、
实时事件队列行为、出站发送路由，以及通过真实 stdio MCP 桥接进行的
Claude 风格渠道 + 权限通知。通知检查
直接检查原始 stdio MCP 帧，因此冒烟测试验证的是
桥接实际发出的内容，而不仅仅是特定客户端 SDK 恰好呈现的内容。

手动 ACP 自然语言线程冒烟测试（非 CI）：

- `bun scripts/dev/discord-acp-plain-language-smoke.ts --channel <discord-channel-id> ...`
- 保留此脚本用于回归/调试工作流。ACP 线程路由验证可能还需要它，因此请勿删除。

有用的环境变量：

- `OPENCLAW_CONFIG_DIR=...`（默认：`~/.openclaw`）挂载到 `/home/node/.openclaw`
- `OPENCLAW_WORKSPACE_DIR=...`（默认：`~/.openclaw/workspace`）挂载到 `/home/node/.openclaw/workspace`
- `OPENCLAW_PROFILE_FILE=...`（默认：`~/.profile`）挂载到 `/home/node/.profile` 并在运行测试之前加载
- `OPENCLAW_DOCKER_CLI_TOOLS_DIR=...`（默认：`~/.cache/openclaw/docker-cli-tools`）挂载到 `/home/node/.npm-global`，用于 Docker 内部的缓存 CLI 安装
- `$HOME` 下的外部 CLI 认证目录/文件以只读方式挂载在 `/host-auth...` 下，然后在测试开始前复制到 `/home/node/...`
  - 默认目录：`.minimax`
  - 默认文件：`~/.codex/auth.json`、`~/.codex/config.toml`、`.claude.json`、`~/.claude/.credentials.json`、`~/.claude/settings.json`、`~/.claude/settings.local.json`
  - 缩小的提供商运行仅挂载从 `OPENCLAW_LIVE_PROVIDERS` / `OPENCLAW_LIVE_GATEWAY_PROVIDERS` 推断出的所需目录/文件
  - 使用 `OPENCLAW_DOCKER_AUTH_DIRS=all`、`OPENCLAW_DOCKER_AUTH_DIRS=none` 或类似 `OPENCLAW_DOCKER_AUTH_DIRS=.claude,.codex` 的逗号列表手动覆盖
- `OPENCLAW_LIVE_GATEWAY_MODELS=...` / `OPENCLAW_LIVE_MODELS=...` 以缩小运行范围
- `OPENCLAW_LIVE_GATEWAY_PROVIDERS=...` / `OPENCLAW_LIVE_PROVIDERS=...` 以在容器内过滤提供商
- `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` 以确保凭据来自配置文件存储（而非环境）
- `OPENCLAW_OPENWEBUI_MODEL=...` 以选择网关为 Open WebUI 冒烟测试公开的模型
- `OPENCLAW_OPENWEBUI_PROMPT=...` 以覆盖 Open WebUI 冒烟测试使用的 nonce 检查提示
- `OPENWEBUI_IMAGE=...` 以覆盖固定的 Open WebUI 镜像标签

## 文档完整性检查

编辑文档后运行文档检查：`pnpm check:docs`。
当您也需要页面内标题检查时，运行完整的 Mintlify 锚点验证：`pnpm docs:check-links:anchors`。

## 离线回归（CI 安全）

这些是“真实管道”的回归测试，但不使用真实的提供商：

- Gateway 工具调用（模拟 OpenAI，真实的 gateway + agent 循环）：`src/gateway/gateway.test.ts` (用例: "通过 gateway agent 循环端到端运行模拟的 OpenAI 工具调用")
- Gateway 向导（WS `wizard.start`/`wizard.next`，写入配置 + 强制执行身份验证）：`src/gateway/gateway.test.ts` (用例: "通过 ws 运行向导并写入身份验证令牌配置")

## Agent 可靠性评估（Skills）

我们已经有一些 CI 安全的测试，其行为类似于“agent 可靠性评估”：

- 通过真实的 gateway + agent 循环进行模拟工具调用（`src/gateway/gateway.test.ts`）。
- 端到端的向导流程，用于验证会话连接和配置效果（`src/gateway/gateway.test.ts`）。

Skills 目前仍缺少的内容（参见 [Skills](/en/tools/skills)）：

- **决策制定：** 当 prompt 中列出了 skills 时，agent 会选择正确的 skill（或者避开不相关的 ones）吗？
- **合规性：** agent 在使用前是否会阅读 `SKILL.md` 并遵循必需的步骤/参数？
- **工作流契约：** 断言工具顺序、会话历史保留和沙箱边界的多轮场景。

未来的评估应首先保持确定性：

- 使用模拟提供商来断言工具调用 + 顺序、skill 文件读取和会话连接的场景运行器。
- 一小套专注于 skill 的场景（使用 vs 避开、 gating、 prompt 注入）。
- 仅在 CI 安全套件到位后，才进行可选的实时评估（需选择加入、受环境限制）。

## 契约测试（插件和渠道形状）

契约测试验证每个注册的插件和渠道是否符合其
接口契约。它们遍历所有发现的插件并运行一套
形状和行为断言。默认的 `pnpm test` 单元通道有意
跳过这些共享的接缝和冒烟文件；当您触及共享的渠道或提供商表面时，请显式运行契约命令。

### 命令

- 所有契约：`pnpm test:contracts`
- 仅渠道契约：`pnpm test:contracts:channels`
- 仅提供商合约：`pnpm test:contracts:plugins`

### 渠道合约

位于 `src/channels/plugins/contracts/*.contract.test.ts`：

- **plugin** - 基本插件形状（id、name、capabilities）
- **setup** - 设置向导合约
- **会话-binding** - 会话绑定行为
- **outbound-payload** - 消息载荷结构
- **inbound** - 入站消息处理
- **actions** - 渠道操作处理程序
- **threading** - 线程 ID 处理
- **directory** - 目录/名册 API
- **group-policy** - 群组策略执行

### 提供商状态合约

位于 `src/plugins/contracts/*.contract.test.ts`。

- **status** - 渠道状态探测
- **registry** - 插件注册表形状

### 提供商合约

位于 `src/plugins/contracts/*.contract.test.ts`：

- **auth** - 认证流程合约
- **auth-choice** - 认证选择/选项
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

- 如果可能，添加 CI 安全的回归测试（模拟/存根提供商，或捕获确切的请求形状转换）
- 如果本质上仅限 live（速率限制、认证策略），请保持 live 测试范围狭窄并通过环境变量选择加入
- 优先定位捕获该 bug 的最底层：
  - 提供商请求转换/重放 bug → 直接模型测试
  - 网关会话/历史/工具流水线 bug → 网关 live smoke 或 CI 安全的网关模拟测试
- SecretRef 遍历防护措施：
  - `src/secrets/exec-secret-ref-id-parity.test.ts` 从注册表元数据（`listSecretTargetRegistryEntries()`）中为每个 SecretRef 类别派生一个采样目标，然后断言遍历段执行 id 被拒绝。
  - 如果在 `src/secrets/target-registry-data.ts` 中添加新的 `includeInPlan` SecretRef 目标系列，请在该测试中更新 `classifyTargetClass`。该测试有意在未分类的目标 id 上失败，以便新类别无法被静默跳过。
