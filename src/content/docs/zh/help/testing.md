---
summary: "测试工具包：单元/e2e/live 测试套件、Docker 运行器，以及各测试覆盖的内容"
read_when:
  - Running tests locally or in CI
  - Adding regressions for model/provider bugs
  - Debugging gateway + agent behavior
title: "测试"
---

OpenClaw 拥有三个 Vitest 测试套件（单元/集成、e2e、live）和少量的 Docker 运行器。本文档是一份“我们如何测试”指南：

- 每个套件涵盖的内容（以及它特意*不*涵盖的内容）。
- 针对常见工作流（本地、预推送、调试）运行哪些命令。
- Live 测试如何发现凭证并选择模型/提供商。
- 如何为现实世界的模型/提供商问题添加回归测试。

<Note>
**QA 技术栈（qa-lab、qa-渠道、live 传输通道）** 在其他文档中单独说明：

- [QA 概述](/zh/concepts/qa-e2e-automation) — 架构、命令界面、场景编写。
- [Matrix QA](/zh/concepts/qa-matrix) — `pnpm openclaw qa matrix` 的参考。
- [QA 渠道](/zh/channels/qa-channel) — 由 repo 支持的场景使用的合成传输插件。

本页涵盖运行常规测试套件和 Docker/Parallels 运行器。下面的特定于 QA 的运行器部分 ([QA-specific runners](#qa-specific-runners)) 列出了具体的 `qa` 调用，并指向上述参考内容。

</Note>

## 快速开始

大多数时候：

- 完整门控（推送前预期）： `pnpm build && pnpm check && pnpm check:test-types && pnpm test`
- 在配置充足的机器上更快地本地运行完整套件： `pnpm test:max`
- 直接运行 Vitest 监视循环： `pnpm test:watch`
- 直接文件定位现在也路由扩展/渠道路径： `pnpm test extensions/discord/src/monitor/message-handler.preflight.test.ts`
- 当您正在处理单个失败时，请优先进行针对性运行。
- Docker 支持的 QA 站点： `pnpm qa:lab:up`
- Linux VM 支持的 QA 通道： `pnpm openclaw qa suite --runner multipass --scenario channel-chat-baseline`

当您修改测试或需要额外的信心时：

- 覆盖率门控： `pnpm test:coverage`
- E2E 套件： `pnpm test:e2e`

调试真实提供商/模型时（需要真实凭证）：

- Live 套件（模型 + 网关工具/镜像探测）： `pnpm test:live`
- 静默定位单个 live 文件： `pnpm test:live -- src/agents/models.profiles.live.test.ts`
- Docker live 模型扫描： `pnpm test:docker:live-models`
  - 每个选定的模型现在都会运行一个文本轮次加上一个小型的文件读取式探针。
    其元数据声明 `image` 输入的模型也会运行一个微小的图像轮次。
    在隔离提供商故障时，可以使用 `OPENCLAW_LIVE_MODEL_FILE_PROBE=0` 或
    `OPENCLAW_LIVE_MODEL_IMAGE_PROBE=0` 禁用额外的探针。
  - CI 覆盖范围：每日 `OpenClaw Scheduled Live And E2E Checks` 和手动
    `OpenClaw Release Checks` 都使用
    `include_live_suites: true` 调用可复用的 live/E2E 工作流，其中包括按提供商分片的独立 Docker 实时模型
    矩阵作业。
  - 对于定向 CI 重新运行，使用 `include_live_suites: true` 和 `live_models_only: true` 调度 `OpenClaw Live And E2E Checks (Reusable)`。
  - 将新的高信噪比提供商密钥添加到 `scripts/ci-hydrate-live-auth.sh`
    以及 `.github/workflows/openclaw-live-and-e2e-checks-reusable.yml` 及其
    定时/发布调用程序中。
- 原生 Codex bound-chat 冒烟测试：`pnpm test:docker:live-codex-bind`
  - 针对 Codex 应用服务器路径运行 Docker 实时通道，使用 `/codex bind` 绑定合成 Slack 私信，演练 `/codex fast` 和
    `/codex permissions`，然后验证纯文本回复和图像附件
    是否通过原生插件绑定而非 ACP 路由。
- Codex 应用服务器工具冒烟测试：`pnpm test:docker:live-codex-harness`
  - 通过插件拥有的 Codex 应用服务器工具运行网关代理轮次，
    验证 `/codex status` 和 `/codex models`，并且默认演练图像、
    cron MCP、子代理和 Guardian 探针。在隔离其他 Codex
    应用服务器故障时，使用
    `OPENCLAW_LIVE_CODEX_HARNESS_SUBAGENT_PROBE=0` 禁用子代理探针。
    对于定向的子代理检查，禁用其他探针：
    `OPENCLAW_LIVE_CODEX_HARNESS_IMAGE_PROBE=0 OPENCLAW_LIVE_CODEX_HARNESS_MCP_PROBE=0 OPENCLAW_LIVE_CODEX_HARNESS_GUARDIAN_PROBE=0 OPENCLAW_LIVE_CODEX_HARNESS_SUBAGENT_PROBE=1 pnpm test:docker:live-codex-harness`。
    除非设置了 `OPENCLAW_LIVE_CODEX_HARNESS_SUBAGENT_ONLY=0`，否则这会在子代理探针后退出。
- Crestodian 救援命令冒烟测试：`pnpm test:live:crestodian-rescue-channel`
  - 针对消息渠道救援命令
    表面的可选双重检查。它演练 `/crestodian status`，将持久化模型
    更改排队，回复 `/crestodian yes`，并验证审计/配置写入路径。
- Crestodian 规划器 Docker 冒烟测试：`pnpm test:docker:crestodian-planner`
  - 在无配置容器中使用模拟的 Claude CLI 运行 Crestodian，位于 `PATH` 上，并验证模糊规划器回退是否转换为已审计的类型化配置写入。
- Crestodian 首次运行 Docker 冒烟测试：`pnpm test:docker:crestodian-first-run`
  - 从空的 OpenClaw 状态目录开始，将裸 `openclaw` 路由到 Crestodian，应用 setup/模型/agent/Discord 插件 + SecretRef 写入，验证配置，并验证审计条目。QA Lab 中也通过 `pnpm openclaw qa suite --scenario crestodian-ring-zero-setup` 覆盖了相同的 Ring 0 设置路径。
- Moonshot/Kimi 成本冒烟测试：设置 `MOONSHOT_API_KEY` 后，运行 `openclaw models list --provider moonshot --json`，然后针对 `moonshot/kimi-k2.6` 运行一个隔离的 `openclaw agent --local --session-id live-kimi-cost --message 'Reply exactly: KIMI_LIVE_OK' --thinking off --json`。验证 JSON 报告 Moonshot/K2.6 并且助手对话记录存储了标准化的 `usage.cost`。

<Tip>当您只需要一个失败的测试用例时，建议通过下面描述的允许列表环境变量来缩小 live 测试的范围。</Tip>

## QA 专用运行器

当您需要 QA 实验室级别的真实感时，这些命令位于主测试套件之侧：

CI 在专用工作流中运行 QA Lab。`Parity gate` 在匹配的 PR 上以及使用模拟提供程序的手动触发时运行。`QA-Lab - All Lanes` 每晚在 `main` 上以及使用模拟奇偶校验门控、live Matrix 通道、Convex 托管的 live Telegram 通道和 Convex 托管的 live Discord 通道进行手动触发时，作为并行作业运行。计划的 QA 和发布检查显式传递 Telegram `--profile fast`，而 Discord Matrix 和手动工作流输入默认值仍为 `all`；手动触发可以将 `all` 分片为 `transport`、`media`、`e2ee-smoke`、`e2ee-deep` 和 `e2ee-cli` 作业。`OpenClaw Release Checks` 在发布批准之前运行奇偶校验以及快速 Matrix 和 Telegram CLI 通道。

- `pnpm openclaw qa suite`
  - 直接在主机上运行基于代码仓库的 QA 场景。
  - 默认情况下，使用隔离的 gateway worker 并行运行多个选定的场景。`qa-channel` 默认并发数为 4（受选定场景数量限制）。使用 `--concurrency <count>` 调整 worker 数量，或者使用 `--concurrency 1` 运行较旧的串行通道。
  - 当任何场景失败时，以非零代码退出。当你希望获得产物但不希望因失败而退出时，请使用 `--allow-failures`。
  - 支持提供商模式 `live-frontier`、`mock-openai` 和 `aimock`。`aimock` 会启动一个本地由 AIMock 支持的提供商服务器，用于实验性的 fixture 和协议 mock 覆盖，而不会替换具有场景感知能力的 `mock-openai` 通道。
- `pnpm openclaw qa suite --runner multipass`
  - 在一次性 Multipass Linux 虚拟机内运行相同的 QA 套件。
  - 在主机上保持与 `qa suite` 相同的场景选择行为。
  - 重用与 `qa suite` 相同的提供商/模型选择标志。
  - Live 运行转发适用于访客的支持的 QA 认证输入：基于环境变量的提供商密钥、QA live 提供商配置路径，以及（如果存在）`CODEX_HOME`。
  - 输出目录必须保留在仓库根目录下，以便访客可以通过挂载的工作区写回数据。
  - 在 `.artifacts/qa-e2e/...` 下写入常规的 QA 报告和摘要以及 Multipass 日志。
- `pnpm qa:lab:up`
  - 启动由 Docker 支持的 QA 站点，用于操作员风格的 QA 工作。
- `pnpm test:docker:npm-onboard-channel-agent`
  - 从当前检出代码构建一个 npm 压缩包，将其全局安装到 Docker 中，运行非交互式的 OpenAI API 密钥新手引导，默认配置 Telegram，验证启用插件时会按需安装运行时依赖，运行 doctor，并针对模拟的 OpenAI 端点运行一个本地代理轮次。
  - 使用 `OPENCLAW_NPM_ONBOARD_CHANNEL=discord` 运行带有 Discord 的相同打包安装通道。
- `pnpm test:docker:session-runtime-context`
  - 针对嵌入式运行时上下文记录运行确定性构建应用 Docker 冒烟测试。它验证隐藏的 OpenClaw 运行时上下文被持久化为非显示的自定义消息，而不是泄露到可见的用户轮次中，然后植入受影响的损坏会话 JSONL 并验证 `openclaw doctor --fix` 将其重写到活动分支并进行备份。
- `pnpm test:docker:npm-telegram-live`
  - 在 Docker 中安装 OpenClaw 候选包，运行已安装包的新手引导，通过已安装的 CLI 配置 Telegram，然后重用实时 Telegram QA 车道，并将该已安装包作为 SUT Gateway(网关)。
  - 默认为 `OPENCLAW_NPM_TELEGRAM_PACKAGE_SPEC=openclaw@beta`；设置 `OPENCLAW_NPM_TELEGRAM_PACKAGE_TGZ=/path/to/openclaw-current.tgz` 或 `OPENCLAW_CURRENT_PACKAGE_TGZ` 以测试已解析的本地 tarball，而不是从注册表安装。
  - 使用与 `pnpm openclaw qa telegram` 相同的 Telegram 环境凭据或 Convex 凭据源。对于 CI/发布自动化，请设置 `OPENCLAW_NPM_TELEGRAM_CREDENTIAL_SOURCE=convex` 以及 `OPENCLAW_QA_CONVEX_SITE_URL` 和角色密钥。如果 CI 中存在 `OPENCLAW_QA_CONVEX_SITE_URL` 和 Convex 角色密钥，Docker 包装器将自动选择 Convex。
  - `OPENCLAW_NPM_TELEGRAM_CREDENTIAL_ROLE=ci|maintainer` 会覆盖仅针对此车道的共享 `OPENCLAW_QA_CREDENTIAL_ROLE`。
  - GitHub Actions 将此车道作为手动维护者工作流 `NPM Telegram Beta E2E` 公开。它不会在合并时运行。该工作流使用 `qa-live-shared` 环境和 Convex CI 凭据租约。
- GitHub Actions 还公开了 `Package Acceptance`，用于针对一个候选包进行并行运行的产品验证。它接受受信任的引用、已发布的 npm 规范、HTTPS tarball URL 加 SHA-256、或来自另一次运行的 tarball 制品，将规范化的 `openclaw-current.tgz` 上传为 `package-under-test`，然后使用冒烟、包、产品、完整或自定义车道配置文件运行现有的 Docker E2E 调度程序。设置 `telegram_mode=mock-openai` 或 `live-frontier` 以针对同一个 `package-under-test` 制品运行 Telegram QA 工作流。
  - 最新的 Beta 产品验证：

```bash
gh workflow run package-acceptance.yml --ref main \
  -f source=npm \
  -f package_spec=openclaw@beta \
  -f suite_profile=product \
  -f telegram_mode=mock-openai
```

- 确切的 tarball URL 验证需要摘要：

```bash
gh workflow run package-acceptance.yml --ref main \
  -f source=url \
  -f package_url=https://registry.npmjs.org/openclaw/-/openclaw-VERSION.tgz \
  -f package_sha256=<sha256> \
  -f suite_profile=package
```

- 制品验证会从另一个 Actions 运行中下载 tarball 制品：

```bash
gh workflow run package-acceptance.yml --ref main \
  -f source=artifact \
  -f artifact_run_id=<run-id> \
  -f artifact_name=<artifact-name> \
  -f suite_profile=smoke
```

- `pnpm test:docker:bundled-channel-deps`
  - 将当前的 OpenClaw 构建打包并安装到 Docker 中，启动配置了 Gateway(网关) 的 OpenAI，然后通过配置编辑启用捆绑的渠道/插件。
  - 验证设置发现会让未配置的插件运行时依赖保持缺失，首次配置的 Gateway(网关) 或 doctor 运行会按需安装每个捆绑插件的运行时依赖，并且第二次重启不会重新安装已激活的依赖。
  - 还会安装一个已知的旧 npm 基线，在运行 `openclaw update --tag <candidate>` 之前启用 Telegram，并验证候选版本的更新后 doctor 可以修复捆绑渠道的运行时依赖，而无需 harness 端的 postinstall 修复。
- `pnpm test:parallels:npm-update`
  - 跨 Parallels 客户机运行原生打包安装更新冒烟测试。每个选定的平台首先安装请求的基线包，然后在同一客户机中运行已安装的 `openclaw update` 命令，并验证安装的版本、更新状态、gateway 就绪状态以及一次本地 agent 轮次。
  - 在单个客户机上进行迭代时，请使用 `--platform macos`、`--platform windows` 或 `--platform linux`。使用 `--json` 获取摘要构件路径和每通道状态。
  - 默认情况下，OpenAI 通道使用 `openai/gpt-5.5` 作为实时 agent 轮次证明。在特意验证另一个 OpenAI 模型时，请传递 `--model <provider/model>` 或设置 `OPENCLAW_PARALLELS_OPENAI_MODEL`。
  - 将较长的本地运行包裹在主机超时中，以免 Parallels 传输停滞占用剩余的测试窗口：

    ```bash
    timeout --foreground 150m pnpm test:parallels:npm-update -- --json
    timeout --foreground 90m pnpm test:parallels:npm-update -- --platform windows --json
    ```

  - 该脚本在 `/tmp/openclaw-parallels-npm-update.*` 下写入嵌套的通道日志。在假设外部包裹已挂起之前，请先检查 `windows-update.log`、`macos-update.log` 或 `linux-update.log`。
  - Windows 更新在冷客户机上可能会在更新后 doctor/运行时依赖修复上花费 10 到 15 分钟；只要嵌套的 npm 调试日志在推进，这仍然是正常的。
  - 不要将此聚合包装器与单独的 Parallels macOS、Windows 或 Linux 冒烟通道并行运行。它们共享 VM 状态，可能会在快照还原、包服务或客户机 gateway 状态上发生冲突。
  - 更新后证明运行正常的打包插件表面，因为语音、图像生成和媒体理解等功能外观是通过打包运行时 API 加载的，即使代理轮次本身仅检查简单的文本响应。

- `pnpm openclaw qa aimock`
  - 仅启动本地 AIMock 提供商服务器，用于直接协议冒烟测试。
- `pnpm openclaw qa matrix`
  - 针对一次性 Matrix 支持的 Tuwunel 家庭服务器运行 Docker 实时 QA 车道。仅限源代码检出 — 打包安装不包含 `qa-lab`。
  - 完整的 CLI、配置文件/场景目录、环境变量和构件布局：[Matrix QA](/zh/concepts/qa-matrix)。
- `pnpm openclaw qa telegram`
  - 使用来自环境变量的驱动程序和 SUT 机器人令牌，针对真实的私有组运行 Telegram 实时 QA 车道。
  - 需要 `OPENCLAW_QA_TELEGRAM_GROUP_ID`、`OPENCLAW_QA_TELEGRAM_DRIVER_BOT_TOKEN` 和 `OPENCLAW_QA_TELEGRAM_SUT_BOT_TOKEN`。组 ID 必须是数字 Telegram 聊天 ID。
  - 支持 `--credential-source convex` 以实现共享的池化凭据。默认使用环境模式，或设置 `OPENCLAW_QA_CREDENTIAL_SOURCE=convex` 以选择加入池化租约。
  - 当任何场景失败时，以非零状态退出。当您需要没有失败退出代码的构件时，请使用 `--allow-failures`。
  - 需要在同一个私有组中有两个不同的机器人，并且 SUT 机器人暴露 Telegram 用户名。
  - 为了稳定的机器人对机器人观察，请在 `@BotFather` 中为两个机器人启用机器人对机器人通信模式，并确保驱动程序机器人可以观察组机器人流量。
  - 在 `.artifacts/qa-e2e/...` 下写入 Telegram QA 报告、摘要和观察到的消息构件。回复场景包括从驱动程序发送请求到观察到 SUT 回复的 RTT。

实时传输车道共享一个标准合约，因此新的传输不会偏离；每个车道的覆盖率矩阵位于 [QA 概述 → 实时传输覆盖率](/zh/concepts/qa-e2e-automation#live-transport-coverage)。`qa-channel` 是广泛的综合套件，不属于该矩阵的一部分。

### 通过 Convex (v1) 共享 Telegram 凭据

当为 `openclaw qa telegram` 启用了 `--credential-source convex`（或 `OPENCLAW_QA_CREDENTIAL_SOURCE=convex`）时，QA 实验室会从 Convex 支持的池中获取独占租约，在通道运行期间维护该租约的心跳，并在关闭时释放租约。

参考 Convex 项目结构：

- `qa/convex-credential-broker/`

所需环境变量：

- `OPENCLAW_QA_CONVEX_SITE_URL`（例如 `https://your-deployment.convex.site`）
- 所选角色对应的一个密钥：
  - `maintainer` 的 `OPENCLAW_QA_CONVEX_SECRET_MAINTAINER`
  - `ci` 的 `OPENCLAW_QA_CONVEX_SECRET_CI`
- 凭据角色选择：
  - CLI：CLI: `--credential-role maintainer|ci`
  - 环境变量默认值：`OPENCLAW_QA_CREDENTIAL_ROLE`（在 CI 中默认为 `ci`，否则为 `maintainer`）

可选环境变量：

- `OPENCLAW_QA_CREDENTIAL_LEASE_TTL_MS`（默认 `1200000`）
- `OPENCLAW_QA_CREDENTIAL_HEARTBEAT_INTERVAL_MS`（默认 `30000`）
- `OPENCLAW_QA_CREDENTIAL_ACQUIRE_TIMEOUT_MS`（默认 `90000`）
- `OPENCLAW_QA_CREDENTIAL_HTTP_TIMEOUT_MS`（默认 `15000`）
- `OPENCLAW_QA_CONVEX_ENDPOINT_PREFIX`（默认 `/qa-credentials/v1`）
- `OPENCLAW_QA_CREDENTIAL_OWNER_ID`（可选的 trace id）
- `OPENCLAW_QA_ALLOW_INSECURE_HTTP=1` 允许仅本地开发使用环回 `http://` Convex URL。

在正常操作中，`OPENCLAW_QA_CONVEX_SITE_URL` 应使用 `https://`。

维护者管理命令（池添加/移除/列表）特别需要 `OPENCLAW_QA_CONVEX_SECRET_MAINTAINER`。

维护者的 CLI 辅助工具：

```bash
pnpm openclaw qa credentials doctor
pnpm openclaw qa credentials add --kind telegram --payload-file qa/telegram-credential.json
pnpm openclaw qa credentials list --kind telegram
pnpm openclaw qa credentials remove --credential-id <credential-id>
```

在实时运行之前使用 `doctor` 来检查 Convex 站点 URL、代理密钥、端点前缀、HTTP 超时以及管理员/列表的可达性，而无需打印密钥值。在脚本和 CI 工具中使用 `--json` 获取机器可读的输出。

默认端点契约（`OPENCLAW_QA_CONVEX_SITE_URL` + `/qa-credentials/v1`）：

- `POST /acquire`
  - 请求：`{ kind, ownerId, actorRole, leaseTtlMs, heartbeatIntervalMs }`
  - 成功：`{ status: "ok", credentialId, leaseToken, payload, leaseTtlMs?, heartbeatIntervalMs? }`
  - Exhausted/retryable: `{ status: "error", code: "POOL_EXHAUSTED" | "NO_CREDENTIAL_AVAILABLE", ... }`
- `POST /heartbeat`
  - Request: `{ kind, ownerId, actorRole, credentialId, leaseToken, leaseTtlMs }`
  - Success: `{ status: "ok" }` (or empty `2xx`)
- `POST /release`
  - Request: `{ kind, ownerId, actorRole, credentialId, leaseToken }`
  - Success: `{ status: "ok" }` (or empty `2xx`)
- `POST /admin/add` (maintainer secret only)
  - Request: `{ kind, actorId, payload, note?, status? }`
  - Success: `{ status: "ok", credential }`
- `POST /admin/remove` (maintainer secret only)
  - Request: `{ credentialId, actorId }`
  - Success: `{ status: "ok", changed, credential }`
  - Active lease guard: `{ status: "error", code: "LEASE_ACTIVE", ... }`
- `POST /admin/list` (maintainer secret only)
  - Request: `{ kind?, status?, includePayload?, limit? }`
  - Success: `{ status: "ok", credentials, count }`

Payload shape for Telegram kind:

- `{ groupId: string, driverToken: string, sutToken: string }`
- `groupId` must be a numeric Telegram chat id string.
- `admin/add` validates this shape for `kind: "telegram"` and rejects malformed payloads.

### Adding a 渠道 to QA

The architecture and scenario-helper names for new 渠道 adapters live in [QA overview → Adding a 渠道](/zh/concepts/qa-e2e-automation#adding-a-channel). The minimum bar: implement the transport runner on the shared `qa-lab` host seam, declare `qaRunners` in the plugin manifest, mount as `openclaw qa <runner>`, and author scenarios under `qa/scenarios/`.

## Test suites (what runs where)

Think of the suites as “increasing realism” (and increasing flakiness/cost):

### Unit / integration (default)

- Command: `pnpm test`
- Config: untargeted runs use the `vitest.full-*.config.ts` shard set and may expand multi-project shards into per-project configs for parallel scheduling
- Files: core/unit inventories under `src/**/*.test.ts`, `packages/**/*.test.ts`, and `test/**/*.test.ts`; UI unit tests run in the dedicated `unit-ui` shard
- Scope:
  - Pure unit tests
  - 进程内集成测试（网关认证、路由、工具、解析、配置）
  - 针对已知 Bug 的确定性回归测试
- 预期：
  - 在 CI 中运行
  - 不需要真实密钥
  - 应该快速且稳定

<AccordionGroup>
  <Accordion title="Projects, shards, and scoped lanes">

    - Untargeted `pnpm test` runs twelve smaller shard configs (`core-unit-fast`, `core-unit-src`, `core-unit-security`, `core-unit-ui`, `core-unit-support`, `core-support-boundary`, `core-contracts`, `core-bundled`, `core-runtime`, `agentic`, `auto-reply`, `extensions`) instead of one giant native root-project process. This cuts peak RSS on loaded machines and avoids auto-reply/extension work starving unrelated suites.
    - `pnpm test --watch` still uses the native root `vitest.config.ts` project graph, because a multi-shard watch loop is not practical.
    - `pnpm test`, `pnpm test:watch`, and `pnpm test:perf:imports` route explicit file/directory targets through scoped lanes first, so `pnpm test extensions/discord/src/monitor/message-handler.preflight.test.ts` avoids paying the full root project startup tax.
    - `pnpm test:changed` expands changed git paths into cheap scoped lanes by default: direct test edits, sibling `*.test.ts` files, explicit source mappings, and local import-graph dependents. Config/setup/package edits do not broad-run tests unless you explicitly use `OPENCLAW_TEST_CHANGED_BROAD=1 pnpm test:changed`.
    - `pnpm check:changed` is the normal smart local check gate for narrow work. It classifies the diff into core, core tests, extensions, extension tests, apps, docs, release metadata, live Docker tooling, and tooling, then runs the matching typecheck, lint, and guard commands. It does not run Vitest tests; call `pnpm test:changed` or explicit `pnpm test <target>` for test proof. Release metadata-only version bumps run targeted version/config/root-dependency checks, with a guard that rejects package changes outside the top-level version field.
    - Live Docker ACP harness edits run focused checks: shell syntax for the live Docker auth scripts and a live Docker scheduler dry-run. `package.json` changes are included only when the diff is limited to `scripts["test:docker:live-*"]`; dependency, export, version, and other package-surface edits still use the broader guards.
    - Import-light unit tests from agents, commands, plugins, auto-reply helpers, `plugin-sdk`, and similar pure utility areas route through the `unit-fast` lane, which skips `test/setup-openclaw-runtime.ts`; stateful/runtime-heavy files stay on the existing lanes.
    - Selected `plugin-sdk` and `commands` helper source files also map changed-mode runs to explicit sibling tests in those light lanes, so helper edits avoid rerunning the full heavy suite for that directory.
    - `auto-reply` has dedicated buckets for top-level core helpers, top-level `reply.*` integration tests, and the `src/auto-reply/reply/**` subtree. CI further splits the reply subtree into agent-runner, dispatch, and commands/state-routing shards so one import-heavy bucket does not own the full Node tail.

  </Accordion>

  <Accordion title="嵌入式运行器覆盖率">

    - 当您更改消息-工具发现输入或压缩运行时上下文时，请保持两个级别的覆盖率。
    - 针对纯路由和规范化边界添加专注的辅助回归测试。
    - 保持嵌入式运行器集成套件的健全性：
      `src/agents/pi-embedded-runner/compact.hooks.test.ts`、
      `src/agents/pi-embedded-runner/run.overflow-compaction.test.ts` 和
      `src/agents/pi-embedded-runner/run.overflow-compaction.loop.test.ts`。
    - 这些套件验证作用域 ID 和压缩行为仍然流经真正的 `run.ts` / `compact.ts` 路径；仅辅助测试不足以替代这些集成路径。

  </Accordion>

  <Accordion title="Vitest 池和隔离默认值">

    - 基础 Vitest 配置默认为 `threads`。
    - 共享的 Vitest 配置固定 `isolate: false`，并在根项目、e2e 和 live 配置中跨使用非隔离运行器。
    - 根 UI 车道保留其 `jsdom` 设置和优化器，但也运行在共享的非隔离运行器上。
    - 每个 `pnpm test` 分片继承相同的 `threads` + `isolate: false`
      默认值（来自共享 Vitest 配置）。
    - `scripts/run-vitest.mjs` 默认为 Vitest 子 Node 进程添加 `--no-maglev`，以减少大型本地运行期间的 V8 编译抖动。
      设置 `OPENCLAW_VITEST_ENABLE_MAGLEV=1` 以与标准 V8 行为进行比较。

  </Accordion>

  <Accordion title="快速本地迭代">

    - `pnpm changed:lanes` 显示 diff 触发了哪些架构通道。
    - Pre-commit hook 仅用于格式化。它会重新暂存格式化后的文件，
      但不运行 lint、类型检查或测试。
    - 当你需要智能的本地检查关卡时，请在移交或推送之前显式运行
      `pnpm check:changed`。
    - `pnpm test:changed` 默认通过廉价的限定通道进行路由。仅当代理
      决定某个测试工具、配置、包或合约的编辑确实需要更广泛的
      Vitest 覆盖时，才使用
      `OPENCLAW_TEST_CHANGED_BROAD=1 pnpm test:changed`。
    - `pnpm test:max` 和 `pnpm test:changed:max` 保持相同的路由
      行为，只是具有更高的 worker 上限。
    - 本地 worker 自动扩展策略有意保持保守，当主机负载平均值已经
      很高时会退缩，因此默认情况下多个并发的 Vitest 运行造成的损害较小。
    - 基础 Vitest 配置将项目/配置文件标记为
      `forceRerunTriggers`，以便在测试
      连线发生变化时，更改模式下的重新运行保持正确。
    - 该配置在支持的
      主机上保持启用 `OPENCLAW_VITEST_FS_MODULE_CACHE`；如果你想要
      一个明确的缓存位置以进行直接分析，请设置
      `OPENCLAW_VITEST_FS_MODULE_CACHE_PATH=/abs/path`。

  </Accordion>

  <Accordion title="Perf debugging">

    - `pnpm test:perf:imports` 启用 Vitest 导入时长报告以及
      导入细分输出。
    - `pnpm test:perf:imports:changed` 将同样的分析视图限定在
      自 `origin/main` 以来更改的文件范围内。
    - 分片计时数据写入 `.artifacts/vitest-shard-timings.json`。
      完整配置运行使用配置路径作为键；包含模式的 CI
      分片会附加分片名称，以便单独跟踪已过滤的分片。
    - 当某个热测试仍然将大部分时间花在启动导入上时，
      请将繁重的依赖项置于狭窄的本地 `*.runtime.ts` 接缝之后，
      并直接模拟该接缝，而不是为了将它们传递给 `vi.mock(...)` 而深度导入运行时辅助程序。
    - `pnpm test:perf:changed:bench -- --ref <git-ref>` 将路由的
      `test:changed` 与该提交差异的本地根项目路径进行比较，并打印挂钟时间以及 macOS 最大 RSS。
    - `pnpm test:perf:changed:bench -- --worktree` 通过 `scripts/test-projects.mjs` 和根 Vitest 配置路由更改的文件列表，
      从而对当前的脏树进行基准测试。
    - `pnpm test:perf:profile:main` 为 Vitest/Vite
      启动和转换开销写入主线程 CPU 配置文件。
    - `pnpm test:perf:profile:runner` 为禁用了文件并行性的
      单元测试套件写入运行器 CPU+堆配置文件。

  </Accordion>
</AccordionGroup>

### 稳定性 (Gateway)

- 命令：`pnpm test:stability:gateway`
- 配置：`vitest.gateway.config.ts`，强制为一个工作进程
- 范围：
  - 启动一个默认启用了诊断功能的真实回环 Gateway(网关)
  - 通过诊断事件路径驱动合成的 Gateway 消息、内存和大负载扰动
  - 通过 Gateway WS RPC 查询 `diagnostics.stability`
  - 涵盖诊断稳定性包持久化辅助程序
  - 断言记录器保持有界，合成的 RSS 样本保持在压力预算之下，并且每个会话的队列深度回落到零
- 预期：
  - CI 安全且无密钥
  - 用于稳定性回归后续跟进的窄通道，而非完整 Gateway(网关) 套件的替代品

### E2E (gateway smoke)

- 命令：`pnpm test:e2e`
- 配置：`vitest.e2e.config.ts`
- 文件：`src/**/*.e2e.test.ts`、`test/**/*.e2e.test.ts` 以及 `extensions/` 下的 bundled-plugin E2E 测试
- 运行时默认值：
  - 使用带有 `isolate: false` 的 Vitest `threads`，与仓库的其他部分保持一致。
  - 使用自适应 Worker（CI 中最多 2 个，本地默认 1 个）。
  - 默认以静默模式运行，以减少控制台 I/O 开销。
- 有用的覆盖选项：
  - `OPENCLAW_E2E_WORKERS=<n>` 用于强制指定 Worker 数量（上限为 16）。
  - `OPENCLAW_E2E_VERBOSE=1` 用于重新启用详细控制台输出。
- 范围：
  - 多实例网关端到端行为
  - WebSocket/HTTP 接口、节点配对以及较重的网络任务
- 预期：
  - 在 CI 中运行（在流水线中启用时）
  - 无需真实密钥
  - 比单元测试有更多移动部件（可能会较慢）

### E2E: OpenShell 后端冒烟测试

- 命令：`pnpm test:e2e:openshell`
- 文件：`extensions/openshell/src/backend.e2e.test.ts`
- 范围：
  - 通过 Docker 在主机上启动隔离的 OpenShell 网关
  - 从临时的本地 Dockerfile 创建沙盒
  - 通过真实的 `sandbox ssh-config` + SSH exec 对 OpenClaw 的 OpenShell 后端进行测试
  - 通过沙盒 fs 桥接验证远程规范文件系统行为
- 预期：
  - 仅限可选加入；不属于默认 `pnpm test:e2e` 运行的一部分
  - 需要本地 `openshell` CLI 以及正常工作的 Docker 守护进程
  - 使用隔离的 `HOME` / `XDG_CONFIG_HOME`，然后销毁测试网关和沙盒
- 有用的覆盖选项：
  - `OPENCLAW_E2E_OPENSHELL=1` 用于在手动运行更广泛的 e2e 测试套件时启用此测试
  - `OPENCLAW_E2E_OPENSHELL_COMMAND=/path/to/openshell` 用于指定非默认的 CLI 二进制文件或包装脚本

### Live (真实提供商 + 真实模型)

- 命令：`pnpm test:live`
- 配置：`vitest.live.config.ts`
- 文件：`src/**/*.live.test.ts`、`test/**/*.live.test.ts` 以及 `extensions/` 下的 bundled-plugin live 测试
- 默认：由 `pnpm test:live` **启用**（设置 `OPENCLAW_LIVE_TEST=1`）
- 范围：
  - “该提供商/模型在今日使用真实凭证是否真的能正常工作？”
  - 捕获提供商格式变更、工具调用怪癖、身份验证问题以及速率限制行为
- 预期：
  - 按设计在 CI 中不稳定（涉及真实网络、真实的提供商策略、配额和故障）
  - 会产生费用 / 使用速率限制
  - 倾向于运行缩小的子集，而不是“所有”
- Live 运行源 `~/.profile` 以获取缺失的 API 密钥。
- 默认情况下，Live 运行仍然隔离 `HOME` 并将配置/身份验证材料复制到临时测试主目录中，因此单元装置无法更改您的真实 `~/.openclaw`。
- 仅当您故意需要 Live 测试使用您的真实主目录时，才设置 `OPENCLAW_LIVE_USE_REAL_HOME=1`。
- `pnpm test:live` 现在默认为更安静的模式：它保留 `[live] ...` 进度输出，但抑制额外的 `~/.profile` 通知并静默网关引导日志/Bonjour 闲聊。如果您想恢复完整的启动日志，请设置 `OPENCLAW_LIVE_TEST_QUIET=0`。
- API 密钥轮换（特定于提供商）：使用逗号/分号格式设置 `*_API_KEYS` 或 `*_API_KEY_1`、`*_API_KEY_2`（例如 `OPENAI_API_KEYS`、`ANTHROPIC_API_KEYS`、`GEMINI_API_KEYS`）或通过 `OPENCLAW_LIVE_*_KEY` 进行每次 Live 覆盖；测试会在收到速率限制响应时重试。
- 进度/心跳输出：
  - Live 套件现在向 stderr 发出进度行，以便即使 Vitest 控制台捕获处于静默状态，长时间运行的提供商调用也明显处于活动状态。
  - `vitest.live.config.ts` 禁用 Vitest 控制台拦截，以便提供商/网关进度行在 Live 运行期间立即流式传输。
  - 使用 `OPENCLAW_LIVE_HEARTBEAT_MS` 调整直接模型心跳。
  - 使用 `OPENCLAW_LIVE_GATEWAY_HEARTBEAT_MS` 调整网关/探测心跳。

## 我应该运行哪个套件？

使用此决策表：

- 编辑逻辑/测试：运行 `pnpm test`（如果您进行了大量更改，则运行 `pnpm test:coverage`）
- 涉及网关网络 / WS 协议 / 配对：添加 `pnpm test:e2e`
- 调试“我的机器人已挂”/特定于提供商的故障/工具调用：运行缩小范围的 `pnpm test:live`

## Live（涉及网络）测试

关于实时模型矩阵、CLI 后端冒烟测试、ACP 冒烟测试、Codex 应用服务器测试工具，以及所有媒体提供商实时测试（Deepgram、BytePlus、ComfyUI、图像、音乐、视频、媒体测试工具）——加上实时运行的凭证处理——请参阅 [Testing — live suites](/zh/help/testing-live)。

## Docker 运行器（可选的“在 Linux 上工作”检查）

这些 Docker 运行器分为两类：

- 实时模型运行器：`test:docker:live-models` 和 `test:docker:live-gateway` 仅在仓库 Docker 镜像内运行与其匹配的配置键实时文件（`src/agents/models.profiles.live.test.ts` 和 `src/gateway/gateway-models.profiles.live.test.ts`），挂载您的本地配置目录和工作区（如果挂载了 `~/.profile`，则获取它）。匹配的本地入口点是 `test:live:models-profiles` 和 `test:live:gateway-profiles`。
- Docker 实时运行器默认采用较小的冒烟测试上限，以便完整的 Docker 扫描保持实用：
  `test:docker:live-models` 默认为 `OPENCLAW_LIVE_MAX_MODELS=12`，且
  `test:docker:live-gateway` 默认为 `OPENCLAW_LIVE_GATEWAY_SMOKE=1`、
  `OPENCLAW_LIVE_GATEWAY_MAX_MODELS=8`、
  `OPENCLAW_LIVE_GATEWAY_STEP_TIMEOUT_MS=45000` 和
  `OPENCLAW_LIVE_GATEWAY_MODEL_TIMEOUT_MS=90000`。当您明确想要进行更大的详尽扫描时，请覆盖这些环境变量。
- `test:docker:all` 通过 `test:docker:live-build` 构建一次实时 Docker 镜像，通过 `scripts/package-openclaw-for-docker.mjs` 将 OpenClaw 打包一次为 npm tarball，然后构建/复用两个 `scripts/e2e/Dockerfile` 镜像。基础镜像仅用于安装/更新/插件依赖通道的 Node/Git 运行器；这些通道挂载预构建的 tarball。功能镜像将同一 tarball 安装到 `/app` 中，用于内置应用功能通道。Docker 通道定义位于 `scripts/lib/docker-e2e-scenarios.mjs` 中；规划器逻辑位于 `scripts/lib/docker-e2e-plan.mjs` 中；`scripts/test-docker-all.mjs` 执行选定的计划。聚合使用加权本地调度器：`OPENCLAW_DOCKER_ALL_PARALLELISM` 控制进程插槽，而资源上限防止繁重的实时、npm-install 和多服务通道同时启动。如果单个通道比活动上限更重，当池为空时，调度器仍可启动它，然后让其单独运行，直到再次可用容量。默认值为 10 个插槽、`OPENCLAW_DOCKER_ALL_LIVE_LIMIT=9`、`OPENCLAW_DOCKER_ALL_NPM_LIMIT=10` 和 `OPENCLAW_DOCKER_ALL_SERVICE_LIMIT=7`；仅当 Docker 主机有更多余地时才调整 `OPENCLAW_DOCKER_ALL_WEIGHT_LIMIT` 或 `OPENCLAW_DOCKER_ALL_DOCKER_LIMIT`。运行器默认执行 Docker 预检，移除过时的 OpenClaw E2E 容器，每 30 秒打印一次状态，将成功的通道计时存储在 `.artifacts/docker-tests/lane-timings.json` 中，并使用这些计时在后续运行中优先启动较长的通道。使用 `OPENCLAW_DOCKER_ALL_DRY_RUN=1` 打印加权通道清单而不构建或运行 Docker，或使用 `node scripts/test-docker-all.mjs --plan-json` 打印所选通道、包/镜像需求和凭据的 CI 计划。
- `Package Acceptance` 是 GitHub 原生包关卡，用于验证“此可安装 tar 包是否作为产品有效工作？”。它从 `source=npm`、`source=ref`、`source=url` 或 `source=artifact` 中解析一个候选包，将其上传为 `package-under-test`，然后针对该确切的 tar 包运行可复用的 Docker E2E 通道，而不是重新打包所选的引用。`workflow_ref` 选择受信任的工作流/测试工具脚本，而 `package_ref` 选择在 `source=ref` 时要打包的源提交/分支/标签；这允许当前的验收逻辑验证较旧的受信任提交。配置文件按范围排序：`smoke` 是快速安装/渠道/代理以及网关/配置，`package` 是包/更新/插件契约，也是大多数 Parallels 包/更新覆盖范围的默认原生替代品，`product` 增加了 MCP 渠道、cron/子代理清理、OpenAI 网络搜索和 OpenWebUI，而 `full` 运行发布路径 Docker 块并配合 OpenWebUI。发布验证运行自定义包增量 (`bundled-channel-deps-compat plugins-offline`) 加上 Telegram 包 QA，因为发布路径 Docker 块已经覆盖了重叠的包/更新/插件通道。从产物生成的针对性 GitHub Docker 重新运行命令在可用时包含先前的包产物和准备好的镜像输入，因此失败的通道可以避免重新构建包和镜像。
- 构建和发布检查在 tsdown 之后运行 `scripts/check-cli-bootstrap-imports.mjs`。该守卫会遍历来自 `dist/entry.js` 和 `dist/cli/run-main.js` 的静态构建图，如果在命令分派之前的预分派启动导入了 Commander、prompt UI、undici 或 logging 等包依赖项，则会失败。打包的 CLI 冒烟测试还覆盖根帮助、入门帮助、doctor 帮助、状态、配置架构以及模型列表命令。
- Package Acceptance 传统兼容性上限为 `2026.4.25`（含 `2026.4.25-beta.*`）。在该截止点之前，测试框架仅容忍已发布包的元数据缺失：省略的私有 QA 库存条目、缺失的 `gateway install --wrapper`、从 tarball 派生的 git fixture 中缺失补丁文件、缺失的持久化 `update.channel`、传统插件安装记录位置、缺失的 marketplace 安装记录持久化，以及 `plugins update` 期间的配置元数据迁移。对于 `2026.4.25` 之后的包，这些路径均为严格失败。
- 容器冒烟运行器：`test:docker:openwebui`、`test:docker:onboard`、`test:docker:npm-onboard-channel-agent`、`test:docker:update-channel-switch`、`test:docker:session-runtime-context`、`test:docker:agents-delete-shared-workspace`、`test:docker:gateway-network`、`test:docker:browser-cdp-snapshot`、`test:docker:mcp-channels`、`test:docker:pi-bundle-mcp-tools`、`test:docker:cron-mcp-cleanup`、`test:docker:plugins`、`test:docker:plugin-update` 和 `test:docker:config-reload` 会启动一个或多个真实容器并验证更高级别的集成路径。

live-模型 Docker 运行器也仅绑定挂载所需的 CLI 认证主目录（当运行范围未缩小时则挂载所有支持的目录），然后在运行前将其复制到容器主目录中，以便外部 CLI OAuth 可以刷新令牌而无需更改主机认证存储：

- 直接模型：`pnpm test:docker:live-models`（脚本：`scripts/test-live-models-docker.sh`）
- ACP 绑定冒烟：`pnpm test:docker:live-acp-bind`（脚本：`scripts/test-live-acp-bind-docker.sh`；默认覆盖 Claude、Codex 和 Gemini，并通过 `pnpm test:docker:live-acp-bind:droid` 和 `pnpm test:docker:live-acp-bind:opencode` 严格覆盖 Droid/OpenCode）
- CLI 后端冒烟：`pnpm test:docker:live-cli-backend`（脚本：`scripts/test-live-cli-backend-docker.sh`）
- Codex 应用服务器框架冒烟：`pnpm test:docker:live-codex-harness`（脚本：`scripts/test-live-codex-harness-docker.sh`）
- Gateway(网关) + 开发代理：`pnpm test:docker:live-gateway`（脚本：`scripts/test-live-gateway-models-docker.sh`）
- 可观测性冒烟测试：`pnpm qa:otel:smoke` 是一个私有的 QA 源代码检出通道。它有意不包含在包 Docker 发布通道中，因为 npm 压缩包中省略了 QA Lab。
- Open WebUI 现场冒烟测试：`pnpm test:docker:openwebui`（脚本：`scripts/e2e/openwebui-docker.sh`）
- 新手引导向导（TTY，完整脚手架）：`pnpm test:docker:onboard`（脚本：`scripts/e2e/onboard-docker.sh`）
- Npm 压缩包新手引导/渠道/代理冒烟测试：`pnpm test:docker:npm-onboard-channel-agent` 在 Docker 中全局安装打包好的 OpenClaw 压缩包，通过 env-ref 新手引导配置 OpenAI 并默认配置 Telegram，验证 doctor 修复已激活的插件运行时依赖，并运行一次模拟的 OpenAI 代理轮次。使用 `OPENCLAW_CURRENT_PACKAGE_TGZ=/path/to/openclaw-*.tgz` 重用预构建的压缩包，使用 `OPENCLAW_NPM_ONBOARD_HOST_BUILD=0` 跳过主机重建，或使用 `OPENCLAW_NPM_ONBOARD_CHANNEL=discord` 切换渠道。
- 更新渠道切换冒烟测试：`pnpm test:docker:update-channel-switch` 在 Docker 中全局安装打包好的 OpenClaw 压缩包，从包 `stable` 切换到 git `dev`，验证持久化的渠道和插件更新后的工作情况，然后切换回包 `stable` 并检查更新状态。
- 会话运行时上下文冒烟测试：`pnpm test:docker:session-runtime-context` 验证隐藏的运行时上下文记录持久化以及 doctor 对受影响的重复提示重写分支的修复。
- Bun 全局安装冒烟测试：`bash scripts/e2e/bun-global-install-smoke.sh` 打包当前树，在隔离的主目录中使用 `bun install -g` 安装它，并验证 `openclaw infer image providers --json` 返回捆绑的图像提供商而不是挂起。使用 `OPENCLAW_BUN_GLOBAL_SMOKE_PACKAGE_TGZ=/path/to/openclaw-*.tgz` 重用预构建的压缩包，使用 `OPENCLAW_BUN_GLOBAL_SMOKE_HOST_BUILD=0` 跳过主机构建，或使用 `OPENCLAW_BUN_GLOBAL_SMOKE_DIST_IMAGE=openclaw-dockerfile-smoke:local` 从构建的 Docker 图像中复制 `dist/`。
- 安装程序 Docker 冒烟测试：`bash scripts/test-install-sh-docker.sh` 在其 root、update 和 direct-npm 容器之间共享一个 npm 缓存。更新冒烟测试默认将 npm `latest` 作为升级到候选 tarball 之前的稳定基线。可以在本地使用 `OPENCLAW_INSTALL_SMOKE_UPDATE_BASELINE=2026.4.22` 覆盖，或者在 GitHub 上使用 Install Smoke 工作流的 `update_baseline_version` 输入覆盖。非 root 安装程序检查保持隔离的 npm 缓存，以便 root 拥有的缓存条目不会掩盖用户本地的安装行为。设置 `OPENCLAW_INSTALL_SMOKE_NPM_CACHE_DIR=/path/to/cache` 以在本地重新运行时重用 root/update/direct-npm 缓存。
- Install Smoke CI 使用 `OPENCLAW_INSTALL_SMOKE_SKIP_NPM_GLOBAL=1` 跳过重复的 direct-npm 全局更新；当需要 direct `npm install -g` 覆盖率时，在本地运行不带该环境变量的脚本。
- 代理删除共享工作区 CLI 冒烟测试：`pnpm test:docker:agents-delete-shared-workspace`（脚本：`scripts/e2e/agents-delete-shared-workspace-docker.sh`）默认构建根 Dockerfile 镜像，在隔离的容器主目录中用一个工作区启动两个代理，运行 `agents delete --json`，并验证有效的 JSON 以及保留的工作区行为。使用 `OPENCLAW_AGENTS_DELETE_SHARED_WORKSPACE_E2E_IMAGE=openclaw-dockerfile-smoke:local OPENCLAW_AGENTS_DELETE_SHARED_WORKSPACE_E2E_SKIP_BUILD=1` 重用 install-smoke 镜像。
- Gateway 网络测试（两个容器，WS auth + health）：`pnpm test:docker:gateway-network`（脚本：`scripts/e2e/gateway-network-docker.sh`）
- 浏览器 CDP 快照冒烟测试：`pnpm test:docker:browser-cdp-snapshot`（脚本：`scripts/e2e/browser-cdp-snapshot-docker.sh`）构建源 E2E 镜像和 Chromium 层，使用原始 CDP 启动 Chromium，运行 `browser doctor --deep`，并验证 CDP 角色快照是否涵盖链接 URL、光标提升的可点击项、iframe 引用和帧元数据。
- OpenAI Responses web_search 最小推理回归测试：`pnpm test:docker:openai-web-search-minimal`（脚本：`scripts/e2e/openai-web-search-minimal-docker.sh`）通过 Gateway 运行模拟的 OpenAI 服务器，验证 `web_search` 将 `reasoning.effort` 从 `minimal` 提升到 `low`，然后强制提供商架构拒绝，并检查原始详细信息是否出现在 Gateway 日志中。
- MCP 渠道桥接（已配置的 Gateway(网关) + stdio 桥接 + 原始 Claude 通知帧冒烟测试）：`pnpm test:docker:mcp-channels`（脚本：`scripts/e2e/mcp-channels-docker.sh`）
- Pi 捆绑 MCP 工具（真实的 stdio MCP 服务器 + 嵌入式 Pi 配置文件允许/拒绝冒烟测试）：`pnpm test:docker:pi-bundle-mcp-tools`（脚本：`scripts/e2e/pi-bundle-mcp-tools-docker.sh`）
- Cron/子代理 MCP 清理（真实的 Gateway(网关) + 在隔离的 cron 和一次性子代理运行后的 stdio MCP 子进程拆除）：`pnpm test:docker:cron-mcp-cleanup`（脚本：`scripts/e2e/cron-mcp-cleanup-docker.sh`）
- 插件（安装冒烟测试、ClawHub 安装/卸载、市场更新以及 Claude 捆绑包启用/检查）：`pnpm test:docker:plugins`（脚本：`scripts/e2e/plugins-docker.sh`）
  设置 `OPENCLAW_PLUGINS_E2E_CLAWHUB=0` 以跳过实时 ClawHub 块，或者使用 `OPENCLAW_PLUGINS_E2E_CLAWHUB_SPEC` 和 `OPENCLAW_PLUGINS_E2E_CLAWHUB_ID` 覆盖默认包。
- 插件更新未更改冒烟测试：`pnpm test:docker:plugin-update`（脚本：`scripts/e2e/plugin-update-unchanged-docker.sh`）
- 配置重新加载元数据冒烟测试：`pnpm test:docker:config-reload`（脚本：`scripts/e2e/config-reload-source-docker.sh`）
- 捆绑的插件运行时依赖项：`pnpm test:docker:bundled-channel-deps` 默认情况下构建一个小的 Docker 运行器镜像，在主机上构建并打包 OpenClaw 一次，然后将该 tarball 挂载到每个 Linux 安装场景中。使用 `OPENCLAW_SKIP_DOCKER_BUILD=1` 重用该镜像，在新的本地构建后使用 `OPENCLAW_BUNDLED_CHANNEL_HOST_BUILD=0` 跳过主机重建，或者使用 `OPENCLAW_CURRENT_PACKAGE_TGZ=/path/to/openclaw-*.tgz` 指向现有的 tarball。完整的 Docker 聚合和发布路径 `bundled-channels` 块预先打包此 tarball 一次，然后将捆绑的渠道检查分片到独立通道中，包括针对 Telegram、Discord、Slack、Feishu、memory-lancedb 和 ACPX 的单独更新通道。传统的 `plugins-integrations` 块仍然是手动重新运行的聚合别名。直接运行捆绑通道时，使用 `OPENCLAW_BUNDLED_CHANNELS=telegram,slack` 缩小渠道矩阵，或使用 `OPENCLAW_BUNDLED_CHANNEL_UPDATE_TARGETS=telegram,acpx` 缩小更新场景。该通道还验证 `channels.<id>.enabled=false` 和 `plugins.entries.<id>.enabled=false` 抑制 doctor/runtime-dependency 修复。
- 在迭代过程中通过禁用不相关的场景来缩小捆绑的插件运行时依赖，例如：
  `OPENCLAW_BUNDLED_CHANNEL_SCENARIOS=0 OPENCLAW_BUNDLED_CHANNEL_UPDATE_SCENARIO=0 OPENCLAW_BUNDLED_CHANNEL_ROOT_OWNED_SCENARIO=0 OPENCLAW_BUNDLED_CHANNEL_SETUP_ENTRY_SCENARIO=0 pnpm test:docker:bundled-channel-deps`。

要手动预构建并重用共享的功能镜像：

```bash
OPENCLAW_DOCKER_E2E_IMAGE=openclaw-docker-e2e-functional:local pnpm test:docker:e2e-build
OPENCLAW_DOCKER_E2E_IMAGE=openclaw-docker-e2e-functional:local OPENCLAW_SKIP_DOCKER_BUILD=1 pnpm test:docker:mcp-channels
```

特定于套件的镜像覆盖（如 `OPENCLAW_GATEWAY_NETWORK_E2E_IMAGE`）在设置时仍然优先。当 `OPENCLAW_SKIP_DOCKER_BUILD=1` 指向远程共享镜像时，如果本地尚不存在，脚本会将其拉取。QR 和安装程序 Docker 测试保留自己的 Dockerfile，因为它们验证的是包/安装行为，而不是共享的构建应用程序运行时。

live-模型 Docker 运行器也会以只读方式绑定挂载当前的检出代码，并将其暂存到容器内部的临时工作目录中。这保持了运行时镜像的轻量，同时仍然针对您的确切的本地源代码/配置运行 Vitest。暂存步骤会跳过大型本地缓存和应用程序构建输出，例如 `.pnpm-store`、`.worktrees`、`__openclaw_vitest__` 和应用程序本地的 `.build` 或 Gradle 输出目录，这样 Docker 实时运行就不会花费几分钟的时间来复制特定于机器的构件。它们还设置了 `OPENCLAW_SKIP_CHANNELS=1`，以便 gateway 实时探测不会在容器内启动真正的 Telegram/Telegram/等渠道工作进程。`test:docker:live-models` 仍然运行 `pnpm test:live`，因此当您需要缩小或排除该 Discord 通道中的 gateway 实时覆盖范围时，也请传递 `OPENCLAW_LIVE_GATEWAY_*`。`test:docker:openwebui` 是更高级别的兼容性冒烟测试：它启动一个启用了 Docker 兼容 HTTP 端点的 OpenClaw gateway 容器，针对该 gateway 启动一个固定的 Open WebUI 容器，通过 Open WebUI 登录，验证 `/api/models` 暴露了 `openclaw/default`，然后通过 Open WebUI 的 `/api/chat/completions` 代理发送真正的聊天请求。第一次运行可能会明显较慢，因为 OpenAI 可能需要拉取 Open WebUI 镜像，而且 Open WebUI 可能需要完成自己的冷启动设置。该通道需要一个可用的实时模型密钥，而 `OPENCLAW_PROFILE_FILE`（默认为 `~/.profile`）是在 Docker 化运行中提供它的主要方式。成功的运行会打印一个小型的 JSON 载荷，如 `{ "ok": true, "模型": "openclaw/default", ... }`。`test:docker:mcp-channels` 是有意确定性的，不需要真正的 Telegram、Discord 或 iMessage 帐户。它会启动一个已设定种子的 Gateway(网关) 容器，启动第二个生成 `openclaw mcp serve` 的容器，然后通过真正的 stdio MCP 桥接验证路由的对话发现、脚本读取、附件元数据、实时事件队列行为、出站发送路由以及 Claude 风格的渠道 + 权限通知。通知检查直接检查原始 stdio MCP 帧，因此冒烟测试验证的是桥接实际发射的内容，而不仅仅是特定客户端 SDK 偶然呈现的内容。`test:docker:pi-bundle-mcp-tools` 是确定性的，不需要实时模型密钥。它构建仓库 Docker 镜像，在容器内启动一个真正的 stdio MCP 探测服务器，通过嵌入式 Pi 包 MCP 运行时具体化该服务器，执行工具，然后验证 `coding` 和 `messaging` 保留 `bundle-mcp` 工具，而 `minimal` 和 `tools.deny: ["bundle-mcp"]` 过滤它们。`test:docker:cron-mcp-cleanup` 是确定性的，不需要实时模型密钥。它启动一个带有真正 stdio MCP 探测服务器的已设定种子的 Gateway(网关)，运行一个隔离的 cron 轮次和一个 `/subagents spawn` 一次性子轮次，然后验证 MCP 子进程在每次运行后退出。

手动 ACP 纯文本线程冒烟测试（非 CI）：

- `bun scripts/dev/discord-acp-plain-language-smoke.ts --channel <discord-channel-id> ...`
- 请保留此脚本用于回归/调试工作流。ACP 线程路由验证可能再次需要它，因此请勿删除。

有用的环境变量：

- `OPENCLAW_CONFIG_DIR=...`（默认：`~/.openclaw`）挂载到 `/home/node/.openclaw`
- `OPENCLAW_WORKSPACE_DIR=...`（默认：`~/.openclaw/workspace`）挂载到 `/home/node/.openclaw/workspace`
- `OPENCLAW_PROFILE_FILE=...`（默认：`~/.profile`）挂载到 `/home/node/.profile` 并在运行测试之前 source
- `OPENCLAW_DOCKER_PROFILE_ENV_ONLY=1` 仅验证从 `OPENCLAW_PROFILE_FILE` source 的环境变量，使用临时配置/工作区目录且不挂载外部 CLI 身份验证
- `OPENCLAW_DOCKER_CLI_TOOLS_DIR=...`（默认：`~/.cache/openclaw/docker-cli-tools`）挂载到 `/home/node/.npm-global` 用于 CLI 内部的缓存 Docker 安装
- `$HOME` 下的外部 CLI 身份验证目录/文件以只读方式挂载到 `/host-auth...` 下，然后在测试开始前复制到 `/home/node/...`
  - 默认目录：`.minimax`
  - 默认文件：`~/.codex/auth.json`, `~/.codex/config.toml`, `.claude.json`, `~/.claude/.credentials.json`, `~/.claude/settings.json`, `~/.claude/settings.local.json`
  - 缩小的提供商运行仅挂载从 `OPENCLAW_LIVE_PROVIDERS` / `OPENCLAW_LIVE_GATEWAY_PROVIDERS` 推断出的所需目录/文件
  - 使用 `OPENCLAW_DOCKER_AUTH_DIRS=all`、`OPENCLAW_DOCKER_AUTH_DIRS=none` 或逗号列表（如 `OPENCLAW_DOCKER_AUTH_DIRS=.claude,.codex`）手动覆盖
- `OPENCLAW_LIVE_GATEWAY_MODELS=...` / `OPENCLAW_LIVE_MODELS=...` 以缩小运行范围
- `OPENCLAW_LIVE_GATEWAY_PROVIDERS=...` / `OPENCLAW_LIVE_PROVIDERS=...` 以在容器内过滤提供商
- `OPENCLAW_SKIP_DOCKER_BUILD=1` 重用现有的 `openclaw:local-live` 镜像，用于不需要重新构建的重新运行
- `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` 确保凭据来自配置文件存储（而非环境变量）
- `OPENCLAW_OPENWEBUI_MODEL=...` 选择网关为 Open WebUI 冒烟测试暴露的模型
- `OPENCLAW_OPENWEBUI_PROMPT=...` 用于覆盖 Open WebUI 冒烟测试使用的 nonce 检查提示
- `OPENWEBUI_IMAGE=...` 用于覆盖固定的 Open WebUI 镜像标签

## 文档健全性检查

在编辑文档后运行文档检查：`pnpm check:docs`。
当您还需要页面内标题检查时，运行完整的 Mintlify 锚点验证：`pnpm docs:check-links:anchors`。

## 离线回归（CI 安全）

这些是没有真实提供商的“真实管道”回归测试：

- Gateway 工具调用（模拟 OpenAI，真实网关 + 代理循环）：`src/gateway/gateway.test.ts`（案例：“通过网关代理循环端到端运行模拟 OpenAI 工具调用”）
- Gateway 向导（WS `wizard.start`/`wizard.next`，写入配置 + 强制执行身份验证）：`src/gateway/gateway.test.ts`（案例：“通过 ws 运行向导并写入身份验证令牌配置”）

## Agent 可靠性评估（Skills）

我们已经有几个类似“agent 可靠性评估”的 CI 安全测试：

- 通过真实网关 + 代理循环进行模拟工具调用（`src/gateway/gateway.test.ts`）。
- 验证会话连接和配置效果的端到端向导流程（`src/gateway/gateway.test.ts`）。

对于 Skills 仍然缺失的内容（参见 [Skills](/zh/tools/skills)）：

- **决策：** 当 Skills 在提示中被列出时，agent 是否会选择正确的 Skill（或避免不相关的 Skill）？
- **合规性：** agent 是否在使用前阅读 `SKILL.md` 并遵循所需的步骤/参数？
- **工作流契约：** 断言工具顺序、会话历史延续和沙箱边界的多轮场景。

未来的评估应首先保持确定性：

- 使用模拟提供商断言工具调用 + 顺序、Skill 文件读取和会话连接的场景运行器。
- 一小套专注于 Skills 的场景（使用 vs 避免、门控、提示注入）。
- 可选的实时评估（选择性加入、环境门控）仅在 CI 安全套件就位后进行。

## 契约测试（插件和渠道形状）

合约测试验证每个注册的插件和渠道是否符合其接口合约。它们遍历所有发现的插件并运行一系列形状和行为断言。默认的 `pnpm test` 单元通道有意跳过这些共享的接缝和冒烟测试文件；当您涉及共享的渠道或提供商接口时，请显式运行合约命令。

### 命令

- 所有合约：`pnpm test:contracts`
- 仅渠道合约：`pnpm test:contracts:channels`
- 仅提供商合约：`pnpm test:contracts:plugins`

### 渠道合约

位于 `src/channels/plugins/contracts/*.contract.test.ts`：

- **plugin** - 基本插件形状（id、name、capabilities）
- **setup** - 设置向导合约
- **会话-binding** - 会话绑定行为
- **outbound-payload** - 消息负载结构
- **inbound** - 入站消息处理
- **actions** - 渠道操作处理器
- **threading** - 线程 ID 处理
- **directory** - 目录/花名册 API
- **group-policy** - 群组策略执行

### 提供商状态合约

位于 `src/plugins/contracts/*.contract.test.ts`。

- **status** - 渠道状态探测
- **registry** - 插件注册表形状

### 提供商合约

位于 `src/plugins/contracts/*.contract.test.ts`：

- **auth** - 认证流程合约
- **auth-choice** - 认证选择/选中
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

当您修复在生产环境中发现的提供商/模型问题时：

- 如果可能，添加一个 CI 安全的回归测试（模拟/存根提供商，或捕获确切的请求形状转换）
- 如果它本质上仅适用于生产环境（速率限制、身份验证策略），请保持生产环境测试的范围狭窄，并通过环境变量选择加入
- 优先定位能捕获该 bug 的最小层：
  - 提供商请求转换/回放 bug → 直接模型测试
  - 网关会话/历史记录/工具流水线 bug → 网关生产环境冒烟测试或 CI 安全的网关模拟测试
- SecretRef 遍历防护：
  - `src/secrets/exec-secret-ref-id-parity.test.ts` 从注册表元数据 (`listSecretTargetRegistryEntries()`) 中为每个 SecretRef 类派生一个采样目标，然后断言遍历段执行 id 被拒绝。
  - 如果在 `src/secrets/target-registry-data.ts` 中添加了新的 `includeInPlan` SecretRef 目标系列，请在该测试中更新 `classifyTargetClass`。该测试故意在未分类的目标 id 上失败，以便不会静默跳过新的类。

## 相关

- [Testing live](/zh/help/testing-live)
- [CI](/zh/ci)
