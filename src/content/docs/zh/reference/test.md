---
summary: "如何在本地运行测试 (vitest) 以及何时使用 force/coverage 模式"
read_when:
  - Running or fixing tests
title: "测试"
---

# 测试

- 完整的测试套件（套件、实时、Docker）：[Testing](/zh/help/testing)

- `pnpm test:force`：终止任何占用默认控制端口的残留网关进程，然后使用隔离的网关端口运行完整的 Vitest 测试套件，以防止服务器测试与正在运行的实例发生冲突。当之前的网关运行导致 18789 端口被占用时，请使用此方法。
- `pnpm test:coverage`：运行带有 V8 覆盖率（通过 `vitest.unit.config.ts`）的单元测试套件。全局阈值为 70% 的行/分支/函数/语句。覆盖率排除了重集成的入口点（CLI 线路、网关/telegram 桥接、webchat 静态服务器），以使目标专注于可进行单元测试的逻辑。
- `pnpm test:coverage:changed`：仅针对自 `origin/main` 以来更改的文件运行单元覆盖率。
- `pnpm test:changed`：当差异仅涉及可路由的源/测试文件时，将更改的 git 路径扩展为限定范围的 Vitest 通道。配置/设置的更改仍然回退到本机根项目运行，以便在需要时广泛地重新运行线路编辑。
- `pnpm test`：通过限定范围的 Vitest 通道路由显式文件/目录目标。现在，未针对的运行将按顺序执行 11 个分片配置（`vitest.full-core-unit-src.config.ts`、`vitest.full-core-unit-security.config.ts`、`vitest.full-core-unit-ui.config.ts`、`vitest.full-core-unit-support.config.ts`、`vitest.full-core-support-boundary.config.ts`、`vitest.full-core-contracts.config.ts`、`vitest.full-core-bundled.config.ts`、`vitest.full-core-runtime.config.ts`、`vitest.full-agentic.config.ts`、`vitest.full-auto-reply.config.ts`、`vitest.full-extensions.config.ts`），而不是一个巨大的根项目进程。
- 选定的 `plugin-sdk` 和 `commands` 测试文件现在通过专用的轻量级通道进行路由，这些通道仅保留 `test/setup.ts`，而将运行时繁重的用例保留在其现有通道上。
- 选定的 `plugin-sdk` 和 `commands` 辅助源文件也将 `pnpm test:changed` 映射到这些轻量级通道中的显式同级测试，因此对辅助文件的小型编辑可以避免重新运行繁重的运行时支持的套件。
- `auto-reply` 现在也拆分为三个专用配置（`core`、`top-level`、`reply`），以便回复工具不会主导较轻量级的顶级状态/令牌/辅助测试。
- 基础 Vitest 配置现在默认为 `pool: "threads"` 和 `isolate: false`，并且在所有仓库配置中启用了共享的非隔离运行器。
- `pnpm test:channels` 运行 `vitest.channels.config.ts`。
- `pnpm test:extensions` 运行 `vitest.extensions.config.ts`。
- `pnpm test:extensions`：运行扩展/插件套件。
- `pnpm test:perf:imports`：启用 Vitest 导入持续时间 + 导入细分报告，同时对显式文件/目录目标仍使用限定范围的通道路由。
- `pnpm test:perf:imports:changed`：相同的导入分析，但仅限于自 `origin/main` 以来更改的文件。
- `pnpm test:perf:changed:bench -- --ref <git-ref>` 针对同一已提交的 git diff，对路由更改模式路径与原生根项目运行进行基准测试。
- `pnpm test:perf:changed:bench -- --worktree` 在不先提交的情况下对当前工作树更改集进行基准测试。
- `pnpm test:perf:profile:main`：为 Vitest 主线程写入 CPU 配置文件（`.artifacts/vitest-main-profile`）。
- `pnpm test:perf:profile:runner`：为单元运行器写入 CPU + 堆配置文件（`.artifacts/vitest-runner-profile`）。
- Gateway(网关) 集成：通过 `OPENCLAW_TEST_INCLUDE_GATEWAY=1 pnpm test` 或 `pnpm test:gateway` 选择加入。
- `pnpm test:e2e`：运行 Gateway 端到端冒烟测试（多实例 WS/HTTP/node 配对）。默认在 `vitest.e2e.config.ts` 中使用自适应工作进程运行 `threads` + `isolate: false`；使用 `OPENCLAW_E2E_WORKERS=<n>` 进行调整，并设置 `OPENCLAW_E2E_VERBOSE=1` 以获取详细日志。
- `pnpm test:live`：运行提供商实时测试（minimax/zai）。需要 API 密钥和 `LIVE=1`（或特定于提供商的 `*_LIVE_TEST=1`）以取消跳过。
- `pnpm test:docker:openwebui`：启动 Docker 化的 OpenClaw + Open WebUI，通过 Open WebUI 登录，检查 `/api/models`，然后通过 `/api/chat/completions` 运行真实的代理聊天。需要可用的实时模型密钥（例如 `~/.profile` 中的 OpenAI），拉取外部 Open WebUI 镜像，并且不像常规单元/e2e 测试套件那样预期在 CI 中稳定。
- `pnpm test:docker:mcp-channels`：启动一个已播种的 Gateway(网关) 容器和第二个生成 `openclaw mcp serve` 的客户端容器，然后通过真实的 stdio 网桥验证路由对话发现、转录记录读取、附件元数据、实时事件队列行为、出站发送路由以及 Claude 风格的渠道 + 权限通知。Claude 通知断言直接读取原始 stdio MCP 帧，因此冒烟测试反映了网桥实际发出的内容。

## 本地 PR 门控

要运行本地 PR 合入/门控检查，请执行：

- `pnpm check`
- `pnpm build`
- `pnpm test`
- `pnpm check:docs`

如果 `pnpm test` 在负载较高的主机上出现不稳定，请在将其视为回归之前重新运行一次，然后使用 `pnpm test <path/to/test>` 进行隔离。对于内存受限的主机，请使用：

- `OPENCLAW_VITEST_MAX_WORKERS=1 pnpm test`
- `OPENCLAW_VITEST_FS_MODULE_CACHE_PATH=/tmp/openclaw-vitest-cache pnpm test:changed`

## 模型延迟基准测试（本地密钥）

脚本：[`scripts/bench-model.ts`](https://github.com/openclaw/openclaw/blob/main/scripts/bench-model.ts)

用法：

- `source ~/.profile && pnpm tsx scripts/bench-model.ts --runs 10`
- 可选环境变量：`MINIMAX_API_KEY`、`MINIMAX_BASE_URL`、`MINIMAX_MODEL`、`ANTHROPIC_API_KEY`
- 默认提示词：“用一个词回复：ok。不要标点符号或多余文本。”

上次运行（2025-12-31，运行 20 次）：

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
- `all`：两种预设

输出包括每个命令的 `sampleCount`、平均值、p50、p95、最小值/最大值、退出代码/信号分布以及最大 RSS 摘要。可选的 `--cpu-prof-dir` / `--heap-prof-dir` 会在每次运行时写入 V8 配置文件，以便计时和配置文件捕获使用相同的工具。

已保存输出的约定：

- `pnpm test:startup:bench:smoke` 将目标冒烟测试产物写入 `.artifacts/cli-startup-bench-smoke.json`
- `pnpm test:startup:bench:save` 使用 `runs=5` 和 `warmup=1` 将完整套件产物写入 `.artifacts/cli-startup-bench-all.json`
- `pnpm test:startup:bench:update` 使用 `runs=5` 和 `warmup=1` 刷新 `test/fixtures/cli-startup-bench.json` 处签入的基准夹具

签入的夹具：

- `test/fixtures/cli-startup-bench.json`
- 使用 `pnpm test:startup:bench:update` 刷新
- 使用 `pnpm test:startup:bench:check` 将当前结果与夹具进行比较

## 新手引导 E2E (Docker)

Docker 是可选的；这仅用于容器化的新手引导冒烟测试。

在干净的 Linux 容器中执行完整的冷启动流程：

```bash
scripts/e2e/onboard-docker.sh
```

此脚本通过伪终端驱动交互式向导，验证配置/工作区/会话文件，然后启动网关并运行 `openclaw health`。

## 二维码导入冒烟测试 (Docker)

确保 `qrcode-terminal` 在支持的 Docker Node 运行时（默认为 Node 24，兼容 Node 22）下加载：

```bash
pnpm test:docker:qr
```
