---
summary: "如何在本地运行测试 (vitest) 以及何时使用 force/coverage 模式"
read_when:
  - Running or fixing tests
title: "测试"
---

- 完整测试套件（套件、实时、Docker）：[测试](Docker/en/help/testing)
- 更新和插件包验证：[测试更新和插件](/zh/help/testing-updates-plugins)

- 常规本地测试顺序：
  1. `pnpm test:changed` 用于变更范围 Vitest 验证。
  2. `pnpm test <path-or-filter>` 用于单个文件、目录或显式目标。
  3. `pnpm test` 仅当您有意需要完整的本地 Vitest 套件时使用。
- `pnpm test:force`：终止任何占用默认控制端口的残留网关进程，然后使用隔离的网关端口运行完整的 Vitest 套件，以防止服务器测试与正在运行的实例发生冲突。当先前的网关运行导致端口 18789 被占用时，请使用此命令。
- `pnpm test:coverage`：使用 V8 覆盖率运行单元套件（通过 `vitest.unit.config.ts`）。这是一个默认单元车道覆盖率门禁，而非整个仓库的所有文件覆盖率。阈值是 70% 的行/函数/语句和 55% 的分支。由于 `coverage.all` 为 false，且默认车道范围覆盖率包含带有兄弟源文件的非快速单元测试，因此该门禁测量的是该车道拥有的源代码，而不是它碰巧加载的每个传递性导入。
- `pnpm test:coverage:changed`：仅对自 `origin/main` 以来更改的文件运行单元覆盖率。
- `pnpm test:changed`：廉价的智能变更测试运行。它运行直接测试编辑、兄弟 `*.test.ts` 文件、显式源映射和本地导入图的精确目标。除非映射到精确测试，否则会跳过广泛/配置/包的更改。
- `OPENCLAW_TEST_CHANGED_BROAD=1 pnpm test:changed`：显式的广泛变更测试运行。当测试工具/配置/包编辑应回退到 Vitest 的更广泛的变更测试行为时，请使用它。
- `pnpm changed:lanes`：显示由针对 `origin/main` 的差异触发的架构车道。
- `pnpm check:changed`：在 CI 环境外默认委托给 Crabbox/Testbox，然后在远程子容器中运行针对 `origin/main` 差异的智能变更检查门控。它会为受影响的架构通道运行类型检查、lint 和 guard 命令，但不运行 Vitest 测试。请使用 `pnpm test:changed` 或显式的 `pnpm test <target>` 进行测试证明。
- Codex 工作树和链接/稀疏检出：避免直接进行本地 `pnpm test*`、`pnpm check*` 和 `pnpm crabbox:run`，除非您已确认 pnpm 不会协调依赖项。对于微小的显式文件证明，请使用 `node scripts/run-vitest.mjs <path-or-filter>`；对于变更门控或广泛证明，请使用 `node scripts/crabbox-wrapper.mjs run --provider blacksmith-testbox ... -- env OPENCLAW_CHECK_CHANGED_REMOTE_CHILD=1 OPENCLAW_CHANGED_LANES_RAW_SYNC=1 corepack pnpm check:changed`，以便 pnpm 在 Testbox 内部运行。
- `OPENCLAW_HEAVY_CHECK_LOCK_SCOPE=worktree <local-heavy-check command>`：将重度检查的序列化保留在当前 worktree 内，而不是 Git 公共目录中，适用于诸如 `pnpm check:changed` 和定向 `pnpm test ...` 之类的命令。仅当您有意在链接的 worktree 之间运行独立检查时，才在高容量的本地主机上使用它。
- `pnpm test`：通过作用域 Vitest 通道路由显式文件/目录目标。无目标运行是全套件验证：它们使用固定的分片组，扩展到叶配置以进行本地并行执行，并在开始前打印预期的本地分片分布。扩展组总是扩展到每个扩展的分片配置，而不是一个巨大的根项目进程。
- 测试包装器运行以简短的 `[test] passed|failed|skipped ... in ...` 摘要结束。Vitest 自身的持续时间行保持为每个分片的详细信息。
- 共享 OpenClaw 测试状态：当测试需要隔离的 `HOME`、`OPENCLAW_STATE_DIR`、`OPENCLAW_CONFIG_PATH`、配置夹具、工作区、代理目录或身份验证配置文件存储时，请使用 Vitest 中的 `src/test-utils/openclaw-test-state.ts`。
- Control UI 模拟 E2E：在启动 Vite Control UI 并针对模拟的 Gateway(网关) WebSocket 驱动真实 Chromium 页面的 Vitest + Playwright 通道中，使用 `pnpm test:ui:e2e`Gateway(网关)。测试位于 `ui/src/**/*.e2e.test.ts`；共享的模拟和控制位于 `ui/src/test-helpers/control-ui-e2e.ts`。`pnpm test:e2e` 包含此通道。在 Codex 工作树中，安装依赖后，建议使用 `node scripts/run-vitest.mjs run --config test/vitest/vitest.ui-e2e.config.ts --configLoader runner ui/src/ui/e2e/chat-flow.e2e.test.ts` 进行微小的针对性验证，或使用 Testbox/Crabbox 进行更广泛的 GUI 验证。
- 进程 E2E 辅助工具：当 Vitest 进程级 E2E 测试需要在一个地方运行 Gateway(网关)、CLI 环境、日志捕获和清理时，使用 `test/helpers/openclaw-test-instance.ts`Gateway(网关)CLI。
- TUI PTY 测试：使用 TUI`node scripts/run-vitest.mjs run --config test/vitest/vitest.tui-pty.config.ts` 进行快速的后端模拟 PTY 通道。使用 `OPENCLAW_TUI_PTY_INCLUDE_LOCAL=1` 或 `pnpm tui:pty:test:watch --mode local` 进行较慢的 `tui --local` 冒烟测试，该测试仅模拟外部模型端点。断言稳定的可见文本或 fixture 调用，而不是原始 ANSI 快照。
- Docker/Bash E2E 辅助工具：获取 Docker`scripts/lib/docker-e2e-image.sh` 的通道可以将 `docker_e2e_test_state_shell_b64 <label> <scenario>` 传递到容器中并使用 `scripts/lib/openclaw-e2e-instance.sh` 对其进行解码；多主脚本可以传递 `docker_e2e_test_state_function_b64` 并在每个流中调用 `openclaw_test_state_create <label> <scenario>`。较低级别的调用者可以使用 `scripts/lib/openclaw-test-state.mjs shell --label <name> --scenario <name>` 获取容器内的 shell 片段，或使用 `node scripts/lib/openclaw-test-state.mjs -- create --label <name> --scenario <name> --env-file <path> --json` 获取可获取的主机环境文件。`create` 之前的 `--` 可防止较新的 Node 运行时将 `--env-file`DockerGateway(网关) 视为 Node 标志。启动 Gateway(网关) 的 Docker/Bash 通道可以在容器内获取 `scripts/lib/openclaw-e2e-instance.sh`OpenAIGateway(网关)，用于入口点解析、模拟 OpenAI 启动、Gateway(网关) 前台/后台启动、就绪探针、状态环境导出、日志转储和进程清理。
- 完整、扩展和包含模式的分片运行会更新 `.artifacts/vitest-shard-timings.json` 中的本地计时数据；后续的完整配置运行会利用这些计时数据来平衡慢速和快速分片。包含模式的 CI 分片会将分片名称追加到计时键中，从而在保持筛选后的分片计时可见的同时，不覆盖完整配置的计时数据。设置 `OPENCLAW_TEST_PROJECTS_TIMINGS=0` 可忽略本地计时产物。
- 选定的 `plugin-sdk` 和 `commands` 测试文件现在通过专用的轻量级通道进行路由，该通道仅保留 `test/setup.ts`，而将运行时繁重的测试用例留在其现有通道上。
- 具有同级测试的源文件会先映射到该同级文件，然后再回退到更宽泛的目录通配符。在 `src/channels/plugins/contracts/test-helpers`、`src/plugin-sdk/test-helpers` 和 `src/plugins/contracts` 下的 Helper 编辑会使用本地导入图来运行导入测试，而不是在依赖路径精确时广泛运行每个分片。
- `auto-reply` 现在也拆分为三个专用配置（`core`、`top-level`、`reply`），以便回复测试工具不会主导较轻量的顶级状态/令牌/helper 测试。
- 基础 Vitest 配置现在默认为 `pool: "threads"` 和 `isolate: false`，并在所有仓库配置中启用了共享的非隔离运行器。
- `pnpm test:channels` 运行 `vitest.channels.config.ts`。
- `pnpm test:extensions` 和 `pnpm test extensions` 运行所有扩展/插件分片。繁重的渠道插件、浏览器插件和 OpenAI 作为专用分片运行；其他插件组保持批处理。使用 `pnpm test extensions/<id>` 运行一个打包的插件通道。
- `pnpm test:perf:imports`：启用 Vitest 导入时长 + 导入细分报告，同时仍对显式文件/目录目标使用限定范围的通道路由。
- `pnpm test:perf:imports:changed`：相同的导入分析，但仅针对自 `origin/main` 以来更改的文件。
- `pnpm test:perf:changed:bench -- --ref <git-ref>` 对相同的已提交 git 差异，对比路由的更改模式路径与原生根项目运行进行基准测试。
- `pnpm test:perf:changed:bench -- --worktree` 对当前工作树的更改集进行基准测试，而无需先提交。
- `pnpm test:perf:profile:main`：为 Vitest 主线程 (`.artifacts/vitest-main-profile`) 编写 CPU 配置文件。
- `pnpm test:perf:profile:runner`：为单元运行器 (`.artifacts/vitest-runner-profile`) 编写 CPU + 堆配置文件。
- `pnpm test:perf:groups --full-suite --allow-failures --output .artifacts/test-perf/baseline-before.json`：串行运行每个全套件 Vitest 叶子配置，并编写分组持续时间数据以及每个配置的 JSON/日志工件。测试性能代理在尝试修复慢速测试之前将其用作基线。
- `pnpm test:perf:groups:compare .artifacts/test-perf/baseline-before.json .artifacts/test-perf/after-agent.json`：在专注于性能的更改后比较分组报告。
- `pnpm test:docker:timings <summary.json>` 在运行所有 Docker 后检查慢速 Docker 通道；使用 `pnpm test:docker:rerun <run-id|summary.json|failures.json>` 从同一工件打印廉价的定向重新运行命令。
- Gateway(网关) 集成：通过 `OPENCLAW_TEST_INCLUDE_GATEWAY=1 pnpm test` 或 `pnpm test:gateway` 选择加入。
- `pnpm test:e2e`：运行仓库 E2E 聚合：网关端到端冒烟测试以及控制 UI 模拟浏览器 E2E 通道。
- `pnpm test:e2e:gateway`：运行网关端到端冒烟测试（多实例 WS/HTTP/node 配对）。默认为 `threads` + `isolate: false` 并在 `vitest.e2e.config.ts` 中使用自适应工作器；使用 `OPENCLAW_E2E_WORKERS=<n>` 进行调整，并设置 `OPENCLAW_E2E_VERBOSE=1` 以获取详细日志。
- `pnpm test:live`：运行提供商实时测试 (minimax/zai)。需要 API 密钥和 `LIVE=1`（或特定于提供商的 `*_LIVE_TEST=1`）以取消跳过。
- `pnpm test:docker:all`OpenClawnpm：构建共享的 live-test 镜像，将 OpenClaw 打包一次为 npm tarball，构建/重用基础的 Node/Git 运行器镜像以及将该 tarball 安装到 `/app`Docker 中的功能镜像，然后通过加权调度器使用 `OPENCLAW_SKIP_DOCKER_BUILD=1` 运行 Docker 烟雾通道。基础镜像 (`OPENCLAW_DOCKER_E2E_BARE_IMAGE`) 用于安装程序/更新/插件依赖通道；这些通道挂载预构建的 tarball，而不是使用复制的仓库源。功能镜像 (`OPENCLAW_DOCKER_E2E_FUNCTIONAL_IMAGE`) 用于正常的构建应用功能通道。`scripts/package-openclaw-for-docker.mjs` 是单一本地/CI 包打包器，并在 Docker 使用之前验证 tarball 以及 `dist/postinstall-inventory.json`DockerDocker。Docker 通道定义位于 `scripts/lib/docker-e2e-scenarios.mjs`；规划器逻辑位于 `scripts/lib/docker-e2e-plan.mjs`；`scripts/test-docker-all.mjs` 执行选定的计划。`node scripts/test-docker-all.mjs --plan-json`Docker 发出调度器拥有的 CI 计划，用于选定的通道、镜像类型、包/live-image 需求、状态场景和凭据检查，而无需构建或运行 Docker。`OPENCLAW_DOCKER_ALL_PARALLELISM=<n>` 控制进程槽，默认为 10；`OPENCLAW_DOCKER_ALL_TAIL_PARALLELISM=<n>` 控制提供商敏感的尾部池，默认为 10。重型通道上限默认为 `OPENCLAW_DOCKER_ALL_LIVE_LIMIT=9`、`OPENCLAW_DOCKER_ALL_NPM_LIMIT=10` 和 `OPENCLAW_DOCKER_ALL_SERVICE_LIMIT=7`；提供商上限默认为每个提供商一个重型通道，通过 `OPENCLAW_DOCKER_ALL_LIVE_CLAUDE_LIMIT=4`、`OPENCLAW_DOCKER_ALL_LIVE_CODEX_LIMIT=4` 和 `OPENCLAW_DOCKER_ALL_LIVE_GEMINI_LIMIT=4`。对于较大的主机，请使用 `OPENCLAW_DOCKER_ALL_WEIGHT_LIMIT` 或 `OPENCLAW_DOCKER_ALL_DOCKER_LIMIT`Docker。如果某个通道在低并行度主机上超过了有效权重或资源上限，它仍然可以从空池开始，并将单独运行直到释放容量。通道启动默认错开 2 秒，以避免本地 Docker 守护进程创建风暴；可以使用 `OPENCLAW_DOCKER_ALL_START_STAGGER_MS=<ms>`DockerOpenClawCLI 覆盖。运行器默认预检 Docker，清理过时的 OpenClaw E2E 容器，每 30 秒发出活动通道状态，在兼容通道之间共享提供商 CLI 工具缓存，默认重试一次瞬态 live-提供商 故障 (`OPENCLAW_DOCKER_ALL_LIVE_RETRIES=<n>`)，并将通道计时存储在 `.artifacts/docker-tests/lane-timings.json` 中，以便在后续运行中进行最长优先排序。使用 `OPENCLAW_DOCKER_ALL_DRY_RUN=1`Docker 在不运行 Docker 的情况下打印通道清单，使用 `OPENCLAW_DOCKER_ALL_STATUS_INTERVAL_MS=<ms>` 调整状态输出，或使用 `OPENCLAW_DOCKER_ALL_TIMINGS=0` 禁用计时重用。对于仅确定性/本地通道使用 `OPENCLAW_DOCKER_ALL_LIVE_MODE=skip`，对于仅 live-提供商 通道使用 `OPENCLAW_DOCKER_ALL_LIVE_MODE=only`；包别名为 `pnpm test:docker:local:all` 和 `pnpm test:docker:live:all`。仅实时模式将主通道和尾部实时通道合并为一个最长优先池，以便提供商桶可以协同打包 Claude、Codex 和 Gemini 工作。除非设置了 `OPENCLAW_DOCKER_ALL_FAIL_FAST=0`，否则运行器会在第一次失败后停止调度新的池化通道，每个通道都有 120 分钟的回退超时，可通过 `OPENCLAW_DOCKER_ALL_LANE_TIMEOUT_MS`CLIDocker 覆盖；选定的实时/尾部通道使用更严格的每通道上限。CLI 后端 Docker 设置命令通过 `OPENCLAW_LIVE_CLI_BACKEND_SETUP_TIMEOUT_SECONDS`（默认 180）拥有自己的超时时间。每通道日志、`summary.json`、`failures.json` 和阶段计时写入 `.artifacts/docker-tests/<run-id>/` 下；使用 `pnpm test:docker:timings <summary.json>` 检查慢速通道，使用 `pnpm test:docker:rerun <run-id|summary.json|failures.json>` 打印廉价的定向重新运行命令。
- `pnpm test:docker:browser-cdp-snapshot`：构建一个基于 Chromium 的源端 E2E 容器，启动原始 CDP 和一个隔离的 Gateway(网关)，运行 `browser doctor --deep`，并验证 CDP 角色快照是否包含链接 URL、光标提升的可点击元素、iframe 引用和帧元数据。
- `pnpm test:docker:skill-install`：在裸 OpenClaw 运行器中安装打包的 Docker tarball，禁用 `skills.install.allowUploadedArchives`，从实时 ClawHub 搜索中解析当前的 skill slug，通过 `openclaw skills install` 安装它，并验证 `SKILL.md`、`.clawhub/origin.json`、`.clawhub/lock.json` 和 `skills info --json`。
- CLI 后端实时 Docker 探针可以作为专用通道运行，例如 `pnpm test:docker:live-cli-backend:claude`、`pnpm test:docker:live-cli-backend:claude:resume` 或 `pnpm test:docker:live-cli-backend:claude:mcp`。Gemini 具有匹配的 `:resume` 和 `:mcp` 别名。
- `pnpm test:docker:openwebui`：启动 Docker 化的 OpenClaw + Open WebUI，通过 Open WebUI 登录，检查 `/api/models`，然后通过 `/api/chat/completions` 运行真实的代理聊天。需要可用的实时模型密钥，拉取外部 Open WebUI 镜像，并且不像常规 unit/e2e 套件那样期望在 CI 中保持稳定。
- `pnpm test:docker:mcp-channels`：启动一个已播种的 Gateway(网关) 容器和第二个生成 `openclaw mcp serve` 的客户端容器，然后验证通过真实 stdio 网桥进行的路由对话发现、脚本读取、附件元数据、实时事件队列行为、出站发送路由，以及 Claude 风格的渠道 + 权限通知。Claude 通知断言直接读取原始 stdio MCP 帧，因此冒烟测试反映了网桥实际发出的内容。
- `pnpm test:docker:upgrade-survivor`：在脏旧用户夹具上安装打包的 OpenClaw tarball，运行包更新以及非交互式诊断检查（无需实时提供商或渠道密钥），然后启动回环 Gateway(网关) 并检查代理、渠道配置、插件允许列表、工作区/会话文件、陈旧的旧版插件依赖状态、启动和 RPC 状态是否能够保留。
- `pnpm test:docker:published-upgrade-survivor`：默认安装 `openclaw@latest`，在不使用实时提供商或渠道密钥的情况下植入真实的现有用户文件，使用内置的 `openclaw config set` 命令配方配置该基线，将该已发布的安装更新为打包的 OpenClaw tarball，运行非交互式诊断检查，写入 `.artifacts/upgrade-survivor/summary.json`，然后启动回环 Gateway(网关) 并检查配置的意图、工作区/会话文件、陈旧的插件配置和旧版依赖状态、启动、`/healthz`、`/readyz` 和 RPC 状态是否能够保留或干净地修复。使用 `OPENCLAW_UPGRADE_SURVIVOR_BASELINE_SPEC` 覆盖一个基线，使用 `OPENCLAW_UPGRADE_SURVIVOR_BASELINE_SPECS`（例如 `openclaw@2026.5.2 openclaw@2026.4.23 openclaw@2026.4.15`）扩展精确的本地矩阵，或使用 `OPENCLAW_UPGRADE_SURVIVOR_SCENARIOS=reported-issues` 添加场景夹具；报告的问题集包括 `configured-plugin-installs`，用于验证配置的外部 OpenClaw 插件在升级期间是否自动安装，以及 `stale-source-plugin-shadow`，用于防止仅源代码插件的影子破坏启动。Package Acceptance 将这些暴露为 `published_upgrade_survivor_baseline`、`published_upgrade_survivor_baselines` 和 `published_upgrade_survivor_scenarios`，并在将精确的包规范传递给 Docker 车道之前解析元基线令牌（例如 `last-stable-4` 或 `all-since-2026.4.23`）。
- `pnpm test:docker:update-migration`：在重度清理的 `plugin-deps-cleanup` 场景中运行发布升级幸存者测试工具，默认从 `openclaw@2026.4.23` 开始。独立的 `Update Migration` 工作流使用 `baselines=all-since-2026.4.23` 扩展此通道，以便从 `.23` 开始的每个稳定发布包都更新到候选版本，并在完整发布 CI 之外验证已配置插件的依赖清理。
- `pnpm test:docker:plugins`：针对本地路径、`file:`、具有提升依赖项的 npm 注册表包、Git 移动引用、ClawHub 固件、市场更新以及 Claude-bundle 启用/检查运行安装/更新冒烟测试。

## 本地 PR 门控

对于本地 PR 合并/门控检查，请运行：

- `pnpm check:changed`
- `pnpm check`
- `pnpm check:test-types`
- `pnpm build`
- `pnpm test`
- `pnpm check:docs`

如果 `pnpm test` 在负载较高的主机上出现不稳定，请在将其视为回归之前重新运行一次，然后使用 `pnpm test <path/to/test>` 进行隔离。对于内存受限的主机，请使用：

- `OPENCLAW_VITEST_MAX_WORKERS=1 pnpm test`
- `OPENCLAW_VITEST_FS_MODULE_CACHE_PATH=/tmp/openclaw-vitest-cache pnpm test:changed`

## 模型延迟基准测试（本地密钥）

脚本：[`scripts/bench-model.ts`](https://github.com/openclaw/openclaw/blob/main/scripts/bench-model.ts)

用法：

- `pnpm tsx scripts/bench-model.ts --runs 10`
- 可选环境变量：`MINIMAX_API_KEY`、`MINIMAX_BASE_URL`、`MINIMAX_MODEL`、`ANTHROPIC_API_KEY`
- 默认提示词：“用一个单词回复：ok。不要标点符号或额外文本。”

上次运行（2025-12-31，20 次运行）：

- minimax 中位数 1279ms（最小值 1114，最大值 2431）
- opus 中位数 2454ms（最小值 1224，最大值 3170）

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
- `all`: 两种预设

输出包括 `sampleCount`、平均值、p50、p95、最小值/最大值、退出代码/信号分布，以及每个命令的最大 RSS 摘要。可选的 `--cpu-prof-dir` / `--heap-prof-dir` 会在每次运行时写入 V8 配置文件，以便计时和配置文件捕获使用相同的工具。

保存的输出约定：

- `pnpm test:startup:bench:smoke` 将目标冒烟测试构件写入 `.artifacts/cli-startup-bench-smoke.json`
- `pnpm test:startup:bench:save` 使用 `runs=5` 和 `warmup=1` 将完整套件构件写入 `.artifacts/cli-startup-bench-all.json`
- `pnpm test:startup:bench:update` 使用 `runs=5` 和 `warmup=1` 刷新 `test/fixtures/cli-startup-bench.json` 处检入的基准基线装置

检入的装置：

- `test/fixtures/cli-startup-bench.json`
- 使用 `pnpm test:startup:bench:update` 刷新
- 使用 `pnpm test:startup:bench:check` 将当前结果与装置进行比较

## Gateway(网关) 启动基准测试

脚本：[`scripts/bench-gateway-startup.ts`](https://github.com/openclaw/openclaw/blob/main/scripts/bench-gateway-startup.ts)

该基准测试默认使用 `dist/entry.js` 处构建的 CLI 入口；在使用 package-script 命令之前，请先运行 `pnpm build`。若要测量源码运行器，请传递 `--entry scripts/run-node.mjs`，并将这些结果与构建入口的基准线分开。

用法：

- `pnpm test:startup:gateway -- --runs 5 --warmup 1`
- `pnpm test:startup:gateway -- --case default --runs 10 --warmup 1`
- `pnpm test:startup:gateway -- --case skipChannels --case fiftyPlugins --runs 5`
- `node --import tsx scripts/bench-gateway-startup.ts --case default --runs 5 --output .artifacts/gateway-startup.json`
- `node --import tsx scripts/bench-gateway-startup.ts --case default --runs 3 --cpu-prof-dir .artifacts/gateway-startup-cpu`

用例 ID：

- `default`：正常的 Gateway(网关) 启动。
- `skipChannels`：跳过渠道启动的 Gateway(网关) 启动。
- `oneInternalHook`：配置了一个内部钩子。
- `allInternalHooks`：所有内部钩子。
- `fiftyPlugins`：50 个清单插件。
- `fiftyStartupLazyPlugins`：50 个启动延迟清单插件。

输出包括首次进程输出、`/healthz`、`/readyz`、HTTP 监听日志时间、Gateway(网关) 就绪日志时间、CPU 时间、CPU 核心比率、最大 RSS、堆、启动跟踪指标、事件循环延迟以及插件查找表详细指标。该脚本在子 Gateway(网关) 环境中启用了 `OPENCLAW_GATEWAY_STARTUP_TRACE=1`。

将 `/healthz` 理解为存活性：HTTP 服务器可以响应。将 `/readyz` 理解为可用就绪性：启动插件 sidecar、渠道和就绪关键的附加后工作已稳定。Gateway(网关) 启动钩子是异步调度的，不属于就绪保证的一部分。就绪日志时间是 Gateway(网关) 的内部就绪日志时间戳；它对于进程侧归因很有用，但不能替代外部的 `/readyz` 探测。

比较更改时，请使用 JSON 输出或 `--output`。仅当跟踪输出指向导入、编译或 CPU 密集型工作且无法仅通过阶段计时来解释时，才使用 `--cpu-prof-dir`。不要将 source-runner 的结果与 `dist/entry.js` 构建的结果进行比较，因为它们具有不同的基准。

## Gateway(网关) 重启基准测试

脚本：[`scripts/bench-gateway-restart.ts`](https://github.com/openclaw/openclaw/blob/main/scripts/bench-gateway-restart.ts)

重启基准测试仅支持 macOS 和 Linux。它使用 SIGUSR1 进行进程内重启，并在 Windows 上立即失败。

该基准测试默认使用位于 CLI`dist/entry.js` 的已构建 CLI 入口；在使用 package-script 命令之前请先运行 `pnpm build`。如果要改为测量 source runner，请传递 `--entry scripts/run-node.mjs`，并将这些结果与 built-entry 基准分开保存。

用法：

- `pnpm test:restart:gateway -- --case skipChannels --runs 1 --restarts 5`
- `pnpm test:restart:gateway -- --case default --runs 3 --restarts 3 --warmup 1`
- `pnpm test:restart:gateway -- --case skipChannelsAcpxProbe --case skipChannelsNoAcpxProbe --runs 1 --restarts 5`
- `node --import tsx scripts/bench-gateway-restart.ts --case fiftyPlugins --runs 1 --restarts 5 --output .artifacts/gateway-restart.json`
- `node --import tsx scripts/bench-gateway-restart.ts --json`

用例 ID：

- `skipChannels`：跳过通道的重启。
- `skipChannelsAcpxProbe`：跳过通道并启用 ACPX 启动探针的重启。
- `skipChannelsNoAcpxProbe`：跳过通道并禁用 ACPX 启动探针的重启。
- `default`：正常重启。
- `fiftyPlugins`：包含 50 个清单插件的重启。

输出包括下一个 `/healthz`、下一个 `/readyz`、停机时间、重启就绪时间、替换进程的 CPU、RSS、启动跟踪指标，以及信号处理、活动工作排空、关闭阶段、下一次启动、就绪时间和内存快照的重启跟踪指标。该脚本在子 Gateway(网关) 环境中启用了 `OPENCLAW_GATEWAY_STARTUP_TRACE=1` 和 `OPENCLAW_GATEWAY_RESTART_TRACE=1`Gateway(网关)。

当更改涉及重启信令、关闭处理程序、重启后启动、sidecar 关闭、服务切换或重启后就绪状态时，请使用此基准测试。在将 Gateway(网关) 机制与渠道启动隔离时，请从 `skipChannels`Gateway(网关) 开始。只有在用例解释了重启路径后，才使用 `default` 或插件繁多的场景。

追踪指标是归因提示，而非定论。应从多个样本、匹配的 owner 跨度、`/healthz` 和 `/readyz` 行为以及用户可见的重启协议来判断重启更改。

## 新手引导 E2E (Docker)

Docker 是可选的；这仅用于容器化的新手引导冒烟测试。

在干净的 Linux 容器中进行完整的冷启动流程：

```bash
scripts/e2e/onboard-docker.sh
```

此脚本通过伪 TTY 驱动交互式向导，验证 config/workspace/会话 文件，然后启动 Gateway(网关) 并运行 `openclaw health`。

## QR 导入冒烟测试 (Docker)

确保维护的 QR 运行时辅助程序在支持的 Docker Node 运行时（默认为 Node 24，兼容 Node 22）下加载：

```bash
pnpm test:docker:qr
```

## 相关

- [测试](/zh/help/testing)
- [实时测试](/zh/help/testing-live)
- [测试更新和插件](/zh/help/testing-updates-plugins)
