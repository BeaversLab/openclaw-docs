---
summary: "调试工具：监视模式、原始模型流以及追踪推理泄露"
read_when:
  - You need to inspect raw model output for reasoning leakage
  - You want to run the Gateway in watch mode while iterating
  - You need a repeatable debugging workflow
title: "调试"
---

流式输出的调试助手，特别是当提供商将推理混合到普通文本中时。

## 运行时调试覆盖

在聊天中使用 `/debug` 来设置**仅运行时**的配置覆盖（内存中，非磁盘）。
`/debug` 默认处于禁用状态；通过 `commands.debug: true` 启用它。
当您需要切换晦涩的设置而不编辑 `openclaw.json` 时，这非常方便。

示例：

```
/debug show
/debug set messages.responsePrefix="[openclaw]"
/debug unset messages.responsePrefix
/debug reset
```

`/debug reset` 会清除所有覆盖并返回到磁盘上的配置。

## 会话跟踪输出

当您想在一个会话中查看插件拥有的跟踪/调试行，
而又不想开启完整的详细模式时，请使用 `/trace`。

示例：

```text
/trace
/trace on
/trace off
```

使用 `/trace` 进行插件诊断，例如主动内存（Active Memory）调试摘要。
请继续使用 `/verbose` 获取正常的详细状态/工具输出，并继续使用
`/debug` 进行仅运行时的配置覆盖。

## 插件生命周期跟踪

当插件生命周期命令感觉缓慢，且您需要针对插件元数据、发现、注册表、
运行时镜像、配置变更和刷新工作的内置阶段细分时，请使用 `OPENCLAW_PLUGIN_LIFECYCLE_TRACE=1`。该跟踪是可选加入的，并写入
stderr，因此 JSON 命令输出仍可被解析。

示例：

```bash
OPENCLAW_PLUGIN_LIFECYCLE_TRACE=1 openclaw plugins install tokenjuice --force
```

示例输出：

```text
[plugins:lifecycle] phase="config read" ms=6.83 status=ok command="install"
[plugins:lifecycle] phase="slot selection" ms=94.31 status=ok command="install" pluginId="tokenjuice"
[plugins:lifecycle] phase="registry refresh" ms=51.56 status=ok command="install" reason="source-changed"
```

在求助于 CPU 分析器之前，请使用此功能进行插件生命周期调查。
如果命令是从源代码检出处运行的，建议在 `pnpm build` 之后，使用 `node dist/entry.js ...` 测量
构建好的运行时；`pnpm openclaw ...`
也会测量源代码运行器的开销。

## CLI 启动和命令分析

当某个命令感觉缓慢时，使用签入的启动基准测试：

```bash
pnpm test:startup:bench:smoke
pnpm tsx scripts/bench-cli-startup.ts --preset real --case status --runs 3
pnpm tsx scripts/bench-cli-startup.ts --preset real --cpu-prof-dir .artifacts/cli-cpu
```

要通过正常的源代码运行器进行一次性分析，请设置
`OPENCLAW_RUN_NODE_CPU_PROF_DIR`：

```bash
OPENCLAW_RUN_NODE_CPU_PROF_DIR=.artifacts/cli-cpu pnpm openclaw status
```

源代码运行器会添加 Node CPU 分析标志并为该命令
写入一个 `.cpuprofile`。在向命令代码添加临时检测之前，请先使用此功能。

对于看起来像同步文件系统或模块加载器工作的启动停滞，
请通过源代码运行器添加 Node 的同步 I/O 跟踪标志：

```bash
OPENCLAW_TRACE_SYNC_IO=1 pnpm openclaw gateway --force
```

`pnpm gateway:watch`Gateway(网关) 默认情况下将此标志对被监视的 Gateway(网关) 子进程保持禁用状态。当您在监视模式下明确需要 Node 同步 I/O 跟踪输出时，请设置 `OPENCLAW_TRACE_SYNC_IO=1`。

## Gateway(网关) 监视模式

为了快速迭代，请在文件监视器下运行 Gateway：

```bash
pnpm gateway:watch
```

默认情况下，这会启动或重启一个名为 `openclaw-gateway-watch-main` 的 tmux 会话（或特定于端口/配置文件的变体，如 `openclaw-gateway-watch-dev-19001`），并从交互式终端自动附加。非交互式 Shell、CI 和代理执行调用将保持分离状态，改为打印附加说明。需要时请手动附加：

```bash
tmux attach -t openclaw-gateway-watch-main
```

tmux 面板运行原始监视器：

```bash
node scripts/watch-node.mjs gateway --force
```

当不需要 tmux 时，使用前台模式：

```bash
pnpm gateway:watch:raw
# or
OPENCLAW_GATEWAY_WATCH_TMUX=0 pnpm gateway:watch
```

在保留 tmux 管理的同时禁用自动附加：

```bash
OPENCLAW_GATEWAY_WATCH_ATTACH=0 pnpm gateway:watch
```

在调试启动/运行时热点时，分析被监视的 Gateway(网关) CPU 时间：

```bash
pnpm gateway:watch --benchmark
```

监视包装器在调用 Gateway(网关)之前会消耗 `--benchmark`Gateway(网关)，并为每个 Gateway(网关) 子进程退出在 `.artifacts/gateway-watch-profiles/` 下写入一个 V8 `.cpuprofile`Gateway(网关)。停止或重启被监视的 Gateway(网关)以刷新当前分析文件，然后使用 Chrome DevTools 或 Speedscope 打开它：

```bash
npx speedscope .artifacts/gateway-watch-profiles/*.cpuprofile
```

当您希望将分析文件存放在其他位置时，请使用 `--benchmark-dir <path>`。当您希望被基准测试的子进程跳过默认的 `--force`Gateway(网关) 端口清理并在 Gateway(网关) 端口已被占用时快速失败时，请使用 `--benchmark-no-force`。基准测试模式默认会抑制同步 I/O 跟踪垃圾信息。当您明确需要 CPU 分析和 Node 同步 I/O 堆栈跟踪时，请结合 `--benchmark` 设置 `OPENCLAW_TRACE_SYNC_IO=1`。在基准测试模式下，这些跟踪块将写入基准测试目录下的 `gateway-watch-output.log`Gateway(网关) 中，并从终端面板中过滤掉；正常的 Gateway(网关) 日志保持可见。

tmux 封装器将常见的非机密运行时选择器（如 `OPENCLAW_PROFILE`、`OPENCLAW_CONFIG_PATH`、`OPENCLAW_STATE_DIR`、`OPENCLAW_GATEWAY_PORT` 和 `OPENCLAW_SKIP_CHANNELS`Gateway(网关)）携带到面板中。请将提供商凭证放在您的常规配置文件/配置中，或者使用原始前台模式来处理一次性的临时机密。如果被监控的 Gateway(网关) 在启动期间退出，监控器将运行 `openclaw doctor --fix --non-interactive`Gateway(网关) 一次并重新启动 Gateway(网关) 子进程。如果您希望在仅有开发环境的修复过程之前看到原始的启动失败，请使用 `OPENCLAW_GATEWAY_WATCH_AUTO_DOCTOR=0`Gateway(网关)。托管的 tmux 面板默认也会为了可读性显示带颜色的 Gateway(网关) 日志；在启动 `pnpm gateway:watch` 时设置 `FORCE_COLOR=0` 可以禁用 ANSI 输出。

监控器会在 `src/` 下的构建相关文件、扩展源文件、扩展 `package.json` 和 `openclaw.plugin.json` 元数据、`tsconfig.json`、`package.json` 以及 `tsdown.config.ts` 发生变化时重新启动。扩展元数据的更改会重新启动网关，而不会强制 `tsdown` 重新构建；源和配置的更改仍然会首先重新构建 `dist`。

在 CLI`gateway:watch` 之后添加任何 gateway CLI 标志，它们将在每次重新启动时被传递。重新运行相同的监控命令会重新生成指定的 tmux 面板，并且原始监控器仍会保持其单一监控器锁，因此重复的监控器父进程会被替换，而不会累积。

## Dev profile + dev gateway (--dev)

使用 dev profile 来隔离状态并启动一个安全的、一次性的调试设置。有 **两个** `--dev` 标志：

- **全局 `--dev` (profile):** 在 `~/.openclaw-dev` 下隔离状态，并将网关端口默认设置为 `19001`（派生端口随之偏移）。
- **`gateway --dev`Gateway(网关):** 告诉 Gateway(网关) 在缺少配置时自动创建默认配置 + 工作区\*\*（并跳过 BOOTSTRAP.md）。

推荐流程 (dev profile + dev bootstrap):

```bash
pnpm gateway:dev
OPENCLAW_PROFILE=dev openclaw tui
```

如果你尚未进行全局安装，请通过 CLI`pnpm openclaw ...` 运行 CLI。

其作用如下：

1. **配置隔离**（全局 `--dev`）
   - `OPENCLAW_PROFILE=dev`
   - `OPENCLAW_STATE_DIR=~/.openclaw-dev`
   - `OPENCLAW_CONFIG_PATH=~/.openclaw-dev/openclaw.json`
   - `OPENCLAW_GATEWAY_PORT=19001`（浏览器/canvas 相应偏移）

2. **开发引导**（`gateway --dev`）
   - 如果缺失则写入最小配置（`gateway.mode=local`，绑定回环）。
   - 将 `agent.workspace` 设置为开发工作区。
   - 设置 `agent.skipBootstrap=true`（无 BOOTSTRAP.md）。
   - 如果缺失则初始化工作区文件：
     `AGENTS.md`、`SOUL.md`、`TOOLS.md`、`IDENTITY.md`、`USER.md`、`HEARTBEAT.md`。
   - 默认身份：**C3-PO**（礼仪机器人）。
   - 在开发模式下跳过渠道提供商（`OPENCLAW_SKIP_CHANNELS=1`）。

重置流程（全新开始）：

```bash
pnpm gateway:dev:reset
```

<Note>
`--dev` 是一个**全局**配置文件标志，可能会被某些运行器“吞掉”。如果你需要明确指定它，请使用环境变量形式：

```bash
OPENCLAW_PROFILE=dev openclaw gateway --dev --reset
```

</Note>

`--reset` 会清除配置、凭据、会话和开发工作区（使用
`trash`，而非 `rm`），然后重新创建默认开发设置。

<Tip>
如果非开发网关已在运行（通过 launchd 或 systemd），请先将其停止：

```bash
openclaw gateway stop
```

</Tip>

## 原始流日志

OpenClaw 可以在任何过滤/格式化之前记录**原始助手流**。
这是查看推理是否作为纯文本增量到达
（或作为独立的思维块）的最佳方式。

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

## 原始 OpenAI 兼容数据块日志

要在将 **原始 OpenAI 兼容数据块** 解析为块之前捕获它们，
请启用传输记录器：

```bash
OPENCLAW_RAW_STREAM=1
```

可选路径：

```bash
OPENCLAW_RAW_STREAM_PATH=~/.openclaw/logs/raw-openai-completions.jsonl
```

默认文件：

`~/.openclaw/logs/raw-openai-completions.jsonl`

## 安全说明

- 原始流日志可能包含完整的提示、工具输出和用户数据。
- 请将日志保存在本地，并在调试后将其删除。
- 如果您共享日志，请先清除密钥和个人身份信息 (PII)。

## 在 VSCode 中调试

在基于 VSCode 的 IDE 中启用调试需要 Source maps，因为许多生成的文件在构建过程中最终会带有哈希名称。包含的 `launch.json` 配置以 Gateway(网关) 服务为目标，但可以快速调整用于其他目的：

1. **重新构建并调试 Gateway(网关)** - 创建新构建后调试 Gateway(网关) 服务
2. **调试 Gateway(网关)** - 调试现有构建的 Gateway(网关) 服务

### 设置

默认的 **重新构建并调试 Gateway(网关)** 配置是开箱即用的，它会自动删除 `/dist` 文件夹并在启用调试的情况下重新构建项目：

1. 从活动栏打开 **运行和调试** 面板，或按 `Ctrl`+`Shift`+`D`
2. 在 IDE 中，确保在下拉列表中选择了 **重新构建并调试 Gateway(网关)**，然后按 **开始调试** 按钮

或者 - 如果您更喜欢手动管理构建和调试过程：

1. 打开终端并启用 source maps：
   - **Linux/macOS**：`export OUTPUT_SOURCE_MAPS=1`
   - **Windows (PowerShell)**：`$env:OUTPUT_SOURCE_MAPS="1"`
   - **Windows (CMD)**：`set OUTPUT_SOURCE_MAPS=1`
2. 在同一终端中，重新构建项目：`pnpm clean:dist && pnpm build`
3. 在 IDE 中，在 **运行和调试** 配置下拉列表中选择 **调试 Gateway(网关)** 选项，然后按 **开始调试** 按钮

您现在可以在 TypeScript 源文件（`src/` 目录）中设置断点，调试器将通过 source maps 正确地将断点映射到编译后的 JavaScript。您将能够检查变量、单步执行代码以及按预期检查调用堆栈。

### 注意

- 如果使用 **"Rebuild and Debug Gateway(网关)"** 选项 - 每次启动调试器时，它将完全删除 `/dist` 文件夹，并在启动 Gateway(网关) 之前运行启用了 source maps 的完整 `pnpm build`
- 如果使用 **"Debug Gateway(网关)"** 选项 - 调试会话可以随时启动和停止，而不会影响 `/dist` 文件夹，但您必须使用单独的终端进程来启用调试和管理构建周期
- 修改 `launch.json` 中的 `args` 设置以调试项目的其他部分
- 如果您需要使用内置的 OpenClaw CLI 执行其他任务（即 `dashboard --no-open` 如果您的调试会话生成了新的 auth token），您可以在另一个终端中将其作为 `node ./openclaw.mjs` 执行，或者创建一个像 `alias openclaw-build="node $(pwd)/openclaw.mjs"` 这样的 shell 别名

## 相关

- [故障排除](/zh/help/troubleshooting)
- [常见问题](/zh/help/faq)
