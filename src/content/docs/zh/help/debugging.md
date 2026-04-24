---
summary: "调试工具：监视模式、原始模型流以及追踪推理泄漏"
read_when:
  - You need to inspect raw model output for reasoning leakage
  - You want to run the Gateway in watch mode while iterating
  - You need a repeatable debugging workflow
title: "调试"
---

# 调试

本页介绍流式输出的调试辅助工具，特别是当提供商将推理内容混合到正常文本中时。

## 运行时调试覆盖

在聊天中使用 `/debug` 来设置**仅运行时**的配置覆盖（内存中，而非磁盘）。
`/debug` 默认禁用；通过 `commands.debug: true` 启用。
当您需要切换生僻设置而无需编辑 `openclaw.json` 时，这非常方便。

示例：

```
/debug show
/debug set messages.responsePrefix="[openclaw]"
/debug unset messages.responsePrefix
/debug reset
```

`/debug reset` 清除所有覆盖并返回磁盘上的配置。

## 会话跟踪输出

当您希望在一个会话中查看插件拥有的跟踪/调试行，而无需开启完整详细模式时，请使用 `/trace`。

示例：

```text
/trace
/trace on
/trace off
```

使用 `/trace` 进行插件诊断，例如主动内存（Active Memory）调试摘要。
继续使用 `/verbose` 获取正常的详细状态/工具输出，并继续使用
`/debug` 进行仅限运行时的配置覆盖。

## 临时 CLI 调试计时

OpenClaw 保留了 `src/cli/debug-timing.ts` 作为一个用于本地
调查的小型辅助工具。它是有意不连接到 CLI 启动、命令路由
或任何命令的。仅在调试慢速命令时使用它，然后
在落地行为更改之前移除导入和 spans。

当命令运行缓慢且您需要在决定使用 CPU 分析器或修复特定子系统之前
快速分解各个阶段时，请使用此方法。

### 添加临时 spans

在您正在调查的代码附近添加辅助工具。例如，在调试 `openclaw models list` 时，`src/commands/models/list.list-command.ts` 中的临时补丁可能如下所示：

```ts
// Temporary debugging only. Remove before landing.
import { createCliDebugTiming } from "../../cli/debug-timing.js";

const timing = createCliDebugTiming({ command: "models list" });

const authStore = timing.time("debug:models:list:auth_store", () => ensureAuthProfileStore());

const loaded = await timing.timeAsync(
  "debug:models:list:registry",
  () => loadListModelRegistry(cfg, { sourceConfig }),
  (result) => ({
    models: result.models.length,
    discoveredKeys: result.discoveredKeys.size,
  }),
);
```

准则：

- 临时阶段名称以 `debug:` 为前缀。
- 仅在疑似缓慢的区块周围添加几个 span。
- 优先使用 `registry`、`auth_store` 或 `rows` 等广泛的阶段名称，而不是辅助工具名称。
- 对于同步工作使用 `time()`，对于 promise 使用 `timeAsync()`。
- 保持 stdout 干净。辅助工具写入 stderr，因此命令的 JSON 输出保持可解析状态。
- 在打开最终的修复 PR 之前，删除临时的导入和 span。
- 在解释优化的 issue 或 PR 中，包含计时输出或简短摘要。

### 以可读输出运行

可读模式最适合实时调试：

```bash
OPENCLAW_DEBUG_TIMING=1 pnpm openclaw models list --all --provider moonshot
```

来自临时 `models list` 调查的示例输出：

```text
OpenClaw CLI debug timing: models list
     0ms     +0ms start all=true json=false local=false plain=false provider="moonshot"
     2ms     +2ms debug:models:list:import_runtime duration=2ms
    17ms    +14ms debug:models:list:load_config duration=14ms sourceConfig=true
  20.3s  +20.3s debug:models:list:auth_store duration=20.3s
  20.3s     +0ms debug:models:list:resolve_agent_dir duration=0ms agentDir=true
  20.3s     +0ms debug:models:list:resolve_provider_filter duration=0ms
  25.3s   +5.0s debug:models:list:ensure_models_json duration=5.0s
  31.2s   +5.9s debug:models:list:load_model_registry duration=5.9s models=869 availableKeys=38 discoveredKeys=868 availabilityError=false
  31.2s     +0ms debug:models:list:resolve_configured_entries duration=0ms entries=1
  31.2s     +0ms debug:models:list:build_configured_lookup duration=0ms entries=1
  33.6s   +2.4s debug:models:list:read_registry_models duration=2.4s models=871
  35.2s   +1.5s debug:models:list:append_discovered_rows duration=1.5s seenKeys=0 rows=0
  36.9s   +1.7s debug:models:list:append_catalog_supplement_rows duration=1.7s seenKeys=5 rows=5

Model                                      Input       Ctx   Local Auth  Tags
moonshot/kimi-k2-thinking                  text        256k  no    no
moonshot/kimi-k2-thinking-turbo            text        256k  no    no
moonshot/kimi-k2-turbo                     text        250k  no    no
moonshot/kimi-k2.5                         text+image  256k  no    no
moonshot/kimi-k2.6                         text+image  256k  no    no

  36.9s     +0ms debug:models:list:print_model_table duration=0ms rows=5
  36.9s     +0ms complete rows=5
```

此输出的发现：

| 阶段                                     |      时间 | 含义                                                        |
| ---------------------------------------- | --------: | ----------------------------------------------------------- |
| `debug:models:list:auth_store`           |     20.3s | auth-profile 存储加载是最大的开销，应首先进行调查。         |
| `debug:models:list:ensure_models_json`   |      5.0s | 同步 `models.json` 的开销很大，值得检查缓存或跳过条件。     |
| `debug:models:list:load_model_registry`  |      5.9s | 注册表构建和提供商可用性检查也是不小的开销。                |
| `debug:models:list:read_registry_models` |      2.4s | 读取所有注册表模型并非没有开销，对于 `--all` 可能会有影响。 |
| 行追加阶段                               | 总计 3.2s | 构建五行显示内容仍需几秒钟，因此过滤路径值得更仔细地查看。  |
| `debug:models:list:print_model_table`    |       0ms | 渲染不是瓶颈。                                              |

这些发现足以指导下一次补丁，而无需在生产路径中保留计时代码。

### 使用 JSON 输出运行

当您想要保存或比较计时数据时，请使用 JSON 模式：

```bash
OPENCLAW_DEBUG_TIMING=json pnpm openclaw models list --all --provider moonshot \
  2> .artifacts/models-list-timing.jsonl
```

每一行 stderr 都是一个 JSON 对象：

```json
{
  "command": "models list",
  "phase": "debug:models:list:registry",
  "elapsedMs": 31200,
  "deltaMs": 5900,
  "durationMs": 5900,
  "models": 869,
  "discoveredKeys": 868
}
```

### 在合并前进行清理

在打开最终 PR 之前：

```bash
rg 'createCliDebugTiming|debug:[a-z0-9_-]+:' src/commands src/cli \
  --glob '!src/cli/debug-timing.*' \
  --glob '!*.test.ts'
```

除非 PR 明确添加了永久的诊断表面，否则该命令不应返回任何临时检测调用点。对于常规性能修复，仅保留行为更改、测试以及包含计时证据的简短说明。

对于更深入的 CPU 热点，请使用 Node 分析工具 (`--cpu-prof`) 或外部分析器，而不是添加更多的计时包装器。

## Gateway(网关) 监视模式

为了快速迭代，请在文件监视器下运行网关：

```bash
pnpm gateway:watch
```

这对应于：

```bash
node scripts/watch-node.mjs gateway --force
```

监视器会在 `src/` 下的与构建相关的文件、扩展源文件、
扩展 `package.json` 和 `openclaw.plugin.json` 元数据、`tsconfig.json`、
`package.json` 以及 `tsdown.config.ts` 发生变化时重启。扩展元数据的更改会
在不强制 `tsdown` 重新构建的情况下重启网关；源文件和配置的更改
仍然会先重新构建 `dist`。

在 `gateway:watch` 之后添加任何网关 CLI 标志，它们将在
每次重启时被传递。现在，为同一个仓库/标志集重新运行相同的监视命令会
替换旧的监视器，而不是留下重复的监视器父进程。

## 开发配置文件 + 开发网关 (--dev)

使用 dev 配置文件来隔离状态，并为调试启动一个安全、一次性的设置。有 **两个** `--dev` 标志：

- **全局 `--dev`（配置文件）：** 在 `~/.openclaw-dev` 下隔离状态，
  并将 gateway 端口默认为 `19001`（派生端口随之偏移）。
- **`gateway --dev`：** 告诉 Gateway(网关) 在缺失时自动创建默认配置 +
  workspace\*\*（并跳过 BOOTSTRAP.md）。

推荐流程（dev 配置文件 + dev 引导）：

```bash
pnpm gateway:dev
OPENCLAW_PROFILE=dev openclaw tui
```

如果你还没有全局安装，请通过 `pnpm openclaw ...` 运行 CLI。

这样做的作用：

1. **配置文件隔离**（全局 `--dev`）
   - `OPENCLAW_PROFILE=dev`
   - `OPENCLAW_STATE_DIR=~/.openclaw-dev`
   - `OPENCLAW_CONFIG_PATH=~/.openclaw-dev/openclaw.json`
   - `OPENCLAW_GATEWAY_PORT=19001`（浏览器/画布相应偏移）

2. **开发启动引导** (`gateway --dev`)
   - 如果缺少最小配置则写入 (`gateway.mode=local`，绑定回环地址)。
   - 将 `agent.workspace` 设置为开发工作区。
   - 设置 `agent.skipBootstrap=true` (无 BOOTSTRAP.md)。
   - 如果缺少工作区文件则进行种子填充：
     `AGENTS.md`、`SOUL.md`、`TOOLS.md`、`IDENTITY.md`、`USER.md`、`HEARTBEAT.md`。
   - 默认身份：**C3‑PO** (protocol droid)。
   - 在开发模式下跳过渠道提供者 (`OPENCLAW_SKIP_CHANNELS=1`)。

重置流程（全新开始）：

```bash
pnpm gateway:dev:reset
```

注意：`--dev` 是一个 **全局** profile 标志，并且会被某些运行器吞噬。
如果您需要明确指定它，请使用环境变量形式：

```bash
OPENCLAW_PROFILE=dev openclaw gateway --dev --reset
```

`--reset` 会清除配置、凭据、会话和开发工作区（使用 `trash`，而非 `rm`），然后重新创建默认开发设置。

提示：如果非开发网关已在运行（launchd/systemd），请先将其停止：

```bash
openclaw gateway stop
```

## 原始流日志记录 (OpenClaw)

OpenClaw 可以在任何过滤/格式化之前记录 **原始助手流**。这是查看推理是否作为纯文本增量（或作为单独的思考块）到达的最佳方式。

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

## 原始数据块日志记录 (pi-mono)

为了在将 **原始 OpenAI 兼容数据块** 解析为块之前捕获它们，pi-mono 暴露了一个单独的记录器：

```bash
PI_RAW_STREAM=1
```

可选路径：

```bash
PI_RAW_STREAM_PATH=~/.pi-mono/logs/raw-openai-completions.jsonl
```

默认文件：

`~/.pi-mono/logs/raw-openai-completions.jsonl`

> 注意：这仅由使用 pi-mono 的 `openai-completions` 提供商的进程发出。

## 安全注意事项

- 原始流日志可能包含完整的提示词、工具输出和用户数据。
- 请将日志保留在本地，并在调试后将其删除。
- 如果您共享日志，请先清理其中的密钥和个人身份信息（PII）。
