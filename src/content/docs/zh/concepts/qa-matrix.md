---
summary: "基于 Docker 支持的 Matrix 实时 QA 通道的维护者参考：CLI、配置文件、环境变量、场景和输出产物。"
read_when:
  - Running pnpm openclaw qa matrix locally
  - Adding or selecting Matrix QA scenarios
  - Triaging Matrix QA failures, timeouts, or stuck cleanup
title: "Matrix QA"
---

Matrix QA 通道在 Docker 中针对一次性的 Tuwunel 家庭服务器运行捆绑的 `@openclaw/matrix` 插件，其中包含临时驱动程序、SUT 和观察者账户以及预设房间。这是针对 Matrix 的实时传输真实覆盖。

这是仅限维护者使用的工具。打包发布的 OpenClaw 故意省略了 `qa-lab`，因此 `openclaw qa` 仅能从源代码检出中获取。源代码检出会直接加载内置的运行器 - 无需安装插件。

有关更广泛的 QA 框架背景，请参阅 [QA 概述](/zh/concepts/qa-e2e-automation)。

## 快速开始

```bash
pnpm openclaw qa matrix --profile fast --fail-fast
```

普通的 `pnpm openclaw qa matrix` 会运行 `--profile all` 并且不会在第一次失败时停止。将 `--profile fast --fail-fast` 用作发布关卡；当并行运行完整清单时，使用 `--profile transport|media|e2ee-smoke|e2ee-deep|e2ee-cli` 对目录进行分片。

## 通道的功能

1. 在 Docker 中配置一次性的 Tuwunel 家庭服务器（默认镜像 `ghcr.io/matrix-construct/tuwunel:v1.5.1`，服务器名称 `matrix-qa.test`，端口 `28008`）。
2. 注册三个临时用户 - `driver`（发送入站流量），`sut`（受测的 OpenClaw Matrix 账户），`observer`（第三方流量捕获）。
3. 为所选场景预设必需的房间（主房间、线程、媒体、重启、辅助、允许列表、E2EE、验证私信等）。
4. 启动一个子 OpenClaw 网关，并将真实的 Matrix 插件限定在 SUT 账户范围内；子级中未加载 `qa-channel`。
5. 按顺序运行场景，并通过驱动程序/观察者 Matrix 客户端观察事件。
6. 拆除家庭服务器，写入报告和摘要产物，然后退出。

## CLI

```text
pnpm openclaw qa matrix [options]
```

### 通用标志

| 标志                  | 默认值                                        | 描述                                                                           |
| --------------------- | --------------------------------------------- | ------------------------------------------------------------------------------ |
| `--profile <profile>` | `all`                                         | 场景配置文件。请参阅 [配置文件](#profiles)。                                   |
| `--fail-fast`         | off                                           | 在第一次失败的检查或场景后停止。                                               |
| `--scenario <id>`     | -                                             | 仅运行此场景。可重复。请参阅 [场景](#scenarios)。                              |
| `--output-dir <path>` | `<repo>/.artifacts/qa-e2e/matrix-<timestamp>` | 报告、摘要、观察到的事件和输出日志的写入位置。相对路径解析基于 `--repo-root`。 |
| `--repo-root <path>`  | `process.cwd()`                               | 从中性工作目录调用时的仓库根目录。                                             |
| `--sut-account <id>`  | `sut`                                         | QA 网关配置中的 Matrix 账户 ID。                                               |

### 提供商标志

该通道使用真实的 Matrix 传输，但模型提供商是可配置的：

| 标志                     | 默认            | 描述                                                                                                       |
| ------------------------ | --------------- | ---------------------------------------------------------------------------------------------------------- |
| `--provider-mode <mode>` | `live-frontier` | 用于确定性模拟调度的 `mock-openai` 或用于实时前沿提供商的 `live-frontier`。旧别名 `live-openai` 仍然有效。 |
| `--model <ref>`          | 提供商默认      | 主要 `provider/model` 引用。                                                                               |
| `--alt-model <ref>`      | 提供商默认      | 场景在运行中途切换时的备用 `provider/model` 引用。                                                         |
| `--fast`                 | 关              | 在支持的情况下启用提供商快速模式。                                                                         |

Matrix QA 不接受 `--credential-source` 或 `--credential-role`。该通道在本地配置临时用户；没有共享的凭证池可供租用。

## 配置文件

所选配置文件决定运行哪些场景。

| 配置文件     | 用于                                                                                                                                         |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `all` (默认) | 完整目录。缓慢但详尽。                                                                                                                       |
| `fast`       | 发布门控子集，用于演练实时传输合约：金丝雀、提及门控、允许列表阻止、回复形状、重启恢复、线程跟进、线程隔离、反应观察以及执行批准元数据传递。 |
| `transport`  | 传输级线程、私信、房间、自动加入、提及/允许列表、批准和反应场景。                                                                            |
| `media`      | 图像、音频、视频、PDF、EPUB 附件覆盖。                                                                                                       |
| `e2ee-smoke` | 最小 E2EE 覆盖范围 - 基本加密回复、线程跟进、引导成功。                                                                                      |
| `e2ee-deep`  | 详尽的 E2EE 状态丢失、备份、密钥和恢复场景。                                                                                                 |
| `e2ee-cli`   | 通过 QA 工具驱动的 `openclaw matrix encryption setup` 和 `verify *` CLI 场景。                                                               |

确切的映射位于 `extensions/qa-matrix/src/runners/contract/scenario-catalog.ts` 中。

## 场景

完整的场景 ID 列表是 `extensions/qa-matrix/src/runners/contract/scenario-catalog.ts:15` 中的 `MatrixQaScenarioId` 联合类型。类别包括：

- 线程 - `matrix-thread-*`, `matrix-subagent-thread-spawn`
- 顶层 / 私信 / 房间 - `matrix-top-level-reply-shape`, `matrix-room-*`, `matrix-dm-*`
- 流式传输和工具进度 - `matrix-room-partial-streaming-preview`, `matrix-room-quiet-streaming-preview`, `matrix-room-tool-progress-*`, `matrix-room-block-streaming`
- 媒体 - `matrix-media-type-coverage`, `matrix-room-image-understanding-attachment`, `matrix-attachment-only-ignored`, `matrix-unsupported-media-safe`
- 路由 - `matrix-room-autojoin-invite`, `matrix-secondary-room-*`
- 反应 - `matrix-reaction-*`
- 批准 - `matrix-approval-*`（执行/插件元数据、分块回退、拒绝反应、线程和 `target: "both"` 路由）
- 重启和重放 - `matrix-restart-*`, `matrix-stale-sync-replay-dedupe`, `matrix-room-membership-loss`, `matrix-homeserver-restart-resume`, `matrix-initial-catchup-then-incremental`
- 提及门控、机器人到机器人以及允许列表 - `matrix-mention-*`、`matrix-allowbots-*`、`matrix-allowlist-*`、`matrix-multi-actor-ordering`、`matrix-inbound-edit-*`、`matrix-mxid-prefixed-command-block`、`matrix-observer-allowlist-override`
- E2EE - `matrix-e2ee-*`（基本回复、线程跟进、引导、恢复密钥生命周期、状态丢失变体、服务器备份行为、设备卫生、SAS / QR / 私信验证、重启、产物编辑）
- E2EE CLI - CLI`matrix-e2ee-cli-*`（加密设置、幂等设置、引导失败、恢复密钥生命周期、多账户、网关回复往返、自我验证）

传递 `--scenario <id>`（可重复）以运行精心挑选的集合；结合 `--profile all` 以忽略配置文件门控。

## 环境变量

| 变量                                    | 默认值                                    | 效果                                                                                                                                 |
| --------------------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `OPENCLAW_QA_MATRIX_TIMEOUT_MS`         | `1800000`（30 分钟）                      | 整个运行的硬性上限。                                                                                                                 |
| `OPENCLAW_QA_MATRIX_CANARY_TIMEOUT_MS`  | `45000`                                   | 初始金丝雀回复的界限。发布 CI 会在共享运行程序上提高此限制，以便在场景覆盖开始之前，缓慢的第一次网关轮次不会导致失败。               |
| `OPENCLAW_QA_MATRIX_NO_REPLY_WINDOW_MS` | `8000`                                    | 用于否定无回复断言的静默窗口。被限制为 `≤` 运行超时。                                                                                |
| `OPENCLAW_QA_MATRIX_CLEANUP_TIMEOUT_MS` | `90000`                                   | Docker 拆除的界限。故障表面包括恢复 Docker`docker compose ... down --remove-orphans` 命令。                                          |
| `OPENCLAW_QA_MATRIX_TUWUNEL_IMAGE`      | `ghcr.io/matrix-construct/tuwunel:v1.5.1` | 针对不同 Tuwunel 版本进行验证时，覆盖主服务器镜像。                                                                                  |
| `OPENCLAW_QA_MATRIX_PROGRESS`           | 开启                                      | `0` 使 stderr 上的 `[matrix-qa] ...` 进度行静默。`1` 强制显示它们。                                                                  |
| `OPENCLAW_QA_MATRIX_CAPTURE_CONTENT`    | 编辑                                      | `1` 保留 `matrix-qa-observed-events.json` 中的消息正文和 `formatted_body`。默认编辑是为了保护 CI 产物的安全。                        |
| `OPENCLAW_QA_MATRIX_DISABLE_FORCE_EXIT` | 关闭                                      | `1` 跳过写入产出物后的确定性 `process.exit`。默认强制退出，因为 matrix-js-sdk 的原生加密句柄可能会在产出物完成后让事件循环继续运行。 |
| `OPENCLAW_RUN_NODE_OUTPUT_LOG`          | unset                                     | 当由外部启动器（例如 `scripts/run-node.mjs`Matrix）设置时，Matrix QA 会重用该日志路径，而不是启动自己的 tee。                        |

## 输出产出物

写入至 `--output-dir`：

- `matrix-qa-report.md` - Markdown 协议报告（通过了什么、失败了什么、跳过了什么以及原因）。
- `matrix-qa-summary.json` - 适用于 CI 解析和仪表板的结构化摘要。
- `matrix-qa-observed-events.json`Matrix - 从驱动程序和观察者客户端观察到的 Matrix 事件。正文已被编辑，除非设置了 `OPENCLAW_QA_MATRIX_CAPTURE_CONTENT=1`；批准元数据通过选定的安全字段进行汇总，并截断命令预览。
- `matrix-qa-output.log` - 运行时的组合 stdout/stderr。如果设置了 `OPENCLAW_RUN_NODE_OUTPUT_LOG`，则改为重用外部启动器的日志。

默认输出目录是 `<repo>/.artifacts/qa-e2e/matrix-<timestamp>`，因此连续运行不会互相覆盖。

## 排查提示

- **运行接近结束时挂起：** `matrix-js-sdk` 原生加密句柄的存活时间可能超过线束。默认会在写入产出物后强制执行一次干净的 `process.exit`；如果您未设置 `OPENCLAW_QA_MATRIX_DISABLE_FORCE_EXIT=1`，预计进程将滞留。
- **清理错误：** 查找打印出的恢复命令（一个 `docker compose ... down --remove-orphans` 调用）并手动运行它以释放主服务器端口。
- **CI 中不稳定的否定断言窗口：** 当 CI 速度较快时，降低 `OPENCLAW_QA_MATRIX_NO_REPLY_WINDOW_MS`（默认 8 秒）；在缓慢的共享运行器上则将其提高。
- **需要针对错误报告提供编辑后的正文：** 使用 `OPENCLAW_QA_MATRIX_CAPTURE_CONTENT=1` 重新运行并附上 `matrix-qa-observed-events.json`。请将生成的产出物视为敏感信息。
- **不同的 Tuwunel 版本：** 将 `OPENCLAW_QA_MATRIX_TUWUNEL_IMAGE` 指向受测版本。该通道仅签入固定的默认镜像。

## 实时传输协议

Matrix 是三个实时传输通道（Matrix、Telegram、Discord）之一，它们共享在 [QA overview → Live transport coverage](/zh/concepts/qa-e2e-automation#live-transport-coverage) 中定义的单一合约检查清单。`qa-channel` 仍然是广泛的综合套件，并且有意不属于该矩阵的一部分。

## 相关

- [QA overview](/zh/concepts/qa-e2e-automation) - 整体 QA 技术栈和实时传输合约
- [QA Channel](/zh/channels/qa-channel) - 用于基于仓库场景的综合渠道适配器
- [Testing](/zh/help/testing) - 运行测试并添加 QA 覆盖范围
- [Matrix](/zh/channels/matrix) - 受测的渠道插件
