---
summary: "iOS 節點應用程式：連線至 Gateway、配對、Canvas 和疑難排解"
read_when:
  - Pairing or reconnecting the iOS node
  - Running the iOS app from source
  - Debugging gateway discovery or canvas commands
title: "iOS 應用程式"
---

可用性：當為發布版本啟用時，iPhone app 版本會透過 Apple 渠道分發。本機開發版本也可以從原始碼執行。

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

預設情況下，官方/TestFlight 版本和閘道使用位於 `https://ios-push-relay.openclaw.ai` 的託管中繼。

自訂中繼部署可以覆寫閘道中繼 URL：

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

- iOS app 使用 App Attest 和 StoreKit app 交易 JWS 向中繼註冊。
- 中繼返回一個不透明的中繼控制代碼以及一個註冊範圍的發送授權。
- iOS app 獲取配對的閘道身分並將其包含在中繼註冊中，以便將中繼支援的註冊委派給該特定閘道。
- App 將該中繼支援的註冊透過 `push.apns.register` 轉發給配對的閘道。
- 閘道使用該儲存的中繼控制代碼進行 `push.test`、背景喚醒和喚醒提示。
- 自訂閘道中繼 URL 必須與內建於官方/TestFlight iOS 版本中的中繼 URL 相符。
- 如果 app 稍後連接到不同的閘道或具有不同中繼基礎 URL 的版本，它會重新整理中繼註冊，而不是重用舊的綁定。

閘道在此路徑中**不**需要什麼：

- 不需要部署範圍的中繼 token。
- 對於官方/TestFlight 中繼支援的發送，不需要直接的 APNs 金鑰。

預期的操作員流程：

1. 安裝官方/TestFlight iOS 版本。
2. 可選：僅在使用自訂中繼部署時，在閘道上設定 `gateway.push.apns.relay.baseUrl`。
3. 將 app 與閘道配對，並讓它完成連線。
4. App 在擁有 APNs token、操作員階段作業已連線且中繼註冊成功後，會自動發布 `push.apns.register`。
5. 之後，`push.test`、重新連線喚醒和喚醒提示可以使用儲存的中繼支援註冊。

## 背景活躍信標

當 iOS 因靜默推送、背景重新整理或重要位置事件而喚醒 app 時，app
會嘗試短暫的節點重新連線，然後使用 `event: "node.presence.alive"` 呼叫 `node.event`。
只有在已知的已驗證節點裝置身分後，閘道才會將此記錄為配對節點/裝置元資料上的 `lastSeenAtMs`/`lastSeenReason`。

該應用程式僅在閘道回應包含
`handled: true` 時，才將背景喚醒視為成功記錄。較舊的閘道可能會以 `{ "ok": true }` 確認 `node.event`；該回應是相容的，但不計入持續的最後上線更新。

相容性說明：

- `OPENCLAW_APNS_RELAY_BASE_URL` 仍可作為閘道的臨時環境變數覆寫。
- `OPENCLAW_PUSH_RELAY_BASE_URL` 仍可作為正式版/TestFlight iOS 版本的臨時環境變數覆寫。

## 驗證與信任流程

中繼的存在是為了執行兩項直接在閘道上使用 APNs 無法為正式 iOS 版本提供的限制：

- 只有透過 Apple 發布的正式 OpenClaw iOS 版本才能使用託管中繼。
- 閘道僅能向與該特定閘道配對的 iOS 裝置傳送基於中繼的推送。

逐跳傳輸（Hop by hop）：

1. `iOS app -> gateway`
   - 應用程式首先透過正常的閘道驗證流程與閘道配對。
   - 這為應用程式提供了一個已驗證的節點會話以及一個已驗證的操作員會話。
   - 操作員會話用於呼叫 `gateway.identity.get`。

2. `iOS app -> relay`
   - 應用程式透過 HTTPS 呼叫中繼註冊端點。
   - 註冊包含 App Attest 證明以及 StoreKit 應用程式交易 JWS。
   - 中繼會驗證 Bundle ID、App Attest 證明和 Apple 發布證明，並要求使用正式/生產環境的發布途徑。
   - 這就是阻止本地 Xcode/開發版本使用託管中繼的原因。本地版本可能已簽署，但無法滿足中繼期望的正式 Apple 發布證明。

3. `gateway identity delegation`
   - 在中繼註冊之前，應用程式會從 `gateway.identity.get` 取得已配對的閘道身分。
   - 應用程式會在註冊負載中包含該閘道身分。
   - 中繼會傳回一個中繼代碼 和一個註冊範圍的發送授權，這兩者都委派給該閘道身分。

4. `gateway -> relay`
   - 閘道會儲存來自 `push.apns.register` 的中繼代碼和發送授權。
   - 在 `push.test`、重新連線喚醒和喚醒提示 時，閘道會使用其自身的裝置身分對發送請求進行簽署。
   - 中繼會根據註冊時委派的閘道身分，驗證儲存的發送授權和閘道簽章。
   - 其他閘道即使以某種方式取得了代碼，也無法重用該儲存的註冊資訊。

5. `relay -> APNs`
   - 中繼擁有正式版本的生產環境 APNs 憑證和原始 APNs Token。
   - 對於由中繼支援的正式版本，閘道絕不會儲存原始 APNs Token。
   - 中繼代表配對的閘道將最終的推播發送至 APNs。

建立此設計的原因：

- 為了避免將生產環境 APNs 憑證儲存在使用者的閘道中。
- 為了避免在閘道上儲存原始的正式版本 APNs Token。
- 為了僅允許正式版本或 TestFlight 的 OpenClaw 版本使用託管的中繼。
- 為了防止某個閘道向屬於不同閘道的 iOS 裝置發送喚醒推播。

本地/手動建置版本仍維持直接使用 APNs。如果您在沒有中繼的情況下測試這些版本，
閘道仍然需要直接的 APNs 憑證：

```bash
export OPENCLAW_APNS_TEAM_ID="TEAMID"
export OPENCLAW_APNS_KEY_ID="KEYID"
export OPENCLAW_APNS_PRIVATE_KEY_P8="$(cat /path/to/AuthKey_KEYID.p8)"
```

這些是閘道主機的執行時期環境變數，而非 Fastlane 設定。`apps/ios/fastlane/.env` 僅儲存
App Store Connect / TestFlight 的認證資訊（例如 `ASC_KEY_ID` 和 `ASC_ISSUER_ID`）；它並不設定
本地 iOS 建置版本的直接 APNs 傳遞。

建議的閘道主機儲存方式：

```bash
mkdir -p ~/.openclaw/credentials/apns
chmod 700 ~/.openclaw/credentials/apns
mv /path/to/AuthKey_KEYID.p8 ~/.openclaw/credentials/apns/AuthKey_KEYID.p8
chmod 600 ~/.openclaw/credentials/apns/AuthKey_KEYID.p8
export OPENCLAW_APNS_PRIVATE_KEY_PATH="$HOME/.openclaw/credentials/apns/AuthKey_KEYID.p8"
```

請勿提交 `.p8` 檔案或將其置於 repo checkout 目錄下。

## 探索路徑

### Bonjour (LAN)

iOS 應用程式會瀏覽 `_openclaw-gw._tcp` 於 `local.` 上，若已設定，則包含
相同的廣域 DNS-SD 探索網域。同一個區域網路內的閘道會自動從 `local.` 顯示；
跨網路探索可以使用設定的廣域網域，而無需更改訊標類型。

### Tailnet (跨網路)

如果 mDNS 被阻擋，請使用單播 DNS-SD 區域（選擇一個網域；例如：
`openclaw.internal.`）以及 Tailscale 分割 DNS。
請參閱 [Bonjour](/zh-Hant/gateway/bonjour) 中的 CoreDNS 範例。

### 手動主機/連接埠

在設定中，啟用 **Manual Host** 並輸入閘道主機 + 連接埠（預設為 `18789`）。

## Canvas + A2UI

iOS 節點會渲染 WKWebView canvas。使用 `node.invoke` 來驅動它：

```bash
openclaw nodes invoke --node "iOS Node" --command canvas.navigate --params '{"url":"http://<gateway-host>:18789/__openclaw__/canvas/"}'
```

備註：

- Gateway Canvas 主機提供 `/__openclaw__/canvas/` 和 `/__openclaw__/a2ui/`。
- 它由 Gateway HTTP 伺服器提供（與 `gateway.port` 相同的連接埠，預設為 `18789`）。
- 當廣播 Canvas 主機 URL 時，iOS 節點會在連線時自動導覽至 A2UI。
- 使用 `canvas.navigate` 和 `{"url":""}` 返回內建的腳手架。

## Computer Use 關係

iOS 應用程式是行動節點介面，而非 Codex Computer Use 後端。Codex
Computer Use 和 `cua-driver mcp` 透過 MCP 工具控制本機 macOS 桌面；
iOS 應用程式則透過 OpenClaw 節點指令（例如 `canvas.*`、`camera.*`、`screen.*`、`location.*` 和 `talk.*`）暴露 iPhone 和 iPad 的功能。

Agent 仍可透過呼叫節點命令透過 OpenClaw 操作 iOS 應用程式，但這些呼叫會透過
Gateway 節點協定並遵循 iOS 前景/背景限制。請使用 [Codex Computer Use](/zh-Hant/plugins/codex-computer-use)
進行本機桌面控制，並參閱本頁以了解 iOS 節點功能。

### Canvas eval / snapshot

```bash
openclaw nodes invoke --node "iOS Node" --command canvas.eval --params '{"javaScript":"(() => { const {ctx} = window.__openclaw; ctx.clearRect(0,0,innerWidth,innerHeight); ctx.lineWidth=6; ctx.strokeStyle=\"#ff2d55\"; ctx.beginPath(); ctx.moveTo(40,40); ctx.lineTo(innerWidth-40, innerHeight-40); ctx.stroke(); return \"ok\"; })()"}'
```

```bash
openclaw nodes invoke --node "iOS Node" --command canvas.snapshot --params '{"maxWidth":900,"format":"jpeg"}'
```

## 語音喚醒 + 通話模式

- 語音喚醒和通話模式可在設定中使用。
- 支援通話的 iOS 節點會廣播 `talk` 功能，並可宣告
  `talk.ptt.start`、`talk.ptt.stop`、`talk.ptt.cancel` 和 `talk.ptt.once`；
  Gateway 預設允許對受信任的支援通話節點使用那些按壓通話命令。
- iOS 可能會暫停背景音訊；當應用程式未啟用時，請將語音功能視為盡力而為。

## 常見錯誤

- `NODE_BACKGROUND_UNAVAILABLE`：將 iOS 應用程式帶到前景（Canvas/相機/螢幕命令需要它）。
- `A2UI_HOST_NOT_CONFIGURED`：Gateway 未廣播 Canvas 外掛程式介面 URL；請檢查 [Gateway configuration](/zh-Hant/gateway/configuration) 中的 `plugins.entries.canvas.config.host`。
- 配對提示從未出現：執行 `openclaw devices list` 並手動批准。
- 重新安裝後重新連線失敗：鑰匙圈配對權杖已被清除；請重新配對節點。

## 相關文件

- [配對](/zh-Hant/channels/pairing)
- [探索](/zh-Hant/gateway/discovery)
- [Bonjour](/zh-Hant/gateway/bonjour)
