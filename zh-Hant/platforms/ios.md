---
summary: "iOS 節點應用程式：連線到 Gateway、配對、畫布與疑難排解"
read_when:
  - Pairing or reconnecting the iOS node
  - Running the iOS app from source
  - Debugging gateway discovery or canvas commands
title: "iOS 應用程式"
---

# iOS 應用程式（節點）

可用性：內部預覽。iOS 應用程式尚未公開發布。

## 功能說明

- 透過 WebSocket（LAN 或 tailnet）連線至 Gateway。
- 公開節點功能：畫布、螢幕截圖、相機擷取、位置、對談模式、語音喚醒。
- 接收 `node.invoke` 指令並回報節點狀態事件。

## 系統需求

- 在另一台裝置上執行 Gateway（macOS、Linux 或透過 WSL2 執行的 Windows）。
- 網路路徑：
  - 透過 Bonjour 在同一 LAN，**或**
  - 透過單播 DNS-SD 在 Tailnet 上（範例網域：`openclaw.internal.`），**或**
  - 手動指定主機/連接埠（後備方案）。

## 快速開始（配對 + 連線）

1. 啟動 Gateway：

```bash
openclaw gateway --port 18789
```

2. 在 iOS 應用程式中，開啟設定並選擇一個探索到的 gateway（或啟用手動主機並輸入主機/連接埠）。

3. 在 gateway 主機上核准配對請求：

```bash
openclaw devices list
openclaw devices approve <requestId>
```

4. 驗證連線：

```bash
openclaw nodes status
openclaw gateway call node.list --params "{}"
```

## 正式版本的 Relay 支援推播

正式發行的 iOS 版本使用外部推播轉發器，而非將原始的 APNs token 發布至 gateway。

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

- iOS 應用程式使用 App Attest 和應用程式收據向轉發器註冊。
- 轉發器會傳回一個不透明的轉發器代碼以及註冊範圍的傳送授權。
- iOS 應用程式會取得已配對的 gateway 身份識別並將其包含在轉發器註冊中，以便將由轉發器支援的註冊委派給該特定的 gateway。
- 應用程式會透過 `push.apns.register` 將該由轉發器支援的註冊轉送給已配對的 gateway。
- Gateway 使用該儲存的轉發器代碼進行 `push.test`、背景喚醒和喚醒推動。
- Gateway 轉發器基礎 URL 必須與內建於正式版/TestFlight iOS 版本中的轉發器 URL 相符。
- 如果應用程式稍後連線至不同的 gateway 或是使用不同轉發器基礎 URL 的版本，它會重新整理轉發器註冊而不會重複使用舊的綁定。

Gateway **不**需要此路徑的項目：

- 不需要部署範圍的轉發器權杖。
- 不需要用於正式版/TestFlight 轉發器支援傳送的直接 APNs 金鑰。

預期的操作員流程：

1. 安裝正式版/TestFlight iOS 版本。
2. 在 gateway 上設定 `gateway.push.apns.relay.baseUrl`。
3. 將應用程式與閘道配對，並讓它完成連線。
4. 應用程式在獲得 APNs 權杖、操作員會話已連線以及中繼註冊成功後，會自動發布 `push.apns.register`。
5. 之後，`push.test`、重新連線喚醒以及喚醒提示可以使用儲存的中繼備份註冊。

相容性備註：

- `OPENCLAW_APNS_RELAY_BASE_URL` 仍可作為閘道的臨時環境變數覆寫。

## 驗證與信任流程

中繼的存在是為了執行直接在閘道上使用 APNs 無法為官方 iOS 建置提供的兩項限制：

- 只有透過 Apple 發布的真正 OpenClaw iOS 建置才能使用託管中繼。
- 閘道只能向與該特定閘道配對的 iOS 裝置發送中繼備份推送。

逐跳躍（Hop by hop）：

1. `iOS app -> gateway`
   - 應用程式首先透過正常的閘道驗證流程與閘道配對。
   - 這為應用程式提供了一個經過驗證的節點會話以及一個經過驗證的操作員會話。
   - 操作員會話用於呼叫 `gateway.identity.get`。

2. `iOS app -> relay`
   - 應用程式透過 HTTPS 呼叫中繼註冊端點。
   - 註冊包括 App Attest 證明以及應用程式收據。
   - 中繼會驗證 Bundle ID、App Attest 證明和 Apple 收據，並要求官方/生產發布路徑。
   - 這就是阻止本機 Xcode/開發建置使用託管中繼的原因。本機建置可能已簽署，但不滿足中繼預期的官方 Apple 發布證明。

3. `gateway identity delegation`
   - 在中繼註冊之前，應用程式會從 `gateway.identity.get` 獲取配對的閘道身分。
   - 應用程式在註冊酬載中包含該閘道身分。
   - 中繼返回一個中繼代碼和一個註冊範圍的發送授予權限，該權限被委派給該閘道身分。

4. `gateway -> relay`
   - 閘道儲存來自 `push.apns.register` 的中繼代碼和發送授予權限。
   - 在 `push.test`、重新連線喚醒以及喚醒提示時，閘道會使用自己的裝置身分對發送請求進行簽署。
   - 中繼會根據註冊時委派的閘道身分，驗證儲存的發送授予權限和閘道簽章。
   - 即使其他閘道以某種方式取得了該識別碼，也無法重用該儲存的註冊資訊。

5. `relay -> APNs`
   - 中繼器擁有正式組建版本的生產環境 APNs 憑證以及原始 APNs 權杖。
   - 對於由中繼器支援的正式組建，閘道絕不會儲存原始 APNs 權杖。
   - 中繼器代表配對的閘道將最終的推送訊息發送至 APNs。

建立此設計的原因：

- 為了避免生產環境 APNs 憑證暴露在使用者的閘道上。
- 為了避免在閘道上儲存原始正式組建 APNs 權杖。
- 為了僅允許官方/TestFlight 版本的 OpenClaw 組建使用託管的中繼器。
- 為了防止某一個閘道向屬於另一個閘道的 iOS 裝置發送喚醒推送。

本地/手動組建仍維持直接連接 APNs。如果您在沒有中繼器的情況下測試這些組建，
閘道仍然需要直接的 APNs 憑證：

```bash
export OPENCLAW_APNS_TEAM_ID="TEAMID"
export OPENCLAW_APNS_KEY_ID="KEYID"
export OPENCLAW_APNS_PRIVATE_KEY_P8="$(cat /path/to/AuthKey_KEYID.p8)"
```

## 探索路徑

### Bonjour (區域網路)

閘道會在 `local.` 上公告 `_openclaw-gw._tcp`。iOS App 會自動列出這些項目。

### Tailnet (跨網路)

如果 mDNS 被封鎖，請使用單播 DNS-SD 區域 (選擇一個網域；例如：`openclaw.internal.`) 和 Tailscale 分流 DNS。
請參閱 [Bonjour](/zh-Hant/gateway/bonjour) 中的 CoreDNS 範例。

### 手動主機/連接埠

在設定中，啟用 **手動主機** 並輸入閘道主機 + 連接埠 (預設為 `18789`)。

## Canvas + A2UI

iOS 節點會呈現一個 WKWebView canvas。使用 `node.invoke` 來驅動它：

```bash
openclaw nodes invoke --node "iOS Node" --command canvas.navigate --params '{"url":"http://<gateway-host>:18789/__openclaw__/canvas/"}'
```

備註：

- 閘道 canvas 主機會提供 `/__openclaw__/canvas/` 和 `/__openclaw__/a2ui/`。
- 它是由閘道 HTTP 伺服器提供 (連接埠與 `gateway.port` 相同，預設為 `18789`)。
- 當有公告 canvas 主機 URL 時，iOS 節點會在連線時自動導覽至 A2UI。
- 使用 `canvas.navigate` 和 `{"url":""}` 返回內建的鷹架。

### Canvas eval / snapshot

```bash
openclaw nodes invoke --node "iOS Node" --command canvas.eval --params '{"javaScript":"(() => { const {ctx} = window.__openclaw; ctx.clearRect(0,0,innerWidth,innerHeight); ctx.lineWidth=6; ctx.strokeStyle=\"#ff2d55\"; ctx.beginPath(); ctx.moveTo(40,40); ctx.lineTo(innerWidth-40, innerHeight-40); ctx.stroke(); return \"ok\"; })()"}'
```

```bash
openclaw nodes invoke --node "iOS Node" --command canvas.snapshot --params '{"maxWidth":900,"format":"jpeg"}'
```

## 語音喚醒 + 對話模式

- 語音喚醒和對話模式可在設定中使用。
- iOS 可能會暫停背景音訊；當應用程式未啟動時，請將語音功能視為盡力而為的服務。

## 常見錯誤

- `NODE_BACKGROUND_UNAVAILABLE`：將 iOS App 帶到前景 (canvas/camera/screen 指令需要它)。
- `A2UI_HOST_NOT_CONFIGURED`：Gateway 未通告 canvas 主機 URL；請檢查 [Gateway 配置](/zh-Hant/gateway/configuration) 中的 `canvasHost`。
- 配對提示從未出現：執行 `openclaw devices list` 並手動批准。
- 重新安裝後重新連線失敗：鑰匙圈配對權杖已被清除；請重新配對節點。

## 相關文件

- [配對](/zh-Hant/channels/pairing)
- [探索](/zh-Hant/gateway/discovery)
- [Bonjour](/zh-Hant/gateway/bonjour)

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
