---
summary: "用于代理拥有的卡片和会话交接的可选仪表板工作板"
read_when:
  - You want a Kanban-style workboard in the Control UI
  - You are enabling or disabling the bundled Workboard plugin
  - You want to track planned agent work without an external project manager
title: "Workboard 插件"
---

Workboard 插件向[Control UI](/zh/web/control-ui)添加了一个可选的看板式面板。您可以使用它来收集适用于代理的工作卡片，将其分配给代理，并从卡片跳转到关联的仪表板会话。

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

Workboard 选项卡出现在仪表板导航中。如果该选项卡可见，但插件被禁用或被 `plugins.allow` / `plugins.deny` 阻止，则视图将显示插件不可用状态，而不是本地卡片数据。

## 卡片包含的内容

每张卡片存储：

- 标题和备注
- status（状态）：`triage`、`backlog`、`todo`、`scheduled`、`ready`、`running`、
  `review`、`blocked` 或 `done`
- priority（优先级）：`low`、`normal`、`high` 或 `urgent`
- 标签
- 可选的代理 ID
- 可选的链接会话、运行、任务或源 URL
- 从卡片启动的 Codex 或 Claude 会话的可选执行元数据
- 针对尝试、评论、链接、证明、制品、自动化、附件、Worker 日志、Worker 协议状态、认领、诊断、通知、模板、归档状态和陈旧会话检测的精简元数据
- 最近的卡片事件，例如已创建、已移动、已链接、已认领、心跳、尝试、证明、制品、诊断、通知、分发、归档、陈旧或代理更新的更改

卡片存储在插件的 Gateway(网关) 状态中。它们对于 Gateway(网关) 状态目录来说是本地的，并随该 Gateway(网关) 的其余 OpenClaw 状态一起移动。

Workboard 为每张卡片保留紧凑的元数据，以便操作员无需打开关联的会话即可查看卡片在看板上的移动过程。事件、尝试摘要、代码片段、相关链接、评论、归档标记和陈旧会话标记均属于本地元数据；它们不能替代会话记录或 GitHub issue history。

## 卡片执行

未链接的卡片可以直接从卡片开始工作。开始操作使用 Gateway(网关) 配置的默认代理和模型。Codex 和 Claude 操作是可选的显式模型选择：

- 运行 Codex 或运行 Claude 会创建一个仪表板会话，发送卡片提示，并将卡片标记为 `running`。
- 打开 Codex 或打开 Claude 会创建一个链接的仪表板会话，而不发送卡片提示或移动卡片，因此您可以在卡片保持附加到看板的同时手动工作。

执行元数据会在卡片上存储所选引擎、模式、模型引用、会话密钥、运行 ID 和生命周期状态。Codex 执行使用 `openai/gpt-5.5`；Claude 执行使用 `anthropic/claude-sonnet-4-6`。

每个链接的执行还会在同一张卡片记录上记录一个尝试摘要。尝试摘要包含引擎、模式、模型、运行 ID、时间戳、状态和滚动失败计数，以便在看板上持续显示重复的失败。

## 代理协调

Workboard 还公开了可选的代理工具，用于支持感知面板的工作流程：

- `workboard_list` 列出带有认领和诊断状态的精简卡片，并带有可选的面板筛选器。
- `workboard_read` 返回一张卡片以及由笔记、尝试、评论、链接、证明、制品、父结果、最近的指派者工作和活动诊断构建的有界 Worker 上下文。
- `workboard_create` 创建一张卡片，其中包含可选的父项、租户、技能、面板、工作区元数据、幂等密钥、运行时限制和重试预算。
- `workboard_link` 将父卡片与子卡片关联。子卡片将保留在 `todo`
  中，直到每个父卡片达到 `done`；然后调度升级会将它们移动到
  `ready`。
- `workboard_claim` 为调用代理声明一张卡片，并将积压、待办
  或就绪卡片移动到 `running`。
- `workboard_heartbeat` 在较长时间的运行期间刷新声明心跳。
- `workboard_release` 在完成、暂停或移交后释放声明，并
  可以将卡片移动到下一个状态。
- `workboard_complete` 和 `workboard_block` 是用于
  最终摘要、证明、工件、已创建卡片清单和阻塞
  原因的结构化生命周期工具。已创建卡片清单必须引用链接回
  已完成卡片的卡片，从而避免幽灵子卡片出现在摘要中。
- `workboard_attachment_add`、`workboard_attachment_read` 和
  `workboard_attachment_delete` 将小型卡片附件存储在插件 SQLite
  状态中，在卡片上对其进行索引，并在工作上下文中公开它们。
- `workboard_worker_log` 和 `workboard_protocol_violation` 记录工作日志
  行，并在自动化工作停止且未调用
  `workboard_complete` 或 `workboard_block` 时阻塞卡片。
- `workboard_board_create`、`workboard_board_archive` 和
  `workboard_board_delete` 管理持久化的看板元数据，例如显示名称、
  描述、归档状态和默认工作区。
- `workboard_runs` 返回存储在卡片上的持久化运行尝试历史。
- `workboard_specify` 将粗略的分诊或积压卡片转变为明确的
  `todo` 卡片，并在卡片上记录规范摘要。
- `workboard_decompose` 将父编排卡片扩展为链接的子卡片，
  继承看板和租户元数据，并可以使用已创建卡片清单来完成父卡片。
- `workboard_notify_subscribe`、`workboard_notify_list`、
  `workboard_notify_events`、`workboard_notify_advance` 和
  `workboard_notify_unsubscribe` 在插件状态中管理通知订阅。事件读取是重放安全的；advance 工具会移动持久化游标，
  以便调用者可以恢复而不会丢失或重复读取已完成、失败或过期的卡片事件。
- `workboard_boards`、`workboard_stats`、`workboard_promote`、
  `workboard_reassign`、`workboard_reclaim`、`workboard_comment`、
  `workboard_proof`、`workboard_unblock` 和 `workboard_dispatch` 允许智能体
  检查看板命名空间、查看队列统计信息、恢复卡住的工作、添加交接说明、附加证明或工件引用、将受阻的工作移回 `todo`，
  并促进依赖提升或过时声明的清理。

除非调用者拥有 `workboard_claim` 返回的声明令牌，否则已声明的卡片将拒绝来自其他智能体的 agent-工具 变更。仪表板操作员仍然使用
常规的 Gateway(网关) RPC 接口，并且可以恢复或重新分配卡片。

Workboard 将持久化的看板数据存储在 OpenClaw 状态目录下的插件拥有的关系型 SQLite 数据库
中。看板、卡片、标签、生命周期事件、
运行尝试、评论、依赖链接、证明、工件引用、
附件元数据和 blob、诊断、通知、工作日志、
协议状态和订阅都持久化在 Workboard 表中，而不是
插件的键值条目中。卡片导出仍然保留看板叙述，
而不会内联附件 blob 内容。

在 `.28` 版本中使用了 Workboard 的安装可以运行
`openclaw doctor --fix` 将附带的旧版插件状态命名空间
（`workboard.cards`、`workboard.boards` 和 `workboard.notify`）迁移到
关系型数据库中。如果存在旧的 `workboard.attachments` 命名空间，
doctor 也会迁移这些附件 blob。

Workboard 诊断是根据本地卡片元数据计算的。内置检查会标记等待时间过长的已分配卡片、近期无心跳的运行中卡片、需要关注的被阻止卡片、重复失败、无凭证的已完成卡片，以及仅存在松散会话链接的运行中卡片。

调度被有意限制为 Gateway(网关) 本地操作。它不会生成任意操作系统进程；正常的 OpenClaw 会话仍然拥有执行权。调度提示会提升依赖就绪的卡片，在就绪卡片上记录调度元数据，阻止过期的声明或超时的运行，将配置了看板的分诊卡片标记为编排候选者，并为调用者留下持久的通知订阅，以便传递通知。

看板元数据可以包含编排设置，例如 `autoDecompose`、`autoDecomposePerDispatch`、`defaultAssignee` 和 `orchestratorProfile`。OpenClaw 会记录编排意图并在工作线程上下文中公开它；实际的规范、分解或会话启动仍然通过正常的 Workboard 工具和仪表板会话流程进行。

## 会话生命周期同步

卡片可以链接到现有的仪表板会话，也可以链接到从卡片开始工作时创建的会话。链接的卡片会内联显示会话生命周期：运行中、陈旧、链接空闲、已完成、失败或丢失。

如果链接的会话丢失，卡片将保持链接状态以保留上下文，并且仍然提供启动控制，以便您可以重新启动工作进入一个新的仪表板会话。如果一个活动的链接会话停止报告近期活动，Workboard 会将卡片标记为陈旧，并将标记存储为卡片元数据，直到生命周期将其清除。

您也可以使用“添加到 Workboard”从“会话”选项卡捕获现有的仪表板会话。该卡片链接到该会话，使用会话标签或最近的用户提示作为标题，并在有聊天记录可用时，根据最近的用户提示加上最新的助手回复生成备注。

只要卡片仍处于活动工作状态，Workboard 就会跟踪链接的会话：

- 活动的链接会话 -> `running`
- 已完成的链接会话 -> `review`
- 失败、被终止、超时或中止的关联会话 -> `blocked`

人工审查状态优先。如果您将卡片移动到 `review`、`blocked` 或 `done`，
Workboard 将停止自动移动该卡片，直到您将其移回 `todo` 或
`running`。

## 仪表板工作流

1. 在 Control UI 中打开 Workboard 标签页。
2. 创建一张包含标题、备注、优先级、标签、可选代理（agent）以及
   可选关联会话的卡片。
3. 或者打开会话并为现有会话选择添加到 Workboard。
4. 在各列之间拖动卡片，或使用列控件。
5. 从卡片开始工作以创建或复用仪表板会话。
6. 在代理工作时，从卡片打开关联会话。
7. 让生命周期同步将正在运行的工作移至审查或阻塞状态，然后在验收通过后手动
   将卡片移动到完成状态。

启动卡片使用普通的 Gateway(网关) 会话。Workboard 插件仅存储
卡片元数据和链接；对话记录、模型选择和运行
生命周期仍由常规会话系统拥有。

在实时关联卡片上使用停止来中止活动的会话运行。Workboard 会将
该卡片标记为 `blocked`，以便其在后续跟进中保持可见。

新卡片可以从 Workboard 模板开始，用于错误修复、文档、发布、PR
审查或插件工作。模板会预填充标题、备注、标签和优先级，
并且所选模板 id 将作为卡片元数据存储。

## 权限

该插件在 `workboard.*` 命名空间下注册 Gateway(网关) RPC 方法：

- `workboard.cards.list` 需要 `operator.read`
- `workboard.cards.export` 需要 `operator.read`
- `workboard.cards.diagnostics` 需要 `operator.read`
- `workboard.cards.diagnostics.refresh` 需要 `operator.write`
- 附件列表/获取和通知事件读取需要 `operator.read`
- 通知光标前进需要 `operator.write`
- create, update, move, delete, comment, link, dependency link, proof, artifact,
  attachment add/delete, worker log, protocol violation, claim, heartbeat,
  release, complete, block, unblock, dispatch, bulk, and archive 方法需要
  `operator.write`

具有只读操作员访问权限的浏览器可以看板但无法变更卡片。

## 配置

Workboard 目前没有特定于插件的配置。通过标准插件条目启用或禁用它：

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

再次禁用它：

```bash
openclaw plugins disable workboard
openclaw gateway restart
```

## 故障排除

### 标签显示 Workboard 不可用

检查插件策略：

```bash
openclaw plugins inspect workboard --runtime --json
```

如果配置了 `plugins.allow`，请将 `workboard` 添加到该允许列表中。如果
`plugins.deny` 包含 `workboard`，请在启用插件之前将其删除。

### 卡片未保存

确认浏览器连接具有 `operator.write` 访问权限。只读操作员
会话可以列出卡片，但无法创建、编辑、移动或删除它们。

### 启动卡片未打开预期的会话

Workboard 会创建指向正常仪表板会话的链接。检查卡片的代理 ID
和链接的会话，然后打开会话或聊天视图以检查实际的
运行状态。

## 相关

- [Control UI](/zh/web/control-ui)
- [Plugins](/zh/tools/plugin)
- [Manage plugins](/zh/plugins/manage-plugins)
- [Sessions](/zh/concepts/session)
