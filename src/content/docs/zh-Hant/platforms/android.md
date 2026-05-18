---
summary: "Android 應用程式（節點）：連線手冊 + Connect/Chat/Voice/Canvas 指令介面"
read_when:
  - Pairing or reconnecting the Android node
  - Debugging Android gateway discovery or auth
  - Verifying chat history parity across clients
title: "Android 應用程式"
---

<Note>
  官方 Android 應用程式可於 [Google Play](https://play.google.com/store/apps/details?id=ai.openclaw.app&hl=en_IN) 取得。它是 companion node，需要一個正在執行的 OpenClaw Gateway。原始碼也可在 [OpenClaw repository](https://github.com/openclaw/openclaw) 中取得，採用 `apps/android` 授權；建置說明請參閱 [apps/android/README.md](https://github.com/openclaw/openclaw/blob/main/apps/android/README.md)。
</Note>

## 支援快照

- 角色：伴隨節點應用程式（Android 不託管 Gateway）。
- 需要 Gateway：是（在 macOS、Linux 或透過 WSL2 的 Windows 上執行）。
- 安裝：應用程式請前往 [Google Play](https://play.google.com/store/apps/details?id=ai.openclaw.app&hl=en_IN)，Gateway 請參閱 [Getting Started](/zh-Hant/start/getting-started)，然後進行 [Pairing](/zh-Hant/channels/pairing)。
- Gateway：[Runbook](/zh-Hant/gateway) + [Configuration](/zh-Hant/gateway/configuration)。
  - 通訊協定：[Gateway protocol](/zh-Hant/gateway/protocol) (節點 + 控制平面)。

## 系統控制

系統控制 位於 Gateway 主機上。請參閱 [Gateway](/zh-Hant/gateway)。

## 連線手冊

Android 節點應用程式 ⇄ (mDNS/NSD + WebSocket) ⇄ **Gateway**

Android 會直接連線到 Gateway WebSocket 並使用裝置配對 (`role: node`)。

對於 Tailscale 或公開主機，Android 需要一個安全端點：

- 首選：Tailscale Serve / Funnel 搭配 `https://<magicdns>` / `wss://<magicdns>`
- 也支援：任何其他具有真實 TLS 端點的 `wss://` Gateway URL
- 在私人 LAN 位址 / `.local` 主機上，以及 `localhost`、`127.0.0.1` 和 Android 模擬器橋接器 (`10.0.2.2`) 上，仍支援明文 `ws://`

### 先決條件

- 您可以在「主控」機器上執行 Gateway。
- Android 裝置/模擬器可以連線到 gateway WebSocket：
  - 具有 mDNS/NSD 的相同 LAN，**或**
  - 使用 Wide-Area Bonjour / unicast DNS-SD 的相同 Tailscale tailnet（見下文），**或**
  - 手動指定 gateway 主機/連接埠（後備方案）
- Tailnet/公開行動配對**不**會使用原始 tailnet IP `ws://` 端點。請改用 Tailscale Serve 或其他 `wss://` URL。
- 您可以在 gateway 機器上 (或透過 SSH) 執行 CLI (`openclaw`)。

### 1) 啟動閘道

```bash
openclaw gateway --port 18789 --verbose
```

請在日誌中確認您看到類似以下的內容：

- `listening on ws://0.0.0.0:18789`

若要透過 Tailscale 進行遠端 Android 存取，建議優先使用 Serve/Funnel，而不是原始的 tailnet bind：

```bash
openclaw gateway --tailscale serve
```

這為 Android 提供了安全的 `wss://` / `https://` 端點。除非您另外終止 TLS，否則單純的 `gateway.bind: "tailnet"` 設定對於首次遠端 Android 配對是不夠的。

### 2) 驗證探索（選用）

在閘道機器上：

```bash
dns-sd -B _openclaw-gw._tcp local.
```

更多除錯說明：[Bonjour](/zh-Hant/gateway/bonjour)。

如果您同時設定了廣域探索網域，請與以下內容進行比對：

```bash
openclaw gateway discover --json
```

這會一次性顯示 `local.` 以及設定的廣域網域名稱，並使用解析出的服務端點，而非僅依賴 TXT 記錄提示。

#### 透過單播 DNS-SD 進行 Tailnet (Vienna ⇄ London) 探索

Android NSD/mDNS 探索無法跨越網路。如果您的 Android 節點和 Gateway 位於不同的網路，但透過 Tailscale 連線，請改用 Wide-Area Bonjour / unicast DNS-SD。

單靠服務發現不足以進行 tailnet/公網 Android 配對。發現的路由仍然需要一個安全端點（`wss://` 或 Tailscale Serve）：

1. 在 Gateway 主機上設定 DNS-SD 區域（例如 `openclaw.internal.`）並發佈 `_openclaw-gw._tcp` 記錄。
2. 為您選擇的網域設定指向該 DNS 伺服器的 Tailscale 分割 DNS。

詳細資訊與 CoreDNS 範例配置：[Bonjour](/zh-Hant/gateway/bonjour)。

### 3) 從 Android 連線

在 Android 應用程式中：

- 應用程式透過**前景服務**（持續通知）保持閘道連線暢通。
- 開啟 **Connect** 分頁。
- 使用 **Setup Code** 或 **Manual** 模式。
- 如果服務發現受阻，請在 **Advanced controls** 中使用手動主機/連接埠。對於私有區域網主機，`ws://` 仍然有效。對於 Tailscale/公網主機，請開啟 TLS 並使用 `wss://` / Tailscale Serve 端點。

首次成功配對後，Android 會在啟動時自動重新連線：

- 手動端點（如果已啟用），否則
- 上次發現的閘道（盡最大努力）。

### Presence alive beacons

當經過驗證的節點會話連線後，且當應用程式移至背景而前景服務仍保持連線時，Android 會以 `event: "node.presence.alive"` 呼叫 `node.event`。只有在已知經過驗證的節點裝置身分後，Gateway 才會將此記錄為配對節點/裝置元資料上的 `lastSeenAtMs`/`lastSeenReason`。

只有當 Gateway 回應包含 `handled: true` 時，應用程式才會將訊號視為成功記錄。較舊的 Gateway 可能會以 `{ "ok": true }` 回應確認 `node.event`；該回應雖相容，但不計入持久的「最後一次出現」更新。

### 4) Approve pairing (CLI)

在 Gateway 機器上：

```bash
openclaw devices list
openclaw devices approve <requestId>
openclaw devices reject <requestId>
```

配對詳細資訊：[Pairing](/zh-Hant/channels/pairing)。

選用：如果 Android 節點始終從嚴格控制的子網路連線，您可以選擇使用明確的 CIDR 或確切 IP 來啟用首次節點自動核准：

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

此功能預設為停用。它僅適用於沒有請求範圍 的全新 `role: node` 配對。操作員/瀏覽器配對以及任何角色、範圍、元資料或公鑰變更仍需手動批准。

### 5) 驗證節點已連線

- 透過節點狀態：

  ```bash
  openclaw nodes status
  ```

- 透過 Gateway：

  ```bash
  openclaw gateway call node.list --params "{}"
  ```

### 6) 聊天 + 歷史記錄

Android Chat 分頁支援會話選擇（預設為 `main`，加上其他現有會話）：

- 歷史記錄：`chat.history` (顯示正規化；內聯指令標籤會從可見文字中剝離，純文字工具呼叫 XML 承載 (包括 `<tool_call>...</tool_call>`、`<function_call>...</function_call>`、`<tool_calls>...</tool_calls>`、`<function_calls>...</function_calls>`，以及截斷的工具呼叫區塊) 和洩漏的 ASCII/全形模型控制權杖會被剝離，純靜音權杖助手列 (例如精確的 `NO_REPLY` / `no_reply`) 會被省略，且過大的列可以被佔位符取代)
- 發送：`chat.send`
- 推送更新 (盡力而為)：`chat.subscribe` → `event:"chat"`

### 7) Canvas + 相機

#### Gateway Canvas 主機（推薦用於網頁內容）

如果您希望節點顯示代理程式可以在磁碟上編輯的真正 HTML/CSS/JS，請將節點指向 Gateway canvas 主機。

<Note>節點從 Gateway HTTP 伺服器載入畫布 (與 `gateway.port` 相同的連接埠，預設為 `18789`)。</Note>

1. 在 gateway 主機上建立 `~/.openclaw/workspace/canvas/index.html`。

2. 將節點導航至該處（LAN）：

```bash
openclaw nodes invoke --node "<Android Node>" --command canvas.navigate --params '{"url":"http://<gateway-hostname>.local:18789/__openclaw__/canvas/"}'
```

Tailnet (可選)：如果兩個裝置都在 Tailscale 上，請使用 MagicDNS 名稱或 tailnet IP 代替 `.local`，例如 `http://<gateway-magicdns>:18789/__openclaw__/canvas/`。

此伺服器會將即時重新載入客戶端注入 HTML 並在檔案變更時重新載入。
A2UI 主機位於 `http://<gateway-host>:18789/__openclaw__/a2ui/`。

Canvas 指令（僅限前景）：

- `canvas.eval`、`canvas.snapshot`、`canvas.navigate` (使用 `{"url":""}` 或 `{"url":"/"}` 以返回預設腳手架)。`canvas.snapshot` 返回 `{ format, base64 }` (預設 `format="jpeg"`)。
- A2UI：`canvas.a2ui.push`、`canvas.a2ui.reset` (`canvas.a2ui.pushJSONL` 舊式別名)

相機指令（僅限前景；受權限限制）：

- `camera.snap` (jpg)
- `camera.clip` (mp4)

參閱 [Camera node](/zh-Hant/nodes/camera) 以了解參數和 CLI 輔助工具。

### 8) 語音 + 擴展的 Android 指令介面

- 語音分頁：Android 有兩種明確的擷取模式。**Mic** 是手動的語音分頁工作階段，會將每次暫停作為聊天輪次發送，並在應用程式離開前景或使用者離開語音分頁時停止。**Talk** 是持續的對談模式，會持續聆聽直到切換關閉或節點斷線。
- 對談模式會在擷取開始前將現有的前景服務從 `dataSync` 提升為 `dataSync|microphone`，然後在對談模式停止時將其降級。Android 14+ 需要 `FOREGROUND_SERVICE_MICROPHONE` 宣告、`RECORD_AUDIO` 執行時授予，以及執行時的麥克風服務類型。
- 口語回覆透過設定的網關 Talk 提供者使用 `talk.speak`。僅當 `talk.speak` 不可用時才會使用本地系統 TTS。
- 語音喚醒在 Android UX/執行階段中保持停用狀態。
- 額外的 Android 指令系列（可用性取決於裝置 + 權限）：
  - `device.status`、`device.info`、`device.permissions`、`device.health`
  - `notifications.list`、`notifications.actions`（請參閱下方的[通知轉發](#notification-forwarding)）
  - `photos.latest`
  - `contacts.search`、`contacts.add`
  - `calendar.events`、`calendar.add`
  - `callLog.search`
  - `sms.search`
  - `motion.activity`、`motion.pedometer`

## Assistant entrypoints

Android 支援透過系統助理觸發程序 (Google
Assistant) 啟動 OpenClaw。設定完成後，長按主畫面按鈕或說「Hey Google，請
問 OpenClaw...」即可開啟應用程式，並將提示詞傳入聊天編輯器。

這使用在應用程式清單中宣告的 Android **App Actions** 中繼資料。閘道端無需額外配置 — 助理意圖完全由 Android 應用程式處理，並作為一般聊天訊息轉發。

<Note>App Actions 的可用性取決於裝置、Google Play Services 版本，以及使用者是否已將 OpenClaw 設定為預設助理應用程式。</Note>

## 通知轉發

Android 可以將裝置通知作為事件轉發至閘道。您可以使用多個控制項來限制轉發哪些通知以及何時轉發。

| 鍵                               | 類型           | 描述                                                               |
| -------------------------------- | -------------- | ------------------------------------------------------------------ |
| `notifications.allowPackages`    | string[]       | 僅轉發來自這些套件名稱的通知。如果設定此項，將會忽略所有其他套件。 |
| `notifications.denyPackages`     | string[]       | 切勿轉發來自這些套件名稱的通知。於 `allowPackages` 之後套用。      |
| `notifications.quietHours.start` | string (HH:mm) | 安靜時段視窗的開始時間 (本地裝置時間)。在此視窗期間將會抑制通知。  |
| `notifications.quietHours.end`   | string (HH:mm) | 安靜時段視窗的結束時間。                                           |
| `notifications.rateLimit`        | number         | 每個套件每分鐘的最大轉發通知數。超出的通知將被捨棄。               |

通知選擇器也會對轉發的通知事件使用更安全的行為，以防止意外轉發敏感的系統通知。

範例配置：

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

<Note>通知轉發需要 Android Notification Listener 權限。應用程式會在設定過程中提示授予此權限。</Note>

## 相關

- [iOS 應用程式](/zh-Hant/platforms/ios)
- [節點](/zh-Hant/nodes)
- [Android 節點疑難排解](/zh-Hant/nodes/troubleshooting)
