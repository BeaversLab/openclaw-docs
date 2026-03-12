---
summary: "调试工具：监听模式、原始模型流以及跟踪推理泄露"
read_when:
  - You need to inspect raw model output for reasoning leakage
  - You want to run the Gateway in watch mode while iterating
  - You need a repeatable debugging workflow
title: "调试"
---

# 调试

本页介绍流式输出的调试辅助工具，特别是当提供商将推理内容混合到正常文本中时。

## 运行时调试覆盖

在聊天中使用 `/debug` 设置**仅限运行时**的配置覆盖（内存，非磁盘）。
`/debug` 默认处于禁用状态；通过 `commands.debug: true` 启用。
当您需要切换冷门设置而不编辑 `openclaw.json` 时，这非常方便。

示例：

```
/debug show
/debug set messages.responsePrefix="[openclaw]"
/debug unset messages.responsePrefix
/debug reset
```

`/debug reset` 清除所有覆盖并返回磁盘上的配置。

## 网关监听模式

为了快速迭代，请在文件监视器下运行网关：

```bash
pnpm gateway:watch
```

这对应于：

```bash
node --watch-path src --watch-path tsconfig.json --watch-path package.json --watch-preserve-output scripts/run-node.mjs gateway --force
```

在 `gateway:watch` 之后添加任何网关 CLI 标志，它们将在每次重启时被传递。

## 开发配置文件 + 开发网关 (--dev)

使用开发配置文件隔离状态，并为调试启动一个安全的、一次性的设置。
有**两个** `--dev` 标志：

- **全局 `--dev` (profile)：** 在 `~/.openclaw-dev` 下隔离状态，并且
  将网关端口默认为 `19001`（派生端口随之移动）。
- **`gateway --dev`：** 告诉网关自动创建默认配置 +
  workspace** 当缺失时（并跳过 BOOTSTRAP.md）。

推荐流程（开发配置文件 + 开发引导）：

```bash
pnpm gateway:dev
OPENCLAW_PROFILE=dev openclaw tui
```

如果您尚未进行全局安装，请通过 `pnpm openclaw ...` 运行 CLI。

其作用如下：

1. **配置文件隔离** (全局 `--dev`)
   - `OPENCLAW_PROFILE=dev`
   - `OPENCLAW_STATE_DIR=~/.openclaw-dev`
   - `OPENCLAW_CONFIG_PATH=~/.openclaw-dev/openclaw.json`
   - `OPENCLAW_GATEWAY_PORT=19001` (浏览器/画布相应移动)

2. **开发引导** (`gateway --dev`)
   - 如果缺少，则写入最小配置 (`gateway.mode=local`, 绑定回环)。
   - 将 `agent.workspace` 设置为开发工作区。
   - 设置 `agent.skipBootstrap=true` (无 BOOTSTRAP.md)。
   - 如果缺少，则为工作区文件填充种子：
     `AGENTS.md`, `SOUL.md`, `TOOLS.md`, `IDENTITY.md`, `USER.md`, `HEARTBEAT.md`。
   - 默认身份：**C3‑PO** (协议机器人)。
   - 在开发模式下跳过通道提供程序 (`OPENCLAW_SKIP_CHANNELS=1`)。

重置流程（全新开始）：

```bash
pnpm gateway:dev:reset
```

注意：`--dev` 是一个 **全局** 配置文件标志，并且会被某些运行器“吃掉”。
如果您需要明确指定，请使用环境变量形式：

```bash
OPENCLAW_PROFILE=dev openclaw gateway --dev --reset
```

`--reset` 会清除配置、凭据、会话和开发工作区（使用
`trash`，而不是 `rm`），然后重新创建默认开发设置。

提示：如果非开发网关已经在运行 (launchd/systemd)，请先将其停止：

```bash
openclaw gateway stop
```

## 原始流日志记录

OpenClaw 可以在任何过滤/格式化之前记录 **原始助手流**。
这是查看推理是否作为纯文本增量
（或作为单独的思考块）到达的最佳方式。

通过 CLI 启用：

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

## 原始数据块日志记录

要在 **原始 OpenAI 兼容数据块** 被解析为块之前捕获它们，
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
> `openai-completions` 提供程序的进程发出。

## 安全说明

- 原始流日志可能包含完整的提示、工具输出和用户数据。
- 请将日志保存在本地，并在调试后将其删除。
- 如果您共享日志，请先清除机密信息和个人身份信息 (PII)。
