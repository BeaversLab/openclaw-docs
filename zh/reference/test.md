---
summary: "如何在本地运行测试 (vitest) 以及何时使用 force/coverage 模式"
read_when:
  - Running or fixing tests
title: "测试"
---

# 测试

- 完整测试工具包（套件、实时、Docker）：[测试](/en/help/testing)

- `pnpm test:force`：终止任何占用默认控制端口的残留网关进程，然后使用隔离的网关端口运行完整的 Vitest 测试套件，以防止服务器测试与正在运行的实例发生冲突。当之前的网关运行导致 18789 端口被占用时，请使用此方法。
- `pnpm test:coverage`：运行带有 V8 覆盖率（通过 `vitest.unit.config.ts`）的单元测试套件。全局阈值为 70% 的行/分支/函数/语句。覆盖率排除了重集成的入口点（CLI 线路、网关/telegram 桥接、webchat 静态服务器），以使目标专注于可进行单元测试的逻辑。
- 在 Node 24+ 上运行 `pnpm test`：OpenClaw 会自动禁用 Vitest `vmForks` 并使用 `forks` 来避免 `ERR_VM_MODULE_LINK_FAILURE` / `module is already linked`。你可以通过 `OPENCLAW_TEST_VM_FORKS=0|1` 强制指定行为。
- `pnpm test`：默认运行快速的核心单元测试通道，以便快速获得本地反馈。
- `pnpm test:channels`：运行重度涉及通道的测试套件。
- `pnpm test:extensions`：运行扩展/插件的测试套件。
- 网关集成：通过 `OPENCLAW_TEST_INCLUDE_GATEWAY=1 pnpm test` 或 `pnpm test:gateway` 选择加入。
- `pnpm test:e2e`：运行网关端到端冒烟测试（多实例 WS/HTTP/node 配对）。默认为 `vmForks` + `vitest.e2e.config.ts` 中的自适应工作线程；可以通过 `OPENCLAW_E2E_WORKERS=<n>` 进行调整，并设置 `OPENCLAW_E2E_VERBOSE=1` 以获取详细日志。
- `pnpm test:live`：运行提供商实时测试 (minimax/zai)。需要 API 密钥和 `LIVE=1`（或特定提供商的 `*_LIVE_TEST=1`）以取消跳过。

## 本地 PR 门控

对于本地 PR 落地/门控检查，请运行：

- `pnpm check`
- `pnpm build`
- `pnpm test`
- `pnpm check:docs`

如果 `pnpm test` 在负载较高的主机上出现不稳定，在将其视为回归之前请重新运行一次，然后使用 `pnpm vitest run <path/to/test>` 进行隔离。对于内存受限的主机，请使用：

- `OPENCLAW_TEST_PROFILE=low OPENCLAW_TEST_SERIAL_GATEWAY=1 pnpm test`

## 模型延迟基准测试（本地密钥）

脚本：[`scripts/bench-model.ts`](https://github.com/openclaw/openclaw/blob/main/scripts/bench-model.ts)

用法：

- `source ~/.profile && pnpm tsx scripts/bench-model.ts --runs 10`
- 可选环境变量：`MINIMAX_API_KEY`、`MINIMAX_BASE_URL`、`MINIMAX_MODEL`、`ANTHROPIC_API_KEY`
- 默认提示词：“请用一个词回复：ok。不要标点符号或多余文本。”

上次运行（2025-12-31，20 次运行）：

- minimax 中位数 1279ms（最小 1114，最大 2431）
- opus 中位数 2454ms（最小 1224，最大 3170）

## CLI 启动基准测试

脚本：[`scripts/bench-cli-startup.ts`](https://github.com/openclaw/openclaw/blob/main/scripts/bench-cli-startup.ts)

用法：

- `pnpm tsx scripts/bench-cli-startup.ts`
- `pnpm tsx scripts/bench-cli-startup.ts --runs 12`
- `pnpm tsx scripts/bench-cli-startup.ts --entry dist/entry.js --timeout-ms 45000`

此基准测试针对以下命令：

- `--version`
- `--help`
- `health --json`
- `status --json`
- `status`

输出包括每个命令的平均值、p50、p95、最小/最大值以及退出码/信号分布。

## 入职 E2E 测试 (Docker)

Docker 是可选的；这仅用于容器化的入门冒烟测试。

在干净的 Linux 容器中进行完整的冷启动流程：

```bash
scripts/e2e/onboard-docker.sh
```

此脚本通过伪终端驱动交互式向导，验证配置/工作区/会话文件，然后启动网关并运行 `openclaw health`。

## 二维码导入冒烟测试 (Docker)

确保 `qrcode-terminal` 在受支持的 Docker Node 运行时下加载（默认为 Node 24，兼容 Node 22）：

```bash
pnpm test:docker:qr
```

import zh from '/components/footer/zh.mdx';

<zh />
