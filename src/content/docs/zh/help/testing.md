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
**QA 堆栈 (qa-lab, qa-渠道, live transport lanes)** 在单独的文档中进行了说明：

- [QA 概述](/zh/concepts/qa-e2e-automationMatrix) - 架构、命令界面、场景编写。
- [Matrix QA](/zh/concepts/qa-matrix) - `pnpm openclaw qa matrix` 的参考文档。
- [QA 渠道](/zh/channels/qa-channelDocker) - 由仓库支持的场景使用的合成传输插件。

本页面涵盖运行常规测试套件和 Docker/Parallels 运行器。下面的特定于 QA 的运行器部分 ([QA-specific runners](#qa-specific-runners)) 列出了具体的 `qa` 调用，并指回上面的参考文档。

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
  - 在 OpenClaw 中安装打包好的 Docker tarball，运行 OpenAI API 密钥新手引导，并验证 Codex 插件和 `@openai/codex` 依赖项是否已按需下载到托管的 npm 根目录中。
- 实时插件工具依赖冒烟测试：`pnpm test:docker:live-plugin-tool`
  - 打包一个具有真实 `slugify` 依赖项的 fixture 插件，通过 `npm-pack:` 安装它，验证托管的 npm 根目录下的依赖项，然后请求实时的 OpenAI 模型调用插件工具并返回隐藏的 slug。
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
- `pnpm test:plugins:kitchen-sink-live`
  - 通过 QA Lab 运行实时 OpenAI Kitchen Sink 插件测试。它安装外部 Kitchen Sink 包，验证插件 SDK 表面清单，探测 `/healthz` 和 `/readyz`，记录 gateway CPU/RSS 证据，运行实时 OpenAI 轮次，并检查对抗性诊断。需要实时 OpenAI 身份验证，例如 `OPENAI_API_KEY`。在已水合的 Testbox 会话中，当存在 `openclaw-testbox-env` 辅助工具时，它会自动获取 Testbox 实时身份验证配置文件。
- `pnpm test:gateway:cpu-scenarios`
  - 运行 gateway 启动基准测试以及一个小型的模拟 QA Lab 场景包 (`channel-chat-baseline`, `memory-failure-fallback`, `gateway-restart-inflight-run`)，并在 `.artifacts/gateway-cpu-scenarios/` 下写入综合 CPU 观测摘要。
  - 默认仅标记持续的高 CPU 观测值（`--cpu-core-warn` 加上 `--hot-wall-warn-ms`），因此短时的启动爆发会被记录为指标，而看起来不会像持续数分钟的 gateway 挂起回归。
  - 使用已构建的 `dist` 产物；当检出代码尚未包含最新的运行时输出时，请先运行构建。
- `pnpm openclaw qa suite --runner multipass`
  - 在一次性 Multipass Linux 虚拟机内运行相同的 QA 套件。
  - 在主机上保持与 `qa suite` 相同的场景选择行为。
  - 重用与 `qa suite` 相同的提供商/模型选择标志。
  - Live 运行转发适用于访客的受支持 QA 认证输入：
    基于环境的提供商密钥、QA live 提供商 config 路径，以及 `CODEX_HOME`
    （如果存在）。
  - 输出目录必须保持在仓库根目录下，以便访客可以通过
    挂载的工作区写回数据。
  - 将常规 QA 报告 + 摘要以及 Multipass 日志写入
    `.artifacts/qa-e2e/...`。
- `pnpm qa:lab:up`
  - 启动基于 Docker 的 QA 站点，用于操作员式的 QA 工作。
- `pnpm test:docker:npm-onboard-channel-agent`
  - 从当前检出构建一个 npm tarball，在
    Docker 中全局安装它，运行非交互式 OpenAI API 密钥新手引导，默认配置 Telegram，
    验证打包的插件运行时在无需启动依赖修复的情况下加载，运行 doctor，并针对
    模拟的 OpenAI 端点运行一个本地 agent 回合。
  - 使用 `OPENCLAW_NPM_ONBOARD_CHANNEL=discord` 通过 Discord 运行相同的打包安装
    lane。
- `pnpm test:docker:session-runtime-context`
  - 针对嵌入式运行时上下文
    转录，运行确定性构建应用 Docker 冒烟测试。它验证隐藏的 OpenClaw 运行时上下文作为
    非显示自定义消息保留，而不是泄露到可见的用户回合中，
    然后植入受影响的损坏会话 JSONL 并验证
    `openclaw doctor --fix` 是否将其重写到活动分支并进行备份。
- `pnpm test:docker:npm-telegram-live`
  - 在 OpenClaw 中安装 Docker 包候选版本，运行已安装包
    新手引导，通过已安装的 Telegram 配置 CLI，然后重用
    实时 Telegram QA 流程，并将该已安装包作为 SUT Gateway(网关)。
  - 包装器仅从检出中挂载 `qa-lab` 线束源；
    已安装的包拥有 `dist`、`openclaw/plugin-sdk` 和捆绑插件
    运行时，因此该 lane 不会将当前检出插件混合到
    被测包中。
  - 默认为 `OPENCLAW_NPM_TELEGRAM_PACKAGE_SPEC=openclaw@beta`；设置
    `OPENCLAW_NPM_TELEGRAM_PACKAGE_TGZ=/path/to/openclaw-current.tgz` 或
    `OPENCLAW_CURRENT_PACKAGE_TGZ` 以测试已解析的本地 tarball，而不是
    从注册表安装。
  - 使用与 `pnpm openclaw qa telegram` 相同的 Telegram 环境凭证或 Convex 凭证源。
    对于 CI/发布自动化，请设置
    `OPENCLAW_NPM_TELEGRAM_CREDENTIAL_SOURCE=convex` 以及
    `OPENCLAW_QA_CONVEX_SITE_URL` 和角色密钥。如果
    `OPENCLAW_QA_CONVEX_SITE_URL` 和 Convex 角色密钥存在于 CI 中，
    Docker 包装器会自动选择 Convex。
  - 包装器在 Telegram 构建/安装工作之前验证主机上的 Docker 或 Convex 凭证环境。
    仅在专门调试凭证前设置时设置 `OPENCLAW_NPM_TELEGRAM_SKIP_CREDENTIAL_PREFLIGHT=1`
    。
  - `OPENCLAW_NPM_TELEGRAM_CREDENTIAL_ROLE=ci|maintainer` 覆盖了仅针对该通道的共享
    `OPENCLAW_QA_CREDENTIAL_ROLE`。
  - GitHub Actions 将此通道作为手动维护者工作流
    `NPM Telegram Beta E2E` 公开。它不会在合并时运行。该工作流使用
    `qa-live-shared` 环境和 Convex CI 凭证租约。
- GitHub Actions 还公开了 `Package Acceptance`，用于针对一个候选包进行侧运行产品验证。它接受可信引用、已发布的 npm 规范、HTTPS tarball URL 加 SHA-256，或来自另一次运行的 tarball 构件，将标准化的 `openclaw-current.tgz` 上传为 `package-under-test`，然后使用冒烟、包、产品、完整或自定义通道配置文件运行现有的 Docker E2E 调度器。设置 `telegram_mode=mock-openai` 或 `live-frontier` 以针对同一个 `package-under-test` 构件运行 Telegram QA 工作流。
  - 最新的 Beta 产品验证：

```bash
gh workflow run package-acceptance.yml --ref main \
  -f source=npm \
  -f package_spec=openclaw@beta \
  -f suite_profile=product \
  -f telegram_mode=mock-openai
```

- 精确的 tarball URL 证明需要摘要并使用公共 URL 安全策略：

```bash
gh workflow run package-acceptance.yml --ref main \
  -f source=url \
  -f package_url=https://registry.npmjs.org/openclaw/-/openclaw-VERSION.tgz \
  -f package_sha256=<sha256> \
  -f suite_profile=package
```

- 企业/私有 tarball 镜像使用显式的可信源策略：

```bash
gh workflow run package-acceptance.yml --ref main \
  -f source=trusted-url \
  -f trusted_source_id=enterprise-artifactory \
  -f package_url=https://packages.example.internal:8443/artifactory/openclaw/openclaw-VERSION.tgz \
  -f package_sha256=<sha256> \
  -f suite_profile=package
```

`source=trusted-url` 从受信任的工作流引用读取 `.github/package-trusted-sources.json`，并且不接受 URL 凭据或工作流输入的私有网络绕过。如果指定的策略声明了 bearer auth，请配置固定的 `OPENCLAW_TRUSTED_PACKAGE_TOKEN` 密钥。

- Artifact proof 从另一个 Actions 运行下载 tarball 制品：

```bash
gh workflow run package-acceptance.yml --ref main \
  -f source=artifact \
  -f artifact_run_id=<run-id> \
  -f artifact_name=<artifact-name> \
  -f suite_profile=smoke
```

- `pnpm test:docker:plugins`
  - 在 OpenClaw 中打包并安装当前的 Docker 构建，在配置了 Gateway(网关) 的情况下启动 OpenAI，然后通过配置编辑启用捆绑的渠道/plugins。
  - 验证设置发现会保留未配置的可下载插件的缺失状态，第一次配置的 doctor repair 会显式安装每个缺失的可下载插件，而第二次重启不会运行隐藏的依赖项修复。
  - 此外，还会安装一个已知的旧版 npm 基线，在运行 `openclaw update --tag <candidate>` 之前启用 Telegram，并验证候选版本的更新后 doctor 能够清理遗留的插件依赖项碎片，而无需 harness 端的 postinstall 修复。
- `pnpm test:parallels:npm-update`
  - 跨 Parallels 虚拟机运行原生打包安装更新冒烟测试。每个选定的平台首先安装请求的基线包，然后在同一虚拟机中运行已安装的 `openclaw update` 命令，并验证安装的版本、更新状态、Gateway 就绪状态以及一次本地 agent 轮次。
  - 在迭代一个虚拟机时，使用 `--platform macos`、`--platform windows` 或 `--platform linux`。使用 `--json` 获取摘要制品路径和每个通道的状态。
  - OpenAI 车道默认使用 OpenAI`openai/gpt-5.5` 进行实时 Agent 轮次验证。当刻意验证另一个 OpenAI 模型时，请传递 `--model <provider/model>` 或设置 `OPENCLAW_PARALLELS_OPENAI_MODEL`OpenAI。
  - 将长时间的本地运行包裹在一个主机超时中，以免 Parallels 传输停滞占用剩余的测试窗口：

    ```bash
    timeout --foreground 150m pnpm test:parallels:npm-update -- --json
    timeout --foreground 90m pnpm test:parallels:npm-update -- --platform windows --json
    ```

  - 该脚本会在 `/tmp/openclaw-parallels-npm-update.*` 下写入嵌套车道日志。在断定外部包装已挂起之前，请检查 `windows-update.log`、`macos-update.log` 或 `linux-update.log`。
  - Windows 更新可能在冷访客机上花费 10 到 15 分钟进行更新后诊断和包更新工作；只要嵌套的 npm 调试日志在推进，这仍然是正常的。
  - 不要将此聚合包装器与单独的 Parallels macOS、Windows 或 Linux 冒烟车道并行运行。它们共享 VM 状态，并可能在快照还原、包提供或访客网关状态上发生冲突。
  - 更新后验证运行正常的捆绑插件表面，因为诸如语音、图像生成和媒体理解等功能门面是通过捆绑运行时 API 加载的，即使 Agent 轮次本身仅检查简单的文本响应。

- `pnpm openclaw qa aimock`
  - 仅启动本地 AIMock 提供商服务器以进行直接协议冒烟测试。
- `pnpm openclaw qa matrix`
  - 针对一次性 Docker 支持的 Tuwunel 主服务器运行 Matrix 实时 QA 车道。仅限源代码检出 - 打包安装不附带 MatrixDocker`qa-lab`。
  - 完整的 CLI、配置文件/场景目录、环境变量和构件布局：[Matrix QA](CLIMatrix/en/concepts/qa-matrix)。
- `pnpm openclaw qa telegram`
  - 使用来自环境的驱动程序和 SUT 机器人令牌，针对真实的私密组运行 Telegram 实时 QA 车道。
  - 需要 `OPENCLAW_QA_TELEGRAM_GROUP_ID`、`OPENCLAW_QA_TELEGRAM_DRIVER_BOT_TOKEN` 和 `OPENCLAW_QA_TELEGRAM_SUT_BOT_TOKEN`Telegram。组 ID 必须是数字形式的 Telegram 聊天 ID。
  - 支持 `--credential-source convex` 以使用共享的凭证池。默认使用 env 模式，或者设置 `OPENCLAW_QA_CREDENTIAL_SOURCE=convex` 以选择加入池化租约。
  - 默认设置涵盖金丝雀（canary）、提及门控、命令寻址、`/status`、机器人对机器人的提及回复以及核心原生命令回复。`mock-openai` 的默认设置也涵盖确定性回复链和 Telegram 最终消息流式传输回归。使用 `--list-scenarios` 进行可选探测，例如 `session_status`。
  - 当任何场景失败时，以非零状态退出。当您希望在出现失败退出码的情况下仍获取产物时，请使用 `--allow-failures`。
  - 需要在同一个私密群组中有两个不同的机器人，且被测系统（SUT）机器人需公开 Telegram 用户名。
  - 为了稳定的机器人对机器人观察，请在 `@BotFather` 中为两个机器人启用 Bot-to-Bot 通信模式，并确保驱动机器人可以观察群组机器人的流量。
  - 在 `.artifacts/qa-e2e/...` 下写入 Telegram QA 报告、摘要和观察到的消息产物。回复场景包括从驱动程序发送请求到观察到被测系统回复的往返时间（RTT）。

`Mantis Telegram Live` 是此通道的 PR 证据封装器。它运行带有 Convex 租用 Telegram 凭证的候选引用，在 Crabbox 桌面浏览器中呈现经过编辑的观察消息记录，录制 MP4 证据，生成动态修剪的 GIF，上传产物包，并在设置了 `pr_number` 时通过 Mantis GitHub 应用程序发布内联 PR 证据。维护者可以通过 `Mantis Scenario` (`scenario_id:
telegram-live`) 从 Actions UI 启动它，或者直接从拉取请求评论中启动：

```text
@openclaw-mantis telegram
@openclaw-mantis telegram scenario=telegram-status-command
@openclaw-mantis telegram scenarios=telegram-status-command,telegram-mentioned-message-reply
```

`Mantis Telegram Desktop Proof` 是用于 PR 视觉证明的原生 Telegram 桌面版的前后对比封装器。使用自由格式的 `instructions` 从 Actions UI 启动它，通过 `Mantis Scenario` (`scenario_id:
telegram-desktop-proof`) 启动，或从 PR 评论中启动：

```text
@openclaw-mantis telegram desktop proof
```

Mantis 代理会读取 PR，决定哪种 Telegram 可见行为能证明更改，在基准和候选引用上运行真实用户的 Crabbox Telegram Desktop 演示通道，迭代直到原生 GIF 有用为止，写入配对的 TelegramTelegram`motionPreview`GitHub 清单，并在设置了 `pr_number` 时通过 Mantis GitHub App 发布相同的双列 GIF 表。

- `pnpm openclaw qa mantis telegram-desktop-builder`
  - 租用或重用 Crabbox Linux 桌面，安装原生 Telegram Desktop，使用租用的 Telegram SUT bot 令牌配置 OpenClaw，启动网关，并从可见的 VNC 桌面记录截图/MP4 证据。
  - 默认为 `--credential-source convex`，因此工作流只需要 Convex broker 密钥。使用 `--credential-source env` 并带有与 `pnpm openclaw qa telegram` 相同的 `OPENCLAW_QA_TELEGRAM_*` 变量。
  - Telegram Desktop 仍需要用户登录/个人资料。Bot 令牌仅配置 OpenClaw。使用 TelegramOpenClaw`--telegram-profile-archive-env <name>` 获取 base64 `.tgz` 个人资料存档，或使用 `--keep-lease` 并通过 VNC 手动登录一次。
  - 在输出目录下写入 `mantis-telegram-desktop-builder-report.md`、`mantis-telegram-desktop-builder-summary.json`、`telegram-desktop-builder.png` 和 `telegram-desktop-builder.mp4`。

实时传输通道共享一个标准契约，以确保新传输不会偏离；每个通道的覆盖率矩阵位于 [QA overview → Live transport coverage](/zh/concepts/qa-e2e-automation#live-transport-coverage)。`qa-channel` 是广泛的综合套件，不属于该矩阵的一部分。

### 通过 Convex 共享的 Telegram 凭据 (v1)

当为实时传输 QA 启用了 `--credential-source convex`（或 `OPENCLAW_QA_CREDENTIAL_SOURCE=convex`DiscordSlackWhatsApp）时，QA 实验室会从 Convex 支持的池中获取独占租约，在通道运行期间发送该租约的心跳，并在关闭时释放该租约。该部分的名称早于 Discord、Slack 和 WhatsApp 的支持；租约合约在各种类型中共享。

参考 Convex 项目脚手架：

- `qa/convex-credential-broker/`

所需环境变量：

- `OPENCLAW_QA_CONVEX_SITE_URL`（例如 `https://your-deployment.convex.site`）
- 所选角色的一个密钥：
  - `OPENCLAW_QA_CONVEX_SECRET_MAINTAINER` 用于 `maintainer`
  - `OPENCLAW_QA_CONVEX_SECRET_CI` 用于 `ci`
- 凭据角色选择：
  - CLI：CLI`--credential-role maintainer|ci`
  - 环境变量默认值：`OPENCLAW_QA_CREDENTIAL_ROLE`（在 CI 中默认为 `ci`，否则为 `maintainer`）

可选环境变量：

- `OPENCLAW_QA_CREDENTIAL_LEASE_TTL_MS`（默认 `1200000`）
- `OPENCLAW_QA_CREDENTIAL_HEARTBEAT_INTERVAL_MS`（默认 `30000`）
- `OPENCLAW_QA_CREDENTIAL_ACQUIRE_TIMEOUT_MS`（默认 `90000`）
- `OPENCLAW_QA_CREDENTIAL_HTTP_TIMEOUT_MS`（默认 `15000`）
- `OPENCLAW_QA_CONVEX_ENDPOINT_PREFIX`（默认 `/qa-credentials/v1`）
- `OPENCLAW_QA_CREDENTIAL_OWNER_ID`（可选 trace id）
- `OPENCLAW_QA_ALLOW_INSECURE_HTTP=1` 允许仅本地开发使用环回 `http://` Convex URL。

正常操作中 `OPENCLAW_QA_CONVEX_SITE_URL` 应使用 `https://`。

维护者管理命令（池添加/移除/列表）特别需要 `OPENCLAW_QA_CONVEX_SECRET_MAINTAINER`。

维护者的 CLI 辅助工具：

```bash
pnpm openclaw qa credentials doctor
pnpm openclaw qa credentials add --kind telegram --payload-file qa/telegram-credential.json
pnpm openclaw qa credentials list --kind telegram
pnpm openclaw qa credentials remove --credential-id <credential-id>
```

在实时运行之前使用 `doctor` 检查 Convex 站点 URL、代理密钥、端点前缀、HTTP 超时以及管理/列表的可达性，而不会打印密钥值。在脚本和 CI 实用程序中使用 `--json` 获取机器可读的输出。

默认端点契约 (`OPENCLAW_QA_CONVEX_SITE_URL` + `/qa-credentials/v1`)：

- `POST /acquire`
  - 请求： `{ kind, ownerId, actorRole, leaseTtlMs, heartbeatIntervalMs }`
  - 成功： `{ status: "ok", credentialId, leaseToken, payload, leaseTtlMs?, heartbeatIntervalMs? }`
  - 耗尽/可重试： `{ status: "error", code: "POOL_EXHAUSTED" | "NO_CREDENTIAL_AVAILABLE", ... }`
- `POST /payload-chunk`
  - 请求： `{ kind, ownerId, actorRole, credentialId, leaseToken, index }`
  - 成功： `{ status: "ok", index, data }`
- `POST /heartbeat`
  - 请求： `{ kind, ownerId, actorRole, credentialId, leaseToken, leaseTtlMs }`
  - 成功： `{ status: "ok" }` （或为空 `2xx`）
- `POST /release`
  - 请求： `{ kind, ownerId, actorRole, credentialId, leaseToken }`
  - 成功： `{ status: "ok" }` （或为空 `2xx`）
- `POST /admin/add` （仅限维护者密钥）
  - 请求： `{ kind, actorId, payload, note?, status? }`
  - 成功： `{ status: "ok", credential }`
- `POST /admin/remove` （仅限维护者密钥）
  - 请求： `{ credentialId, actorId }`
  - 成功： `{ status: "ok", changed, credential }`
  - 活跃租约保护： `{ status: "error", code: "LEASE_ACTIVE", ... }`
- `POST /admin/list` （仅限维护者密钥）
  - 请求： `{ kind?, status?, includePayload?, limit? }`
  - 成功： `{ status: "ok", credentials, count }`

Telegram 类型的负载结构：

- `{ groupId: string, driverToken: string, sutToken: string }`
- `groupId`Telegram 必须是数字 Telegram 聊天 ID 字符串。
- `admin/add` 验证 `kind: "telegram"` 的此结构并拒绝格式错误的负载。

Telegram 真实用户类型的负载结构：

- `{ groupId: string, sutToken: string, testerUserId: string, testerUsername: string, telegramApiId: string, telegramApiHash: string, tdlibDatabaseEncryptionKey: string, tdlibArchiveBase64: string, tdlibArchiveSha256: string, desktopTdataArchiveBase64: string, desktopTdataArchiveSha256: string }`
- `groupId`、`testerUserId` 和 `telegramApiId` 必须是数字字符串。
- `tdlibArchiveSha256` 和 `desktopTdataArchiveSha256` 必须是 SHA-256 十六进制字符串。
- `kind: "telegram-user"`Telegram 已预留给 Mantis Telegram Desktop 验证工作流。通用 QA Lab 车道不得获取它。

Broker 验证的多渠道负载：

- Discord： Discord`{ guildId: string, channelId: string, driverBotToken: string, sutBotToken: string, sutApplicationId: string, voiceChannelId?: string }`
- WhatsApp: WhatsApp`{ driverPhoneE164: string, sutPhoneE164: string, driverAuthArchiveBase64: string, sutAuthArchiveBase64: string, groupJid?: string }`

Slack 渠道也可以从池中租用，但 Slack 负载验证目前位于 Slack QA 运行器中而不是代理中。对 Slack 行使用 SlackSlackSlack`{ channelId: string, driverBotToken: string, sutBotToken: string, sutAppToken: string }`Slack。

### 向 QA 添加渠道

新渠道适配器的架构和场景辅助名称位于 [QA 概述 → 添加渠道](/zh/concepts/qa-e2e-automation#adding-a-channel)。最低要求：在共享的 `qa-lab` host seam 上实现传输运行器，在插件清单中声明 `qaRunners`，挂载为 `openclaw qa <runner>`，并在 `qa/scenarios/` 下编写场景。

## 测试套件（哪里运行什么）

可以将这些套件视为“真实性递增”（以及不稳定性/成本递增）：

### 单元 / 集成（默认）

- 命令：`pnpm test`
- 配置：无目标的运行使用 `vitest.full-*.config.ts` 分片集，并可以将多项目分片扩展为每个项目的配置以便并行调度
- 文件：`src/**/*.test.ts`、`packages/**/*.test.ts` 和 `test/**/*.test.ts` 下的 core/unit 清单；UI 单元测试在专用的 `unit-ui` 分片中运行
- 范围：
  - 纯单元测试
  - 进程内集成测试（网关身份验证、路由、工具、解析、配置）
  - 已知错误的确定性回归测试
- 预期：
  - 在 CI 中运行
  - 不需要真实的密钥
  - 应该快速且稳定
  - 解析器和公共表面加载器测试必须使用生成的微型插件夹具证明广泛的 `api.js` 和 `runtime-api.js`API 回退行为，而不是真实的捆绑插件源 API。真实的插件 API 加载属于插件拥有的合约/集成套件。

原生依赖策略：

- 默认测试安装会跳过可选的原生 Discord opus 构建。Discord 语音接收使用纯 JS DiscordDiscord`opusscript` 解码器，并且 `@discordjs/opus` 在 `allowBuilds` 中保持禁用状态，因此本地测试和 Testbox 轨道不会编译原生插件。
- 如果您有意需要比较原生 opus 构建，请使用专用的 Discord 语音性能或 live 轨道。不要在默认 `allowBuilds` 中将 Discord`@discordjs/opus` 设置为 `true`；这会导致不相关的安装/测试循环编译原生代码。

<AccordionGroup>
  <Accordion title="Projects, shards, and scoped lanes">

    - Untargeted `pnpm test` 运行十二个较小的分片配置（`core-unit-fast`、`core-unit-src`、`core-unit-security`、`core-unit-ui`、`core-unit-support`、`core-support-boundary`、`core-contracts`、`core-bundled`、`core-runtime`、`agentic`、`auto-reply`、`extensions`），而不是一个巨大的原生根项目进程。这可以降低负载机器上的峰值 RSS，并避免自动回复/扩展工作饿死不相关的测试套件。
    - `pnpm test --watch` 仍使用原生根 `vitest.config.ts` 项目图，因为多分片监视循环是不切实际的。
    - `pnpm test`、`pnpm test:watch` 和 `pnpm test:perf:imports` 首先通过作用域通道（scoped lanes）路由显式文件/目录目标，因此 `pnpm test extensions/discord/src/monitor/message-handler.preflight.test.ts` 避免了支付完整的根项目启动税。
    - `pnpm test:changed` 默认将更改的 git 路径扩展为廉价的作用域通道：直接测试编辑、同级 `*.test.ts` 文件、显式源映射和本地导入图依赖项。除非您显式使用 `OPENCLAW_TEST_CHANGED_BROAD=1 pnpm test:changed`，否则配置/设置/包编辑不会广泛运行测试。
    - `pnpm check:changed` 是针对窄域工作的正常智能本地检查网关。它将差异分类为核心、核心测试、扩展、扩展测试、应用、文档、发布元数据、实时 Docker 工具和工具，然后运行匹配的类型检查、Lint 和 Guard 命令。它不运行 Vitest 测试；请调用 `pnpm test:changed` 或显式调用 `pnpm test <target>` 进行测试验证。仅发布元数据的版本升级运行针对性的版本/配置/根依赖项检查，并设有一个 Guard，拒绝顶级版本字段之外的包更改。
    - 实时 Docker ACP 约束编辑运行集中检查：实时 Docker 身份验证脚本的 Shell 语法和实时 Docker 调度器空运行。仅当差异限于 `scripts["test:docker:live-*"]` 时，才包含 `package.json` 更改；依赖项、导出、版本和其他包表面编辑仍使用更广泛的 Guard。
    - 来自代理、命令、插件、自动回复助手、`plugin-sdk` 和类似纯工具领域的轻量导入单元测试通过 `unit-fast` 通道路由，该通道跳过 `test/setup-openclaw-runtime.ts`；有状态/运行时繁重的文件保留在现有通道上。
    - 选定的 `plugin-sdk` 和 `commands` 助手源文件还将更改模式运行映射到这些轻量通道中的显式同级测试，因此助手编辑避免为该目录重新运行完整的重型套件。
    - `auto-reply` 为顶级核心助手、顶级 `reply.*` 集成测试和 `src/auto-reply/reply/**` 子树提供了专用的存储桶。CI 进一步将回复子树拆分为代理运行器、调度和命令/状态路由分片，因此一个导入繁重的存储桶不会拥有完整的 Node 尾部。
    - 正常的 PR/main CI 故意跳过扩展批量扫描和仅发布 `agentic-plugins` 分片。完整的发布验证为发布候选版本上的那些插件/扩展繁重的套件调度单独的 `Plugin Prerelease` 子工作流。

  </Accordion>

  <Accordion title="嵌入式运行器覆盖率">

    - 当您更改 message-工具 发现输入或压缩运行时上下文时，请保持两个级别的覆盖率。
    - 为纯路由和规范化边界添加有针对性的辅助回归测试。
    - 保持嵌入式运行器集成套件的健康发展：
      `src/agents/pi-embedded-runner/compact.hooks.test.ts`，
      `src/agents/pi-embedded-runner/run.overflow-compaction.test.ts` 和
      `src/agents/pi-embedded-runner/run.overflow-compaction.loop.test.ts`。
    - 这些套件验证了作用域 ID 和压缩行为仍然流经真正的 `run.ts` / `compact.ts` 路径；仅靠辅助测试不足以替代这些集成路径。

  </Accordion>

  <Accordion title="Vitest 池和隔离默认值">

    - 基础 Vitest 配置默认为 `threads`。
    - 共享 Vitest 配置固定了 `isolate: false`，并在根项目、e2e 和 live 配置中使用非隔离运行器。
    - 根 UI 车道保留其 `jsdom` 设置和优化器，但也在共享的非隔离运行器上运行。
    - 每个 `pnpm test` 分片都从共享 Vitest 配置继承相同的 `threads` + `isolate: false` 默认值。
    - `scripts/run-vitest.mjs` 默认为 Vitest 子 Node 进程添加 `--no-maglev`，以减少大型本地运行期间的 V8 编译开销。设置 `OPENCLAW_VITEST_ENABLE_MAGLEV=1` 以与原生 V8 行为进行比较。

  </Accordion>

  <Accordion title="快速本地迭代">

    - `pnpm changed:lanes` 显示差异触发哪些架构通道。
    - 提交前钩子仅用于格式化。它会重新暂存格式化后的文件，并且不运行 lint、类型检查或测试。
    - 在移交或推送之前，当您需要智能本地检查关卡时，请显式运行 `pnpm check:changed`。
    - `pnpm test:changed` 默认通过廉价的作用域通道路由。仅当代理确定 harness、配置、包或合约编辑确实需要更广泛的 Vitest 覆盖时，才使用 `OPENCLAW_TEST_CHANGED_BROAD=1 pnpm test:changed`。
    - `pnpm test:max` 和 `pnpm test:changed:max` 保持相同的路由行为，只是具有更高的 worker 上限。
    - 本地 worker 自动扩缩是有意保守的，当主机平均负载已经很高时会退缩，因此默认情况下，多个并发的 Vitest 运行造成的破坏较小。
    - 基础 Vitest 配置将项目/配置文件标记为 `forceRerunTriggers`，以便当测试连接发生变化时，更改模式重新运行保持正确。
    - 该配置在受支持的主机上保持 `OPENCLAW_VITEST_FS_MODULE_CACHE` 启用；如果您想要一个明确的缓存位置用于直接性能分析，请设置 `OPENCLAW_VITEST_FS_MODULE_CACHE_PATH=/abs/path`。

  </Accordion>

  <Accordion title="Perf debugging">

    - `pnpm test:perf:imports` 启用 Vitest 导入持续时间报告以及
      导入细分输出。
    - `pnpm test:perf:imports:changed` 将相同的分析视图范围限定为
      自 `origin/main` 以来更改的文件。
    - 分片计时数据被写入 `.artifacts/vitest-shard-timings.json`。
      整个配置运行使用配置路径作为键；include-pattern CI
      分片会附加分片名称，以便可以单独跟踪
      过滤后的分片。
    - 当一个热测试仍然在启动导入上花费大部分时间时，
      将繁重的依赖项保持在狭窄的本地 `*.runtime.ts` 缝隙之后，并
      直接模拟该缝隙，而不是仅仅为了通过 `vi.mock(...)` 而深度导入运行时辅助程序。
    - `pnpm test:perf:changed:bench -- --ref <git-ref>` 将路由的
      `test:changed`macOS 与该提交差异的原生根项目路径进行比较，
      并打印墙钟时间加上 macOS 最大 RSS。
    - `pnpm test:perf:changed:bench -- --worktree` 通过 `scripts/test-projects.mjs` 和根 Vitest 配置
      路由更改的文件列表，从而对当前的脏树进行基准测试。
    - `pnpm test:perf:profile:main` 为 Vitest/Vite 启动
      和转换开销编写主线程 CPU 配置文件。
    - `pnpm test:perf:profile:runner` 为禁用文件并行性的
      单元测试套件编写运行器 CPU 和堆配置文件。

  </Accordion>
</AccordionGroup>

### 稳定性 (Gateway)

- 命令：`pnpm test:stability:gateway`
- 配置：`vitest.gateway.config.ts`，强制为一个 worker
- 范围：
  - 启动一个默认启用了诊断功能的真实回环 Gateway
  - 通过诊断事件路径驱动合成的 gateway 消息、内存和大型负载 churn
  - 通过 Gateway WS RPC 查询 `diagnostics.stability`Gateway(网关)RPC
  - 覆盖诊断稳定性包持久化辅助程序
  - 断言记录器保持有界，合成 RSS 样本保持在压力预算之下，并且每个会话的队列深度耗尽回零
- 预期：
  - CI 安全且无密钥
  - 用于稳定性回归跟进的狭窄通道，而非完整 Gateway 套件的替代品

### E2E (repo aggregate)

- 命令：`pnpm test:e2e`
- 范围：
  - 运行 Gateway 烟雾 E2E 通道
  - 运行模拟 Control UI 浏览器 E2E 通道
- 预期：
  - CI 安全且无需密钥
  - 需要安装 Playwright Chromium

### E2E (Gateway 烟雾)

- 命令：`pnpm test:e2e:gateway`
- 配置：`vitest.e2e.config.ts`
- 文件：`src/**/*.e2e.test.ts`、`test/**/*.e2e.test.ts` 以及 `extensions/` 下的 bundled-plugin E2E 测试
- 运行时默认设置：
  - 使用 Vitest `threads` 配合 `isolate: false`，与仓库其他部分保持一致。
  - 使用自适应工作线程（CI：最多 2 个，本地：默认 1 个）。
  - 默认以静默模式运行以减少控制台 I/O 开销。
- 有用的覆盖选项：
  - `OPENCLAW_E2E_WORKERS=<n>` 强制工作线程数量（上限为 16）。
  - `OPENCLAW_E2E_VERBOSE=1` 重新启用详细控制台输出。
- 范围：
  - 多实例 Gateway 端到端行为
  - WebSocket/HTTP 接口、节点配对以及更繁重的网络测试
- 预期：
  - 在 CI 中运行（当在流水线中启用时）
  - 不需要真实的密钥
  - 比单元测试涉及更多移动部件（可能会更慢）

### E2E (Control UI 模拟浏览器)

- 命令：`pnpm test:ui:e2e`
- 配置：`test/vitest/vitest.ui-e2e.config.ts`
- 文件：`ui/src/**/*.e2e.test.ts`
- 范围：
  - 启动 Vite Control UI
  - 通过 Playwright 驱动真实的 Chromium 页面
  - 使用确定性的浏览器内模拟替换 Gateway(网关) WebSocket
- 预期：
  - 作为 `pnpm test:e2e` 的一部分在 CI 中运行
  - 不需要真实的 Gateway(网关)、代理或提供商密钥
  - 必须存在浏览器依赖项 (`pnpm --dir ui exec playwright install chromium`)

### E2E: OpenShell 后端烟雾

- 命令：`pnpm test:e2e:openshell`
- 文件：`extensions/openshell/src/backend.e2e.test.ts`
- 范围：
  - 通过 Docker 在主机上启动隔离的 OpenShell Gateway
  - 从临时的本地 Dockerfile 创建沙盒
  - 通过真实的 `sandbox ssh-config` + SSH exec 测试 OpenClaw 的 OpenShell 后端
  - 通过沙盒 fs 桥接验证远程规范化文件系统行为
- 预期：
  - 仅限选择加入；不是默认 `pnpm test:e2e` 运行的一部分
  - 需要本地 `openshell`CLI CLI 以及可运行的 Docker 守护进程
  - 使用隔离的 `HOME` / `XDG_CONFIG_HOME`，然后销毁测试网关和沙箱
- 有用的覆盖项：
  - `OPENCLAW_E2E_OPENSHELL=1` 用于在手动运行更广泛的 e2e 测试套件时启用该测试
  - `OPENCLAW_E2E_OPENSHELL_COMMAND=/path/to/openshell` 用于指定非默认的 CLI 二进制文件或封装脚本

### Live（真实提供商 + 真实模型）

- 命令：`pnpm test:live`
- 配置：`vitest.live.config.ts`
- 文件：`src/**/*.live.test.ts`、`test/**/*.live.test.ts`，以及 `extensions/` 下的 bundled-plugin live 测试
- 默认：通过 `pnpm test:live` **启用**（设置 `OPENCLAW_LIVE_TEST=1`）
- 范围：
  - “这个提供商/模型今天在实际使用真实凭证时真的能工作吗？”
  - 捕获提供商格式变更、工具调用怪癖、身份验证问题以及速率限制行为
- 预期结果：
  - 设计上不在 CI 中保持稳定（真实网络、真实提供商策略、配额、中断）
  - 产生费用 / 使用速率限制
  - 优先运行缩小的子集，而不是“所有内容”
- Live 运行使用已导出的 API 密钥和暂存的身份验证配置文件。
- 默认情况下，Live 运行仍然隔离 `HOME` 并将配置/身份验证材料复制到临时测试主目录中，以便单元测试固件无法修改您真实的 `~/.openclaw`。
- 仅当您有意需要 live 测试使用您真实的主目录时，才设置 `OPENCLAW_LIVE_USE_REAL_HOME=1`。
- `pnpm test:live` 默认为较安静的模式：它保留 `[live] ...` 进度输出并静默网关引导日志/Bonjour 闲聊。如果您想恢复完整的启动日志，请设置 `OPENCLAW_LIVE_TEST_QUIET=0`。
- API 密钥轮换（特定于提供商）：使用逗号/分号格式设置 API`*_API_KEYS` 或 `*_API_KEY_1`、`*_API_KEY_2`（例如 `OPENAI_API_KEYS`、`ANTHROPIC_API_KEYS`、`GEMINI_API_KEYS`），或通过 `OPENCLAW_LIVE_*_KEY` 进行每次运行的覆盖；测试会在遇到速率限制响应时重试。
- 进度/心跳输出：
  - Live 测试套件现在会向 stderr 发出进度行，以便即使 Vitest 控制台捕获处于静默状态，长时间运行的提供商调用也能 visibly active。
  - `vitest.live.config.ts` 禁用 Vitest 控制台拦截，以便提供商/网关进度行在 Live 运行期间立即流式传输。
  - 使用 `OPENCLAW_LIVE_HEARTBEAT_MS` 调整 direct-模型 心跳。
  - 使用 `OPENCLAW_LIVE_GATEWAY_HEARTBEAT_MS` 调整 gateway/probe 心跳。

## 我应该运行哪个套件？

请使用此决策表：

- 编辑逻辑/测试：运行 `pnpm test`（如果你改动较大，则运行 `pnpm test:coverage`）
- 涉及网关网络 / WS 协议 / 配对：添加 `pnpm test:e2e`
- 调试“我的机器人挂了”/ 特定于提供商的故障 / 工具调用：运行缩窄范围的 `pnpm test:live`

## Live（涉及网络）测试

对于 Live 模型矩阵、CLI 后端冒烟测试、ACP 冒烟测试、Codex app-server 线束，以及所有媒体提供商 Live 测试（Deepgram、BytePlus、ComfyUI、image、music、video、media harness）——加上 Live 运行的凭证处理——请参阅 [Testing live suites](CLIDeepgram/en/help/testing-live)。关于专门的更新和插件验证检查清单，请参阅 [Testing updates and plugins](/zh/help/testing-updates-plugins)。

## Docker 运行器（可选的“在 Linux 上可用”检查）

这些 Docker 运行器分为两类：

- Live-模型 运行器：`test:docker:live-models` 和 `test:docker:live-gateway` 仅在 repo Docker 镜像（`src/agents/models.profiles.live.test.ts` 和 `src/gateway/gateway-models.profiles.live.test.ts`）内运行其匹配的 profile-key live 文件，并挂载您的本地配置目录、工作区和可选的 profile env 文件。匹配的本地入口点是 `test:live:models-profiles` 和 `test:live:gateway-profiles`。
- Docker live 运行器默认使用较小的 smoke 上限，以便完整的 Docker 扫描保持实用：
  `test:docker:live-models` 默认为 `OPENCLAW_LIVE_MAX_MODELS=12`，而
  `test:docker:live-gateway` 默认为 `OPENCLAW_LIVE_GATEWAY_SMOKE=1`、
  `OPENCLAW_LIVE_GATEWAY_MAX_MODELS=8`、
  `OPENCLAW_LIVE_GATEWAY_STEP_TIMEOUT_MS=45000` 和
  `OPENCLAW_LIVE_GATEWAY_MODEL_TIMEOUT_MS=90000`。当您
  明确需要更大的全面扫描时，请覆盖这些环境变量。
- `test:docker:all` 通过 `test:docker:live-build` 构建一次实时 Docker 镜像，通过 `scripts/package-openclaw-for-docker.mjs` 将 OpenClaw 打包一次为 npm tarball，然后构建/重用两个 `scripts/e2e/Dockerfile` 镜像。裸镜像仅用于 install/update/plugin-dependency 跑道的 Node/Git 运行器；这些跑道挂载预构建的 tarball。功能镜像将相同的 tarball 安装到 `/app` 中，用于 built-app 功能跑道。Docker 跑道定义位于 `scripts/lib/docker-e2e-scenarios.mjs` 中；规划器逻辑位于 `scripts/lib/docker-e2e-plan.mjs` 中；`scripts/test-docker-all.mjs` 执行选定的计划。聚合使用加权本地调度器：`OPENCLAW_DOCKER_ALL_PARALLELISM` 控制进程插槽，而资源上限防止繁重的 live、npm-install 和多服务跑道同时启动。如果单个跑道比活动上限更重，调度器仍可以在池为空时启动它，然后让其单独运行，直到容量再次可用。默认值为 10 个插槽、`OPENCLAW_DOCKER_ALL_LIVE_LIMIT=9`、`OPENCLAW_DOCKER_ALL_NPM_LIMIT=10` 和 `OPENCLAW_DOCKER_ALL_SERVICE_LIMIT=7`；仅当 Docker 主机有更多余量时才调整 `OPENCLAW_DOCKER_ALL_WEIGHT_LIMIT` 或 `OPENCLAW_DOCKER_ALL_DOCKER_LIMIT`。运行器默认执行 Docker 预检，移除过时的 OpenClaw E2E 容器，每 30 秒打印一次状态，将成功的跑道时间存储在 `.artifacts/docker-tests/lane-timings.json` 中，并使用这些时间在后续运行中优先启动较长的跑道。使用 `OPENCLAW_DOCKER_ALL_DRY_RUN=1` 在不构建或运行 Docker 的情况下打印加权跑道清单，或使用 `node scripts/test-docker-all.mjs --plan-json` 打印所选跑道、包/镜像需求和凭据的 CI 计划。
- `Package Acceptance`GitHub 是 GitHub 原生包守门机制，用于验证“此可安装 tar 包是否能作为产品正常工作？”。它会从 `source=npm`、`source=ref`、`source=url` 或 `source=artifact` 中解析出一个候选包，将其作为 `package-under-test`Docker 上传，然后针对该确切的 tar 包运行可复用的 Docker E2E 通道，而不是重新打包所选引用。Profiles 按覆盖范围排序：`smoke`、`package`、`product` 和 `full`。有关包/更新/插件契约、已发布升级幸存者矩阵、发布默认值和故障分类，请参阅[测试更新和插件](/zh/help/testing-updates-plugins)。
- 构建和发布检查在 tsdown 之后运行 `scripts/check-cli-bootstrap-imports.mjs`。守卫程序会遍历来自 `dist/entry.js` 和 `dist/cli/run-main.js`CLI 的静态构建图，如果在命令分派之前的预分派启动导入了包依赖项（如 Commander、prompt UI、undici 或 logging），则判定失败；它还确保捆绑的网关运行块保持在预算范围内，并拒绝对已知冷网关路径的静态导入。打包的 CLI 冒烟测试还涵盖根帮助、入门帮助、医生帮助、状态、配置架构和模型列表命令。
- 包验收遗留兼容性上限为 `2026.4.25`（包含 `2026.4.25-beta.*`）。在该截止版本之前，测试工具仅容忍已发布包的元数据缺口：省略的私有 QA 清单条目、缺失的 `gateway install --wrapper`、从 tar 包派生的 git 夹具中缺失的补丁文件、缺失的持久化 `update.channel`、遗留插件安装记录位置、缺失的市场安装记录持久化，以及 `plugins update` 期间的配置元数据迁移。对于 `2026.4.25` 之后的包，这些路径均为严格失败。
- 容器冒烟测试运行程序：`test:docker:openwebui`、`test:docker:onboard`、`test:docker:npm-onboard-channel-agent`、`test:docker:release-user-journey`、`test:docker:release-typed-onboarding`、`test:docker:release-media-memory`、`test:docker:release-upgrade-user-journey`、`test:docker:release-plugin-marketplace`、`test:docker:skill-install`、`test:docker:update-channel-switch`、`test:docker:upgrade-survivor`、`test:docker:published-upgrade-survivor`、`test:docker:session-runtime-context`、`test:docker:agents-delete-shared-workspace`、`test:docker:gateway-network`、`test:docker:browser-cdp-snapshot`、`test:docker:mcp-channels`、`test:docker:pi-bundle-mcp-tools`、`test:docker:cron-mcp-cleanup`、`test:docker:plugins`、`test:docker:plugin-update`、`test:docker:plugin-lifecycle-matrix` 和 `test:docker:config-reload` 会启动一个或多个真实容器并验证更高级别的集成路径。

实时模型 Docker 运行程序还仅绑定挂载所需的 CLI 认证主目录（或在运行未限定范围时挂载所有支持的目录），然后在运行前将其复制到容器主目录中，以便外部 CLI OAuth 可以刷新令牌而无需更改主机认证存储：

- 直接模型：`pnpm test:docker:live-models`（脚本：`scripts/test-live-models-docker.sh`）
- ACP 绑定冒烟测试：`pnpm test:docker:live-acp-bind`（脚本：`scripts/test-live-acp-bind-docker.sh`；默认覆盖 Claude、Codex 和 Gemini，并通过 `pnpm test:docker:live-acp-bind:droid` 和 `pnpm test:docker:live-acp-bind:opencode` 进行严格的 Droid/OpenCode 覆盖）
- CLI 后端冒烟测试：CLI`pnpm test:docker:live-cli-backend`（脚本：`scripts/test-live-cli-backend-docker.sh`）
- Codex 应用服务器工具冒烟测试：`pnpm test:docker:live-codex-harness`（脚本：`scripts/test-live-codex-harness-docker.sh`）
- Gateway + 开发代理：Gateway(网关)`pnpm test:docker:live-gateway`（脚本：`scripts/test-live-gateway-models-docker.sh`）
- Observability smokes：`pnpm qa:otel:smoke`、`pnpm qa:prometheus:smoke` 和 `pnpm qa:observability:smoke`Dockernpm 是私有的 QA 源代码检出通道。它们有意不包含在包 Docker 发布通道中，因为 npm 压缩包中省略了 QA Lab。
- Open WebUI live smoke：`pnpm test:docker:openwebui`（脚本：`scripts/e2e/openwebui-docker.sh`）
- 新手引导向导（TTY，完整脚手架）：`pnpm test:docker:onboard`（脚本：`scripts/e2e/onboard-docker.sh`）
- Npm tarball 新手引导/渠道/agent smoke：`pnpm test:docker:npm-onboard-channel-agent`OpenClawDockerOpenAITelegramOpenAI 在 Docker 中全局安装已打包的 OpenClaw 压缩包，通过 env-ref 新手引导默认配置 OpenAI 和 Telegram，运行 doctor，并运行一次模拟的 OpenAI 代理轮次。使用 `OPENCLAW_CURRENT_PACKAGE_TGZ=/path/to/openclaw-*.tgz` 重用预构建的压缩包，使用 `OPENCLAW_NPM_ONBOARD_HOST_BUILD=0` 跳过主机重建，或使用 `OPENCLAW_NPM_ONBOARD_CHANNEL=discord` 或 `OPENCLAW_NPM_ONBOARD_CHANNEL=slack` 切换渠道。

- Release user journey smoke：`pnpm test:docker:release-user-journey`OpenClawDockerOpenAIGateway(网关) 在干净的 Docker 主目录中全局安装已打包的 OpenClaw 压缩包，运行新手引导，配置一个模拟的 OpenAI 提供商，运行一次代理轮次，安装/卸载外部插件，针对本地 fixture 配置 ClickClack，验证出站/入站消息传递，重启 Gateway，并运行 doctor。
- Release typed 新手引导 smoke：`pnpm test:docker:release-typed-onboarding` 安装已打包的压缩包，通过真实的 TTY 驱动 `openclaw onboard`OpenAI，将 OpenAI 配置为 env-ref 提供商，验证无原始密钥持久化，并运行一次模拟的代理轮次。
- Release media/memory smoke：`pnpm test:docker:release-media-memory`OpenAIGateway(网关) 安装已打包的压缩包，验证来自 PNG 附件的图像理解、OpenAI 兼容的图像生成输出、内存搜索召回，以及 Gateway 重启后的召回持久性。
- 版本升级用户流程冒烟测试：`pnpm test:docker:release-upgrade-user-journey` 默认安装 `openclaw@latest`，在已发布的包上配置提供商/插件/ClickClack 状态，升级到候选 tarball，然后重新运行核心代理/插件/渠道流程。使用 `OPENCLAW_RELEASE_UPGRADE_BASELINE_SPEC=openclaw@<version>` 覆盖基线。
- 版本插件市场冒烟测试：`pnpm test:docker:release-plugin-marketplace` 从本地 fixture 市场安装，更新已安装的插件，卸载它，并验证插件 CLI 随安装元数据被修剪而消失。
- 技能安装冒烟测试：`pnpm test:docker:skill-install` 在 OpenClaw 中全局安装打包的 Docker tarball，在配置中禁用上传的归档安装，从搜索中解析当前的实时 ClawHub 技能 slug，使用 `openclaw skills install` 安装它，并验证已安装的技能以及 `.clawhub` origin/lock 元数据。
- 更新渠道切换冒烟测试：`pnpm test:docker:update-channel-switch` 在 OpenClaw 中全局安装打包的 Docker tarball，从 package `stable` 切换到 git `dev`，验证更新后持久化的渠道和插件工作，然后切换回 package `stable` 并检查更新状态。
- 升级存续冒烟测试：`pnpm test:docker:upgrade-survivor` 将打包的 OpenClaw tarball 安装在一个包含代理、渠道配置、插件允许列表、过时的插件依赖状态以及现有工作区/会话文件的脏旧用户 fixture 上。它运行包更新和非交互式诊断，且没有实时的提供商或渠道密钥，然后启动一个回环 Gateway(网关) 并检查配置/状态保留以及启动/状态预算。
- Published upgrade survivor smoke：`pnpm test:docker:published-upgrade-survivor` 默认安装 `openclaw@latest`，植入逼真的现有用户文件，使用烘焙的命令配方配置该基线，验证生成的配置，将该已发布的安装更新为候选 tarball，运行非交互式 doctor，写入 `.artifacts/upgrade-survivor/summary.json`，然后启动回环 Gateway(网关) 并检查配置的 intents、状态保留、启动、`/healthz`、`/readyz` 以及 RPC 状态预算。使用 `OPENCLAW_UPGRADE_SURVIVOR_BASELINE_SPEC` 覆盖一个基线，要求聚合调度器使用 `OPENCLAW_UPGRADE_SURVIVOR_BASELINE_SPECS`（如 `openclaw@2026.5.2 openclaw@2026.4.23 openclaw@2026.4.15`）扩展精确的本地基线，并使用 `OPENCLAW_UPGRADE_SURVIVOR_SCENARIOS`（如 `reported-issues`）扩展问题形状的固件（fixtures）；报告的问题集包含 `configured-plugin-installs`，用于自动修复外部 OpenClaw 插件安装。包验收将这些暴露为 `published_upgrade_survivor_baseline`、`published_upgrade_survivor_baselines` 和 `published_upgrade_survivor_scenarios`，解析元基线令牌（如 `last-stable-4` 或 `all-since-2026.4.23`），完整发布验证则将发布 soak 包检查范围扩展到 `last-stable-4 2026.4.23 2026.5.2 2026.4.15` 加上 `reported-issues`。
- Session runtime context smoke：`pnpm test:docker:session-runtime-context` 验证隐藏的运行时上下文记录持久性以及 doctor 对受影响的重复 prompt-rewrite 分支的修复。
- Bun 全局安装 smoke：`bash scripts/e2e/bun-global-install-smoke.sh` 打包当前树，在隔离的主目录中使用 `bun install -g` 安装它，并验证 `openclaw infer image providers --json` 返回捆绑的图像提供程序而不是挂起。使用 `OPENCLAW_BUN_GLOBAL_SMOKE_PACKAGE_TGZ=/path/to/openclaw-*.tgz` 重用预构建的 tarball，使用 `OPENCLAW_BUN_GLOBAL_SMOKE_HOST_BUILD=0` 跳过主机构建，或者使用 `OPENCLAW_BUN_GLOBAL_SMOKE_DIST_IMAGE=openclaw-dockerfile-smoke:local` 从构建的 Docker 镜像中复制 `dist/`。
- 安装程序 Docker 烟雾测试：Docker`bash scripts/test-install-sh-docker.sh`npmnpmnpm 在其 root、update 和 direct-npm 容器之间共享一个 npm 缓存。Update smoke 在升级到候选 tarball 之前，默认将 `latest` 作为稳定的基线。在本地使用 `OPENCLAW_INSTALL_SMOKE_UPDATE_BASELINE=2026.4.22` 覆盖，或者在 GitHub 上使用 Install Smoke 工作流的 `update_baseline_version`GitHubnpm 输入。非 root 安装程序检查保持一个隔离的 npm 缓存，以免 root 拥有的缓存条目掩盖用户本地的安装行为。设置 `OPENCLAW_INSTALL_SMOKE_NPM_CACHE_DIR=/path/to/cache`npm 以在本地重新运行时重用 root/update/direct-npm 缓存。
- Install Smoke CI 使用 npm`OPENCLAW_INSTALL_SMOKE_SKIP_NPM_GLOBAL=1` 跳过重复的 direct-npm 全局更新；当需要直接 `npm install -g` 覆盖率时，请在本地不带该环境变量的情况下运行脚本。
- 代理删除共享工作区 CLI 烟雾测试：CLI`pnpm test:docker:agents-delete-shared-workspace` (脚本: `scripts/e2e/agents-delete-shared-workspace-docker.sh`) 默认构建 root Dockerfile 镜像，在隔离的容器主目录中用一个工作区播种两个代理，运行 `agents delete --json`，并验证有效的 JSON 以及保留的工作区行为。使用 `OPENCLAW_AGENTS_DELETE_SHARED_WORKSPACE_E2E_IMAGE=openclaw-dockerfile-smoke:local OPENCLAW_AGENTS_DELETE_SHARED_WORKSPACE_E2E_SKIP_BUILD=1` 重用 install-smoke 镜像。
- Gateway 网络测试 (两个容器, WS 认证 + 健康检查): Gateway(网关)`pnpm test:docker:gateway-network` (脚本: `scripts/e2e/gateway-network-docker.sh`)
- 浏览器 CDP 快照烟雾测试：`pnpm test:docker:browser-cdp-snapshot` (脚本: `scripts/e2e/browser-cdp-snapshot-docker.sh`) 构建源 E2E 镜像以及 Chromium 层，使用原始 CDP 启动 Chromium，运行 `browser doctor --deep`，并验证 CDP 角色快照是否涵盖链接 URL、光标提升的可点击项、iframe 引用和帧元数据。
- OpenAI Responses web_search minimal reasoning regression: OpenAI`pnpm test:docker:openai-web-search-minimal` (script: `scripts/e2e/openai-web-search-minimal-docker.sh`) 通过 Gateway(网关) 运行模拟的 OpenAIGateway(网关) 服务器，验证 `web_search` 将 `reasoning.effort` 从 `minimal` 提升到 `low`Gateway(网关)，然后强制提供商 schema 拒绝并检查原始详细信息是否出现在 Gateway(网关) 日志中。
- MCP 渠道桥接 (seeded Gateway(网关) + stdio bridge + raw Claude notification-frame smoke): Gateway(网关)`pnpm test:docker:mcp-channels` (script: `scripts/e2e/mcp-channels-docker.sh`)
- Pi bundle MCP tools (real stdio MCP server + embedded Pi profile allow/deny smoke): `pnpm test:docker:pi-bundle-mcp-tools` (script: `scripts/e2e/pi-bundle-mcp-tools-docker.sh`)
- Cron/subagent MCP cleanup (real Gateway(网关) + stdio MCP child teardown after isolated cron and one-shot subagent runs): Gateway(网关)`pnpm test:docker:cron-mcp-cleanup` (script: `scripts/e2e/cron-mcp-cleanup-docker.sh`)
- 插件 (install/update smoke for local path, `file:`, npm registry with hoisted dependencies, malformed npm package metadata, git moving refs, ClawHub kitchen-sink, marketplace updates, and Claude-bundle enable/inspect): `pnpm test:docker:plugins` (script: `scripts/e2e/plugins-docker.sh`)
  设置 `OPENCLAW_PLUGINS_E2E_CLAWHUB=0` 以跳过 ClawHub 块，或使用 `OPENCLAW_PLUGINS_E2E_CLAWHUB_SPEC` 和 `OPENCLAW_PLUGINS_E2E_CLAWHUB_ID` 覆盖默认的 kitchen-sink 包/运行时对。如果没有 `OPENCLAW_CLAWHUB_URL`/`CLAWHUB_URL`，测试将使用一个隔离的本地 ClawHub fixture server。
- Plugin update unchanged smoke: `pnpm test:docker:plugin-update` (script: `scripts/e2e/plugin-update-unchanged-docker.sh`)
- 插件生命周期矩阵冒烟测试：`pnpm test:docker:plugin-lifecycle-matrix` 在裸容器中安装打包的 OpenClaw tarball，安装 npm 插件，切换启用/禁用，通过本地 npm 注册表进行升级和降级，删除已安装的代码，然后验证卸载仍然会删除陈旧状态，同时记录每个生命周期阶段的 RSS/CPU 指标。
- 配置重新加载元数据冒烟测试：`pnpm test:docker:config-reload`（脚本：`scripts/e2e/config-reload-source-docker.sh`）
- 插件：`pnpm test:docker:plugins` 涵盖本地路径、`file:`、具有提升依赖项的 npm 注册表、git 移动引用、ClawHub 固件、marketplace 更新以及 Claude-bundle 启用/检查的安装/更新冒烟测试。`pnpm test:docker:plugin-update` 涵盖已安装插件的未更改更新行为。`pnpm test:docker:plugin-lifecycle-matrix` 涵盖资源跟踪的 npm 插件安装、启用、禁用、升级、降级和缺少代码的卸载。

要手动预构建并重用共享功能镜像：

```bash
OPENCLAW_DOCKER_E2E_IMAGE=openclaw-docker-e2e-functional:local pnpm test:docker:e2e-build
OPENCLAW_DOCKER_E2E_IMAGE=openclaw-docker-e2e-functional:local OPENCLAW_SKIP_DOCKER_BUILD=1 pnpm test:docker:mcp-channels
```

设置后，特定于套件的镜像覆盖（例如 `OPENCLAW_GATEWAY_NETWORK_E2E_IMAGE`）仍然优先。当 `OPENCLAW_SKIP_DOCKER_BUILD=1` 指向远程共享镜像时，如果该镜像尚未在本地，脚本会将其拉取。QR 和安装程序 Docker 测试保留自己的 Dockerfile，因为它们验证的是包/安装行为，而不是共享的构建应用程序运行时。

live-模型 Docker 运行器也会以只读方式绑定挂载当前的代码检出，
并将其暂存到容器内的临时工作目录中。这既保持了运行时
镜像的精简，又能针对您的本地源码/配置精确运行 Vitest。
暂存步骤会跳过大型仅限本地的缓存和应用程序构建输出，例如
Docker`.pnpm-store`、`.worktrees`、`__openclaw_vitest__` 以及应用程序本地的 `.build`Docker 或
Gradle 输出目录，以免 Docker live 运行花费数分钟复制
特定于机器的产物。
它们还会设置 `OPENCLAW_SKIP_CHANNELS=1`TelegramDiscord，这样 gateway live 探测就不会在容器内启动
真实的 Telegram/Discord/等渠道工作进程。
`test:docker:live-models` 仍然会运行 `pnpm test:live`，因此当您需要从该 Docker 路径
缩小或排除 gateway live 覆盖范围时，请同时传入 `OPENCLAW_LIVE_GATEWAY_*`Docker。
`test:docker:openwebui`OpenClawOpenAI 是更高级别的兼容性冒烟测试：它启动一个
启用了 OpenAI 兼容 HTTP 端点的 OpenClaw gateway 容器，
针对该 gateway 启动一个固定的 Open WebUI 容器，通过 Open WebUI 登录，
验证 `/api/models` 暴露了 `openclaw/default`，然后通过 Open WebUI 的
`/api/chat/completions` 代理发送真实的聊天请求。
对于发布路径的 CI 检查，设置 `OPENWEBUI_SMOKE_MODE=models`Docker 使其在 Open WebUI 登录和模型发现后停止，
而无需等待 live 模型 完成。
首次运行可能会明显变慢，因为 Docker 可能需要拉取
Open WebUI 镜像，且 Open WebUI 可能需要完成其自身的冷启动设置。
此路径需要一个可用的 live 模型 密钥。通过进程
环境、暂存的身份验证配置文件或显式的 `OPENCLAW_PROFILE_FILE` 提供它。
成功的运行会打印一个小的 JSON 载荷，如 `{ "ok": true, "模型":
"openclaw/default", ... }`。
`test:docker:mcp-channels`TelegramDiscordiMessageGateway(网关) 是确定性的，不需要真实的
Telegram、Discord 或 iMessage 账户。它会启动一个带有种子数据的 Gateway
容器，启动第二个生成 `openclaw mcp serve` 的容器，然后
验证路由对话发现、记录读取、附件元数据、
实时事件队列行为、出站发送路由以及通过真实的 stdio MCP 桥接进行的 Claude 风格渠道 +
权限通知。通知检查会直接检查原始 stdio MCP 帧，因此冒烟测试验证的是
桥接实际发出的内容，而不仅仅是特定客户端 SDK 恰好呈现的内容。
`test:docker:pi-bundle-mcp-tools`Docker 是确定性的，不需要 live
模型 密钥。它构建仓库 Docker 镜像，在容器内启动一个真实的 stdio MCP 探测服务器，
通过嵌入式 Pi 包 MCP 运行时实例化该服务器，执行工具，然后验证 `coding` 和 `messaging` 在
`bundle-mcp` 工具中保持，而 `minimal` 和 `tools.deny: ["bundle-mcp"]` 则将其过滤。
`test:docker:cron-mcp-cleanup`Gateway(网关) 是确定性的，不需要 live 模型
密钥。它启动一个带有真实 stdio MCP 探测服务器的带种子数据的 Gateway，运行
一个隔离的 cron 轮次和一个 `sessions_spawn` 单次子轮次，然后验证
MCP 子进程在每次运行后退出。

手动 ACP 纯文本线程冒烟测试（非 CI）：

- `bun scripts/dev/discord-acp-plain-language-smoke.ts --channel <discord-channel-id> ...`
- 请保留此脚本用于回归/调试工作流。未来可能再次需要它来验证 ACP 线程路由，因此请不要删除它。

有用的环境变量：

- `OPENCLAW_CONFIG_DIR=...`（默认：`~/.openclaw`）挂载到 `/home/node/.openclaw`
- `OPENCLAW_WORKSPACE_DIR=...`（默认：`~/.openclaw/workspace`）挂载到 `/home/node/.openclaw/workspace`
- `OPENCLAW_PROFILE_FILE=...` 被挂载并在运行测试之前 source
- `OPENCLAW_DOCKER_PROFILE_ENV_ONLY=1` 用于验证仅从 `OPENCLAW_PROFILE_FILE`CLI source 的环境变量，使用临时配置/工作区目录且不挂载外部 CLI 认证
- `OPENCLAW_DOCKER_CLI_TOOLS_DIR=...`（默认：`~/.cache/openclaw/docker-cli-tools`）挂载到 `/home/node/.npm-global` 以便在 CLI 内部缓存 Docker 安装
- `$HOME` 下的外部 CLI 认证目录/文件被以只读方式挂载到 `/host-auth...` 下，然后在测试开始前复制到 `/home/node/...` 中
  - 默认目录：`.minimax`
  - 默认文件：`~/.codex/auth.json`、`~/.codex/config.toml`、`.claude.json`、`~/.claude/.credentials.json`、`~/.claude/settings.json`、`~/.claude/settings.local.json`
  - 缩窄的提供商运行仅挂载从 `OPENCLAW_LIVE_PROVIDERS` / `OPENCLAW_LIVE_GATEWAY_PROVIDERS` 推断出的所需目录/文件
  - 使用 `OPENCLAW_DOCKER_AUTH_DIRS=all`、`OPENCLAW_DOCKER_AUTH_DIRS=none` 或逗号分隔列表（如 `OPENCLAW_DOCKER_AUTH_DIRS=.claude,.codex`）手动覆盖
- `OPENCLAW_LIVE_GATEWAY_MODELS=...` / `OPENCLAW_LIVE_MODELS=...` 以缩窄运行范围
- `OPENCLAW_LIVE_GATEWAY_PROVIDERS=...` / `OPENCLAW_LIVE_PROVIDERS=...` 以在容器内过滤提供商
- `OPENCLAW_SKIP_DOCKER_BUILD=1` 以重用现有的 `openclaw:local-live` 镜像，用于不需要重新构建的重新运行
- `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` 以确保凭据来自配置文件存储（而非环境变量）
- `OPENCLAW_OPENWEBUI_MODEL=...` 用于选择 Gateway(网关) 为 Open WebUI smoke 暴露的模型
- `OPENCLAW_OPENWEBUI_PROMPT=...` 用于覆盖 Open WebUI smoke 使用的 nonce-check 提示
- `OPENWEBUI_IMAGE=...` 用于覆盖固定的 Open WebUI 镜像标签

## 文档完整性检查

在编辑文档后运行文档检查：`pnpm check:docs`。
当您还需要页面内标题检查时，运行完整的 Mintlify 锚点验证：`pnpm docs:check-links:anchors`。

## 离线回归测试 (CI 安全)

这些是没有真实提供商的“真实管道”回归测试：

- Gateway(网关) 工具调用（mock OpenAI，真实 gateway + agent 循环）：Gateway(网关)OpenAI`src/gateway/gateway.test.ts`OpenAI（案例：“通过 gateway agent 循环端到端运行 mock OpenAI 工具调用”）
- Gateway(网关) 向导（WS Gateway(网关)`wizard.start`/`wizard.next`，写入配置 + 强制执行 auth）：`src/gateway/gateway.test.ts`（案例：“通过 ws 运行向导并写入 auth token 配置”）

## Agent 可靠性评估 (Skills)

我们已经有一些行为类似“agent 可靠性评估”的 CI 安全测试：

- 通过真实 gateway + agent 循环进行 Mock 工具调用 (`src/gateway/gateway.test.ts`)。
- 验证会话连接和配置效果的端到端向导流程 (`src/gateway/gateway.test.ts`)。

对于 Skills 仍然缺少什么（参见 [Skills](/zh/tools/skills)）：

- **决策：** 当 Skills 在提示中列出时，agent 会选择正确的 Skill（或避免不相关的）吗？
- **合规性：** agent 在使用前是否阅读 `SKILL.md` 并遵循所需的步骤/参数？
- **工作流合约：** 断言工具顺序、会话历史保留和沙箱边界的多轮场景。

未来的评估应首先保持确定性：

- 使用 mock 提供商的场景运行器，用于断言工具调用 + 顺序、Skill 文件读取和会话连接。
- 一小套专注于 Skills 的场景（使用与避免、门控、提示注入）。
- 可选的实时评估（opt-in，env-gated）仅在 CI 安全套件就位后进行。

## 合约测试（插件和渠道形状）

合约测试验证每个注册的插件和渠道是否符合其接口合约。它们遍历所有发现的插件并运行一系列形状和行为断言。默认的 `pnpm test` 单元测试通道有意跳过这些共享接缝和冒烟测试文件；当你接触共享渠道或提供商接口时，请显式运行合约命令。

### 命令

- 所有合约：`pnpm test:contracts`
- 仅渠道合约：`pnpm test:contracts:channels`
- 仅提供商合约：`pnpm test:contracts:plugins`

### 渠道合约

位于 `src/channels/plugins/contracts/*.contract.test.ts`：

- **plugin** - 基本插件形状（id、name、capabilities）
- **setup** - 设置向导弹约
- **会话-binding** - 会话绑定行为
- **outbound-payload** - 消息负载结构
- **inbound** - 入站消息处理
- **actions** - 渠道操作处理器
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
- **auth-choice** - 认证选择/选取
- **catalog** - 模型目录 API
- **discovery** - 插件发现
- **loader** - 插件加载
- **runtime** - 提供商运行时
- **shape** - 插件形状/接口
- **wizard** - 设置向导

### 何时运行

- 在更改 plugin-sdk 导出或子路径之后
- 在添加或修改渠道或提供商插件之后
- 在重构插件注册或发现之后

合约测试在 CI 中运行，不需要真实的 API 密钥。

## 添加回归测试（指导）

当你在实时环境中修复发现的提供商/模型问题时：

- 如果可能，添加 CI 安全的回归测试（模拟/存根提供商，或捕获精确的请求形状转换）
- 如果它本质上仅限于实时环境（速率限制、认证策略），请保持实时测试范围狭窄并通过环境变量选择性启用
- 优先定位能捕获该 bug 的最小层：
  - 提供商请求转换/重放 bug → 直接模型测试
  - gateway 会话/history/工具 pipeline bug → gateway live smoke 或 CI 安全的 gateway mock 测试
- SecretRef 遍历防护：
  - `src/secrets/exec-secret-ref-id-parity.test.ts` 从注册表元数据 (`listSecretTargetRegistryEntries()`) 中为每个 SecretRef 类派生一个采样目标，然后断言 traversal-segment exec ids 被拒绝。
  - 如果您在 `src/secrets/target-registry-data.ts` 中添加了新的 `includeInPlan` SecretRef 目标系列，请更新该测试中的 `classifyTargetClass`。该测试会在未分类的目标 ID 上故意失败，以便新类别不会被静默跳过。

## 相关

- [Testing live](/zh/help/testing-live)
- [Testing updates and plugins](/zh/help/testing-updates-plugins)
- [CI](/zh/ci)
