---
summary: "CLI reference for `openclaw agents` (list/add/delete/bindings/bind/unbind/set identity)"
read_when:
  - You want multiple isolated agents (workspaces + routing + auth)
title: "agents"
---

# `openclaw agents`

管理隔離的代理程式（工作區 + 驗證 + 路由）。

相關連結：

- 多代理程式路由：[Multi-Agent Routing](/en/concepts/multi-agent)
- 代理程式工作區：[Agent workspace](/en/concepts/agent-workspace)

## 範例

```bash
openclaw agents list
openclaw agents add work --workspace ~/.openclaw/workspace-work
openclaw agents bindings
openclaw agents bind --agent work --bind telegram:ops
openclaw agents unbind --agent work --bind telegram:ops
openclaw agents set-identity --workspace ~/.openclaw/workspace --from-identity
openclaw agents set-identity --agent main --avatar avatars/openclaw.png
openclaw agents delete work
```

## 路由綁定

使用路由綁定將傳入通道流量固定到特定代理程式。

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

如果您省略 `accountId` (`--bind <channel>`)，OpenClaw 會在可用時從通道預設值和外掛程式設定掛鉤解析它。

### 綁定範圍行為

- 沒有 `accountId` 的綁定僅符合通道預設帳戶。
- `accountId: "*"` 是通道範圍的後備選項（所有帳戶），且比明確的帳戶綁定更不具體。
- 如果同一個代理程式已經有一個沒有 `accountId` 的相符通道綁定，而您後來使用明確或解析出的 `accountId` 進行綁定，OpenClaw 會就地升級該現有綁定，而不是新增重複項目。

範例：

```bash
# initial channel-only binding
openclaw agents bind --agent work --bind telegram

# later upgrade to account-scoped binding
openclaw agents bind --agent work --bind telegram:ops
```

升級後，該綁定的路由範圍限定於 `telegram:ops`。如果您也想要預設帳戶路由，請明確新增（例如 `--bind telegram:default`）。

移除綁定：

```bash
openclaw agents unbind --agent work --bind telegram:ops
openclaw agents unbind --agent work --all
```

## 身分識別檔案

每個代理程式工作區都可以在工作區根目錄包含一個 `IDENTITY.md`：

- 範例路徑：`~/.openclaw/workspace/IDENTITY.md`
- `set-identity --from-identity` 從工作區根目錄（或明確的 `--identity-file`）讀取

頭像路徑是相對於工作區根目錄解析的。

## 設定身分識別

`set-identity` 將欄位寫入 `agents.list[].identity`：

- `name`
- `theme`
- `emoji`
- `avatar` (相對於工作區的路徑、http(s) URL 或 data URI)

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
