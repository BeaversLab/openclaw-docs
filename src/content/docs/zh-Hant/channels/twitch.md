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

如果您使用的是舊版本組建或未包含 Twitch 的自訂安裝，請直接安裝 npm 套件：

<Tabs>
  <Tab title="npm registry">```bash openclaw plugins install @openclaw/twitch ```</Tab>
  <Tab title="本機簽出">```bash openclaw plugins install ./path/to/local/twitch-plugin ```</Tab>
</Tabs>

使用基本套件以遵循目前正式發布標籤。僅在您需要可重現的安裝時才鎖定確切版本。

詳細資訊：[外掛程式](/zh-Hant/tools/plugin)

## 快速設定 (初學者)

<Steps>
  <Step title="確保外掛程式可用">
    目前封裝的 OpenClaw 發行版本已將其打包。舊版/自訂安裝可以使用上述命令手動新增。
  </Step>
  <Step title="建立 Twitch 機器人帳戶">
    建立專用的 Twitch 機器人帳戶（或使用現有帳戶）。
  </Step>
  <Step title="產生憑證">
    使用 [Twitch Token Generator](https://twitchtokengenerator.com/)：

    - 選擇 **Bot Token**
    - 確認範圍 `chat:read` 和 `chat:write` 已被選取
    - 複製 **Client ID** 和 **Access Token**

  </Step>
  <Step title="尋找您的 Twitch 使用者 ID">
    使用 [https://www.streamweasels.com/tools/convert-twitch-username-to-user-id/](https://www.streamweasels.com/tools/convert-twitch-username-to-user-id/) 將使用者名稱轉換為 Twitch 使用者 ID。
  </Step>
  <Step title="設定權杖">
    - 環境變數： `OPENCLAW_TWITCH_ACCESS_TOKEN=...` (僅限預設帳戶)
    - 或設定檔： `channels.twitch.accessToken`

    如果同時設定兩者，設定檔優先（環境變數後備僅適用於預設帳戶）。

  </Step>
  <Step title="啟動閘道">
    使用已設定的頻道啟動閘道。
  </Step>
</Steps>

<Warning>新增存取控制（`allowFrom` 或 `allowedRoles`）以防止未授權使用者觸發機器人。 `requireMention` 預設為 `true`。</Warning>

最小設定：

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
- 決定性路由：回覆一律返回 Twitch。
- 每個帳戶對應到一個獨立的 session key `agent:<agentId>:twitch:<accountName>`。
- `username` 是機器人的帳戶（進行驗證的對象）， `channel` 是要加入的聊天室。

## 設定（詳細）

### 產生憑證

使用 [Twitch Token Generator](https://twitchtokengenerator.com/)：

- 選取 **Bot Token**
- 確認已選取範圍 `chat:read` 和 `chat:write`
- 複製 **Client ID** 和 **Access Token**

<Note>無需手動註冊應用程式。Token 會在數小時後過期。</Note>

### 設定機器人

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

如果同時設定了環境變數和設定檔，將以設定檔為準。

### 存取控制（推薦）

```json5
{
  channels: {
    twitch: {
      allowFrom: ["123456789"], // (recommended) Your Twitch user ID only
    },
  },
}
```

若要嚴格限制存取，建議優先使用 `allowFrom`。如果您想要基於角色的存取控制，請改用 `allowedRoles`。

**可用角色：** `"moderator"`、`"owner"`、`"vip"`、`"subscriber"`、`"all"`。

<Note>
**為什麼要用使用者 ID？** 使用者名稱可以變更，這可能會導致冒充。使用者 ID 是永久性的。

尋找您的 Twitch 使用者 ID：[https://www.streamweasels.com/tools/convert-twitch-username-to-user-id/](https://www.streamweasels.com/tools/convert-twitch-username-to-user-id/) （將您的 Twitch 使用者名稱轉換為 ID）

</Note>

## Token 更新（可選）

來自 [Twitch Token Generator](https://twitchtokengenerator.com/) 的 Token 無法自動更新 —— 過期後請重新產生。

若要自動更新 Token，請在 [Twitch Developer Console](https://dev.twitch.tv/console) 建立您自己的 Twitch 應用程式並加入至設定：

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

機器人會在過期前自動更新 Token 並記錄更新事件。

## 多重帳號支援

使用 `channels.twitch.accounts` 搭配各個帳號的 Token。請參閱 [Configuration](/zh-Hant/gateway/configuration) 瞭解共用模式。

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

<Note>每個帳號都需要自己的 Token（每個頻道一個 Token）。</Note>

## 存取控制

<Tabs>
  <Tab title="User ID allowlist (most secure)">
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

    `allowFrom` 是一個嚴格的白名單。設定後，僅允許那些使用者 ID。如果您想要基於角色的存取權限，請保持 `allowFrom` 未設定，並改為設定 `allowedRoles`。

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
    - **檢查存取控制：** 確認您的使用者 ID 在 `allowFrom` 中，或是暫時移除 `allowFrom` 並設定 `allowedRoles: ["all"]` 進行測試。
    - **檢查 bot 是否在頻道中：** Bot 必須加入 `channel` 中指定的頻道。

  </Accordion>
  <Accordion title="Token 問題">
    「連線失敗」或驗證錯誤：

    - 驗證 `accessToken` 是否為 OAuth 存取 token 值（通常以 `oauth:` 前綴開頭）
    - 檢查 token 是否具有 `chat:read` 和 `chat:write` 範圍
    - 如果使用 token 刷新，請驗證 `clientSecret` 和 `refreshToken` 是否已設定

  </Accordion>
  <Accordion title="Token 刷新無法運作">
    檢查日誌中的刷新事件：

    ```
    Using env token source for mybot
    Access token refreshed for user 123456 (expires in 14400s)
    ```

    如果您看到「token refresh disabled (no refresh token)」：

    - 確認已提供 `clientSecret`
    - 確認已提供 `refreshToken`

  </Accordion>
</AccordionGroup>

## 設定

### 帳號設定

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
  權杖過期時間（以秒為單位）。
</ParamField>
<ParamField path="obtainmentTimestamp" type="number">
  取得權杖的時間戳記。
</ParamField>
<ParamField path="allowFrom" type="string[]">
  使用者 ID 允許清單。
</ParamField>
<ParamField path="allowedRoles" type='Array<"moderator" | "owner" | "vip" | "subscriber" | "all">'>
  基於角色的存取控制。
</ParamField>
<ParamField path="requireMention" type="boolean" default="true">
  需要 @提及。
</ParamField>

### 提供者選項

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

## 工具動作

代理程式可以使用動作呼叫 `twitch`：

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

- **將 Token 視為密碼** — 絕不要將 Token 提交到 git。
- **對長時間運行的機器人使用自動 Token 刷新**。
- **使用使用者 ID 白名單** 而非使用者名稱進行存取控制。
- **監控日誌** 以查看 Token 刷新事件和連線狀態。
- **將 Token 範圍限制在最小** — 僅請求 `chat:read` 和 `chat:write`。
- **如果卡住**：確認沒有其他程序佔用該會話後，重新啟動閘道。

## 限制

- **每則訊息 500 個字元**（在單字邊界自動分割）。
- Markdown 會在分割前被移除。
- 無速率限制（使用 Twitch 內建的速率限制）。

## 相關

- [頻道路由](/zh-Hant/channels/channel-routing) — 訊息的會話路由
- [頻道總覽](/zh-Hant/channels) — 所有支援的頻道
- [群組](/zh-Hant/channels/groups) — 群組聊天行為和提及控管
- [配對](/zh-Hant/channels/pairing) — DM 驗證和配對流程
- [安全性](/zh-Hant/gateway/security) — 存取模型和強化措施
