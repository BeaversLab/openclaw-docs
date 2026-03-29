---
summary: "Android app (node): connection runbook + Connect/Chat/Voice/Canvas command surface"
read_when:
  - Pairing or reconnecting the Android node
  - Debugging Android gateway discovery or auth
  - Verifying chat history parity across clients
title: "Android 應用程式"
---

# Android 應用程式 (節點)

> **注意：** Android 應用程式尚未公開發布。原始碼可在 [OpenClaw repository](https://github.com/openclaw/openclaw) 中取得，授權為 `apps/android`。您可以使用 Java 17 和 Android SDK (`./gradlew :app:assemblePlayDebug`) 自行建置。請參閱 [apps/android/README.md](https://github.com/openclaw/openclaw/blob/main/apps/android/README.md) 了解建置說明。

## 支援概要

- 角色：伴隨節點應用程式 (Android 不代管 Gateway)。
- 需要 Gateway：是 (在 macOS、Linux 或透過 WSL2 在 Windows 上執行)。
- 安裝：[快速入門](/en/start/getting-started) + [配對](/en/channels/pairing)。
- Gateway：[操作手冊](/en/gateway) + [設定](/en/gateway/configuration)。
  - 通訊協定：[Gateway 通訊協定](/en/gateway/protocol) (節點 + 控制平面)。

## 系統控制

系統控制 (launchd/systemd) 位於 Gateway 主機上。請參閱 [Gateway](/en/gateway)。

## 連線操作手冊

Android 節點應用程式 ⇄ (mDNS/NSD + WebSocket) ⇄ **Gateway**

Android 直接連線至 Gateway WebSocket (預設 `ws://<host>:18789`) 並使用裝置配對 (`role: node`)。

### 先決條件

- 您可以在「主」機上執行 Gateway。
- Android 裝置/模擬器可以連上 gateway WebSocket：
  - 使用 mDNS/NSD 的相同區域網路，**或**
  - 使用 Wide-Area Bonjour / unicast DNS-SD 的相同 Tailscale tailnet (見下文)，**或**
  - 手動指定 gateway 主機/連接埠 (備用方案)
- 您可以在 gateway 機器上 (或透過 SSH) 執行 CLI (`openclaw`)。

### 1) 啟動 Gateway

```bash
openclaw gateway --port 18789 --verbose
```

在日誌中確認您看到類似以下的內容：

- `listening on ws://0.0.0.0:18789`

對於僅 tailnet 的設定 (建議用於 Vienna ⇄ London)，將 gateway 繫結至 tailnet IP：

- 在 gateway 主機的 `~/.openclaw/openclaw.json` 中設定 `gateway.bind: "tailnet"`。
- 重新啟動 Gateway / macOS 選單列應用程式。

### 2) 驗證探索 (可選)

從 gateway 機器：

```bash
dns-sd -B _openclaw-gw._tcp local.
```

更多除錯說明：[Bonjour](/en/gateway/bonjour)。

#### 透過單播 DNS-SD 進行 Tailnet (Vienna ⇄ London) 探索

Android NSD/mDNS 探索無法跨越網路。如果您的 Android 節點與閘道位於不同網路但透過 Tailscale 連線，請改用 Wide-Area Bonjour / 單播 DNS-SD：

1. 在閘道主機上設定 DNS-SD 區域（例如 `openclaw.internal.`）並發佈 `_openclaw-gw._tcp` 紀錄。
2. 為指向該 DNS 伺服器的所選網域設定 Tailscale 分割 DNS。

詳細資訊與 CoreDNS 設定範例：[Bonjour](/en/gateway/bonjour)。

### 3) 從 Android 連線

在 Android 應用程式中：

- 應用程式透過**前景服務**（持續通知）保持閘道連線。
- 開啟 **Connect** 分頁。
- 使用 **Setup Code** 或 **Manual** 模式。
- 如果探索被封鎖，請在 **Advanced controls** 中使用手動主機/連接埠（以及所需的 TLS/權杖/密碼）。

首次成功配對後，Android 會在啟動時自動重新連線：

- 手動端點（如果已啟用），否則
- 上次探索到的閘道（盡力而為）。

### 4) 核准配對 (CLI)

在閘道機器上：

```bash
openclaw devices list
openclaw devices approve <requestId>
openclaw devices reject <requestId>
```

配對詳細資訊：[Pairing](/en/channels/pairing)。

### 5) 驗證節點已連線

- 透過節點狀態：

  ```bash
  openclaw nodes status
  ```

- 透過閘道：

  ```bash
  openclaw gateway call node.list --params "{}"
  ```

### 6) 聊天 + 歷史紀錄

Android Chat 分頁支援階段選擇（預設 `main`，以及其他現有階段）：

- 歷史紀錄：`chat.history`
- 傳送：`chat.send`
- 推送更新（盡力而為）：`chat.subscribe` → `event:"chat"`

### 7) 畫布 + 相機

#### Gateway Canvas Host（建議用於網頁內容）

如果您希望節點顯示代理可在磁碟上編輯的實際 HTML/CSS/JS，請將節點指向 Gateway canvas host。

注意：節點從 Gateway HTTP 伺服器載入畫布（與 `gateway.port` 相同的連接埠，預設 `18789`）。

1. 在閘道主機上建立 `~/.openclaw/workspace/canvas/index.html`。

2. 將節點瀏覽至該處 (LAN)：

```bash
openclaw nodes invoke --node "<Android Node>" --command canvas.navigate --params '{"url":"http://<gateway-hostname>.local:18789/__openclaw__/canvas/"}'
```

Tailnet（選用）：如果兩台裝置都在 Tailscale 上，請使用 MagicDNS 名稱或 tailnet IP 代替 `.local`，例如 `http://<gateway-magicdns>:18789/__openclaw__/canvas/`。

此伺服器會將即時重載客戶端注入 HTML，並在檔案變更時重新載入。
A2UI host 位於 `http://<gateway-host>:18789/__openclaw__/a2ui/`。

Canvas 指令（僅限前景）：

- `canvas.eval`、`canvas.snapshot`、`canvas.navigate`（使用 `{"url":""}` 或 `{"url":"/"}` 返回預設支架）。`canvas.snapshot` 返回 `{ format, base64 }`（預設 `format="jpeg"`）。
- A2UI：`canvas.a2ui.push`、`canvas.a2ui.reset`（`canvas.a2ui.pushJSONL` 舊版別名）

相機指令（僅限前景；需權限）：

- `camera.snap` (jpg)
- `camera.clip` (mp4)

參閱 [Camera node](/en/nodes/camera) 以了解參數和 CLI 輔助工具。

### 8) 語音 + 擴展的 Android 指令介面

- 語音：Android 在語音標籤頁中使用單一麥克風開啟/關閉流程，具備文字記錄捕獲和 TTS 播放功能（設定時使用 ElevenLabs，備用系統 TTS）。當應用程式離開前景時，語音會停止。
- 語音喚醒/對話模式切換目前已從 Android UX/執行階段中移除。
- 額外的 Android 指令系列（可用性取決於裝置 + 權限）：
  - `device.status`、`device.info`、`device.permissions`、`device.health`
  - `notifications.list`、`notifications.actions`
  - `photos.latest`
  - `contacts.search`、`contacts.add`
  - `calendar.events`、`calendar.add`
  - `callLog.search`
  - `sms.search`
  - `motion.activity`、`motion.pedometer`
