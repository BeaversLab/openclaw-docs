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

- IRC 在 OpenClaw 操作員管理的轉發代理路由之外使用原始 TCP/TLS 通訊端。在要求所有出口流量都必須經過該轉發代理的部署中，請設定 `channels.irc.enabled=false`，除非已明確批准直接 IRC 出口流量。
- `channels.irc.dmPolicy` 預設為 `"pairing"`。
- `channels.irc.groupPolicy` 預設為 `"allowlist"`。
- 使用 `groupPolicy="allowlist"` 時，請設定 `channels.irc.groups` 來定義允許的頻道。
- 請使用 TLS (`channels.irc.tls=true`)，除非您刻意接受明文傳輸。

## 存取控制

IRC 頻道有兩個獨立的「閘門」：

1. **頻道存取** (`groupPolicy` + `groups`)：機器人是否接受來自該頻道的訊息。
2. **傳送者存取** (`groupAllowFrom` / 每個頻道的 `groups["#channel"].allowFrom`)：誰被允許在該頻道內觸發機器人。

設定鍵 (Config keys)：

- DM 允許清單 (DM 傳送者存取權)：`channels.irc.allowFrom`
- 群組傳送者允許清單 (頻道傳送者存取權)：`channels.irc.groupAllowFrom`
- 每頻道控制 (頻道 + 傳送者 + 提及規則)：`channels.irc.groups["#channel"]`
- `channels.irc.groupPolicy="open"` 允許未設定的頻道 (**預設仍受提及限制**)

允許清單條目應使用穩定的傳送者身分 (`nick!user@host`)。
純暱稱比對是可變的，且僅在啟用 `channels.irc.dangerouslyAllowNameMatching: true` 時才開啟。

### 常見陷阱：`allowFrom` 是針對 DM，而非頻道

如果您看到類似以下的日誌：

- `irc: drop group sender alice!ident@host (policy=allowlist)`

...這表示該傳送者未獲准傳送 **群組/頻道** 訊息。您可以透過以下方式修正：

- 設定 `channels.irc.groupAllowFrom` (所有頻道的全域設定)，或
- 設定各頻道的傳送者允許清單：`channels.irc.groups["#channel"].allowFrom`

範例 (允許 `#tuirc-dev` 中的任何人與機器人交談)：

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

## 回覆觸發 (提及)

即使頻道已獲准 (透過 `groupPolicy` + `groups`) 且傳送者已獲准，OpenClaw 在群組情境下預設會採取 **提及限制**。

這意味著，除非訊息包含符合機器人的提及模式，否則您可能會看到類似 `drop channel … (missing-mention)` 的日誌。

若要讓機器人在 IRC 頻道中回覆**而不需要提及**，請停用該頻道的提及閘門：

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

或者要允許**所有** IRC 頻道（沒有各頻道白名單）並且仍然在無需提及的情況下回覆：

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

## 安全提示（建議用於公開頻道）

如果您在公開頻道中允許 `allowFrom: ["*"]`，任何人都可以提示機器人。
為了降低風險，請限制該頻道的工具。

### 頻道中每個人使用相同的工具

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

### 每個發送者使用不同的工具（擁有者獲得更多權力）

使用 `toolsBySender` 對 `"*"` 應用更嚴格的策略，並對您的暱稱應用較寬鬆的策略：

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

注意：

- `toolsBySender` 鍵應使用 `id:` 作為 IRC 發送者身分識別值：
  `id:eigen` 或 `id:eigen!~eigen@174.127.248.171` 以進行更強的比對。
- 舊版無前綴的鍵仍被接受，並且僅作為 `id:` 進行比對。
- 第一個符合的發送者策略優先；`"*"` 是萬用字元後備方案。

關於群組存取與提及閘控（以及它們如何互動）的更多資訊，請參閱：[/channels/groups](/zh-Hant/channels/groups)。

## NickServ

連線後使用 NickServ 進行身份驗證：

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

註冊暱稱後請停用 `register`，以避免重複的 REGISTER 嘗試。

## 環境變數

預設帳戶支援：

- `IRC_HOST`
- `IRC_PORT`
- `IRC_TLS`
- `IRC_NICK`
- `IRC_USERNAME`
- `IRC_REALNAME`
- `IRC_PASSWORD`
- `IRC_CHANNELS` (逗號分隔)
- `IRC_NICKSERV_PASSWORD`
- `IRC_NICKSERV_REGISTER_EMAIL`

`IRC_HOST` 無法從工作區 `.env` 設定；請參閱 [Workspace `.env` files](/zh-Hant/gateway/security)。

## 疑難排解

- 如果機器人已連接但從未在頻道中回覆，請驗證 `channels.irc.groups` **以及** 提及閘控是否正在丟棄訊息 (`missing-mention`)。如果您希望它在沒有 ping 的情況下回覆，請為該頻道設定 `requireMention:false`。
- 如果登入失敗，請驗證暱稱可用性和伺服器密碼。
- 如果在自訂網路上 TLS 失敗，請驗證主機/埠號和憑證設定。

## 相關

- [Channels Overview](/zh-Hant/channels) — 所有支援的頻道
- [Pairing](/zh-Hant/channels/pairing) — DM 驗證和配對流程
- [Groups](/zh-Hant/channels/groups) — 群組聊天行為和提及閘控
- [Channel Routing](/zh-Hant/channels/channel-routing) — 訊息的會話路由
- [安全性](/zh-Hant/gateway/security) — 存取模型與加固
