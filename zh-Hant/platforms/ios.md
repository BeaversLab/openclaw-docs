---
summary: "iOS 節點應用程式：連接到 Gateway、配對、Canvas 以及疑難排解"
read_when:
  - 配對或重新連接 iOS 節點
  - 從原始碼執行 iOS 應用程式
  - 除錯 Gateway 探索或 Canvas 指令
title: "iOS 應用程式"
---

# iOS 應用程式

可用性：內部預覽。iOS 應用程式尚未公開發布。

## 功能

- 透過 WebSocket (LAN 或 tailnet) 連接到 Gateway。
- 公開節點功能：Canvas、螢幕快照、相機擷取、位置、對談模式、語音喚醒。
- 接收 `node.invoke` 指令並回報節點狀態事件。

## 需求

- 在另一台裝置上執行的 Gateway (macOS、Linux 或透過 WSL2 執行的 Windows)。
- 網路路徑：
  - 透過 Bonjour 連接到同一個 LAN，**或者**
  - 透過單播 DNS-SD 連接到 Tailnet (範例網域：`openclaw.internal.`)，**或者**
  - 手動指定主機/連接埠 (後備方案)。

## 快速入門 (配對 + 連接)

1. 啟動 Gateway：

```bash
openclaw gateway --port 18789
```

2. 在 iOS 應用程式中，開啟設定 並選擇一個探索到的 gateway (或是啟用手動主機 並輸入主機/連接埠)。

3. 在 gateway 主機上批准配對請求：

```bash
openclaw devices list
openclaw devices approve <requestId>
```

4. 驗證連接：

```bash
openclaw nodes status
openclaw gateway call node.list --params "{}"
```

## 官方版本的 Relay 推播支援

官方發布的 iOS 版本使用外部推播轉送 (relay)，而不是將原始 APNs token 發布到 gateway。

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

- iOS 應用程式使用 App Attest 和應用程式收據 向 relay 註冊。
- Relay 會傳回一個不透明的 relay handle 以及一個註冊範圍的傳送權限。
- iOS 應用程式會取得已配對 gateway 的身分識別並將其包含在 relay 註冊中，因此這個由 relay 支援的註冊會委派給該特定的 gateway。
- 應用程式會透過 `push.apns.register` 將這個由 relay 支援的註冊轉發給已配對的 gateway。
- Gateway 會使用該儲存的 relay handle 進行 `push.test`、背景喚醒以及喚醒提示。
- Gateway relay 基礎 URL 必須與內建於官方/TestFlight iOS 版本中的 relay URL 相符。
- 如果應用程式稍後連接到不同的 gateway，或是連接到具有不同 relay 基礎 URL 的版本，它會重新整理 relay 註冊，而不是重複使用舊的綁定。

Gateway 在此路徑中**不**需要做的事項：

- 不需要部署範圍的 relay token。
- 不需要官方/TestFlight relay 支援傳送的直接 APNs 金鑰。

預期的操作員流程：

1. 安裝官方/TestFlight iOS 版本。
2. 在 Gateway 上設定 `gateway.push.apns.relay.baseUrl`。
3. 將 App 配對至 Gateway 並讓其完成連線。
4. 當 App 擁有 APNs 權杖、Operator 會話已連線，且中繼註冊成功後，它會自動發佈 `push.apns.register`。
5. 之後，當發生 `push.test`、重新連線喚醒以及喚醒提示時，皆可使用已儲存的中繼註冊資訊。

相容性說明：

- `OPENCLAW_APNS_RELAY_BASE_URL` 仍可作為 Gateway 的臨時環境變數覆寫。

## 驗證與信任流程

中繼的存在是為了執行兩項直接在 Gateway 上使用 APNs 所無法為官方 iOS 建置提供的限制：

- 只有透過 Apple 發布的正版 OpenClaw iOS 建置才能使用託管中繼。
- Gateway 只能對與該特定 Gateway 配對過的 iOS 裝置發送中繼推送。

逐步跳躍：

1. `iOS app -> gateway`
   - App 首先透過正常的 Gateway 驗證流程與 Gateway 配對。
   - 這會給予 App 一個已驗證的節點會話以及一個已驗證的 Operator 會話。
   - Operator 會話用於呼叫 `gateway.identity.get`。

2. `iOS app -> relay`
   - App 透過 HTTPS 呼叫中繼註冊端點。
   - 註冊包含 App Attest 證明以及 App 收據。
   - 中繼會驗證 Bundle ID、App Attest 證明和 Apple 收據，並且要求符合官方/生產環境的發布途徑。
   - 這就是阻擋本機 Xcode/開發建置使用託管中繼的原因。本機建置可能經過簽署，但並不符合中繼所期望的官方 Apple 發布證明。

3. `gateway identity delegation`
   - 在中繼註冊之前，App 會從 `gateway.identity.get` 取得已配對的 Gateway 身分識別。
   - App 會在註冊酬載中包含該 Gateway 身分識別。
   - 中繼會返回一個中繼代碼和一個註冊範圍的發送授予，這些皆委派給該 Gateway 身分識別。

4. `gateway -> relay`
   - Gateway 會儲存來自 `push.apns.register` 的中繼代碼和發送授予。
   - 當發生 `push.test`、重新連線喚醒以及喚醒提示時，Gateway 會以其自己的裝置身分識別對發送請求進行簽署。
   - 中繼會根據註冊時的委派閘道身份，驗證儲存的發送授予以及閘道簽章。
   - 其他閘道無法重用該儲存的註冊資訊，即使它以某種方式取得了該代碼。

5. `relay -> APNs`
   - 中繼擁有生產環境 APNs 憑證以及正式版本的原始 APNs 代碼。
   - 對於由中繼支援的正式版本，閘道絕不會儲存原始的 APNs 代碼。
   - 中繼代表配對的閘道將最終的推送發送至 APNs。

建立此設計的原因：

- 為了讓生產環境 APNs 憑證不會儲存在使用者的閘道中。
- 為了避免在閘道上儲存原始正式版本的 APNs 代碼。
- 為了僅允許正式版或 TestFlight 版本的 OpenClaw 使用代管的中繼。
- 為了防止某個閘道向屬於不同閘道的 iOS 裝置發送 喚醒推送。

本機/手動版本仍保持直接使用 APNs。如果您在沒有中繼的情況下測試這些版本，閘道仍然需要直接的 APNs 憑證：

```bash
export OPENCLAW_APNS_TEAM_ID="TEAMID"
export OPENCLAW_APNS_KEY_ID="KEYID"
export OPENCLAW_APNS_PRIVATE_KEY_P8="$(cat /path/to/AuthKey_KEYID.p8)"
```

## 探索路徑

### Bonjour (區域網路)

閘道會在 `local.` 上公告 `_openclaw-gw._tcp`。iOS App 會自動列出這些項目。

### Tailnet (跨網路)

如果 mDNS 被封鎖，請使用單播 DNS-SD 區域（選擇一個網域；例如：`openclaw.internal.`）和 Tailscale 分割 DNS。請參閱 [Bonjour](/zh-Hant/gateway/bonjour) 以取得 CoreDNS 範例。

### 手動主機/連接埠

在設定中，啟用 **手動主機** 並輸入閘道主機 + 連接埠（預設為 `18789`）。

## Canvas + A2UI

iOS 節點會呈現 WKWebView canvas。使用 `node.invoke` 來驅動它：

```bash
openclaw nodes invoke --node "iOS Node" --command canvas.navigate --params '{"url":"http://<gateway-host>:18789/__openclaw__/canvas/"}'
```

備註：

- 閘道 canvas 主機會提供 `/__openclaw__/canvas/` 和 `/__openclaw__/a2ui/`。
- 它由閘道 HTTP 伺服器提供（與 `gateway.port` 相同的連接埠，預設為 `18789`）。
- 當公告 canvas 主機 URL 時，iOS 節點會在連線時自動導覽至 A2UI。
- 使用 `canvas.navigate` 和 `{"url":""}` 返回內建的腳手架。

### Canvas 評估 / 快照

```bash
openclaw nodes invoke --node "iOS Node" --command canvas.eval --params '{"javaScript":"(() => { const {ctx} = window.__openclaw; ctx.clearRect(0,0,innerWidth,innerHeight); ctx.lineWidth=6; ctx.strokeStyle=\"#ff2d55\"; ctx.beginPath(); ctx.moveTo(40,40); ctx.lineTo(innerWidth-40, innerHeight-40); ctx.stroke(); return \"ok\"; })()"}'
```

```bash
openclaw nodes invoke --node "iOS Node" --command canvas.snapshot --params '{"maxWidth":900,"format":"jpeg"}'
```

## 語音喚醒 + 交談模式

- 語音喚醒和交談模式可在設定中使用。
- iOS 可能會暫停背景音訊；當 App 未處於啟用狀態時，請將語音功能視為盡力而為。

## 常見錯誤

- `NODE_BACKGROUND_UNAVAILABLE`: 將 iOS 應用程式帶到前景（canvas/camera/screen 指令需要這樣做）。
- `A2UI_HOST_NOT_CONFIGURED`: Gateway 未通告 canvas 主機 URL；請檢查 [Gateway configuration](/zh-Hant/gateway/configuration) 中的 `canvasHost`。
- 配對提示從未出現：執行 `openclaw devices list` 並手動批准。
- 重新安裝後重新連線失敗：鑰匙圈配對權杖已被清除；請重新配對節點。

## 相關文件

- [配對](/zh-Hant/channels/pairing)
- [探索](/zh-Hant/gateway/discovery)
- [Bonjour](/zh-Hant/gateway/bonjour)

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
