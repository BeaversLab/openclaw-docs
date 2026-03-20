---
summary: "Android 應用程式（節點）：連接手冊 + Connect/Chat/Voice/Canvas 指令介面"
read_when:
  - 配對或重新連接 Android 節點
  - 偵錯 Android 閘道發現或驗證
  - 驗證各用戶端間的聊天記錄一致性
title: "Android 應用程式"
---

# Android 應用程式（節點）

> **注意：** Android 應用程式尚未公開發布。原始程式碼可在 `apps/android` 下的 [OpenClaw repository](https://github.com/openclaw/openclaw) 中取得。您可以使用 Java 17 和 Android SDK (`./gradlew :app:assembleDebug`) 自行建置。請參閱 [apps/android/README.md](https://github.com/openclaw/openclaw/blob/main/apps/android/README.md) 以取得建置說明。

## 支援概要

- 角色：伴隨節點應用程式（Android 不託管閘道）。
- 需要閘道：是（透過 WSL2 在 macOS、Linux 或 Windows 上執行）。
- 安裝：[入門指南](/zh-Hant/start/getting-started) + [配對](/zh-Hant/channels/pairing)。
- 閘道：[手冊](/zh-Hant/gateway) + [設定](/zh-Hant/gateway/configuration)。
  - 通訊協定：[閘道通訊協定](/zh-Hant/gateway/protocol)（節點 + 控制平面）。

## 系統控制

系統控制 位於閘道主機上。請參閱 [閘道](/zh-Hant/gateway)。

## 連接手冊

Android 節點應用程式 ⇄ (mDNS/NSD + WebSocket) ⇄ **閘道**

Android 直接連接到閘道 WebSocket（預設為 `ws://<host>:18789`）並使用裝置配對 (`role: node`)。

### 先決條件

- 您可以在「主控」機器上執行閘道。
- Android 裝置/模擬器可以連接到閘道 WebSocket：
  - 使用 mDNS/NSD 的同一個 LAN，**或**
  - 使用 Wide-Area Bonjour / unicast DNS-SD 的同一個 Tailscale tailnet（見下文），**或**
  - 手動設定閘道主機/連接埠（後備方案）
- 您可以在閘道機器上（或透過 SSH）執行 CLI (`openclaw`)。

### 1) 啟動閘道

```bash
openclaw gateway --port 18789 --verbose
```

在日誌中確認您看到類似內容：

- `listening on ws://0.0.0.0:18789`

對於僅限 tailnet 的設定（建議用於 Vienna ⇄ London），將閘道綁定到 tailnet IP：

- 在閘道主機上的 `~/.openclaw/openclaw.json` 中設定 `gateway.bind: "tailnet"`。
- 重新啟動閘道 / macOS 功能表列應用程式。

### 2) 驗證發現（選用）

從閘道機器：

```bash
dns-sd -B _openclaw-gw._tcp local.
```

更多除錯筆記：[Bonjour](/zh-Hant/gateway/bonjour)。

#### 透過單播 DNS-SD 進行 Tailnet (Vienna ⇄ London) 探索

Android NSD/mDNS 探索無法跨網路運作。如果您的 Android 節點和閘道位於不同的網路，但透過 Tailscale 連接，請改用 Wide-Area Bonjour / unicast DNS-SD：

1. 在閘道主機上設定 DNS-SD 區域（例如 `openclaw.internal.`）並發布 `_openclaw-gw._tcp` 記錄。
2. 為您選擇指向該 DNS 伺服器的網域設定 Tailscale 分流 DNS (Split DNS)。

詳細資訊與 CoreDNS 設定範例：[Bonjour](/zh-Hant/gateway/bonjour)。

### 3) 從 Android 連接

在 Android 應用程式中：

- 此應用程式透過 **前景服務**（持續通知）保持與閘道的連線。
- 開啟 **Connect** 分頁。
- 使用 **Setup Code** 或 **Manual** 模式。
- 如果探索被阻擋，請在 **Advanced controls** 中使用手動主機/連接埠（並在需要時提供 TLS/權杖/密碼）。

首次成功配對後，Android 會在啟動時自動重新連接：

- 手動端點（如果已啟用），否則
- 最後探索到的閘道（盡力而為）。

### 4) 批准配對 (CLI)

在閘道機器上：

```bash
openclaw devices list
openclaw devices approve <requestId>
openclaw devices reject <requestId>
```

配對詳細資訊：[Pairing](/zh-Hant/channels/pairing)。

### 5) 驗證節點已連接

- 透過節點狀態：

  ```bash
  openclaw nodes status
  ```

- 透過閘道：

  ```bash
  openclaw gateway call node.list --params "{}"
  ```

### 6) 聊天 + 歷史記錄

Android Chat 分頁支援工作階段選擇（預設 `main`，加上其他現有工作階段）：

- 歷史記錄：`chat.history`
- 傳送：`chat.send`
- 推送更新（盡力而為）：`chat.subscribe` → `event:"chat"`

### 7) Canvas + 相機

#### Gateway Canvas 主機（建議用於網頁內容）

如果您希望節點顯示代理程式可以在磁碟上編輯的真實 HTML/CSS/JS，請將節點指向 Gateway canvas 主機。

注意：節點會從 Gateway HTTP 伺服器載入 canvas（與 `gateway.port` 相同的連接埠，預設 `18789`）。

1. 在閘道主機上建立 `~/.openclaw/workspace/canvas/index.html`。

2. 將節點導向該處 (LAN)：

```bash
openclaw nodes invoke --node "<Android Node>" --command canvas.navigate --params '{"url":"http://<gateway-hostname>.local:18789/__openclaw__/canvas/"}'
```

Tailnet（可選）：如果兩台裝置都在 Tailscale 上，請使用 MagicDNS 名稱或 tailnet IP 代替 `.local`，例如 `http://<gateway-magicdns>:18789/__openclaw__/canvas/`。

此伺服器會將 live-reload 客戶端注入 HTML 並在檔案變更時重新載入。
A2UI 主機位於 `http://<gateway-host>:18789/__openclaw__/a2ui/`。

Canvas 指令（僅限前景）：

- `canvas.eval`、`canvas.snapshot`、`canvas.navigate`（使用 `{"url":""}` 或 `{"url":"/"}` 返回預設腳手架）。`canvas.snapshot` 返回 `{ format, base64 }`（預設 `format="jpeg"`）。
- A2UI：`canvas.a2ui.push`、`canvas.a2ui.reset`（`canvas.a2ui.pushJSONL` 舊版別名）

相機指令（僅限前景；需權限）：

- `camera.snap` (jpg)
- `camera.clip` (mp4)

參閱 [Camera node](/zh-Hant/nodes/camera) 以了解參數和 CLI 輔助工具。

### 8) 語音 + 擴充的 Android 指令介面

- 語音：Android 在語音頁籤中使用單一麥克風開關流程，並具備文字記錄擷取和 TTS 播放功能（配置時使用 ElevenLabs，否則回退至系統 TTS）。當應用程式離開前景時，語音會停止。
- 語音喚醒/對話模式切換目前已從 Android UX/執行階段中移除。
- 其他 Android 指令系列（可用性取決於裝置 + 權限）：
  - `device.status`、`device.info`、`device.permissions`、`device.health`
  - `notifications.list`、`notifications.actions`
  - `photos.latest`
  - `contacts.search`、`contacts.add`
  - `calendar.events`、`calendar.add`
  - `callLog.search`
  - `motion.activity`、`motion.pedometer`

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
