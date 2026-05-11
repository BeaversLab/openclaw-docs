---
summary: "iOS 節點應用程式：連線至 Gateway、配對、Canvas 和疑難排解"
read_when:
  - Pairing or reconnecting the iOS node
  - Running the iOS app from source
  - Debugging gateway discovery or canvas commands
title: "iOS 應用程式"
---

可用性：內部預覽。iOS 應用程式尚未公開發布。

## 功能說明

- 透過 WebSocket (LAN 或 tailnet) 連線至 Gateway。
- 公開節點功能：Canvas、螢幕快照、相機擷取、位置、通話模式、語音喚醒。
- 接收 `node.invoke` 指令並回報節點狀態事件。

## 需求

- 在另一台裝置上執行的 Gateway (macOS、Linux 或透過 WSL2 執行的 Windows)。
- 網路路徑：
  - 透過 Bonjour 連線至同一個 LAN，**或**
  - 透過單播 DNS-SD 連線至 Tailnet (範例網域：`openclaw.internal.`)，**或**
  - 手動主機/連接埠 (後備方案)。

## 快速入門 (配對 + 連線)

1. 啟動 Gateway：

```bash
openclaw gateway --port 18789
```

2. 在 iOS 應用程式中，開啟 Settings 並選取一個探索到的 gateway (或啟用手動主機 Manual Host 並輸入主機/連接埠)。

3. 在 gateway 主機上核准配對請求：

```bash
openclaw devices list
openclaw devices approve <requestId>
```

如果應用程式以變更的驗證詳細資料 (角色/scopes/公開金鑰) 重試配對，
先前的待處理請求將被取代，並建立一個新的 `requestId`。
在核准之前請再次執行 `openclaw devices list`。

選用：如果 iOS 節點始終從嚴格控制的子網路連線，您可以選擇使用明確的 CIDR 或確切 IP 進行首次節點自動核准：

```json5
{
  gateway: {
    nodes: {
      pairing: {
        autoApproveCidrs: ["192.168.1.0/24"],
      },
    },
  },
}
```

此功能預設為停用。它僅適用於沒有請求 scopes 的新鮮 `role: node` 配對。操作員/瀏覽器配對以及任何角色、scope、中繼資料或
公開金鑰變更仍然需要手動核准。

4. 驗證連線：

```bash
openclaw nodes status
openclaw gateway call node.list --params "{}"
```

## 正式版本的 Relay 推播支援

正式發布的 iOS 版本使用外部推播轉送，而不是將原始 APNs 權杖發布到 gateway。

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

- iOS 應用程式使用 App Attest 和應用程式收據向轉送器註冊。
- 轉送器會傳回一個不透明的轉送代碼 以及一個註冊範圍的傳送授權。
- iOS 應用程式會擷取已配對的 gateway 身份識別並將其包含在轉送註冊中，因此轉送支援的註冊會委派給該特定的 gateway。
- 應用程式會使用 `push.apns.register` 將該轉送支援的註冊轉發給已配對的 gateway。
- 閘道使用該儲存的轉送控制代碼來進行 `push.test`、背景喚醒和喚醒提示。
- 閘道轉送基礎 URL 必須與內建於正式版 / TestFlight iOS 版本中的轉送 URL 相符。
- 如果 App 稍後連接到不同的閘道或具有不同轉送基礎 URL 的版本，它會重新整理轉送註冊，而不是重用舊的綁定。

對於此路徑，閘道**不**需要：

- 不需要部署範圍的轉送權杖。
- 不需要用於正式版 / TestFlight 轉送傳送的直接 APNs 金鑰。

預期的操作員流程：

1. 安裝正式版 / TestFlight iOS 版本。
2. 在閘道上設定 `gateway.push.apns.relay.baseUrl`。
3. 將 App 與閘道配對，並讓其完成連線。
4. App 在取得 APNs 權杖、操作員階段已連線且轉送註冊成功後，會自動發佈 `push.apns.register`。
5. 之後，`push.test`、重新連線喚醒和喚醒提示可以使用儲存的轉送註冊。

相容性說明：

- `OPENCLAW_APNS_RELAY_BASE_URL` 仍然可以作為閘道的臨時環境變數覆寫使用。

## 驗證與信任流程

轉送的存在是為了強制執行直接在閘道上使用 APNs 無法為正式版 iOS 版本提供的兩個限制：

- 只有透過 Apple 發布的真正 OpenClaw iOS 版本才能使用託管的轉送。
- 閘道只能針對與該特定閘道配對的 iOS 裝置傳送轉送推送。

逐跳躍（Hop by hop）：

1. `iOS app -> gateway`
   - App 首先透過正常的閘道驗證流程與閘道配對。
   - 這會為 App 提供一個已驗證的節點階段以及一個已驗證的操作員階段。
   - 操作員階段用於呼叫 `gateway.identity.get`。

2. `iOS app -> relay`
   - App 透過 HTTPS 呼叫轉送註冊端點。
   - 註冊包括 App Attest 證明以及 App 收據。
   - 轉送會驗證 Bundle ID、App Attest 證明和 Apple 收據，並要求正式版 / 生產發布路徑。
   - 這就是阻擋本機 Xcode / 開發版本使用託管轉送的原因。本機版本可能經過簽署，但不滿足轉送所期望的正式 Apple 發布證明。

3. `gateway identity delegation`
   - 在註冊中繼之前，應用程式會從 `gateway.identity.get` 獲取已配對的閘道器身分識別。
   - 應用程式會將該閘道器身分識別包含在中繼註冊負載中。
   - 中繼會返回一個中繼代碼 和一個註冊範圍的發送授予，這些都被委派給該閘道器身分識別。

4. `gateway -> relay`
   - 閘道器會儲存來自 `push.apns.register` 的中繼代碼和發送授予。
   - 在 `push.test`、重新連線喚醒和喚醒推動時，閘道器會使用其自身的裝置身分識別對發送請求進行簽署。
   - 中繼會根據註冊時委派的閘道器身分識別，驗證儲存的發送授予和閘道器簽署。
   - 即使其他閘道器以某種方式取得了代碼，也無法重用該儲存的註冊。

5. `relay -> APNs`
   - 中繼擁有正式版本的生產環境 APNs 憑證和原始 APNs 權杖。
   - 對於中繼支援的正式版本，閘道器絕不會儲存原始 APNs 權杖。
   - 中繼代表已配對的閘道器將最終推送傳送至 APNs。

建立此設計的原因：

- 為了將生產環境 APNs 憑證排除在使用者的閘道器之外。
- 為了避免在閘道器上儲存原始正式版本的 APNs 權杖。
- 為了僅允許正式版本 / TestFlight OpenClaw 版本使用託管中繼。
- 為了防止一個閘道器向屬於不同閘道器的 iOS 裝置發送喚醒推送。

本機/手動版本仍使用直接的 APNs。如果您在沒有中繼的情況下測試這些版本，閘道器仍然需要直接的 APNs 憑證：

```bash
export OPENCLAW_APNS_TEAM_ID="TEAMID"
export OPENCLAW_APNS_KEY_ID="KEYID"
export OPENCLAW_APNS_PRIVATE_KEY_P8="$(cat /path/to/AuthKey_KEYID.p8)"
```

這些是閘道器主機的執行環境變數，而非 Fastlane 設定。`apps/ios/fastlane/.env` 僅儲存 App Store Connect / TestFlight 授權（例如 `ASC_KEY_ID` 和 `ASC_ISSUER_ID`）；它並不會為本機 iOS 版本設定直接的 APNs 傳遞。

建議的閘道器主機儲存位置：

```bash
mkdir -p ~/.openclaw/credentials/apns
chmod 700 ~/.openclaw/credentials/apns
mv /path/to/AuthKey_KEYID.p8 ~/.openclaw/credentials/apns/AuthKey_KEYID.p8
chmod 600 ~/.openclaw/credentials/apns/AuthKey_KEYID.p8
export OPENCLAW_APNS_PRIVATE_KEY_PATH="$HOME/.openclaw/credentials/apns/AuthKey_KEYID.p8"
```

請勿提交 `.p8` 檔案，也不要將其放在儲存庫簽出目錄下。

## 探索路徑

### Bonjour (區域網路)

iOS 應用程式會在 `local.` 上瀏覽 `_openclaw-gw._tcp`，若已設定，則會瀏覽相同的廣域 DNS-SD 探索網域。同區域網路內的 Gateway 會自動從 `local.` 顯示；跨網路探索可使用已設定的廣域網域，而無需變更信標類型。

### Tailnet（跨網路）

如果 mDNS 被封鎖，請使用單播 DNS-SD 區域（選擇一個網域；例如：
`openclaw.internal.`）和 Tailscale 分割 DNS。
請參閱 [Bonjour](/zh-Hant/gateway/bonjour) 以取得 CoreDNS 範例。

### 手動主機/連接埠

在設定中，啟用 **手動主機** 並輸入 Gateway 主機 + 連接埠（預設為 `18789`）。

## Canvas + A2UI

iOS 節點會渲染 WKWebView canvas。使用 `node.invoke` 來驅動它：

```bash
openclaw nodes invoke --node "iOS Node" --command canvas.navigate --params '{"url":"http://<gateway-host>:18789/__openclaw__/canvas/"}'
```

備註：

- Gateway canvas 主機會提供 `/__openclaw__/canvas/` 和 `/__openclaw__/a2ui/`。
- 它是由 Gateway HTTP 伺服器所提供（與 `gateway.port` 相同的連接埠，預設為 `18789`）。
- 當廣播 canvas 主機 URL 時，iOS 節點會在連線時自動瀏覽至 A2UI。
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
- iOS 可能會暫停背景音訊；當應用程式未處於使用中狀態時，請將語音功能視為盡力而為的服務。

## 常見錯誤

- `NODE_BACKGROUND_UNAVAILABLE`：將 iOS 應用程式帶到前景（canvas/camera/screen 指令需要此操作）。
- `A2UI_HOST_NOT_CONFIGURED`：Gateway 未廣播 canvas 主機 URL；請檢查 [Gateway configuration](/zh-Hant/gateway/configuration) 中的 `canvasHost`。
- 配對提示從未出現：執行 `openclaw devices list` 並手動批准。
- 重新安裝後重新連線失敗：鑰匙圈配對權杖已被清除；請重新配對節點。

## 相關文件

- [配對](/zh-Hant/channels/pairing)
- [探索](/zh-Hant/gateway/discovery)
- [Bonjour](/zh-Hant/gateway/bonjour)
