---
summary: "Android 應用程式 (node): 連線操作手冊 + Connect/Chat/Voice/Canvas 指令介面"
read_when:
  - Pairing or reconnecting the Android node
  - Debugging Android gateway discovery or auth
  - Verifying chat history parity across clients
title: "Android 應用程式"
---

# Android 應用程式 (節點)

> **注意：** Android 應用程式尚未公開發布。原始程式碼可於 [OpenClaw repository](https://github.com/openclaw/openclaw) 中的 `apps/android` 下取得。您可以使用 Java 17 和 Android SDK (`./gradlew :app:assemblePlayDebug`) 自行建置。請參閱 [apps/android/README.md](https://github.com/openclaw/openclaw/blob/main/apps/android/README.md) 以了解建置說明。

## 支援概要

- 角色：伴隨節點應用程式 (Android 不代管 Gateway)。
- 需要 Gateway：是 (在 macOS、Linux 或透過 WSL2 在 Windows 上執行)。
- 安裝：[快速入門](/en/start/getting-started) + [配對](/en/channels/pairing)。
- 閘道：[操作手冊](/en/gateway) + [設定](/en/gateway/configuration)。
  - 通訊協定：[閘道協定](/en/gateway/protocol) (節點 + 控制平面)。

## 系統控制

系統控制 (launchd/systemd) 位於閘道主機上。請參閱 [閘道](/en/gateway)。

## 連線操作手冊

Android 節點應用程式 ⇄ (mDNS/NSD + WebSocket) ⇄ **Gateway**

Android 直接連線至閘道 WebSocket 並使用裝置配對 (`role: node`)。

對於 Tailscale 或公開主機，Android 需要一個安全端點：

- 首選：使用 `https://<magicdns>` / `wss://<magicdns>` 的 Tailscale Serve / Funnel
- 也支援：任何其他具有真實 TLS 端點的 `wss://` 閘道 URL
- 在私人 LAN 位址 / `.local` 主機上，加上 `localhost`、`127.0.0.1` 和 Android 模擬器橋接器 (`10.0.2.2`)，仍然支援明文 `ws://`

### 先決條件

- 您可以在「主控」機器上執行閘道。
- Android 裝置/模擬器可以連線至閘道 WebSocket：
  - 具有 mDNS/NSD 的同一個 LAN，**或者**
  - 使用 Wide-Area Bonjour / unicast DNS-SD 的同一個 Tailscale tailnet (見下文)，**或者**
  - 手動閘道主機/連接埠 (後備方案)
- Tailnet/公開行動裝置配對 **不會** 使用原始 tailnet IP `ws://` 端點。請改用 Tailscale Serve 或其他 `wss://` URL。
- 您可以在閘道機器上 (或透過 SSH) 執行 CLI (`openclaw`)。

### 1) 啟動閘道

```bash
openclaw gateway --port 18789 --verbose
```

請在日誌中確認您看到類似以下的內容：

- `listening on ws://0.0.0.0:18789`

對於透過 Tailscale 進行遠端 Android 存取，建議優先使用 Serve/Funnel，而非直接的 tailnet bind：

```bash
openclaw gateway --tailscale serve
```

這會為 Android 提供一個安全的 `wss://` / `https://` 端點。單純的 `gateway.bind: "tailnet"` 設定對於首次遠端 Android 配對是不夠的，除非您另外終止 TLS。

### 2) 驗證探索（可選）

從 gateway 機器上：

```bash
dns-sd -B _openclaw-gw._tcp local.
```

更多除錯說明：[Bonjour](/en/gateway/bonjour)。

如果您同時設定了廣域網探索網域，請與以下內容進行比對：

```bash
openclaw gateway discover --json
```

這會在一次通過中顯示 `local.` 加上設定的廣域網域，並使用解析出的服務端點而非僅依賴 TXT 提示。

#### 透過單播 DNS-SD 進行 Tailnet (Vienna ⇄ London) 探索

Android NSD/mDNS 探索無法跨越網路。如果您的 Android 節點和 gateway 位於不同的網路但透過 Tailscale 連接，請改用 Wide-Area Bonjour / unicast DNS-SD。

單靠探索對於 tailnet/公開 Android 配對是不夠的。探索到的路由仍需要一個安全的端點（`wss://` 或 Tailscale Serve）：

1. 在 gateway 主機上設定一個 DNS-SD 區域（例如 `openclaw.internal.`）並發布 `_openclaw-gw._tcp` 記錄。
2. 為指向該 DNS 伺服器的選定網域設定 Tailscale split DNS。

詳細資訊與 CoreDNS 設定範例：[Bonjour](/en/gateway/bonjour)。

### 3) 從 Android 連接

在 Android 應用程式中：

- 該應用程式透過 **前景服務** (persistent notification) 保持與 gateway 的連線。
- 開啟 **Connect** 分頁。
- 使用 **Setup Code** 或 **Manual** 模式。
- 如果探索被封鎖，請在 **Advanced controls** 中使用手動主機/連接埠。對於私人 LAN 主機，`ws://` 仍然有效。對於 Tailscale/公開主機，請開啟 TLS 並使用 `wss://` / Tailscale Serve 端點。

首次配對成功後，Android 會在啟動時自動重新連接：

- 手動端點（如果已啟用），否則
- 最後探索到的 gateway（盡力而為）。

### 4) 核准配對 (CLI)

在 gateway 機器上：

```bash
openclaw devices list
openclaw devices approve <requestId>
openclaw devices reject <requestId>
```

配對詳情：[Pairing](/en/channels/pairing)。

### 5) 驗證節點已連接

- 透過節點狀態：

  ```bash
  openclaw nodes status
  ```

- 透過 Gateway：

  ```bash
  openclaw gateway call node.list --params "{}"
  ```

### 6) 聊天 + 歷史紀錄

Android 聊天分頁支援選取階段（預設 `main`，以及其他現有階段）：

- 歷史紀錄：`chat.history`（顯示正規化；內聯指令標籤會從可見文字中移除，純文字工具呼叫 XML 載荷（包括 `<tool_call>...</tool_call>`、`<function_call>...</function_call>`、`<tool_calls>...</tool_calls>`、`<function_calls>...</function_calls>`，以及截斷的工具呼叫區塊）和洩漏的 ASCII/全形模型控制權杖會被移除，純靜默權杖助理列（例如精確的 `NO_REPLY` / `no_reply`）會被省略，而過大的列可以被替換為預留位置）
- 傳送：`chat.send`
- 推送更新（盡力而為）：`chat.subscribe` → `event:"chat"`

### 7) Canvas + 相機

#### Gateway Canvas 主機（建議用於網頁內容）

如果您希望節點顯示代理可以在磁碟上編輯的實際 HTML/CSS/JS，請將節點指向 Gateway canvas 主機。

注意：節點會從 Gateway HTTP 伺服器載入 canvas（與 `gateway.port` 相同的連接埠，預設 `18789`）。

1. 在 gateway 主機上建立 `~/.openclaw/workspace/canvas/index.html`。

2. 將節點導向它（LAN）：

```bash
openclaw nodes invoke --node "<Android Node>" --command canvas.navigate --params '{"url":"http://<gateway-hostname>.local:18789/__openclaw__/canvas/"}'
```

Tailnet（可選）：如果兩台裝置都在 Tailscale 上，請使用 MagicDNS 名稱或 tailnet IP 代替 `.local`，例如 `http://<gateway-magicdns>:18789/__openclaw__/canvas/`。

此伺服器會將即時重新載入用戶端注入 HTML 並在檔案變更時重新載入。A2UI 主機位於 `http://<gateway-host>:18789/__openclaw__/a2ui/`。

Canvas 指令（僅前景）：

- `canvas.eval`、`canvas.snapshot`、`canvas.navigate`（使用 `{"url":""}` 或 `{"url":"/"}` 以返回預設腳手架）。`canvas.snapshot` 會返回 `{ format, base64 }`（預設 `format="jpeg"`）。
- A2UI：`canvas.a2ui.push`、`canvas.a2ui.reset`（`canvas.a2ui.pushJSONL` 舊式別名）

相機指令（僅前景；權限限制）：

- `camera.snap` (jpg)
- `camera.clip` (mp4)

參閱 [Camera node](/en/nodes/camera) 以了解參數和 CLI 輔助工具。

### 8) 語音 + 擴充的 Android 指令介面

- 語音：Android 在語音分頁中使用單一麥克風開關流程，並具備文字記錄擷取和 `talk.speak` 播放功能。僅在 `talk.speak` 無法使用時才使用本機系統 TTS。當應用程式離開前景時，語音會停止。
- 語音喚醒/對話模式切換目前已從 Android UX/執行階段中移除。
- 額外的 Android 指令系列（可用性取決於裝置 + 權限）：
  - `device.status`, `device.info`, `device.permissions`, `device.health`
  - `notifications.list`, `notifications.actions` (參見下方的 [通知轉發](#notification-forwarding))
  - `photos.latest`
  - `contacts.search`, `contacts.add`
  - `calendar.events`, `calendar.add`
  - `callLog.search`
  - `sms.search`
  - `motion.activity`, `motion.pedometer`

## 助理進入點

Android 支援透過系統助理觸發程式 啟動 OpenClaw。設定後，長按主畫面按鈕或說出「Hey Google, ask
OpenClaw...」將開啟應用程式並將提示詞傳入聊天編輯器。

這使用了在應用程式資訊清單 中宣告的 Android **App Actions** 中繼資料。在閘道 端不需要額外設定 — 助理意圖 完全由 Android 應用程式處理，並作為一般聊天訊息轉發。

<Note>App Actions 的可用性取決於裝置、Google Play Services 版本，以及使用者是否已將 OpenClaw 設為預設助理應用程式。</Note>

## 通知轉發

Android 可以將裝置通知作為事件轉發到閘道。您可以使用多項控制項來設定轉發哪些通知以及何時轉發。

| 索引鍵                           | 類型           | 描述                                                           |
| -------------------------------- | -------------- | -------------------------------------------------------------- |
| `notifications.allowPackages`    | string[]       | 僅轉發來自這些套件名稱的通知。如果設定，則會忽略所有其他套件。 |
| `notifications.denyPackages`     | string[]       | 永不轉發來自這些套件名稱的通知。在 `allowPackages` 之後套用。  |
| `notifications.quietHours.start` | string (HH:mm) | 安靜時段視窗的開始時間（本機裝置時間）。通知將在此期間被抑制。 |
| `notifications.quietHours.end`   | string (HH:mm) | 安靜時段視窗的結束時間。                                       |
| `notifications.rateLimit`        | number         | 每個套件每分鐘最多轉發的通知數量。超出的通知將被丟棄。         |

通知選擇器對於轉發的通知事件也使用更安全的行為，以防止意外轉發敏感的系統通知。

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
