---
summary: "用于代理拥有的卡片和会话交接的可选仪表板工作板"
read_when:
  - You want a Kanban-style workboard in the Control UI
  - You are enabling or disabling the bundled Workboard plugin
  - You want to track planned agent work without an external project manager
title: "Workboard 插件"
---

Workboard 插件向 [Control UI](/zh/web/control-ui) 添加了一个可选的看板式面板。您可以使用它来收集适用于代理的工作卡片，将其分配给代理，并从一张卡片中跟踪关联的后台任务、运行和仪表板会话。

Workboard 体积虽小且刻意为之。它跟踪 OpenClaw Gateway(网关) 的本地运行工作；它不是 GitHub Issues、Linear、Jira 或其他团队项目管理系统的替代品。

## 默认状态

Workboard 是一个捆绑插件，默认情况下处于禁用状态，除非您在插件配置中启用它。

使用以下命令启用它：

```bash
openclaw plugins enable workboard
openclaw gateway restart
```

然后打开仪表板：

```bash
openclaw dashboard
```

Workboard 选项卡显示在仪表板导航中。如果该选项卡可见但插件被禁用或被 `plugins.allow` / `plugins.deny` 阻止，则视图将显示插件不可用状态，而不是本地卡片数据。

## 卡片包含的内容

每张卡片存储：

- 标题和备注
- status: `triage`、`backlog`、`todo`、`scheduled`、`ready`、`running`
  `review`、`blocked` 或 `done`
- priority: `low`、`normal`、`high` 或 `urgent`
- 标签
- 可选的代理 ID
- 可选的关联任务、运行、会话或源 URL
- 从卡片启动的 Codex 或 Claude 运行的可选执行元数据
- 针对尝试、评论、链接、证明、制品、自动化、附件、Worker 日志、Worker 协议状态、认领、诊断、通知、模板、归档状态和陈旧会话检测的精简元数据
- 最近的卡片事件，例如已创建、已移动、已链接、已认领、心跳、尝试、证明、制品、诊断、通知、分发、归档、陈旧或代理更新的更改

卡片存储在插件的 Gateway(网关) 状态中。它们对于 Gateway(网关) 状态目录来说是本地的，并随该 Gateway(网关) 的其余 OpenClaw 状态一起移动。

Workboard 为每张卡片保留紧凑的元数据，以便操作员无需打开关联的会话即可查看卡片在看板上的移动过程。事件、尝试摘要、代码片段、相关链接、评论、归档标记和陈旧会话标记均属于本地元数据；它们不能替代会话记录或 GitHub issue history。

## 卡片执行和任务

未关联的卡片可以从卡片本身开始工作。自主启动使用 Gateway(网关) 的任务跟踪代理运行路径，然后 Workboard 将生成的任务、运行 ID 和会话密钥链接回卡片。启动使用 Gateway(网关) 配置的默认代理和模型。Codex 和 Claude 操作是可选的显式模型选择：

- 运行 Codex 或运行 Claude 会启动一个支持任务的代理运行，发送卡片提示，并将卡片标记为 `running`。
- 打开 Codex 或打开 Claude 会创建一个链接的仪表板会话，而不发送卡片提示或移动卡片，因此您可以在卡片保持附加到看板的同时手动工作。

执行元数据在卡片上存储所选引擎、模式、模型引用、会话密钥、运行 ID（如果有）、任务 ID 以及生命周期状态。Codex 执行使用 `openai/gpt-5.5`；Claude 执行使用 `anthropic/claude-sonnet-4-6`。

每个链接的执行还会在同一张卡片记录上记录一个尝试摘要。尝试摘要包含引擎、模式、模型、运行 ID、时间戳、状态和滚动失败计数，以便在看板上持续显示重复的失败。

仪表板会从 Gateway(网关) 任务账本刷新任务状态，并通过任务 ID、运行 ID 或关联的会话密钥将任务匹配回卡片。如果任务已排队或正在运行，卡片生命周期将显示活动任务状态。如果任务完成、失败、超时或被取消，卡片生命周期将使用与关联会话相同的生命周期同步机制，转向审查或受阻状态。

## Agent coordination

Workboard 还提供了用于感知看板的工作流的可选 Agent 工具：

- `workboard_list` 列出带有认领和诊断状态的精简卡片，并带有可选的看板过滤器。
- `workboard_read` 返回一张卡片以及由备注、尝试、评论、链接、证明、产物、父级结果、最近受让者工作和活动诊断构成的限定 Worker 上下文。
- `workboard_create` 创建一个带有可选父级、租户、技能、看板、工作区元数据、幂等密钥、运行时限制和重试预算的卡片。
- `workboard_link` 将父卡片链接到子卡片。子卡片会保留在 `todo` 中，直到每个父级达到 `done`；然后调度升级会将它们移动到 `ready`。
- `workboard_claim` 为调用 Agent 认领一张卡片，并将待办、待办或就绪卡片移动到 `running`。
- `workboard_heartbeat` 在较长时间的运行期间刷新认领心跳。
- `workboard_release` 在完成、暂停或移交后释放认领，并可以将卡片移动到下一个状态。
- `workboard_complete` 和 `workboard_block` 是用于最终摘要、证明、产物、已创建卡片清单和阻塞原因的结构化生命周期工具。已创建卡片清单必须引用回已完成卡片的链接卡片，这样可以防止幽灵子项出现在摘要中。
- `workboard_attachment_add`、`workboard_attachment_read` 和
  `workboard_attachment_delete` 将小型卡片附件存储在插件的 SQLite
  状态中，在卡片上建立索引，并在 Worker 上下文中公开它们。
- `workboard_worker_log` 和 `workboard_protocol_violation` 记录工作日志
  行，并在自动化工作程序在未调用
  `workboard_complete` 或 `workboard_block` 的情况下停止时阻止卡片。
- `workboard_board_create`、`workboard_board_archive` 和
  `workboard_board_delete` 管理持久化的看板元数据，例如显示名称、
  描述、归档状态和默认工作区。
- `workboard_runs` 返回存储在卡片上的持久化运行尝试历史记录。
- `workboard_specify` 将粗略的分类或积压卡片转换为明确的
  `todo` 卡片，并将规范摘要记录在卡片上。
- `workboard_decompose` 将父编排卡片扩展为链接的子卡片，
  继承看板和租户元数据，并可以使用创建的卡片清单来完成父卡片。
- `workboard_notify_subscribe`、`workboard_notify_list`、
  `workboard_notify_events`、`workboard_notify_advance` 和
  `workboard_notify_unsubscribe` 管理插件状态中的通知订阅。事件读取是重放安全的；advance 工具移动持久化游标，
  以便调用者可以恢复而不会丢失或重复读取已完成、失败或
  陈旧的卡片事件。
- `workboard_boards`、`workboard_stats`、`workboard_promote`、
  `workboard_reassign`、`workboard_reclaim`、`workboard_comment`、
  `workboard_proof`、`workboard_unblock` 和 `workboard_dispatch` 允许代理
  检查看板命名空间、查看队列统计信息、恢复卡住的工作、添加交接
  说明、附加证据或项目引用、将受阻的工作移回 `todo`，
  并推动依赖项提升或陈旧声明的清理。

已声明的卡片会拒绝来自其他代理的代理工具变更，除非调用者
拥有 `workboard_claim` 返回的声明令牌。仪表板操作员仍使用
普通 Gateway(网关) RPC 表面，并可以恢复或重新分配卡片。

Workboard 将持久的看板数据存储在插件拥有的关系型 SQLite 数据库中，该数据库位于 OpenClaw 状态目录下。看板、卡片、标签、生命周期事件、运行尝试、评论、依赖链接、证明、工件引用、附件元数据和二进制大对象、诊断、通知、Worker 日志、协议状态和订阅都持久化在 Workboard 表中，而不是插件的键值条目中。卡片导出仍然保留看板叙述，而无需内联附件二进制大对象内容。

在 `.28` 版本中使用了 Workboard 的安装可以运行 `openclaw doctor --fix`，将附带的旧版插件状态命名空间（`workboard.cards`、`workboard.boards` 和 `workboard.notify`）迁移到关系型数据库中。如果存在旧的 `workboard.attachments` 命名空间，doctor 也会迁移这些附件二进制大对象。

Workboard 诊断是根据本地卡片元数据计算的。内置检查会标记等待时间过长的已分配卡片、没有最近心跳的运行中卡片、需要注意的受阻卡片、重复失败、没有证明的已完成卡片，以及只有松散会话链接的运行中卡片。

Dispatch 专门针对 Gateway(网关) 本地。它不会生成任意的操作系统进程；正常的 OpenClaw 子代理会话仍然拥有执行权。Dispatch 操作会提升依赖就绪的卡片，在就绪卡片上记录调度元数据，阻止过期的声明或超时的运行，将看板配置的分类卡片标记为编排候选者，然后声明一小批就绪卡片并通过 Gateway(网关) 子代理运行时启动 Worker 运行。已分配的卡片使用 `agent:<id>:subagent:workboard-*` Worker 会话密钥；未分配的卡片使用未限定范围的 `subagent:workboard-*` 密钥，以便 Gateway(网关) 仍然解析配置的默认代理。Worker 获得受限的卡片上下文以及它们需要通过 Workboard 工具进行心跳、完成或阻止卡片的声明令牌。

### Dispatch Worker 选择

默认情况下，每次调度最多启动三个工作线程。就绪卡片按优先级、位置和创建时间排序，然后进行过滤以避免重复的活跃所有权。在同一次调度中，对于给定的所有者或代理，仅启动一张卡片，并且会跳过看板上已有运行中或审查工作的所有者。

已归档的卡片、具有活跃声明的卡片以及没有 `ready` 状态的卡片不会被选中用于启动工作线程。当过时的声明、依赖项提升或超时清理生效时，它们仍可能受到调度数据端的影响。

### 工作线程提示和生命周期

工作线程提示包括卡片标题、受限的注释和上下文、指定的看板以及 Workboard 工作线程协议。它还包括声明所有者和声明令牌，以便工作线程可以在没有其他参与者接管卡片的情况下调用 `workboard_heartbeat`、`workboard_complete` 或 `workboard_block`。

当工作线程成功启动时，Workboard 会在卡片上存储会话密钥、运行 ID、引擎、模式、模型标签、状态和工作线程日志。会话密钥对于看板和卡片是确定性的，这使得重复调度会路由回同一个工作线程通道，而不是创建不相关的会话。

如果卡片被声明后无法启动工作线程，Workboard 将阻止该卡片，清除声明，记录启动失败，并追加一行工作线程日志。该失败在仪表板、CLI JSON、代理工具和卡片诊断中可见。

### 调度入口点

就绪卡片的工作线程启动可以来自：

- 仪表板调度操作
- `openclaw workboard dispatch`
- 支持命令的渠道上的 `/workboard dispatch`

当 Gateway(网关) 可用时，所有三个入口点都使用 Gateway(网关) 子代理运行时。CLI 有一个额外的操作员回退机制：如果 Gateway(网关) 离线或未公开 Workboard 调度方法，且未提供明确的 `--url` 或 `--token` 目标，它将针对本地 SQLite 状态运行仅数据调度。该回退机制可以提升依赖项、清除过时的声明并阻止超时的运行，但无法启动工作线程。

看板元数据可以包含编排设置，例如 `autoDecompose`、
`autoDecomposePerDispatch`、`defaultAssignee` 和 `orchestratorProfile`。
OpenClaw 记录编排意图并在 worker 上下文中公开它；
实际的规范和分解仍然通过正常的 Workboard 工具进行。

## CLI 和斜杠命令

该插件注册了一个根 CLI 命令：

```bash
openclaw workboard list
openclaw workboard create "Fix stale card lifecycle" --priority high --labels bug,workboard
openclaw workboard show <card-id>
openclaw workboard dispatch
```

`openclaw workboard dispatch` 调用正在运行的 Gateway(网关)，以便 worker 启动时使用与仪表板相同的子代理运行时。
如果 Gateway(网关) 不可用，它将回退到仅数据调度，因此依赖提升、过期声明清理
和超时阻塞仍可运行。身份验证、权限和验证失败仍会作为命令错误显示，
明确的 `--url` 或 `--token` 目标失败也是如此。

`/workboard` 斜杠命令支持相同的紧凑操作路径：
`/workboard list`、`/workboard show <card-id>`、`/workboard create <title>` 和
`/workboard dispatch`。List 和 show 是针对授权命令发送者的读取操作。
Create 和 dispatch 要求在聊天表面上具有所有者状态，或者是具有 `operator.write` 或 `operator.admin` 的 Gateway(网关) 客户端。

有关命令标志、JSON 输出、CLI
回退行为、无歧义 id 前缀处理、调度选择规则和
故障排除，请参阅 [Workboard Gateway(网关)](/zh/cli/workboard)。

## 会话生命周期同步

卡片可以链接到现有的仪表板会话，或者链接到您从卡片启动工作时创建的会话。
链接的卡片会内联显示会话生命周期：运行中、陈旧、链接空闲、完成、失败或丢失。

如果链接的会话丢失，卡片将保持链接状态以提供上下文，并且仍然提供启动控件，
以便您可以将工作重新启动到新的仪表板会话中。
如果一个活动的链接会话停止报告最近的活动，Workboard 会将该卡片标记为陈旧，
并将标记存储为卡片元数据，直到生命周期清除它。

您还可以通过 Sessions（会话）选项卡中的 Add to Workboard（添加到工作板）来捕获现有的仪表板会话。该卡片链接到该会话，使用会话标签或最近用户提示词作为标题，并在有聊天历史记录时，从最近用户提示词和最新的助手回复中提取备注。

当卡片仍处于活跃工作状态时，工作板会跟随链接的会话：

- 活跃的链接会话 -> `running`
- 已完成的链接会话 -> `review`
- 失败、被终止、超时或中止的链接会话 -> `blocked`

手动审核状态优先。如果您将卡片移动到 `review`、`blocked` 或 `done`，工作板将停止自动移动该卡片，直到您将其移回 `todo` 或 `running`。

## 仪表板工作流

1. 在 Control UI（控制界面）中打开 Workboard（工作板）选项卡。
2. 创建一个包含标题、备注、优先级、标签、可选 agent（代理）和可选链接会话的卡片。
3. 或者打开 Sessions（会话）并为现有会话选择 Add to Workboard（添加到工作板）。
4. 在列之间拖动卡片或使用列控件。
5. 从卡片开始工作以创建或重用仪表板会话。
6. 在代理工作时，从卡片打开链接的会话。
7. 让生命周期同步将正在运行的工作移动到审核或受阻状态，然后在接受时手动将卡片移动到已完成。

启动卡片使用常规 Gateway(网关) 会话。Workboard 插件仅存储卡片元数据和链接；对话记录、模型选择和运行生命周期仍由常规会话系统拥有。

在活动的链接卡片上使用 Stop（停止）以中止活动的会话运行。Workboard 会将该卡片标记为 `blocked`，以便其在后续跟进中保持可见。

新卡片可以从 Workboard 模板开始，用于错误修复、文档、发布、PR 审查或插件工作。模板会预填充标题、备注、标签和优先级，并且所选模板 id 会存储为卡片元数据。

## 权限

该插件在 `workboard.*` 命名空间下注册 Gateway(网关) RPC 方法：

- `workboard.cards.list` 需要 `operator.read`
- `workboard.cards.export` 需要 `operator.read`
- `workboard.cards.diagnostics` 需要 `operator.read`
- `workboard.cards.diagnostics.refresh` 需要 `operator.write`
- 附件列表/获取和通知事件读取需要 `operator.read`
- 通知游标前移需要 `operator.write`
- 创建、更新、移动、删除、评论、链接、依赖链接、证明、产物、
  附件添加/删除、工作日志、协议违规、认领、心跳、
  释放、完成、阻止、取消阻止、分发、批量 和归档方法需要
  `operator.write`

具有只读操作员访问权限的浏览器可以查看看板，但无法修改卡片。

## 配置

Workboard 目前没有特定的插件配置。使用标准插件条目启用或禁用它：

```json5
{
  plugins: {
    entries: {
      workboard: {
        enabled: true,
        config: {},
      },
    },
  },
}
```

再次禁用它，使用：

```bash
openclaw plugins disable workboard
openclaw gateway restart
```

## 故障排除

### 选项卡显示 Workboard 不可用

检查插件策略：

```bash
openclaw plugins inspect workboard --runtime --json
```

如果配置了 `plugins.allow`，请将 `workboard` 添加到该允许列表中。如果
`plugins.deny` 包含 `workboard`，请在启用插件之前将其移除。

### 卡片无法保存

确认浏览器连接具有 `operator.write` 访问权限。只读操作员
会话可以列出卡片，但无法创建、编辑、移动或删除它们。

### 启动卡片未打开预期的会话

Workboard 创建指向普通仪表板会话的链接。检查卡片的 agent id
和链接的会话，然后打开会话或聊天视图以检查实际
运行状态。

### 分发未启动工作器

确认至少有一张没有活动认领的 `ready` 卡片：

```bash
openclaw workboard list --status ready
```

如果 CLI 报告仅数据分发，请启动或重启 Gateway(网关) 并重试。
仅数据分发会更新本地看板状态，但无法启动子代理工作器
运行。

当同一所有者或代理的另一张卡片
正在运行或等待审查时，也可能跳过卡片。在为同一所有者
分发更多工作之前，请完成、阻止或释放该活动
工作。

## 相关

- [Control UI](/zh/web/control-ui)
- [Workboard CLI](/zh/cli/workboard)
- [插件](/zh/tools/plugin)
- [管理插件](/zh/plugins/manage-plugins)
- [会话](/zh/concepts/session)
