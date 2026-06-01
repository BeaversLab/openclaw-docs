---
summary: "Docker测试套件：单元/e2e/live 套件、Docker 运行器以及每个测试涵盖的内容"
read_when:
  - Running tests locally or in CI
  - Adding regressions for model/provider bugs
  - Debugging gateway + agent behavior
title: "Testing"
---

OpenClaw 拥有三个 Vitest 测试套件（单元/集成、e2e、live）和少量的 Docker 运行器。本文档是一份“我们如何测试”指南：

- 每个套件涵盖的内容（以及它特意*不*涵盖的内容）。
- 针对常见工作流（本地、预推送、调试）运行哪些命令。
- Live 测试如何发现凭证并选择模型/提供商。
- 如何为现实世界的模型/提供商问题添加回归测试。

<Note>
**QA 技术栈 (qa-lab, qa-渠道, live transport lanes)** 在其他文档中单独说明：

- [QA 概述](/zh/concepts/qa-e2e-automationMatrix) - 架构、命令界面、场景编写。
- [Matrix QA](/zh/concepts/qa-matrix) - `pnpm openclaw qa matrix` 的参考文档。
- [QA 渠道](/zh/channels/qa-channelDocker) - 由仓库支持的场景使用的合成传输插件。

本页面涵盖运行常规测试套件和 Docker/Parallels 运行器。下面的特定 QA 运行器部分 ([QA-specific runners](#qa-specific-runners)) 列出了具体的 `qa` 调用，并指回上述参考文档。

</Note>

## 快速开始

大多数时候：

- 完整门控（推送前预期执行）：`pnpm build && pnpm check && pnpm check:test-types && pnpm test`
- 在配置较高的机器上进行更快的本地完整套件运行：`pnpm test:max`
- 直接运行 Vitest 监视循环：`pnpm test:watch`
- 直接的文件定位现在也支持扩展/渠道路径：`pnpm test extensions/discord/src/monitor/message-handler.preflight.test.ts`
- 当您正在处理单个失败时，请优先进行针对性运行。
- 基于 Docker 的 QA 站点：Docker`pnpm qa:lab:up`
- 基于 Linux 虚拟机的 QA 路线：Linux`pnpm openclaw qa suite --runner multipass --scenario channel-chat-baseline`

当您修改测试或需要额外的信心时：

- 覆盖率门控：`pnpm test:coverage`
- E2E 套件：`pnpm test:e2e`

调试真实提供商/模型时（需要真实凭证）：

- Live 套件（模型 + 网关工具/镜像探测）：`pnpm test:live`
- 静默定位单个 live 文件：`pnpm test:live -- src/agents/models.profiles.live.test.ts`
- 运行时性能报告：使用 `OpenClaw Performance` 调度并附带 `live_openai_candidate=true`，用于真实的 `openai/gpt-5.5` 代理轮次，或使用 `deep_profile=true` 获取 Kova CPU/堆/跟踪产物。每日定时运行会在配置 `CLAWGRIT_REPORTS_TOKEN`CLI 时将 mock-提供商、deep-profile 和 GPT 5.5 车道产物发布到 `openclaw/clawgrit-reports`。mock-提供商 报告还包括源码级别的网关启动、内存、插件压力、重复的假模型 hello-loop 以及 CLI 启动数据。
- Docker 实时模型扫描：Docker`pnpm test:docker:live-models`
  - 每个选定的模型现在都会运行一个文本轮次以及一个小型的文件读取风格探测。元数据中宣传支持 `image` 输入的模型还会运行一个微小的图像轮次。在隔离提供商故障时，使用 `OPENCLAW_LIVE_MODEL_FILE_PROBE=0` 或 `OPENCLAW_LIVE_MODEL_IMAGE_PROBE=0` 禁用额外的探测。
  - CI 覆盖范围：每日 `OpenClaw Scheduled Live And E2E Checks` 和手动 `OpenClaw Release Checks` 都使用 `include_live_suites: true`Docker 调用可复用的 live/E2E 工作流，其中包括按提供商分片的独立 Docker 实时模型矩阵作业。
  - 对于有针对性的 CI 重新运行，请调度 `OpenClaw Live And E2E Checks (Reusable)` 并附带 `include_live_suites: true` 和 `live_models_only: true`。
  - 将新的高信噪比提供商机密添加到 `scripts/ci-hydrate-live-auth.sh` 以及 `.github/workflows/openclaw-live-and-e2e-checks-reusable.yml` 及其定时/发布调用器中。
- 原生 Codex 绑定聊天冒烟测试：`pnpm test:docker:live-codex-bind`
  - 针对 Codex 应用服务器路径运行 Docker 实时车道，使用 DockerSlack`/codex bind` 绑定合成的 Slack 私信，执行 `/codex fast` 和 `/codex permissions`，然后验证普通回复和图像附件是否通过原生插件绑定路由，而不是通过 ACP。
- Codex 应用服务器工具冒烟测试：`pnpm test:docker:live-codex-harness`
  - 通过插件拥有的 Codex 应用服务器 harness 运行网关代理回合，验证 `/codex status` 和 `/codex models`，并默认测试 image、cron MCP、子代理 和 Guardian 探针。在隔离其他 Codex 应用服务器故障时，使用 `OPENCLAW_LIVE_CODEX_HARNESS_SUBAGENT_PROBE=0` 禁用子代理探针。若要进行专注的子代理检查，请禁用其他探针：`OPENCLAW_LIVE_CODEX_HARNESS_IMAGE_PROBE=0 OPENCLAW_LIVE_CODEX_HARNESS_MCP_PROBE=0 OPENCLAW_LIVE_CODEX_HARNESS_GUARDIAN_PROBE=0 OPENCLAW_LIVE_CODEX_HARNESS_SUBAGENT_PROBE=1 pnpm test:docker:live-codex-harness`。除非设置了 `OPENCLAW_LIVE_CODEX_HARNESS_SUBAGENT_ONLY=0`，否则此操作将在子代理探针后退出。
- Codex 按需安装冒烟测试：`pnpm test:docker:codex-on-demand`
  - 在 Docker 中安装打包好的 OpenClaw tarball，运行 OpenAI API 密钥
    新手引导，并验证 Codex 插件和 OpenClawDockerOpenAIAPI`@openai/codex`npm 依赖项
    是否已按需下载到受管理的 npm 项目根目录中。
- 实时插件工具依赖冒烟测试：`pnpm test:docker:live-plugin-tool`
  - 打包一个具有真实 `slugify` 依赖项的装置插件，通过
    `npm-pack:`npmOpenAI 安装它，验证受管理的 npm 项目根目录下的依赖项，
    然后请求一个实时的 OpenAI 模型调用该插件工具并返回隐藏的
    slug。
- Crestodian 救援命令冒烟测试：`pnpm test:live:crestodian-rescue-channel`
  - 针对消息渠道救援命令表面的可选双重检查。它演练 `/crestodian status`，排队持久的模型更改，回复 `/crestodian yes`，并验证审计/配置写入路径。
- Crestodian 规划器 Docker 冒烟测试：`pnpm test:docker:crestodian-planner`
  - 在 `PATH` 上运行 Crestodian 于无配置容器中，其中包含一个假的 Claude CLI，并验证模糊规划器回退是否转换为已审计的类型化配置写入。
- Crestodian 首次运行 Docker 冒烟测试：`pnpm test:docker:crestodian-first-run`
  - 从一个空的 OpenClaw 状态目录开始，验证现代化的 Crestodian 入口点，应用 setup/模型/agent/Discord 插件和 SecretRef 写入，验证配置，并验证审计条目。QA Lab 中也通过 `pnpm openclaw qa suite --scenario crestodian-ring-zero-setup` 覆盖了相同的 Ring 0 设置路径。
- Moonshot/Kimi 成本冒烟测试：设置 `MOONSHOT_API_KEY` 后，运行 `openclaw models list --provider moonshot --json`，然后针对 `moonshot/kimi-k2.6` 运行一个隔离的 `openclaw agent --local --session-id live-kimi-cost --message 'Reply exactly: KIMI_LIVE_OK' --thinking off --json`。验证 JSON 报告了 Moonshot/K2.6，并且助手记录存储了标准化的 `usage.cost`。

<Tip>当您只需要一个失败的案例时，建议使用下述 allowlist 环境变量来缩小 live 测试的范围。</Tip>

## QA 专用运行器

当您需要 QA 实验室级别的真实性时，这些命令位于主测试套件之旁：

CI 在专用工作流中运行 QA Lab。Agentic parity 嵌套在 `QA-Lab - All Lanes` 和发布验证下，而不是独立的 PR 工作流。广泛的验证应使用带有 `rerun_group=qa-parity` 或 release-checks QA 组的 `Full Release Validation`。稳定/默认的发布检查将详尽的 live/Docker soak 保留在 `run_release_soak=true` 之后；`full` 配置文件会强制开启 soak。`QA-Lab - All Lanes` 每晚在 `main` 上运行，并从手动触发运行，包括 mock parity lane、live Matrix lane、Convex 托管的 live Telegram lane 和 Convex 托管的 live Discord lane 作为并行作业。计划的 QA 和发布检查会显式传递 Matrix `--profile fast`，而 Matrix CLI 和手动工作流输入默认保持为 `all`；手动触发可以将 `all` 分片为 `transport`、`media`、`e2ee-smoke`、`e2ee-deep` 和 `e2ee-cli` 作业。`OpenClaw Release Checks` 在发布批准之前运行 parity 以及快速 Matrix 和 Telegram lanes，使用 `mock-openai/gpt-5.5` 进行发布传输检查，以保持确定性并避免正常的提供商插件启动。这些 live transport 网关禁用内存搜索；内存行为仍由 QA parity 套件覆盖。

完整的发布 live media 分片使用 `ghcr.io/openclaw/openclaw-live-media-runner:ubuntu-24.04`，它已经包含了 `ffmpeg` 和 `ffprobe`。Docker live 模型/backend 分片使用共享的 `ghcr.io/openclaw/openclaw-live-test:<sha>` 镜像，该镜像为每个选定的提交构建一次，然后使用 `OPENCLAW_SKIP_DOCKER_BUILD=1` 拉取它，而不是在每个分片内部重新构建。

- `pnpm openclaw qa suite`
  - 直接在主机上运行基于仓库的 QA 场景。
  - 默认情况下，使用隔离的 gateway worker 并行运行多个选定的场景。`qa-channel` 默认并发数为 4（受选定场景数量限制）。使用 `--concurrency <count>` 调整 worker 数量，或使用 `--concurrency 1` 启用较旧的串行通道。
  - 当任何场景失败时，以非零退出码退出。当您需要产物且不希望因失败而退出时，请使用 `--allow-failures`。
  - 支持提供商模式 `live-frontier`、`mock-openai` 和 `aimock`。`aimock` 会启动一个本地由 AIMock 支持的提供商服务器，用于实验性的 fixture 和协议模拟覆盖，而无需替换具有场景感知能力的 `mock-openai` 通道。
- `pnpm openclaw qa coverage --match <query>`
  - 搜索场景 ID、标题、界面、覆盖率 ID、文档引用、代码引用、
    插件和提供商要求，然后打印匹配的套件目标。
  - 当您知道受影响的行为或文件路径但不知道最小的场景时，请在 QA Lab 运行前使用此工具。它仅作为建议；仍需根据被更改的行为选择 mock、
    live、Multipass、Matrix 或传输验证。
- `pnpm test:plugins:kitchen-sink-live`
  - 通过 QA Lab 运行实时的 OpenAI Kitchen Sink 插件测试套件。它安装外部的 Kitchen Sink 包，验证插件 SDK 表面清单，探测 `/healthz` 和 `/readyz`，记录网关 CPU/RSS 证据，运行一次实时的 OpenAI 轮次，并检查对抗性诊断。需要实时的 OpenAI 身份验证，例如 `OPENAI_API_KEY`。在已水合的 Testbox 会话中，当存在 `openclaw-testbox-env` 辅助工具时，它会自动获取 Testbox live-auth 配置文件。
- `pnpm test:gateway:cpu-scenarios`
  - 运行网关启动基准测试以及一个小型的模拟 QA Lab 场景包 (`channel-chat-baseline`，`memory-failure-fallback`，`gateway-restart-inflight-run`)，并在 `.artifacts/gateway-cpu-scenarios/` 下写入综合 CPU 观察摘要。
  - 默认情况下仅标记持续的高 CPU 观察 (`--cpu-core-warn` 加上 `--hot-wall-warn-ms`)，因此短暂的启动爆发会被记录为指标，而不会看起来像持续数分钟的网关挂起回归。
  - 使用已构建的 `dist` 构件；当检出目录尚未包含新的运行时输出时，请先运行构建。
- `pnpm openclaw qa suite --runner multipass`
  - 在一次性 Multipass Linux 虚拟机内运行相同的 QA 套件。
  - 保持与主机上的 `qa suite` 相同的场景选择行为。
  - 重用与 `qa suite` 相同的提供商/模型选择标志。
  - 实时运行转发对访客切实可行的支持型 QA 身份验证输入：基于环境的提供商密钥、QA live 提供商配置路径，以及（如果存在）`CODEX_HOME`。
  - 输出目录必须保留在仓库根目录下，以便访客可以通过挂载的工作区写回数据。
  - 在 `.artifacts/qa-e2e/...` 下写入正常的 QA 报告和摘要以及 Multipass 日志。
- `pnpm qa:lab:up`
  - 启动 Docker 支持的 QA 站点，以便进行操作员式的 QA 工作。
- `pnpm test:docker:npm-onboard-channel-agent`
  - 从当前检出构建 npm 压缩包，在 Docker 中全局安装，运行非交互式 OpenAI API 密钥新手引导，默认配置 Telegram，验证打包的插件运行时在无需启动依赖修复的情况下加载，运行 doctor，并在模拟的 OpenAI 端点上运行一次本地 agent 回合。
  - 使用 `OPENCLAW_NPM_ONBOARD_CHANNEL=discord` 通过 Discord 运行相同的打包安装通道。
- `pnpm test:docker:session-runtime-context`
  - 针对嵌入式运行时上下文记录运行确定性构建应用 Docker 冒烟测试。它验证隐藏的 OpenClaw 运行时上下文是否作为非显示自定义消息持久化，而不是泄漏到可见的用户回合中，然后植入受影响的损坏会话 JSONL 并验证 `openclaw doctor --fix` 是否将其备份后重写为活动分支。
- `pnpm test:docker:npm-telegram-live`
  - 在 OpenClaw 中安装 Docker 软件包候选版本，运行已安装软件包的新手引导，通过已安装的 Telegram 配置 CLI，然后重用实时 Telegram QA 通道，并将该已安装软件包作为 SUT Gateway(网关)。
  - 该包装器仅从检出版本挂载 `qa-lab` 约束源代码；已安装软件包拥有 `dist`、`openclaw/plugin-sdk` 和捆绑的插件运行时，因此该通道不会将当前检出的插件混合到被测软件包中。
  - 默认为 `OPENCLAW_NPM_TELEGRAM_PACKAGE_SPEC=openclaw@beta`；设置 `OPENCLAW_NPM_TELEGRAM_PACKAGE_TGZ=/path/to/openclaw-current.tgz` 或 `OPENCLAW_CURRENT_PACKAGE_TGZ` 以测试已解析的本地压缩包，而不是从注册表安装。
  - 使用与 `pnpm openclaw qa telegram` 相同的 Telegram 环境凭据或 Convex 凭据源。对于 CI/发布自动化，请设置 `OPENCLAW_NPM_TELEGRAM_CREDENTIAL_SOURCE=convex` 加上 `OPENCLAW_QA_CONVEX_SITE_URL` 和角色密钥。如果 CI 中存在 `OPENCLAW_QA_CONVEX_SITE_URL` 和 Convex 角色密钥，Docker 包装器会自动选择 Convex。
  - 包装器在 Telegram 构建/安装工作之前，会验证主机上的 Docker 或 Convex 凭据环境。仅当特意调试凭据前设置时，才设置 `OPENCLAW_NPM_TELEGRAM_SKIP_CREDENTIAL_PREFLIGHT=1`。
  - `OPENCLAW_NPM_TELEGRAM_CREDENTIAL_ROLE=ci|maintainer` 会覆盖此泳道的共享 `OPENCLAW_QA_CREDENTIAL_ROLE`。
  - GitHub Actions 将此泳道公开为手动维护者工作流 `NPM Telegram Beta E2E`。它不在合并时运行。该工作流使用 `qa-live-shared` 环境和 Convex CI 凭据租约。
- GitHub Actions 还公开了 `Package Acceptance`，用于针对单个候选包进行产品验证。它接受受信任的引用、已发布的 npm 规范、HTTPS tarball URL 加 SHA-256，或来自另一次运行的 tarball 构件，将标准化的 `openclaw-current.tgz` 上传为 `package-under-test`，然后使用冒烟、包、产品、完整或自定义泳道配置文件运行现有的 Docker E2E 调度程序。设置 `telegram_mode=mock-openai` 或 `live-frontier` 以针对同一个 `package-under-test` 构件运行 Telegram QA 工作流。
  - 最新的 Beta 产品验证：

```bash
gh workflow run package-acceptance.yml --ref main \
  -f source=npm \
  -f package_spec=openclaw@beta \
  -f suite_profile=product \
  -f telegram_mode=mock-openai
```

- 确切的 tarball URL 验证需要摘要并使用公共 URL 安全策略：

```bash
gh workflow run package-acceptance.yml --ref main \
  -f source=url \
  -f package_url=https://registry.npmjs.org/openclaw/-/openclaw-VERSION.tgz \
  -f package_sha256=<sha256> \
  -f suite_profile=package
```

- 企业/私有 tarball 镜像使用显式的受信任源策略：

```bash
gh workflow run package-acceptance.yml --ref main \
  -f source=trusted-url \
  -f trusted_source_id=enterprise-artifactory \
  -f package_url=https://packages.example.internal:8443/artifactory/openclaw/openclaw-VERSION.tgz \
  -f package_sha256=<sha256> \
  -f suite_profile=package
```

`source=trusted-url` 从受信任的工作流引用读取 `.github/package-trusted-sources.json`，不接受 URL 凭据或工作流输入的专用网络绕过。如果命名策略声明了 Bearer 认证，请配置固定的 `OPENCLAW_TRUSTED_PACKAGE_TOKEN` 密钥。

- 构件验证从另一个 Actions 运行下载 tarball 构件：

```bash
gh workflow run package-acceptance.yml --ref main \
  -f source=artifact \
  -f artifact_run_id=<run-id> \
  -f artifact_name=<artifact-name> \
  -f suite_profile=smoke
```

- `pnpm test:docker:plugins`
  - 将当前的 OpenClaw 构建打包并安装到 Docker 中，启动配置了 Gateway(网关) 的 OpenAI，然后通过配置编辑启用捆绑的渠道/插件。
  - 验证设置发现功能是否会使未配置的可下载插件保持缺失状态，第一次配置的 doctor 修复是否显式安装了每个缺失的可下载插件，以及第二次重启是否不会运行隐藏依赖项修复。
  - 同时安装一个已知的旧 npm 基线版本，在运行 `openclaw update --tag <candidate>` 之前启用 Telegram，并验证候选版本的更新后 doctor 程序是否清理了旧的插件依赖项残留，而无需在测试工具端进行安装后修复。
- `pnpm test:parallels:npm-update`
  - 在 Parallels 虚拟机中跨平台运行原生打包安装更新冒烟测试。每个选定的平台首先安装请求的基线包，然后在同一虚拟机中运行已安装的 `openclaw update` 命令，并验证安装的版本、更新状态、Gateway 就绪状态以及一次本地代理轮次。
  - 在针对一个虚拟机进行迭代时，使用 `--platform macos`、`--platform windows` 或 `--platform linux`。使用 `--json` 获取摘要构件路径和每个通道的状态。
  - OpenAI 通道默认使用 `openai/gpt-5.5` 进行实时代理轮次验证。在有意验证另一个 OpenAI 模型时，传递 `--model <provider/model>` 或设置 `OPENCLAW_PARALLELS_OPENAI_MODEL`。
  - 在主机超时中包装长时间的本地运行，以免 Parallels 传输停滞占用剩余的测试窗口：

    ```bash
    timeout --foreground 150m pnpm test:parallels:npm-update -- --json
    timeout --foreground 90m pnpm test:parallels:npm-update -- --platform windows --json
    ```

  - 该脚本在 `/tmp/openclaw-parallels-npm-update.*` 下写入嵌套的通道日志。在假设外部包装程序挂起之前，请检查 `windows-update.log`、`macos-update.log` 或 `linux-update.log`。
  - 在冷虚拟机上，Windows 更新可能在更新后 doctor 和包更新工作上花费 10 到 15 分钟；当嵌套的 npm 调试日志正在推进时，这仍然是正常的。
  - 请勿将此聚合包装器与单独的 Parallels
    macOS、Windows 或 Linux 烟雾测试通道并行运行。它们共享 VM 状态，并且可能在
    快照恢复、包服务或来宾网关状态上发生冲突。
  - 更新后证明会运行正常的捆绑插件表面，因为
    语音、图像生成和媒体理解等功能门面
    即使在代理轮次本身仅检查简单文本响应时，
    也是通过捆绑运行时 API 加载的。

- `pnpm openclaw qa aimock`
  - 仅启动本地 AIMock 提供商服务器以进行直接协议烟雾
    测试。
- `pnpm openclaw qa matrix`
  - 针对基于一次性 Matrix 的 Tuwunel 主服务器运行 Docker 实时 QA 通道。仅限源代码检出 - 打包安装不附带 `qa-lab`。
  - 完整的 CLI、配置文件/场景目录、环境变量和构件布局：[Matrix QA](/zh/concepts/qa-matrix)。
- `pnpm openclaw qa telegram`
  - 针对真实的私人组运行 Telegram 实时 QA 通道，使用来自环境变量的驱动程序和 SUT 机器人令牌。
  - 需要 `OPENCLAW_QA_TELEGRAM_GROUP_ID`、`OPENCLAW_QA_TELEGRAM_DRIVER_BOT_TOKEN` 和 `OPENCLAW_QA_TELEGRAM_SUT_BOT_TOKEN`。组 ID 必须是数字 Telegram 聊天 ID。
  - 支持 `--credential-source convex` 以进行共享的凭证池。默认使用环境模式，或设置 `OPENCLAW_QA_CREDENTIAL_SOURCE=convex` 以选择加入池租约。
  - 默认覆盖金丝雀、提及门控、命令寻址、`/status`、机器人对机器人的提及回复以及核心本机命令回复。`mock-openai` 默认值还覆盖确定性回复链和 Telegram 最终消息流回归。使用 `--list-scenarios` 进行可选探测，例如 `session_status`。
  - 当任何场景失败时，以非零状态退出。当您
    希望在不失败退出代码的情况下获得构件时，请使用 `--allow-failures`。
  - 需要在同一个私人组中有两个不同的机器人，且 SUT 机器人公开 Telegram 用户名。
  - 为了稳定的机器人对机器人观察，请在 `@BotFather` 中为两个机器人启用机器人对机器人通信模式，并确保驱动机器人可以观察群组机器人的流量。
  - 在 `.artifacts/qa-e2e/...` 下写入 Telegram QA 报告、摘要和观察到的消息工件。回复场景包括从驱动程序发送请求到观察到的 SUT 回复的往返时间 (RTT)。

`Mantis Telegram Live` 是围绕此车道的 PR 证据包装器。它使用 Convex 租赁的 Telegram 凭据运行候选 ref，在 Crabbox 桌面浏览器中呈现经过编辑的观察消息记录，录制 MP4 证据，生成经过动作修剪的 GIF，上传工件包，并在设置了 `pr_number` 时通过 Mantis GitHub App 发布内联 PR 证据。维护者可以通过 `Mantis Scenario` (`scenario_id:
telegram-live`) 从 Actions UI 启动它，或者直接从拉取请求评论启动：

```text
@openclaw-mantis telegram
@openclaw-mantis telegram scenario=telegram-status-command
@openclaw-mantis telegram scenarios=telegram-status-command,telegram-mentioned-message-reply
```

`Mantis Telegram Desktop Proof` 是用于 PR 视觉证明的代理原生 Telegram Desktop 前后包装器。使用自由格式的 `instructions` 从 Actions UI 启动它，通过 `Mantis Scenario` (`scenario_id:
telegram-desktop-proof`)，或从 PR 评论启动：

```text
@openclaw-mantis telegram desktop proof
```

Mantis 代理读取 PR，确定哪种 Telegram 可见行为可以证明更改，在基准和候选 ref 上运行真实用户 Crabbox Telegram Desktop 证明通道，迭代直到原生 GIF 有用，写入配对的 `motionPreview` 清单，并在设置了 `pr_number` 时通过 Mantis GitHub App 发布相同的 2 列 GIF 表。

- `pnpm openclaw qa mantis telegram-desktop-builder`
  - 租用或重用 Crabbox Linux 桌面，安装原生 Telegram Desktop，使用租用的 OpenClaw SUT 机器人令牌配置 Telegram，启动网关，并从可见的 VNC 桌面录制截图/MP4 证据。
  - 默认为 `--credential-source convex`，因此工作流只需要 Convex broker 密钥。使用 `--credential-source env`，并使用与 `pnpm openclaw qa telegram` 相同的 `OPENCLAW_QA_TELEGRAM_*` 变量。
  - Telegram Desktop 仍然需要用户登录/个人资料。Bot 令牌仅配置 OpenClaw。对 base64 `.tgz` 个人资料存档使用 `--telegram-profile-archive-env <name>`，或者使用 `--keep-lease` 并通过 VNC 登录一次。
  - 在输出目录下写入 `mantis-telegram-desktop-builder-report.md`、`mantis-telegram-desktop-builder-summary.json`、`telegram-desktop-builder.png` 和 `telegram-desktop-builder.mp4`。

Live transport lanes 共享一个标准契约，以确保新的传输不会偏离；每个 lane 的覆盖率矩阵位于 [QA overview → Live transport coverage](/zh/concepts/qa-e2e-automation#live-transport-coverage)。`qa-channel` 是广泛的综合套件，不属于该矩阵的一部分。

### 通过 Convex 共享 Telegram 凭据 (v1)

当为 live transport QA 启用 `--credential-source convex`（或 `OPENCLAW_QA_CREDENTIAL_SOURCE=convex`）时，QA 实验室从 Convex 支持的池中获取独占租约，在 lane 运行期间对该租约进行心跳检测，并在关闭时释放租约。该部分名称早于 Discord、Slack 和 WhatsApp 支持；租约契约在各类别之间共享。

参考 Convex 项目脚手架：

- `qa/convex-credential-broker/`

必需的环境变量：

- `OPENCLAW_QA_CONVEX_SITE_URL`（例如 `https://your-deployment.convex.site`）
- 所选角色的一个密钥：
  - 用于 `maintainer` 的 `OPENCLAW_QA_CONVEX_SECRET_MAINTAINER`
  - 用于 `ci` 的 `OPENCLAW_QA_CONVEX_SECRET_CI`
- 凭据角色选择：
  - CLI：`--credential-role maintainer|ci`
  - 环境默认值：`OPENCLAW_QA_CREDENTIAL_ROLE`（在 CI 中默认为 `ci`，否则为 `maintainer`）

可选的环境变量：

- `OPENCLAW_QA_CREDENTIAL_LEASE_TTL_MS`（默认 `1200000`）
- `OPENCLAW_QA_CREDENTIAL_HEARTBEAT_INTERVAL_MS` (默认 `30000`)
- `OPENCLAW_QA_CREDENTIAL_ACQUIRE_TIMEOUT_MS` (默认 `90000`)
- `OPENCLAW_QA_CREDENTIAL_HTTP_TIMEOUT_MS` (默认 `15000`)
- `OPENCLAW_QA_CONVEX_ENDPOINT_PREFIX` (默认 `/qa-credentials/v1`)
- `OPENCLAW_QA_CREDENTIAL_OWNER_ID` (可选的 trace id)
- `OPENCLAW_QA_ALLOW_INSECURE_HTTP=1` 允许在仅限本地的开发中使用回环 `http://` Convex URL。

在正常运行中，`OPENCLAW_QA_CONVEX_SITE_URL` 应该使用 `https://`。

维护者管理员命令 (pool add/remove/list) 特别需要
`OPENCLAW_QA_CONVEX_SECRET_MAINTAINER`。

面向维护者的 CLI 辅助工具：

```bash
pnpm openclaw qa credentials doctor
pnpm openclaw qa credentials add --kind telegram --payload-file qa/telegram-credential.json
pnpm openclaw qa credentials list --kind telegram
pnpm openclaw qa credentials remove --credential-id <credential-id>
```

在实时运行之前使用 `doctor` 来检查 Convex 站点 URL、代理密钥、
端点前缀、HTTP 超时以及管理员/列表可达性，且不打印
密钥值。在脚本和 CI
实用程序中使用 `--json` 以获取机器可读的输出。

默认端点约定 (`OPENCLAW_QA_CONVEX_SITE_URL` + `/qa-credentials/v1`)：

- `POST /acquire`
  - 请求： `{ kind, ownerId, actorRole, leaseTtlMs, heartbeatIntervalMs }`
  - 成功： `{ status: "ok", credentialId, leaseToken, payload, leaseTtlMs?, heartbeatIntervalMs? }`
  - 耗尽/可重试： `{ status: "error", code: "POOL_EXHAUSTED" | "NO_CREDENTIAL_AVAILABLE", ... }`
- `POST /payload-chunk`
  - 请求： `{ kind, ownerId, actorRole, credentialId, leaseToken, index }`
  - 成功： `{ status: "ok", index, data }`
- `POST /heartbeat`
  - 请求： `{ kind, ownerId, actorRole, credentialId, leaseToken, leaseTtlMs }`
  - 成功： `{ status: "ok" }` (或空的 `2xx`)
- `POST /release`
  - 请求： `{ kind, ownerId, actorRole, credentialId, leaseToken }`
  - 成功： `{ status: "ok" }` (或空的 `2xx`)
- `POST /admin/add` (仅限维护者密钥)
  - 请求： `{ kind, actorId, payload, note?, status? }`
  - 成功： `{ status: "ok", credential }`
- `POST /admin/remove` (仅限维护者密钥)
  - 请求： `{ credentialId, actorId }`
  - 成功： `{ status: "ok", changed, credential }`
  - 活跃租约守卫： `{ status: "error", code: "LEASE_ACTIVE", ... }`
- `POST /admin/list` (仅限维护者密钥)
  - Request: `{ kind?, status?, includePayload?, limit? }`
  - Success: `{ status: "ok", credentials, count }`

Payload shape for Telegram kind:

- `{ groupId: string, driverToken: string, sutToken: string }`
- `groupId`Telegram must be a numeric Telegram chat id string.
- `admin/add` validates this shape for `kind: "telegram"` and rejects malformed payloads.

Payload shape for Telegram real-user kind:

- `{ groupId: string, sutToken: string, testerUserId: string, testerUsername: string, telegramApiId: string, telegramApiHash: string, tdlibDatabaseEncryptionKey: string, tdlibArchiveBase64: string, tdlibArchiveSha256: string, desktopTdataArchiveBase64: string, desktopTdataArchiveSha256: string }`
- `groupId`, `testerUserId`, and `telegramApiId` must be numeric strings.
- `tdlibArchiveSha256` and `desktopTdataArchiveSha256` must be SHA-256 hex strings.
- `kind: "telegram-user"`Telegram is reserved for the Mantis Telegram Desktop proof workflow. Generic QA Lab lanes must not acquire it.

Broker-validated multi-渠道 payloads:

- Discord: Discord`{ guildId: string, channelId: string, driverBotToken: string, sutBotToken: string, sutApplicationId: string, voiceChannelId?: string }`
- WhatsApp: WhatsApp`{ driverPhoneE164: string, sutPhoneE164: string, driverAuthArchiveBase64: string, sutAuthArchiveBase64: string, groupJid?: string }`

Slack lanes can also lease from the pool, but Slack payload validation currently
lives in the Slack QA runner rather than the broker. Use
SlackSlackSlack`{ channelId: string, driverBotToken: string, sutBotToken: string, sutAppToken: string }`Slack
for Slack rows.

### Adding a 渠道 to QA

The architecture and scenario-helper names for new 渠道 adapters live in [QA overview → Adding a 渠道](/zh/concepts/qa-e2e-automation#adding-a-channel). The minimum bar: implement the transport runner on the shared `qa-lab` host seam, declare `qaRunners` in the plugin manifest, mount as `openclaw qa <runner>`, and author scenarios under `qa/scenarios/`.

## Test suites (what runs where)

Think of the suites as "increasing realism" (and increasing flakiness/cost):

### Unit / integration (default)

- Command: `pnpm test`
- Config: untargeted runs use the `vitest.full-*.config.ts` shard set and may expand multi-project shards into per-project configs for parallel scheduling
- 文件：`src/**/*.test.ts`、`packages/**/*.test.ts` 和 `test/**/*.test.ts` 下的 core/unit 清单；UI 单元测试在专用的 `unit-ui` 分片中运行
- 范围：
  - 纯单元测试
  - 进程内集成测试（网关认证、路由、工具、解析、配置）
  - 针对已知 Bug 的确定性回归测试
- 预期：
  - 在 CI 中运行
  - 不需要真实密钥
  - 应该快速且稳定
  - 解析器和公共表面加载器测试必须通过生成的微型插件固定装置来证明广泛的 `api.js` 和
    `runtime-api.js` 回退行为，而不是真实的打包插件源 API。真实插件 API 加载属于插件拥有的契约/集成测试套件。

原生依赖策略：

- 默认测试安装跳过可选的原生 Discord opus 构建。Discord 语音使用捆绑的 `libopus-wasm`，并且 `@discordjs/opus` 在 `allowBuilds` 中保持禁用状态，因此本地测试和 Testbox 通道不会编译原生插件。
- 请在 `libopus-wasm` 基准代码库中比较原生 opus 性能，而不是在默认的 OpenClaw 安装/测试循环中。不要在默认的 `allowBuilds` 中将 `@discordjs/opus` 设置为 `true`；这会导致不相关的安装/测试循环编译原生代码。

<AccordionGroup>
  <Accordion title="项目、分片和作用域车道">

    - 无目标 `pnpm test` 运行十二个较小的分片配置（`core-unit-fast`、`core-unit-src`、`core-unit-security`、`core-unit-ui`、`core-unit-support`、`core-support-boundary`、`core-contracts`、`core-bundled`、`core-runtime`、`agentic`、`auto-reply`、`extensions`），而不是一个巨大的原生根项目进程。这降低了高负载机器上的峰值 RSS，并避免了自动回复/扩展工作导致无关套件饥饿。
    - `pnpm test --watch` 仍使用原生根 `vitest.config.ts` 项目图，因为多分片监视循环不切实际。
    - `pnpm test`、`pnpm test:watch` 和 `pnpm test:perf:imports` 首先通过作用域车道路由显式文件/目录目标，因此 `pnpm test extensions/discord/src/monitor/message-handler.preflight.test.ts` 避免了支付完整的根项目启动成本。
    - `pnpm test:changed` 默认将更改的 git 路径扩展为廉价的作用域车道：直接测试编辑、同级 `*.test.ts` 文件、显式源映射和本地导入图依赖项。除非您显式使用 `OPENCLAW_TEST_CHANGED_BROAD=1 pnpm test:changed`，否则配置/设置/包编辑不会广泛运行测试。
    - `pnpm check:changed`Docker 是针对范围狭窄工作的常规智能本地检查网关。它将差异分类为核心、核心测试、扩展、扩展测试、应用、文档、发布元数据、实时 Docker 工具和工具，然后运行匹配的类型检查、Lint 和 Guard 命令。它不运行 Vitest 测试；请调用 `pnpm test:changed` 或显式的 `pnpm test <target>`DockerDockerDocker 进行测试验证。仅发布元数据的版本变更运行针对性的版本/配置/根依赖项检查，并使用一个 Guard 拒绝顶级版本字段之外的包更改。
    - 实时 Docker ACP 工具编辑运行针对性检查：实时 Docker 认证脚本的 Shell 语法和实时 Docker 调度程序空运行。仅当差异仅限于 `scripts["test:docker:live-*"]` 时，才会包含 `package.json` 更改；依赖项、导出、版本和其他包表面编辑仍使用更广泛的 Guard。
    - 来自代理、命令、插件、自动回复助手、`plugin-sdk` 和类似纯实用程序领域的轻导入单元测试通过 `unit-fast` 车道路由，该车道路由跳过 `test/setup-openclaw-runtime.ts`；有状态/运行时繁重的文件保留在现有车道上。
    - 选定的 `plugin-sdk` 和 `commands` 助手源文件还将更改模式运行映射到这些轻量车道中的显式同级测试，因此助手编辑避免为该目录重新运行完整的繁重套件。
    - `auto-reply` 为顶级核心助手、顶级 `reply.*` 集成测试和 `src/auto-reply/reply/**` 子树提供了专用存储桶。CI 进一步将回复子树拆分为代理运行器、分发和命令/状态路由分片，以便一个导入繁重的存储桶不会拥有完整的 Node 尾部。
    - 常规 PR/main CI 会故意跳过扩展批量扫描和仅发布 `agentic-plugins` 分片。完整发布验证在发布候选项上为那些插件/扩展繁重的套件调度单独的 `Plugin Prerelease` 子工作流。

  </Accordion>

  <Accordion title="嵌入式运行器覆盖率">

    - 当您更改 message-工具 discovery 输入或压缩运行时上下文时，请保持两个级别的覆盖率。
    - 针对纯路由和规范化边界，添加专注的辅助回归测试。
    - 保持嵌入式运行器集成套件的健康：
      `src/agents/embedded-agent-runner/compact.hooks.test.ts`、
      `src/agents/embedded-agent-runner/run.overflow-compaction.test.ts` 和
      `src/agents/embedded-agent-runner/run.overflow-compaction.loop.test.ts`。
    - 这些套件用于验证作用域 ID 和压缩行为仍然通过真正的 `run.ts` / `compact.ts` 路径流转；仅包含辅助的测试不足以替代这些集成路径。

  </Accordion>

  <Accordion title="Vitest 池和隔离默认设置">

    - 基础 Vitest 配置默认为 `threads`。
    - 共享的 Vitest 配置固定 `isolate: false` 并在根项目、e2e 和 live 配置之间使用非隔离运行器。
    - 根 UI 通道保留其 `jsdom` 设置和优化器，但也在共享的非隔离运行器上运行。
    - 每个 `pnpm test` 分片继承共享 Vitest 配置中相同的 `threads` + `isolate: false`
      默认值。
    - `scripts/run-vitest.mjs` 默认为 Vitest 子 Node 进程添加 `--no-maglev`，以减少大型本地运行期间的 V8 编译抖动。
      设置 `OPENCLAW_VITEST_ENABLE_MAGLEV=1` 以与标准 V8 行为进行比较。
    - `scripts/run-vitest.mjs` 会在 5 分钟无 stdout 或 stderr 输出后终止显式的非监视 Vitest 运行。设置
      `OPENCLAW_VITEST_NO_OUTPUT_TIMEOUT_MS=0` 可禁用看门狗，以进行有意保持静默的调查。

  </Accordion>

  <Accordion title="快速本地迭代">

    - `pnpm changed:lanes` 显示差异触发哪些架构通道。
    - 预提交钩子仅用于格式化。它会重新暂存格式化后的文件，并且不运行 lint、类型检查或测试。
    - 在移交或推送之前，当你需要智能本地检查关卡时，显式运行 `pnpm check:changed`。
    - `pnpm test:changed` 默认通过廉价的限定作用域通道路由。仅当 Agent 确定 harness、config、package 或 contract 的编辑确实需要更广泛的 Vitest 覆盖范围时，才使用 `OPENCLAW_TEST_CHANGED_BROAD=1 pnpm test:changed`。
    - `pnpm test:max` 和 `pnpm test:changed:max` 保持相同的路由行为，只是具有更高的 worker 上限。
    - 本地 worker 自动缩放是有意保守的，当主机负载平均值已经很高时会退避，因此默认情况下多个并发 Vitest 运行造成的损害较小。
    - 基础 Vitest 配置将项目/配置文件标记为 `forceRerunTriggers`，以便在测试连线发生变化时，更改模式下的重新运行保持正确。
    - 该配置在支持的主机上保持 `OPENCLAW_VITEST_FS_MODULE_CACHE` 启用；如果你需要一个明确的缓存位置以进行直接性能分析，请设置 `OPENCLAW_VITEST_FS_MODULE_CACHE_PATH=/abs/path`。

  </Accordion>

  <Accordion title="性能调试">

    - `pnpm test:perf:imports` 启用 Vitest 导入持续时间报告以及
      导入细分输出。
    - `pnpm test:perf:imports:changed` 将相同的分析视图范围限定为
      自 `origin/main` 以来更改的文件。
    - 分片计时数据被写入 `.artifacts/vitest-shard-timings.json`。
      全配置运行使用配置路径作为键；包含模式 CI
      分片会追加分片名称，以便单独跟踪
      经过过滤的分片。
    - 当某个热门测试仍然将大部分时间花在启动导入上时，
      请将繁重的依赖项保留在一个狭窄的本地 `*.runtime.ts` 接缝之后，
      并直接模拟该接缝，而不是仅仅为了通过 `vi.mock(...)` 就深度导入运行时辅助工具。
    - `pnpm test:perf:changed:bench -- --ref <git-ref>` 将路由后的
      `test:changed`macOS 与该提交差异的原生根项目路径进行比较，并打印实际运行时间加上 macOS 最大常驻集大小 (RSS)。
    - `pnpm test:perf:changed:bench -- --worktree` 通过 `scripts/test-projects.mjs` 和根 Vitest 配置
      路由更改文件列表，从而对当前的
      脏树进行基准测试。
    - `pnpm test:perf:profile:main` 为 Vitest/Vite
      启动和转换开销编写主线程 CPU 配置文件。
    - `pnpm test:perf:profile:runner` 为禁用了文件并行性的
      单元测试套件编写运行器 CPU+堆配置文件。

  </Accordion>
</AccordionGroup>

### 稳定性 (网关)

- 命令：`pnpm test:stability:gateway`
- 配置：`vitest.gateway.config.ts`，强制使用一个工作线程
- 范围：
  - 默认启用诊断功能，启动一个真实的回环 Gateway(网关)
  - 通过诊断事件路径驱动合成网关消息、内存和大负载抖动
  - 通过 Gateway(网关) WS RPC 查询 `diagnostics.stability`Gateway(网关)RPC
  - 涵盖诊断稳定性包持久化辅助工具
  - 断言记录器保持有界，合成 RSS 样本保持在压力预算之下，并且每个会话的队列深度会排空回零
- 预期：
  - CI 安全且无密钥
  - 稳定性回归跟进的狭窄通道，而非完整 Gateway(网关) 套件的替代品

### E2E (仓库聚合)

- 命令：`pnpm test:e2e`
- 范围：
  - 运行 Gateway 冒烟 E2E 通道
  - 运行模拟 Control UI 浏览器 E2E 通道
- 预期：
  - CI 安全且无密钥
  - 需要安装 Playwright Chromium

### E2E (gateway smoke)

- 命令：`pnpm test:e2e:gateway`
- 配置：`vitest.e2e.config.ts`
- 文件：`src/**/*.e2e.test.ts`、`test/**/*.e2e.test.ts` 以及 `extensions/` 下的 bundled-plugin E2E 测试
- 运行时默认值：
  - 使用带有 `isolate: false` 的 Vitest `threads`，与仓库的其余部分保持一致。
  - 使用自适应工作进程（CI：最多 2 个，本地：默认 1 个）。
  - 默认以静默模式运行以减少控制台 I/O 开销。
- 有用的覆盖选项：
  - `OPENCLAW_E2E_WORKERS=<n>` 用于强制工作线程数量（上限为 16）。
  - `OPENCLAW_E2E_VERBOSE=1` 用于重新启用详细的控制台输出。
- 范围：
  - 多实例网关端到端行为
  - WebSocket/HTTP 表面、节点配对和繁重的网络操作
- 预期：
  - 在 CI 中运行（在管道中启用时）
  - 不需要真实的密钥
  - 比单元测试有更多活动部件（可能较慢）

### E2E (Control UI 模拟浏览器)

- 命令：`pnpm test:ui:e2e`
- 配置：`test/vitest/vitest.ui-e2e.config.ts`
- 文件：`ui/src/**/*.e2e.test.ts`
- 范围：
  - 启动 Vite Control UI
  - 通过 Playwright 驱动真实的 Chromium 页面
  - 使用确定的浏览器内模拟替换 Gateway(网关) WebSocket
- 预期：
  - 作为 `pnpm test:e2e` 的一部分在 CI 中运行
  - 不需要真实的 Gateway(网关)、agent 或提供商密钥
  - 必须存在浏览器依赖项 (`pnpm --dir ui exec playwright install chromium`)

### E2E：OpenShell 后端冒烟测试

- 命令：`pnpm test:e2e:openshell`
- 文件：`extensions/openshell/src/backend.e2e.test.ts`
- 范围：
  - 通过 Docker 在主机上启动一个隔离的 OpenShell 网关
  - 从临时的本地 Dockerfile 创建沙盒
  - 通过真实的 OpenClaw`sandbox ssh-config` + SSH exec 测试 OpenClaw 的 OpenShell 后端
  - 通过沙盒 fs 桥接验证远程规范文件系统行为
- 预期：
  - 仅限选择性加入；不属于默认 `pnpm test:e2e` 运行的一部分
  - 需要本地 `openshell`CLIDocker CLI 以及可运行的 Docker 守护进程
  - 使用隔离的 `HOME` / `XDG_CONFIG_HOME`，然后销毁测试网关和沙盒
- 有用的覆盖选项：
  - `OPENCLAW_E2E_OPENSHELL=1` 用于在手动运行更广泛的 e2e 测试套件时启用该测试
  - `OPENCLAW_E2E_OPENSHELL_COMMAND=/path/to/openshell`CLI 用于指向非默认的 CLI 二进制文件或包装脚本

### Live（真实提供商 + 真实模型）

- 命令：`pnpm test:live`
- 配置：`vitest.live.config.ts`
- 文件：`src/**/*.live.test.ts`、`test/**/*.live.test.ts` 以及 `extensions/` 下的 bundled-plugin live 测试
- 默认：通过 `pnpm test:live` **启用**（设置 `OPENCLAW_LIVE_TEST=1`）
- 范围：
  - “该提供商/模型在*今天*是否能使用真实凭据正常工作？”
  - 捕获提供商格式变更、工具调用怪癖、身份验证问题以及速率限制行为
- 预期：
  - 设计上不保证 CI 稳定性（涉及真实网络、真实提供商策略、配额及中断）
  - 产生费用 / 使用速率限制
  - 优先运行缩小的子集，而非“所有内容”
- Live 运行使用已导出的 API 密钥和暂存的身份验证配置。
- 默认情况下，live 运行仍会隔离 `HOME`，并将配置/身份验证材料复制到临时测试主目录中，以防止单元测试夹具修改你的真实 `~/.openclaw`。
- 仅当你确实需要 live 测试使用你的真实主目录时，才设置 `OPENCLAW_LIVE_USE_REAL_HOME=1`。
- `pnpm test:live` 默认采用较安静的模式：它会保留 `[live] ...` 进度输出，并屏蔽网关引导日志/Bonjour 喧嚣。如果你需要恢复完整的启动日志，请设置 `OPENCLAW_LIVE_TEST_QUIET=0`。
- API 密钥轮换（特定提供商）：使用逗号/分号格式设置 `*_API_KEYS`，或使用 `*_API_KEY_1`、`*_API_KEY_2`（例如 `OPENAI_API_KEYS`、`ANTHROPIC_API_KEYS`、`GEMINI_API_KEYS`），或通过 `OPENCLAW_LIVE_*_KEY` 进行 per-live 覆盖；测试会在遇到速率限制响应时重试。
- 进度/心跳输出：
  - Live 测试套件现在会向 stderr 输出进度行，以便即使 Vitest 控制台捕获处于静默状态，长时间的提供商调用也能显示出活动状态。
  - `vitest.live.config.ts` 会禁用 Vitest 控制台拦截，以便提供商/网关进度行在 live 运行期间立即流式传输。
  - 使用 `OPENCLAW_LIVE_HEARTBEAT_MS` 调整 direct-模型 心跳。
  - 使用 `OPENCLAW_LIVE_GATEWAY_HEARTBEAT_MS` 调整网关/探针的心跳。

## 我应该运行哪个测试套件？

请使用此决策表：

- 编辑逻辑/测试：运行 `pnpm test`（如果改动较多，还需运行 `pnpm test:coverage`）
- 涉及网关网络 / WS 协议 / 配对：添加 `pnpm test:e2e`
- 调试“我的机器人离线”/ 提供商特定故障 / 工具调用：运行窄范围的 `pnpm test:live`

## Live（网络交互）测试

对于实时模型矩阵、CLI 后端冒烟测试、ACP 冒烟测试、Codex 应用服务器测试线束，以及所有媒体提供商实时测试（CLIDeepgram、BytePlus、ComfyUI、图像、音乐、视频、媒体测试线束）——外加实时运行的凭证处理——请参阅[Testing live suites](/zh/help/testing-live)。有关专用的更新和插件验证清单，请参阅[Testing updates and plugins](/zh/help/testing-updates-plugins)。

## Docker 运行器（可选的“在 Linux 上工作”检查）

这些 Docker 运行器分为两类：

- Live-模型 运行器：`test:docker:live-models` 和 `test:docker:live-gateway` 仅在仓库 Docker 镜像内运行其匹配的配置键实时文件（`src/agents/models.profiles.live.test.ts` 和 `src/gateway/gateway-models.profiles.live.test.ts`），并挂载您的本地配置目录、工作区和可选的配置环境文件。匹配的本地入口点是 `test:live:models-profiles` 和 `test:live:gateway-profiles`。
- Docker 实时运行器在需要时会保持其实际的上限：
  `test:docker:live-models` 默认为精选支持的高信号集，而
  `test:docker:live-gateway` 默认为 `OPENCLAW_LIVE_GATEWAY_SMOKE=1`、
  `OPENCLAW_LIVE_GATEWAY_MAX_MODELS=8`、
  `OPENCLAW_LIVE_GATEWAY_STEP_TIMEOUT_MS=45000` 和
  `OPENCLAW_LIVE_GATEWAY_MODEL_TIMEOUT_MS=90000`。当您明确需要更小的上限或更大的扫描范围时，请设置 `OPENCLAW_LIVE_MAX_MODELS` 或网关环境变量。
- `test:docker:all`Docker 通过 `test:docker:live-build`OpenClawnpm 构建一次实时 Docker 映像，通过 `scripts/package-openclaw-for-docker.mjs` 将 OpenClaw 打包一次为 npm tarball，然后构建/重用两个 `scripts/e2e/Dockerfile` 映像。基础映像仅包含用于安装/更新/插件依赖通道的 Node/Git 运行器；这些通道挂载预构建的 tarball。功能映像将相同的 tarball 安装到 `/app`Docker 中，用于构建应用程序功能通道。Docker 通道定义位于 `scripts/lib/docker-e2e-scenarios.mjs` 中；规划器逻辑位于 `scripts/lib/docker-e2e-plan.mjs` 中；`scripts/test-docker-all.mjs` 执行选定的计划。聚合任务使用加权本地调度器：`OPENCLAW_DOCKER_ALL_PARALLELISM`npm 控制进程槽位，而资源限制可防止繁重的实时、npm-install 和多服务通道同时启动。如果单个通道超过了活动上限，调度器仍可在池空闲时启动它，然后让其单独运行，直到再次有可用容量。默认设置为 10 个槽位、`OPENCLAW_DOCKER_ALL_LIVE_LIMIT=9`、`OPENCLAW_DOCKER_ALL_NPM_LIMIT=10` 和 `OPENCLAW_DOCKER_ALL_SERVICE_LIMIT=7`；仅当 Docker 主机拥有更多余量时，才调整 `OPENCLAW_DOCKER_ALL_WEIGHT_LIMIT` 或 `OPENCLAW_DOCKER_ALL_DOCKER_LIMIT`DockerDockerOpenClaw。运行器默认执行 Docker 预检，移除过时的 OpenClaw E2E 容器，每 30 秒打印一次状态，将成功的通道计时存储在 `.artifacts/docker-tests/lane-timings.json` 中，并利用这些计时在后续运行中优先启动较长的通道。使用 `OPENCLAW_DOCKER_ALL_DRY_RUN=1`Docker 可在不构建或运行 Docker 的情况下打印加权通道清单，或使用 `node scripts/test-docker-all.mjs --plan-json` 打印所选通道、包/映像需求及凭据的 CI 计划。
- `Package Acceptance`GitHub 是 GitHub 原生的包关卡，用于检查“此可安装 tarball 是否作为产品正常工作？”。它从 `source=npm`、`source=ref`、`source=url` 或 `source=artifact` 中解析一个候选包，将其作为 `package-under-test`Docker 上传，然后针对该确切 tarball 运行可复用的 Docker E2E 通道，而不是重新打包选定的引用。配置文件按范围排序：`smoke`、`package`、`product` 和 `full`。有关包/更新/插件契约、已发布升级幸存者矩阵、发布默认值和故障分类，请参阅 [Testing updates and plugins](/zh/help/testing-updates-plugins)。
- 在 tsdown 之后，构建和发布检查会运行 `scripts/check-cli-bootstrap-imports.mjs`。该守护进程遍历来自 `dist/entry.js` 和 `dist/cli/run-main.js`CLI 的静态构建图，如果在命令分发之前的预分发启动导入了包依赖项（如 Commander、prompt UI、undici 或 logging），则会失败；它还会保持打包的 gateway 运行块在预算范围内，并拒绝已知冷 gateway 路径的静态导入。打包的 CLI smoke 还涵盖了根帮助、入门帮助、doctor 帮助、status、config schema 和 模型-list 命令。
- Package Acceptance 的旧版兼容性上限为 `2026.4.25`（包含 `2026.4.25-beta.*`）。在该截止点之前，工具仅容忍已发布包的元数据缺口：省略的私有 QA 清单条目、缺失的 `gateway install --wrapper`、从 tarball 派生的 git fixture 中缺失的补丁文件、缺失的持久化 `update.channel`、旧版插件安装记录位置、缺失的 marketplace 安装记录持久化以及在 `plugins update` 期间的配置元数据迁移。对于 `2026.4.25` 之后的包，这些路径都是严格失败的。
- Container smoke 运行程序：`test:docker:openwebui`、`test:docker:onboard`、`test:docker:npm-onboard-channel-agent`、`test:docker:release-user-journey`、`test:docker:release-typed-onboarding`、`test:docker:release-media-memory`、`test:docker:release-upgrade-user-journey`、`test:docker:release-plugin-marketplace`、`test:docker:skill-install`、`test:docker:update-channel-switch`、`test:docker:upgrade-survivor`、`test:docker:published-upgrade-survivor`、`test:docker:session-runtime-context`、`test:docker:agents-delete-shared-workspace`、`test:docker:gateway-network`、`test:docker:browser-cdp-snapshot`、`test:docker:mcp-channels`、`test:docker:agent-bundle-mcp-tools`、`test:docker:cron-mcp-cleanup`、`test:docker:plugins`、`test:docker:plugin-update`、`test:docker:plugin-lifecycle-matrix` 和 `test:docker:config-reload` 会启动一个或多个真实容器并验证高级集成路径。
- 通过 `scripts/lib/openclaw-e2e-instance.sh` 安装打包的 Docker tarball 的 OpenClaw/Bash E2E 通道，会将 `npm install` 限制为 `OPENCLAW_E2E_NPM_INSTALL_TIMEOUT`（默认为 `600s`；设置 `0` 以禁用包装器以便调试）。

实时模型 Docker 运行程序还会仅 bind-mount 所需的 CLI auth 主目录（如果运行范围未缩小，则为所有支持的目录），然后在运行前将其复制到容器主目录，这样外部 CLI OAuth 就可以在不改变主机 auth 存储的情况下刷新令牌：

- Direct 模型：`pnpm test:docker:live-models`（脚本：`scripts/test-live-models-docker.sh`）
- ACP bind smoke：`pnpm test:docker:live-acp-bind`（脚本：`scripts/test-live-acp-bind-docker.sh`；默认覆盖 Claude、Codex 和 Gemini，通过 `pnpm test:docker:live-acp-bind:droid` 和 `pnpm test:docker:live-acp-bind:opencode` 严格覆盖 Droid/OpenCode）
- CLI 后端 smoke：`pnpm test:docker:live-cli-backend`（脚本：`scripts/test-live-cli-backend-docker.sh`）
- Codex app-server harness smoke：`pnpm test:docker:live-codex-harness`（脚本：`scripts/test-live-codex-harness-docker.sh`）
- Gateway(网关) + dev agent: Gateway(网关)`pnpm test:docker:live-gateway` (script: `scripts/test-live-gateway-models-docker.sh`)
- Observability smokes: `pnpm qa:otel:smoke`, `pnpm qa:prometheus:smoke`, 和 `pnpm qa:observability:smoke`Dockernpm 是私有的 QA 源码检出通道。它们有意不包含在 Docker 版本发布通道中，因为 npm 压缩包省略了 QA Lab。
- Open WebUI live smoke: `pnpm test:docker:openwebui` (script: `scripts/e2e/openwebui-docker.sh`)
- 新手引导 wizard (TTY, full scaffolding): `pnpm test:docker:onboard` (script: `scripts/e2e/onboard-docker.sh`)
- Npm tarball 新手引导/渠道/agent smoke: `pnpm test:docker:npm-onboard-channel-agent`OpenClawDockerOpenAITelegramOpenAI 在 Docker 中全局安装打包好的 OpenClaw 压缩包，通过 env-ref 新手引导 配置 OpenAI，默认配置 Telegram，运行诊断，并运行一次模拟的 OpenAI agent 轮次。使用 `OPENCLAW_CURRENT_PACKAGE_TGZ=/path/to/openclaw-*.tgz` 重用预构建的压缩包，使用 `OPENCLAW_NPM_ONBOARD_HOST_BUILD=0` 跳过主机重建，或使用 `OPENCLAW_NPM_ONBOARD_CHANNEL=discord` 或 `OPENCLAW_NPM_ONBOARD_CHANNEL=slack` 切换渠道。

- Release user journey smoke: `pnpm test:docker:release-user-journey`OpenClawDockerOpenAIGateway(网关) 在一个干净的 Docker 主目录中全局安装打包好的 OpenClaw 压缩包，运行新手引导，配置一个模拟的 OpenAI 提供商，运行一次 agent 轮次，安装/卸载外部插件，针对本地 fixture 配置 ClickClack，验证出站/入站消息传递，重启 Gateway(网关)，并运行诊断。
- Release typed 新手引导 smoke: `pnpm test:docker:release-typed-onboarding` 安装打包好的压缩包，通过真实的 TTY 驱动 `openclaw onboard`OpenAI，将 OpenAI 配置为 env-ref 提供商，验证没有原始密钥持久化，并运行一次模拟的 agent 轮次。
- Release media/memory smoke: `pnpm test:docker:release-media-memory`OpenAIGateway(网关) 安装打包的 tarball，验证来自 PNG 附件的图像理解、OpenAI 兼容的图像生成输出、内存搜索回忆，以及在 Gateway 重启期间的回忆持久性。
- Release upgrade user journey smoke: `pnpm test:docker:release-upgrade-user-journey` 默认安装 `openclaw@latest`，在已发布的包上配置 提供商/plugin/ClickClack 状态，升级到候选 tarball，然后重新运行核心 agent/plugin/渠道 流程。使用 `OPENCLAW_RELEASE_UPGRADE_BASELINE_SPEC=openclaw@<version>` 覆盖基线。
- Release plugin marketplace smoke: `pnpm test:docker:release-plugin-marketplace`CLI 从本地 fixture marketplace 安装，更新已安装的 plugin，卸载它，并验证 plugin CLI 随安装元数据被修剪而消失。
- Skill install smoke: `pnpm test:docker:skill-install`OpenClawDockerClawHub 在 Docker 中全局安装打包的 OpenClaw tarball，在配置中禁用上传的归档安装，从搜索解析当前的实时 ClawHub skill slug，使用 `openclaw skills install` 安装它，并验证已安装的 skill 以及 `.clawhub` origin/lock 元数据。
- Update 渠道 switch smoke: `pnpm test:docker:update-channel-switch`OpenClawDocker 在 Docker 中全局安装打包的 OpenClaw tarball，从 package `stable` 切换到 git `dev`，验证持久化的 渠道 和插件在更新后工作正常，然后切换回 package `stable` 并检查更新状态。
- Upgrade survivor smoke: `pnpm test:docker:upgrade-survivor`OpenClawGateway(网关) 将打包的 OpenClaw tarball 安装在一个包含 agents、渠道 配置、plugin allowlists、陈旧的 plugin 依赖状态以及现有 workspace/会话 文件的脏 old-user fixture 之上。它运行包更新和非交互式 doctor，不使用实时的 提供商 或 渠道 密钥，然后启动一个 loopback Gateway 并检查配置/状态保留以及启动/状态预算。
- 已发布升级幸存者冒烟测试：`pnpm test:docker:published-upgrade-survivor` 默认安装 `openclaw@latest`，植入真实的现有用户文件，使用内置命令配方配置该基线，验证生成的配置，将该已发布安装更新为候选 tarball，运行非交互式 doctor，写入 `.artifacts/upgrade-survivor/summary.json`Gateway(网关)，然后启动回环 Gateway(网关) 并检查配置的 intents、状态保留、启动、`/healthz`、`/readyz`RPC 和 RPC 状态预算。使用 `OPENCLAW_UPGRADE_SURVIVOR_BASELINE_SPEC` 覆盖一个基线，要求聚合调度器使用 `OPENCLAW_UPGRADE_SURVIVOR_BASELINE_SPECS`（如 `openclaw@2026.5.2 openclaw@2026.4.23 openclaw@2026.4.15`）扩展精确的本地基线，并使用 `OPENCLAW_UPGRADE_SURVIVOR_SCENARIOS`（如 `reported-issues`）扩展 issue 形状的 fixtures；报告的问题集包括 `configured-plugin-installs`OpenClaw，用于自动修复外部 OpenClaw 插件安装。Package Acceptance 将这些暴露为 `published_upgrade_survivor_baseline`、`published_upgrade_survivor_baselines` 和 `published_upgrade_survivor_scenarios`，解析元基线令牌（如 `last-stable-4` 或 `all-since-2026.4.23`），而 Full Release Validation 将 release-soak 包网关扩展为 `last-stable-4 2026.4.23 2026.5.2 2026.4.15` 加上 `reported-issues`。
- 会话运行时上下文冒烟测试：`pnpm test:docker:session-runtime-context` 验证隐藏的运行时上下文记录持久性以及 doctor 对受影响的重复提示重写分支的修复。
- Bun 全局安装冒烟测试：Bun`bash scripts/e2e/bun-global-install-smoke.sh` 打包当前树，在隔离的 home 目录中使用 `bun install -g` 安装它，并验证 `openclaw infer image providers --json` 返回捆绑的镜像提供程序而不是挂起。使用 `OPENCLAW_BUN_GLOBAL_SMOKE_PACKAGE_TGZ=/path/to/openclaw-*.tgz` 重用预构建的 tarball，使用 `OPENCLAW_BUN_GLOBAL_SMOKE_HOST_BUILD=0` 跳过主机构建，或使用 `OPENCLAW_BUN_GLOBAL_SMOKE_DIST_IMAGE=openclaw-dockerfile-smoke:local` 从已构建的 Docker 镜像复制 `dist/`Docker。
- 安装程序 Docker smoke：Docker`bash scripts/test-install-sh-docker.sh`npmnpmnpm 在其 root、update 和 direct-npm 容器之间共享一个 npm 缓存。Update smoke 默认以 npm `latest` 作为稳定的基准线，然后再升级到候选压缩包。在本地通过 `OPENCLAW_INSTALL_SMOKE_UPDATE_BASELINE=2026.4.22` 覆盖，或通过 GitHub 上 Install Smoke workflow 的 `update_baseline_version`GitHubnpm 输入进行覆盖。非 root 安装程序检查保持独立的 npm 缓存，以免 root 拥有的缓存条目掩盖用户本地的安装行为。设置 `OPENCLAW_INSTALL_SMOKE_NPM_CACHE_DIR=/path/to/cache`npm 以在本地重新运行时复用 root/update/direct-npm 缓存。
- Install Smoke CI 使用 npm`OPENCLAW_INSTALL_SMOKE_SKIP_NPM_GLOBAL=1` 跳过重复的 direct-npm 全局更新；当需要直接的 `npm install -g` 覆盖范围时，在本地不带该环境变量运行脚本。
- 代理删除共享工作区 CLI smoke：CLI`pnpm test:docker:agents-delete-shared-workspace`（脚本：`scripts/e2e/agents-delete-shared-workspace-docker.sh`）默认构建 root Dockerfile 镜像，在隔离的容器 home 中用一个工作区初始化两个代理，运行 `agents delete --json`，并验证有效的 JSON 以及保留的工作区行为。使用 `OPENCLAW_AGENTS_DELETE_SHARED_WORKSPACE_E2E_IMAGE=openclaw-dockerfile-smoke:local OPENCLAW_AGENTS_DELETE_SHARED_WORKSPACE_E2E_SKIP_BUILD=1` 复用 install-smoke 镜像。
- Gateway 网络测试（两个容器，WS auth + health）：Gateway(网关)`pnpm test:docker:gateway-network`（脚本：`scripts/e2e/gateway-network-docker.sh`）
- 浏览器 CDP 快照 smoke：`pnpm test:docker:browser-cdp-snapshot`（脚本：`scripts/e2e/browser-cdp-snapshot-docker.sh`）构建源码 E2E 镜像以及 Chromium 层，使用原始 CDP 启动 Chromium，运行 `browser doctor --deep`，并验证 CDP 角色快照覆盖了链接 URL、光标提升的可点击元素、iframe 引用和框架元数据。
- OpenAI Responses web_search 最小推理回归：OpenAI`pnpm test:docker:openai-web-search-minimal`（脚本：`scripts/e2e/openai-web-search-minimal-docker.sh`OpenAIGateway(网关)）通过 Gateway(网关) 运行模拟的 OpenAI 服务器，验证 `web_search` 将 `reasoning.effort` 从 `minimal` 提升到 `low`Gateway(网关)，然后强制提供商 schema 拒绝并检查原始详细信息是否出现在 Gateway(网关) 日志中。
- MCP 渠道桥接（预置的 Gateway(网关) + stdio 桥接 + 原始 Claude 通知帧冒烟测试）：Gateway(网关)`pnpm test:docker:mcp-channels`（脚本：`scripts/e2e/mcp-channels-docker.sh`）
- OpenClaw 包含 MCP 工具（真实的 stdio MCP 服务器 + 嵌入式 OpenClaw 配置文件允许/拒绝冒烟测试）：OpenClawOpenClaw`pnpm test:docker:agent-bundle-mcp-tools`（脚本：`scripts/e2e/agent-bundle-mcp-tools-docker.sh`）
- Cron/子代理 MCP 清理（真实的 Gateway(网关) + stdio MCP 子进程在隔离的 cron 和一次性子代理运行后拆解）：Gateway(网关)`pnpm test:docker:cron-mcp-cleanup`（脚本：`scripts/e2e/cron-mcp-cleanup-docker.sh`）
- 插件（本地路径、`file:`npmnpmClawHub、具有提升依赖项的 npm 注册表、格式错误的 npm 包元数据、git 移动引用、ClawHub 综合测试、市场更新以及 Claude 包启用/检查的安装/更新冒烟测试）：`pnpm test:docker:plugins`（脚本：`scripts/e2e/plugins-docker.sh`）
  设置 `OPENCLAW_PLUGINS_E2E_CLAWHUB=0`ClawHub 以跳过 ClawHub 块，或使用 `OPENCLAW_PLUGINS_E2E_CLAWHUB_SPEC` 和 `OPENCLAW_PLUGINS_E2E_CLAWHUB_ID` 覆盖默认的综合测试包/运行时对。如果没有 `OPENCLAW_CLAWHUB_URL`/`CLAWHUB_URL`ClawHub，测试将使用密封的本地 ClawHub 固件服务器。
- 插件更新未更改冒烟测试：`pnpm test:docker:plugin-update`（脚本：`scripts/e2e/plugin-update-unchanged-docker.sh`）
- 插件生命周期矩阵冒烟测试：`pnpm test:docker:plugin-lifecycle-matrix`OpenClawnpmnpm 在空容器中安装打包的 OpenClaw tarball，安装一个 npm 插件，切换启用/禁用，通过本地 npm 注册表进行升级和降级，删除已安装的代码，然后验证卸载仍然会移除陈旧状态，同时记录每个生命周期阶段的 RSS/CPU 指标。
- 配置重新加载元数据冒烟测试：`pnpm test:docker:config-reload`（脚本：`scripts/e2e/config-reload-source-docker.sh`）
- 插件：`pnpm test:docker:plugins` 涵盖本地路径、`file:`npmClawHub、具有提升依赖项的 npm 注册表、git 移动引用、ClawHub fixtures、市场更新以及 Claude-bundle 启用/检查的安装/更新冒烟测试。`pnpm test:docker:plugin-update` 涵盖已安装插件的未更改更新行为。`pnpm test:docker:plugin-lifecycle-matrix`npm 涵盖资源跟踪的 npm 插件安装、启用、禁用、升级、降级以及缺失代码卸载。

要手动预构建并重用共享功能镜像：

```bash
OPENCLAW_DOCKER_E2E_IMAGE=openclaw-docker-e2e-functional:local pnpm test:docker:e2e-build
OPENCLAW_DOCKER_E2E_IMAGE=openclaw-docker-e2e-functional:local OPENCLAW_SKIP_DOCKER_BUILD=1 pnpm test:docker:mcp-channels
```

套件特定的镜像覆盖（例如 `OPENCLAW_GATEWAY_NETWORK_E2E_IMAGE`）在设置时仍然优先。当 `OPENCLAW_SKIP_DOCKER_BUILD=1`Docker 指向远程共享镜像时，如果该镜像尚未在本地，脚本会将其拉取。二维码和安装程序 Docker 测试保留它们自己的 Dockerfile，因为它们验证的是包/安装行为，而不是共享的构建应用运行时。

live-模型 Docker 运行器还会以只读方式绑定挂载当前签出版本，并将其暂存到容器内的临时工作目录中。这使得运行时镜像保持精简，同时仍能针对您的确切本地源码/配置运行 Vitest。暂存步骤会跳过大型本地专用缓存和应用构建输出，例如 `.pnpm-store`、`.worktrees`、`__openclaw_vitest__` 以及应用本地的 `.build` 或 Gradle 输出目录，因此 Docker 实时运行不会花费数分钟来复制特定于机器的构件。它们还设置了 `OPENCLAW_SKIP_CHANNELS=1`，以便 Gateway 实时探针不会在容器内启动真正的 Telegram/Discord 等渠道工作进程。`test:docker:live-models` 仍然运行 `pnpm test:live`，因此当您需要缩小或排除该 Docker 频道中的 Gateway 实时覆盖范围时，请同时传递 `OPENCLAW_LIVE_GATEWAY_*`。`test:docker:openwebui` 是更高级别的兼容性冒烟测试：它启动一个启用了 OpenClaw 兼容 HTTP 端点的 OpenAI Gateway 容器，针对该 Gateway 启动一个固定的 Open WebUI 容器，通过 Open WebUI 登录，验证 `/api/models` 暴露了 `openclaw/default`，然后通过 Open WebUI 的 `/api/chat/completions` 代理发送真正的聊天请求。对于应在 Open WebUI 登录和模型发现后停止而无需等待实时模型完成的发布路径 CI 检查，请设置 `OPENWEBUI_SMOKE_MODE=models`。第一次运行可能会明显较慢，因为 Docker 可能需要拉取 Open WebUI 镜像，且 Open WebUI 可能需要完成其自身的冷启动设置。该频道需要可用的实时模型密钥。您可以通过进程环境、暂存的配置文件或显式的 `OPENCLAW_PROFILE_FILE` 来提供它。成功的运行会打印一个小型的 JSON 载荷，例如 `{ "ok": true, "模型": "openclaw/default", ... }`。`test:docker:mcp-channels` 是有意确定性的，不需要真正的 Telegram、Discord 或 iMessage 账户。它会启动一个已设定种子的 Gateway(网关) 容器，启动第二个生成 `openclaw mcp serve` 的容器，然后通过真实的 stdio MCP 桥接验证路由对话发现、记录读取、附件元数据、实时事件队列行为、出站发送路由以及 Claude 风格的渠道 + 权限通知。通知检查直接检查原始 stdio MCP 帧，因此该冒烟测试验证的是桥接实际发出的内容，而不仅仅是特定客户端 SDK 恰好呈现的内容。`test:docker:agent-bundle-mcp-tools` 是确定性的，不需要实时模型密钥。它构建仓库 Docker 镜像，在容器内启动一个真正的 stdio MCP 探针服务器，通过嵌入式 OpenClaw 包 MCP 运行时实例化该服务器，执行工具，然后验证 `coding` 和 `messaging` 保留 `bundle-mcp` 工具，而 `minimal` 和 `tools.deny: ["bundle-mcp"]` 则过滤它们。`test:docker:cron-mcp-cleanup` 是确定性的，不需要实时模型密钥。它启动一个带有真实 stdio MCP 探针服务器的已设定种子的 Gateway(网关)，运行一个隔离的 cron 轮次和一个 `sessions_spawn` 一次性子轮次，然后验证 MCP 子进程在每次运行后退出。

手动 ACP 纯语言线程冒烟测试（非 CI）：

- `bun scripts/dev/discord-acp-plain-language-smoke.ts --channel <discord-channel-id> ...`
- 保留此脚本以用于回归/调试工作流。它可能再次需要用于 ACP 线程路由验证，因此请勿删除。

有用的环境变量：

- `OPENCLAW_CONFIG_DIR=...`（默认：`~/.openclaw`）挂载到 `/home/node/.openclaw`
- `OPENCLAW_WORKSPACE_DIR=...`（默认：`~/.openclaw/workspace`）挂载到 `/home/node/.openclaw/workspace`
- `OPENCLAW_PROFILE_FILE=...` 已挂载并在运行测试前导入
- `OPENCLAW_DOCKER_PROFILE_ENV_ONLY=1` 用于仅验证从 `OPENCLAW_PROFILE_FILE`CLI 导入的环境变量，使用临时配置/工作区目录且无外部 CLI 认证挂载
- `OPENCLAW_DOCKER_CLI_TOOLS_DIR=...`（默认：`~/.cache/openclaw/docker-cli-tools`）挂载到 `/home/node/.npm-global`CLIDocker 以用于 Docker 内缓存的 CLI 安装
- CLI`$HOME` 下的外部 CLI 认证目录/文件以只读方式挂载到 `/host-auth...` 下，然后在测试开始前复制到 `/home/node/...`
  - 默认目录：`.minimax`
  - 默认文件：`~/.codex/auth.json`、`~/.codex/config.toml`、`.claude.json`、`~/.claude/.credentials.json`、`~/.claude/settings.json`、`~/.claude/settings.local.json`
  - 缩小的提供商运行仅挂载从 `OPENCLAW_LIVE_PROVIDERS` / `OPENCLAW_LIVE_GATEWAY_PROVIDERS` 推断出的所需目录/文件
  - 使用 `OPENCLAW_DOCKER_AUTH_DIRS=all`、`OPENCLAW_DOCKER_AUTH_DIRS=none` 或逗号列表（如 `OPENCLAW_DOCKER_AUTH_DIRS=.claude,.codex`）手动覆盖
- `OPENCLAW_LIVE_GATEWAY_MODELS=...` / `OPENCLAW_LIVE_MODELS=...` 以缩小运行范围
- `OPENCLAW_LIVE_GATEWAY_PROVIDERS=...` / `OPENCLAW_LIVE_PROVIDERS=...` 以在容器内过滤提供商
- `OPENCLAW_SKIP_DOCKER_BUILD=1` 以重用现有的 `openclaw:local-live` 镜像，用于不需要重新构建的重新运行
- `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` 以确保凭据来自配置文件存储（而非环境变量）
- `OPENCLAW_OPENWEBUI_MODEL=...` 用于选择 Gateway 为 Open WebUI smoke 暴露的模型
- `OPENCLAW_OPENWEBUI_PROMPT=...` 用于覆盖 Open WebUI smoke 使用的 nonce-check 提示
- `OPENWEBUI_IMAGE=...` 用于覆盖固定的 Open WebUI 镜像标签

## Docs sanity

在文档编辑后运行文档检查：`pnpm check:docs`。
当您还需要页面内标题检查时，运行完整的 Mintlify 锚点验证：`pnpm docs:check-links:anchors`。

## Offline regression (CI-safe)

这些是没有真实提供商的“真实管道”回归测试：

- Gateway(网关) 工具调用（模拟 OpenAI，真实 Gateway + agent 循环）：Gateway(网关)OpenAI`src/gateway/gateway.test.ts`OpenAI (case: "runs a mock OpenAI 工具 call end-to-end via gateway agent loop")
- Gateway(网关) 向导（WS Gateway(网关)`wizard.start`/`wizard.next`，写入配置 + 强制认证）：`src/gateway/gateway.test.ts` (case: "runs wizard over ws and writes auth token config")

## Agent reliability evals (skills)

我们已经有一些 CI 安全的测试，其行为类似于“agent 可靠性评估”：

- 通过真实 Gateway + agent 循环模拟工具调用（`src/gateway/gateway.test.ts`）。
- 验证会话连接和配置效果的端到端向导流程（`src/gateway/gateway.test.ts`）。

Skills 目前仍缺失的内容（参见 [Skills](/zh/tools/skills)）：

- **决策制定：** 当 Skills 列在提示中时，agent 是否会选择正确的 Skill（或避免无关的）？
- **合规性：** agent 是否在使用前读取 `SKILL.md` 并遵循必需的步骤/参数？
- **工作流契约：** 断言工具顺序、会话历史保留和沙箱边界的多轮场景。

未来的评估应首先保持确定性：

- 使用模拟提供商的场景运行器，用于断言工具调用 + 顺序、Skill 文件读取和会话连接。
- 一小套专注于 Skill 的场景（使用与避免、选通、提示注入）。
- 只有在 CI 安全的套件到位后，才进行可选的实时评估（opt-in, env-gated）。

## Contract tests (plugin and 渠道 shape)

Contract tests verify that every registered plugin and 渠道 conforms to its
interface contract. They iterate over all discovered plugins and run a suite of
shape and behavior assertions. The default `pnpm test` unit lane intentionally
skips these shared seam and smoke files; run the contract commands explicitly
when you touch shared 渠道 or 提供商 surfaces.

### 命令

- 所有合约： `pnpm test:contracts`
- 仅渠道合约： `pnpm test:contracts:channels`
- 仅提供商合约： `pnpm test:contracts:plugins`

### 渠道合约

位于 `src/channels/plugins/contracts/*.contract.test.ts`：

- **plugin** - Basic plugin shape (id, name, capabilities)
- **setup** - Setup wizard contract
- **会话-binding** - Session binding behavior
- **outbound-payload** - Message payload structure
- **inbound** - Inbound message handling
- **actions** - Channel action handlers
- **threading** - Thread ID handling
- **directory** - Directory/roster API
- **group-policy** - Group policy enforcement

### Provider status contracts

Located in `src/plugins/contracts/*.contract.test.ts`.

- **status** - Channel status probes
- **registry** - Plugin registry shape

### Provider contracts

Located in `src/plugins/contracts/*.contract.test.ts`:

- **auth** - Auth flow contract
- **auth-choice** - Auth choice/selection
- **catalog** - Model catalog API
- **discovery** - Plugin discovery
- **loader** - Plugin loading
- **runtime** - Provider runtime
- **shape** - Plugin shape/interface
- **wizard** - Setup wizard

### 运行时机

- After changing plugin-sdk exports or subpaths
- After adding or modifying a 渠道 or 提供商 plugin
- After refactoring plugin registration or discovery

Contract tests run in CI and do not require real API keys.

## 添加回归测试（指导）

When you fix a 提供商/模型 issue discovered in live:

- Add a CI-safe regression if possible (mock/stub 提供商, or capture the exact request-shape transformation)
- If it's inherently live-only (rate limits, auth policies), keep the live test narrow and opt-in via 环境变量
- Prefer targeting the smallest layer that catches the bug:
  - 提供商 request conversion/replay bug → direct models test
  - gateway 会话/历史/工具 管道错误 → gateway live smoke 或 CI 安全 gateway mock 测试
- SecretRef 遍历防护：
  - `src/secrets/exec-secret-ref-id-parity.test.ts` 从注册表元数据（`listSecretTargetRegistryEntries()`）中为每个 SecretRef 类派生一个采样目标，然后断言遍历段执行 ID 被拒绝。
  - 如果您在 `src/secrets/target-registry-data.ts` 中添加了新的 `includeInPlan` SecretRef 目标系列，请在该测试中更新 `classifyTargetClass`。该测试会在未分类的目标 ID 上故意失败，以便新类不会被静默跳过。

## 相关

- [Testing live](/zh/help/testing-live)
- [Testing updates and plugins](/zh/help/testing-updates-plugins)
- [CI](/zh/ci)
