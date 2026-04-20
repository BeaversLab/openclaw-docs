---
summary: "调试工具：监听模式、原始模型流以及跟踪推理泄漏"
read_when:
  - You need to inspect raw model output for reasoning leakage
  - You want to run the Gateway in watch mode while iterating
  - You need a repeatable debugging workflow
title: "调试"
---

# 调试

本页介绍流式输出的调试辅助工具，特别是当提供商将推理内容混合到正常文本中时。

## 运行时调试覆盖

在聊天中使用 `/debug` 设置**仅运行时**的配置覆盖（存储在内存中，而非磁盘）。
`/debug` 默认处于禁用状态；可通过 `commands.debug: true` 启用。
当您需要切换不常用的设置而无需编辑 `openclaw.json` 时，这非常方便。

示例：

```
/debug show
/debug set messages.responsePrefix="[openclaw]"
/debug unset messages.responsePrefix
/debug reset
```

`/debug reset` 清除所有覆盖项并恢复到磁盘上的配置。

## 会话跟踪输出

当您想要在一个会话中查看插件拥有的跟踪/调试行，而无需开启完整的详细模式时，请使用 `/trace`。

示例：

```text
/trace
/trace on
/trace off
```

使用 `/trace` 进行插件诊断，例如主动内存调试摘要。
请继续使用 `/verbose` 获取正常的详细状态/工具输出，并继续使用
`/debug` 进行仅运行时的配置覆盖。

## Gateway(网关) 监听模式

为了快速迭代，请在文件监视器下运行 Gateway(网关)：

```bash
pnpm gateway:watch
```

这映射到：

```bash
node scripts/watch-node.mjs gateway --force
```

当 `src/` 下的构建相关文件、扩展源文件、
扩展 `package.json` 和 `openclaw.plugin.json` 元数据、`tsconfig.json`、
`package.json` 和 `tsdown.config.ts` 发生变化时，监视器将重新启动。扩展元数据的更改会重新启动
Gateway(网关)，而无需强制进行 `tsdown` 重建；源文件和配置的更改仍然
会先重建 `dist`。

在 `gateway:watch` 之后添加任何 Gateway(网关) CLI 标志，它们将在
每次重新启动时被传递。现在，为同一仓库/标志集重新运行相同的监听命令将
替换较旧的监视器，而不是留下重复的监视器父进程。

## 开发配置文件 + 开发 Gateway(网关) (--dev)

使用开发配置文件来隔离状态并启动一个安全的、一次性的设置用于
调试。有**两个** `--dev` 标志：

- **全局 `--dev` (配置文件)：** 将状态隔离在 `~/.openclaw-dev` 下，并将网关端口默认设置为 `19001`（派生端口随之偏移）。
- **`gateway --dev`：** 告诉 Gateway(网关) 在缺失时自动创建默认配置 + 工作区（并跳过 BOOTSTRAP.md）。

推荐流程（开发配置文件 + 开发引导）：

```bash
pnpm gateway:dev
OPENCLAW_PROFILE=dev openclaw tui
```

如果您还没有全局安装，请通过 `pnpm openclaw ...` 运行 CLI。

其作用如下：

1. **配置文件隔离**（全局 `--dev`）
   - `OPENCLAW_PROFILE=dev`
   - `OPENCLAW_STATE_DIR=~/.openclaw-dev`
   - `OPENCLAW_CONFIG_PATH=~/.openclaw-dev/openclaw.json`
   - `OPENCLAW_GATEWAY_PORT=19001`（浏览器/canvas 相应偏移）

2. **开发引导**（`gateway --dev`）
   - 如果缺失，则写入最小配置（`gateway.mode=local`，绑定回环）。
   - 将 `agent.workspace` 设置为开发工作区。
   - 设置 `agent.skipBootstrap=true`（无 BOOTSTRAP.md）。
   - 如果缺失，则植入工作区文件：
     `AGENTS.md`, `SOUL.md`, `TOOLS.md`, `IDENTITY.md`, `USER.md`, `HEARTBEAT.md`。
   - 默认身份：**C3‑PO**（礼仪机器人）。
   - 在开发模式下跳过渠道提供商（`OPENCLAW_SKIP_CHANNELS=1`）。

重置流程（全新开始）：

```bash
pnpm gateway:dev:reset
```

注意：`--dev` 是一个**全局**配置文件标志，可能会被某些运行器“吃掉”。
如果您需要明确指定，请使用环境变量形式：

```bash
OPENCLAW_PROFILE=dev openclaw gateway --dev --reset
```

`--reset` 会清除配置、凭据、会话和开发工作区（使用 `trash`，而非 `rm`），然后重新创建默认开发设置。

提示：如果非开发网关已在运行（launchd/systemd），请先停止它：

```bash
openclaw gateway stop
```

## 原始流日志记录 (OpenClaw)

OpenClaw 可以在任何过滤/格式化之前记录**原始助手流**。
这是查看推理内容是否作为纯文本增量到达（或作为单独的思考块）的最佳方式。

通过 CLI 启用它：

```bash
pnpm gateway:watch --raw-stream
```

可选路径覆盖：

```bash
pnpm gateway:watch --raw-stream --raw-stream-path ~/.openclaw/logs/raw-stream.jsonl
```

等效环境变量：

```bash
OPENCLAW_RAW_STREAM=1
OPENCLAW_RAW_STREAM_PATH=~/.openclaw/logs/raw-stream.jsonl
```

默认文件：

`~/.openclaw/logs/raw-stream.jsonl`

## 原始块日志记录 (pi-mono)

要在将 **原始 OpenAI 兼容块** 解析为块之前捕获它们，
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
> `openai-completions` 提供商的进程发出。

## 安全说明

- 原始流日志可能包含完整的提示、工具输出和用户数据。
- 请将日志保留在本地，并在调试完成后将其删除。
- 如果您共享日志，请先清除机密信息和 PII。
