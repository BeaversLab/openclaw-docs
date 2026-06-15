---
summary: "Twilio SMS 頻道設定、存取控制及 Webhook 設定"
read_when:
  - You want to connect OpenClaw to SMS through Twilio
  - You need SMS webhook or allowlist setup
title: "SMS"
---

OpenClaw 可以透過 Twilio 電話號碼或傳訊服務接收和傳送 SMS。閘道會註冊一個輸入 Webhook 路由，預設會驗證 Twilio 請求簽章，並透過 Twilio 的 Messages API 傳送回覆。

<CardGroup cols={3}>
  <Card title="配對" icon="link" href="/zh-Hant/channels/pairing">
    SMS 的預設 DM 原則是配對。
  </Card>
  <Card title="閘道安全性" icon="shield" href="/zh-Hant/gateway/security">
    檢視 Webhook 公開程度和傳送者存取控制。
  </Card>
  <Card title="頻道疑難排解" icon="wrench" href="/zh-Hant/channels/troubleshooting">
    跨頻道診斷與修復手冊。
  </Card>
</CardGroup>

## 開始之前

您需要：

- 具備可傳送 SMS 電話號碼的 Twilio 帳戶，或是 Twilio 傳訊服務。
- Twilio Account SID 和 Auth Token。
- 一個可連接到您 OpenClaw 閘道的公開 HTTPS URL。
- 選擇傳送者原則：`pairing` 用於私人用途，`allowlist` 用於預先核准的電話號碼，或是僅用於有意公開 SMS 存取的 `open`。

如果該號碼同時具備這兩種功能，請使用同一個 Twilio 號碼來處理 SMS 和語音通話。請在 Twilio 中分別設定 SMS Webhook 和語音 Webhook；本頁面僅涵蓋 SMS Webhook。

## 快速設定

<Steps>
  <Step title="建立或選擇 Twilio 傳送者">
    在 Twilio 中，開啟 **Phone Numbers > Manage > Active numbers** 並選擇一個具備 SMS 功能的號碼。儲存：

    - Account SID，例如 `ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
    - Auth Token
    - 傳送者電話號碼，例如 `+15551234567`

    如果您使用的是傳訊服務而非固定的傳送者號碼，請儲存傳訊服務 SID，例如 `MGxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`。

  </Step>

  <Step title="設定 SMS 頻道">

將此儲存為 `sms.patch.json5` 並變更預留位置：

```json5
{
  channels: {
    sms: {
      enabled: true,
      accountSid: "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      authToken: "twilio-auth-token",
      fromNumber: "+15551234567",
      publicWebhookUrl: "https://gateway.example.com/webhooks/sms",
      dmPolicy: "pairing",
    },
  },
}
```

套用它：

```bash
openclaw config patch --file ./sms.patch.json5 --dry-run
openclaw config patch --file ./sms.patch.json5
```

  </Step>

  <Step title="將 Twilio 指向 Gateway webhook">
    在 Twilio 電話號碼設定中，開啟 **Messaging** 並將 **A message comes in** 設定為：

```text
https://gateway.example.com/webhooks/sms
```

    使用 HTTP `POST`。預設的本機路徑是 `/webhooks/sms`；如果您需要不同的路由，請變更 `channels.sms.webhookPath`。

  </Step>

  <Step title="公開精確的 SMS webhook 路徑">
    您的公開 URL 必須將 SMS 路由至 Gateway 程序。如果您使用 Tailscale Funnel 進行本地測試，請明確公開 `/webhooks/sms`：

```bash
tailscale funnel --bg --set-path /webhooks/sms http://127.0.0.1:<gateway-port>/webhooks/sms
tailscale funnel status
```

    語音通話和 SMS 使用不同的 webhook 路徑。如果同一個 Twilio 號碼處理這兩者，請在 Twilio 和您的通道中保留這兩個路由的設定。

  </Step>

  <Step title="啟動 Gateway 並核准第一個傳送者">

```bash
openclaw gateway
```

傳送簡訊至 Twilio 號碼。第一則訊息會建立配對請求。請加以核准：

```bash
openclaw pairing list sms
openclaw pairing approve sms <CODE>
```

    配對碼會在 1 小時後過期。

  </Step>
</Steps>

## 設定範例

### 設定檔

當您希望頻道定義隨附於 Gateway 設定時，請使用設定檔設定：

```json5
{
  channels: {
    sms: {
      enabled: true,
      accountSid: "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      authToken: "twilio-auth-token",
      fromNumber: "+15551234567",
      publicWebhookUrl: "https://gateway.example.com/webhooks/sms",
      dmPolicy: "pairing",
    },
  },
}
```

### 環境變數

對於密碼來自主機環境的單一帳號部署，請使用 env 設定：

```bash
export TWILIO_ACCOUNT_SID="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
export TWILIO_AUTH_TOKEN="<twilio-auth-token>"
export TWILIO_PHONE_NUMBER="+15551234567"
export SMS_PUBLIC_WEBHOOK_URL="https://gateway.example.com/webhooks/sms"
```

然後在設定中啟用頻道：

```json5
{
  channels: {
    sms: {
      enabled: true,
      dmPolicy: "pairing",
    },
  },
}
```

`TWILIO_SMS_FROM` 被接受為 `TWILIO_PHONE_NUMBER` 的別名。當 Twilio 應從傳訊服務中選擇傳送者時，請使用 `TWILIO_MESSAGING_SERVICE_SID` 取代電話號碼傳送者。

### SecretRef 驗證權杖

`authToken` 可以是 SecretRef。當 Gateway 應從 OpenClaw secrets runtime 解析 Twilio Auth Token，而非儲存明文設定時，請使用此方式：

```json5
{
  channels: {
    sms: {
      enabled: true,
      accountSid: "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      authToken: { source: "env", provider: "default", id: "TWILIO_AUTH_TOKEN" },
      fromNumber: "+15551234567",
      publicWebhookUrl: "https://gateway.example.com/webhooks/sms",
      dmPolicy: "pairing",
    },
  },
}
```

引用的環境變數或機密提供者必須對 Gateway 執行時可見。變更主機環境變數後，請重新啟動受管理的 Gateway 進程。

### 僅允許清單的私人號碼

當只有已知電話號碼應該能夠與代理程式交談時，請使用 `allowlist`：

```json5
{
  channels: {
    sms: {
      enabled: true,
      accountSid: "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      authToken: "twilio-auth-token",
      fromNumber: "+15551234567",
      publicWebhookUrl: "https://gateway.example.com/webhooks/sms",
      dmPolicy: "allowlist",
      allowFrom: ["+15557654321"],
    },
  },
}
```

### 訊息服務發送者

當 Twilio 應透過訊息服務選擇發送者時，請使用 `messagingServiceSid` 而不是 `fromNumber`：

```json5
{
  channels: {
    sms: {
      enabled: true,
      accountSid: "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      authToken: "twilio-auth-token",
      messagingServiceSid: "MGxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      publicWebhookUrl: "https://gateway.example.com/webhooks/sms",
      dmPolicy: "pairing",
    },
  },
}
```

如果在設定和環境解析後同時存在 `fromNumber` 和 `messagingServiceSid`，則使用 `fromNumber`。

### 預設輸出目標

當自動化或代理程式發起的傳遞在發送流程省略明確目標時應具有預設目的地時，請設定 `defaultTo`：

```json5
{
  channels: {
    sms: {
      enabled: true,
      accountSid: "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      authToken: "twilio-auth-token",
      fromNumber: "+15551234567",
      defaultTo: "+15557654321",
      publicWebhookUrl: "https://gateway.example.com/webhooks/sms",
    },
  },
}
```

## 存取控制

`channels.sms.dmPolicy` 控制直接 SMS 存取：

- `pairing` (預設)
- `allowlist` (要求 `allowFrom` 中至少有一個發送者)
- `open` (要求 `allowFrom` 包含 `"*"`)
- `disabled`

`allowFrom` 條目應為 E.164 電話號碼，例如 `+15551234567`。接受並標準化 `sms:` 前綴。對於私人助理，建議使用 `dmPolicy: "allowlist"` 並搭配明確的電話號碼。

## 發送 SMS

輸出 SMS 目標使用 `sms:` 服務前綴並選取 SMS 頻道：

```bash
openclaw message send --channel sms --target sms:+15551234567 --message "hello"
```

當頻道選擇為隱含時，`twilio-sms:+15551234567` 會選取此頻道，而不會接管 iMessage 使用的現有頻道擁有的 `sms:` 服務前綴。

```bash
openclaw message send --target twilio-sms:+15551234567 --message "hello"
```

CLI 需要一個明確的 `--target`。`defaultTo` 是用於自動化和代理程式發起的傳遞路徑，其中的目標可以從頻道設定解析。

來自輸入 SMS 對話的代理程式回覆會自動透過設定的 Twilio 發送者傳回給發送者。

SMS 輸出為純文字。OpenClaw 會移除 markdown、扁平化程式碼區塊、保留可讀連結，並在透過 Twilio 發送前將過長的回覆分塊。

## 驗證設定

在 Gateway 啟動後：

1. 請確認 Gateway 日誌顯示了 SMS webhook 路由。
2. 執行 Twilio 端的測試探測：

```bash
openclaw channels capabilities --channel sms
openclaw channels status --channel sms --probe --json
```

3. 從您的手機發送一則 SMS 到 Twilio 號碼。
4. 執行 `openclaw pairing list sms`。
5. 使用 `openclaw pairing approve sms <CODE>` 核准配對代碼。
6. 發送另一則 SMS 並確認代理程式有回覆。

若僅進行單向輸出測試，請使用：

```bash
openclaw message send --channel sms --target sms:+15557654321 --message "OpenClaw SMS test"
```

### 從 macOS iMessage/SMS 進行端對端測試

在可透過訊息 傳送業者 SMS 的 Mac 上，您可以使用 `imsg` 來控制發送端，無需動用您的手機：

```bash
imsg send --to "+15551234567" --service sms --text "OpenClaw SMS E2E $(date -u +%Y%m%dT%H%M%SZ)" --json
openclaw pairing list sms
openclaw pairing approve sms <CODE>
imsg send --to "+15551234567" --service sms --text "reply exactly SMS pong" --json
```

第一則訊息應該會建立配對請求。第二則訊息應該會透過 Twilio 收到代理程式的回覆。

## Webhook 安全性

根據預設，OpenClaw 會使用 `publicWebhookUrl` 和 `authToken` 驗證 `X-Twilio-Signature`。請保持 `publicWebhookUrl` 與 Twilio 中設定的 URL 逐位元組一致，包括通訊協定、主機名稱、路徑和查詢字串。

若僅進行本地通道測試，您可以設定：

```json5
{
  channels: {
    sms: {
      dangerouslyDisableSignatureValidation: true,
    },
  },
}
```

請勿在公開的 Gateway 上停用簽章驗證。

## 多帳號設定

當您操作多個 Twilio 號碼時，請使用 `accounts`：

```json5
{
  channels: {
    sms: {
      accounts: {
        support: {
          enabled: true,
          accountSid: "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
          authToken: "twilio-auth-token",
          fromNumber: "+15551234567",
          publicWebhookUrl: "https://gateway.example.com/webhooks/sms/support",
          webhookPath: "/webhooks/sms/support",
          dmPolicy: "allowlist",
          allowFrom: ["+15557654321"],
        },
      },
    },
  },
}
```

每個帳號應使用不同的 `webhookPath`。

## 疑難排解

### Twilio 傳回 403 或 OpenClaw 拒絕 webhook

請檢查 `publicWebhookUrl` 是否與 Twilio 中設定的 URL 完全相符，包括通訊協定、主機名稱、路徑和查詢字串。Twilio 會對公開 URL 字串進行簽署，因此 Proxy 重寫和替代主機名稱可能會導致簽章驗證失敗。

### 未出現配對請求

請檢查 Twilio 號碼的 **Messaging** webhook URL 和方法。它必須指向 SMS webhook URL 並使用 `POST`。此外，請確認 Gateway 可從公開網際網路或透過您的通道存取。

如果 Twilio 訊息日誌顯示錯誤 `11200`，表示 Twilio 已接收內送 SMS 但無法連線至您的 webhook。請檢查：

- Twilio **Messaging > A message comes in** 指向 `publicWebhookUrl`。
- 方法為 `POST`。
- 通道或反向代理會暴露確切的 `webhookPath`；對於 Tailscale Funnel，請執行 `tailscale funnel status` 並確認已列出 `/webhooks/sms`。
- `publicWebhookUrl` 使用與 Twilio 發送的相同的 scheme、host、path 和查詢字串，因此簽章驗證可以重新產生已簽署的 URL。

### 外寄傳送失敗

請確認 `accountSid`、`authToken` 以及 `fromNumber` 或 `messagingServiceSid` 已解析。如果您使用 Twilio 試用帳戶，目的地號碼可能需要在 Twilio 中通過驗證才能傳送外寄 SMS。

### 訊息已到達但代理程式未回應

請檢查 `dmPolicy` 和 `allowFrom`。使用預設的 `pairing` 政策時，發送者必須先經過核准，才會處理正常的代理程式回應。
