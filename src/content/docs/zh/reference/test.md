---
summary: "如何在本地运行测试 (vitest) 以及何时使用 force/coverage 模式"
read_when:
  - Running or fixing tests
title: "测试"
---

- 完整的测试套件（套件、实时、Docker）：[测试](Docker/en/help/testing)
- 更新和插件包验证：[测试更新和插件](/zh/help/testing-updates-plugins)

- `pnpm test:force`：终止任何占用默认控制端口的残留网关进程，然后使用隔离的网关端口运行完整的 Vitest 套件，以免服务器测试与运行中的实例发生冲突。当之前的网关运行导致端口 18789 被占用时，请使用此命令。
- `pnpm test:coverage`：运行带有 V8 覆盖率（通过 `vitest.unit.config.ts`）的单元测试套件。这是默认单元通道 的覆盖率关卡，而非整个仓库所有文件的覆盖率。阈值是 70% 的行/函数/语句和 55% 的分支。由于 `coverage.all` 为 false，且默认通道范围覆盖包括与非快速单元测试同级的源文件，因此该关卡衡量的是该通道拥有的源文件，而不是它恰好加载的每个传递性导入。
- `pnpm test:coverage:changed`：仅对自 `origin/main` 以来更改的文件运行单元覆盖率测试。
- `pnpm test:changed`：廉价的智能更改测试运行。它运行直接测试编辑、同级 `*.test.ts` 文件、显式源映射和本地导入图的精确目标。除非映射到精确测试，否则会跳过广泛的/配置/包的更改。
- `OPENCLAW_TEST_CHANGED_BROAD=1 pnpm test:changed`：显式的广泛更改测试运行。当测试工具/配置/包编辑应回退到 Vitest 更广泛的更改测试行为时，请使用此命令。
- `pnpm changed:lanes`：显示针对 `origin/main` 的差异所触发的架构通道。
- `pnpm check:changed`：针对 `origin/main` 的差异运行智能更改检查关卡。它为受影响的架构通道运行 typecheck、lint 和 guard 命令，但不运行 Vitest 测试。请使用 `pnpm test:changed` 或显式的 `pnpm test <target>` 进行测试验证。
- `pnpm test`：通过限定范围的 Vitest 通道路由显式的文件/目录目标。未针对的运行使用固定的分片组，并扩展到叶子配置以进行本地并行执行；扩展组始终扩展到每个扩展的分片配置，而不是一个巨大的根项目进程。
- 测试包装器运行以简短的 `[test] passed|failed|skipped ... in ...` 摘要结束。Vitest 自身的持续时间行保持分片详细信息。
- 共享 OpenClaw 测试状态：当测试需要隔离的 `HOME`、`OPENCLAW_STATE_DIR`、`OPENCLAW_CONFIG_PATH`、配置夹具、工作区、代理目录或身份配置文件存储时，请从 Vitest 使用 `src/test-utils/openclaw-test-state.ts`。
- 进程 E2E 辅助工具：当 Vitest 进程级 E2E 测试需要在一个位置运行 Gateway(网关)、CLI 环境时，请使用 `test/helpers/openclaw-test-instance.ts`，以及日志捕获和清理。
- Docker/Bash E2E 辅助工具：引用 `scripts/lib/docker-e2e-image.sh` 的通道可以将 `docker_e2e_test_state_shell_b64 <label> <scenario>` 传递到容器中并使用 `scripts/lib/openclaw-e2e-instance.sh` 对其进行解码；多主脚本可以传递 `docker_e2e_test_state_function_b64` 并在每个流中调用 `openclaw_test_state_create <label> <scenario>`。较低级别的调用者可以使用 `scripts/lib/openclaw-test-state.mjs shell --label <name> --scenario <name>` 获取容器内的 shell 片段，或使用 `node scripts/lib/openclaw-test-state.mjs -- create --label <name> --scenario <name> --env-file <path> --json` 获取可引用的主机环境文件。`create` 之前的 `--` 可防止较新的 Node 运行时将 `--env-file` 视为 Node 标志。启动 Docker 的 Gateway(网关)/Bash 通道可以在容器内引用 `scripts/lib/openclaw-e2e-instance.sh` 以进行入口点解析、模拟 OpenAI 启动、Gateway(网关) 前台/后台启动、就绪探测、状态环境导出、日志转储和进程清理。
- 完整、扩展和包含模式的分片运行会更新 `.artifacts/vitest-shard-timings.json` 中的本地计时数据；后续的完整配置运行会使用这些计时来平衡慢速和快速分片。包含模式的 CI 分片会将分片名称附加到计时键，这使得过滤后的分片计时保持可见，而不会替换完整配置的计时数据。设置 `OPENCLAW_TEST_PROJECTS_TIMINGS=0` 以忽略本地计时工件。
- 选定的 `plugin-sdk` 和 `commands` 测试文件现在通过专用的轻量级通道路由，该通道仅保留 `test/setup.ts`，从而将运行时繁重的用例保留在其现有通道上。
- 具有同级测试的源文件在回退到更宽的目录通配符之前会映射到该同级测试。当依赖路径精确时，`src/channels/plugins/contracts/test-helpers`、`src/plugin-sdk/test-helpers` 和 `src/plugins/contracts` 下的辅助编辑会使用本地导入图来运行导入测试，而不是广泛运行每个分片。
- `auto-reply` 现在也拆分为三个专用配置（`core`、`top-level`、`reply`），这样回复测试线就不会主导较轻量的顶级状态/令牌/辅助测试。
- 基础 Vitest 配置现在默认为 `pool: "threads"` 和 `isolate: false`，并在所有仓库配置中启用了共享的非隔离运行程序。
- `pnpm test:channels` 运行 `vitest.channels.config.ts`。
- `pnpm test:extensions` 和 `pnpm test extensions` 运行所有扩展/插件分片。繁重的渠道插件、浏览器插件和 OpenAI 作为专用分片运行；其他插件组保持批处理。使用 `pnpm test extensions/<id>` 获取一个捆绑的插件通道。
- `pnpm test:perf:imports`：启用 Vitest 导入持续时间 + 导入细分报告，同时仍对显式文件/目录目标使用作用域通道路由。
- `pnpm test:perf:imports:changed`：相同的导入分析，但仅适用于自 `origin/main` 以来更改的文件。
- `pnpm test:perf:changed:bench -- --ref <git-ref>` 针对相同的已提交 git diff，对路由的更改模式路径与本机根项目运行进行基准测试。
- `pnpm test:perf:changed:bench -- --worktree` 在不先提交的情况下对当前工作树更改集进行基准测试。
- `pnpm test:perf:profile:main`：为 Vitest 主线程 (`.artifacts/vitest-main-profile`) 写入 CPU 配置文件。
- `pnpm test:perf:profile:runner`：为单元运行程序 (`.artifacts/vitest-runner-profile`) 写入 CPU + 堆配置文件。
- `pnpm test:perf:groups --full-suite --allow-failures --output .artifacts/test-perf/baseline-before.json`：串行运行每个全套 Vitest 叶子配置，并写入分组的持续时间数据以及每个配置的 JSON/日志产物。测试性能代理在尝试修复慢速测试之前，将此作为其基线。
- `pnpm test:perf:groups:compare .artifacts/test-perf/baseline-before.json .artifacts/test-perf/after-agent.json`：在进行专注于性能的更改后比较分组报告。
- Gateway(网关) 集成：通过 `OPENCLAW_TEST_INCLUDE_GATEWAY=1 pnpm test` 或 `pnpm test:gateway` 选择加入。
- `pnpm test:e2e`：运行 Gateway 端到端冒烟测试（多实例 WS/HTTP/node 配对）。默认为 `threads` + `isolate: false`，并在 `vitest.e2e.config.ts` 中使用自适应工作线程；使用 `OPENCLAW_E2E_WORKERS=<n>` 进行调整，并设置 `OPENCLAW_E2E_VERBOSE=1` 以获取详细日志。
- `pnpm test:live`：运行提供商实时测试（minimax/zai）。需要 API 密钥和 `LIVE=1`（或特定于提供商的 `*_LIVE_TEST=1`）以取消跳过。
- `pnpm test:docker:all`：构建共享的 live-test 镜像，将 OpenClaw 打包一次为 npm tarball，构建/重用一个裸 Node/Git 运行器镜像以及一个将该 tarball 安装到 `/app` 的功能镜像，然后通过加权调度器使用 `OPENCLAW_SKIP_DOCKER_BUILD=1` 运行 Docker smoke lanes。裸镜像 (`OPENCLAW_DOCKER_E2E_BARE_IMAGE`) 用于安装程序/更新/插件依赖 lanes；这些 lanes 挂载预构建的 tarball，而不是使用复制的 repo 源。功能镜像 (`OPENCLAW_DOCKER_E2E_FUNCTIONAL_IMAGE`) 用于正常的构建应用功能 lanes。`scripts/package-openclaw-for-docker.mjs` 是单一本地/CI 包打包器，并在 Docker 消费之前验证 tarball 以及 `dist/postinstall-inventory.json`。Docker lane 定义位于 `scripts/lib/docker-e2e-scenarios.mjs` 中；规划器逻辑位于 `scripts/lib/docker-e2e-plan.mjs` 中；`scripts/test-docker-all.mjs` 执行选定的计划。`node scripts/test-docker-all.mjs --plan-json` 发出选定 lanes、镜像种类、包/实时镜像需求、状态场景和凭据检查的调度器拥有的 CI 计划，而不构建或运行 Docker。`OPENCLAW_DOCKER_ALL_PARALLELISM=<n>` 控制进程槽，默认为 10；`OPENCLAW_DOCKER_ALL_TAIL_PARALLELISM=<n>` 控制提供商敏感的尾部池，默认为 10。重型 lane 上限默认为 `OPENCLAW_DOCKER_ALL_LIVE_LIMIT=9`、`OPENCLAW_DOCKER_ALL_NPM_LIMIT=10` 和 `OPENCLAW_DOCKER_ALL_SERVICE_LIMIT=7`；提供商上限默认通过 `OPENCLAW_DOCKER_ALL_LIVE_CLAUDE_LIMIT=4`、`OPENCLAW_DOCKER_ALL_LIVE_CODEX_LIMIT=4` 和 `OPENCLAW_DOCKER_ALL_LIVE_GEMINI_LIMIT=4` 设定为每个提供商一个重型 lane。对于较大的主机，请使用 `OPENCLAW_DOCKER_ALL_WEIGHT_LIMIT` 或 `OPENCLAW_DOCKER_ALL_DOCKER_LIMIT`。如果某个 lane 在低并行主机上超过了有效权重或资源上限，它仍然可以从空池启动，并且将单独运行直到释放容量。Lane 启动默认交错 2 秒，以避免本地 Docker 守护进程创建风暴；可以使用 `OPENCLAW_DOCKER_ALL_START_STAGGER_MS=<ms>` 覆盖。运行器默认预检 Docker，清理陈旧的 OpenClaw E2E 容器，每 30 秒发出一次活动 lane 状态，在兼容的 lanes 之间共享提供商 CLI 工具缓存，默认重试一次瞬态实时提供商失败 (`OPENCLAW_DOCKER_ALL_LIVE_RETRIES=<n>`)，并将 lane 计时存储在 `.artifacts/docker-tests/lane-timings.json` 中，以便在后续运行中按最长优先排序。使用 `OPENCLAW_DOCKER_ALL_DRY_RUN=1` 打印 lane 清单而不运行 Docker，使用 `OPENCLAW_DOCKER_ALL_STATUS_INTERVAL_MS=<ms>` 调整状态输出，或使用 `OPENCLAW_DOCKER_ALL_TIMINGS=0` 禁用计时重用。使用 `OPENCLAW_DOCKER_ALL_LIVE_MODE=skip` 仅用于确定性/本地 lanes，或使用 `OPENCLAW_DOCKER_ALL_LIVE_MODE=only` 仅用于实时提供商 lanes；包别名为 `pnpm test:docker:local:all` 和 `pnpm test:docker:live:all`。仅实时模式将主要和尾部实时 lanes 合并为一个最长优先池，以便提供商存储桶可以将 Claude、Codex 和 Gemini 一起打包。除非设置了 `OPENCLAW_DOCKER_ALL_FAIL_FAST=0`，否则运行器将在第一次失败后停止调度新的池化 lanes，并且每个 lane 都有 120 分钟的回退超时，可以使用 `OPENCLAW_DOCKER_ALL_LANE_TIMEOUT_MS` 覆盖；选定的实时/尾部 lanes 使用更严格的每 lane 上限。CLI 后端 Docker 设置命令具有自己的超时，通过 `OPENCLAW_LIVE_CLI_BACKEND_SETUP_TIMEOUT_SECONDS` (默认 180)。Per-lane 日志、`summary.json`、`failures.json` 和阶段计时都写在 `.artifacts/docker-tests/<run-id>/` 下；使用 `pnpm test:docker:timings <summary.json>` 检查慢速 lanes，并使用 `pnpm test:docker:rerun <run-id|summary.json|failures.json>` 打印廉价的定向重新运行命令。
- `pnpm test:docker:browser-cdp-snapshot`Gateway(网关): 构建一个基于 Chromium 的源码端到端 (E2E) 容器，启动原始 CDP 和一个隔离的 Gateway(网关)，运行 `browser doctor --deep`，并验证 CDP 角色快照是否包含链接 URL、光标提升的可点击项、iframe 引用和帧元数据。
- `pnpm test:docker:skill-install`OpenClawDocker: 在裸机 Docker 运行器中安装打包好的 OpenClaw tarball，禁用 `skills.install.allowUploadedArchives`ClawHub，从实时 ClawHub 搜索解析当前的 skill slug，通过 `openclaw skills install` 安装它，并验证 `SKILL.md`、`.clawhub/origin.json`、`.clawhub/lock.json` 和 `skills info --json`。
- CLI 后端实时 Docker 探测可以作为聚焦通道运行，例如 CLIDocker`pnpm test:docker:live-cli-backend:codex`、`pnpm test:docker:live-cli-backend:codex:resume` 或 `pnpm test:docker:live-cli-backend:codex:mcp`。Claude 和 Gemini 具有匹配的 `:resume` 和 `:mcp` 别名。
- `pnpm test:docker:openwebui`OpenClaw: 启动 Docker 化的 OpenClaw + Open WebUI，通过 Open WebUI 登录，检查 `/api/models`，然后通过 `/api/chat/completions`OpenAI 运行真实的代理聊天。这需要可用的实时模型密钥（例如 `~/.profile` 中的 OpenAI），会拉取外部 Open WebUI 镜像，并且不像常规单元/e2e 测试套件那样预期在 CI 中保持稳定。
- `pnpm test:docker:mcp-channels`Gateway(网关): 启动一个已播种的 Gateway(网关) 容器和第二个生成 `openclaw mcp serve` 的客户端容器，然后验证路由对话发现、脚本读取、附件元数据、实时事件队列行为、出站发送路由以及通过真实 stdio 桥接进行的 Claude 风格渠道 + 权限通知。Claude 通知断言直接读取原始 stdio MCP 帧，因此冒烟测试反映了桥接实际发出的内容。
- `pnpm test:docker:upgrade-survivor`：在脏旧的旧用户装置上安装打包好的 OpenClaw tarball，运行包更新以及非交互式诊断（不包含实时提供商或渠道密钥），然后启动回环 Gateway(网关) 并检查代理、渠道配置、插件允许列表、工作区/会话文件、陈旧的旧版插件依赖状态、启动以及 RPC 状态是否保持完好。
- `pnpm test:docker:published-upgrade-survivor`：默认安装 `openclaw@latest`，在不使用实时提供商或渠道密钥的情况下植入逼真的现有用户文件，使用烘焙的 `openclaw config set` 命令配方配置该基线，将已发布的安装更新为打包的 OpenClaw tarball，运行非交互式诊断，写入 `.artifacts/upgrade-survivor/summary.json`，然后启动回环 Gateway(网关) 并检查配置的意图、工作区/会话文件、陈旧的插件配置和旧版依赖状态、启动、`/healthz`、`/readyz` 以及 RPC 状态是否保持完好或能够干净地修复。使用 `OPENCLAW_UPGRADE_SURVIVOR_BASELINE_SPEC` 覆盖某个基线，使用 `OPENCLAW_UPGRADE_SURVIVOR_BASELINE_SPECS`（例如 `openclaw@2026.5.2 openclaw@2026.4.23 openclaw@2026.4.15`）扩展精确的本地矩阵，或使用 `OPENCLAW_UPGRADE_SURVIVOR_SCENARIOS=reported-issues` 添加场景装置；报告的问题集包括 `configured-plugin-installs`，用于验证配置的外部 OpenClaw 插件在升级期间是否自动安装，以及 `stale-source-plugin-shadow`，用于防止仅源代码的插件影子破坏启动。Package Acceptance 将这些暴露为 `published_upgrade_survivor_baseline`、`published_upgrade_survivor_baselines` 和 `published_upgrade_survivor_scenarios`，并在将精确的包规格传递给 Docker 通道之前解析元基线令牌（如 `last-stable-4` 或 `all-since-2026.4.23`）。
- `pnpm test:docker:update-migration`：在清理繁重的 `plugin-deps-cleanup` 场景中运行已发布版本的升级测试工具（survivor harness），默认从 `openclaw@2026.4.23` 开始。单独的 `Update Migration` 工作流使用 `baselines=all-since-2026.4.23` 扩展此通道，以便从 `.23` 开始的每个稳定发布包都能更新到候选版本，并在完整版 CI 之外验证已配置插件的依赖清理。
- `pnpm test:docker:plugins`：针对本地路径、`file:`、具有提升依赖的 npm 注册表包、git 移动引用、ClawHub 固件、市场更新以及 Claude-bundle 启用/检查运行安装/更新冒烟测试。

## 本地 PR 门禁

对于本地 PR 合入/门禁检查，请运行：

- `pnpm check:changed`
- `pnpm check`
- `pnpm check:test-types`
- `pnpm build`
- `pnpm test`
- `pnpm check:docs`

如果 `pnpm test` 在负载较重的主机上出现不稳定，请在将其视为回归之前重新运行一次，然后使用 `pnpm test <path/to/test>` 进行隔离。对于内存受限的主机，请使用：

- `OPENCLAW_VITEST_MAX_WORKERS=1 pnpm test`
- `OPENCLAW_VITEST_FS_MODULE_CACHE_PATH=/tmp/openclaw-vitest-cache pnpm test:changed`

## 模型延迟基准测试（本地密钥）

脚本：[`scripts/bench-model.ts`](https://github.com/openclaw/openclaw/blob/main/scripts/bench-model.ts)

用法：

- `source ~/.profile && pnpm tsx scripts/bench-model.ts --runs 10`
- 可选环境变量：`MINIMAX_API_KEY`、`MINIMAX_BASE_URL`、`MINIMAX_MODEL`、`ANTHROPIC_API_KEY`
- 默认提示词：“用一个单词回复：ok。不要标点符号或额外文本。”

上次运行（2025-12-31，20 次运行）：

- minimax 中位数 1279ms（最小 1114，最大 2431）
- opus 中位数 2454ms（最小 1224，最大 3170）

## CLI 启动基准测试

脚本：[`scripts/bench-cli-startup.ts`](https://github.com/openclaw/openclaw/blob/main/scripts/bench-cli-startup.ts)

用法：

- `pnpm test:startup:bench`
- `pnpm test:startup:bench:smoke`
- `pnpm test:startup:bench:save`
- `pnpm test:startup:bench:update`
- `pnpm test:startup:bench:check`
- `pnpm tsx scripts/bench-cli-startup.ts`
- `pnpm tsx scripts/bench-cli-startup.ts --runs 12`
- `pnpm tsx scripts/bench-cli-startup.ts --preset real`
- `pnpm tsx scripts/bench-cli-startup.ts --preset real --case status --case gatewayStatus --runs 3`
- `pnpm tsx scripts/bench-cli-startup.ts --preset real --case tasksJson --case tasksListJson --case tasksAuditJson --runs 3`
- `pnpm tsx scripts/bench-cli-startup.ts --entry openclaw.mjs --entry-secondary dist/entry.js --preset all`
- `pnpm tsx scripts/bench-cli-startup.ts --preset all --output .artifacts/cli-startup-bench-all.json`
- `pnpm tsx scripts/bench-cli-startup.ts --preset real --case gatewayStatusJson --output .artifacts/cli-startup-bench-smoke.json`
- `pnpm tsx scripts/bench-cli-startup.ts --preset real --cpu-prof-dir .artifacts/cli-cpu`
- `pnpm tsx scripts/bench-cli-startup.ts --json`

预设：

- `startup`: `--version`, `--help`, `health`, `health --json`, `status --json`, `status`
- `real`: `health`, `status`, `status --json`, `sessions`, `sessions --json`, `tasks --json`, `tasks list --json`, `tasks audit --json`, `agents list --json`, `gateway status`, `gateway status --json`, `gateway health --json`, `config get gateway.port`
- `all`: 两个预设

输出包括每个命令的 `sampleCount`、平均值、p50、p95、最小/最大值、退出代码/信号分布以及最大 RSS 摘要。可选的 `--cpu-prof-dir` / `--heap-prof-dir` 会在每次运行时写入 V8 配置文件，以便计时和配置文件捕获使用相同的工具。

保存的输出约定：

- `pnpm test:startup:bench:smoke` 将目标烟雾测试产物写入 `.artifacts/cli-startup-bench-smoke.json`
- `pnpm test:startup:bench:save` 使用 `runs=5` 和 `warmup=1` 将完整套件产物写入 `.artifacts/cli-startup-bench-all.json`
- `pnpm test:startup:bench:update` 使用 `runs=5` 和 `warmup=1` 刷新 `test/fixtures/cli-startup-bench.json` 处已检入的基准固件

已检入的固件：

- `test/fixtures/cli-startup-bench.json`
- 使用 `pnpm test:startup:bench:update` 刷新
- 使用 `pnpm test:startup:bench:check` 将当前结果与固件进行比较

## 新手引导 E2E (Docker)

Docker 是可选的；这仅用于容器化的新手引导烟雾测试。

在干净的 Linux 容器中执行完整的冷启动流程：

```bash
scripts/e2e/onboard-docker.sh
```

此脚本通过伪终端驱动交互式向导，验证配置/工作区/会话文件，然后启动网关并运行 `openclaw health`。

## QR 导入冒烟测试 (Docker)

确保维护的 QR 运行时辅助程序在支持的 Docker Node 运行时（默认 Node 24，兼容 Node 22）下加载：

```bash
pnpm test:docker:qr
```

## 相关

- [测试](/zh/help/testing)
- [实时测试](/zh/help/testing-live)
- [测试更新和插件](/zh/help/testing-updates-plugins)
