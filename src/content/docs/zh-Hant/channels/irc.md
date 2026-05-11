---
summary: "IRC 外掛程式設定、存取控制與疑難排解"
title: IRC
read_when:
  - You want to connect OpenClaw to IRC channels or DMs
  - You are configuring IRC allowlists, group policy, or mention gating
---

當您希望 OpenClaw 出現在頻道（`#room`）和直接訊息中時，請使用 IRC。
IRC 作為捆綁的外掛程式出貨，但在 `channels.irc` 下的主設定中進行設定。

## 快速開始

1. 在 `~/.openclaw/openclaw.json` 中啟用 IRC 設定。
2. 至少設定：

```json5
{
  channels: {
    irc: {
      enabled: true,
      host: "irc.example.com",
      port: 6697,
      tls: true,
      nick: "openclaw-bot",
      channels: ["#openclaw"],
    },
  },
}
```

建議使用私人 IRC 伺服器進行 Bot 協調。如果您有意使用公共 IRC 網路，常見的選擇包括 Libera.Chat、OFTC 和 Snoonet。請避免使用可預測的公共頻道來傳輸 Bot 或機群背板訊息。

3. 啟動/重新啟動閘道：

```bash
openclaw gateway run
```

## 安全性預設值

- `channels.irc.dmPolicy` 預設為 `"pairing"`。
- `channels.irc.groupPolicy` 預設為 `"allowlist"`。
- 使用 `groupPolicy="allowlist"` 時，設定 `channels.irc.groups` 以定義允許的頻道。
- 使用 TLS（`channels.irc.tls=true`），除非您有意接受明文傳輸。

## 存取控制

IRC 頻道有兩個分開的「閘門」：

1. **頻道存取**（`groupPolicy` + `groups`）：Bot 是否完全接受來自頻道的訊息。
2. **發送者存取**（`groupAllowFrom` / 每個頻道的 `groups["#channel"].allowFrom`）：誰被允許在該頻道內觸發 Bot。

設定鍵：

- DM 允許清單（DM 發送者存取權）：`channels.irc.allowFrom`
- 群組發送者允許清單（頻道發送者存取權）：`channels.irc.groupAllowFrom`
- 每個頻道的控制項（頻道 + 發送者 + 提及規則）：`channels.irc.groups["#channel"]`
- `channels.irc.groupPolicy="open"` 允許未設定的頻道（**預設仍受提及閘門限制**）

允許清單項目應使用穩定的發送者身分（`nick!user@host`）。
純暱稱匹配是可變的，僅在 `channels.irc.dangerouslyAllowNameMatching: true` 時啟用。

### 常見陷阱：`allowFrom` 是針對 DM，而非頻道

如果您看到類似以下的日誌：

- `irc: drop group sender alice!ident@host (policy=allowlist)`

…這表示該發送者未被允許發送 **群組/頻道** 訊息。您可以透過以下方式修正：

- 設定 `channels.irc.groupAllowFrom`（所有頻道的全域設定），或
- 設定每個頻道的發送者許可清單：`channels.irc.groups["#channel"].allowFrom`

範例（允許 `#tuirc-dev` 中的任何人與機器人交談）：

```json5
{
  channels: {
    irc: {
      groupPolicy: "allowlist",
      groups: {
        "#tuirc-dev": { allowFrom: ["*"] },
      },
    },
  },
}
```

## 回覆觸發（提及）

即使頻道是被允許的（透過 `groupPolicy` + `groups`）且發送者也是被允許的，OpenClaw 在群組情境下預設為**提及過濾（mention-gating）**。

這意味著除非訊息包含符合機器人的提及模式，否則您可能會看到像 `drop channel … (missing-mention)` 這樣的日誌。

若要讓機器人在 IRC 頻道中回覆**而不需要提及**，請停用該頻道的提及過濾：

```json5
{
  channels: {
    irc: {
      groupPolicy: "allowlist",
      groups: {
        "#tuirc-dev": {
          requireMention: false,
          allowFrom: ["*"],
        },
      },
    },
  },
}
```

或者允許**所有** IRC 頻道（沒有每頻道許可清單）並且仍然無需提及即可回覆：

```json5
{
  channels: {
    irc: {
      groupPolicy: "open",
      groups: {
        "*": { requireMention: false, allowFrom: ["*"] },
      },
    },
  },
}
```

## 安全性注意（建議用於公開頻道）

如果您在公開頻道中允許 `allowFrom: ["*"]`，任何人都可以提示機器人。
為了降低風險，請限制該頻道的工具。

### 頻道內每個人使用相同的工具

```json5
{
  channels: {
    irc: {
      groups: {
        "#tuirc-dev": {
          allowFrom: ["*"],
          tools: {
            deny: ["group:runtime", "group:fs", "gateway", "nodes", "cron", "browser"],
          },
        },
      },
    },
  },
}
```

### 根據發送者使用不同的工具（擁有者獲得更多權限）

使用 `toolsBySender` 對 `"*"` 套用較嚴格的策略，並對您的暱稱套用較寬鬆的策略：

```json5
{
  channels: {
    irc: {
      groups: {
        "#tuirc-dev": {
          allowFrom: ["*"],
          toolsBySender: {
            "*": {
              deny: ["group:runtime", "group:fs", "gateway", "nodes", "cron", "browser"],
            },
            "id:eigen": {
              deny: ["gateway", "nodes", "cron"],
            },
          },
        },
      },
    },
  },
}
```

註記：

- `toolsBySender` 鍵應該使用 `id:` 作為 IRC 發送者身分值：
  `id:eigen` 或 `id:eigen!~eigen@174.127.248.171` 以進行更強的比對。
- 舊版無前綴的鍵仍被接受，並且僅作為 `id:` 進行比對。
- 第一個符合的發送者策略勝出；`"*"` 是萬用字元後備方案。

有關群組存取與提及過濾（以及它們如何互動）的更多資訊，請參閱：[/channels/groups](/zh-Hant/channels/groups)。

## NickServ

連線後透過 NickServ 進行驗證：

```json5
{
  channels: {
    irc: {
      nickserv: {
        enabled: true,
        service: "NickServ",
        password: "your-nickserv-password",
      },
    },
  },
}
```

連線時可選的一次性註冊：

```json5
{
  channels: {
    irc: {
      nickserv: {
        register: true,
        registerEmail: "bot@example.com",
      },
    },
  },
}
```

在暱稱註冊後停用 `register`，以避免重複的 REGISTER 嘗試。

## 環境變數

預設帳戶支援：

- `IRC_HOST`
- `IRC_PORT`
- `IRC_TLS`
- `IRC_NICK`
- `IRC_USERNAME`
- `IRC_REALNAME`
- `IRC_PASSWORD`
- `IRC_CHANNELS`（逗號分隔）
- `IRC_NICKSERV_PASSWORD`
- `IRC_NICKSERV_REGISTER_EMAIL`

無法從工作區 `.env` 設定 `IRC_HOST`；請參閱 [工作區 `.env` 檔案](/zh-Hant/gateway/security)。

## 故障排除

- 如果機器人已連線但從未在頻道中回覆，請驗證 `channels.irc.groups` **以及**提及過濾（mention-gating）是否正在丟棄訊息（`missing-mention`）。如果您希望它在無需呼叫（ping）的情況下回覆，請為該頻道設定 `requireMention:false`。
- 如果登入失敗，請驗證暱稱可用性和伺服器密碼。
- 如果在自訂網路上 TLS 失敗，請驗證主機/埠號和憑證設定。

## 相關

- [頻道概覽](/zh-Hant/channels) — 所有支援的頻道
- [配對](/zh-Hant/channels/pairing) — DM 認證和配對流程
- [群組](/zh-Hant/channels/groups) — 群組聊天行為和提及過濾
- [頻道路由](/zh-Hant/channels/channel-routing) — 訊息的會話路由
- [安全性](/zh-Hant/gateway/security) — 存取模型和防護加固
