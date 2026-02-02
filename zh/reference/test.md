> [!NOTE]
> 本页正在翻译中。

---
summary: "如何在本地运行测试（vitest）以及何时使用 force/coverage 模式"
read_when:
  - 运行或修复测试
---
# Tests

- 完整测试工具包（suites、live、Docker）：[Testing](/zh/testing)

- `pnpm test:force`：终止占用默认控制端口的残留 gateway 进程，然后用独立 gateway 端口运行完整 Vitest 套件，避免与正在运行的实例冲突。当上次 gateway 占用 18789 端口时使用。
- `pnpm test:coverage`：运行带 V8 覆盖率的 Vitest。全局阈值为 70%（lines/branches/functions/statements）。覆盖率排除集成较重的入口（CLI wiring、gateway/telegram bridges、webchat 静态服务器），以聚焦于单元可测逻辑。
- `pnpm test:e2e`：运行 gateway 端到端冒烟测试（多实例 WS/HTTP/node 配对）。
- `pnpm test:live`：运行 provider live 测试（minimax/zai）。需要 API key 且 `LIVE=1`（或 provider 特定 `*_LIVE_TEST=1`）以取消跳过。

## 模型延迟基准（本地 key）

脚本：[`scripts/bench-model.ts`](https://github.com/openclaw/openclaw/blob/main/scripts/bench-model.ts)

用法：
- `source ~/.profile && pnpm tsx scripts/bench-model.ts --runs 10`
- 可选环境变量：`MINIMAX_API_KEY`、`MINIMAX_BASE_URL`、`MINIMAX_MODEL`、`ANTHROPIC_API_KEY`
- 默认提示词：“Reply with a single word: ok. No punctuation or extra text.”

上次运行（2025-12-31，20 次）：
- minimax 中位数 1279ms（最小 1114，最大 2431）
- opus 中位数 2454ms（最小 1224，最大 3170）

## Onboarding E2E（Docker）

Docker 可选；仅用于容器化 onboarding 冒烟测试。

在干净 Linux 容器中完整冷启动流程：

```bash
scripts/e2e/onboard-docker.sh
```

该脚本通过伪 TTY 驱动交互向导，验证配置/工作区/会话文件，然后启动 gateway 并运行 `openclaw health`。

## QR 导入冒烟（Docker）

确保 `qrcode-terminal` 在 Docker 的 Node 22+ 下可加载：

```bash
pnpm test:docker:qr
```
