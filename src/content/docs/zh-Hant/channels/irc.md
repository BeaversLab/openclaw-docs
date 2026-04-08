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
      host: "irc.example.com",
      port: 6697,
      tls: true,
      nick: "openclaw-bot",
      channels: ["#openclaw"],
    },
  },
}
```

優先使用私人 IRC 伺服器進行機器人協調。如果您有意使用公共 IRC 網路，常見的選擇包括 Libera.Chat、OFTC 和 Snoonet。避免使用可預測的公開頻道來傳輸機器人或群體後通訊流量。

3. 啟動/重啟閘道：

```bash
openclaw gateway run
```

## 安全性預設值

- `channels.irc.dmPolicy` 預設為 `"pairing"`。
- `channels.irc.groupPolicy` 預設為 `"allowlist"`。
- 使用 `groupPolicy="allowlist"` 時，設定 `channels.irc.groups` 以定義允許的頻道。
- 使用 TLS (`channels.irc.tls=true`)，除非您有意接受明文傳輸。

## 存取控制

IRC 頻道有兩個分開的「閘門」：

1. **頻道存取** (`groupPolicy` + `groups`)：機器人是否完全接受來自頻道的訊息。
2. **發送者存取** (`groupAllowFrom` / 逐頻道 `groups["#channel"].allowFrom`)：誰被允許在該頻道內觸發機器人。

設定鍵 (Config keys)：

- DM 允許清單 (DM 發送者存取)：`channels.irc.allowFrom`
- 群組發送者允許清單 (頻道發送者存取)：`channels.irc.groupAllowFrom`
- 逐頻道控制 (頻道 + 發送者 + 提及規則)：`channels.irc.groups["#channel"]`
- `channels.irc.groupPolicy="open"` 允許未設定的頻道 (**預設仍受提及限制**)

允許清單項目應使用穩定的發送者身分 (`nick!user@host`)。
純暱稱匹配是可變的，僅在 `channels.irc.dangerouslyAllowNameMatching: true` 時啟用。

### 常見錯誤：`allowFrom` 是針對 DM，而非頻道

如果您看到類似以下的日誌：

- `irc: drop group sender alice!ident@host (policy=allowlist)`

……這表示該發送者未被允許發送 **群組/頻道** 訊息。您可以透過以下任一方式修正：

- 設定 `channels.irc.groupAllowFrom` (全域適用於所有頻道)，或
- 設定逐頻道發送者允許清單：`channels.irc.groups["#channel"].allowFrom`

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

即使頻道已獲授權 (透過 `groupPolicy` + `groups`) 且發送者已獲授權，OpenClaw 在群組情境下仍預設採用 **提及限制**。

這意味著除非訊息包含符合機器人的提及模式，否則您可能會看到像 `drop channel … (missing-mention)` 這樣的日誌。

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

使用 `toolsBySender` 對 `"*"` 應用更嚴格的策略，並對您的暱稱應用更寬鬆的策略：

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

- `toolsBySender` 鍵應使用 `id:` 作為 IRC 發送者身份值：
  `id:eigen` 或 `id:eigen!~eigen@174.127.248.171` 用於更強的匹配。
- 舊的無前綴鍵仍然被接受並僅作為 `id:` 匹配。
- 第一個匹配的發送者策略獲勝；`"*"` 是通配符回退。

有關群組訪問與提及閘門的更多資訊（以及它們如何互動），請參閱：[/channels/groups](/en/channels/groups)。

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

在暱稱註冊後停用 `register` 以避免重複的 REGISTER 嘗試。

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

## 故障排除

- 如果機器人已連線但從未在頻道中回覆，請驗證 `channels.irc.groups` **以及**提及閘門是否正在丟棄訊息（`missing-mention`）。如果您希望它在無需 ping 的情況下回覆，請為該頻道設定 `requireMention:false`。
- 如果登入失敗，請驗證暱稱可用性和伺服器密碼。
- 如果在自訂網路上 TLS 失敗，請驗證主機/埠號和憑證設定。

## 相關

- [頻道概覽](/en/channels) — 所有支援的頻道
- [配對](/en/channels/pairing) — DM 驗證與配對流程
- [群組](/en/channels/groups) — 群組聊天行為與提及閘控
- [頻道路由](/en/channels/channel-routing) — 訊息的會話路由
- [安全性](/en/gateway/security) — 存取模型與加固
