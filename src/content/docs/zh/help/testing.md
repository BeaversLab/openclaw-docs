---
summary: "Docker测试工具包：单元/E2E/Live 测试套件、Docker 运行器以及每个测试涵盖的内容"
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
**QA 栈 (qa-lab, qa-渠道, live transport lanes)** 在单独的文档中说明：

- [QA 概述](/zh/concepts/qa-e2e-automationMatrix) - 架构、命令界面、场景编写。
- [Matrix QA](/zh/concepts/qa-matrix) - `pnpm openclaw qa matrix` 的参考文档。
- [QA 渠道](/zh/channels/qa-channelDocker) - 由 repo 支持的场景使用的合成传输插件。

本页面涵盖运行常规测试套件和 Docker/Parallels 运行器。下文的 QA 专用运行器部分 ([QA-specific runners](#qa-specific-runners)) 列出了具体的 `qa` 调用，并指回上述参考资料。

</Note>

## 快速开始

大多数时候：

- 完整门控（推送前预期）：`pnpm build && pnpm check && pnpm check:test-types && pnpm test`
- 在配置较高的机器上更快地运行本地完整套件：`pnpm test:max`
- 直接使用 Vitest 监视循环：`pnpm test:watch`
- 直接文件定位现在也路由扩展/渠道路径：`pnpm test extensions/discord/src/monitor/message-handler.preflight.test.ts`
- 当您正在处理单个失败时，请优先进行针对性运行。
- Docker 支持的 QA 站点：Docker`pnpm qa:lab:up`
- Linux VM 支持的 QA 通道：Linux`pnpm openclaw qa suite --runner multipass --scenario channel-chat-baseline`

当您修改测试或需要额外的信心时：

- 覆盖率门控：`pnpm test:coverage`
- E2E 套件：`pnpm test:e2e`

调试真实提供商/模型时（需要真实凭证）：

- Live 套件（模型 + 网关工具/图像探测）：`pnpm test:live`
- 静默定位单个 Live 文件：`pnpm test:live -- src/agents/models.profiles.live.test.ts`
- 运行时性能报告：为真实的 `openai/gpt-5.4` 代理轮次使用 `OpenClaw Performance` 搭配 `live_gpt54=true`，或使用 `deep_profile=true` 获取 Kova CPU/堆/跟踪构件。每日定时运行会在配置 `CLAWGRIT_REPORTS_TOKEN`CLI 时，将 mock-提供商、deep-profile 和 GPT 5.4 通道构件发布到 `openclaw/clawgrit-reports`。Mock-提供商 报告还包括源代码级别的网关启动、内存、插件压力、重复的假模型 hello-loop 以及 CLI 启动数据。
- Docker 实时模型扫描：Docker`pnpm test:docker:live-models`
  - 每个选定的模型现在都会运行一次文本轮次加上一个小型的文件读取式探针。元数据中声明 `image` 输入的模型还会运行一个微型的图像轮次。在隔离提供商故障时，使用 `OPENCLAW_LIVE_MODEL_FILE_PROBE=0` 或 `OPENCLAW_LIVE_MODEL_IMAGE_PROBE=0` 禁用额外的探针。
  - CI 覆盖率：每日 `OpenClaw Scheduled Live And E2E Checks` 和手动 `OpenClaw Release Checks` 都会使用 `include_live_suites: true`Docker 调用可重用的 live/E2E 工作流，其中包括按提供商分片的独立 Docker 实时模型矩阵任务。
  - 对于针对性的 CI 重新运行，请使用 `include_live_suites: true` 和 `live_models_only: true` 调度 `OpenClaw Live And E2E Checks (Reusable)`。
  - 将新的高信噪比提供商机密添加到 `scripts/ci-hydrate-live-auth.sh` 以及 `.github/workflows/openclaw-live-and-e2e-checks-reusable.yml` 及其定时/发布调用程序中。
- 原生 Codex 绑定聊天冒烟测试：`pnpm test:docker:live-codex-bind`
  - 针对 Codex 应用服务器路径运行 Docker 实时通道，使用 DockerSlack`/codex bind` 绑定合成的 Slack 私信，执行 `/codex fast` 和 `/codex permissions`，然后验证纯文本回复和图像附件是否通过原生插件绑定而非 ACP 进行路由。
- Codex 应用服务器工具冒烟测试：`pnpm test:docker:live-codex-harness`
  - 通过插件拥有的 Codex 应用服务器工具运行网关代理轮次，
    验证 `/codex status` 和 `/codex models`，并且默认测试图像、
    cron MCP、子代理和 Guardian 探测器。在隔离其他 Codex
    应用服务器故障时，使用 `OPENCLAW_LIVE_CODEX_HARNESS_SUBAGENT_PROBE=0` 禁用子代理探测器。如需针对子代理的检查，请禁用其他探测器：
    `OPENCLAW_LIVE_CODEX_HARNESS_IMAGE_PROBE=0 OPENCLAW_LIVE_CODEX_HARNESS_MCP_PROBE=0 OPENCLAW_LIVE_CODEX_HARNESS_GUARDIAN_PROBE=0 OPENCLAW_LIVE_CODEX_HARNESS_SUBAGENT_PROBE=1 pnpm test:docker:live-codex-harness`。
    除非设置了 `OPENCLAW_LIVE_CODEX_HARNESS_SUBAGENT_ONLY=0`，否则这会在子代理探测后退出。
- Codex 按需安装冒烟测试：`pnpm test:docker:codex-on-demand`
  - 在 Docker 中安装打包好的 OpenClaw tarball，运行 OpenAI API 密钥
    新手引导，并验证 Codex 插件以及 OpenClawDockerOpenAIAPI`@openai/codex`npm 依赖项
    是否已按需下载到受管理的 npm 根目录中。
- Live 插件工具依赖冒烟测试：`pnpm test:docker:live-plugin-tool`
  - 打包一个具有真实 `slugify` 依赖的测试插件，通过
    `npm-pack:`npmOpenAI 安装它，验证受管理的 npm 根目录下的依赖项，然后要求一个
    实时的 OpenAI 模型调用插件工具并返回隐藏的 slug。
- Crestodian 救援命令冒烟测试：`pnpm test:live:crestodian-rescue-channel`
  - 针对消息渠道救援命令表面的可选双重检查。
    它运行 `/crestodian status`，将持久的模型更改排队，回复
    `/crestodian yes`，并验证审计/配置写入路径。
- Crestodian 规划器 Docker 冒烟测试：Docker`pnpm test:docker:crestodian-planner`
  - 在一个无配置容器中运行 Crestodian，该容器在 CLI`PATH` 上带有假的 Claude CLI，
    并验证模糊规划器回退是否转换为已审计的类型化
    配置写入。
- Crestodian 首次运行 Docker 冒烟测试：Docker`pnpm test:docker:crestodian-first-run`
  - 从一个空的 OpenClaw 状态目录开始，将裸露的 `openclaw` 路由到
    Crestodian，应用 setup/模型/agent/Discord 插件和 SecretRef 写入，
    验证配置，并检查审计条目。QA Lab 中的 `pnpm openclaw qa suite --scenario crestodian-ring-zero-setup` 也覆盖了同样的 Ring 0 设置路径。
- Moonshot/Kimi 成本冒烟测试：设置 `MOONSHOT_API_KEY` 后，运行
  `openclaw models list --provider moonshot --json`，然后针对 `moonshot/kimi-k2.6` 运行一个独立的
  `openclaw agent --local --session-id live-kimi-cost --message 'Reply exactly: KIMI_LIVE_OK' --thinking off --json`。
  验证 JSON 报告显示 Moonshot/K2.6，并且助手 transcript 存储了标准化的 `usage.cost`。

<Tip>当您只需要一个失败的案例时，建议使用下述 allowlist 环境变量来缩小 live 测试的范围。</Tip>

## QA 专用运行器

当您需要 QA 实验室级别的真实性时，这些命令位于主测试套件之旁：

CI 在专用工作流中运行 QA Lab。Agentic parity 嵌套在
`QA-Lab - All Lanes` 和发布验证中，而不是独立的 PR 工作流。
广泛的验证应使用带有 `rerun_group=qa-parity` 或 release-checks QA 组的
`Full Release Validation`。稳定/默认发布检查将详尽的 live/Docker soak 保留在
`run_release_soak=true` 之后；`full` 配置文件强制开启 soak。
`QA-Lab - All Lanes` 每晚在 `main` 上运行，并通过手动分派运行，作为并行作业包括 mock parity lane、live
Matrix lane、Convex 托管的 live Telegram lane 以及 Convex 托管的 live Discord
lane。计划的 QA 和发布检查显式传递 Matrix
`--profile fast`，而 Matrix CLI 和手动工作流输入
默认仍为 `all`；手动分派可以将 `all` 分片为 `transport`、
`media`、`e2ee-smoke`、`e2ee-deep` 和 `e2ee-cli` 作业。
`OpenClaw Release Checks` 在发布批准前运行 parity 加上快速的 Matrix 和 Telegram lanes，使用
`mock-openai/gpt-5.5` 进行发布传输检查，以确保它们保持确定性并避免正常的 提供商-plugin 启动。
这些 live transport 网关禁用内存搜索；内存行为仍由 QA parity 套件覆盖。

完整发布 live media 分片使用
`ghcr.io/openclaw/openclaw-live-media-runner:ubuntu-24.04`，它已包含
`ffmpeg` 和 `ffprobe`。Docker live 模型/后端分片使用为每个选定
提交构建一次的共享 `ghcr.io/openclaw/openclaw-live-test:<sha>` 镜像，然后使用 `OPENCLAW_SKIP_DOCKER_BUILD=1` 拉取它，而不是在每个分片内部重新构建。

- `pnpm openclaw qa suite`
  - 直接在主机上运行基于仓库的 QA 场景。
  - 默认使用隔离的 gateway worker 并行运行多个选定的场景。`qa-channel` 默认并发数为 4（受选定场景数限制）。使用 `--concurrency <count>` 调整 worker 数量，或使用 `--concurrency 1` 进行较旧的串行通道运行。
  - 当任何场景失败时以非零状态退出。如果您希望获取产物而不因失败退出代码而终止，请使用 `--allow-failures`。
  - 支持提供商模式 `live-frontier`、`mock-openai` 和 `aimock`。`aimock` 会启动一个由 AIMock 支持的本地提供商服务器，用于实验性的 fixture 和协议模拟覆盖，而无需替换感知场景的 `mock-openai` 通道。
- `pnpm test:plugins:kitchen-sink-live`
  - 通过 QA Lab 运行实时的 OpenAI Kitchen Sink 插件测试套件。它会安装外部 Kitchen Sink 包，验证插件 SDK 表面清单，探测 `/healthz` 和 `/readyz`，记录 gateway CPU/RSS 证据，运行实时的 OpenAI 轮次，并检查对抗性诊断。需要实时的 OpenAI 认证，例如 `OPENAI_API_KEY`。在已水合的 Testbox 会话中，当存在 `openclaw-testbox-env` 辅助工具时，它会自动获取 Testbox 的实时认证配置文件。
- `pnpm test:gateway:cpu-scenarios`
  - 运行 gateway 启动基准测试以及一个小型的模拟 QA Lab 场景包（`channel-chat-baseline`、`memory-failure-fallback`、`gateway-restart-inflight-run`），并在 `.artifacts/gateway-cpu-scenarios/` 下写入综合的 CPU 观察摘要。
  - 默认仅标记持续的高 CPU 观察（`--cpu-core-warn` 加上 `--hot-wall-warn-ms`），因此短时的启动爆发会被记录为指标，而看起来不会像持续数分钟的 gateway 挂起回归。
  - 使用已构建的 `dist` 产物；当检出尚未包含新的运行时输出时，请先运行构建。
- `pnpm openclaw qa suite --runner multipass`
  - 在一次性 Multipass Linux 虚拟机内运行相同的 QA 套件。
  - 在宿主机上保持与 `qa suite` 相同的方案选择行为。
  - 重用与 `qa suite` 相同的提供商/模型选择标志。
  - Live 运行将转发适用于访客的支持的 QA 认证输入：
    基于环境的提供商密钥、QA live 提供商配置路径，以及 `CODEX_HOME`
    （如果存在）。
  - 输出目录必须保持在仓库根目录下，以便访客可以通过
    挂载的工作区写回数据。
  - 在 `.artifacts/qa-e2e/...` 下写入常规 QA 报告 + 摘要以及 Multipass 日志。
- `pnpm qa:lab:up`
  - 启动基于 Docker 的 QA 站点，用于操作员式的 QA 工作。
- `pnpm test:docker:npm-onboard-channel-agent`
  - 从当前检出构建一个 npm tarball，在
    Docker 中全局安装它，运行非交互式 OpenAI API 密钥新手引导，默认配置 Telegram，
    验证打包的插件运行时在无需启动依赖修复的情况下加载，运行 doctor，并针对
    模拟的 OpenAI 端点运行一个本地 agent 回合。
  - 使用 `OPENCLAW_NPM_ONBOARD_CHANNEL=discord` 运行相同的打包安装
    流程（配合 Discord）。
- `pnpm test:docker:session-runtime-context`
  - 针对嵌入的运行时上下文
    脚本运行确定性的构建应用 Docker 冒烟测试。它验证隐藏的 OpenClaw 运行时上下文作为
    非显示自定义消息持久化，而不是泄露到可见的用户轮次中，
    然后植入受影响的损坏会话 JSONL 并验证
    `openclaw doctor --fix` 将其重写到活动分支并创建备份。
- `pnpm test:docker:npm-telegram-live`
  - 在 OpenClaw 中安装 Docker 包候选版本，运行已安装包
    新手引导，通过已安装的 Telegram 配置 CLI，然后重用
    实时 Telegram QA 流程，并将该已安装包作为 SUT Gateway(网关)。
  - 包装器仅挂载检出中的 `qa-lab` harness 源码；已安装的包拥有 `dist`、`openclaw/plugin-sdk` 和打包的插件运行时，因此该通道不会将当前检出的插件混入被测包中。
  - 默认为 `OPENCLAW_NPM_TELEGRAM_PACKAGE_SPEC=openclaw@beta`；设置 `OPENCLAW_NPM_TELEGRAM_PACKAGE_TGZ=/path/to/openclaw-current.tgz` 或 `OPENCLAW_CURRENT_PACKAGE_TGZ` 以测试已解析的本地 tarball，而不是从注册表安装。
  - 使用与 Telegram`pnpm openclaw qa telegram` 相同的 Telegram 环境凭据或 Convex 凭据源。对于 CI/发布自动化，设置 `OPENCLAW_NPM_TELEGRAM_CREDENTIAL_SOURCE=convex` 以及 `OPENCLAW_QA_CONVEX_SITE_URL` 和角色密钥。如果 CI 中存在 `OPENCLAW_QA_CONVEX_SITE_URL`Docker 和 Convex 角色密钥，Docker 包装器会自动选择 Convex。
  - 包装器在 Docker 构建/安装工作之前，会先在主机上验证 Telegram 或 Convex 凭据环境。仅在有意调试凭据前设置时才设置 TelegramDocker`OPENCLAW_NPM_TELEGRAM_SKIP_CREDENTIAL_PREFLIGHT=1`。
  - `OPENCLAW_NPM_TELEGRAM_CREDENTIAL_ROLE=ci|maintainer` 覆盖了仅针对此通道的共享 `OPENCLAW_QA_CREDENTIAL_ROLE`。
  - GitHub Actions 将此通道公开为手动维护者工作流 GitHub`NPM Telegram Beta E2E`。它不会在合并时运行。该工作流使用 `qa-live-shared` 环境和 Convex CI 凭据租约。
- GitHub Actions 还公开了 GitHub`Package Acceptance`npm，用于针对单个候选包进行侧运行产品验证。它接受受信任的引用、已发布的 npm 规范、HTTPS tarball URL 加 SHA-256，或来自另一次运行的 tarball 构件，将规范化的 `openclaw-current.tgz` 上传为 `package-under-test`Docker，然后使用 smoke、package、product、full 或 custom 通道配置文件运行现有的 Docker E2E 调度程序。设置 `telegram_mode=mock-openai` 或 `live-frontier`Telegram 以针对同一个 `package-under-test` 构件运行 Telegram QA 工作流。
  - 最新的 Beta 产品验证：

```bash
gh workflow run package-acceptance.yml --ref main \
  -f source=npm \
  -f package_spec=openclaw@beta \
  -f suite_profile=product \
  -f telegram_mode=mock-openai
```

- 精确的 tarball URL 验证需要摘要：

```bash
gh workflow run package-acceptance.yml --ref main \
  -f source=url \
  -f package_url=https://registry.npmjs.org/openclaw/-/openclaw-VERSION.tgz \
  -f package_sha256=<sha256> \
  -f suite_profile=package
```

- Artifact proof 从另一个 Actions 运行中下载 tarball 构件：

```bash
gh workflow run package-acceptance.yml --ref main \
  -f source=artifact \
  -f artifact_run_id=<run-id> \
  -f artifact_name=<artifact-name> \
  -f suite_profile=smoke
```

- `pnpm test:docker:plugins`
  - 将当前的 OpenClaw 构建打包并安装到 Docker 中，启动配置了 Gateway(网关) 的 OpenAI
    ，然后通过配置编辑启用捆绑的渠道/插件。
  - 验证设置发现是否导致未配置的可下载插件缺失，第一次配置的 doctor 修复是否会显式安装每个缺失的可下载
    插件，以及第二次重启是否不会运行隐藏的依赖项
    修复。
  - 同时安装一个已知的旧 npm 基线，在运行 `openclaw update --tag <candidate>` 之前启用 Telegram，并验证候选版本的
    更新后 doctor 会清理遗留插件依赖碎片，而无需
    测试框架端的 postinstall 修复。
- `pnpm test:parallels:npm-update`
  - 跨 Parallels 虚拟机运行原生打包安装更新冒烟测试。每个
    选定的平台首先安装请求的基线包，然后在同一台虚拟机中运行已安装的 `openclaw update` 命令，并验证
    安装的版本、更新状态、Gateway 就绪状态以及一次本地 agent
    回合。
  - 在一台虚拟机上迭代时，请使用 `--platform macos`、`--platform windows` 或 `--platform linux`。使用 `--json` 获取摘要构件路径和
    各通道的状态。
  - OpenAI 通道默认使用 `openai/gpt-5.5` 进行实时 agent 回合证明。
    在刻意验证另一个 OpenAI 模型时，请传递 `--model <provider/model>` 或设置
    `OPENCLAW_PARALLELS_OPENAI_MODEL`。
  - 将长时间的本机运行包裹在主机超时中，以免 Parallels 传输停滞
    占用剩余的测试窗口：

    ```bash
    timeout --foreground 150m pnpm test:parallels:npm-update -- --json
    timeout --foreground 90m pnpm test:parallels:npm-update -- --platform windows --json
    ```

  - 该脚本在 `/tmp/openclaw-parallels-npm-update.*` 下写入嵌套的通道日志。
    在假定外部包装已挂起之前，请检查 `windows-update.log`、`macos-update.log` 或 `linux-update.log`。
  - Windows 更新可能在冷启动的访客机上花费 10 到 15 分钟进行更新后诊断和包
    更新工作；当嵌套的 npm
    调试日志在推进时，这仍然是正常的。
  - 请勿将此聚合包装器与单独的 Parallels
    macOS、Windows 或 Linux 冒烟通道并行运行。它们共享虚拟机状态，并可能在
    快照还原、包服务或访客网关状态上发生冲突。
  - 更新后验证运行正常的捆绑插件表面，因为
    语音、图像生成和媒体理解等
    功能门面是通过捆绑的运行时 API 加载的，即使
    代理轮次本身只检查简单的文本响应。

- `pnpm openclaw qa aimock`
  - 仅启动本地 AIMock 提供商服务器以进行直接协议冒烟
    测试。
- `pnpm openclaw qa matrix`
  - 针对一次性 Matrix 支持的 Tuwunel 家庭服务器运行 Docker 实时 QA 通道。仅限源代码检出 - 打包安装不附带 `qa-lab`。
  - 完整的 CLI、配置文件/场景目录、环境变量和构件布局：[Matrix QA](/zh/concepts/qa-matrix)。
- `pnpm openclaw qa telegram`
  - 针对真实私有组运行 Telegram 实时 QA 通道，使用来自环境的驱动程序和 SUT 机器人令牌。
  - 需要 `OPENCLAW_QA_TELEGRAM_GROUP_ID`、`OPENCLAW_QA_TELEGRAM_DRIVER_BOT_TOKEN` 和 `OPENCLAW_QA_TELEGRAM_SUT_BOT_TOKEN`。组 ID 必须是数字 Telegram 聊天 ID。
  - 支持 `--credential-source convex` 用于共享池化凭证。默认使用 env 模式，或设置 `OPENCLAW_QA_CREDENTIAL_SOURCE=convex` 以选择加入池化租约。
  - 默认覆盖金丝雀、提及门控、命令寻址、`/status`、机器人对机器人的提及回复以及核心原生命令回复。`mock-openai` 默认值还覆盖确定性回复链和 Telegram 最终消息流式传输回归。使用 `--list-scenarios` 进行可选探测，例如 `session_status`。
  - 当任何场景失败时，以非零状态退出。当你想要生成构建产物而不希望以失败状态退出时，请使用 `--allow-failures`。
  - 需要在同一个私密群组中有两个不同的机器人，且 SUT 机器人需公开 Telegram 用户名。
  - 为了稳定地进行机器人对机器人的观察，请在 `@BotFather` 中为两个机器人启用“机器人对机器人通信模式”，并确保驱动程序机器人可以观察群组机器人的流量。
  - 在 Telegram`.artifacts/qa-e2e/...` 下写入 Telegram QA 报告、摘要和已观察消息构建产物。回复场景包含从驱动程序发送请求到观察到 SUT 回复的往返时间（RTT）。

`Mantis Telegram Live`TelegramGitHub 是此流水线的 PR 证据封装器。它使用 Convex 租赁的 Telegram 凭据运行候选引用，在 Crabbox 桌面浏览器中呈现已编辑的观察消息记录，录制 MP4 证据，生成动态修剪的 GIF，上传构建产物包，并在设置了 `pr_number` 时通过 Mantis GitHub App 发布内联 PR 证据。维护者可以通过 `Mantis Scenario`（`scenario_id:
telegram-live`）从 Actions UI 启动它，或者直接从拉取请求评论中启动：

```text
@Mantis telegram
@Mantis telegram scenario=telegram-status-command
@Mantis telegram scenarios=telegram-status-command,telegram-mentioned-message-reply
```

- `pnpm openclaw qa mantis telegram-desktop-builder`
  - 租赁或重用 Crabbox Linux 桌面，安装原生的 Telegram Desktop，使用租赁的 Telegram SUT 机器人令牌配置 OpenClaw，启动网关，并从可见的 VNC 桌面录制截图/MP4 证据。
  - 默认为 `--credential-source convex`，因此工作流只需要 Convex broker 密钥。使用 `--credential-source env`，并使用与 `pnpm openclaw qa telegram` 相同的 `OPENCLAW_QA_TELEGRAM_*` 变量。
  - Telegram Desktop 仍然需要用户登录/个人资料。机器人令牌仅配置 OpenClaw。使用 TelegramOpenClaw`--telegram-profile-archive-env <name>` 来获取 base64 `.tgz` 个人资料存档，或者使用 `--keep-lease` 并通过 VNC 手动登录一次。
  - 在输出目录下写入 `mantis-telegram-desktop-builder-report.md`、`mantis-telegram-desktop-builder-summary.json`、`telegram-desktop-builder.png` 和 `telegram-desktop-builder.mp4`。

Live transport lanes 共享一个标准合约，因此新的传输方式不会偏离；针对每个 lane 的覆盖率矩阵位于 [QA overview → Live transport coverage](/zh/concepts/qa-e2e-automation#live-transport-coverage)。`qa-channel` 是广泛的综合套件，不属于该矩阵的一部分。

### 通过 Convex 共享 Telegram 凭证 (v1)

当为 live transport QA 启用 `--credential-source convex`（或 `OPENCLAW_QA_CREDENTIAL_SOURCE=convex`）时，QA 实验室会从 Convex 支持的池中获取独家租约，在 lane 运行期间对该租约进行心跳检测，并在关闭时释放租约。该部分名称早于 Discord、Slack 和 WhatsApp 支持；租约合约在各种类型之间共享。

参考 Convex 项目脚手架：

- `qa/convex-credential-broker/`

必需的环境变量：

- `OPENCLAW_QA_CONVEX_SITE_URL`（例如 `https://your-deployment.convex.site`）
- 所选角色的一个密钥：
  - 用于 `maintainer` 的 `OPENCLAW_QA_CONVEX_SECRET_MAINTAINER`
  - 用于 `ci` 的 `OPENCLAW_QA_CONVEX_SECRET_CI`
- 凭证角色选择：
  - CLI：`--credential-role maintainer|ci`
  - 环境默认值：`OPENCLAW_QA_CREDENTIAL_ROLE`（在 CI 中默认为 `ci`，否则为 `maintainer`）

可选的环境变量：

- `OPENCLAW_QA_CREDENTIAL_LEASE_TTL_MS`（默认为 `1200000`）
- `OPENCLAW_QA_CREDENTIAL_HEARTBEAT_INTERVAL_MS`（默认为 `30000`）
- `OPENCLAW_QA_CREDENTIAL_ACQUIRE_TIMEOUT_MS`（默认为 `90000`）
- `OPENCLAW_QA_CREDENTIAL_HTTP_TIMEOUT_MS`（默认为 `15000`）
- `OPENCLAW_QA_CONVEX_ENDPOINT_PREFIX`（默认为 `/qa-credentials/v1`）
- `OPENCLAW_QA_CREDENTIAL_OWNER_ID`（可选的 trace id）
- `OPENCLAW_QA_ALLOW_INSECURE_HTTP=1` 允许仅用于本地开发的环回 `http://` Convex URL。

`OPENCLAW_QA_CONVEX_SITE_URL` 在正常操作中应使用 `https://`。

维护者管理员命令（pool add/remove/list）特别需要 `OPENCLAW_QA_CONVEX_SECRET_MAINTAINER`。

维护者的 CLI 助手：

```bash
pnpm openclaw qa credentials doctor
pnpm openclaw qa credentials add --kind telegram --payload-file qa/telegram-credential.json
pnpm openclaw qa credentials list --kind telegram
pnpm openclaw qa credentials remove --credential-id <credential-id>
```

在实时运行之前使用 `doctor` 来检查 Convex 站点 URL、代理密钥、端点前缀、HTTP 超时以及管理员/列表的可访问性，而不会打印密钥值。在脚本和 CI 工具中使用 `--json` 以获取机器可读的输出。

默认端点契约（`OPENCLAW_QA_CONVEX_SITE_URL` + `/qa-credentials/v1`）：

- `POST /acquire`
  - 请求：`{ kind, ownerId, actorRole, leaseTtlMs, heartbeatIntervalMs }`
  - 成功：`{ status: "ok", credentialId, leaseToken, payload, leaseTtlMs?, heartbeatIntervalMs? }`
  - 耗尽/可重试：`{ status: "error", code: "POOL_EXHAUSTED" | "NO_CREDENTIAL_AVAILABLE", ... }`
- `POST /heartbeat`
  - 请求：`{ kind, ownerId, actorRole, credentialId, leaseToken, leaseTtlMs }`
  - 成功：`{ status: "ok" }`（或空的 `2xx`）
- `POST /release`
  - 请求：`{ kind, ownerId, actorRole, credentialId, leaseToken }`
  - 成功：`{ status: "ok" }`（或空的 `2xx`）
- `POST /admin/add`（仅限维护者密钥）
  - 请求：`{ kind, actorId, payload, note?, status? }`
  - 成功：`{ status: "ok", credential }`
- `POST /admin/remove`（仅限维护者密钥）
  - 请求：`{ credentialId, actorId }`
  - 成功：`{ status: "ok", changed, credential }`
  - 活跃租约保护：`{ status: "error", code: "LEASE_ACTIVE", ... }`
- `POST /admin/list`（仅限维护者密钥）
  - 请求：`{ kind?, status?, includePayload?, limit? }`
  - 成功：`{ status: "ok", credentials, count }`

Telegram 类型的负载形状：

- `{ groupId: string, driverToken: string, sutToken: string }`
- `groupId`Telegram 必须是数字形式的 Telegram 聊天 ID 字符串。
- `admin/add` 验证 `kind: "telegram"` 的此形状并拒绝格式错误的负载。

代理验证的多渠道负载：

- Discord：Discord`{ guildId: string, channelId: string, driverBotToken: string, sutBotToken: string, sutApplicationId: string, voiceChannelId?: string }`
- WhatsApp：WhatsApp`{ driverPhoneE164: string, sutPhoneE164: string, driverAuthArchiveBase64: string, sutAuthArchiveBase64: string, groupJid?: string }`

Slack 渠道也可以从池中租用，但 Slack 负载验证目前位于 Slack QA 运行器中，而不是代理中。对于 Slack 行，请使用 SlackSlackSlack`{ channelId: string, driverBotToken: string, sutBotToken: string, sutAppToken: string }`Slack。

### 向 QA 添加渠道

新渠道适配器的架构和场景辅助程序名称位于 [QA 概述 → 添加渠道](/zh/concepts/qa-e2e-automation#adding-a-channel) 中。最低要求：在共享 `qa-lab` host seam 上实现传输运行器，在插件清单中声明 `qaRunners`，挂载为 `openclaw qa <runner>`，并在 `qa/scenarios/` 下编写场景。

## 测试套件（在哪里运行）

可以将这些套件视为“真实性递增”（以及不稳定性/成本递增）：

### 单元 / 集成（默认）

- 命令：`pnpm test`
- 配置：无目标的运行使用 `vitest.full-*.config.ts` 分片集，并且可能会将多项目分片扩展为每个项目的配置以便并行调度
- 文件：`src/**/*.test.ts`、`packages/**/*.test.ts` 和 `test/**/*.test.ts` 下的 core/unit 清单；UI 单元测试在专用的 `unit-ui` 分片中运行
- 范围：
  - 纯单元测试
  - 进程内集成测试（网关身份验证、路由、工具、解析、配置）
  - 针对已知错误的确定性回归测试
- 预期：
  - 在 CI 中运行
  - 不需要真实的密钥
  - 应该快速且稳定
  - 解析器和公共表面加载器测试必须使用生成的微小插件装置来证明广泛的 `api.js` 和
    `runtime-api.js` 回退行为，而不是
    真实的捆绑插件源 API。真实的插件 API 加载属于
    插件拥有的契约/集成套件。

原生依赖项策略：

- 默认测试安装会跳过可选的原生 Discord opus 构建。Discord 语音接收使用纯 JS `opusscript` 解码器，并且 `@discordjs/opus` 保持在 `ignoredBuiltDependencies` 中，因此本地测试和 Testbox 渠道不会编译原生插件。
- 如果您有意需要对比原生 opus 构建，请使用专用的 Discord 语音性能或 live lane。不要将 `@discordjs/opus` 添加回默认的 `onlyBuiltDependencies`；这会导致不相关的安装/测试循环编译原生代码。

<AccordionGroup>
  <Accordion title="项目、分片和作用域车道">

    - 非定向 `pnpm test` 运行十二个较小的分片配置（`core-unit-fast`、`core-unit-src`、`core-unit-security`、`core-unit-ui`、`core-unit-support`、`core-support-boundary`、`core-contracts`、`core-bundled`、`core-runtime`、`agentic`、`auto-reply`、`extensions`），而不是一个巨大的原生根项目进程。这可以降低负载机器上的峰值 RSS，并避免自动回复/扩展工作导致不相关的测试套件饥饿。
    - `pnpm test --watch` 仍然使用原生根 `vitest.config.ts` 项目图，因为多分片监视循环是不切实际的。
    - `pnpm test`、`pnpm test:watch` 和 `pnpm test:perf:imports` 首先通过作用域车道路由显式文件/目录目标，因此 `pnpm test extensions/discord/src/monitor/message-handler.preflight.test.ts` 避免支付完整的根项目启动税。
    - `pnpm test:changed` 默认将更改的 git 路径扩展为廉价的作用域车道：直接测试编辑、同级 `*.test.ts` 文件、显式源映射以及本地导入图依赖项。除非显式使用 `OPENCLAW_TEST_CHANGED_BROAD=1 pnpm test:changed`，否则配置/设置/包编辑不会广泛运行测试。
    - `pnpm check:changed` 是针对窄范围工作的正常智能本地检查网关。它将差异分类为核心、核心测试、扩展、扩展测试、应用、文档、发布元数据、实时 Docker 工具和工具，然后运行匹配的类型检查、Lint 和守护命令。它不运行 Vitest 测试；请调用 `pnpm test:changed` 或显式 `pnpm test <target>` 进行测试证明。仅发布元数据的版本提升运行定向的版本/配置/根依赖项检查，并带有一个守护程序，拒绝顶级版本字段之外的包更改。
    - 实时 Docker ACP 约束编辑运行集中检查：实时 Docker 身份验证脚本的 Shell 语法和实时 Docker 调度程序试运行。仅当差异限于 `scripts["test:docker:live-*"]` 时，才包含 `package.json` 更改；依赖项、导出、版本和其他包表面编辑仍然使用更广泛的守护程序。
    - 来自代理、命令、插件、自动回复助手、`plugin-sdk` 和类似纯实用程序区域的轻导入单元测试通过 `unit-fast` 车道路由，该车道跳过 `test/setup-openclaw-runtime.ts`；有状态/运行时繁重的文件保留在现有车道上。
    - 选定的 `plugin-sdk` 和 `commands` 助手源文件还将更改模式运行映射到这些轻量车道中的显式同级测试，因此助手编辑避免为该目录重新运行完整的繁重套件。
    - `auto-reply` 具有用于顶级核心助手、顶级 `reply.*` 集成测试和 `src/auto-reply/reply/**` 子树的专用存储桶。CI 进一步将回复子树拆分为代理运行器、分派和命令/状态路由分片，因此一个导入繁重的存储块不会拥有完整的 Node 尾部。
    - 正常的 PR/main CI 会故意跳过扩展批量扫描和仅发布的 `agentic-plugins` 分片。完整的发布验证在发布候选版本上为那些繁重的插件/扩展套件分派单独的 `Plugin Prerelease` 子工作流。

  </Accordion>

  <Accordion title="嵌入式运行器覆盖率">

    - 当您更改 message-工具发现输入或压缩运行时
      上下文时，请保持两个级别的覆盖。
    - 为纯路由和规范化
      边界添加有针对性的助手回归测试。
    - 保持嵌入式运行器集成套件的健康：
      `src/agents/pi-embedded-runner/compact.hooks.test.ts`，
      `src/agents/pi-embedded-runner/run.overflow-compaction.test.ts` 和
      `src/agents/pi-embedded-runner/run.overflow-compaction.loop.test.ts`。
    - 这些套件验证了作用域 ID 和压缩行为仍然通过
      真实的 `run.ts` / `compact.ts` 路径流动；仅助手的测试
      不足以替代这些集成路径。

  </Accordion>

  <Accordion title="Vitest 池和隔离默认值">

    - 基础 Vitest 配置默认为 `threads`。
    - 共享的 Vitest 配置固定了 `isolate: false` 并在根项目、e2e 和 live 配置中
      使用非隔离运行器。
    - 根 UI 车道保留其 `jsdom` 设置和优化器，但也运行在
      共享的非隔离运行器上。
    - 每个 `pnpm test` 分片继承相同的 `threads` + `isolate: false`
      默认值来自共享的 Vitest 配置。
    - `scripts/run-vitest.mjs` 默认为 Vitest 子 Node
      进程添加 `--no-maglev`，以减少大型本地运行期间的 V8 编译开销。
      设置 `OPENCLAW_VITEST_ENABLE_MAGLEV=1` 以与原版 V8
      行为进行比较。

  </Accordion>

  <Accordion title="快速本地迭代">

    - `pnpm changed:lanes` 显示差异触发了哪些架构通道。
    - 预提交钩子仅用于格式化。它会重新暂存格式化后的文件，并且不运行 lint、类型检查或测试。
    - 在交接或推送之前，当您需要智能本地检查关卡时，请显式运行 `pnpm check:changed`。
    - `pnpm test:changed` 默认通过廉价的限定通道进行路由。仅当代理决定工具、配置、包或合约编辑确实需要更广泛的 Vitest 覆盖范围时，才使用 `OPENCLAW_TEST_CHANGED_BROAD=1 pnpm test:changed`。
    - `pnpm test:max` 和 `pnpm test:changed:max` 保持相同的路由行为，只是具有更高的工作线程上限。
    - 本地工作线程自动缩放有意采用保守策略，并在主机平均负载已经很高时进行退避，因此多个并发的 Vitest 运行默认造成的损害较小。
    - 基础 Vitest 配置将项目/配置文件标记为 `forceRerunTriggers`，以便在测试线路发生变化时，更改模式的重放保持正确。
    - 该配置在受支持的主机上保持启用 `OPENCLAW_VITEST_FS_MODULE_CACHE`；如果您想要一个明确的缓存位置以直接进行分析，请设置 `OPENCLAW_VITEST_FS_MODULE_CACHE_PATH=/abs/path`。

  </Accordion>

  <Accordion title="Perf debugging">

    - `pnpm test:perf:imports` 启用 Vitest 导入持续时间报告以及
      导入细分输出。
    - `pnpm test:perf:imports:changed` 将相同的分析视图范围限定为
      自 `origin/main` 以来更改的文件。
    - 分片计时数据被写入 `.artifacts/vitest-shard-timings.json`。
      完整配置运行使用配置路径作为键；包含模式 CI
      分片会附加分片名称，以便单独跟踪
      过滤后的分片。
    - 当某个热点测试仍将大部分时间花在启动导入上时，
      请将繁重的依赖项保留在一个狭窄的本地 `*.runtime.ts` 缝隙之后，
      并直接模拟该缝隙，而不是仅为了通过 `vi.mock(...)` 传递它们而深度导入运行时辅助程序。
    - `pnpm test:perf:changed:bench -- --ref <git-ref>` 将路由后的
      `test:changed`macOS 与该提交差异的原生根项目路径进行比较，并打印墙上时间和 macOS 最大 RSS。
    - `pnpm test:perf:changed:bench -- --worktree` 通过将更改的文件列表通过
      `scripts/test-projects.mjs` 和根 Vitest 配置进行路由，来对当前的
      脏树进行基准测试。
    - `pnpm test:perf:profile:main` 为
      Vitest/Vite 启动和转换开销写入主线程 CPU 配置文件。
    - `pnpm test:perf:profile:runner` 为
      禁用了文件并行性的单元套件写入运行器 CPU+堆配置文件。

  </Accordion>
</AccordionGroup>

### 稳定性

- 命令：`pnpm test:stability:gateway`
- 配置：`vitest.gateway.config.ts`，强制使用一个工作进程
- 范围：
  - 启动一个默认启用诊断的真实回环 Gateway
  - 通过诊断事件路径驱动合成的 gateway 消息、内存和大负载变动
  - 通过 Gateway WS RPC 查询 `diagnostics.stability`Gateway(网关)RPC
  - 涵盖诊断稳定性包持久化辅助程序
  - 断言记录器保持有界，合成 RSS 样本保持在压力预算之下，且每个会话的队列深度排空回零
- 预期：
  - CI 安全且无密钥
  - 用于稳定性回归跟进的窄通道，而非完整 Gateway 套件的替代品

### E2E (gateway smoke)

- 命令：`pnpm test:e2e`
- 配置：`vitest.e2e.config.ts`
- 文件：`src/**/*.e2e.test.ts`、`test/**/*.e2e.test.ts` 以及 `extensions/` 下的 bundled-plugin E2E 测试
- 运行时默认值：
  - 使用 Vitest `threads` 和 `isolate: false`，与仓库的其余部分保持一致。
  - 使用自适应工作线程（CI：最多 2 个，本地：默认 1 个）。
  - 默认以静默模式运行以减少控制台 I/O 开销。
- 有用的覆盖选项：
  - `OPENCLAW_E2E_WORKERS=<n>` 强制工作线程数量（上限为 16）。
  - `OPENCLAW_E2E_VERBOSE=1` 重新启用详细控制台输出。
- 范围：
  - 多实例网关端到端行为
  - WebSocket/HTTP 接口、节点配对以及繁重的网络操作
- 预期：
  - 在 CI 中运行（在管道中启用时）
  - 不需要真实的密钥
  - 比单元测试有更多活动部件（可能会更慢）

### E2E：OpenShell 后端冒烟测试

- 命令：`pnpm test:e2e:openshell`
- 文件：`extensions/openshell/src/backend.e2e.test.ts`
- 范围：
  - 通过 Docker 在主机上启动一个隔离的 OpenShell 网关
  - 从临时的本地 Dockerfile 创建一个沙箱
  - 通过真实的 `sandbox ssh-config` + SSH exec 测试 OpenClaw 的 OpenShell 后端
  - 通过沙箱 fs 桥接验证远程规范文件系统行为
- 预期：
  - 仅限手动选择；不是默认 `pnpm test:e2e` 运行的一部分
  - 需要本地 `openshell` CLI 以及可工作的 Docker 守护进程
  - 使用隔离的 `HOME` / `XDG_CONFIG_HOME`，然后销毁测试网关和沙箱
- 有用的覆盖选项：
  - `OPENCLAW_E2E_OPENSHELL=1` 以在手动运行更广泛的 e2e 测试套件时启用此测试
  - `OPENCLAW_E2E_OPENSHELL_COMMAND=/path/to/openshell` 以指向非默认的 CLI 二进制文件或封装脚本

### Live（真实提供商 + 真实模型）

- 命令：`pnpm test:live`
- 配置：`vitest.live.config.ts`
- 文件：`src/**/*.live.test.ts`、`test/**/*.live.test.ts` 以及 `extensions/` 下的 bundled-plugin live 测试
- 默认：`pnpm test:live` **启用**（设置 `OPENCLAW_LIVE_TEST=1`）
- 范围：
  - “该提供商/模型在拥有真实凭据的*今天*是否真的能工作？”
  - 捕获提供商格式变更、工具调用怪癖、身份验证问题和速率限制行为
- 预期：
  - 设计上不保证 CI 稳定性（涉及真实网络、真实的提供商策略、配额和中断）
  - 需要费用 / 使用速率限制
  - 优先运行缩小范围的子集，而不是“所有”
- Live 运行源 `~/.profile` 以获取缺失的 API 密钥。
- 默认情况下，Live 运行仍然会隔离 `HOME`，并将配置/身份验证材料复制到临时测试主目录中，以免单元测试固件修改你真实的 `~/.openclaw`。
- 仅当你有意需要 Live 测试使用你真实的主目录时，才设置 `OPENCLAW_LIVE_USE_REAL_HOME=1`。
- `pnpm test:live` 现在默认为较安静的模式：它保留 `[live] ...` 进度输出，但抑制额外的 `~/.profile` 通知并静默网引导日志/Bonjour 闲聊。如果你想恢复完整的启动日志，请设置 `OPENCLAW_LIVE_TEST_QUIET=0`。
- API 密钥轮换（特定于提供商）：使用逗号/分号格式设置 `*_API_KEYS`，或设置 `*_API_KEY_1`、`*_API_KEY_2`（例如 `OPENAI_API_KEYS`、`ANTHROPIC_API_KEYS`、`GEMINI_API_KEYS`），或通过 `OPENCLAW_LIVE_*_KEY` 进行每次 Live 的覆盖；测试会在遇到速率限制响应时重试。
- 进度/心跳输出：
  - Live 套件现在会向 stderr 发出进度行，以便即使在 Vitest 控制台捕获处于安静状态时，长时间运行的提供商调用也能明显显示为活动状态。
  - `vitest.live.config.ts` 禁用 Vitest 控制台拦截，以便提供商/网关进度行在 Live 运行期间立即流式传输。
  - 使用 `OPENCLAW_LIVE_HEARTBEAT_MS` 调整直接模型心跳。
  - 使用 `OPENCLAW_LIVE_GATEWAY_HEARTBEAT_MS` 调整网关/探针心跳。

## 我应该运行哪个套件？

请使用此决策表：

- 编辑逻辑/测试：运行 `pnpm test`（如果你修改了很多，则还要运行 `pnpm test:coverage`）
- 涉及网关网络/WS 协议/配对：添加 `pnpm test:e2e`
- 调试“我的机器人挂了”/特定提供商故障/工具调用：运行缩小的 `pnpm test:live`

## Live（涉及网络）测试

关于 live 模型矩阵、CLI 后端冒烟测试、ACP 冒烟测试、Codex app-server harness 以及所有媒体提供商 live 测试（CLIDeepgram、BytePlus、ComfyUI、图像、音乐、视频、media harness）——以及 live 运行的凭证处理——请参阅 [Testing live suites](/zh/help/testing-live)。关于专用的更新和插件验证清单，请参阅 [Testing updates and plugins](/zh/help/testing-updates-plugins)。

## Docker 运行器（可选的“在 Linux 上可用”检查）

这些 Docker 运行器分为两类：

- Live-模型 运行器：`test:docker:live-models` 和 `test:docker:live-gateway` 仅在仓库 Docker 镜像内运行其匹配的 profile-key live 文件（`src/agents/models.profiles.live.test.ts` 和 `src/gateway/gateway-models.profiles.live.test.ts`），并挂载你的本地配置目录和工作区（如果挂载了，还会获取 `~/.profile`）。匹配的本地入口点是 `test:live:models-profiles` 和 `test:live:gateway-profiles`。
- Docker live 运行器默认使用较小的冒烟测试上限，以便完整的 Docker 扫描保持可行：
  `test:docker:live-models` 默认为 `OPENCLAW_LIVE_MAX_MODELS=12`，而
  `test:docker:live-gateway` 默认为 `OPENCLAW_LIVE_GATEWAY_SMOKE=1`、
  `OPENCLAW_LIVE_GATEWAY_MAX_MODELS=8`、
  `OPENCLAW_LIVE_GATEWAY_STEP_TIMEOUT_MS=45000` 和
  `OPENCLAW_LIVE_GATEWAY_MODEL_TIMEOUT_MS=90000`。当你明确想要进行更大的详尽扫描时，请覆盖这些环境变量。
- `test:docker:all` 通过 `test:docker:live-build` 构建一次实时 Docker 镜像，通过 `scripts/package-openclaw-for-docker.mjs` 将 OpenClaw 打包一次为 npm tarball，然后构建/重用两个 `scripts/e2e/Dockerfile` 镜像。基础镜像仅用于安装/更新/插件依赖通道的 Node/Git 运行器；这些通道挂载预构建的 tarball。功能镜像将相同的 tarball 安装到 `/app` 中，用于内置应用功能通道。Docker 通道定义位于 `scripts/lib/docker-e2e-scenarios.mjs` 中；规划器逻辑位于 `scripts/lib/docker-e2e-plan.mjs` 中；`scripts/test-docker-all.mjs` 执行所选计划。聚合体使用加权本地调度器：`OPENCLAW_DOCKER_ALL_PARALLELISM` 控制进程槽，而资源上限防止繁重的实时、npm-install 和多服务通道同时启动。如果单个通道重于活动上限，调度器仍可在池为空时启动它，然后让其单独运行，直到容量再次可用。默认值为 10 个槽、`OPENCLAW_DOCKER_ALL_LIVE_LIMIT=9`、`OPENCLAW_DOCKER_ALL_NPM_LIMIT=10` 和 `OPENCLAW_DOCKER_ALL_SERVICE_LIMIT=7`；仅当 Docker 主机有更多空间时才调整 `OPENCLAW_DOCKER_ALL_WEIGHT_LIMIT` 或 `OPENCLAW_DOCKER_ALL_DOCKER_LIMIT`。运行器默认执行 Docker 预检，移除过时的 OpenClaw E2E 容器，每 30 秒打印一次状态，将成功的通道计时存储在 `.artifacts/docker-tests/lane-timings.json` 中，并使用这些计时在后续运行中优先启动较长的通道。使用 `OPENCLAW_DOCKER_ALL_DRY_RUN=1` 打印加权通道清单而不构建或运行 Docker，或使用 `node scripts/test-docker-all.mjs --plan-json` 打印所选通道、包/镜像需求和凭据的 CI 计划。
- `Package Acceptance`GitHub 是 GitHub 原生包网关，用于验证“此可安装 tar 包是否作为产品正常工作？”。它从 `source=npm`、`source=ref`、`source=url` 或 `source=artifact` 中解析一个候选包，将其作为 `package-under-test`Docker 上传，然后针对该确切的 tar 包运行可复用的 Docker E2E 通道，而不是重新打包所选的引用。配置文件按范围排序：`smoke`、`package`、`product` 和 `full`。请参阅 [测试更新和插件](/zh/help/testing-updates-plugins) 以了解包/更新/插件约定、已发布升级幸存者矩阵、发布默认值和故障分类。
- 构建和发布检查在 tsdown 之后运行 `scripts/check-cli-bootstrap-imports.mjs`。守护程序会遍历来自 `dist/entry.js` 和 `dist/cli/run-main.js`CLI 的静态构建图，如果在命令分派之前的预分派启动阶段导入了 Commander、prompt UI、undici 或 logging 等包依赖项，则会失败；它还会保持捆绑的 gateway 运行块在预算范围内，并拒绝对已知冷 gateway 路径的静态导入。打包的 CLI 烟雾测试还覆盖了根帮助、入门帮助、医生帮助、状态、配置架构以及模型列表命令。
- 包验收遗留兼容性上限为 `2026.4.25`（包含 `2026.4.25-beta.*`）。在该截止版本之前，测试工具仅容忍已发布包的元数据缺口：省略的私有 QA 清单条目、缺失的 `gateway install --wrapper`、从 tar 包派生的 git 夹具中缺失的补丁文件、缺失的持久化 `update.channel`、遗留插件安装记录位置、缺失的 marketplace 安装记录持久化，以及在 `plugins update` 期间的配置元数据迁移。对于 `2026.4.25` 之后的包，这些路径均为严格失败。
- 容器冒烟测试运行程序：`test:docker:openwebui`、`test:docker:onboard`、`test:docker:npm-onboard-channel-agent`、`test:docker:skill-install`、`test:docker:update-channel-switch`、`test:docker:upgrade-survivor`、`test:docker:published-upgrade-survivor`、`test:docker:session-runtime-context`、`test:docker:agents-delete-shared-workspace`、`test:docker:gateway-network`、`test:docker:browser-cdp-snapshot`、`test:docker:mcp-channels`、`test:docker:pi-bundle-mcp-tools`、`test:docker:cron-mcp-cleanup`、`test:docker:plugins`、`test:docker:plugin-update`、`test:docker:plugin-lifecycle-matrix` 和 `test:docker:config-reload` 会启动一个或多个真实容器，并验证更高级别的集成路径。

live-模型 Docker 运行程序还仅绑定挂载所需的 CLI 认证主目录（当运行范围未缩小时，则挂载所有支持的目录），然后在运行前将其复制到容器主目录中，以便外部 CLI OAuth 可以刷新令牌而无需更改主机认证存储：

- 直接模型：`pnpm test:docker:live-models`（脚本：`scripts/test-live-models-docker.sh`）
- ACP 绑定冒烟测试：`pnpm test:docker:live-acp-bind`（脚本：`scripts/test-live-acp-bind-docker.sh`；默认覆盖 Claude、Codex 和 Gemini，通过 `pnpm test:docker:live-acp-bind:droid` 和 `pnpm test:docker:live-acp-bind:opencode` 进行严格的 Droid/OpenCode 覆盖）
- CLI 后端冒烟测试：CLI`pnpm test:docker:live-cli-backend`（脚本：`scripts/test-live-cli-backend-docker.sh`）
- Codex 应用服务器线束冒烟测试：`pnpm test:docker:live-codex-harness`（脚本：`scripts/test-live-codex-harness-docker.sh`）
- Gateway + 开发代理：Gateway(网关)`pnpm test:docker:live-gateway`（脚本：`scripts/test-live-gateway-models-docker.sh`）
- 可观测性冒烟测试：`pnpm qa:otel:smoke`Dockernpm 是一个私有的 QA 源代码检出通道。它故意不包含在包 Docker 发布通道中，因为 npm 压缩包省略了 QA Lab。
- Open WebUI 实时冒烟测试：`pnpm test:docker:openwebui`（脚本：`scripts/e2e/openwebui-docker.sh`）
- 新手引导向导 (TTY，完整脚手架)：`pnpm test:docker:onboard` (脚本：`scripts/e2e/onboard-docker.sh`)
- Npm tarball 新手引导/渠道/agent 烟雾测试：`pnpm test:docker:npm-onboard-channel-agent`OpenClawDockerOpenAITelegramOpenAI 在 Docker 中全局安装打包好的 OpenClaw tarball，通过 env-ref 新手引导配置 OpenAI 并默认配置 Telegram，运行 doctor，并运行一次模拟的 OpenAI agent 回合。使用 `OPENCLAW_CURRENT_PACKAGE_TGZ=/path/to/openclaw-*.tgz` 重用预构建的 tarball，使用 `OPENCLAW_NPM_ONBOARD_HOST_BUILD=0` 跳过主机重新构建，或使用 `OPENCLAW_NPM_ONBOARD_CHANNEL=discord` 或 `OPENCLAW_NPM_ONBOARD_CHANNEL=slack` 切换渠道。
- Skill 安装烟雾测试：`pnpm test:docker:skill-install`OpenClawDockerClawHub 在 Docker 中全局安装打包好的 OpenClaw tarball，在配置中禁用上传的归档安装，从搜索中解析当前的实时 ClawHub skill slug，使用 `openclaw skills install` 安装它，并验证已安装的 skill 以及 `.clawhub` origin/lock 元数据。
- 更新渠道切换烟雾测试：`pnpm test:docker:update-channel-switch`OpenClawDocker 在 Docker 中全局安装打包好的 OpenClaw tarball，从 package `stable` 切换到 git `dev`，验证持久化的渠道和插件更新后工作，然后切换回 package `stable` 并检查更新状态。
- 升级幸存者烟雾测试：`pnpm test:docker:upgrade-survivor`OpenClawGateway(网关) 将打包好的 OpenClaw tarball 安装到一个包含 agent、渠道配置、插件允许列表、过时的插件依赖状态以及现有 workspace/会话 文件的脏旧用户 fixture 上。它运行包更新和非交互式 doctor，无需实时提供商或渠道密钥，然后启动一个环回 Gateway(网关) 并检查配置/状态保留以及启动/状态预算。
- 已发布升级幸存者冒烟测试：`pnpm test:docker:published-upgrade-survivor` 默认安装 `openclaw@latest`，植入真实的现有用户文件，使用预定义的命令配方配置该基线，验证生成的配置，将该已发布的安装更新为候选 tarball，运行非交互式 doctor，写入 `.artifacts/upgrade-survivor/summary.json`Gateway(网关)，然后启动回环 Gateway(网关) 并检查配置的意图、状态保留、启动、`/healthz`、`/readyz`RPC 和 RPC 状态预算。使用 `OPENCLAW_UPGRADE_SURVIVOR_BASELINE_SPEC` 覆盖某个基线，要求聚合调度器使用 `OPENCLAW_UPGRADE_SURVIVOR_BASELINE_SPECS`（例如 `openclaw@2026.5.2 openclaw@2026.4.23 openclaw@2026.4.15`）扩展精确的本地基线，并使用 `OPENCLAW_UPGRADE_SURVIVOR_SCENARIOS`（例如 `reported-issues`）扩展问题形式的 fixtures；报告的问题集包括 `configured-plugin-installs`OpenClaw，用于自动修复外部 OpenClaw 插件安装。包验收将这些作为 `published_upgrade_survivor_baseline`、`published_upgrade_survivor_baselines` 和 `published_upgrade_survivor_scenarios` 公开，解析元基线令牌（如 `last-stable-4` 或 `all-since-2026.4.23`），而完整发布验证将发布 soak 包网关扩展到 `last-stable-4 2026.4.23 2026.5.2 2026.4.15` 加上 `reported-issues`。
- 会话运行时上下文冒烟测试：`pnpm test:docker:session-runtime-context` 验证隐藏的运行时上下文记录持久性以及 doctor 对受影响的重复提示重写分支的修复。
- Bun 全局安装冒烟测试：Bun`bash scripts/e2e/bun-global-install-smoke.sh` 打包当前树，在隔离的主目录中使用 `bun install -g` 安装它，并验证 `openclaw infer image providers --json` 返回捆绑的镜像提供程序而不是挂起。使用 `OPENCLAW_BUN_GLOBAL_SMOKE_PACKAGE_TGZ=/path/to/openclaw-*.tgz` 重用预构建的 tarball，使用 `OPENCLAW_BUN_GLOBAL_SMOKE_HOST_BUILD=0` 跳过主机构建，或使用 `OPENCLAW_BUN_GLOBAL_SMOKE_DIST_IMAGE=openclaw-dockerfile-smoke:local` 从构建的 Docker 镜像复制 `dist/`Docker。
- 安装程序 Docker 冒烟测试：Docker`bash scripts/test-install-sh-docker.sh`npmnpmnpm 在其 root、update 和 direct-npm 容器之间共享一个 npm 缓存。Update 冒烟测试在升级到候选 tarball 之前，默认将 npm `latest` 作为稳定基准。在本地使用 `OPENCLAW_INSTALL_SMOKE_UPDATE_BASELINE=2026.4.22` 覆盖，或通过 GitHub 上 Install Smoke 工作流的 `update_baseline_version`GitHubnpm 输入进行覆盖。非 root 安装程序检查保持独立的 npm 缓存，因此 root 拥有的缓存条目不会掩盖用户本地的安装行为。设置 `OPENCLAW_INSTALL_SMOKE_NPM_CACHE_DIR=/path/to/cache`npm 以在本地重新运行时重用 root/update/direct-npm 缓存。
- Install Smoke CI 使用 npm`OPENCLAW_INSTALL_SMOKE_SKIP_NPM_GLOBAL=1` 跳过重复的 direct-npm 全局更新；当需要 direct `npm install -g` 覆盖率时，在本地不带该环境变量运行脚本。
- 代理删除共享工作区 CLI 冒烟测试：CLI`pnpm test:docker:agents-delete-shared-workspace`（脚本：`scripts/e2e/agents-delete-shared-workspace-docker.sh`）默认构建 root Dockerfile 镜像，在隔离的容器主目录中用两个代理和一个工作区进行种子设定，运行 `agents delete --json`，并验证有效的 JSON 和保留的工作区行为。使用 `OPENCLAW_AGENTS_DELETE_SHARED_WORKSPACE_E2E_IMAGE=openclaw-dockerfile-smoke:local OPENCLAW_AGENTS_DELETE_SHARED_WORKSPACE_E2E_SKIP_BUILD=1` 重用 install-smoke 镜像。
- Gateway(网关) 网络测试（两个容器，WS 认证 + 健康检查）：Gateway(网关)`pnpm test:docker:gateway-network`（脚本：`scripts/e2e/gateway-network-docker.sh`）
- 浏览器 CDP 快照冒烟测试：`pnpm test:docker:browser-cdp-snapshot`（脚本：`scripts/e2e/browser-cdp-snapshot-docker.sh`）构建源 E2E 镜像加上 Chromium 层，使用原始 CDP 启动 Chromium，运行 `browser doctor --deep`，并验证 CDP 角色快照是否涵盖链接 URL、光标提升的可点击元素、iframe 引用和帧元数据。
- OpenAI Responses web_search minimal reasoning regression: OpenAI`pnpm test:docker:openai-web-search-minimal` (script: `scripts/e2e/openai-web-search-minimal-docker.sh`OpenAIGateway(网关)) 通过 Gateway 运行模拟的 OpenAI 服务器，验证 `web_search` 将 `reasoning.effort` 从 `minimal` 提升到 `low`Gateway(网关)，然后强制提供商架构拒绝，并检查原始详细信息是否出现在 Gateway 日志中。
- MCP 渠道桥接（种子 Gateway + stdio 桥接 + 原始 Claude 通知帧冒烟测试）：Gateway(网关)`pnpm test:docker:mcp-channels` (script: `scripts/e2e/mcp-channels-docker.sh`)
- Pi 捆绑 MCP 工具（真实 stdio MCP 服务器 + 嵌入式 Pi 配置文件允许/拒绝冒烟测试）：`pnpm test:docker:pi-bundle-mcp-tools` (script: `scripts/e2e/pi-bundle-mcp-tools-docker.sh`)
- Cron/subagent MCP 清理（真实 Gateway + 在隔离的 cron 和一次性 subagent 运行后进行 stdio MCP 子进程拆解）：Gateway(网关)`pnpm test:docker:cron-mcp-cleanup` (script: `scripts/e2e/cron-mcp-cleanup-docker.sh`)
- 插件（本地路径、`file:`npmClawHub、具有提升依赖项的 npm 注册表、git 移动引用、ClawHub 综合测试套件、市场更新以及 Claude 捆绑包启用/检查的安装/更新冒烟测试）：`pnpm test:docker:plugins` (script: `scripts/e2e/plugins-docker.sh`)
  设置 `OPENCLAW_PLUGINS_E2E_CLAWHUB=0`ClawHub 以跳过 ClawHub 模块，或使用 `OPENCLAW_PLUGINS_E2E_CLAWHUB_SPEC` 和 `OPENCLAW_PLUGINS_E2E_CLAWHUB_ID` 覆盖默认的综合测试包/运行时对。如果没有 `OPENCLAW_CLAWHUB_URL`/`CLAWHUB_URL`ClawHub，测试将使用隔离的本地 ClawHub 固件服务器。
- 插件更新未更改冒烟测试：`pnpm test:docker:plugin-update` (script: `scripts/e2e/plugin-update-unchanged-docker.sh`)
- 插件生命周期矩阵冒烟测试：`pnpm test:docker:plugin-lifecycle-matrix`OpenClawnpmnpm 在裸容器中安装打包好的 OpenClaw tarball，安装一个 npm 插件，切换启用/禁用，通过本地 npm 注册表进行升级和降级，删除已安装的代码，然后验证卸载仍然会清除陈旧状态，同时记录每个生命周期阶段的 RSS/CPU 指标。
- 配置重新加载元数据冒烟测试：`pnpm test:docker:config-reload`（脚本：`scripts/e2e/config-reload-source-docker.sh`）
- 插件：`pnpm test:docker:plugins` 涵盖本地路径、`file:`npmClawHub、具有提升依赖项的 npm 注册表、git 移动引用、ClawHub 固定装置、市场更新以及 Claude-bundle 启用/检查的安装/更新冒烟测试。`pnpm test:docker:plugin-update` 涵盖已安装插件的未更改更新行为。`pnpm test:docker:plugin-lifecycle-matrix`npm 涵盖资源跟踪的 npm 插件安装、启用、禁用、升级、降级和代码缺失卸载。

要手动预构建并重用共享功能镜像：

```bash
OPENCLAW_DOCKER_E2E_IMAGE=openclaw-docker-e2e-functional:local pnpm test:docker:e2e-build
OPENCLAW_DOCKER_E2E_IMAGE=openclaw-docker-e2e-functional:local OPENCLAW_SKIP_DOCKER_BUILD=1 pnpm test:docker:mcp-channels
```

套件特定的镜像覆盖（例如 `OPENCLAW_GATEWAY_NETWORK_E2E_IMAGE`）在设置时仍然优先。当 `OPENCLAW_SKIP_DOCKER_BUILD=1`Docker 指向远程共享镜像时，如果该镜像尚未在本地，脚本会将其拉取。QR 和安装程序 Docker 测试保留自己的 Dockerfile，因为它们验证的是包/安装行为，而不是共享的构建应用运行时。

live-模型 Docker 运行器还会以只读方式绑定挂载当前的代码检出，并将其暂存到容器内的临时工作目录中。这既保持了运行时镜像的精简，又能针对您确切的本地源码/配置运行 Vitest。暂存步骤会跳过大型仅限本地的缓存和应用构建输出，例如 `.pnpm-store`、`.worktrees`、`__openclaw_vitest__` 以及应用本地的 `.build` 或 Gradle 输出目录，这样 Docker 实时运行就不会花费数分钟去复制特定于机器的产物。它们还会设置 `OPENCLAW_SKIP_CHANNELS=1`TelegramDiscord，以便 gateway 实时探针不会在容器内启动真正的 Telegram/Discord/等渠道工作进程。`test:docker:live-models` 仍会运行 `pnpm test:live`，因此当您需要缩小或排除该 Docker 通道中的 gateway 实时覆盖范围时，也要传递 `OPENCLAW_LIVE_GATEWAY_*`。`test:docker:openwebui` 是更高级别的兼容性冒烟测试：它会启动一个启用了 OpenClaw 兼容 HTTP 端点的 OpenAI gateway 容器，针对该 gateway 启动一个固定的 Open WebUI 容器，通过 Open WebUI 登录，验证 `/api/models` 暴露了 `openclaw/default`，然后通过 Open WebUI 的 `/api/chat/completions` 代理发送真实的聊天请求。对于应在 Open WebUI 登录和模型发现后停止、而无需等待实时模型完成的发布路径 CI 检查，请设置 `OPENWEBUI_SMOKE_MODE=models`。首次运行可能会明显变慢，因为 Docker 可能需要拉取 Open WebUI 镜像，且 Open WebUI 可能需要完成其自身的冷启动设置。此通道期望一个可用的实时模型密钥，而 `OPENCLAW_PROFILE_FILE`（默认为 `~/.profile`）是在 Telegram 化运行中提供它的主要方式。成功的运行会打印出一个小的 JSON 载荷，例如 `{ "ok": true, "模型": "openclaw/default", ... }`。`test:docker:mcp-channels`DiscordiMessageGateway(网关)Docker 是有意确定性的，不需要真正的 Telegram、Discord 或 iMessage 账户。它会启动一个已播种的 Gateway 容器，启动第二个生成 `openclaw mcp serve` 的容器，然后通过真正的 stdio MCP 网桥验证路由对话发现、记录读取、附件元数据、实时事件队列行为、出站发送路由以及 Claude 风格的渠道 + 权限通知。通知检查会直接检查原始 stdio MCP 帧，因此冒烟测试验证的是网桥实际发出的内容，而不仅仅是特定客户端 SDK 恰好呈现的内容。`test:docker:pi-bundle-mcp-tools` 是确定性的，不需要实时模型密钥。它会构建仓库 Gateway(网关) 镜像，在容器内启动一个真正的 stdio MCP 探针服务器，通过嵌入式 Pi 包 MCP 运行时具体化该服务器，执行工具，然后验证 `coding` 和 `messaging` 保留 `bundle-mcp` 工具，而 `minimal` 和 `tools.deny: ["bundle-mcp"]` 则会过滤它们。`test:docker:cron-mcp-cleanup` 是确定性的，不需要实时模型密钥。它会启动一个带有真正 stdio MCP 探针服务器的已播种 Gateway(网关)，运行一个隔离的 cron 轮次和一个 `/subagents spawn` 单次子进程轮次，然后验证 MCP 子进程在每次运行后都会退出。

ACP 纯语言线程手动冒烟测试（非 CI）：

- `bun scripts/dev/discord-acp-plain-language-smoke.ts --channel <discord-channel-id> ...`
- 请保留此脚本用于回归/调试工作流。它可能再次需要用于 ACP 线程路由验证，因此请勿删除。

有用的环境变量：

- `OPENCLAW_CONFIG_DIR=...`（默认：`~/.openclaw`）挂载到 `/home/node/.openclaw`
- `OPENCLAW_WORKSPACE_DIR=...`（默认：`~/.openclaw/workspace`）挂载到 `/home/node/.openclaw/workspace`
- `OPENCLAW_PROFILE_FILE=...`（默认：`~/.profile`）挂载到 `/home/node/.profile` 并在运行测试之前获取（source）
- `OPENCLAW_DOCKER_PROFILE_ENV_ONLY=1` 用于仅验证从 `OPENCLAW_PROFILE_FILE`CLI 获取的环境变量，使用临时配置/工作区目录且无外部 CLI 身份验证挂载
- `OPENCLAW_DOCKER_CLI_TOOLS_DIR=...`（默认：`~/.cache/openclaw/docker-cli-tools`）挂载到 `/home/node/.npm-global`CLIDocker，用于 Docker 内部缓存的 CLI 安装
- CLI`$HOME` 下的外部 CLI 身份验证目录/文件以只读方式挂载到 `/host-auth...` 下，然后在测试开始前复制到 `/home/node/...` 中
  - 默认目录：`.minimax`
  - 默认文件：`~/.codex/auth.json`、`~/.codex/config.toml`、`.claude.json`、`~/.claude/.credentials.json`、`~/.claude/settings.json`、`~/.claude/settings.local.json`
  - 缩小的 提供商 运行仅挂载从 `OPENCLAW_LIVE_PROVIDERS` / `OPENCLAW_LIVE_GATEWAY_PROVIDERS` 推断出的所需目录/文件
  - 使用 `OPENCLAW_DOCKER_AUTH_DIRS=all`、`OPENCLAW_DOCKER_AUTH_DIRS=none` 或逗号分隔列表（如 `OPENCLAW_DOCKER_AUTH_DIRS=.claude,.codex`）手动覆盖
- `OPENCLAW_LIVE_GATEWAY_MODELS=...` / `OPENCLAW_LIVE_MODELS=...` 以缩小运行范围
- `OPENCLAW_LIVE_GATEWAY_PROVIDERS=...` / `OPENCLAW_LIVE_PROVIDERS=...` 以在容器内过滤 providers
- `OPENCLAW_SKIP_DOCKER_BUILD=1` 用于重用现有的 `openclaw:local-live` 镜像，以进行不需要重新构建的重新运行
- `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` 以确保凭据来自配置文件存储（而非环境变量）
- `OPENCLAW_OPENWEBUI_MODEL=...` 以选择由 Gateway 暴露给 Open WebUI 冒烟测试的模型
- `OPENCLAW_OPENWEBUI_PROMPT=...` 以覆盖 Open WebUI 冒烟测试使用的 nonce-check 提示词
- `OPENWEBUI_IMAGE=...` 以覆盖固定的 Open WebUI 镜像标签

## Docs sanity

在文档编辑后运行文档检查：`pnpm check:docs`。
当你还需要页面内标题检查时，运行完整的 Mintlify 锚点验证：`pnpm docs:check-links:anchors`。

## Offline regression (CI-safe)

这些是没有真实提供商的“真实管道”回归测试：

- Gateway(网关) 工具调用（模拟 OpenAI，真实的 gateway + agent 循环）：`src/gateway/gateway.test.ts`（案例：“通过 gateway agent 循环端到端运行模拟 OpenAI 工具调用”）
- Gateway(网关) 向导（WS `wizard.start`/`wizard.next`，写入配置 + 强制执行身份验证）：`src/gateway/gateway.test.ts`（案例：“通过 ws 运行向导并写入身份验证令牌配置”）

## Agent reliability evals (skills)

我们已经有一些行为类似于“agent reliability evals”的 CI 安全测试：

- 通过真实的 gateway + agent 循环进行模拟工具调用（`src/gateway/gateway.test.ts`）。
- 端到端向导流程，用于验证会话连接和配置效果（`src/gateway/gateway.test.ts`）。

Skills 仍然缺少什么（参见 [Skills](/zh/tools/skills)）：

- **决策制定：** 当提示词中列出了 skills 时，agent 会选择正确的 skill（或避免无关的 skill）吗？
- **合规性：** agent 在使用之前是否会读取 `SKILL.md` 并遵循必需的步骤/参数？
- **工作流契约：** 多轮场景，用于断言工具顺序、会话历史延续和沙箱边界。

未来的评估应首先保持确定性：

- 使用模拟提供商的场景运行器，以断言工具调用 + 顺序、skill 文件读取和会话连接。
- 一小套专注于 skill 的场景（使用 vs 避免、准入控制、提示词注入）。
- 只有在 CI 安全套件就位后，才进行可选的实时评估（选择性加入、受环境变量控制）。

## Contract tests (plugin and 渠道 shape)

合约测试验证每个已注册的插件和渠道是否符合其接口合约。它们遍历所有发现的插件并运行一套形状和行为断言。默认的 `pnpm test` 单元通道有意跳过这些共享接缝和冒烟文件；当您触及共享渠道或提供商表面时，请显式运行合约命令。

### 命令

- 所有合约：`pnpm test:contracts`
- 仅渠道合约：`pnpm test:contracts:channels`
- 仅提供商合约：`pnpm test:contracts:plugins`

### 渠道合约

位于 `src/channels/plugins/contracts/*.contract.test.ts`：

- **plugin** - 基本插件形状（id、名称、功能）
- **setup** - 设置向导合约
- **会话-binding** - 会话绑定行为
- **outbound-payload** - 消息有效负载结构
- **inbound** - 入站消息处理
- **actions** - 渠道操作处理程序
- **threading** - 线程 ID 处理
- **directory** - 目录/名册 API
- **group-policy** - 组策略强制执行

### 提供商状态合约

位于 `src/plugins/contracts/*.contract.test.ts`。

- **status** - 渠道状态探测
- **registry** - 插件注册表形状

### 提供商合约

位于 `src/plugins/contracts/*.contract.test.ts`：

- **auth** - 认证流程合约
- **auth-choice** - 认证选择/选择
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

## 添加回归（指导）

当您修复在实时测试中发现的提供商/模型问题时：

- 如果可能，添加一个 CI 安全的回归测试（模拟/存根提供商，或捕获确切的请求形状转换）
- 如果它本质上是仅限实时的（速率限制、认证策略），请保持实时测试狭窄并通过环境变量选择加入
- 优先针对捕获错误的最小层：
  - 提供商请求转换/重放错误 → 直接模型测试
  - Gateway 会话/历史/工具流水线 bug → Gateway 实时冒烟测试或 CI 安全的 Gateway 模拟测试
- SecretRef 遍历防护：
  - `src/secrets/exec-secret-ref-id-parity.test.ts` 从注册表元数据（`listSecretTargetRegistryEntries()`）中为每个 SecretRef 类推导一个采样目标，然后断言遍历段的执行 ID 会被拒绝。
  - 如果你在 `src/secrets/target-registry-data.ts` 中添加了新的 `includeInPlan` SecretRef 目标族，请在该测试中更新 `classifyTargetClass`。该测试会在未分类的目标 ID 上故意失败，以防止新类别被静默跳过。

## 相关

- [实时测试](/zh/help/testing-live)
- [测试更新和插件](/zh/help/testing-updates-plugins)
- [CI](/zh/ci)
