---
summary: "将可重用流程作为工作区技能进行实验性捕获，具有审查、批准、隔离和热技能刷新功能"
title: "Skill workshop 插件"
read_when:
  - You want agents to turn corrections or reusable procedures into workspace skills
  - You are configuring procedural skill memory
  - You are debugging skill_workshop tool behavior
  - You are deciding whether to enable automatic skill creation
---

Skill Workshop 处于**实验性**阶段。默认情况下它是禁用的，其捕获
启发式方法和审查器提示可能会在版本之间发生变化，并且仅应在审查待定模式
输出后，在受信任的工作区中使用自动写入。

Skill Workshop 是工作区技能的过程性记忆。它允许代理将
可重用的工作流程、用户更正、来之不易的修复方法和反复出现的陷阱
转换为 `SKILL.md` 文件，位于：

```text
<workspace>/skills/<skill-name>/SKILL.md
```

这与长期记忆不同：

- **Memory** 存储事实、偏好、实体和过去的上下文。
- **Skills** 存储代理在未来任务中应遵循的可重用流程。
- **Skill Workshop** 是从一次有用的对话转变为持久的工作区
  技能的桥梁，具有安全检查和可选的批准流程。

当代理学习到如下流程时，Skill Workshop 会很有用：

- 如何验证外部来源的动画 GIF 资产
- 如何替换截图资产并验证尺寸
- 如何运行特定于仓库的 QA 场景
- 如何调试反复出现的提供商故障
- 如何修复过时的本地工作流笔记

它不适用于：

- 诸如“用户喜欢蓝色”之类的事实
- 广泛的自传式记忆
- 原始对话记录归档
- 机密、凭证或隐藏的提示文本
- 不会重复的一次性指令

## 默认状态

此内置插件处于**实验性**阶段，并且**默认禁用**，除非在 `plugins.entries.skill-workshop` 中明确启用。

插件清单未设置 `enabledByDefault: true`。插件配置架构内的 `enabled: true`
默认值仅在插件条目已被选中并加载后才适用。

实验性意味着：

- 该插件具有足够的支持度，可供选择加入测试和内部试用（dogfooding）
- 提案存储、审查器阈值和捕获启发式方法可能会演变
- 待批准是推荐的起始模式
- 自动应用适用于受信任的个人/工作区设置，不适用于共享或充满敌意
  输入繁重的环境

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
- 显式的可重用更正被作为待定提议排队
- 基于阈值的审查器通过可以提议技能更新
- 在应用待定提议之前，不会写入任何技能文件

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

`approvalPolicy: "auto"` 仍使用相同的扫描器和隔离路径。它不会应用具有关键性发现的提议。

## 配置

| 键                   | 默认值      | 范围 / 值                                   | 含义                                               |
| -------------------- | ----------- | ------------------------------------------- | -------------------------------------------------- |
| `enabled`            | `true`      | 布尔值                                      | 在加载插件条目后启用该插件。                       |
| `autoCapture`        | `true`      | 布尔值                                      | 在成功的代理轮次后启用轮次后捕获/审查。            |
| `approvalPolicy`     | `"pending"` | `"pending"`, `"auto"`                       | 对提议进行排队或自动写入安全的提议。               |
| `reviewMode`         | `"hybrid"`  | `"off"`, `"heuristic"`, `"llm"`, `"hybrid"` | 选择显式更正捕获、LLM 审查器、两者兼有或两者皆无。 |
| `reviewInterval`     | `15`        | `1..200`                                    | 在此数量的成功轮次后运行审查器。                   |
| `reviewMinToolCalls` | `8`         | `1..500`                                    | 在此数量的观察到的工具调用后运行审查器。           |
| `reviewTimeoutMs`    | `45000`     | `5000..180000`                              | 嵌入式审查器运行的超时时间。                       |
| `maxPending`         | `50`        | `1..200`                                    | 每个工作区保留的最大待定/隔离提议数量。            |
| `maxSkillBytes`      | `40000`     | `1024..200000`                              | 生成的最大技能/支持文件大小。                      |

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

技能工作坊有三条捕获路径。

### 工具建议

当模型看到可重用过程或当用户要求它保存/更新技能时，可以直接调用 `skill_workshop`。

这是最明确的路径，即使使用 `autoCapture: false` 也能正常工作。

### 启发式捕获

当启用 `autoCapture` 且 `reviewMode` 为 `heuristic` 或 `hybrid` 时，
该插件会扫描成功的轮次以查找明确的用户更正短语：

- `next time`
- `from now on`
- `remember to`
- `make sure to`
- `always ... use/check/verify/record/save/prefer`
- `prefer ... when/for/instead/use`
- `when asked`

启发式方法会根据最新的匹配用户指令创建提案。它
使用主题提示为常见工作流选择技能名称：

- 动画 GIF 任务 -> `animated-gif-workflow`
- 截图或资源任务 -> `screenshot-asset-workflow`
- QA 或场景任务 -> `qa-scenario-workflow`
- GitHub PR 任务 -> `github-pr-workflow`
- 回退 -> `learned-workflows`

启发式捕获是有意设置得较为狭窄的。它旨在用于明确的更正和
可重复的流程说明，而非用于一般的转录摘要。

### LLM 审核者

当启用 `autoCapture` 且 `reviewMode` 为 `llm` 或 `hybrid` 时，该插件
会在达到阈值后运行一个紧凑的嵌入式审核者。

审核者接收：

- 最近的转录文本，上限为最后 12,000 个字符
- 最多 12 个现有的工作区技能
- 来自每个现有技能的最多 2,000 个字符
- 仅限 JSON 的指令

审核者没有工具：

- `disableTools: true`
- `toolsAllow: []`
- `disableMessageTool: true`

审核者返回 `{ "action": "none" }` 或一个提案。`action` 字段为 `create`、`append` 或 `replace` —— 当存在相关技能时优先使用 `append`/`replace`；仅在没有现有技能适用时才使用 `create`。

`create` 示例：

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

`append` 添加 `section` + `body`。`replace` 在指定技能中将 `oldText` 替换为 `newText`。

## 提案生命周期

每个生成的更新都会成为包含以下内容的提案：

- `id`
- `createdAt`
- `updatedAt`
- `workspaceDir`
- 可选 `agentId`
- 可选 `sessionId`
- `skillName`
- `title`
- `reason`
- `source`：`tool`、`agent_end` 或 `reviewer`
- `status`
- `change`
- 可选 `scanFindings`
- 可选 `quarantineReason`

提案状态：

- `pending` - 等待批准
- `applied` - 已写入 `<workspace>/skills`
- `rejected` - 被操作员/模型拒绝
- `quarantined` - 因关键扫描器发现而被阻止

状态按工作区存储在 Gateway(网关) 状态目录下：

```text
<stateDir>/skill-workshop/<workspace-hash>.json
```

待处理和隔离的提案按技能名称和更改有效负载进行去重。存储最多保留 `maxPending` 个最新的待处理/隔离提案。

## 工具参考

该插件注册了一个智能体工具：

```text
skill_workshop
```

### `status`

按状态统计活动工作区的提案数量。

```json
{ "action": "status" }
```

结果结构：

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

当自动捕获似乎不起作用且日志中提到 `skill-workshop: quarantined <skill>` 时使用此项。

### `inspect`

按 ID 获取提案。

```json
{
  "action": "inspect",
  "id": "proposal-id"
}
```

### `suggest`

创建一个提案。使用 `approvalPolicy: "pending"`（默认），这将进入队列而不是直接写入。

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

<AccordionGroup>
  <Accordion title="强制安全写入 (apply: true)">

```json
{
  "action": "suggest",
  "apply": true,
  "skillName": "animated-gif-workflow",
  "description": "Validate animated GIF assets before using them.",
  "body": "## Workflow\n\n- Verify true animation.\n- Record attribution."
}
```

  </Accordion>

  <Accordion title="在自动策略下强制待定 (apply: false)">

```json
{
  "action": "suggest",
  "apply": false,
  "skillName": "screenshot-asset-workflow",
  "description": "Screenshot replacement workflow.",
  "body": "## Workflow\n\n- Verify dimensions.\n- Optimize the PNG.\n- Run the relevant gate."
}
```

  </Accordion>

  <Accordion title="附加到指定部分">

```json
{
  "action": "suggest",
  "skillName": "qa-scenario-workflow",
  "section": "Workflow",
  "description": "QA scenario workflow.",
  "body": "- For media QA, verify generated assets render and pass final assertions."
}
```

  </Accordion>

  <Accordion title="替换精确文本">

```json
{
  "action": "suggest",
  "skillName": "github-pr-workflow",
  "oldText": "- Check the PR.",
  "newText": "- Check unresolved review threads, CI status, linked issues, and changed files before deciding."
}
```

  </Accordion>
</AccordionGroup>

### `apply`

应用待定的提案。

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

将提案标记为已拒绝。

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

支持文件的范围限于工作区，会检查路径，通过
`maxSkillBytes` 限制字节，进行扫描，并原子性地写入。

## 技能写入

Skill Workshop 仅写入以下位置：

```text
<workspace>/skills/<normalized-skill-name>/
```

技能名称已规范化：

- 小写
- 非 `[a-z0-9_-]` 运行变为 `-`
- 移除开头/结尾的非字母数字字符
- 最大长度为 80 个字符
- 最终名称必须匹配 `[a-z0-9][a-z0-9_-]{1,79}`

对于 `create`：

- 如果技能不存在，Skill Workshop 会写入一个新的 `SKILL.md`
- 如果它已存在，Skill Workshop 会将正文追加到 `## Workflow`

对于 `append`：

- 如果技能存在，Skill Workshop 会追加到请求的部分
- 如果不存在，Skill Workshop 会创建一个最小技能，然后追加

对于 `replace`：

- 该技能必须已存在
- `oldText` 必须准确存在
- 仅替换第一个精确匹配项

所有写入操作都是原子的，并且会立即刷新内存中的技能快照，因此
无需重启 Gateway(网关) 即可使新技能或更新后的技能可见。

## 安全模型

Skill Workshop 对生成的 `SKILL.md` 内容和支持文件
具有安全扫描程序。

严重发现会将提案隔离：

| 规则 ID                                | 阻止以下内容...                                           |
| -------------------------------------- | --------------------------------------------------------- |
| `prompt-injection-ignore-instructions` | 告诉代理忽略先前/更高级别的指令                           |
| `prompt-injection-system`              | 引用系统提示词、开发者消息或隐藏指令                      |
| `prompt-injection-tool`                | 鼓励绕过工具权限/批准                                     |
| `shell-pipe-to-shell`                  | 包括通过管道传输到 `sh`、`bash` 或 `zsh` 的 `curl`/`wget` |
| `secret-exfiltration`                  | 似乎通过网络发送环境/进程环境数据                         |

警告发现会被保留，但本身不会阻止：

| 规则 ID              | 警告...                  |
| -------------------- | ------------------------ |
| `destructive-delete` | 广泛的 `rm -rf` 风格命令 |
| `unsafe-permissions` | `chmod 777` 风格权限使用 |

隔离的提案：

- 保留 `scanFindings`
- 保留 `quarantineReason`
- 出现在 `list_quarantine` 中
- 无法通过 `apply` 应用

要从隔离的提案中恢复，请创建一个新的安全提案并移除不安全的内容。请勿手动编辑存储 JSON。

## 提示词指导

启用后，Skill Workshop 会注入一段简短的提示词部分，告诉代理使用 `skill_workshop` 来实现持久的程序性记忆。

该指导强调：

- 程序而非事实/偏好
- 用户更正
- 非显而易见的成功程序
- 反复出现的陷阱
- 通过追加/替换来修复过时/单薄/错误的技能
- 在漫长的工具循环或艰难的修复后保存可复用的程序
- 简短的祈使句技能文本
- 无转录堆砌

写入模式文本随 `approvalPolicy` 而变化：

- 待定模式：对建议进行排队；仅在明确批准后应用
- 自动模式：当明显可复用时应用安全的工作区技能更新

## 成本与运行时行为

启发式捕获不调用模型。

LLM 审查在活动/默认代理模型上使用嵌入式运行。它是基于阈值的，因此默认情况下不会在每一轮都运行。

审查者：

- 在可用时使用相同配置的提供商/模型上下文
- 回退到运行时代理默认值
- 具有 `reviewTimeoutMs`
- 使用轻量级引导上下文
- 没有工具
- 不直接写入任何内容
- 只能发出经过正常扫描器和批准/隔离路径的提案

如果审查者失败、超时或返回无效的 JSON，插件会记录警告/调试消息并跳过该审查步骤。

## 操作模式

当用户说以下内容时使用 Skill Workshop：

- “下次，做 X”
- “从现在起，优先考虑 Y”
- “务必验证 Z”
- “将其保存为工作流”
- “这花了一段时间；记住这个过程”
- “为此更新本地技能”

好的技能文本：

```markdown
## Workflow

- Verify the GIF URL resolves to `image/gif`.
- Confirm the file has multiple frames.
- Record source URL, license, and attribution.
- Store a local copy when the asset will ship with the product.
- Verify the local asset renders in the target UI before final reply.
```

差的技能文本：

```markdown
The user asked about a GIF and I searched two websites. Then one was blocked by
Cloudflare. The final answer said to check attribution.
```

不应保存差版本的原因：

- transcript-shaped
- 非命令式
- 包含嘈杂的一次性细节
- 不指示下一个代理做什么

## 调试

检查插件是否已加载：

```bash
openclaw plugins list --enabled
```

从代理/工具上下文检查建议计数：

```json
{ "action": "status" }
```

检查待定建议：

```json
{ "action": "list_pending" }
```

检查隔离建议：

```json
{ "action": "list_quarantine" }
```

常见症状：

| 症状                       | 可能原因                                                       | 检查                                                                |
| -------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------- |
| 工具不可用                 | 插件条目未启用                                                 | `plugins.entries.skill-workshop.enabled` 和 `openclaw plugins list` |
| 未出现自动建议             | `autoCapture: false`、`reviewMode: "off"` 或未达到阈值         | 配置、建议状态、Gateway(网关) 日志                                  |
| 启发式未捕获               | 用户措辞不匹配更正模式                                         | 使用显式 `skill_workshop.suggest` 或启用 LLM 审阅者                 |
| 审阅者未创建建议           | 审阅者返回 `none`、无效 JSON 或超时                            | Gateway(网关) 日志，`reviewTimeoutMs`，阈值                         |
| 提案未应用                 | `approvalPolicy: "pending"`                                    | `list_pending`，然后 `apply`                                        |
| 提案从待处理中消失         | 重复的提案被重用，达到最大待处理数量修剪，或已被应用/拒绝/隔离 | `status`，带有状态过滤器的 `list_pending`，`list_quarantine`        |
| 技能文件存在但模型未能识别 | Skill 快照未刷新或 skill 限制将其排除                          | `openclaw skills` 状态和工作区 skill 资格                           |

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

运行确定性覆盖：

```bash
pnpm openclaw qa suite \
  --scenario skill-workshop-animated-gif-autocreate \
  --scenario skill-workshop-pending-approval \
  --concurrency 1
```

运行审查器覆盖：

```bash
pnpm openclaw qa suite \
  --scenario skill-workshop-reviewer-autonomous \
  --concurrency 1
```

审查器场景有意分开，因为它启用了
`reviewMode: "llm"` 并运行嵌入式审查器流程。

## 何时不启用自动应用

在以下情况下避免使用 `approvalPolicy: "auto"`：

- 工作区包含敏感流程
- 代理正在处理不受信任的输入
- skills 在广泛团队间共享
- 您仍在调整提示词或扫描器规则
- 模型频繁处理充满敌意的网络/电子邮件内容

请先使用待定模式。仅在该工作区中审查了代理提议的
skills 类型后，再切换到自动模式。

## 相关文档

- [Skills](/zh/tools/skills)
- [插件](/zh/tools/plugin)
- [测试](/zh/reference/test)
