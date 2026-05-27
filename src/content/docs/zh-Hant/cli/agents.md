---
summary: "`openclaw agents` 的 CLI 參考（list/add/delete/bindings/bind/unbind/set identity）"
read_when:
  - You want multiple isolated agents (workspaces + routing + auth)
title: "代理程式"
---

# `openclaw agents`

管理隔離的代理程式（工作區 + 驗證 + 路由）。

相關連結：

- [多代理程式路由](/zh-Hant/concepts/multi-agent)
- [代理程式工作區](/zh-Hant/concepts/agent-workspace)
- [技能設定](/zh-Hant/tools/skills-config)：技能可見度設定。

## 範例

```bash
openclaw agents list
openclaw agents list --bindings
openclaw agents add work --workspace ~/.openclaw/workspace-work
openclaw agents add work --workspace ~/.openclaw/workspace-work --bind telegram:*
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

如果您還希望每個代理程式擁有不同的可見技能，請在 `openclaw.json` 中設定 `agents.defaults.skills` 和 `agents.list[].skills`。請參閱[技能設定](/zh-Hant/tools/skills-config)和[設定參考](/zh-Hant/gateway/config-agents#agents-defaults-skills)。

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

您也可以在建立代理程式時新增綁定：

```bash
openclaw agents add work --workspace ~/.openclaw/workspace-work --bind telegram:* --bind discord:*
```

如果您省略 `accountId` (`--bind <channel>`)，OpenClaw 會從外掛程式設定掛鉤、強制帳號綁定或通道設定的帳號數量來解析它。

如果您在 `bind` 或 `unbind` 時省略 `--agent`，OpenClaw 會以目前的預設代理程式為目標。

### `--bind` 格式

| 格式                         | 含義                                                        |
| ---------------------------- | ----------------------------------------------------------- |
| `--bind <channel>:*`         | 符合通道上的所有帳號。                                      |
| `--bind <channel>:<account>` | 符合一個帳號。                                              |
| `--bind <channel>`           | 僅符合預設帳號，除非 CLI 能安全解析外掛程式特定的帳號範圍。 |

### 綁定範圍行為

- 沒有 `accountId` 的已儲存綁定僅符合通道預設帳號。
- `accountId: "*"` 是通道範圍的後備（所有帳號），且比明確的帳號綁定更不具體。
- 如果相同的代理程式已經有一個沒有 `accountId` 的相符通道綁定，而您之後使用明確或解析的 `accountId` 進行綁定，OpenClaw 會就地升級該現有綁定，而不是新增重複項目。

範例：

```bash
# match all accounts on the channel
openclaw agents bind --agent work --bind telegram:*

# match a specific account
openclaw agents bind --agent work --bind telegram:ops

# initial channel-only binding
openclaw agents bind --agent work --bind telegram

# later upgrade to account-scoped binding
openclaw agents bind --agent work --bind telegram:alerts
```

升級後，該綁定的路由範圍限定為 `telegram:alerts`。如果您也想要預設帳號路由，請明確新增（例如 `--bind telegram:default`）。

移除綁定：

```bash
openclaw agents unbind --agent work --bind telegram:ops
openclaw agents unbind --agent work --all
```

`unbind` 接受 `--all` 或一個或多個 `--bind` 值，但不能同時接受兩者。

## 命令介面

### `agents`

執行不帶子指令的 `openclaw agents` 等同於 `openclaw agents list`。

### `agents list`

選項：

- `--json`
- `--bindings`：包含完整的路由規則，而不僅是各個代理程式的計數/摘要

### `agents add [name]`

選項：

- `--workspace <dir>`
- `--model <id>`
- `--agent-dir <dir>`
- `--bind <channel[:accountId]>` (可重複)
- `--non-interactive`
- `--json`

註記：

- 傳遞任何明確的 add 標誌會將命令切換至非互動式路徑。
- 非互動式模式需要代理程式名稱和 `--workspace`。
- `main` 已被保留，無法用作新的代理程式 ID。
- 在互動式模式中，auth seeding 僅複製可移植的靜態設定檔
  (預設為 `api_key` 和靜態 `token`)。OAuth refresh-token 設定檔僅能透過從真實 `main` 代理程式存放區讀取繼承來取得。
  如果設定的預設代理程式不是 `main`，請為新代理程式上的 OAuth
  設定檔另行登入。

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

註記：

- `main` 無法刪除。
- 如果沒有 `--force`，則需要進行互動式確認。
- 工作區、代理程式狀態和工作階段記錄目錄會被移至垃圾桶，而非永久刪除。
- 當可連線到 Gateway 時，刪除操作會透過 Gateway 發送，以便設定和會話儲存空間的清理與執行時流量使用相同的寫入器。如果無法連線到 Gateway，CLI 會降級為離線本機路徑。
- 如果另一個代理程式的工作區是相同路徑、位於此工作區內或包含此工作區，
  則會保留該工作區，並且 `--json` 會回報 `workspaceRetained`、
  `workspaceRetainedReason` 和 `workspaceSharedWith`。

## 身分識別檔案

每個代理程式工作區都可以在工作區根目錄中包含一個 `IDENTITY.md`：

- 範例路徑：`~/.openclaw/workspace/IDENTITY.md`
- `set-identity --from-identity` 會從工作區根目錄（或明確指定的 `--identity-file`）讀取

大頭貼路徑是相對於工作區根目錄解析的。

## 設定身分識別

`set-identity` 會將欄位寫入 `agents.list[].identity`：

- `name`
- `theme`
- `emoji`
- `avatar`（相對於工作區的路徑、http(s) URL 或資料 URI）

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

- 可以使用 `--agent` 或 `--workspace` 來選取目標代理程式。
- 如果您依賴 `--workspace`，並且有多個代理程式共用該工作區，則指令會失敗並要求您傳遞 `--agent`。
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

## 相關

- [CLI 參考](/zh-Hant/cli)
- [多代理程式路由](/zh-Hant/concepts/multi-agent)
- [Agent 工作區](/zh-Hant/concepts/agent-workspace)
