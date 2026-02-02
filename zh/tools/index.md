---
summary: "OpenClaw 的 agent 工具面（browser、canvas、nodes、message、cron），替代旧的 `openclaw-*` skills"
read_when:
  - 添加或修改 agent 工具
  - 退役或更改 `openclaw-*` skills
title: "Tools"
---

# 工具（OpenClaw）

OpenClaw 为浏览器、画布、节点与 cron 提供 **一等 agent 工具**。
它们替代旧的 `openclaw-*` skills：工具是强类型、无 shell，agent 应直接使用它们。

## 禁用工具

你可以在 `openclaw.json` 里用 `tools.allow` / `tools.deny` 全局允许/拒绝工具（deny 优先）。这会阻止把被禁用的工具发送给模型提供商。

```json5
{
  tools: { deny: ["browser"] }
}
```

说明：
- 匹配不区分大小写。
- 支持 `*` 通配符（`"*"` 表示所有工具）。
- 如果 `tools.allow` 仅包含未知或未加载的插件工具名，OpenClaw 会记录警告并忽略 allowlist，以确保核心工具可用。

## 工具 profile（基础 allowlist）

`tools.profile` 在 `tools.allow`/`tools.deny` 之前设置 **基础工具 allowlist**。
单 agent 覆盖：`agents.list[].tools.profile`。

Profiles：
- `minimal`：仅 `session_status`
- `coding`：`group:fs`、`group:runtime`、`group:sessions`、`group:memory`、`image`
- `messaging`：`group:messaging`、`sessions_list`、`sessions_history`、`sessions_send`、`session_status`
- `full`：不限制（同未设置）

示例（默认仅消息工具，同时允许 Slack + Discord 工具）：
```json5
{
  tools: {
    profile: "messaging",
    allow: ["slack", "discord"]
  }
}
```

示例（coding profile，但全局禁止 exec/process）：
```json5
{
  tools: {
    profile: "coding",
    deny: ["group:runtime"]
  }
}
```

示例（全局 coding profile，支持团队 agent 仅消息）：
```json5
{
  tools: { profile: "coding" },
  agents: {
    list: [
      {
        id: "support",
        tools: { profile: "messaging", allow: ["slack"] }
      }
    ]
  }
}
```

## Provider 特定的工具策略

使用 `tools.byProvider` 可在不改变全局默认值的情况下，针对特定 provider（或单个 `provider/model`）**进一步收紧** 工具集。
单 agent 覆盖：`agents.list[].tools.byProvider`。

该设置在基础 profile **之后**、allow/deny 列表 **之前** 生效，因此只能缩小工具集。
Provider key 可为 `provider`（如 `google-antigravity`）或 `provider/model`（如 `openai/gpt-5.2`）。

示例（保持全局 coding profile，但对 Google Antigravity 使用 minimal）：
```json5
{
  tools: {
    profile: "coding",
    byProvider: {
      "google-antigravity": { profile: "minimal" }
    }
  }
}
```

示例（为不稳定端点设置 provider/model 级 allowlist）：
```json5
{
  tools: {
    allow: ["group:fs", "group:runtime", "sessions_list"],
    byProvider: {
      "openai/gpt-5.2": { allow: ["group:fs", "sessions_list"] }
    }
  }
}
```

示例（单 agent 对单 provider 覆盖）：
```json5
{
  agents: {
    list: [
      {
        id: "support",
        tools: {
          byProvider: {
            "google-antigravity": { allow: ["message", "sessions_list"] }
          }
        }
      }
    ]
  }
}
```

## 工具组（简写）

工具策略（全局、agent、沙箱）支持 `group:*` 条目，可展开为多个工具。
在 `tools.allow` / `tools.deny` 中使用这些简写。

可用组：
- `group:runtime`：`exec`、`bash`、`process`
- `group:fs`：`read`、`write`、`edit`、`apply_patch`
- `group:sessions`：`sessions_list`、`sessions_history`、`sessions_send`、`sessions_spawn`、`session_status`
- `group:memory`：`memory_search`、`memory_get`
- `group:web`：`web_search`、`web_fetch`
- `group:ui`：`browser`、`canvas`
- `group:automation`：`cron`、`gateway`
- `group:messaging`：`message`
- `group:nodes`：`nodes`
- `group:openclaw`：所有内置 OpenClaw 工具（不含 provider 插件）

示例（只允许文件工具 + 浏览器）：
```json5
{
  tools: {
    allow: ["group:fs", "browser"]
  }
}
```

## 插件 + 工具

插件可以注册 **额外工具**（和 CLI 命令），超出核心集合。
安装与配置见 [插件](/zh/plugin)，工具使用指引如何注入提示见 [技能](/zh/tools/skills)。某些插件会附带技能与工具（如 voice-call 插件）。

可选插件工具：
- [Lobster](/zh/tools/lobster)：带可恢复审批的强类型工作流运行时（需要在 gateway 主机上安装 Lobster CLI）。
- [LLM Task](/zh/tools/llm-task)：仅 JSON 的 LLM 步骤，用于结构化工作流输出（可选 schema 校验）。

## 工具清单

### `apply_patch`

对一个或多个文件应用结构化补丁。用于多 hunk 编辑。
实验性：通过 `tools.exec.applyPatch.enabled` 启用（仅 OpenAI 模型）。

### `exec`

在工作区运行 shell 命令。

核心参数：
- `command`（必填）
- `yieldMs`（超时后自动转后台，默认 10000）
- `background`（立即后台）
- `timeout`（秒；超时杀进程，默认 1800）
- `elevated`（bool；在 elevated 模式启用/允许时在宿主机运行；仅在 agent 沙箱化时生效）
- `host`（`sandbox | gateway | node`）
- `security`（`deny | allowlist | full`）
- `ask`（`off | on-miss | always`）
- `node`（`host=node` 的 node id/name）
- 需要真正的 TTY？设置 `pty: true`。

说明：
- 后台时返回 `status: "running"` 与 `sessionId`。
- 使用 `process` 轮询/日志/写入/终止/清理后台会话。
- 若 `process` 被禁用，`exec` 同步运行并忽略 `yieldMs`/`background`。
- `elevated` 受 `tools.elevated` 与 `agents.list[].tools.elevated` 覆盖门控（两者都需允许），等价于 `host=gateway` + `security=full`。
- `elevated` 仅在 agent 沙箱化时改变行为（否则无效）。
- `host=node` 可指向 macOS 伴侣应用或无 UI node host（`openclaw node run`）。
- gateway/node 审批与 allowlist：见 [Exec 审批](/zh/tools/exec-approvals)。

### `process`

管理后台 exec 会话。

核心动作：
- `list`、`poll`、`log`、`write`、`kill`、`clear`、`remove`

说明：
- `poll` 在完成时返回新输出与退出状态。
- `log` 支持按行 `offset`/`limit`（省略 `offset` 获取最后 N 行）。
- `process` 按 agent 隔离；其他 agent 的会话不可见。

### `web_search`

使用 Brave Search API 搜索网页。

核心参数：
- `query`（必填）
- `count`（1–10；默认来自 `tools.web.search.maxResults`）

说明：
- 需要 Brave API key（推荐：`openclaw configure --section web`，或设置 `BRAVE_API_KEY`）。
- 通过 `tools.web.search.enabled` 启用。
- 响应会缓存（默认 15 分钟）。
- 设置见 [Web 工具](/zh/tools/web)。

### `web_fetch`

从 URL 抓取并抽取可读内容（HTML → markdown/text）。

核心参数：
- `url`（必填）
- `extractMode`（`markdown` | `text`）
- `maxChars`（截断长页面）

说明：
- 通过 `tools.web.fetch.enabled` 启用。
- 响应会缓存（默认 15 分钟）。
- 对 JS 重站点，优先使用浏览器工具。
- 设置见 [Web 工具](/zh/tools/web)。
- 反机器人兜底见 [Firecrawl](/zh/tools/firecrawl)。

### `browser`

控制 OpenClaw 托管的专用浏览器。

核心动作：
- `status`、`start`、`stop`、`tabs`、`open`、`focus`、`close`
- `snapshot`（aria/ai）
- `screenshot`（返回图片块 + `MEDIA:<path>`）
- `act`（UI 动作：click/type/press/hover/drag/select/fill/resize/wait/evaluate）
- `navigate`、`console`、`pdf`、`upload`、`dialog`

Profile 管理：
- `profiles` — 列出所有浏览器 profile 与状态
- `create-profile` — 创建新 profile 并自动分配端口（或 `cdpUrl`）
- `delete-profile` — 停止浏览器，删除用户数据，从配置中移除（仅本地）
- `reset-profile` — 终止 profile 端口上的孤儿进程（仅本地）

常用参数：
- `profile`（可选；默认 `browser.defaultProfile`）
- `target`（`sandbox` | `host` | `node`）
- `node`（可选；指定 node id/name）
说明：
- 需要 `browser.enabled=true`（默认 `true`；设置为 `false` 可禁用）。
- 所有动作都支持可选 `profile` 参数用于多实例。
- 省略 `profile` 时使用 `browser.defaultProfile`（默认 "chrome"）。
- Profile 名称：仅小写字母数字 + 连字符（最长 64 字符）。
- 端口范围：18800-18899（约 100 个 profile）。
- 远程 profile 为仅附加（不支持 start/stop/reset）。
- 若连接了可用浏览器的节点，工具可能自动路由到该节点（除非你固定 `target`）。
- `snapshot` 在安装 Playwright 时默认 `ai`；`aria` 用于可访问性树。
- `snapshot` 也支持 role 快照选项（`interactive`、`compact`、`depth`、`selector`），返回如 `e12` 的 ref。
- `act` 需要来自 `snapshot` 的 `ref`（AI 快照的数字 `12` 或 role 快照的 `e12`）；仅极少数需要 CSS 选择器时用 `evaluate`。
- 默认避免 `act` → `wait`；仅在没有可靠 UI 状态可等待时使用。
- `upload` 可选传 `ref` 来在 armed 后自动点击。
- `upload` 也支持 `inputRef`（aria ref）或 `element`（CSS selector）直接设置 `<input type="file">`。

### `canvas`

驱动 node Canvas（present、eval、snapshot、A2UI）。

核心动作：
- `present`、`hide`、`navigate`、`eval`
- `snapshot`（返回图片块 + `MEDIA:<path>`）
- `a2ui_push`、`a2ui_reset`

说明：
- 底层使用 gateway `node.invoke`。
- 若未提供 `node`，工具会选择默认（单个已连接节点或本地 mac 节点）。
- A2UI 仅支持 v0.8（无 `createSurface`）；CLI 对 v0.9 JSONL 会报行级错误。
- 快速烟测：`openclaw nodes canvas a2ui push --node <id> --text "Hello from A2UI"`。

### `nodes`

发现并定位已配对节点；发送通知；捕获摄像头/屏幕。

核心动作：
- `status`、`describe`
- `pending`、`approve`、`reject`（配对）
- `notify`（macOS `system.notify`）
- `run`（macOS `system.run`）
- `camera_snap`、`camera_clip`、`screen_record`
- `location_get`

说明：
- 摄像头/屏幕命令需要 node 应用处于前台。
- 图片返回图片块 + `MEDIA:<path>`。
- 视频返回 `FILE:<path>`（mp4）。
- 位置返回 JSON payload（lat/lon/accuracy/timestamp）。
- `run` 参数：`command` argv 数组；可选 `cwd`、`env`（`KEY=VAL`）、`commandTimeoutMs`、`invokeTimeoutMs`、`needsScreenRecording`。

示例（`run`）：
```json
{
  "action": "run",
  "node": "office-mac",
  "command": ["echo", "Hello"],
  "env": ["FOO=bar"],
  "commandTimeoutMs": 12000,
  "invokeTimeoutMs": 45000,
  "needsScreenRecording": false
}
```

### `image`

使用配置的图像模型分析图片。

核心参数：
- `image`（必填路径或 URL）
- `prompt`（可选；默认 "Describe the image."）
- `model`（可选覆盖）
- `maxBytesMb`（可选大小上限）

说明：
- 仅在配置了 `agents.defaults.imageModel`（主/备）时可用，或能从默认模型 + 已配置认证推断出隐式图像模型时（尽力匹配）。
- 直接调用图像模型（与主聊天模型独立）。

### `message`

跨 Discord/Google Chat/Slack/Telegram/WhatsApp/Signal/iMessage/MS Teams 发送消息与频道动作。

核心动作：
- `send`（文本 + 可选媒体；MS Teams 还支持 `card` 用于自适应卡片）
- `poll`（WhatsApp/Discord/MS Teams 投票）
- `react` / `reactions` / `read` / `edit` / `delete`
- `pin` / `unpin` / `list-pins`
- `permissions`
- `thread-create` / `thread-list` / `thread-reply`
- `search`
- `sticker`
- `member-info` / `role-info`
- `emoji-list` / `emoji-upload` / `sticker-upload`
- `role-add` / `role-remove`
- `channel-info` / `channel-list`
- `voice-status`
- `event-list` / `event-create`
- `timeout` / `kick` / `ban`

说明：
- `send` 对 WhatsApp 通过 Gateway；其他渠道直连。
- `poll` 对 WhatsApp 与 MS Teams 使用 Gateway；Discord 投票直连。
- 当 message 工具调用绑定到活动会话时，发送被限制在该会话的目标，以避免跨上下文泄露。

### `cron`

管理 Gateway 的 cron 任务与唤醒。

核心动作：
- `status`、`list`
- `add`、`update`、`remove`、`run`、`runs`
- `wake`（排队系统事件 + 可选立即 heartbeat）

说明：
- `add` 需要完整的 cron job 对象（与 `cron.add` RPC 相同 schema）。
- `update` 使用 `{ id, patch }`。

### `gateway`

重启或对运行中的 Gateway 进程应用更新（原地）。

核心动作：
- `restart`（授权 + 发送 `SIGUSR1` 原地重启；`openclaw gateway` 原地重启）
- `config.get` / `config.schema`
- `config.apply`（校验 + 写入配置 + 重启 + 唤醒）
- `config.patch`（合并部分更新 + 重启 + 唤醒）
- `update.run`（运行更新 + 重启 + 唤醒）

说明：
- 使用 `delayMs`（默认 2000）以避免打断正在进行的回复。
- `restart` 默认禁用；用 `commands.restart: true` 启用。

### `sessions_list` / `sessions_history` / `sessions_send` / `sessions_spawn` / `session_status`

列出会话、检查历史或向另一个会话发送。

核心参数：
- `sessions_list`：`kinds?`、`limit?`、`activeMinutes?`、`messageLimit?`（0 = 无）
- `sessions_history`：`sessionKey`（或 `sessionId`）、`limit?`、`includeTools?`
- `sessions_send`：`sessionKey`（或 `sessionId`）、`message`、`timeoutSeconds?`（0 = fire-and-forget）
- `sessions_spawn`：`task`、`label?`、`agentId?`、`model?`、`runTimeoutSeconds?`、`cleanup?`
- `session_status`：`sessionKey?`（默认当前；接受 `sessionId`）、`model?`（`default` 清除覆盖）

说明：
- `main` 是标准的直聊 key；global/unknown 会被隐藏。
- `messageLimit > 0` 会为每个会话拉取最近 N 条消息（工具消息被过滤）。
- 当 `timeoutSeconds > 0` 时，`sessions_send` 会等待最终完成。
- 投递/公告在完成后进行，尽力而为；`status: "ok"` 表示 agent 运行完成，不代表公告成功送达。
- `sessions_spawn` 启动子 agent 运行，并将公告回复到请求方聊天。
- `sessions_spawn` 为非阻塞，立即返回 `status: "accepted"`。
- `sessions_send` 会运行回复 ping-pong（回复 `REPLY_SKIP` 可停止；最大回合由 `session.agentToAgent.maxPingPongTurns` 设置，0–5）。
- ping-pong 结束后，目标 agent 进入 **announce 步骤**；回复 `ANNOUNCE_SKIP` 可抑制公告。

### `agents_list`

列出当前会话允许用 `sessions_spawn` 目标的 agent id。

说明：
- 结果受单 agent allowlist 限制（`agents.list[].subagents.allowAgents`）。
- 当配置了 `["*"]` 时，工具返回所有配置的 agent 并标记 `allowAny: true`。

## 参数（通用）

Gateway 支持的工具（`canvas`、`nodes`、`cron`）：
- `gatewayUrl`（默认 `ws://127.0.0.1:18789`）
- `gatewayToken`（若启用 auth）
- `timeoutMs`

浏览器工具：
- `profile`（可选；默认 `browser.defaultProfile`）
- `target`（`sandbox` | `host` | `node`）
- `node`（可选；固定 node id/name）

## 推荐的 agent 流程

浏览器自动化：
1) `browser` → `status` / `start`
2) `snapshot`（ai 或 aria）
3) `act`（click/type/press）
4) 需要视觉确认时 `screenshot`

Canvas 渲染：
1) `canvas` → `present`
2) `a2ui_push`（可选）
3) `snapshot`

节点目标：
1) `nodes` → `status`
2) 对选定节点 `describe`
3) `notify` / `run` / `camera_snap` / `screen_record`

## 安全

- 避免直接 `system.run`；仅在用户明确同意时使用 `nodes` → `run`。
- 对摄像头/屏幕捕获遵循用户同意。
- 在调用媒体命令前使用 `status/describe` 确认权限。

## 工具如何呈现给 agent

工具通过两个并行渠道暴露：

1) **系统提示文本**：可读的工具列表 + 指引。
2) **工具 schema**：发送给模型 API 的结构化函数定义。

这意味着 agent 同时看到“有哪些工具”和“如何调用它们”。如果某工具不在系统提示或 schema 中，模型无法调用它。
