---
title: IRC
summary: "IRC 外掛程式設定、存取控制與疑難排解"
read_when:
  - You want to connect OpenClaw to IRC channels or DMs
  - You are configuring IRC allowlists, group policy, or mention gating
---

# IRC

當您希望 OpenClaw 出現在經典頻道 (`#room`) 和直接訊息中時，請使用 IRC。
IRC 以擴充外掛程式的形式提供，但在主設定檔的 `channels.irc` 下進行設定。

## 快速入門

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

```exec
openclaw gateway run
```

## 安全性預設值

- `channels.irc.dmPolicy` 預設為 `"pairing"`。
- `channels.irc.groupPolicy` 預設為 `"allowlist"`。
- 使用 `groupPolicy="allowlist"` 時，設定 `channels.irc.groups` 以定義允許的頻道。
- 除非您有意接受明文傳輸，否則請使用 TLS (`channels.irc.tls=true`)。

## 存取控制

IRC 頻道有兩個分開的「閘門」：

1. **頻道存取** (`groupPolicy` + `groups`)：機器人是否接受來自頻道的訊息。
2. **發送者存取** (`groupAllowFrom` / 依頻道 `groups["#channel"].allowFrom`)：誰被允許在該頻道中觸發機器人。

配置鍵：

- DM 許可清單 (DM 發送者存取)：`channels.irc.allowFrom`
- 群組發送者許可清單 (頻道發送者存取)：`channels.irc.groupAllowFrom`
- 依頻道控制 (頻道 + 發送者 + 提及規則)：`channels.irc.groups["#channel"]`
- `channels.irc.groupPolicy="open"` 允許未配置的頻道 (**預設仍有提及限制**)

許可清單項目應使用穩定的發送者身分 (`nick!user@host`)。
純暱稱匹配是可變的，且僅在啟用 `channels.irc.dangerouslyAllowNameMatching: true` 時開啟。

### 常見陷阱：`allowFrom` 是針對 DM，而非頻道

如果您看到類似以下的日誌：

- `irc: drop group sender alice!ident@host (policy=allowlist)`

……這表示發送者未被允許發送**群組/頻道**訊息。您可以透過以下任一方式修正：

- 設定 `channels.irc.groupAllowFrom`（適用於所有頻道的全域設定），或
- 設定各頻道的發送者允許清單：`channels.irc.groups["#channel"].allowFrom`

範例（允許 `#tuirc-dev` 中的任何人與機器人交談）：

```json55
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

即使頻道已獲允許（透過 `groupPolicy` + `groups`）且發送者已獲授權，OpenClaw 在群組情境下仍預設為**提及閘控**。

這意味著除非訊息包含符合機器人的提及模式，否則您可能會看到類似 `drop channel … (missing-mention)` 的日誌。

若要讓機器人在 IRC 頻道中回覆**而不需提及**，請停用該頻道的提及閘控：

```json55
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

或者要允許**所有** IRC 頻道（沒有每頻道允許清單）並且仍然在無提及的情況下回覆：

```json55
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

## 安全注意事項（建議用於公開頻道）

如果您在公開頻道中允許 `allowFrom: ["*"]`，任何人都可以提示機器人。
為了降低風險，請限制該頻道的工具。

### 頻道中每個人都使用相同的工具

```json55
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

### 依發送者使用不同的工具（擁有者獲得更多權限）

使用 `toolsBySender` 對 `"*"` 套用更嚴格的策略，並對您的暱稱套用較寬鬆的策略：

```json55
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

注意事項：

- `toolsBySender` 金鑰應該使用 `id:` 作為 IRC 發送者身分值：
  `id:eigen` 或 `id:eigen!~eigen@174.127.248.171` 以進行更強的匹配。
- 舊版無前綴金鑰仍被接受，並且僅作為 `id:` 進行匹配。
- 第一個匹配的發送者策略優先；`"*"` 是萬用字元後備方案。

有關群組存取與提及閘門的更多資訊（以及它們如何互動），請參閱：[/channels/groups](/zh-Hant/channels/groups)。

## NickServ

連線後使用 NickServ 進行驗證：

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

在暱稱註冊後停用 `register` 以避免重複嘗試 REGISTER。

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

- 如果機器人已連接但從未在頻道中回覆，請檢查 `channels.irc.groups` **以及**提及過濾是否正在丟棄訊息（`missing-mention`）。如果您希望它在沒有 ping 的情況下回覆，請為該頻道設定 `requireMention:false`。
- 如果登入失敗，請驗證暱稱可用性和伺服器密碼。
- 如果 TLS 在自訂網路上失敗，請驗證主機/連接埠和憑證設定。
