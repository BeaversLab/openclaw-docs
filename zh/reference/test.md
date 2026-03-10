---
summary: "如何在本地运行测试（vitest）以及何时使用 force/coverage 模式"
read_when:
  - "Running or fixing tests"
title: "Tests"
---

# 测试

- 完整测试套件（suites、live、Docker）：[Testing](/zh/testing)

- `pnpm test:force`：终止任何占用默认控制端口的残留 Gateway 进程，然后使用隔离的 Gateway 端口运行完整的 Vitest 套件，以避免服务器测试与运行中的实例冲突。当先前的 Gateway 运行导致端口 18789 被占用时使用此命令。
- `pnpm test:coverage`：使用 V8 覆盖率运行 Vitest。全局阈值为 70% 的行/分支/函数/语句。覆盖率排除了重度集成的入口点（CLI 连接、gateway/telegram 网桥、webchat 静态服务器），以保持目标专注于可单元测试的逻辑。
- `pnpm test:e2e`：运行 Gateway 端到端冒烟测试（多实例 WS/HTTP/node 配对）。
- `pnpm test:live`：运行 provider live 测试（minimax/zai）。需要 API 密钥和 `LIVE=1`（或 provider 特定的 `*_LIVE_TEST=1`）来取消跳过。

## 模型延迟基准测试（本地密钥）

脚本：[`scripts/bench-model.ts`](https://github.com/openclaw/openclaw/blob/main/scripts/bench-model.ts)

用法：

- `source ~/.profile && pnpm tsx scripts/bench-model.ts --runs 10`
- 可选环境变量：`MINIMAX_API_KEY`、`MINIMAX_BASE_URL`、`MINIMAX_MODEL`、`ANTHROPIC_API_KEY`
- 默认提示："Reply with a single word: ok. No punctuation or extra text."

上次运行（2025-12-31，20 次运行）：

- minimax 中位数 1279ms（最小 1114，最大 2431）
- opus 中位数 2454ms（最小 1224，最大 3170）

## 入职端到端测试（Docker）

Docker 是可选的；仅在需要容器化入职冒烟测试时才需要。

在干净的 Linux 容器中进行完整的冷启动流程：

```bash
scripts/e2e/onboard-docker.sh
```

此脚本通过伪 TTY 驱动交互式向导，验证配置/工作区/会话文件，然后启动 Gateway 并运行 `openclaw health`。

## QR 导入冒烟测试（Docker）

确保 `qrcode-terminal` 在 Docker 中的 Node 22+ 下加载：

```bash
pnpm test:docker:qr
```

