---
summary: "调试工具：监视模式、原始模型流以及追踪推理泄漏"
read_when:
  - You need to inspect raw model output for reasoning leakage
  - You want to run the Gateway in watch mode while iterating
  - You need a repeatable debugging workflow
title: "调试"
---

# 调试

本页面涵盖流式输出的调试辅助工具，特别是在提供商将推理内容混合到正常文本中时。

## 运行时调试覆盖

在聊天中使用 `/debug` 来设置**仅运行时**的配置覆盖（内存中，非磁盘）。
`/debug` 默认禁用；可通过 `commands.debug: true` 启用。
当您需要切换晦涩的设置而无需编辑 `openclaw.json` 时，这非常有用。

示例：

```
/debug show
/debug set messages.responsePrefix="[openclaw]"
/debug unset messages.responsePrefix
/debug reset
```

`/debug reset` 清除所有覆盖并恢复到磁盘上的配置。

## Gateway 网关 监视模式

为了快速迭代，请在文件监视器下运行网关：

```bash
pnpm gateway:watch --force
```

这映射到：

```bash
tsx watch src/entry.ts gateway --force
```

在 `gateway:watch` 之后添加任何 gateway CLI 标志，它们将在每次重启时传递下去。

## 开发配置文件 + 开发网关 (--dev)

使用开发配置文件来隔离状态并启动一个安全、可丢弃的设置以进行
调试。有**两个** `--dev` 标志：

- **全局 `--dev` (profile):** 将状态隔离在 `~/.openclaw-dev` 下，
  并将 gateway 端口默认为 `19001`（派生端口随之偏移）。
- **`gateway --dev`：告诉 Gateway(网关) 在缺失时自动创建默认配置 +
  工作区**（并跳过 BOOTSTRAP.md）。

推荐流程 (dev profile + dev bootstrap):

```bash
pnpm gateway:dev
OPENCLAW_PROFILE=dev openclaw tui
```

如果你还没有全局安装，请通过 `pnpm openclaw ...` 运行 CLI。

这样做的作用：

1. **Profile 隔离** (全局 `--dev`)
   - `OPENCLAW_PROFILE=dev`
   - `OPENCLAW_STATE_DIR=~/.openclaw-dev`
   - `OPENCLAW_CONFIG_PATH=~/.openclaw-dev/openclaw.json`
   - `OPENCLAW_GATEWAY_PORT=19001` (浏览器/canvas 相应偏移)

2. **Dev bootstrap** (`gateway --dev`)
   - 如果缺失，则写入最小配置 (`gateway.mode=local`，绑定 loopback)。
   - 将 `agent.workspace` 设置为 dev 工作区。
   - 设置 `agent.skipBootstrap=true` (无 BOOTSTRAP.md)。
   - 如果缺失，则播种工作区文件：
     `AGENTS.md`, `SOUL.md`, `TOOLS.md`, `IDENTITY.md`, `USER.md`, `HEARTBEAT.md`.
   - 默认身份：**C3‑PO** (protocol droid)。
   - 在开发模式下跳过渠道提供商 (`OPENCLAW_SKIP_CHANNELS=1`)。

重置流程 (全新开始):

```bash
pnpm gateway:dev:reset
```

注意：`--dev` 是一个**全局** profile 标志，会被某些运行器“吃掉”。
如果需要明确指定，请使用环境变量形式：

```bash
OPENCLAW_PROFILE=dev openclaw gateway --dev --reset
```

`--reset` 会清除配置、凭据、会话和 dev 工作区（使用
`trash`，而非 `rm`)，然后重新创建默认的 dev 设置。

提示：如果非 dev gateway 正在运行 (launchd/systemd)，请先停止它：

```bash
openclaw gateway stop
```

## 原始流日志 (OpenClaw)

OpenClaw 可以在任何过滤/格式化之前记录 **原始助手流**。
这是查看推理是否作为纯文本增量到达（或作为单独的思考块）的最佳方式。

通过 CLI 启用它：

```bash
pnpm gateway:watch --force --raw-stream
```

可选路径覆盖：

```bash
pnpm gateway:watch --force --raw-stream --raw-stream-path ~/.openclaw/logs/raw-stream.jsonl
```

等效 环境变量：

```bash
OPENCLAW_RAW_STREAM=1
OPENCLAW_RAW_STREAM_PATH=~/.openclaw/logs/raw-stream.jsonl
```

默认文件：

`~/.openclaw/logs/raw-stream.jsonl`

## Raw chunk logging (pi-mono)

为了在将 **原始 OpenAI 兼容数据块** 解析为块之前捕获它们，
pi-mono 提供了一个单独的记录器：

```bash
PI_RAW_STREAM=1
```

可选路径：

```bash
PI_RAW_STREAM_PATH=~/.pi-mono/logs/raw-openai-completions.jsonl
```

默认文件：

`~/.pi-mono/logs/raw-openai-completions.jsonl`

> 注意：这仅由使用 pi-mono 的
> `openai-completions` 提供商 的进程发出。

## 安全注意事项

- 原始流日志可能包含完整的提示、工具输出和用户数据。
- 将日志保留在本地，并在调试后删除它们。
- 如果您共享日志，请先清理机密信息和 PII。
