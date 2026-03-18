---
title: IRC
description: 將 OpenClaw 連線至 IRC 頻道與直接訊息。
summary: "IRC 外掛設定、存取控制與疑難排解"
read_when:
  - You want to connect OpenClaw to IRC channels or DMs
  - You are configuring IRC allowlists, group policy, or mention gating
---

當您希望 OpenClaw 出現在經典頻道（`#room`）與直接訊息中時，請使用 IRC。
IRC 以擴充外掛形式提供，但在主設定中的 `channels.irc` 下進行設定。

## 快速開始

1. 在 `~/.openclaw/openclaw.json` 中啟用 IRC 設定。
2. 至少設定：

```json
{
  "channels": {
    "irc": {
      "enabled": true,
      "host": "irc.libera.chat",
      "port": 6697,
      "tls": true,
      "nick": "openclaw-bot",
      "channels": ["#openclaw"]
    }
  }
}
```

3. 啟動/重新啟動閘道：

```bash
openclaw gateway run
```

## 安全預設值

- `channels.irc.dmPolicy` 預設為 `"pairing"`。
- `channels.irc.groupPolicy` 預設為 `"allowlist"`。
- 使用 `groupPolicy="allowlist"` 時，設定 `channels.irc.groups` 以定義允許的頻道。
- 除非您有意接受明文傳輸，否則請使用 TLS（`channels.irc.tls=true`）。

## 存取控制

IRC 頻道有兩個獨立的「閘門」：

1. **頻道存取**（`groupPolicy` + `groups`）：機器人是否完全接受來自頻道的訊息。
2. **傳送者存取**（`groupAllowFrom` / 各頻道 `groups["#channel"].allowFrom`）：誰被允許在該頻道內觸發機器人。

設定鍵：

- DM 白名單（DM 傳送者存取）：`channels.irc.allowFrom`
- 群組傳送者白名單（頻道傳送者存取）：`channels.irc.groupAllowFrom`
- 各頻道控制（頻道 + 傳送者 + 提及規則）：`channels.irc.groups["#channel"]`
- `channels.irc.groupPolicy="open"` 允許未設定的頻道（**預設仍有提及限制**）

白名單項目應使用穩定的傳送者身分（`nick!user@host`）。
純暱稱比對是可變的，僅在 `channels.irc.dangerouslyAllowNameMatching: true` 時啟用。

### 常見陷阱：`allowFrom` 是用於 DM，而非頻道

如果您看到類似以下的日誌：

- `irc: drop group sender alice!ident@host (policy=allowlist)`

……這表示傳送者未被允許傳送 **群組/頻道** 訊息。請透過以下任一方式修正：

- 設定 `channels.irc.groupAllowFrom`（所有頻道全域），或
- 設定各頻道傳送者白名單：`channels.irc.groups["#channel"].allowFrom`

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

## 回應觸發（提及）

即使頻道已獲允許（透過 `groupPolicy` + `groups`）且傳送者已獲允許，OpenClaw 在群組情境中預設為 **提及限制（mention-gating）**。

這意味著除非訊息包含符合機器人的提及模式，否則您可能會看到像 `drop channel … (missing-mention)` 這樣的日誌。

若要讓機器人在 IRC 頻道中回覆**而不需要提及**，請停用該頻道的提及限制：

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

或者允許 **所有** IRC 頻道（無各頻道白名單）且仍無需提及即可回覆：

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

## 安全注意（建議用於公開頻道）

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

### 依傳送者區分不同工具（擁有者擁有更多權限）

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

備註：

- `toolsBySender` 鍵應對 IRC 傳送者身分值使用 `id:`：
  使用 `id:eigen` 或 `id:eigen!~eigen@174.127.248.171` 以進行更強的比對。
- 舊版無前綴的鍵仍被接受，且僅作為 `id:` 進行比對。
- 第一個符合的傳送者策略優先；`"*"` 是萬用字元後備選項。

關於群組存取與提及限制（以及它們如何互動）的更多資訊，請參閱：[/channels/groups](/zh-Hant/channels/groups)。

## NickServ

若要在連線後以 NickServ 身分驗證：

```json
{
  "channels": {
    "irc": {
      "nickserv": {
        "enabled": true,
        "service": "NickServ",
        "password": "your-nickserv-password"
      }
    }
  }
}
```

連線時可選的一次性註冊：

```json
{
  "channels": {
    "irc": {
      "nickserv": {
        "register": true,
        "registerEmail": "bot@example.com"
      }
    }
  }
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
- `IRC_CHANNELS` (逗號分隔)
- `IRC_NICKSERV_PASSWORD`
- `IRC_NICKSERV_REGISTER_EMAIL`

## 疑難排解

- 如果機器人已連線但從未在頻道中回覆，請驗證 `channels.irc.groups` **以及**提及封鎖（mention-gating）是否正在丟棄訊息（`missing-mention`）。如果您希望它在無需被 ping 的情況下回覆，請為該頻道設定 `requireMention:false`。
- 如果登入失敗，請驗證暱稱可用性與伺服器密碼。
- 如果 TLS 在自訂網路上失敗，請驗證主機/連接埠與憑證設定。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
