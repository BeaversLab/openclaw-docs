---
summary: "Android 應用程式（節點）：連接手冊 + Connect/Chat/Voice/Canvas 指令介面"
read_when:
  - Pairing or reconnecting the Android node
  - Debugging Android gateway discovery or auth
  - Verifying chat history parity across clients
title: "Android 應用程式"
---

<Note>
  官方 Android 應用程式可在 [Google Play](https://play.google.com/store/apps/details?id=ai.openclaw.app&hl=en_IN) 上取得。它是一個同伴節點，需要一個執行中的 OpenClaw Gateway。原始碼也可在 [OpenClaw repository](https://github.com/openclaw/openclaw) 中的 `apps/android` 下取得；請參閱 [apps/android/README.md](https://github.com/openclaw/openclaw/blob/main/apps/android/README.md) 以了解建置說明。
</Note>

## 支援快照

- 角色：同伴節點應用程式（Android 不託管 Gateway）。
- 需要 Gateway：是（透過 WSL2 在 macOS、Linux 或 Windows 上執行）。
- 安裝：應用程式請至 [Google Play](https://play.google.com/store/apps/details?id=ai.openclaw.app&hl=en_IN)，Gateway 請參閱 [Getting Started](/zh-Hant/start/getting-started)，然後進行 [Pairing](/zh-Hant/channels/pairing)。
- Gateway：[Runbook](/zh-Hant/gateway) + [Configuration](/zh-Hant/gateway/configuration)。
  - 協定：[Gateway protocol](/zh-Hant/gateway/protocol)（節點 + 控制平面）。

## 系統控制

系統控制 位於 Gateway 主機上。請參閱 [Gateway](/zh-Hant/gateway)。

## 連接手冊

Android 節點應用程式 ⇄ (mDNS/NSD + WebSocket) ⇄ **Gateway**

Android 直接連接到 Gateway WebSocket 並使用裝置配對 (`role: node`)。

對於 Tailscale 或公開主機，Android 需要一個安全端點：

- 首選：Tailscale Serve / Funnel 搭配 `https://<magicdns>` / `wss://<magicdns>`
- 也支援：任何其他 `wss://` Gateway URL 且具有真實 TLS 端點
- 在私人 LAN 位址 / `.local` 主機上，以及 `localhost`、`127.0.0.1` 和 Android 模擬器橋接器 (`10.0.2.2`) 上，仍支援明文 `ws://`

### 先決條件

- 您可以在「主控」機器上執行 Gateway。
- Android 裝置/模擬器可以連接到 gateway WebSocket：
  - 使用 mDNS/NSD 的相同 LAN，**或**
  - 使用 Wide-Area Bonjour / unicast DNS-SD 的相同 Tailscale tailnet（見下文），**或**
  - 手動閘道主機/連接埠（後備）
- Tailnet/公開行動裝置配對**不**會使用原始的 tailnet IP `ws://` 端點。請改用 Tailscale Serve 或其他 `wss://` URL。
- 您可以在閘道機器上（或透過 SSH）執行 CLI (`openclaw`)。

### 1) 啟動閘道

```bash
openclaw gateway --port 18789 --verbose
```

請在日誌中確認您看到類似以下內容：

- `listening on ws://0.0.0.0:18789`

若要透過 Tailscale 進行遠端 Android 存取，建議優先使用 Serve/Funnel，而非原始的 tailnet 繫結：

```bash
openclaw gateway --tailscale serve
```

這會為 Android 提供一個安全的 `wss://` / `https://` 端點。除非您另外終止 TLS，否則單純的 `gateway.bind: "tailnet"` 設定對於首次遠端 Android 配對是不夠的。

### 2) 驗證探索（可選）

從閘道機器上：

```bash
dns-sd -B _openclaw-gw._tcp local.
```

更多除錯備註：[Bonjour](/zh-Hant/gateway/bonjour)。

如果您也設定了廣域探索網域，請進行比較：

```bash
openclaw gateway discover --json
```

這會顯示 `local.` 加上設定的廣域網域，並一次完成且使用解析出的服務端點，而非僅依賴 TXT 提示。

#### 透過單播 DNS-SD 進行 Tailnet（Vienna ⇄ London）探索

Android NSD/mDNS 探索無法跨越網路。如果您的 Android 節點和閘道位於不同的網路但透過 Tailscale 連線，請改用廣域 Bonjour / 單播 DNS-SD。

單靠探索對於 tailnet/公開 Android 配對並不足夠。探索到的路由仍需要一個安全端點（`wss://` 或 Tailscale Serve）：

1. 在閘道主機上設定一個 DNS-SD 區域（例如 `openclaw.internal.`）並發布 `_openclaw-gw._tcp` 記錄。
2. 為您指向該 DNS 伺服器的選定網域設定 Tailscale 分割 DNS。

詳細資訊與 CoreDNS 設定範例：[Bonjour](/zh-Hant/gateway/bonjour)。

### 3) 從 Android 連線

在 Android 應用程式中：

- 應用程式會透過**前景服務**（持續通知）保持其閘道連線活躍。
- 開啟 **Connect** 分頁。
- 使用 **Setup Code** 或 **Manual** 模式。
- 如果發現受阻，請在 **進階控制** 中使用手動主機/連接埠。對於私有 LAN 主機，`ws://` 仍然有效。對於 Tailscale/公開主機，請開啟 TLS 並使用 `wss://` / Tailscale Serve 端點。

首次成功配對後，Android 會在啟動時自動重新連線：

- 手動端點（如果已啟用），否則為
- 上次發現的閘道（盡力而為）。

### Presence alive beacons

當已驗證的節點階段連線後，以及當應用程式移至背景時而前景服務仍保持連線，Android 會使用 `event: "node.presence.alive"` 呼叫 `node.event`。閘道僅在已知已驗證節點的裝置身分後，才會將此記錄為配對節點/裝置元數據上的 `lastSeenAtMs`/`lastSeenReason`。

應用程式僅在閘道回應包含 `handled: true` 時，才將信標計算為成功記錄。較舊的閘道可能會使用 `{ "ok": true }` 回應 `node.event`；該回應相容，但不計入持久的上次見過更新。

### 4) 批准配對 (CLI)

在閘道機器上：

```bash
openclaw devices list
openclaw devices approve <requestId>
openclaw devices reject <requestId>
```

配對詳情：[配對](/zh-Hant/channels/pairing)。

選用：如果 Android 節點始終從嚴格控制的子網路連線，您可以選擇加入使用明確 CIDR 或確切 IP 進行的首次節點自動批准：

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

此功能預設為停用。它僅適用於沒有請求範圍的新 `role: node` 配對。操作員/瀏覽器配對以及任何角色、範圍、元數據或公開金鑰變更仍然需要手動批准。

### 5) 驗證節點已連線

- 透過節點狀態：

  ```bash
  openclaw nodes status
  ```

- 透過閘道：

  ```bash
  openclaw gateway call node.list --params "{}"
  ```

### 6) 聊天 + 歷史記錄

Android 聊天分頁支援階段選擇（預設為 `main`，加上其他現有階段）：

- 歷史記錄： `chat.history`（顯示正規化；內聯指令標籤已從可見文字中移除，純文字工具呼叫 XML 承載（包括 `<tool_call>...</tool_call>`、 `<function_call>...</function_call>`、 `<tool_calls>...</tool_calls>`、 `<function_calls>...</function_calls>` 和截斷的工具呼叫區塊）以及洩漏的 ASCII/全形模型控制權杖已被移除，純靜默權杖助理列（如精確的 `NO_REPLY` / `no_reply`）會被省略，且過大的列可被替換為預留位置）
- 發送： `chat.send`
- 推送更新（盡力而為）： `chat.subscribe` → `event:"chat"`

### 7) 畫布 + 相機

#### Gateway 畫布主機（建議用於網頁內容）

如果您希望節點顯示代理可在磁碟上編輯的真實 HTML/CSS/JS，請將節點指向 Gateway 畫布主機。

<Note>節點會從 Gateway HTTP 伺服器載入畫布（與 `gateway.port` 相同的連接埠，預設為 `18789`）。</Note>

1. 在 gateway 主機上建立 `~/.openclaw/workspace/canvas/index.html`。

2. 將節點導航至該位置 (LAN)：

```bash
openclaw nodes invoke --node "<Android Node>" --command canvas.navigate --params '{"url":"http://<gateway-hostname>.local:18789/__openclaw__/canvas/"}'
```

Tailnet（可選）：如果兩個裝置都在 Tailscale 上，請使用 MagicDNS 名稱或 tailnet IP 代替 `.local`，例如 `http://<gateway-magicdns>:18789/__openclaw__/canvas/`。

此伺服器會將即時重新載入客戶端注入 HTML 中，並在檔案變更時重新載入。
A2UI 主機位於 `http://<gateway-host>:18789/__openclaw__/a2ui/`。

畫布指令（僅限前景）：

- `canvas.eval`、 `canvas.snapshot`、 `canvas.navigate`（使用 `{"url":""}` 或 `{"url":"/"}` 返回預設腳手架）。 `canvas.snapshot` 返回 `{ format, base64 }`（預設 `format="jpeg"`）。
- A2UI： `canvas.a2ui.push`、 `canvas.a2ui.reset`（`canvas.a2ui.pushJSONL` 舊版別名）

相機指令（僅限前景；需權限）：

- `camera.snap` (jpg)
- `camera.clip` (mp4)

請參閱 [Camera node](/zh-Hant/nodes/camera) 以了解參數和 CLI 輔助工具。

### 8) 語音 + 擴展的 Android 指令介面

- 語音分頁：Android 有兩種明確的擷取模式。**麥克風** 是手動的語音分頁工作階段，會將每次暫停作為一次聊天輪次發送，並在應用程式離開前景或使用者離開語音分頁時停止。**對話** 是連續的對話模式，會持續聆聽直到切換關閉或節點斷線。
- 對話模式會在開始擷取前將現有的前景服務從 `dataSync` 提升為 `dataSync|microphone`，並在對話模式停止時將其降級。Android 14+ 需要宣告 `FOREGROUND_SERVICE_MICROPHONE`、授予 `RECORD_AUDIO` 執行時權限，以及執行時的麥克風服務類型。
- 預設情況下，Android 對話使用原生語音辨識、Gateway 聊天，以及透過設定的 Gateway 對話提供者使用 `talk.speak`。只有在 `talk.speak` 不可用時才會使用本機系統 TTS。
- 只有在 `talk.realtime.mode` 為 `realtime` 且 `talk.realtime.transport` 為 `gateway-relay` 時，Android 對話才會使用即時 Gateway 中繼。
- 語音喚醒在 Android UX/執行時中仍保持停用狀態。
- 額外的 Android 指令系列（可用性取決於裝置 + 權限）：
  - `device.status`, `device.info`, `device.permissions`, `device.health`
  - `notifications.list`, `notifications.actions` (請參閱下方的 [通知轉發](#notification-forwarding))
  - `photos.latest`
  - `contacts.search`, `contacts.add`
  - `calendar.events`, `calendar.add`
  - `callLog.search`
  - `sms.search`
  - `motion.activity`, `motion.pedometer`

## 助理入口

Android 支援從系統助理觸發程式 (Google Assistant) 啟動 OpenClaw。設定完成後，按住主頁按鈕或說「Hey Google, ask OpenClaw...」會開啟應用程式並將提示詞傳遞至聊天編輯器。

這使用了在應用程式清單中宣告的 Android **App Actions** 中繼資料。閘道端不需要額外的配置 -- 助理意圖完全由 Android 應用程式處理，並作為一般聊天訊息轉發。

<Note>App Actions 的可用性取決於裝置、Google Play Services 版本，以及使用者是否將 OpenClaw 設為預設助理應用程式。</Note>

## 通知轉發

Android 可以將裝置通知作為事件轉發到閘道。有幾個控制項可讓您指定轉發哪些通知以及轉發的時間。

| 鍵                               | 類型           | 說明                                                               |
| -------------------------------- | -------------- | ------------------------------------------------------------------ |
| `notifications.allowPackages`    | string[]       | 僅轉發來自這些套件名稱的通知。如果設定，則會忽略所有其他套件。     |
| `notifications.denyPackages`     | string[]       | 絕不轉發來自這些套件名稱的通知。在 `allowPackages` 之後套用。      |
| `notifications.quietHours.start` | string (HH:mm) | 靜音時段視窗的開始時間（本地裝置時間）。在此視窗期間通知將被抑制。 |
| `notifications.quietHours.end`   | string (HH:mm) | 靜音時段視窗的結束時間。                                           |
| `notifications.rateLimit`        | number         | 每個套件每分鐘轉發的最大通知數量。超出部分的通知將被丟棄。         |

通知選擇器對轉發的通知事件也使用更安全的行為，以防止意外轉發敏感的系統通知。

配置範例：

```json5
{
  notifications: {
    allowPackages: ["com.slack", "com.whatsapp"],
    denyPackages: ["com.android.systemui"],
    quietHours: {
      start: "22:00",
      end: "07:00",
    },
    rateLimit: 5,
  },
}
```

<Note>通知轉發需要 Android 通知監聽器權限。應用程式會在設定過程中提示授予此權限。</Note>

## 相關

- [iOS 應用程式](/zh-Hant/platforms/ios)
- [節點](/zh-Hant/nodes)
- [Android 節點疑難排解](/zh-Hant/nodes/troubleshooting)
