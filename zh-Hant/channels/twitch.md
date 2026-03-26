---
summary: "Twitch 聊天機器人配置與設定"
read_when:
  - Setting up Twitch chat integration for OpenClaw
title: "Twitch"
---

# Twitch (外掛程式)

透過 IRC 連線支援 Twitch 聊天。OpenClaw 以 Twitch 使用者（機器人帳戶）身分連線，以在頻道中接收和傳送訊息。

## 需要外掛程式

Twitch 以外掛程式形式提供，並未隨附於核心安裝中。

透過 CLI 安裝 (npm registry)：

```bash
openclaw plugins install @openclaw/twitch
```

本地取出 (當從 git 儲存庫執行時)：

```bash
openclaw plugins install ./extensions/twitch
```

詳細資訊：[外掛程式](/zh-Hant/tools/plugin)

## 快速設定 (初學者)

1. 為機器人建立專用的 Twitch 帳戶 (或使用現有帳戶)。
2. 產生憑證：[Twitch Token Generator](https://twitchtokengenerator.com/)
   - 選取 **Bot Token**
   - 確認已選取權限 `chat:read` 和 `chat:write`
   - 複製 **Client ID** 和 **Access Token**
3. 尋找您的 Twitch 使用者 ID：[https://www.streamweasels.com/tools/convert-twitch-username-to-user-id/](https://www.streamweasels.com/tools/convert-twitch-username-to-user-id/)
4. 設定 Token：
   - 環境變數： `OPENCLAW_TWITCH_ACCESS_TOKEN=...` (僅限預設帳戶)
   - 或設定檔： `channels.twitch.accessToken`
   - 如果同時設定了兩者，設定檔優先採用 (環境變數的回退機制僅適用於預設帳戶)。
5. 啟動 Gateway。

**⚠️ 重要提示：** 加入存取控制 (`allowFrom` 或 `allowedRoles`) 以防止未授權使用者觸發機器人。`requireMention` 預設為 `true`。

最精簡設定：

```json5
{
  channels: {
    twitch: {
      enabled: true,
      username: "openclaw", // Bot's Twitch account
      accessToken: "oauth:abc123...", // OAuth Access Token (or use OPENCLAW_TWITCH_ACCESS_TOKEN env var)
      clientId: "xyz789...", // Client ID from Token Generator
      channel: "vevisk", // Which Twitch channel's chat to join (required)
      allowFrom: ["123456789"], // (recommended) Your Twitch user ID only - get it from https://www.streamweasels.com/tools/convert-twitch-username-to-user-id/
    },
  },
}
```

## 運作方式

- 由 Gateway 擁有的 Twitch 頻道。
- 確定性路由：回覆一律會傳回至 Twitch。
- 每個帳戶都對應到一個獨立的 session key `agent:<agentId>:twitch:<accountName>`。
- `username` 是機器人的帳戶 (進行驗證的一方)，`channel` 則是要加入的聊天室。

## 設定 (詳細)

### 產生憑證

使用 [Twitch Token Generator](https://twitchtokengenerator.com/)：

- 選取 **Bot Token**
- 確認已選取 `chat:read` 和 `chat:write` 範圍
- 複製 **Client ID** 和 **Access Token**

無需手動註冊應用程式。Token 會在數小時後過期。

### 設定機器人

**環境變數（僅限預設帳戶）：**

```bash
OPENCLAW_TWITCH_ACCESS_TOKEN=oauth:abc123...
```

**或設定檔：**

```json5
{
  channels: {
    twitch: {
      enabled: true,
      username: "openclaw",
      accessToken: "oauth:abc123...",
      clientId: "xyz789...",
      channel: "vevisk",
    },
  },
}
```

如果同時設定了環境變數和設定檔，則以設定檔為準。

### 存取控制（建議）

```json5
{
  channels: {
    twitch: {
      allowFrom: ["123456789"], // (recommended) Your Twitch user ID only
    },
  },
}
```

若要嚴格使用允許清單，建議優先使用 `allowFrom`。如果您想要基於角色的存取控制，請改用 `allowedRoles`。

**可用角色：** `"moderator"`、`"owner"`、`"vip"`、`"subscriber"`、`"all"`。

**為什麼要使用使用者 ID？** 使用者名稱可以變更，從而允許冒充行為。使用者 ID 是永久的。

尋找您的 Twitch 使用者 ID：[https://www.streamweasels.com/tools/convert-twitch-username-to-user-id/](https://www.streamweasels.com/tools/convert-twitch-username-to-user-id/) （將您的 Twitch 使用者名稱轉換為 ID）

## 權杖重新整理（選用）

來自 [Twitch Token Generator](https://twitchtokengenerator.com/) 的權杖無法自動重新整理 - 過期時請重新產生。

若要自動重新整理權杖，請在 [Twitch Developer Console](https://dev.twitch.tv/console) 建立您自己的 Twitch 應用程式並加入至設定：

```json5
{
  channels: {
    twitch: {
      clientSecret: "your_client_secret",
      refreshToken: "your_refresh_token",
    },
  },
}
```

機器人會在過期前自動重新整理權杖，並記錄重新整理事件。

## 多帳號支援

將 `channels.twitch.accounts` 與個別帳號的權杖搭配使用。參閱 [`gateway/configuration`](/zh-Hant/gateway/configuration) 以了解共用模式。

範例（一個機器人帳號在兩個頻道中）：

```json5
{
  channels: {
    twitch: {
      accounts: {
        channel1: {
          username: "openclaw",
          accessToken: "oauth:abc123...",
          clientId: "xyz789...",
          channel: "vevisk",
        },
        channel2: {
          username: "openclaw",
          accessToken: "oauth:def456...",
          clientId: "uvw012...",
          channel: "secondchannel",
        },
      },
    },
  },
}
```

**注意：** 每個帳號都需要自己的權杖（每個頻道一個權杖）。

## 存取控制

### 基於角色的限制

```json5
{
  channels: {
    twitch: {
      accounts: {
        default: {
          allowedRoles: ["moderator", "vip"],
        },
      },
    },
  },
}
```

### 依使用者 ID 白名單（最安全）

```json5
{
  channels: {
    twitch: {
      accounts: {
        default: {
          allowFrom: ["123456789", "987654321"],
        },
      },
    },
  },
}
```

### 基於角色的存取（替代方案）

`allowFrom` 是一個嚴格的允許清單。設定後，僅允許這些使用者 ID。
如果您想要基於角色的存取控制，請保持 `allowFrom` 未設定，並改為設定 `allowedRoles`：

```json5
{
  channels: {
    twitch: {
      accounts: {
        default: {
          allowedRoles: ["moderator"],
        },
      },
    },
  },
}
```

### 停用 @提及 要求

預設情況下，`requireMention` 為 `true`。若要停用並回應所有訊息：

```json5
{
  channels: {
    twitch: {
      accounts: {
        default: {
          requireMention: false,
        },
      },
    },
  },
}
```

## 疑難排解

首先，執行診斷指令：

```bash
openclaw doctor
openclaw channels status --probe
```

### 機器人不回應訊息

**檢查存取控制：** 確保您的使用者 ID 在 `allowFrom` 中，或是暫時移除
`allowFrom` 並設定 `allowedRoles: ["all"]` 進行測試。

**檢查機器人是否在頻道中：** 機器人必須加入 `channel` 中指定的頻道。

### 權杖問題

**「連線失敗」或驗證錯誤：**

- 驗證 `accessToken` 是 OAuth 存取權杖值（通常以 `oauth:` 前綴開頭）
- 檢查權杖是否具有 `chat:read` 和 `chat:write` 範圍
- 如果使用權杖重新整理，請驗證 `clientSecret` 和 `refreshToken` 已設定

### 權杖重新整理無法運作

**檢查日誌中的重新整理事件：**

```
Using env token source for mybot
Access token refreshed for user 123456 (expires in 14400s)
```

如果您看到「token refresh disabled (no refresh token)」：

- 確保已提供 `clientSecret`
- 確保已提供 `refreshToken`

## 設定

**帳號設定：**

- `username` - Bot 使用者名稱
- `accessToken` - 具有 `chat:read` 和 `chat:write` 的 OAuth 存取權杖
- `clientId` - Twitch Client ID（來自權杖產生器或您的應用程式）
- `channel` - 要加入的頻道（必填）
- `enabled` - 啟用此帳號（預設：`true`）
- `clientSecret` - 選填：用於自動更新權杖
- `refreshToken` - 選填：用於自動更新權杖
- `expiresIn` - 權杖有效期限（秒）
- `obtainmentTimestamp` - 權杖取得的時間戳記
- `allowFrom` - 使用者 ID 允許清單
- `allowedRoles` - 基於角色的存取控制（`"moderator" | "owner" | "vip" | "subscriber" | "all"`）
- `requireMention` - 要求 @提及（預設：`true`）

**提供者選項：**

- `channels.twitch.enabled` - 啟用/停用頻道啟動
- `channels.twitch.username` - 機器人使用者名稱（簡化的單一帳號設定）
- `channels.twitch.accessToken` - OAuth 存取權杖（簡化的單一帳號設定）
- `channels.twitch.clientId` - Twitch 用戶端 ID（簡化的單一帳號設定）
- `channels.twitch.channel` - 要加入的頻道（簡化的單一帳號設定）
- `channels.twitch.accounts.<accountName>` - 多帳號設定（上述所有帳號欄位）

完整範例：

```json5
{
  channels: {
    twitch: {
      enabled: true,
      username: "openclaw",
      accessToken: "oauth:abc123...",
      clientId: "xyz789...",
      channel: "vevisk",
      clientSecret: "secret123...",
      refreshToken: "refresh456...",
      allowFrom: ["123456789"],
      allowedRoles: ["moderator", "vip"],
      accounts: {
        default: {
          username: "mybot",
          accessToken: "oauth:abc123...",
          clientId: "xyz789...",
          channel: "your_channel",
          enabled: true,
          clientSecret: "secret123...",
          refreshToken: "refresh456...",
          expiresIn: 14400,
          obtainmentTimestamp: 1706092800000,
          allowFrom: ["123456789", "987654321"],
          allowedRoles: ["moderator"],
        },
      },
    },
  },
}
```

## 工具操作

代理程式可以使用 action 呼叫 `twitch`：

- `send` - 發送訊息至頻道

範例：

```json5
{
  action: "twitch",
  params: {
    message: "Hello Twitch!",
    to: "#mychannel",
  },
}
```

## 安全性與營運

- **將權杖視為密碼** - 絕不要將權杖提交至 git
- **長期運作的機器人請使用自動權杖更新**
- **使用使用者 ID 白名單** 代替使用者名稱進行存取控制
- **監控日誌** 以查看權杖更新事件和連線狀態
- **最小化權杖範圍** - 僅請求 `chat:read` 和 `chat:write`
- **如果卡住**：確認沒有其他程序佔用該會話後，重啟閘道

## 限制

- **500 個字元**（每則訊息會在單字邊界自動分割）
- Markdown 會在分割前被移除
- 無速率限制（使用 Twitch 內建的速率限制）

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
