---
summary: "iOS 節點應用程式：連線至 Gateway、配對、Canvas 和疑難排解"
read_when:
  - Pairing or reconnecting the iOS node
  - Running the iOS app from source
  - Debugging gateway discovery or canvas commands
title: "iOS 應用程式"
---

# iOS 應用程式 (節點)

可用性：內部預覽。iOS 應用程式尚未公開發布。

## 功能說明

- 透過 WebSocket (區域網路或 tailnet) 連線到 Gateway。
- 公開節點功能：畫布、螢幕快照、相機擷取、位置、對話模式、語音喚醒。
- 接收 `node.invoke` 指令並回報節點狀態事件。

## 需求條件

- 在另一台裝置上執行的 Gateway (macOS、Linux，或透過 WSL2 執行的 Windows)。
- 網路路徑：
  - 透過 Bonjour 連接同一區域網路，**或者**
  - 透過單播 DNS-SD 連線至 Tailnet (範例網域: `openclaw.internal.`)，**或**
  - 手動輸入主機/連接埠 (作為後備方案)。

## 快速入門 (配對 + 連線)

1. 啟動 Gateway：

```bash
openclaw gateway --port 18789
```

2. 在 iOS 應用程式中，開啟設定並選取一個探索到的 gateway (或啟用手動主機 Manual Host 並輸入主機/連接埠)。

3. 在 gateway 主機上批准配對請求：

```bash
openclaw devices list
openclaw devices approve <requestId>
```

如果應用程式使用變更的驗證詳細資料 (角色/範圍/公開金鑰) 重試配對，
先前的待處理請求將被取代，並建立新的 `requestId`。
在核准之前請再次執行 `openclaw devices list`。

4. 驗證連線：

```bash
openclaw nodes status
openclaw gateway call node.list --params "{}"
```

## 正式版本的 Relay 推播支援

官方發布的 iOS 版本使用外部推播中繼，而不是將原始 APNs 權杖發布到 gateway。

Gateway 端需求：

```json5
{
  gateway: {
    push: {
      apns: {
        relay: {
          baseUrl: "https://relay.example.com",
        },
      },
    },
  },
}
```

運作流程：

- iOS 應用程式使用 App Attest 和應用程式收據向中繼註冊。
- 中繼返回一個不透明的中繼代碼 以及一個註冊範圍的傳送授權。
- iOS 應用程式會擷取已配對的 gateway 身份識別，並將其包含在中繼註冊中，因此由中繼支援的註冊會委派給該特定的 gateway。
- 應用程式使用 `push.apns.register` 將該由中繼支援的註冊轉發至已配對的 Gateway。
- Gateway 使用該儲存的中繼處理程序進行 `push.test`、背景喚醒和喚醒提示。
- Gateway 中繼基礎 URL 必須符合內建於正式版本/TestFlight iOS 版本中的中繼 URL。
- 如果應用程式稍後連線到不同的 gateway 或是具有不同中繼基礎 URL 的版本，它會重新整理中繼註冊，而不是重複使用舊的連線。

Gateway 在此路徑中**不**需要的項目：

- 沒有部署範圍的中繼令牌。
- 沒有用於官方版/TestFlight 中繼支援推送的直接 APNs 金鑰。

預期的操作員流程：

1. 安裝官方版/TestFlight iOS 版本。
2. 在 Gateway 上設定 `gateway.push.apns.relay.baseUrl`。
3. 將 App 配對至閘道並讓其完成連線。
4. 應用程式在取得 APNs 權杖、操作者階段作業已連線且中繼註冊成功後，會自動發佈 `push.apns.register`。
5. 之後，`push.test`、重新連線喚醒和喚醒提示可以使用儲存的由中繼支援的註冊。

相容性說明：

- `OPENCLAW_APNS_RELAY_BASE_URL` 仍可作為 Gateway 的臨時環境變數覆寫使用。

## 驗證與信任流程

中繼的存在是為了執行兩個直接在閘道上使用 APNs 無法為官方 iOS 版本提供的約束條件：

- 只有透過 Apple 分發的正式 OpenClaw iOS 版本才能使用託管中繼。
- 閘道只能針對與該特定閘道配對過的 iOS 裝置發送中繼支援的推送。

逐跳：

1. `iOS app -> gateway`
   - App 首先透過正常的閘道驗證流程與閘道配對。
   - 這為 App 提供了一個已驗證的節點階段以及一個已驗證的操作員階段。
   - 操作者階段作業用於呼叫 `gateway.identity.get`。

2. `iOS app -> relay`
   - App 透過 HTTPS 呼叫中繼註冊端點。
   - 註冊內容包括 App Attest 證明以及 App 收據。
   - 中繼會驗證 Bundle ID、App Attest 證明和 Apple 收據，並要求官方/生產環境分發路徑。
   - 這就是阻擋本機 Xcode/開發版本使用託管中繼的原因。本機建置版本可能已簽署，但無法滿足中繼預期的官方 Apple 分發證明。

3. `gateway identity delegation`
   - 在中繼註冊之前，應用程式會從
     `gateway.identity.get` 取得已配對的 Gateway 身分。
   - App 會將該閘道身分包含在中繼註冊載荷中。
   - 中繼會返回一個中繼控制代碼和一個註冊範圍的發送授予，這些都已委派給該閘道身分。

4. `gateway -> relay`
   - Gateway 儲存來自 `push.apns.register` 的中繼處理程序和傳送授予。
   - 在 `push.test`、重新連線喚醒和喚醒提示時，Gateway 會使用其
     自己的裝置身分簽署傳送請求。
   - 中繼會根據註冊時委派的閘道身分，驗證儲存的傳送授權和閘道簽章。
   - 其他閘道無法重用該儲存的註冊，即使它以某種方式取得了控制代碼。

5. `relay -> APNs`
   - 中繼擁有生產環境 APNs 憑證以及正式版本的原始 APNs 權杖。
   - 對於由中繼支援的正式版本，閘道絕不會儲存原始 APNs 權杖。
   - 中繼代表配對的閘道將最終的推播傳送到 APNs。

建立此設計的原因：

- 避免生產環境 APNs 憑證洩漏到使用者閘道。
- 避免在閘道上儲存原始的正式版本 APNs 權杖。
- 僅允許正式版 / TestFlight OpenClaw 版本使用託管的中繼。
- 防止一個閘道向屬於不同閘道的 iOS 裝置發送喚醒推播。

本機/手動版本仍使用直接連線至 APNs。如果您在不使用中繼的情況下測試這些版本，閘道仍然需要直接的 APNs 憑證：

```bash
export OPENCLAW_APNS_TEAM_ID="TEAMID"
export OPENCLAW_APNS_KEY_ID="KEYID"
export OPENCLAW_APNS_PRIVATE_KEY_P8="$(cat /path/to/AuthKey_KEYID.p8)"
```

這些是 Gateway 主機執行階段環境變數，而非 Fastlane 設定。`apps/ios/fastlane/.env` 僅儲存
App Store Connect / TestFlight 驗證資料，例如 `ASC_KEY_ID` 和 `ASC_ISSUER_ID`；它不會針對
本機 iOS 建置設定直接 APNs 傳遞。

建議的 Gateway 主機儲存方式：

```bash
mkdir -p ~/.openclaw/credentials/apns
chmod 700 ~/.openclaw/credentials/apns
mv /path/to/AuthKey_KEYID.p8 ~/.openclaw/credentials/apns/AuthKey_KEYID.p8
chmod 600 ~/.openclaw/credentials/apns/AuthKey_KEYID.p8
export OPENCLAW_APNS_PRIVATE_KEY_PATH="$HOME/.openclaw/credentials/apns/AuthKey_KEYID.p8"
```

請勿提交 `.p8` 檔案或將其放置於 repo checkout 之下。

## 探索路徑

### Bonjour (區域網路)

iOS 應用程式會瀏覽 `_openclaw-gw._tcp` 在 `local.` 上，以及（在設定時）相同的廣域 DNS-SD 探索網域。同一區域網路的閘道會自動從 `local.` 出現；跨網路探索可以使用設定的廣域網域，而無需更改信標類型。

### Tailnet (跨網路)

如果 mDNS 被阻擋，請使用單播 DNS-SD 區域（選擇一個網域；例如：
`openclaw.internal.`）和 Tailscale 分割 DNS。
請參閱 [Bonjour](/en/gateway/bonjour) 以取得 CoreDNS 範例。

### 手動主機/連接埠

在設定中，啟用 **Manual Host** 並輸入閘道主機 + 連接埠（預設為 `18789`）。

## Canvas + A2UI

iOS 節點會渲染 WKWebView canvas。使用 `node.invoke` 來驅動它：

```bash
openclaw nodes invoke --node "iOS Node" --command canvas.navigate --params '{"url":"http://<gateway-host>:18789/__openclaw__/canvas/"}'
```

備註：

- Gateway canvas 主機提供 `/__openclaw__/canvas/` 和 `/__openclaw__/a2ui/`。
- 它由 Gateway HTTP 伺服器提供（與 `gateway.port` 相同的連接埠，預設為 `18789`）。
- 當有通告 canvas 主機 URL 時，iOS 節點會在連線時自動導航至 A2UI。
- 使用 `canvas.navigate` 和 `{"url":""}` 返回內建的 scaffold。

### Canvas eval / snapshot

```bash
openclaw nodes invoke --node "iOS Node" --command canvas.eval --params '{"javaScript":"(() => { const {ctx} = window.__openclaw; ctx.clearRect(0,0,innerWidth,innerHeight); ctx.lineWidth=6; ctx.strokeStyle=\"#ff2d55\"; ctx.beginPath(); ctx.moveTo(40,40); ctx.lineTo(innerWidth-40, innerHeight-40); ctx.stroke(); return \"ok\"; })()"}'
```

```bash
openclaw nodes invoke --node "iOS Node" --command canvas.snapshot --params '{"maxWidth":900,"format":"jpeg"}'
```

## 語音喚醒 + 對話模式

- 語音喚醒和對話模式可在設定中使用。
- iOS 可能會暫停背景音訊；當應用程式未啟用時，請將語音功能視為盡力而為。

## 常見錯誤

- `NODE_BACKGROUND_UNAVAILABLE`：將 iOS 應用程式帶到前景（canvas/camera/螢幕指令需要它）。
- `A2UI_HOST_NOT_CONFIGURED`：Gateway 沒有通告 canvas 主機 URL；請檢查 [Gateway configuration](/en/gateway/configuration) 中的 `canvasHost`。
- 配對提示從未出現：執行 `openclaw devices list` 並手動批准。
- 重新安裝後重新連線失敗：鑰匙圈配對 token 已被清除；請重新配對節點。

## 相關文件

- [配對](/en/channels/pairing)
- [探索](/en/gateway/discovery)
- [Bonjour](/en/gateway/bonjour)
