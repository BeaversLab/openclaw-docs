---
title: "技能工作坊插件"
summary: "实验性捕获可重用程序作为工作区技能，包含审查、批准、隔离和热技能刷新"
read_when:
  - You want agents to turn corrections or reusable procedures into workspace skills
  - You are configuring procedural skill memory
  - You are debugging skill_workshop tool behavior
  - You are deciding whether to enable automatic skill creation
---

# 技能工作坊插件

技能工作坊（Skill Workshop）处于**实验性**阶段。默认情况下它是禁用的，其捕获启发式和审查器提示可能会在版本之间发生变化，并且仅应在首先审查待定模式输出后，在受信任的工作区中使用自动写入。

技能工作坊是工作区技能的程序性记忆。它允许智能体将可重用的工作流程、用户更正、来之不易的修复和反复出现的陷阱转换为 `SKILL.md` 文件，存储在以下位置：

```text
<workspace>/skills/<skill-name>/SKILL.md
```

这与长期记忆不同：

- **记忆**存储事实、偏好、实体和过去的上下文。
- **Skills** 存储代理在未来的任务中应该遵循的可重用程序。
- **Skill Workshop** 是从有用的对话转变为持久的工作区技能的桥梁，具有安全检查和可选的审批功能。

当代理学习以下程序时，Skill Workshop 非常有用：

- 如何验证外部来源的动态 GIF 资源
- 如何替换截图资源并验证尺寸
- 如何运行特定于仓库的 QA 场景
- 如何调试反复出现的提供商故障
- 如何修复过时的本地工作流程笔记

它不适用于：

- 诸如“用户喜欢蓝色”之类的事实
- 广泛的自传式记忆
- 原始对话记录归档
- 机密、凭据或隐藏的提示文本
- 一次性且不会重复的指令

## 默认状态

此捆绑插件是 **实验性** 的，且默认处于 **禁用状态**，除非在 `plugins.entries.skill-workshop` 中明确启用。

该插件清单未设置 `enabledByDefault: true`。插件配置架构内的 `enabled: true` 默认值仅在插件条目已被选中并加载后才适用。

实验性意味着：

- 该插件已具备足够的支持度，可供选择加入测试和内部使用
- 提案存储、审核器阈值和捕获启发式方法可能会发生变化
- 待审核模式是推荐的起始模式
- 自动应用仅适用于受信任的个人/工作区设置，不适用于共享或充满恶意输入的环境

## 启用

最小安全配置：

```json5
{
  plugins: {
    entries: {
      "skill-workshop": {
        enabled: true,
        config: {
          autoCapture: true,
          approvalPolicy: "pending",
          reviewMode: "hybrid",
        },
      },
    },
  },
}
```

使用此配置：

- `skill_workshop` 工具可用
- 明确可重用的更正将作为待审核提案排队
- 基于阈值的审核器通过可以提议技能更新
- 在应用待审核提案之前，不会写入任何技能文件

仅在受信任的工作区中使用自动写入：

```json5
{
  plugins: {
    entries: {
      "skill-workshop": {
        enabled: true,
        config: {
          autoCapture: true,
          approvalPolicy: "auto",
          reviewMode: "hybrid",
        },
      },
    },
  },
}
```

`approvalPolicy: "auto"` 仍使用相同的扫描程序和隔离路径。它不会应用具有关键发现的提案。

## 配置

| 键                   | 默认值      | 范围 / 值                                   | 含义                                                 |
| -------------------- | ----------- | ------------------------------------------- | ---------------------------------------------------- |
| `enabled`            | `true`      | 布尔值                                      | 在加载插件条目后启用该插件。                         |
| `autoCapture`        | `true`      | 布尔值                                      | 在成功的智能体轮次后启用轮次后捕获/审查。            |
| `approvalPolicy`     | `"pending"` | `"pending"`, `"auto"`                       | 将提案加入队列或自动写入安全提案。                   |
| `reviewMode`         | `"hybrid"`  | `"off"`, `"heuristic"`, `"llm"`, `"hybrid"` | 选择显式更正捕获、LLM 审查者、两者皆有，或两者皆无。 |
| `reviewInterval`     | `15`        | `1..200`                                    | 在此多次成功的轮次后运行审查者。                     |
| `reviewMinToolCalls` | `8`         | `1..500`                                    | 在此多次观察到的工具调用后运行审查者。               |
| `reviewTimeoutMs`    | `45000`     | `5000..180000`                              | 嵌入式审查者运行的超时时间。                         |
| `maxPending`         | `50`        | `1..200`                                    | 每个工作区保留的最大待处理/隔离提案数。              |
| `maxSkillBytes`      | `40000`     | `1024..200000`                              | 生成的技能/支持文件的最大大小。                      |

推荐的配置文件：

```json5
// Conservative: explicit tool use only, no automatic capture.
{
  autoCapture: false,
  approvalPolicy: "pending",
  reviewMode: "off",
}
```

```json5
// Review-first: capture automatically, but require approval.
{
  autoCapture: true,
  approvalPolicy: "pending",
  reviewMode: "hybrid",
}
```

```json5
// Trusted automation: write safe proposals immediately.
{
  autoCapture: true,
  approvalPolicy: "auto",
  reviewMode: "hybrid",
}
```

```json5
// Low-cost: no reviewer LLM call, only explicit correction phrases.
{
  autoCapture: true,
  approvalPolicy: "pending",
  reviewMode: "heuristic",
}
```

## 捕获路径

技能工作坊有三种捕获路径。

### 工具建议

当模型看到可重用流程或用户要求其保存/更新技能时，可以直接调用 `skill_workshop`。

这是最明确的路径，即使启用了 `autoCapture: false` 也能工作。

### 启发式捕获

当启用 `autoCapture` 且 `reviewMode` 为 `heuristic` 或 `hybrid` 时，该插件会扫描成功的轮次以查找明确的用户更正短语：

- `next time`
- `from now on`
- `remember to`
- `make sure to`
- `always ... use/check/verify/record/save/prefer`
- `prefer ... when/for/instead/use`
- `when asked`

启发式方法根据最新的匹配用户指令创建提案。它使用主题提示为常见的工作流选择技能名称：

- 动画 GIF 任务 -> `animated-gif-workflow`
- 截图或资源任务 -> `screenshot-asset-workflow`
- QA 或场景任务 -> `qa-scenario-workflow`
- GitHub PR 任务 -> `github-pr-workflow`
- 回退 -> `learned-workflows`

启发式捕获是有意限制范围的。它适用于明确的更正和可重复的流程说明，而非用于一般的记录摘要。

### LLM 审查者

当启用 `autoCapture` 且 `reviewMode` 为 `llm` 或 `hybrid` 时，插件会在达到阈值后运行一个紧凑的嵌入式审查者。

审查者接收：

- 最近的记录文本，上限为最后 12,000 个字符
- 最多 12 个现有的工作区技能
- 来自每个现有技能的最多 2,000 个字符
- 仅限 JSON 的指令

审核者没有工具：

- `disableTools: true`
- `toolsAllow: []`
- `disableMessageTool: true`

它可以返回：

```json
{ "action": "none" }
```

或一个技能提案：

```json
{
  "action": "create",
  "skillName": "media-asset-qa",
  "title": "Media Asset QA",
  "reason": "Reusable animated media acceptance workflow",
  "description": "Validate externally sourced animated media before product use.",
  "body": "## Workflow\n\n- Verify true animation.\n- Record attribution.\n- Store a local approved copy.\n- Verify in product UI before final reply."
}
```

它还可以追加到现有技能：

```json
{
  "action": "append",
  "skillName": "qa-scenario-workflow",
  "title": "QA Scenario Workflow",
  "reason": "Animated media QA needs reusable checks",
  "description": "QA scenario workflow.",
  "section": "Workflow",
  "body": "- For animated GIF tasks, verify frame count and attribution before passing."
}
```

或替换现有技能中的确切文本：

```json
{
  "action": "replace",
  "skillName": "screenshot-asset-workflow",
  "title": "Screenshot Asset Workflow",
  "reason": "Old validation missed image optimization",
  "oldText": "- Replace the screenshot asset.",
  "newText": "- Replace the screenshot asset, preserve dimensions, optimize the PNG, and run the relevant validation gate."
}
```

当相关技能已存在时，优先使用 `append` 或 `replace`。仅当没有现有技能适合时才使用 `create`。

## 提案生命周期

每个生成的更新都会变成一个提案，包含：

- `id`
- `createdAt`
- `updatedAt`
- `workspaceDir`
- 可选的 `agentId`
- 可选的 `sessionId`
- `skillName`
- `title`
- `reason`
- `source`： `tool`、 `agent_end` 或 `reviewer`
- `status`
- `change`
- 可选 `scanFindings`
- 可选 `quarantineReason`

提案状态：

- `pending` - 等待批准
- `applied` - 已写入 `<workspace>/skills`
- `rejected` - 被操作员/模型拒绝
- `quarantined` - 被关键扫描器发现阻止

状态按工作区存储在 Gateway 状态目录下：

```text
<stateDir>/skill-workshop/<workspace-hash>.json
```

待处理和隔离的提案会根据技能名称和更改内容去重。存储会保留最新的待处理/隔离提案，最多 `maxPending` 个。

## 工具 参考

该插件注册了一个代理工具：

```text
skill_workshop
```

### `status`

按状态统计当前工作区的提案数量。

```json
{ "action": "status" }
```

结果形状：

```json
{
  "workspaceDir": "/path/to/workspace",
  "pending": 1,
  "quarantined": 0,
  "applied": 3,
  "rejected": 0
}
```

### `list_pending`

列出待处理的提案。

```json
{ "action": "list_pending" }
```

要列出其他状态：

```json
{ "action": "list_pending", "status": "applied" }
```

有效的 `status` 值：

- `pending`
- `applied`
- `rejected`
- `quarantined`

### `list_quarantine`

列出隔离的提案。

```json
{ "action": "list_quarantine" }
```

当自动捕获似乎没有执行任何操作，并且日志中提到 `skill-workshop: quarantined <skill>` 时，请使用此功能。

### `inspect`

按 ID 获取提案。

```json
{
  "action": "inspect",
  "id": "proposal-id"
}
```

### `suggest`

创建提案。使用 `approvalPolicy: "pending"` 时，默认会排队。

```json
{
  "action": "suggest",
  "skillName": "animated-gif-workflow",
  "title": "Animated GIF Workflow",
  "reason": "User established reusable GIF validation rules.",
  "description": "Validate animated GIF assets before using them.",
  "body": "## Workflow\n\n- Verify the URL resolves to image/gif.\n- Confirm it has multiple frames.\n- Record attribution and license.\n- Avoid hotlinking when a local asset is needed."
}
```

强制安全写入：

```json
{
  "action": "suggest",
  "apply": true,
  "skillName": "animated-gif-workflow",
  "description": "Validate animated GIF assets before using them.",
  "body": "## Workflow\n\n- Verify true animation.\n- Record attribution."
}
```

即使在 `approvalPolicy: "auto"` 中也强制挂起：

```json
{
  "action": "suggest",
  "apply": false,
  "skillName": "screenshot-asset-workflow",
  "description": "Screenshot replacement workflow.",
  "body": "## Workflow\n\n- Verify dimensions.\n- Optimize the PNG.\n- Run the relevant gate."
}
```

追加到章节：

```json
{
  "action": "suggest",
  "skillName": "qa-scenario-workflow",
  "section": "Workflow",
  "description": "QA scenario workflow.",
  "body": "- For media QA, verify generated assets render and pass final assertions."
}
```

替换精确文本：

```json
{
  "action": "suggest",
  "skillName": "github-pr-workflow",
  "oldText": "- Check the PR.",
  "newText": "- Check unresolved review threads, CI status, linked issues, and changed files before deciding."
}
```

### `apply`

应用待处理的提案。

```json
{
  "action": "apply",
  "id": "proposal-id"
}
```

`apply` 拒绝隔离的提案：

```text
quarantined proposal cannot be applied
```

### `reject`

标记提案为已拒绝。

```json
{
  "action": "reject",
  "id": "proposal-id"
}
```

### `write_support_file`

在现有或提议的技能目录内写入支持文件。

允许的顶级支持目录：

- `references/`
- `templates/`
- `scripts/`
- `assets/`

示例：

```json
{
  "action": "write_support_file",
  "skillName": "release-workflow",
  "relativePath": "references/checklist.md",
  "body": "# Release Checklist\n\n- Run release docs.\n- Verify changelog.\n"
}
```

支持文件受工作区范围限制、经过路径检查、受 `maxSkillBytes` 字节限制、经过扫描并原子化写入。

## 技能写入

Skill Workshop 仅在以下位置写入：

```text
<workspace>/skills/<normalized-skill-name>/
```

技能名称已标准化：

- 转换为小写
- 非 `[a-z0-9_-]` 运行变为 `-`
- 删除前导和尾随的非字母数字字符
- 最大长度为 80 个字符
- 最终名称必须匹配 `[a-z0-9][a-z0-9_-]{1,79}`

对于 `create`：

- 如果技能不存在，Skill Workshop 会写入一个新的 `SKILL.md`
- 如果已存在，Skill Workshop 会将正文追加到 `## Workflow`

对于 `append`：

- 如果技能存在，Skill Workshop 会追加到请求的章节
- 如果不存在，Skill Workshop 会创建一个最小技能然后追加

对于 `replace`：

- 该技能必须已存在
- `oldText` 必须准确存在
- 仅替换第一个精确匹配项

所有写入操作都是原子的，并且会立即刷新内存中的技能快照，因此无需重启 Gateway(网关) 即可使新创建或更新的技能可见。

## 安全模型

Skill Workshop 对生成的 `SKILL.md` 内容和支持文件具有安全扫描功能。

严重发现会隔离提案：

| 规则 ID                                | 阻止的内容...                                             |
| -------------------------------------- | --------------------------------------------------------- |
| `prompt-injection-ignore-instructions` | 指示代理忽略先前/更高级别的指令                           |
| `prompt-injection-system`              | 引用系统提示词、开发者消息或隐藏指令                      |
| `prompt-injection-tool`                | 鼓励绕过工具权限/批准                                     |
| `shell-pipe-to-shell`                  | 包括通过管道传输到 `sh`、`bash` 或 `zsh` 的 `curl`/`wget` |
| `secret-exfiltration`                  | 似乎通过网络发送环境/进程环境数据                         |

警告发现会被保留，但它们本身不会阻止操作：

| 规则 ID              | 对...发出警告              |
| -------------------- | -------------------------- |
| `destructive-delete` | 广泛的 `rm -rf` 风格命令   |
| `unsafe-permissions` | `chmod 777` 风格的权限使用 |

隔离的提案：

- 保留 `scanFindings`
- 保留 `quarantineReason`
- 出现在 `list_quarantine` 中
- 无法通过 `apply` 应用

要从隔离的提案中恢复，请创建一个新的安全提案并移除不安全的内容。请勿手动编辑存储 JSON。

## 提示词指导

启用后，Skill Workshop 会注入一个简短的提示词部分，告诉代理使用 `skill_workshop` 作为持久的过程性记忆。

该指导强调：

- 过程，而非事实/偏好
- 用户更正
- 非显而易见的成功流程
- 反复出现的陷阱
- 通过追加/替换修复过时/单薄/错误的技能
- 在长时间工具循环或艰难修复后保存可重用流程
- 简短的命令式技能文本
- 无转录转储

写入模式文本随 `approvalPolicy` 变化：

- 待定模式：队列建议；仅在明确批准后应用
- 自动模式：在明确可重用时应用安全的工作区技能更新

## 成本与运行时行为

启发式捕获不调用模型。

LLM 审查使用活动/默认代理模型上的嵌入式运行。它是基于阈值的，因此默认情况下不会在每个回合运行。

审查器：

- 在可用时使用相同的配置提供商/模型上下文
- 回退到运行时代理默认值
- 具有 `reviewTimeoutMs`
- 使用轻量级引导上下文
- 没有工具
- 不直接写入任何内容
- 只能发出通过正常扫描器和批准/隔离路径的提案

如果审查者失败、超时或返回无效的 JSON，插件会记录警告/调试消息并跳过该审查轮次。

## 操作模式

当用户说以下内容时，使用 Skill Workshop：

- “下次做 X”
- “从现在起，优先选择 Y”
- “确保验证 Z”
- “将其保存为工作流”
- “这花了一些时间；记住这个过程”
- “更新此处的本地技能”

良好的技能文本：

```markdown
## Workflow

- Verify the GIF URL resolves to `image/gif`.
- Confirm the file has multiple frames.
- Record source URL, license, and attribution.
- Store a local copy when the asset will ship with the product.
- Verify the local asset renders in the target UI before final reply.
```

较差的技能文本：

```markdown
The user asked about a GIF and I searched two websites. Then one was blocked by
Cloudflare. The final answer said to check attribution.
```

不应保存较差版本的原因：

- 逐字稿形式的
- 非祈使语气
- 包含嘈杂的一次性细节
- 未告知下一个代理该做什么

## 调试

检查插件是否已加载：

```bash
openclaw plugins list --enabled
```

检查来自代理/工具上下文的提案计数：

```json
{ "action": "status" }
```

检查待处理的提案：

```json
{ "action": "list_pending" }
```

检查隔离的提案：

```json
{ "action": "list_quarantine" }
```

常见症状：

| 症状                       | 可能原因                                               | 检查                                                                |
| -------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------- |
| 工具不可用                 | 插件条目未启用                                         | `plugins.entries.skill-workshop.enabled` 和 `openclaw plugins list` |
| 未显示自动提案             | `autoCapture: false`、`reviewMode: "off"` 或未满足阈值 | 配置、提案状态、Gateway(网关) 日志                                  |
| 启发式未捕获               | 用户措辞与修正模式不匹配                               | 使用显式的 `skill_workshop.suggest` 或启用 LLM 审核器               |
| 审核器未创建提案           | 审核器返回 `none`、无效 JSON 或超时                    | Gateway(网关) 日志、`reviewTimeoutMs`、阈值                         |
| 提案未应用                 | `approvalPolicy: "pending"`                            | `list_pending`，然后 `apply`                                        |
| 提案从待处理中消失         | 重复提案被重用、达到最大待处理修剪或已被应用/拒绝/隔离 | `status`, 带有状态筛选器的 `list_pending`, `list_quarantine`        |
| 技能文件存在但模型未检测到 | 技能快照未刷新或技能门控将其排除                       | `openclaw skills` 状态和工作区技能资格                              |

相关日志：

- `skill-workshop: queued <skill>`
- `skill-workshop: applied <skill>`
- `skill-workshop: quarantined <skill>`
- `skill-workshop: heuristic capture skipped: ...`
- `skill-workshop: reviewer skipped: ...`
- `skill-workshop: reviewer found no update`

## QA 场景

基于仓库的 QA 场景：

- `qa/scenarios/plugins/skill-workshop-animated-gif-autocreate.md`
- `qa/scenarios/plugins/skill-workshop-pending-approval.md`
- `qa/scenarios/plugins/skill-workshop-reviewer-autonomous.md`

运行确定性覆盖率：

```bash
pnpm openclaw qa suite \
  --scenario skill-workshop-animated-gif-autocreate \
  --scenario skill-workshop-pending-approval \
  --concurrency 1
```

运行审阅者覆盖率：

```bash
pnpm openclaw qa suite \
  --scenario skill-workshop-reviewer-autonomous \
  --concurrency 1
```

审阅者场景是特意分开的，因为它启用了
`reviewMode: "llm"` 并执行了嵌入式审阅传递。

## 何时不启用自动应用

在以下情况避免使用 `approvalPolicy: "auto"`：

- 工作区包含敏感程序
- Agent 正在处理不受信任的输入
- Skills 在广泛的团队中共享
- 您仍在调整提示词或扫描器规则
- 模型经常处理具有敌意的网络/电子邮件内容

首先使用待定模式。仅在审查 Agent 在该工作区中提议的 Skills 类型后，再切换到自动模式。

## 相关文档

- [Skills](/zh/tools/skills)
- [Plugins](/zh/tools/plugin)
- [Testing](/zh/reference/test)
