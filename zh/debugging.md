---
summary: "调试工具：watch 模式、原始模型流与推理泄露追踪"
read_when:
  - 需要检查推理泄露的原始模型输出
  - 需要在 watch 模式下运行 Gateway 迭代
  - 需要可复现的调试流程
title: "调试"
---

# 调试

本页涵盖流式输出调试辅助，尤其是 provider 将推理混入普通文本时。

## 运行时调试覆盖

在聊天中使用 `/debug` 设置**仅运行时**的配置覆盖（内存中，不写盘）。
`/debug` 默认禁用；通过 `commands.debug: true` 启用。
当需要临时切换冷门设置又不想改 `openclaw.json` 时很有用。

示例：

```
/debug show
/debug set messages.responsePrefix="[openclaw]"
/debug unset messages.responsePrefix
/debug reset
```

`/debug reset` 会清除所有覆盖并回到磁盘配置。

## Gateway watch 模式

为快速迭代，在文件监视器下运行 gateway：

```bash
pnpm gateway:watch --force
```

其等价于：

```bash
tsx watch src/entry.ts gateway --force
```

将 gateway CLI flags 添加在 `gateway:watch` 之后即可在每次重启时透传。

## Dev profile + dev gateway（--dev）

使用 dev profile 隔离状态并创建安全、可丢弃的调试环境。这里有**两个** `--dev`：

- **全局 `--dev`（profile）**：状态隔离到 `~/.openclaw-dev`，并将 gateway 端口默认设为 `19001`（相关端口随之偏移）。
- **`gateway --dev`**：在缺失时自动创建默认配置 + workspace（并跳过 BOOTSTRAP.md）。

推荐流程（dev profile + dev bootstrap）：

```bash
pnpm gateway:dev
OPENCLAW_PROFILE=dev openclaw tui
```

若没有全局安装，可用 `pnpm openclaw ...` 运行 CLI。

其作用：

1. **Profile 隔离**（全局 `--dev`）
   - `OPENCLAW_PROFILE=dev`
   - `OPENCLAW_STATE_DIR=~/.openclaw-dev`
   - `OPENCLAW_CONFIG_PATH=~/.openclaw-dev/openclaw.json`
   - `OPENCLAW_GATEWAY_PORT=19001`（browser/canvas 端口随之偏移）

2. **Dev bootstrap**（`gateway --dev`）
   - 缺失时写入最小配置（`gateway.mode=local`，绑定 loopback）。
   - 将 `agent.workspace` 设为 dev workspace。
   - 设置 `agent.skipBootstrap=true`（不创建 BOOTSTRAP.md）。
   - 若缺失则生成 workspace 文件：
     `AGENTS.md`、`SOUL.md`、`TOOLS.md`、`IDENTITY.md`、`USER.md`、`HEARTBEAT.md`。
   - 默认 identity：**C3‑PO**（protocol droid）。
   - Dev 模式跳过渠道 providers（`OPENCLAW_SKIP_CHANNELS=1`）。

重置流程（全新开始）：

```bash
pnpm gateway:dev:reset
```

注意：`--dev` 是**全局** profile flag，可能被某些 runner 吃掉。
需要时可使用环境变量形式：

```bash
OPENCLAW_PROFILE=dev openclaw gateway --dev --reset
```

`--reset` 会清除配置、凭据、会话与 dev workspace（使用 `trash` 而非 `rm`），然后重建默认 dev setup。

提示：若已有非 dev gateway 在运行（launchd/systemd），先停止它：

```bash
openclaw gateway stop
```

## 原始流日志（OpenClaw）

OpenClaw 可记录**未过滤/未格式化**的原始 assistant 流。这是判断推理是否以普通文本 delta 进入的最佳方式。

通过 CLI 启用：

```bash
pnpm gateway:watch --force --raw-stream
```

可选路径覆盖：

```bash
pnpm gateway:watch --force --raw-stream --raw-stream-path ~/.openclaw/logs/raw-stream.jsonl
```

等价环境变量：

```bash
OPENCLAW_RAW_STREAM=1
OPENCLAW_RAW_STREAM_PATH=~/.openclaw/logs/raw-stream.jsonl
```

默认文件：

`~/.openclaw/logs/raw-stream.jsonl`

## 原始 chunk 日志（pi-mono）

为捕获**原始 OpenAI-compat chunks**（在解析成 blocks 之前），pi-mono 提供单独日志：

```bash
PI_RAW_STREAM=1
```

可选路径：

```bash
PI_RAW_STREAM_PATH=~/.pi-mono/logs/raw-openai-completions.jsonl
```

默认文件：

`~/.pi-mono/logs/raw-openai-completions.jsonl`

> 注：仅使用 pi-mono 的
> `openai-completions` provider 的进程会输出该日志。

## 安全注意事项

- 原始流日志可能包含完整 prompt、工具输出与用户数据。
- 保持日志本地并在调试后删除。
- 分享日志前请先清理密钥与 PII。
