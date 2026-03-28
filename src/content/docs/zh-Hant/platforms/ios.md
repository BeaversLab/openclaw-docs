---
summary: "iOS 節點應用程式：連線至 Gateway、配對、Canvas 及疑難排解"
read_when:
  - Pairing or reconnecting the iOS node
  - Running the iOS app from source
  - Debugging gateway discovery or canvas commands
title: "iOS 應用程式"
---

# iOS 應用程式 (節點)

可用性：內部預覽版。iOS 應用程式尚未公開發布。

## 功能說明

- 透過 WebSocket (LAN 或 tailnet) 連線至 Gateway。
- 公開節點功能：Canvas、螢幕快照、相機擷取、位置、對談模式、語音喚醒。
- 接收 `node.invoke` 指令並回報節點狀態事件。

## 需求

- 在另一台裝置上執行 Gateway (macOS、Linux 或透過 WSL2 執行的 Windows)。
- 網路路徑：
  - 透過 Bonjour 連線至同一個 LAN，**或是**
  - 透過單點傳播 DNS-SD 連線至 Tailnet (範例網域：`openclaw.internal.`)，**或是**
  - 手動主機/連接埠 (後備方案)。

## 快速入門 (配對 + 連線)

1. 啟動 Gateway：

```exec
openclaw gateway --port 18789
```

2. 在 iOS 應用程式中，開啟設定並選取一個已發現的閘道（或啟用手動主機並輸入主機/連接埠）。

3. 在閘道主機上批准配對請求：

```exec
openclaw devices list
openclaw devices approve <requestId>
```

如果應用程式使用變更的驗證詳細資料（角色/範圍/公開金鑰）重試配對，
先前的待處理請求會被取代，並建立一個新的 `requestId`。
請在批准前再次執行 `openclaw devices list`。

4. 驗證連線：

```exec
openclaw nodes status
openclaw gateway call node.list --params "{}"
```

## 官方版本的 Relay 支援推送

官方發布的 iOS 版本使用外部推送中繼，而不是將原始 APNs
權杖發布到閘道。

閘道端要求：

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
- 中繼會傳回一個不透明的中繼代碼以及一個註冊範圍的傳送授權。
- iOS 應用程式會擷取配對的閘道身分識別，並將其包含在 relay 註冊中，因此由 relay 支援的註冊會委派給該特定閘道。
- 應用程式會將該由 relay 支援的註冊透過 `push.apns.register` 轉送至配對的閘道。
- 閘道會使用該儲存的 relay 處理程序來進行 `push.test`、背景喚醒和喚醒提示。
- 閘道 relay 基礎 URL 必須符合內建於官方/TestFlight iOS 版本中的 relay URL。
- 如果應用程式後來連線至不同的閘道，或是連線至具有不同 relay 基礎 URL 的版本，它會重新整理 relay 註冊，而不是重複使用舊的綁定。

閘道在此路徑中**不**需要的項目：

- 不需要部署範圍的 relay 權杖。
- 不需要用於官方/TestFlight 由 relay 支援傳送的直接 APNs 金鑰。

預期的操作員流程：

1. 安裝官方/TestFlight iOS 版本。
2. 在閘道上設定 `gateway.push.apns.relay.baseUrl`。
3. 將應用程式與閘道配對，並讓其完成連線。
4. 應用程式會在擁有 APNs token、操作員會話已連線，且中繼註冊成功後，自動發布 `push.apns.register`。
5. 在此之後，`push.test`、重新連線喚醒以及喚醒提示都可以使用已儲存的中繼備份註冊。

相容性說明：

- `OPENCLAW_APNS_RELAY_BASE_URL` 仍可作為閘道的臨時環境變數覆寫使用。

## 驗證與信任流程

中繼的存在是為了執行兩項約束條件，而直接在閘道上使用 APNs 無法為官方 iOS 建置提供這些條件：

- 只有透過 Apple 分發的正版 OpenClaw iOS 建置才能使用託管的中繼。
- 閘道只能對與該特定閘道配對過的 iOS 裝置發送中繼備份推送。

逐跳：

1. `iOS app -> gateway`
   - 應用程式首先透過正常的閘道驗證流程與閘道配對。
   - 這為應用程式提供了已驗證的節點會話以及已驗證的操作員會話。
   - 操作員會話用於呼叫 `gateway.identity.get`。

2. `iOS app -> relay`
   - 應用程式透過 HTTPS 呼叫中繼註冊端點。
   - 註冊包含 App Attest 證明以及應用程式收據。
   - 中繼會驗證 Bundle ID、App Attest 證明和 Apple 收據，並要求採用
     官方/正式發布途徑。
   - 這就是本機 Xcode/開發建置無法使用託管中繼的原因。本機建置可能
     已經簽署，但無法滿足中繼預期的官方 Apple 發布證明。

3. `gateway identity delegation`
   - 在中繼註冊之前，應用程式會從
     `gateway.identity.get` 取得配對的閘道身分識別。
   - 應用程式會在該中繼註冊載荷中包含該閘道身分識別。
   - 中繼會傳回一個中繼代碼和一個註冊範圍的傳送授權，這兩者皆被委派給
     該閘道身分。

4. `gateway -> relay`
   - 閘道會儲存來自 `push.apns.register` 的中繼代碼和傳送授權。
   - 在 `push.test`、重新連線喚醒以及喚醒推動時，閘道會以其
     自身的裝置身分簽署傳送請求。
   - 中繼會根據來自註冊的委派閘道身分，驗證儲存的傳送授權與閘道簽章兩者。
   - 其他閘道無法重用該儲存的註冊資料，即使它們不知何故取得了該代碼。

5. `relay -> APNs`
   - 中繼擁有生產環境 APNs 憑證以及正式版本的原始 APNs Token。
   - 對於中繼支援的正式版本，閘道絕不會儲存原始 APNs Token。
   - 中繼代表已配對的閘道，將最終的推播傳送至 APNs。

建立此設計的原因：

- 為了將生產環境 APNs 憑證排除在使用者的閘道之外。
- 為了避免在閘道上儲存原始的正式版本 APNs 權杖。
- 為了僅允許官方或 TestFlight 版本的 OpenClaw 使用託管中繼。
- 為了防止某個閘道向屬於不同閘道的 iOS 裝置發送喚醒推送。

本機/手動版本仍維持直接使用 APNs。如果您在不使用中繼的情況下測試這些版本，
閘道仍然需要直接的 APNs 憑證：

```exec
export OPENCLAW_APNS_TEAM_ID="TEAMID"
export OPENCLAW_APNS_KEY_ID="KEYID"
export OPENCLAW_APNS_PRIVATE_KEY_P8="$(cat /path/to/AuthKey_KEYID.p8)"
```

## 探索路徑

### Bonjour (區域網路)

閘道會在 `local.` 上公告 `_openclaw-gw._tcp`。iOS 應用程式會自動列出這些項目。

### Tailnet (跨網路)

如果 mDNS 被封鎖，請使用單播 DNS-SD 區域（選擇一個網域；例如：`openclaw.internal.`）和 Tailscale 分流 DNS。
請參閱 [Bonjour](/zh-Hant/gateway/bonjour) 以取得 CoreDNS 範例。

### 手動主機/連接埠

在設定中，啟用 **手動主機** 並輸入閘道主機 + 連接埠（預設 `18789`）。

## Canvas + A2UI

iOS 節點會渲染 WKWebView canvas。使用 `node.invoke` 來驅動它：

```exec
openclaw nodes invoke --node "iOS Node" --command canvas.navigate --params '{"url":"http://<gateway-host>:18789/__openclaw__/canvas/"}'
```

備註：

- Gateway canvas 主機提供 `/__openclaw__/canvas/` 和 `/__openclaw__/a2ui/`。
- 它是從 Gateway HTTP 伺服器提供（與 `gateway.port` 相同的連接埠，預設 `18789`）。
- 當公告 canvas 主機 URL 時，iOS 節點會在連線時自動導航至 A2UI。
- 使用 `canvas.navigate` 和 `{"url":""}` 返回內建腳手架。

### Canvas eval / snapshot

```exec
openclaw nodes invoke --node "iOS Node" --command canvas.eval --params '{"javaScript":"(() => { const {ctx} = window.__openclaw; ctx.clearRect(0,0,innerWidth,innerHeight); ctx.lineWidth=6; ctx.strokeStyle=\"#ff2d55\"; ctx.beginPath(); ctx.moveTo(40,40); ctx.lineTo(innerWidth-40, innerHeight-40); ctx.stroke(); return \"ok\"; })()"}'
```

```exec
openclaw nodes invoke --node "iOS Node" --command canvas.snapshot --params '{"maxWidth":900,"format":"jpeg"}'
```

## 語音喚醒 + 對話模式

- 語音喚醒和對話模式可在設定中使用。
- iOS 可能會暫停背景音訊；當應用程式未處於啟用狀態時，請將語音功能視為盡力而為。

## 常見錯誤

- `NODE_BACKGROUND_UNAVAILABLE`：將 iOS 應用程式帶到前景（畫布/相機/螢幕指令需要它）。
- `A2UI_HOST_NOT_CONFIGURED`：Gateway 未廣告 canvas 主機 URL；請檢查 [Gateway configuration](/zh-Hant/gateway/configuration) 中的 `canvasHost`。
- 配對提示從未出現：執行 `openclaw devices list` 並手動批准。
- 重新安裝後重新連線失敗：鑰匙圈配對 token 已被清除；請重新配對節點。

## 相關文件

- [配對](/zh-Hant/channels/pairing)
- [探索](/zh-Hant/gateway/discovery)
- [Bonjour](/zh-Hant/gateway/bonjour)
