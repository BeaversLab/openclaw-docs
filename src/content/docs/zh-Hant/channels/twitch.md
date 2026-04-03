---
summary: "Twitch 聊天機器人配置與設置"
read_when:
  - Setting up Twitch chat integration for OpenClaw
title: "Twitch"
---

# Twitch (外掛程式)

透過 IRC 連線支援 Twitch 聊天。OpenClaw 作為 Twitch 使用者（機器人帳戶）連線，以接收和傳送頻道中的訊息。

## 需要外掛程式

Twitch 以外掛程式形式發行，並未隨附於核心安裝中。

透過 CLI 安裝 (npm registry)：

```bash
openclaw plugins install @openclaw/twitch
```

本機簽出 (當從 git repo 執行時)：

```bash
openclaw plugins install ./path/to/local/twitch-plugin
```

詳細資訊：[外掛程式](/en/tools/plugin)

## 快速設置 (初學者)

1. 為機器人建立一個專用的 Twitch 帳戶 (或使用現有帳戶)。
2. 產生憑證：[Twitch Token Generator](https://twitchtokengenerator.com/)
   - 選取 **Bot Token**
   - 驗證已選取權限 `chat:read` 和 `chat:write`
   - 複製 **Client ID** 和 **Access Token**
3. 尋找您的 Twitch 使用者 ID：[https://www.streamweasels.com/tools/convert-twitch-username-to-user-id/](https://www.streamweasels.com/tools/convert-twitch-username-to-user-id/)
4. 設置 Token：
   - 環境變數：`OPENCLAW_TWITCH_ACCESS_TOKEN=...` (僅限預設帳戶)
   - 或設定檔：`channels.twitch.accessToken`
   - 若同時設定了兩者，設定檔優先 (環境變數後備僅適用於預設帳戶)。
5. 啟動閘道。

**⚠️ 重要：** 新增存取控制 (`allowFrom` 或 `allowedRoles`) 以防止未授權使用者觸發機器人。`requireMention` 預設為 `true`。

最小化設定：

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

## 它是什麼

- 由閘道擁有的 Twitch 頻道。
- 確定性路由：回覆一律傳回 Twitch。
- 每個帳戶對應到一個獨立的會話金鑰 `agent:<agentId>:twitch:<accountName>`。
- `username` 是機器人的帳戶 (進行驗證的人)，`channel` 是要加入的聊天室。

## 設置 (詳細)

### 產生憑證

使用 [Twitch Token Generator](https://twitchtokengenerator.com/)：

- 選取 **Bot Token**
- 驗證已選取權限 `chat:read` 和 `chat:write`
- 複製 **Client ID** 和 **Access Token**

無需手動註冊應用程式。Token 會在數小時後過期。

### 設置機器人

**環境變數 (僅限預設帳戶)：**

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

若同時設定了環境變數和設定檔，設定檔優先。

### 存取控制 (建議)

```json5
{
  channels: {
    twitch: {
      allowFrom: ["123456789"], // (recommended) Your Twitch user ID only
    },
  },
}
```

若要嚴格設定允許名單，建議優先使用 `allowFrom`。如果您想要基於角色的存取權限，請改用 `allowedRoles`。

**可用角色：** `"moderator"`、`"owner"`、`"vip"`、`"subscriber"`、`"all"`。

**為何使用使用者 ID？** 使用者名稱可以變更，這可能允許冒充行為。使用者 ID 是永久性的。

尋找您的 Twitch 使用者 ID：[https://www.streamweasels.com/tools/convert-twitch-username-to-user-id/](https://www.streamweasels.com/tools/convert-twitch-username-to-user-id/) (將您的 Twitch 使用者名稱轉換為 ID)

## 權杖更新 (選用)

來自 [Twitch Token Generator](https://twitchtokengenerator.com/) 的權杖無法自動重新整理 — 過期時請重新產生。

若要自動重新整理權杖，請在 [Twitch Developer Console](https://dev.twitch.tv/console) 建立您自己的 Twitch 應用程式並加入設定：

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

機器人會在權杖過期前自動更新，並記錄更新事件。

## 多帳號支援

搭配各帳號的權杖使用 `channels.twitch.accounts`。請參閱 [`gateway/configuration`](/en/gateway/configuration) 以了解共用模式。

範例 (一個機器人帳號在兩個頻道中)：

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

**注意：** 每個帳號都需要自己的權杖 (每個頻道一個權杖)。

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

### 依使用者 ID 設定允許名單 (最安全)

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

### 基於角色的存取權限 (替代方案)

`allowFrom` 是一個嚴格的允許名單。設定後，僅允許這些使用者 ID。
如果您想要基於角色的存取權限，請保持 `allowFrom` 未設定，並改為設定 `allowedRoles`：

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

### 停用 @mention 要求

根據預設，`requireMention` 為 `true`。若要停用並回應所有訊息：

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

### 機器人未回應訊息

**檢查存取控制：** 確保您的使用者 ID 在 `allowFrom` 中，或是暫時移除
`allowFrom` 並設定 `allowedRoles: ["all"]` 以進行測試。

**檢查機器人是否在頻道中：** 機器人必須加入 `channel` 中指定的頻道。

### 權杖問題

**「連線失敗」或驗證錯誤：**

- 驗證 `accessToken` 是 OAuth 存取權杖值（通常以 `oauth:` 前綴開頭）
- 檢查權杖是否具有 `chat:read` 和 `chat:write` 範圍
- 如果使用權杖重新整理，請確認已設定 `clientSecret` 和 `refreshToken`

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
- `clientId` - Twitch 用戶端 ID（來自權杖產生器或您的應用程式）
- `channel` - 要加入的頻道（必填）
- `enabled` - 啟用此帳號（預設：`true`）
- `clientSecret` - 選填：用於自動權杖重新整理
- `refreshToken` - 選填：用於自動權杖重新整理
- `expiresIn` - 權杖過期時間（秒）
- `obtainmentTimestamp` - 權杖取得的時間戳記
- `allowFrom` - 使用者 ID 允許清單
- `allowedRoles` - 基於角色的存取控制（`"moderator" | "owner" | "vip" | "subscriber" | "all"`）
- `requireMention` - 需要 @提及（預設：`true`）

**提供者選項：**

- `channels.twitch.enabled` - 啟用/停用頻道啟動
- `channels.twitch.username` - Bot 使用者名稱（簡化的單一帳號設定）
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

## 工具動作

代理程式可以呼叫 `twitch` 執行動作：

- `send` - 傳送訊息至頻道

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

- **將令牌視為密碼** - 永遠不要將令牌提交到 git
- 對於長期運行的機器人，**使用自動令牌刷新**
- **使用用戶 ID 允許列表** 而非用戶名進行存取控制
- **監控日誌** 以查看令牌刷新事件和連接狀態
- **最小化令牌範圍** - 僅請求 `chat:read` 和 `chat:write`
- **如果卡住**：確認沒有其他程序佔用該會話後，重新啟動網關

## 限制

- **每則訊息 500 個字元**（會在單字邊界自動分塊）
- Markdown 會在分塊前被移除
- 沒有速率限制（使用 Twitch 內建的速率限制）

## 相關

- [頻道概覽](/en/channels) — 所有支援的頻道
- [配對](/en/channels/pairing) — DM 身份驗證與配對流程
- [群組](/en/channels/groups) — 群組聊天行為與提及控制
- [頻道路由](/en/channels/channel-routing) — 訊息的會話路由
- [安全性](/en/gateway/security) — 存取模型與強化防護
