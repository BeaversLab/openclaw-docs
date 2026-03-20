---
title: IRC
description: 將 OpenClaw 連接到 IRC 頻道和直接訊息。
summary: "IRC 外掛程式設定、存取控制及疑難排解"
read_when:
  - 您想要將 OpenClaw 連接到 IRC 頻道或 DM
  - 您正在設定 IRC 允許清單、群組原則或提及閘道
---

當您希望 OpenClaw 出現在經典頻道 (`#room`) 和直接訊息中時，請使用 IRC。
IRC 作為擴充外掛程式提供，但在主設定中的 `channels.irc` 下進行設定。

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
- 使用 `groupPolicy="allowlist"` 時，請設定 `channels.irc.groups` 來定義允許的頻道。
- 使用 TLS (`channels.irc.tls=true`)，除非您有意接受明文傳輸。

## 存取控制

IRC 頻道有兩個獨立的「閘門」：

1. **頻道存取權** (`groupPolicy` + `groups`)：機器人是否完全接受來自頻道的訊息。
2. **傳送者存取權** (`groupAllowFrom` / 每個頻道的 `groups["#channel"].allowFrom`)：誰被允許在該頻道內觸發機器人。

設定鍵：

- DM 允許清單 (DM 傳送者存取權)：`channels.irc.allowFrom`
- 群組傳送者允許清單 (頻道傳送者存取權)：`channels.irc.groupAllowFrom`
- 每個頻道的控制項 (頻道 + 傳送者 + 提及規則)：`channels.irc.groups["#channel"]`
- `channels.irc.groupPolicy="open"` 允許未設定的頻道 (**預設仍受提及閘道限制**)

允許清單項目應使用穩定的傳送者身分 (`nick!user@host`)。
純暱稱匹配是可變的，且僅在啟用 `channels.irc.dangerouslyAllowNameMatching: true` 時啟用。

### 常見錯誤：`allowFrom` 是用於 DM，而非頻道

如果您看到類似以下的日誌：

- `irc: drop group sender alice!ident@host (policy=allowlist)`

……這表示傳送者未被允許傳送 **群組/頻道** 訊息。請透過以下任一方式修正：

- 設定 `channels.irc.groupAllowFrom` (所有頻道的全域設定)，或
- 設定每個頻道的傳送者允許清單：`channels.irc.groups["#channel"].allowFrom`

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

## 回應觸發（提及）

即使允許了頻道 (透過 `groupPolicy` + `groups`) 且允許了傳送者，OpenClaw 在群組情境中仍預設為 **提及閘道**。

這表示除非訊息包含符合機器人的提及模式，否則您可能會看到如 `drop channel … (missing-mention)` 的日誌。

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
為了降低風險，請限制該頻道的工具。

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

- `toolsBySender` 鍵應使用 `id:` 作為 IRC 發送者身分識別值：
  使用 `id:eigen` 或 `id:eigen!~eigen@174.127.248.171` 進行更強的匹配。
- 舊版無前綴的鍵仍被接受，且僅作為 `id:` 進行匹配。
- 第一個符合的發送者策略優先；`"*"` 是萬用字元後備。

有關群組存取與提及閘控（以及它們如何互動）的更多資訊，請參閱：[/channels/groups](/zh-Hant/channels/groups)。

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

註冊暱稱後停用 `register`，以避免重複的 REGISTER 嘗試。

## 環境變數

預設帳戶支援：

- `IRC_HOST`
- `IRC_PORT`
- `IRC_TLS`
- `IRC_NICK`
- `IRC_USERNAME`
- `IRC_REALNAME`
- `IRC_PASSWORD`
- `IRC_CHANNELS` (以逗號分隔)
- `IRC_NICKSERV_PASSWORD`
- `IRC_NICKSERV_REGISTER_EMAIL`

## 疑難排解

- 如果機器人已連線但在頻道中從不回覆，請驗證 `channels.irc.groups` **以及** 提及閘控是否正在捨棄訊息 (`missing-mention`)。如果您希望它在沒有通知的情況下回覆，請為該頻道設定 `requireMention:false`。
- 如果登入失敗，請驗證暱稱可用性與伺服器密碼。
- 如果 TLS 在自訂網路上失敗，請驗證主機/連接埠與憑證設定。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
