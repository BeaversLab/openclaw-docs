---
summary: "Android 應用程式（節點）：連線手冊 + Connect/Chat/Voice/Canvas 指令介面"
read_when:
  - Pairing or reconnecting the Android node
  - Debugging Android gateway discovery or auth
  - Verifying chat history parity across clients
title: "Android 應用程式"
---

# Android 應用程式（節點）

> **注意：** Android 應用程式尚未公開發布。原始碼可在 `apps/android` 下的 [OpenClaw repository](https://github.com/openclaw/openclaw) 中取得。您可以使用 Java 17 和 Android SDK (`./gradlew :app:assemblePlayDebug`) 自行建構。請參閱 [apps/android/README.md](https://github.com/openclaw/openclaw/blob/main/apps/android/README.md) 以了解建構說明。

## 支援快照

- 角色：伴隨節點應用程式（Android 不託管 Gateway）。
- 需要 Gateway：是（透過 WSL2 在 macOS、Linux 或 Windows 上執行）。
- 安裝：[入門指南](/zh-Hant/start/getting-started) + [配對](/zh-Hant/channels/pairing)。
- Gateway：[Runbook](/zh-Hant/gateway) + [Configuration](/zh-Hant/gateway/configuration)。
  - 協定：[Gateway protocol](/zh-Hant/gateway/protocol)（節點 + 控制平面）。

## 系統控制

系統控制（launchd/systemd）存在於 Gateway 主機上。請參閱 [Gateway](/zh-Hant/gateway)。

## 連線 Runbook

Android node app ⇄ (mDNS/NSD + WebSocket) ⇄ **Gateway**

Android 直接連線至 Gateway WebSocket（預設為 `ws://<host>:18789`）並使用裝置配對（`role: node`）。

### 先決條件

- 您可以在「master」機器上執行 Gateway。
- Android 裝置/模擬器可以連接到 gateway WebSocket：
  - 使用 mDNS/NSD 的同一個區域網路，**或**
  - 使用 Wide-Area Bonjour / unicast DNS-SD 的同一個 Tailscale tailnet（見下文），**或**
  - 手動指定 gateway 主機/連接埠（後備方案）
- 您可以在 gateway 機器（或透過 SSH）執行 CLI (`openclaw`)。

### 1) 啟動 Gateway

```bash
openclaw gateway --port 18789 --verbose
```

在日誌中確認您看到類似以下的內容：

- `listening on ws://0.0.0.0:18789`

對於僅使用 tailnet 的設定（建議用於 Vienna ⇄ London），請將 gateway 繫結至 tailnet IP：

- 在 gateway 主機上的 `~/.openclaw/openclaw.json` 中設定 `gateway.bind: "tailnet"`。
- 重新啟動 Gateway / macOS 選單列應用程式。

### 2) 驗證探索（可選）

從 gateway 機器：

```bash
dns-sd -B _openclaw-gw._tcp local.
```

更多除錯說明：[Bonjour](/zh-Hant/gateway/bonjour)。

#### 透過單播 DNS-SD 進行 Tailnet (Vienna ⇄ London) 探索

Android NSD/mDNS 探索無法跨越網路。如果您的 Android 節點和 gateway 位於不同的網路但透過 Tailscale 連線，請改用 Wide-Area Bonjour / 單播 DNS-SD：

1. 在閘道主機上設定一個 DNS-SD 區域（例如 `openclaw.internal.`）並發佈 `_openclaw-gw._tcp` 記錄。
2. 針對指向該 DNS 伺服器的您所選網域，設定 Tailscale 分割 DNS。

詳細資訊與 CoreDNS 設定範例：[Bonjour](/zh-Hant/gateway/bonjour)。

### 3) 從 Android 連線

在 Android 應用程式中：

- 應用程式透過**前景服務**（持續通知）保持其閘道連線活躍。
- 開啟 **Connect** 分頁。
- 使用 **Setup Code** 或 **Manual** 模式。
- 如果探索被阻擋，請在 **Advanced controls** 中使用手動主機/連接埠（並在需要時輸入 TLS/權杖/密碼）。

首次成功配對後，Android 會在啟動時自動重新連線：

- 手動端點（如果已啟用），否則為
- 上次探索到的閘道（盡力而為）。

### 4) 核准配對 (CLI)

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

Android 聊天分頁支援會話選擇（預設 `main`，以及其他現有會話）：

- 歷史記錄： `chat.history`
- 發送： `chat.send`
- 推送更新（盡力而為）： `chat.subscribe` → `event:"chat"`

### 7) 畫布 + 相機

#### Gateway Canvas Host（建議用於網頁內容）

如果您希望節點顯示 Agent 可以在磁碟上編輯的真實 HTML/CSS/JS，請將節點指向 Gateway canvas host。

注意：節點從 Gateway HTTP 伺服器加載畫布（與 `gateway.port` 相同的連接埠，預設 `18789`）。

1. 在 gateway host 上建立 `~/.openclaw/workspace/canvas/index.html`。

2. 將節點導航至該處（LAN）：

```bash
openclaw nodes invoke --node "<Android Node>" --command canvas.navigate --params '{"url":"http://<gateway-hostname>.local:18789/__openclaw__/canvas/"}'
```

Tailnet（選用）：如果兩台裝置都在 Tailscale 上，請使用 MagicDNS 名稱或 tailnet IP 來代替 `.local`，例如 `http://<gateway-magicdns>:18789/__openclaw__/canvas/`。

此伺服器會將一個即時重新載入客戶端注入 HTML 中，並在檔案變更時重新載入。
A2UI 主機位於 `http://<gateway-host>:18789/__openclaw__/a2ui/`。

Canvas 指令（僅限前景）：

- `canvas.eval`、`canvas.snapshot`、`canvas.navigate`（使用 `{"url":""}` 或 `{"url":"/"}` 返回預設腳手架）。`canvas.snapshot` 返回 `{ format, base64 }`（預設 `format="jpeg"`）。
- A2UI：`canvas.a2ui.push`、`canvas.a2ui.reset`（`canvas.a2ui.pushJSONL` 舊版別名）

相機指令（僅限前景；受限於權限）：

- `camera.snap` (jpg)
- `camera.clip` (mp4)

請參閱 [Camera node](/zh-Hant/nodes/camera) 以了解參數和 CLI 輔助工具。

### 8) 語音 + 擴展的 Android 指令介面

- 語音：Android 在「語音」分頁中使用單一麥克風開啟/關閉流程，並包含文字記錄擷取和 TTS 播放功能（若已設定則使用 ElevenLabs，否則回退至系統 TTS）。當應用程式離開前景時，語音會停止。
- 語音喚醒/對話模式切換目前已從 Android UX/執行階段中移除。
- 額外的 Android 指令系列（可用性取決於裝置 + 權限）：
  - `device.status`, `device.info`, `device.permissions`, `device.health`
  - `notifications.list`, `notifications.actions`
  - `photos.latest`
  - `contacts.search`, `contacts.add`
  - `calendar.events`, `calendar.add`
  - `callLog.search`
  - `sms.search`
  - `motion.activity`, `motion.pedometer`

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
