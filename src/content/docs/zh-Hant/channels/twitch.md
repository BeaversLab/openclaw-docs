---
summary: "Twitch 聊天機器人配置與設定"
read_when:
  - Setting up Twitch chat integration for OpenClaw
title: "Twitch"
sidebarTitle: "Twitch"
---

透過 IRC 連線支援 Twitch 聊天。OpenClaw 作為 Twitch 使用者（機器人帳戶）連線，以接收和傳送頻道中的訊息。

## 內建外掛

<Note>Twitch 在目前的 OpenClaw 版本中作為內建外掛隨附，因此一般封裝版本不需要額外安裝。</Note>

如果您使用的是較舊的版本或未包含 Twitch 的自訂安裝版本，請手動進行安裝：

<Tabs>
  <Tab title="npm registry">```bash openclaw plugins install @openclaw/twitch ```</Tab>
  <Tab title="本機簽出">```bash openclaw plugins install ./path/to/local/twitch-plugin ```</Tab>
</Tabs>

詳細資訊：[外掛](/zh-Hant/tools/plugin)

## 快速設定（初學者）

<Steps>
  <Step title="確保外掛可用">
    目前的封裝版 OpenClaw 已內此外掛。較舊或自訂安裝版本可使用上述指令手動新增。
  </Step>
  <Step title="建立 Twitch 機器人帳號">
    建立一個專屬於機器人的 Twitch 帳號（或使用現有帳號）。
  </Step>
  <Step title="產生憑證">
    使用 [Twitch Token Generator](https://twitchtokengenerator.com/)：

    - 選取 **Bot Token**
    - 確認已選取範圍 `chat:read` 和 `chat:write`
    - 複製 **Client ID** 和 **Access Token**

  </Step>
  <Step title="尋找您的 Twitch 使用者 ID">
    使用 [https://www.streamweasels.com/tools/convert-twitch-username-to-user-id/](https://www.streamweasels.com/tools/convert-twitch-username-to-user-id/) 將使用者名稱轉換為 Twitch 使用者 ID。
  </Step>
  <Step title="設定 Token">
    - 環境變數：`OPENCLAW_TWITCH_ACCESS_TOKEN=...` (僅限預設帳號)
    - 或設定檔：`channels.twitch.accessToken`

    若兩者皆設定，設定檔優先（環境變數後援僅適用於預設帳號）。

  </Step>
  <Step title="啟動閘道">
    使用設定的頻道啟動閘道。
  </Step>
</Steps>

<Warning>Add access control (`allowFrom` or `allowedRoles`) to prevent unauthorized users from triggering the bot. `requireMention` defaults to `true`.</Warning>

最小配置：

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

- 一個由 Gateway 擁有的 Twitch 頻道。
- 確定性路由：回覆始終發回 Twitch。
- 每個帳戶都映射到一個隔離的 session key `agent:<agentId>:twitch:<accountName>`。
- `username` 是機器人的帳戶（進行身份驗證的人），`channel` 是要加入的聊天室。

## 設置（詳細）

### 生成憑證

使用 [Twitch Token Generator](https://twitchtokengenerator.com/)：

- 選擇 **Bot Token**
- 驗證範圍 `chat:read` 和 `chat:write` 已被選中
- 複製 **Client ID** 和 **Access Token**

<Note>無需手動註冊應用程式。Token 會在幾小時後過期。</Note>

### 配置機器人

<Tabs>
  <Tab title="Env var (default account only)">
    ```bash
    OPENCLAW_TWITCH_ACCESS_TOKEN=oauth:abc123...
    ```
  </Tab>
  <Tab title="Config">
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
  </Tab>
</Tabs>

如果同時設置了環境變量和配置，配置優先。

### 訪問控制（推薦）

```json5
{
  channels: {
    twitch: {
      allowFrom: ["123456789"], // (recommended) Your Twitch user ID only
    },
  },
}
```

如果需要嚴格的白名單，請優先使用 `allowFrom`。如果您希望基於角色的訪問控制，請改用 `allowedRoles`。

**可用角色：** `"moderator"`、`"owner"`、`"vip"`、`"subscriber"`、`"all"`。

<Note>
**為什麼是使用者 ID？** 使用者名稱可以更改，從而允許冒充。使用者 ID 是永久的。

查找您的 Twitch 使用者 ID：[https://www.streamweasels.com/tools/convert-twitch-username-to-user-id/](https://www.streamweasels.com/tools/convert-twitch-username-to-user-id/)（將您的 Twitch 使用者名稱轉換為 ID）

</Note>

## Token 刷新（可選）

來自 [Twitch Token Generator](https://twitchtokengenerator.com/) 的 Token 無法自動刷新 - 過期後請重新生成。

若要自動刷新 Token，請在 [Twitch Developer Console](https://dev.twitch.tv/console) 創建您自己的 Twitch 應用程式並將其添加到配置中：

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

機器人會在過期前自動刷新 Token 並記錄刷新事件。

## 多帳戶支援

使用 `channels.twitch.accounts` 搭配各個帳號的 token。請參閱 [Configuration](/zh-Hant/gateway/configuration) 以了解通用模式。

範例（一個 bot 帳號在兩個頻道中）：

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

<Note>每個帳號都需要自己的 token（每個頻道一個 token）。</Note>

## 存取控制

<Tabs>
  <Tab title="使用者 ID 白名單（最安全）">
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
  </Tab>
  <Tab title="基於角色">
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

    `allowFrom` 是一個嚴格的白名單。設定後，僅允許這些使用者 ID。如果您想要基於角色的存取權限，請保留 `allowFrom` 為未設定，並改為設定 `allowedRoles`。

  </Tab>
  <Tab title="停用 @mention 要求">
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

  </Tab>
</Tabs>

## 疑難排解

首先，執行診斷指令：

```bash
openclaw doctor
openclaw channels status --probe
```

<AccordionGroup>
  <Accordion title="Bot 不回應訊息">
    - **檢查存取控制：** 確保您的使用者 ID 在 `allowFrom` 中，或是暫時移除 `allowFrom` 並設定 `allowedRoles: ["all"]` 進行測試。
    - **檢查 bot 是否在頻道中：** Bot 必須加入 `channel` 中指定的頻道。
  </Accordion>
  <Accordion title="Token 問題">
    「連線失敗」或驗證錯誤：

    - 驗證 `accessToken` 是否為 OAuth 存取 token 值（通常以 `oauth:` 前綴開頭）
    - 檢查 token 是否具有 `chat:read` 和 `chat:write` 範圍
    - 如果使用 token 更新，請驗證 `clientSecret` 和 `refreshToken` 是否已設定

  </Accordion>
  <Accordion title="Token refresh not working">
    檢查日誌中的重新整理事件：

    ```
    Using env token source for mybot
    Access token refreshed for user 123456 (expires in 14400s)
    ```

    如果您看到 "token refresh disabled (no refresh token)"：

    - 確保已提供 `clientSecret`
    - 確保已提供 `refreshToken`

  </Accordion>
</AccordionGroup>

## 配置

### 帳號配置

<ParamField path="username" type="string">
  機器人使用者名稱。
</ParamField>
<ParamField path="accessToken" type="string">
  具有 `chat:read` 和 `chat:write` 的 OAuth 存取權杖。
</ParamField>
<ParamField path="clientId" type="string">
  Twitch 用戶端 ID（來自權杖產生器或您的應用程式）。
</ParamField>
<ParamField path="channel" type="string" required>
  要加入的頻道。
</ParamField>
<ParamField path="enabled" type="boolean" default="true">
  啟用此帳號。
</ParamField>
<ParamField path="clientSecret" type="string">
  選用：用於自動重新整理權杖。
</ParamField>
<ParamField path="refreshToken" type="string">
  選用：用於自動重新整理權杖。
</ParamField>
<ParamField path="expiresIn" type="number">
  權杖過期時間（秒）。
</ParamField>
<ParamField path="obtainmentTimestamp" type="number">
  取得權杖的時間戳記。
</ParamField>
<ParamField path="allowFrom" type="string[]">
  使用者 ID 白名單。
</ParamField>
<ParamField path="allowedRoles" type='Array<"moderator" | "owner" | "vip" | "subscriber" | "all">'>
  基於角色的存取控制。
</ParamField>
<ParamField path="requireMention" type="boolean" default="true">
  要求 @提及。
</ParamField>

### 提供者選項

- `channels.twitch.enabled` - 啟用/停用頻道啟動
- `channels.twitch.username` - 機器人使用者名稱（簡化的單一帳號配置）
- `channels.twitch.accessToken` - OAuth 存取權杖（簡化的單一帳號配置）
- `channels.twitch.clientId` - Twitch 用戶端 ID（簡化的單一帳號配置）
- `channels.twitch.channel` - 要加入的頻道（簡化的單一帳號配置）
- `channels.twitch.accounts.<accountName>` - 多帳號配置（上述所有帳號欄位）

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

代理程式可使用 action 呼叫 `twitch`：

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

## 安全性與操作

- **將權杖視為密碼** — 絕不要將權杖提交至 git。
- **長期運作的機器人請使用自動權杖更新**。
- **存取控制請使用使用者 ID 白名單**，而非使用者名稱。
- **監控日誌**以查看權杖更新事件與連線狀態。
- **最小化權杖範圍** — 僅請求 `chat:read` 與 `chat:write`。
- **若卡住**：確認沒有其他程序佔用該會話後，重新啟動閘道。

## 限制

- 每則訊息 **500 個字元**（會在單字邊界自動切割）。
- Markdown 會在切割前移除。
- 無速率限制（使用 Twitch 內建的速率限制）。

## 相關

- [頻道路由](/zh-Hant/channels/channel-routing) — 訊息的會話路由
- [頻道概覽](/zh-Hant/channels) — 所有支援的頻道
- [群組](/zh-Hant/channels/groups) — 群組聊天行為與提及閘門
- [配對](/zh-Hant/channels/pairing) — DM 認證與配對流程
- [安全性](/zh-Hant/gateway/security) — 存取模型與加固
