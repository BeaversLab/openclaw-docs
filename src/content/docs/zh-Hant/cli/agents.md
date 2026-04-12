---
summary: "CLI reference for `openclaw agents` (list/add/delete/bindings/bind/unbind/set identity)"
read_when:
  - You want multiple isolated agents (workspaces + routing + auth)
title: "agents"
---

# `openclaw agents`

管理隔離的代理程式（工作區 + 驗證 + 路由）。

相關連結：

- Multi-agent routing: [Multi-Agent Routing](/en/concepts/multi-agent)
- Agent workspace: [Agent workspace](/en/concepts/agent-workspace)
- Skill visibility config: [Skills config](/en/tools/skills-config)

## 範例

```bash
openclaw agents list
openclaw agents list --bindings
openclaw agents add work --workspace ~/.openclaw/workspace-work
openclaw agents add ops --workspace ~/.openclaw/workspace-ops --bind telegram:ops --non-interactive
openclaw agents bindings
openclaw agents bind --agent work --bind telegram:ops
openclaw agents unbind --agent work --bind telegram:ops
openclaw agents set-identity --workspace ~/.openclaw/workspace --from-identity
openclaw agents set-identity --agent main --avatar avatars/openclaw.png
openclaw agents delete work
```

## 路由綁定

使用路由綁定將入站通道流量固定到特定代理程式。

如果您還希望每個代理程式具有不同的可見技能，請在
`openclaw.json` 中設定
`agents.defaults.skills` 和 `agents.list[].skills`。請參閱
[Skills config](/en/tools/skills-config) 和
[Configuration Reference](/en/gateway/configuration-reference#agents-defaults-skills)。

列出綁定：

```bash
openclaw agents bindings
openclaw agents bindings --agent work
openclaw agents bindings --json
```

新增綁定：

```bash
openclaw agents bind --agent work --bind telegram:ops --bind discord:guild-a
```

如果您省略 `accountId` (`--bind <channel>`)，OpenClaw 會在可用時從通道預設值和外掛程式設定钩子解析它。

如果您為 `bind` 或 `unbind` 省略 `--agent`，OpenClaw 會將目標設為目前的預設代理程式。

### 綁定範圍行為

- 沒有 `accountId` 的綁定僅符合通道預設帳戶。
- `accountId: "*"` 是通道範圍的後備 (所有帳戶)，且比明確的帳戶綁定更具體性更低。
- 如果相同的代理程式已經有一個沒有 `accountId` 的符合通道綁定，而您稍後使用明確或解析的 `accountId` 進行綁定，OpenClaw 會就地升級該現有綁定，而不是新增重複項。

範例：

```bash
# initial channel-only binding
openclaw agents bind --agent work --bind telegram

# later upgrade to account-scoped binding
openclaw agents bind --agent work --bind telegram:ops
```

升級後，該綁定的路由範圍限定為 `telegram:ops`。如果您也想要預設帳戶路由，請明確新增它 (例如 `--bind telegram:default`)。

移除綁定：

```bash
openclaw agents unbind --agent work --bind telegram:ops
openclaw agents unbind --agent work --all
```

`unbind` 接受 `--all` 或一或多個 `--bind` 值，但不能同時接受。

## 命令介面

### `agents`

不帶子指令執行 `openclaw agents` 等同於 `openclaw agents list`。

### `agents list`

選項：

- `--json`
- `--bindings`: 包含完整的路由規則，不僅是每個代理程式的計數/摘要

### `agents add [name]`

選項：

- `--workspace <dir>`
- `--model <id>`
- `--agent-dir <dir>`
- `--bind <channel[:accountId]>` (可重複)
- `--non-interactive`
- `--json`

備註：

- 傳遞任何明確的 add 標誌會將指令切換至非互動路徑。
- 非互動模式需要同時提供代理程式名稱和 `--workspace`。
- `main` 已被保留，無法用作新的代理程式 ID。

### `agents bindings`

選項：

- `--agent <id>`
- `--json`

### `agents bind`

選項：

- `--agent <id>` (預設為目前的預設代理程式)
- `--bind <channel[:accountId]>` (可重複)
- `--json`

### `agents unbind`

選項：

- `--agent <id>` (預設為目前的預設代理程式)
- `--bind <channel[:accountId]>` (可重複)
- `--all`
- `--json`

### `agents delete <id>`

選項：

- `--force`
- `--json`

備註：

- `main` 無法被刪除。
- 若沒有 `--force`，則需要互動式確認。
- 工作區、代理程式狀態和工作階段記錄目錄會被移至垃圾桶，而非永久刪除。

## 身分識別檔案

每個代理程式工作區都可以在工作區根目錄包含一個 `IDENTITY.md`：

- 範例路徑：`~/.openclaw/workspace/IDENTITY.md`
- `set-identity --from-identity` 會從工作區根目錄讀取 (或指定的 `--identity-file`)

頭像路徑會相對於工作區根目錄解析。

## 設定身分識別

`set-identity` 會將欄位寫入 `agents.list[].identity`：

- `name`
- `theme`
- `emoji`
- `avatar` (相對於工作區的路徑、http(s) URL 或 data URI)

選項：

- `--agent <id>`
- `--workspace <dir>`
- `--identity-file <path>`
- `--from-identity`
- `--name <name>`
- `--theme <theme>`
- `--emoji <emoji>`
- `--avatar <value>`
- `--json`

備註：

- 可以使用 `--agent` 或 `--workspace` 來選擇目標代理程式。
- 如果您依賴 `--workspace` 且有多個代理程式共用該工作區，指令會失敗並要求您傳遞 `--agent`。
- 當未提供明確的身分識別欄位時，指令會從 `IDENTITY.md` 讀取身分識別資料。

從 `IDENTITY.md` 載入：

```bash
openclaw agents set-identity --workspace ~/.openclaw/workspace --from-identity
```

明確覆寫欄位：

```bash
openclaw agents set-identity --agent main --name "OpenClaw" --emoji "🦞" --avatar avatars/openclaw.png
```

設定範例：

```json5
{
  agents: {
    list: [
      {
        id: "main",
        identity: {
          name: "OpenClaw",
          theme: "space lobster",
          emoji: "🦞",
          avatar: "avatars/openclaw.png",
        },
      },
    ],
  },
}
```
