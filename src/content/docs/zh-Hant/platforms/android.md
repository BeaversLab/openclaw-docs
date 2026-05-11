---
summary: "Android 應用程式（節點）：連線手冊 + Connect/Chat/Voice/Canvas 指令介面"
read_when:
  - Pairing or reconnecting the Android node
  - Debugging Android gateway discovery or auth
  - Verifying chat history parity across clients
title: "Android 應用程式"
---

<Note>Android 應用程式尚未公開發布。原始碼可在 `apps/android` 下的 [OpenClaw repository](https://github.com/openclaw/openclaw) 中取得。您可以使用 Java 17 和 Android SDK (`./gradlew :app:assemblePlayDebug`) 自行建置。請參閱 [apps/android/README.md](https://github.com/openclaw/openclaw/blob/main/apps/android/README.md) 以取得建置說明。</Note>

## 支援快照

- 角色：伴隨節點應用程式（Android 不託管 Gateway）。
- 需要 Gateway：是（在 macOS、Linux 或透過 WSL2 的 Windows 上執行）。
- 安裝：[入門指南](/zh-Hant/start/getting-started) + [配對](/zh-Hant/channels/pairing)。
- Gateway：[操作手冊](/zh-Hant/gateway) + [設定](/zh-Hant/gateway/configuration)。
  - 協定：[Gateway 通訊協定](/zh-Hant/gateway/protocol)（節點 + 控制平面）。

## 系統控制

系統控制 (launchd/systemd) 位於 Gateway 主機上。請參閱 [Gateway](/zh-Hant/gateway)。

## 連線手冊

Android 節點應用程式 ⇄ (mDNS/NSD + WebSocket) ⇄ **Gateway**

Android 直接連線至 Gateway WebSocket 並使用裝置配對 (`role: node`)。

對於 Tailscale 或公開主機，Android 需要一個安全端點：

- 首選：Tailscale Serve / Funnel 搭配 `https://<magicdns>` / `wss://<magicdns>`
- 也支援：任何其他具有真實 TLS 端點的 `wss://` Gateway URL
- 在私人 LAN 位址 / `.local` 主機，以及 `localhost`、`127.0.0.1` 和 Android 模擬器橋接器 (`10.0.2.2`) 上，仍然支援明文 `ws://`

### 先決條件

- 您可以在「主」機器上執行 Gateway。
- Android 裝置/模擬器可以連線到 gateway WebSocket：
  - 具有 mDNS/NSD 的相同 LAN，**或**
  - 使用 Wide-Area Bonjour / unicast DNS-SD 的相同 Tailscale tailnet（見下文），**或**
  - 手動指定 gateway 主機/連接埠（後備方案）
- Tailnet/公開行動裝置配對**不**會使用原始 tailnet IP `ws://` 端點。請改用 Tailscale Serve 或其他 `wss://` URL。
- 您可以在閘道機器上（或透過 SSH）執行 CLI (`openclaw`)。

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

這會為 Android 提供一個安全的 `wss://` / `https://` 端點。單純的 `gateway.bind: "tailnet"` 設定對於首次遠端 Android 配對是不夠的，除非您另外終止 TLS。

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

這會一次性顯示 `local.` 以及設定的廣域網域，並使用解析出的服務端點，而非僅依賴 TXT 記錄提示。

#### 透過單播 DNS-SD 進行 Tailnet (Vienna ⇄ London) 探索

Android NSD/mDNS 探索無法跨越網路。如果您的 Android 節點與閘道位於不同的網路，但透過 Tailscale 連線，請改用廣域 Bonjour / 單播 DNS-SD。

單憑探索對於 tailnet/公開 Android 配對是不夠的。探索到的路由仍需要一個安全端點 (`wss://` 或 Tailscale Serve)：

1. 在閘道主機上設定 DNS-SD 區域 (例如 `openclaw.internal.`) 並發布 `_openclaw-gw._tcp` 記錄。
2. 為您選擇的網域設定指向該 DNS 伺服器的 Tailscale 分割 DNS。

詳細資訊與 CoreDNS 設定範例：[Bonjour](/zh-Hant/gateway/bonjour)。

### 3) 從 Android 連線

在 Android 應用程式中：

- 應用程式透過**前景服務**（持續通知）保持閘道連線暢通。
- 開啟 **Connect** 分頁。
- 使用 **Setup Code** 或 **Manual** 模式。
- 如果探索被阻擋，請在 **Advanced controls** 中使用手動主機/連接埠。對於私有 LAN 主機，`ws://` 仍然有效。對於 Tailscale/公開主機，請開啟 TLS 並使用 `wss://` / Tailscale Serve 端點。

首次成功配對後，Android 會在啟動時自動重新連線：

- 手動端點（如果已啟用），否則
- 上次發現的閘道（盡最大努力）。

### 4) 批准配對 (CLI)

在閘道機器上：

```bash
openclaw devices list
openclaw devices approve <requestId>
openclaw devices reject <requestId>
```

配對詳細資訊：[配對](/zh-Hant/channels/pairing)。

選用：如果 Android 節點總是從嚴格控制的子網路連線，您可以選擇加入首次節點自動批准，並指定明確的 CIDR 或確切 IP：

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

此功能預設為停用。它僅適用於沒有請求範圍的新鮮 `role: node` 配對。操作員/瀏覽器配對以及任何角色、範圍、中繼資料或公開金鑰變更仍需手動批准。

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

Android 聊天分頁支援工作階段選擇（預設為 `main`，加上其他現有工作階段）：

- 歷史記錄：`chat.history`（顯示標準化；內聯指令標籤會從可見文字中移除，純文字工具呼叫 XML 承載（包括 `<tool_call>...</tool_call>`、`<function_call>...</function_call>`、`<tool_calls>...</tool_calls>`、`<function_calls>...</function_calls>` 和截斷的工具呼叫區塊）以及外洩的 ASCII/全形模型控制權杖會被移除，純靜默權杖助理列（如確切的 `NO_REPLY` / `no_reply`）會被省略，而過大的列可以用預留位置取代）
- 傳送：`chat.send`
- 推播更新（盡最大努力）：`chat.subscribe` → `event:"chat"`

### 7) Canvas + 相機

#### 閘道 Canvas 主機（建議用於網頁內容）

如果您希望節點顯示代理程式可以在磁碟上編輯的真實 HTML/CSS/JS，請將節點指向閘道 canvas 主機。

<Note>節點從閘道 HTTP 伺服器載入 canvas（與 `gateway.port` 相同的連接埠，預設為 `18789`）。</Note>

1. 在閘道主機上建立 `~/.openclaw/workspace/canvas/index.html`。

2. 將節點導航至該處 (LAN)：

```bash
openclaw nodes invoke --node "<Android Node>" --command canvas.navigate --params '{"url":"http://<gateway-hostname>.local:18789/__openclaw__/canvas/"}'
```

Tailnet（選用）：如果兩台裝置都在 Tailscale 上，請使用 MagicDNS 名稱或 tailnet IP 代替 `.local`，例如 `http://<gateway-magicdns>:18789/__openclaw__/canvas/`。

此伺服器會將即時重載用戶端注入 HTML，並在檔案變更時重新載入。
A2UI 主機位於 `http://<gateway-host>:18789/__openclaw__/a2ui/`。

Canvas 指令（僅前景）：

- `canvas.eval`、`canvas.snapshot`、`canvas.navigate`（使用 `{"url":""}` 或 `{"url":"/"}` 返回預設腳手架）。`canvas.snapshot` 返回 `{ format, base64 }`（預設 `format="jpeg"`）。
- A2UI：`canvas.a2ui.push`、`canvas.a2ui.reset`（`canvas.a2ui.pushJSONL` 舊版別名）

相機指令（僅前景；需權限）：

- `camera.snap` (jpg)
- `camera.clip` (mp4)

請參閱 [Camera node](/zh-Hant/nodes/camera) 以了解參數和 CLI 輔助工具。

### 8) 語音 + 擴充的 Android 指令介面

- 語音分頁：Android 有兩種明確的擷取模式。**Mic** 是手動的語音分頁會話，會將每次停頓作為一次對話輪次發送，並在 App 離開前景或使用者離開語音分頁時停止。**Talk** 是連續的談話模式，會持續聆聽直到切換關閉或節點斷線。
- 談話模式會在擷取開始前將現有的前景服務從 `dataSync` 提升為 `dataSync|microphone`，然後在談話模式停止時將其降級。Android 14+ 需要宣告 `FOREGROUND_SERVICE_MICROPHONE`、授予 `RECORD_AUDIO` 執行時權限，以及執行時的麥克風服務類型。
- 口語回覆會透過設定的 Gateway Talk 提供者使用 `talk.speak`。僅在 `talk.speak` 不可用時才使用本機系統 TTS。
- 語音喚醒功能在 Android UX/執行時期中維持停用狀態。
- 額外的 Android 指令系列（可用性取決於裝置 + 權限）：
  - `device.status`、`device.info`、`device.permissions`、`device.health`
  - `notifications.list`、`notifications.actions`（請參閱下方的 [Notification forwarding](#notification-forwarding)）
  - `photos.latest`
  - `contacts.search`、`contacts.add`
  - `calendar.events`, `calendar.add`
  - `callLog.search`
  - `sms.search`
  - `motion.activity`, `motion.pedometer`

## 助理入口點

Android 支援從系統助理觸發程式（Google
Assistant）啟動 OpenClaw。設定完成後，按住主畫面按鈕或說出「Hey Google，叫
OpenClaw...」會開啟應用程式並將提示詞傳入聊天編輯器。

這會使用在應用程式資訊清單中宣告的 Android **App Actions** 中繼資料。不需要
在閘道端進行額外設定 — 助理意圖完全由 Android 應用程式處理，並當作一般聊天訊息轉發。

<Note>App Actions 的可用性取決於裝置、Google Play Services 版本， 以及使用者是否將 OpenClaw 設為預設助理應用程式。</Note>

## 通知轉發

Android 可以將裝置通知作為事件轉發至閘道。多個控制項可讓您指定轉發哪些通知以及轉發的時機。

| 索引鍵                           | 類型           | 描述                                                                 |
| -------------------------------- | -------------- | -------------------------------------------------------------------- |
| `notifications.allowPackages`    | string[]       | 僅轉發來自這些套件名稱的通知。如果設定，則會忽略所有其他套件。       |
| `notifications.denyPackages`     | string[]       | 絕不轉發來自這些套件名稱的通知。在 `allowPackages` 之後套用。        |
| `notifications.quietHours.start` | string (HH:mm) | 安靜時段視窗的開始時間（本機裝置時間）。通知會在此視窗期間受到抑制。 |
| `notifications.quietHours.end`   | string (HH:mm) | 安靜時段視窗的結束時間。                                             |
| `notifications.rateLimit`        | number         | 每個套件每分鐘最多轉發的通知數。超出的通知會被捨棄。                 |

通知選擇器對於轉發的通知事件也使用更安全的行為，以防止意外轉發敏感的系統通知。

範例設定：

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

<Note>通知轉發需要 Android 通知監聽器權限。應用程式會在設定期間提示您授予此權限。</Note>

## 相關

- [iOS 應用程式](/zh-Hant/platforms/ios)
- [節點](/zh-Hant/nodes)
- [Android 節點疑難排解](/zh-Hant/nodes/troubleshooting)
