---
title: IRC
summary: "IRC 外掛程式設定、存取控制與疑難排解"
read_when:
  - You want to connect OpenClaw to IRC channels or DMs
  - You are configuring IRC allowlists, group policy, or mention gating
---

# IRC

當您想要在頻道 (`#room`) 和直接訊息中使用 OpenClaw 時，請使用 IRC。
IRC 隨附為擴充功能外掛程式，但它是設定在主設定檔的 `channels.irc` 之下。

## 快速開始

1. 在 `~/.openclaw/openclaw.json` 中啟用 IRC 設定。
2. 至少設定：

```json5
{
  channels: {
    irc: {
      enabled: true,
      host: "irc.libera.chat",
      port: 6697,
      tls: true,
      nick: "openclaw-bot",
      channels: ["#openclaw"],
    },
  },
}
```

3. 啟動/重新啟動閘道：

```bash
openclaw gateway run
```

## 安全性預設值

- `channels.irc.dmPolicy` 預設為 `"pairing"`。
- `channels.irc.groupPolicy` 預設為 `"allowlist"`。
- 使用 `groupPolicy="allowlist"` 時，請設定 `channels.irc.groups` 來定義允許的頻道。
- 請使用 TLS (`channels.irc.tls=true`)，除非您有意接受明文傳輸。

## 存取控制

IRC 頻道有兩個分開的「關卡」：

1. **頻道存取** (`groupPolicy` + `groups`)：機器人是否接受來自該頻道的訊息。
2. **寄件者存取** (`groupAllowFrom` / 每個頻道的 `groups["#channel"].allowFrom`)：誰被允許在該頻道內觸發機器人。

設定鍵：

- DM 允許清單 (DM 寄件者存取)：`channels.irc.allowFrom`
- 群組寄件者允許清單 (頻道寄件者存取)：`channels.irc.groupAllowFrom`
- 每頻道控制 (頻道 + 寄件者 + 提及規則)：`channels.irc.groups["#channel"]`
- `channels.irc.groupPolicy="open"` 允許未設定的頻道 (**預設仍有提及限制**)

允許清單項目應使用穩定的寄件者身分 (`nick!user@host`)。
純暱稱比對是可變動的，且僅在 `channels.irc.dangerouslyAllowNameMatching: true` 時啟用。

### 常見陷阱：`allowFrom` 是針對 DM，而非頻道

如果您看到類似的日誌：

- `irc: drop group sender alice!ident@host (policy=allowlist)`

...這代表寄件者未獲准傳送 **群組/頻道** 訊息。您可以透過以下任一方式修正：

- 設定 `channels.irc.groupAllowFrom` (所有頻道的全域設定)，或
- 設定每頻道的寄件者允許清單：`channels.irc.groups["#channel"].allowFrom`

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

即使頻道已獲允許（透過 `groupPolicy` + `groups`）且傳送者已獲允許，OpenClaw 在群組情境下預設仍會進行 **提及閘控**（mention-gating）。

這意味著除非訊息包含符合機器人的提及模式，否則您可能會看到類似 `drop channel … (missing-mention)` 的日誌。

若要讓機器人在 IRC 頻道中回覆 **而無需提及**，請停用該頻道的提及閘控：

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

或者允許 **所有** IRC 頻道（無每頻道白名單）且仍在無需提及的情況下回覆：

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

## 安全說明（建議用於公開頻道）

如果您在公開頻道中允許 `allowFrom: ["*"]`，任何人都可以提示機器人。
為降低風險，請限制該頻道的工具。

### 頻道中所有人使用相同的工具

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

### 根據傳送者使用不同的工具（擁有者獲得更多權限）

使用 `toolsBySender` 對 `"*"` 套用更嚴格的策略，並對您的暱稱套用較寬鬆的策略：

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

備註：

- `toolsBySender` 鍵應針對 IRC 傳送者身分值使用 `id:`：
  使用 `id:eigen` 或 `id:eigen!~eigen@174.127.248.171` 以進行更強的匹配。
- 舊版無前綴鍵仍會被接受，並且僅作為 `id:` 進行匹配。
- 第一個匹配的傳送者策略優先；`"*"` 是萬用字元回退選項。

有關群組存取與提及閘控的更多資訊（以及它們如何互動），請參閱：[/channels/groups](/en/channels/groups)。

## NickServ

若要在連線後透過 NickServ 驗證身分：

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

暱稱註冊後停用 `register`，以避免重複嘗試註冊 (REGISTER)。

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

## 疑難排解

- 如果機器人已連線但在頻道中從未回覆，請驗證 `channels.irc.groups` **以及**提及封鎖是否正在捨棄訊息（`missing-mention`）。如果您希望它在無需提及的情況下回覆，請為該頻道設定 `requireMention:false`。
- 如果登入失敗，請驗證暱稱可用性和伺服器密碼。
- 如果在自訂網路上 TLS 失敗，請驗證主機/連接埠和憑證設定。

## 相關

- [頻道概覽](/en/channels) — 所有支援的頻道
- [配對](/en/channels/pairing) — 私訊認證與配對流程
- [群組](/en/channels/groups) — 群組聊天行為與提及閘道
- [頻道路由](/en/channels/channel-routing) — 訊息的會話路由
- [安全性](/en/gateway/security) — 存取模型與防護加固
