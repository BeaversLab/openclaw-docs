---
summary: "调试工具：监视模式、原始模型流和追踪推理泄漏"
read_when:
  - You need to inspect raw model output for reasoning leakage
  - You want to run the Gateway in watch mode while iterating
  - You need a repeatable debugging workflow
title: "调试"
---

# 调试

本页介绍流式输出的调试辅助工具，特别是当提供商将推理内容混合到正常文本中时。

## 运行时调试覆盖

在聊天中使用 `/debug` 来设置**仅运行时**的配置覆盖（内存中，非磁盘）。
`/debug` 默认是禁用的；通过 `commands.debug: true` 启用。
当你需要在不编辑 `openclaw.json` 的情况下切换晦涩的设置时，这非常方便。

示例：

```
/debug show
/debug set messages.responsePrefix="[openclaw]"
/debug unset messages.responsePrefix
/debug reset
```

`/debug reset` 清除所有覆盖并返回到磁盘上的配置。

## Gateway 网关 监听模式

为了快速迭代，请在文件监视器下运行网关：

```bash
pnpm gateway:watch
```

这对应于：

```bash
node scripts/watch-node.mjs gateway --force
```

监视器会根据 `src/` 下的构建相关文件、扩展源文件、扩展 `package.json` 和 `openclaw.plugin.json` 元数据、`tsconfig.json`、`package.json` 以及 `tsdown.config.ts` 进行重启。扩展元数据的更改会在不强制 `tsdown` 重新构建的情况下重启网关；源文件和配置的更改仍会先重新构建 `dist`。

在 `gateway:watch` 之后添加任意网关 CLI 标志，它们将在每次重启时被传递。

## Dev profile + dev gateway (--dev)

使用 dev profile 隔离状态，并为调试启动一个安全的、一次性的设置。共有 **两个** `--dev` 标志：

- **全局 `--dev` (profile)：** 在 `~/.openclaw-dev` 下隔离状态，并将网关端口默认为 `19001`（派生端口随之偏移）。
- **`gateway --dev`：** 告诉 Gateway(网关) 在缺失时自动创建默认配置 + 工作区\*\*（并跳过 BOOTSTRAP.md）。

推荐流程（dev profile + dev bootstrap）：

```bash
pnpm gateway:dev
OPENCLAW_PROFILE=dev openclaw tui
```

如果您尚未进行全局安装，请通过 `pnpm openclaw ...` 运行 CLI。

其作用如下：

1. **配置文件隔离**（全局 `--dev`）
   - `OPENCLAW_PROFILE=dev`
   - `OPENCLAW_STATE_DIR=~/.openclaw-dev`
   - `OPENCLAW_CONFIG_PATH=~/.openclaw-dev/openclaw.json`
   - `OPENCLAW_GATEWAY_PORT=19001`（浏览器/canvas 相应偏移）

2. **Dev bootstrap**（`gateway --dev`）
   - 如果缺失，则写入最小配置（`gateway.mode=local`，绑定回环）。
   - 将 `agent.workspace` 设置为 dev workspace。
   - 设置 `agent.skipBootstrap=true`（无 BOOTSTRAP.md）。
   - 如果缺失，则初始化工作区文件：
     `AGENTS.md`、`SOUL.md`、`TOOLS.md`、`IDENTITY.md`、`USER.md`、`HEARTBEAT.md`。
   - 默认身份：**C3‑PO**（protocol droid）。
   - 在开发模式下跳过渠道提供商（`OPENCLAW_SKIP_CHANNELS=1`）。

重置流程（全新开始）：

```bash
pnpm gateway:dev:reset
```

注意：`--dev` 是一个 **全局** 配置文件标志，并且会被某些运行器吞噬。
如果你需要明确指定它，请使用环境变量形式：

```bash
OPENCLAW_PROFILE=dev openclaw gateway --dev --reset
```

`--reset` 会清除配置、凭据、会话和开发工作区（使用
`trash`，而不是 `rm`），然后重新创建默认的开发设置。

提示：如果一个非开发网关已经在运行（launchd/systemd），请先将其停止：

```bash
openclaw gateway stop
```

## 原始流日志记录 (OpenClaw)

OpenClaw 可以在任何过滤/格式化之前记录 **原始助手流**。
这是查看推理是否作为纯文本增量（或作为单独的思考块）到达的最佳方式。

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

为了在将 **原始 OpenAI-compat 块** 解析为块之前捕获它们，
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

## 安全注意事项

- 原始流日志可能包含完整的提示、工具输出和用户数据。
- 将日志保留在本地，并在调试后将其删除。
- 如果你共享日志，请先清除机密信息和 PII。

import zh from "/components/footer/zh.mdx";

<zh />
