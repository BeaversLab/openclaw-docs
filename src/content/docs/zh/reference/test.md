---
summary: "如何在本地运行测试 (vitest) 以及何时使用 force/coverage 模式"
read_when:
  - Running or fixing tests
title: "测试"
---

# 测试

- 完整测试套件（套件、实时、Docker）：[测试](/en/help/testing)

- `pnpm test:force`：终止任何占用默认控制端口的残留网关进程，然后使用隔离的网关端口运行完整的 Vitest 测试套件，以防止服务器测试与正在运行的实例发生冲突。当之前的网关运行导致 18789 端口被占用时，请使用此方法。
- `pnpm test:coverage`：运行带有 V8 覆盖率（通过 `vitest.unit.config.ts`）的单元测试套件。全局阈值为 70% 的行/分支/函数/语句。覆盖率排除了重集成的入口点（CLI 线路、网关/telegram 桥接、webchat 静态服务器），以使目标专注于可进行单元测试的逻辑。
- `pnpm test:coverage:changed`：仅针对自 `origin/main` 以来更改的文件运行单元覆盖率。
- `pnpm test:changed`：使用 `--changed origin/main` 运行包装器。基础 Vitest 配置将包装器清单/配置文件视为 `forceRerunTriggers`，因此调度程序更改在需要时仍会广泛重新运行。
- `pnpm test`：运行完整的包装器。它在 git 中仅保留一个小的行为覆盖清单，然后使用签入的计时快照将测量的最重单元文件剥离到专用通道中。
- 单元文件在包装器中默认为 `threads`；将仅限 Fork 的例外情况记录在 `test/fixtures/test-parallel.behavior.json` 中。
- `pnpm test:channels` 现在默认通过 `vitest.channels.config.ts` 使用 `threads`；2026 年 3 月 22 日的直接完整套件控制运行干净地通过了，没有特定渠道的 Fork 例外。
- `pnpm test:extensions` 通过包装器运行，并在 `test/fixtures/test-parallel.behavior.json` 中保留记录的扩展仅限 Fork 例外；共享扩展通道仍默认为 `threads`。
- `pnpm test:extensions`：运行扩展/插件套件。
- `pnpm test:perf:imports`：为包装器启用 Vitest 导入持续时间 + 导入细分报告。
- `pnpm test:perf:imports:changed`：相同的导入分析，但仅针对自 `origin/main` 以来更改的文件。
- `pnpm test:perf:profile:main`：为 Vitest 主线程 (`.artifacts/vitest-main-profile`) 编写 CPU 配置文件。
- `pnpm test:perf:profile:runner`：为单元运行器 (`.artifacts/vitest-runner-profile`) 编写 CPU + 堆配置文件。
- `pnpm test:perf:update-timings`：刷新 `scripts/test-parallel.mjs` 使用的签入慢文件计时快照。
- Gateway(网关) 集成：通过 `OPENCLAW_TEST_INCLUDE_GATEWAY=1 pnpm test` 或 `pnpm test:gateway` 选择加入。
- `pnpm test:e2e`：运行网关端到端冒烟测试（多实例 WS/HTTP/node 配对）。默认为 `forks` + `vitest.e2e.config.ts` 中的自适应工作线程；使用 `OPENCLAW_E2E_WORKERS=<n>` 进行调整，并设置 `OPENCLAW_E2E_VERBOSE=1` 以获取详细日志。
- `pnpm test:live`：运行提供商实时测试（minimax/zai）。需要 API 密钥和 `LIVE=1`（或特定于提供商的 `*_LIVE_TEST=1`）以取消跳过。
- `pnpm test:docker:openwebui`：启动 Docker 化的 OpenClaw + Open WebUI，通过 Open WebUI 登录，检查 `/api/models`，然后通过 `/api/chat/completions` 运行真实的代理聊天。需要可用的实时模型密钥（例如 `~/.profile` 中的 OpenAI），拉取外部 Open WebUI 镜像，并且不像普通的单元/e2e 套件那样预期在 CI 中稳定。
- `pnpm test:docker:mcp-channels`：启动一个已设置种子的 Gateway(网关) 容器和第二个生成 `openclaw mcp serve` 的客户端容器，然后通过真实的 stdio 桥接验证路由对话发现、转录读取、附件元数据、实时事件队列行为、出站发送路由以及 Claude 风格的渠道 + 权限通知。Claude 通知断言直接读取原始 stdio MCP 帧，因此冒烟测试反映了桥接实际发出的内容。

## 本地 PR 检查门

对于本地 PR 合入/检查门检查，请运行：

- `pnpm check`
- `pnpm build`
- `pnpm test`
- `pnpm check:docs`

如果 `pnpm test` 在负载较高的主机上出现不稳定结果，请在将其视为回归之前重新运行一次，然后使用 `pnpm vitest run <path/to/test>` 进行隔离。对于内存受限的主机，请使用：

- `OPENCLAW_TEST_PROFILE=low OPENCLAW_TEST_SERIAL_GATEWAY=1 pnpm test`
- `OPENCLAW_VITEST_FS_MODULE_CACHE_PATH=/tmp/openclaw-vitest-cache pnpm test:changed`

## 模型延迟基准测试（本地密钥）

脚本：[`scripts/bench-model.ts`](https://github.com/openclaw/openclaw/blob/main/scripts/bench-model.ts)

用法：

- `source ~/.profile && pnpm tsx scripts/bench-model.ts --runs 10`
- 可选环境变量：`MINIMAX_API_KEY`、`MINIMAX_BASE_URL`、`MINIMAX_MODEL`、`ANTHROPIC_API_KEY`
- 默认提示词：“用一个单词回复：ok。不要标点符号或多余文本。”

最近一次运行（2025-12-31，20 次）：

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

输出包含每个命令的 `sampleCount`、平均值、p50、p95、最小值/最大值、退出码/信号分布以及最大 RSS 摘要。可选的 `--cpu-prof-dir` / `--heap-prof-dir` 会在每次运行时写入 V8 配置文件，以便计时和配置文件捕获使用相同的工具。

保存的输出约定：

- `pnpm test:startup:bench:smoke` 在 `.artifacts/cli-startup-bench-smoke.json` 处写入目标冒烟测试构件
- `pnpm test:startup:bench:save` 使用 `runs=5` 和 `warmup=1` 在 `.artifacts/cli-startup-bench-all.json` 处写入完整套件构件
- `pnpm test:startup:bench:update` 使用 `runs=5` 和 `warmup=1` 刷新 `test/fixtures/cli-startup-bench.json` 处的已检入基线固定装置

检入的装置：

- `test/fixtures/cli-startup-bench.json`
- 使用 `pnpm test:startup:bench:update` 刷新
- 使用 `pnpm test:startup:bench:check` 将当前结果与装置进行比较

## 新手引导 E2E (Docker)

Docker 是可选的；这仅用于容器化的新手引导冒烟测试。

在干净的 Linux 容器中完整的冷启动流程：

```bash
scripts/e2e/onboard-docker.sh
```

该脚本通过伪终端驱动交互式向导，验证配置/工作区/会话文件，然后启动网关并运行 `openclaw health`。

## 二维码导入冒烟测试 (Docker)

确保 `qrcode-terminal` 在支持的 Docker Node 运行时下加载（Node 24 默认，Node 22 兼容）：

```bash
pnpm test:docker:qr
```
