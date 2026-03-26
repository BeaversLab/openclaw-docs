---
summary: "如何在本地运行测试 (vitest) 以及何时使用 force/coverage 模式"
read_when:
  - Running or fixing tests
title: "测试"
---

# 测试

- 完整的测试套件（套件、实时测试、Docker）：[Testing](/zh/help/testing)

- `pnpm test:force`：终止任何占用默认控制端口的残留网关进程，然后使用隔离的网关端口运行完整的 Vitest 测试套件，以防止服务器测试与正在运行的实例发生冲突。当之前的网关运行导致 18789 端口被占用时，请使用此方法。
- `pnpm test:coverage`：运行带有 V8 覆盖率（通过 `vitest.unit.config.ts`）的单元测试套件。全局阈值为 70% 的行/分支/函数/语句。覆盖率排除了重集成的入口点（CLI 线路、网关/telegram 桥接、webchat 静态服务器），以使目标专注于可进行单元测试的逻辑。
- 在 Node 22、23 和 24 上，`pnpm test` 默认使用 Vitest `vmForks` 以实现更快的启动。Node 25+ 在重新验证之前回退到 `forks`。您可以使用 `OPENCLAW_TEST_VM_FORKS=0|1` 强制执行特定行为。
- `pnpm test`：运行完整的包装器。它仅在 git 中保留一个小的行为覆盖清单，然后使用检入的时间快照将测量到的最重的单元文件剥离到专用通道中。
- `pnpm test:channels`：运行重度依赖渠道的测试套件。
- `pnpm test:extensions`：运行扩展/插件测试套件。
- `pnpm test:perf:update-timings`：刷新由 `scripts/test-parallel.mjs` 使用的检入慢文件时间快照。
- Gateway(网关) 集成：通过 `OPENCLAW_TEST_INCLUDE_GATEWAY=1 pnpm test` 或 `pnpm test:gateway` 选择加入。
- `pnpm test:e2e`：运行 Gateway(网关) 端到端冒烟测试（多实例 WS/HTTP/node 配对）。默认为 `vmForks` + `vitest.e2e.config.ts` 中的自适应工作线程；使用 `OPENCLAW_E2E_WORKERS=<n>` 进行调整，并设置 `OPENCLAW_E2E_VERBOSE=1` 以获取详细日志。
- `pnpm test:live`：运行提供商实时测试（minimax/zai）。需要 API 密钥和 `LIVE=1`（或特定于提供商的 `*_LIVE_TEST=1`）来取消跳过。

## 本地 PR 门控

对于本地 PR 落地/门控检查，请运行：

- `pnpm check`
- `pnpm build`
- `pnpm test`
- `pnpm check:docs`

如果 `pnpm test` 在负载较重的主机上出现不稳定，请在将其视为回归之前重新运行一次，然后使用 `pnpm vitest run <path/to/test>` 进行隔离。对于内存受限的主机，请使用：

- `OPENCLAW_TEST_PROFILE=low OPENCLAW_TEST_SERIAL_GATEWAY=1 pnpm test`

## 模型延迟基准测试（本地密钥）

脚本：[`scripts/bench-model.ts`](https://github.com/openclaw/openclaw/blob/main/scripts/bench-model.ts)

用法：

- `source ~/.profile && pnpm tsx scripts/bench-model.ts --runs 10`
- 可选环境变量：`MINIMAX_API_KEY`、`MINIMAX_BASE_URL`、`MINIMAX_MODEL`、`ANTHROPIC_API_KEY`
- 默认提示：“用一个词回复：ok。不要标点符号或额外文本。”

上次运行（2025-12-31，20 次运行）：

- minimax 中位数 1279ms（最小 1114，最大 2431）
- opus 中位数 2454ms（最小 1224，最大 3170）

## CLI 启动基准测试

脚本：[`scripts/bench-cli-startup.ts`](https://github.com/openclaw/openclaw/blob/main/scripts/bench-cli-startup.ts)

用法：

- `pnpm tsx scripts/bench-cli-startup.ts`
- `pnpm tsx scripts/bench-cli-startup.ts --runs 12`
- `pnpm tsx scripts/bench-cli-startup.ts --entry dist/entry.js --timeout-ms 45000`

这会对以下命令进行基准测试：

- `--version`
- `--help`
- `health --json`
- `status --json`
- `status`

输出包括每个命令的平均值、p50、p95、最小值/最大值以及退出代码/信号分布。

## 新手引导 E2E (Docker)

Docker 是可选的；仅容器化新手引导冒烟测试需要。

在干净的 Linux 容器中完整的冷启动流程：

```bash
scripts/e2e/onboard-docker.sh
```

此脚本通过伪终端驱动交互式向导，验证配置/工作区/会话文件，然后启动网关并运行 `openclaw health`。

## QR 导入冒烟测试 (Docker)

确保 `qrcode-terminal` 在支持的 Docker Node 运行时（默认 Node 24，兼容 Node 22）下加载：

```bash
pnpm test:docker:qr
```

import zh from "/components/footer/zh.mdx";

<zh />
