---
summary: "用于代理拥有的卡片和会话交接的可选仪表板工作板"
read_when:
  - You want a Kanban-style workboard in the Control UI
  - You are enabling or disabling the bundled Workboard plugin
  - You want to track planned agent work without an external project manager
title: "Workboard 插件"
---

Workboard 插件向[Control UI](/zh/web/control-ui)添加了一个可选的看板风格的板。使用它来收集适合代理的工作卡片，将其分配给代理，并从卡片跳转到链接的仪表板会话。

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
- 状态：`backlog`、`todo`、`running`、`review`、`blocked` 或 `done`
- 优先级：`low`、`normal`、`high` 或 `urgent`
- 标签
- 可选的代理 ID
- 可选的链接会话、运行、任务或源 URL
- 从卡片启动的 Codex 或 Claude 会话的可选执行元数据
- 针对尝试、评论、链接、证明、模板、存档状态和陈旧会话检测的紧凑元数据
- 最近的卡片事件，如已创建、已移动、已链接、尝试、证明、存档、陈旧或代理更新的更改

卡片存储在插件的 Gateway(网关) 状态中。它们对于 Gateway(网关) 状态目录来说是本地的，并随该 Gateway(网关) 的其余 OpenClaw 状态一起移动。

Workboard 为每张卡片保留紧凑的元数据，以便操作员无需打开关联的会话即可查看卡片在看板上的移动过程。事件、尝试摘要、代码片段、相关链接、评论、归档标记和陈旧会话标记均属于本地元数据；它们不能替代会话记录或 GitHub issue history。

## 卡片执行

未链接的卡片可以直接从卡片开始工作。开始操作使用 Gateway(网关) 配置的默认代理和模型。Codex 和 Claude 操作是可选的显式模型选择：

- 运行 Codex 或运行 Claude 会创建一个仪表板会话，发送卡片提示，并将卡片标记为 `running`。
- 打开 Codex 或打开 Claude 会创建一个链接的仪表板会话，而不发送卡片提示或移动卡片，因此您可以在卡片保持附加到看板的同时手动工作。

执行元数据在卡片上存储所选引擎、模式、模型引用、会话密钥、运行 ID 和生命周期状态。Codex 执行使用 `openai/gpt-5.5`；Claude 执行使用 `anthropic/claude-sonnet-4-6`。

每个链接的执行还会在同一张卡片记录上记录一个尝试摘要。尝试摘要包含引擎、模式、模型、运行 ID、时间戳、状态和滚动失败计数，以便在看板上持续显示重复的失败。

## 会话生命周期同步

卡片可以链接到现有的仪表板会话，也可以链接到从卡片开始工作时创建的会话。链接的卡片会内联显示会话生命周期：运行中、陈旧、链接闲置、已完成、失败或缺失。

如果链接的会话缺失，卡片会保持链接状态以提供上下文，并且仍然提供开始控件，以便您可以将工作重新启动到新的仪表板会话中。如果一个活动的链接会话停止报告最近的活动，Workboard 会将卡片标记为陈旧，并将标记存储为卡片元数据，直到生命周期将其清除。

您还可以使用“添加到 Workboard”从“会话”选项卡中捕获现有的仪表板会话。卡片链接到该会话，使用会话标签或最近的用户提示作为标题，并在可用聊天历史记录时，从最近的用户提示和最新的助手响应中提取笔记作为种子。

当卡片仍处于活动工作状态时，Workboard 会跟踪链接的会话：

- 活动关联会话 -> `running`
- 已完成关联会话 -> `review`
- 失败、被终止、超时或中止的关联会话 -> `blocked`

人工审核状态优先。如果您将卡片移动到 `review`、`blocked` 或 `done`，
Workboard 将停止自动移动该卡片，直到您将其移回 `todo` 或
`running`。

## 仪表板工作流

1. 在 Control UI 中打开 Workboard 标签页。
2. 创建包含标题、备注、优先级、标签、可选代理以及
   可选关联会话的卡片。
3. 或者打开会话 (Sessions) 并为现有会话选择 Add to Workboard。
4. 在列之间拖动卡片或使用列控制。
5. 从卡片开始工作以创建或重用仪表板会话。
6. 在代理工作时，从卡片打开关联会话。
7. 让生命周期同步将进行中的工作移至审核或受阻状态，然后在接受时手动
   将卡片移至完成 (done)。

启动卡片使用正常的 Gateway 会话。Workboard 插件仅存储
卡片元数据和链接；对话记录、模型选择和运行
生命周期仍由常规会话系统拥有。

在实时关联卡片上使用 Stop 以中止活动会话运行。Workboard 会将该
卡片标记为 `blocked`，以便其保持可见以供跟进。

新卡片可以从 Workboard 模板开始，用于错误修复、文档、发布、PR
审查或插件工作。模板会预填充标题、备注、标签和优先级，
并且所选模板 id 将作为卡片元数据存储。

## 权限

该插件在 Gateway(网关)RPC`workboard.*` 命名空间下注册 Gateway RPC 方法：

- `workboard.cards.list` 需要 `operator.read`
- `workboard.cards.export` 需要 `operator.read`
- 创建、更新、移动、删除、评论、链接、证明和归档方法需要 `operator.write`

具有只读操作员访问权限连接的浏览器可以查看看板，
但无法更改卡片。

## 配置

Workboard 目前没有特定于插件的配置。使用
标准插件条目启用或禁用它：

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

使用以下命令再次禁用它：

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

如果配置了 `plugins.allow`，请将 `workboard` 添加到该允许列表中。如果 `plugins.deny` 包含 `workboard`，请在启用插件之前将其移除。

### 卡片未保存

确认浏览器连接具有 `operator.write` 访问权限。只读操作员会话可以列出卡片，但无法创建、编辑、移动或删除它们。

### 启动卡片未打开预期的会话

Workboard 会创建指向正常仪表板会话的链接。请检查卡片的代理 ID 和链接的会话，然后打开会话或聊天视图以检查实际的运行状态。

## 相关

- [Control UI](/zh/web/control-ui)
- [插件](/zh/tools/plugin)
- [管理插件](/zh/plugins/manage-plugins)
- [会话](/zh/concepts/session)
