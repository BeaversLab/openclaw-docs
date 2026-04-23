---
summary: "如何在本地运行测试 (vitest) 以及何时使用 force/coverage 模式"
read_when:
  - Running or fixing tests
title: "测试"
---

# 测试

- 完整的测试工具包（套件、实时、Docker）：[Testing](/zh/help/testing)

- `pnpm test:force`：终止任何占用默认控制端口的残留网关进程，然后使用隔离的网关端口运行完整的 Vitest 测试套件，以防止服务器测试与正在运行的实例发生冲突。当之前的网关运行导致 18789 端口被占用时，请使用此方法。
- `pnpm test:coverage`：使用 V8 覆盖率运行单元套件（通过 `vitest.unit.config.ts`）。这是一个已加载文件的单元覆盖率检查，而非整个仓库所有文件的覆盖率。阈值为 70% 的行/函数/语句和 55% 的分支。由于 `coverage.all` 为 false，该检查会测量单元覆盖率套件加载的文件，而不是将每个分叉通道的源文件视为未覆盖。
- `pnpm test:coverage:changed`：仅对自 `origin/main` 以来更改的文件运行单元覆盖率。
- `pnpm test:changed`：当差异仅涉及可路由的源/测试文件时，将更改的 git 路径扩展为限定范围的 Vitest 通道。配置/设置的更改仍会回退到本机根项目运行，以便在需要时广泛重新运行连接编辑。
- `pnpm changed:lanes`：显示针对 `origin/main` 的差异触发的架构通道。
- `pnpm check:changed`：针对 `origin/main` 的差异运行智能变更检查。它会使用核心测试通道运行核心工作，使用扩展测试通道运行扩展工作，使用测试类型检查/测试仅运行仅测试工作，并将公共 Plugin SDK 或插件合约的更改扩展到扩展验证。
- `pnpm test`：通过限定范围的 Vitest 通道路由显式文件/目录目标。无目标的运行使用固定的分片组并扩展到本地并行执行的叶子配置；扩展组总是扩展到每个扩展的分片配置，而不是一个巨大的根项目进程。
- 完整和扩展分片运行会更新 `.artifacts/vitest-shard-timings.json` 中的本地计时数据；后续运行会使用这些计时来平衡慢速和快速分片。设置 `OPENCLAW_TEST_PROJECTS_TIMINGS=0` 以忽略本地计时产物。
- 选定的 `plugin-sdk` 和 `commands` 测试文件现在通过专用轻量级通道路由，仅保留 `test/setup.ts`，而将运行时繁重的用例保留在其现有通道上。
- 选定的 `plugin-sdk` 和 `commands` 辅助源文件也将 `pnpm test:changed` 映射到那些轻量级通道中的显式同级测试，因此对辅助文件的微小修改可以避免重新运行繁重的运行时支持套件。
- `auto-reply` 现在也拆分为三个专用配置（`core`、`top-level`、`reply`），因此回复测试工具不会主导较轻的顶层状态/令牌/辅助测试。
- 基础 Vitest 配置现在默认为 `pool: "threads"` 和 `isolate: false`，并在所有仓库配置中启用了共享的非隔离运行程序。
- `pnpm test:channels` 运行 `vitest.channels.config.ts`。
- `pnpm test:extensions` 和 `pnpm test extensions` 运行所有扩展/插件分片。繁重的渠道扩展和 OpenAI 作为专用分片运行；其他扩展组保持批处理。使用 `pnpm test extensions/<id>` 进行单个捆绑插件通道的测试。
- `pnpm test:perf:imports`：启用 Vitest 导入持续时间和导入细分报告，同时仍对显式文件/目录目标使用限定范围的通道路由。
- `pnpm test:perf:imports:changed`：相同的导入分析，但仅针对自 `origin/main` 以来更改的文件。
- `pnpm test:perf:changed:bench -- --ref <git-ref>` 针对同一已提交的 git diff，对路由的变更模式路径与原生根项目运行进行基准测试。
- `pnpm test:perf:changed:bench -- --worktree` 对当前工作树变更集进行基准测试，而无需先提交。
- `pnpm test:perf:profile:main`：为 Vitest 主线程（`.artifacts/vitest-main-profile`）编写 CPU 性能分析文件。
- `pnpm test:perf:profile:runner`：为单元运行程序（`.artifacts/vitest-runner-profile`）编写 CPU 和堆性能分析文件。
- Gateway(网关) 集成：通过 `OPENCLAW_TEST_INCLUDE_GATEWAY=1 pnpm test` 或 `pnpm test:gateway` 选择加入。
- `pnpm test:e2e`：运行 Gateway 端到端冒烟测试（多实例 WS/HTTP/node 配对）。默认使用 `threads` + `isolate: false` 并在 `vitest.e2e.config.ts` 中使用自适应工作线程；使用 `OPENCLAW_E2E_WORKERS=<n>` 进行调整，并设置 `OPENCLAW_E2E_VERBOSE=1` 以获取详细日志。
- `pnpm test:live`：运行提供商实时测试（minimax/zai）。需要 API 密钥和 `LIVE=1`（或特定于提供商的 `*_LIVE_TEST=1`）以取消跳过。
- `pnpm test:docker:openwebui`：启动 Docker 化的 OpenClaw + Open WebUI，通过 Open WebUI 登录，检查 `/api/models`，然后通过 `/api/chat/completions` 运行真实的代理聊天。需要可用的实时模型密钥（例如 OpenAI 在 `~/.profile` 中），拉取外部 Open WebUI 镜像，并且不像正常的单元/e2e 套件那样预期在 CI 中保持稳定。
- `pnpm test:docker:mcp-channels`：启动一个已设定种子的 Gateway(网关) 容器和第二个生成 `openclaw mcp serve` 的客户端容器，然后通过真实的 stdio 网桥验证路由对话发现、转录读取、附件元数据、实时事件队列行为、出站发送路由以及 Claude 风格的渠道 + 权限通知。Claude 通知断言直接读取原始 stdio MCP 帧，因此冒烟测试反映了网桥实际发射的内容。

## 本地 PR 门禁

对于本地 PR 落地/门禁检查，请运行：

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
- 可选的环境变量：`MINIMAX_API_KEY`、`MINIMAX_BASE_URL`、`MINIMAX_MODEL`、`ANTHROPIC_API_KEY`
- 默认提示：“请回复一个单词：ok。不要标点符号或额外文本。”

上次运行（2025-12-31，20次运行）：

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
- `pnpm tsx scripts/bench-cli-startup.ts --entry openclaw.mjs --entry-secondary dist/entry.js --preset all`
- `pnpm tsx scripts/bench-cli-startup.ts --preset all --output .artifacts/cli-startup-bench-all.json`
- `pnpm tsx scripts/bench-cli-startup.ts --preset real --case gatewayStatusJson --output .artifacts/cli-startup-bench-smoke.json`
- `pnpm tsx scripts/bench-cli-startup.ts --preset real --cpu-prof-dir .artifacts/cli-cpu`
- `pnpm tsx scripts/bench-cli-startup.ts --json`

预设：

- `startup`：`--version`、`--help`、`health`、`health --json`、`status --json`、`status`
- `real`：`health`、`status`、`status --json`、`sessions`、`sessions --json`、`agents list --json`、`gateway status`、`gateway status --json`、`gateway health --json`、`config get gateway.port`
- `all`：两个预设

输出包括每个命令的 `sampleCount`、平均值、p50、p95、最小/最大值、退出代码/信号分布以及最大 RSS 摘要。可选的 `--cpu-prof-dir` / `--heap-prof-dir` 会为每次运行写入 V8 配置文件，以便计时和配置文件捕获使用相同的测试工具。

保存的输出约定：

- `pnpm test:startup:bench:smoke` 将目标冒烟测试产物写入 `.artifacts/cli-startup-bench-smoke.json`
- `pnpm test:startup:bench:save` 使用 `runs=5` 和 `warmup=1` 在 `.artifacts/cli-startup-bench-all.json` 写入完整测试套件产物
- `pnpm test:startup:bench:update` 使用 `runs=5` 和 `warmup=1` 刷新 `test/fixtures/cli-startup-bench.json` 处的已提交基准夹具

已提交的夹具：

- `test/fixtures/cli-startup-bench.json`
- 使用 `pnpm test:startup:bench:update` 刷新
- 使用 `pnpm test:startup:bench:check` 将当前结果与夹具进行比较

## 新手引导 E2E (Docker)

Docker 是可选的；仅在容器化的新手引导冒烟测试时需要。

在干净的 Linux 容器中进行完整的冷启动流程：

```bash
scripts/e2e/onboard-docker.sh
```

该脚本通过伪终端驱动交互式向导，验证 config/workspace/会话文件，然后启动网关并运行 `openclaw health`。

## QR 导入冒烟测试 (Docker)

确保 `qrcode-terminal` 在支持的 Docker Node 运行时下加载（默认 Node 24，兼容 Node 22）：

```bash
pnpm test:docker:qr
```
