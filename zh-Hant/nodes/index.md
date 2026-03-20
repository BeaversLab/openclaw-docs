---
summary: "節點：配對、功能、權限，以及用於 canvas/camera/screen/device/notifications/system 的 CLI 輔助工具"
read_when:
  - 將 iOS/Android 節點與閘道配對
  - 使用節點 canvas/camera 作為 Agent 語境
  - 新增新的節點指令或 CLI 輔助工具
title: "Nodes"
---

# Nodes

**節點** 是一個連線到 Gateway **WebSocket**（與操作員相同連接埠）的伴隨裝置（macOS/iOS/Android/headless），使用 `role: "node"` 並透過 `node.invoke` 公開指令介面（例如 `canvas.*`、`camera.*`、`device.*`、`notifications.*`、`system.*`）。協定細節：[Gateway protocol](/zh-Hant/gateway/protocol)。

舊版傳輸：[Bridge protocol](/zh-Hant/gateway/bridge-protocol) (TCP JSONL；目前節點已棄用/移除)。

macOS 也可以在 **節點模式** 下執行：選單列應用程式連接到 Gateway 的 WS 伺服器，並將其本機 canvas/camera 指令作為節點公開（因此 `openclaw nodes …` 可對此 Mac 執行）。

備註：

- 節點是 **周邊設備**，不是閘道。它們不執行閘道服務。
- Telegram/WhatsApp/等訊息會抵達 **閘道**，而不是節點。
- 故障排除手冊：[/nodes/troubleshooting](/zh-Hant/nodes/troubleshooting)

## 配對 + 狀態

**WS 節點使用裝置配對。** 節點在 `connect` 期間呈現裝置身分；Gateway 為 `role: node` 建立裝置配對請求。透過裝置 CLI（或 UI）批准。

快速 CLI：

```bash
openclaw devices list
openclaw devices approve <requestId>
openclaw devices reject <requestId>
openclaw nodes status
openclaw nodes describe --node <idOrNameOrIp>
```

備註：

- 當其裝置配對角色包含 `node` 時，`nodes status` 將節點標記為 **已配對**。
- `node.pair.*` (CLI: `openclaw nodes pending/approve/reject`) 是一個獨立的閘道擁有的
  節點配對儲存空間；它**不**會阻擋 WS `connect` 交握。

## 遠端節點主機

當您的 Gateway 在一部機器上執行，而您希望指令在另一部機器上執行時，請使用 **節點主機**。模型仍然與 **閘道** 對話；當選取 `host=node` 時，閘道會將 `exec` 呼叫轉發到 **節點主機**。

### 什麼在哪裡執行

- **Gateway host**：接收訊息、執行模型、路由工具呼叫。
- **Node host**：在節點機器上執行 `system.run`/`system.which`。
- **Approvals**：透過 `~/.openclaw/exec-approvals.json` 在節點主機上強制執行。

Approval note：

- Approval-backed node runs 會綁定確切的請求上下文。
- 對於直接的 shell/runtime 檔案執行，OpenClaw 也會盡力綁定一個具體的本機檔案操作數，並且如果該檔案在執行前發生變更，則拒絕執行。
- 如果 OpenClaw 無法為直譯器/runtime 指令識別出確切的一個具體本機檔案，將拒絕 approval-backed 執行，而不是假設擁有完整的 runtime 涵蓋範圍。若需要更廣泛的直譯器語意，請使用沙盒、獨立的主機，或明確的信任允許清單/完整工作流程。

### 啟動節點主機（前景）

在節點機器上：

```bash
openclaw node run --host <gateway-host> --port 18789 --display-name "Build Node"
```

### 透過 SSH 隧道的遠端 Gateway（loopback bind）

如果 Gateway 綁定到 loopback (`gateway.bind=loopback`，本地模式下的預設值)，遠端節點主機將無法直接連線。請建立 SSH 隧道，並將節點主機指向隧道的本地端。

範例（node host -> gateway host）：

```bash
# Terminal A (keep running): forward local 18790 -> gateway 127.0.0.1:18789
ssh -N -L 18790:127.0.0.1:18789 user@gateway-host

# Terminal B: export the gateway token and connect through the tunnel
export OPENCLAW_GATEWAY_TOKEN="<gateway-token>"
openclaw node run --host 127.0.0.1 --port 18790 --display-name "Build Node"
```

備註：

- `openclaw node run` 支援 token 或密碼驗證。
- 建議使用環境變數：`OPENCLAW_GATEWAY_TOKEN` / `OPENCLAW_GATEWAY_PASSWORD`。
- 組態備選方案為 `gateway.auth.token` / `gateway.auth.password`。
- 在本地模式下，節點主機會刻意忽略 `gateway.remote.token` / `gateway.remote.password`。
- 在遠端模式下，根據遠端優先順序規則，`gateway.remote.token` / `gateway.remote.password` 是有效的。
- 如果設定了使用中的本機 `gateway.auth.*` SecretRefs 但尚未解析，節點主機驗證將會失敗並關閉連線。
- 節點主機驗證解析會刻意忽略舊版 `CLAWDBOT_GATEWAY_*` 環境變數。

### 啟動節點主機（服務）

```bash
openclaw node install --host <gateway-host> --port 18789 --display-name "Build Node"
openclaw node restart
```

### 配對 + 命名

在 Gateway 主機上：

```bash
openclaw devices list
openclaw devices approve <requestId>
openclaw nodes status
```

命名選項：

- `--display-name` 於 `openclaw node run` / `openclaw node install`（持續存在於節點上的 `~/.openclaw/node.json` 中）。
- `openclaw nodes rename --node <id|name|ip> --name "Build Node"` (gateway override)。

### Allowlist 指令

Exec 核准是 **針對每個節點主機** 的。請從 Gateway 新增允許清單項目：

```bash
openclaw approvals allowlist add --node <id|name|ip> "/usr/bin/uname"
openclaw approvals allowlist add --node <id|name|ip> "/usr/bin/sw_vers"
```

核准設定儲存在節點主機的 `~/.openclaw/exec-approvals.json` 中。

### 將 exec 指向節點

設定預設值（gateway 配置）：

```bash
openclaw config set tools.exec.host node
openclaw config set tools.exec.security allowlist
openclaw config set tools.exec.node "<id-or-name>"
```

或是每次連線：

```
/exec host=node security=allowlist node=<id-or-name>
```

設定後，任何帶有 `host=node` 的 `exec` 呼叫都會在節點主機上執行（受限於節點允許清單/核准）。

相關連結：

- [節點主機 CLI](/zh-Hant/cli/node)
- [Exec 工具](/zh-Hant/tools/exec)
- [Exec 核准](/zh-Hant/tools/exec-approvals)

## 呼叫指令

低階（原始 RPC）：

```bash
openclaw nodes invoke --node <idOrNameOrIp> --command canvas.eval --params '{"javaScript":"location.href"}'
```

針對常見的「提供代理程式媒體附件」工作流程，存在高階的輔助工具。

## 螢幕截圖（Canvas 快照）

如果節點正在顯示 Canvas (WebView)，`canvas.snapshot` 會回傳 `{ format, base64 }`。

CLI 輔助工具（寫入暫存檔案並列印 `MEDIA:<path>`）：

```bash
openclaw nodes canvas snapshot --node <idOrNameOrIp> --format png
openclaw nodes canvas snapshot --node <idOrNameOrIp> --format jpg --max-width 1200 --quality 0.9
```

### Canvas 控制項

```bash
openclaw nodes canvas present --node <idOrNameOrIp> --target https://example.com
openclaw nodes canvas hide --node <idOrNameOrIp>
openclaw nodes canvas navigate https://example.com --node <idOrNameOrIp>
openclaw nodes canvas eval --node <idOrNameOrIp> --js "document.title"
```

備註：

- `canvas present` 接受 URL 或本機檔案路徑 (`--target`)，以及用於定位的可選 `--x/--y/--width/--height`。
- `canvas eval` 接受內嵌 JS (`--js`) 或位置引數。

### A2UI (Canvas)

```bash
openclaw nodes canvas a2ui push --node <idOrNameOrIp> --text "Hello"
openclaw nodes canvas a2ui push --node <idOrNameOrIp> --jsonl ./payload.jsonl
openclaw nodes canvas a2ui reset --node <idOrNameOrIp>
```

備註：

- 僅支援 A2UI v0.8 JSONL（v0.9/createSurface 會被拒絕）。

## 照片 + 影片（節點相機）

照片 (`jpg`)：

```bash
openclaw nodes camera list --node <idOrNameOrIp>
openclaw nodes camera snap --node <idOrNameOrIp>            # default: both facings (2 MEDIA lines)
openclaw nodes camera snap --node <idOrNameOrIp> --facing front
```

影片片段 (`mp4`)：

```bash
openclaw nodes camera clip --node <idOrNameOrIp> --duration 10s
openclaw nodes camera clip --node <idOrNameOrIp> --duration 3000 --no-audio
```

備註：

- 節點必須處於**前景**狀態才能使用 `canvas.*` 和 `camera.*`（背景呼叫會回傳 `NODE_BACKGROUND_UNAVAILABLE`）。
- 片段持續時間會受限（目前為 `<= 60s`）以避免過大的 base64 載荷。
- Android 盡可能會提示授予 `CAMERA`/`RECORD_AUDIO` 權限；拒絕權限會導致 `*_PERMISSION_REQUIRED` 失敗。

## 螢幕錄製（節點）

支援的節點會公開 `screen.record` (mp4)。範例：

```bash
openclaw nodes screen record --node <idOrNameOrIp> --duration 10s --fps 10
openclaw nodes screen record --node <idOrNameOrIp> --duration 10s --fps 10 --no-audio
```

備註：

- `screen.record` 的可用性取決於節點平台。
- 螢幕錄製會被限制在 `<= 60s` 以內。
- 在支援的平台上，`--no-audio` 會停用麥克風擷取功能。
- 當有多個螢幕可用時，使用 `--screen <index>` 來選擇顯示器。

## 位置 (節點)

當在設定中啟用位置時，節點會公開 `location.get`。

CLI 輔助工具：

```bash
openclaw nodes location get --node <idOrNameOrIp>
openclaw nodes location get --node <idOrNameOrIp> --accuracy precise --max-age 15000 --location-timeout 10000
```

備註：

- 位置預設為**關閉**。
- 「始終」需要系統權限；背景擷取為盡力而為。
- 回應包含經緯度、準確度 (公尺) 和時間戳記。

## SMS (Android 節點)

當使用者授予 **SMS** 權限且裝置支援電話功能時，Android 節點可以公開 `sms.send`。

低層級調用：

```bash
openclaw nodes invoke --node <idOrNameOrIp> --command sms.send --params '{"to":"+15555550123","message":"Hello from OpenClaw"}'
```

備註：

- 權限提示必須在 Android 裝置上接受，才會廣告此功能。
- 不具備電話功能的僅 Wi-Fi 裝置將不會廣告 `sms.send`。

## Android 裝置 + 個人資料指令

啟用相應功能時，Android 節點可以廣告額外的指令系列。

可用系列：

- `device.status`、`device.info`、`device.permissions`、`device.health`
- `notifications.list`、`notifications.actions`
- `photos.latest`
- `contacts.search`、`contacts.add`
- `calendar.events`、`calendar.add`
- `callLog.search`
- `motion.activity`、`motion.pedometer`

範例調用：

```bash
openclaw nodes invoke --node <idOrNameOrIp> --command device.status --params '{}'
openclaw nodes invoke --node <idOrNameOrIp> --command notifications.list --params '{}'
openclaw nodes invoke --node <idOrNameOrIp> --command photos.latest --params '{"limit":1}'
```

備註：

- 動作指令取決於可用感應器。

## 系統指令 (節點主機 / mac 節點)

macOS 節點公開 `system.run`、`system.notify` 和 `system.execApprovals.get/set`。
無頭節點主機公開 `system.run`、`system.which` 和 `system.execApprovals.get/set`。

範例：

```bash
openclaw nodes run --node <idOrNameOrIp> -- echo "Hello from mac node"
openclaw nodes notify --node <idOrNameOrIp> --title "Ping" --body "Gateway ready"
```

備註：

- `system.run` 在載荷中返回 stdout/stderr/exit code。
- `system.notify` 遵守 macOS 應用程式上的通知權限狀態。
- 無法辨識的節點 `platform` / `deviceFamily` 中繼資料使用保守的預設允許清單，其中排除 `system.run` 和 `system.which`。如果您在未知平台上刻意需要這些指令，請透過 `gateway.nodes.allowCommands` 明確加入它們。
- `system.run` 支援 `--cwd`、`--env KEY=VAL`、`--command-timeout` 和 `--needs-screen-recording`。
- 對於 Shell 包裝程式 (`bash|sh|zsh ... -c/-lc`)，請求範圍的 `--env` 值會減少為明確的允許清單 (`TERM`、`LANG`、`LC_*`、`COLORTERM`、`NO_COLOR`、`FORCE_COLOR`)。
- 在允許清單模式下，針對「一律允許」的決策，已知的分派包裝程式 (`env`、`nice`、`nohup`、`stdbuf`、`timeout`) 會保留內部可執行檔路徑，而非包裝程式路徑。如果解開包裝不安全，則不會自動保留任何允許清單項目。
- 在允許清單模式下的 Windows 節點主機上，透過 `cmd.exe /c` 執行的 Shell 包裝程式需要核准 (僅憑允許清單項目並不會自動允許包裝程式形式)。
- `system.notify` 支援 `--priority <passive|active|timeSensitive>` 和 `--delivery <system|overlay|auto>`。
- 節點主機會忽略 `PATH` 覆蓋，並移除危險的啟動/Shell 金鑰 (`DYLD_*`、`LD_*`、`NODE_OPTIONS`、`PYTHON*`、`PERL*`、`RUBYOPT`、`SHELLOPTS`、`PS4`)。如果您需要額外的 PATH 項目，請設定節點主機服務環境 (或將工具安裝在標準位置)，而不要透過 `--env` 傳遞 `PATH`。
- 在 macOS 節點模式下，`system.run` 受 macOS 應用程式中的 exec 核准限制（設定 → Exec 核准）。
  詢問/允許清單/完全的行為與無頭節點主機相同；被拒絕的提示會傳回 `SYSTEM_RUN_DENIED`。
- 在無頭節點主機上，`system.run` 受 exec 核准限制（`~/.openclaw/exec-approvals.json`）。

## Exec 節點綁定

當有多個節點可用時，您可以將 exec 綁定到特定節點。
這會設定 `exec host=node` 的預設節點（並可針對每個代理程式覆寫）。

全域預設：

```bash
openclaw config set tools.exec.node "node-id-or-name"
```

個別代理程式覆寫：

```bash
openclaw config get agents.list
openclaw config set agents.list[0].tools.exec.node "node-id-or-name"
```

取消設定以允許任何節點：

```bash
openclaw config unset tools.exec.node
openclaw config unset agents.list[0].tools.exec.node
```

## 權限映射

節點可以在 `node.list` / `node.describe` 中包含 `permissions` 映射，以權限名稱為鍵（例如 `screenRecording`、`accessibility`），並具有布林值（`true` = 已授權）。

## 無頭節點主機（跨平台）

OpenClaw 可以執行 **無頭節點主機**（無 UI），連接到閘道
WebSocket 並公開 `system.run` / `system.which`。這對於 Linux/Windows
或與伺服器並行執行最小節點很有用。

啟動它：

```bash
openclaw node run --host <gateway-host> --port 18789
```

備註：

- 仍然需要配對（閘道將顯示裝置配對提示）。
- 節點主機會將其節點 ID、權杖、顯示名稱和閘道連線資訊儲存在 `~/.openclaw/node.json` 中。
- Exec 核準是透過 `~/.openclaw/exec-approvals.json` 在本機強制執行的
  （請參閱 [Exec 核准](/zh-Hant/tools/exec-approvals)）。
- 在 macOS 上，無頭節點主機預設會在本機執行 `system.run`。設定
  `OPENCLAW_NODE_EXEC_HOST=app` 以透過伴隨應用程式 exec 主機路由 `system.run`；新增
  `OPENCLAW_NODE_EXEC_FALLBACK=0` 以要求應用程式主機，且如果無法使用則失敗封閉。
- 當閘道 WS 使用 TLS 時，新增 `--tls` / `--tls-fingerprint`。

## Mac 節點模式

- macOS 功能表列應用程式作為節點連接到閘道 WS 伺服器（因此 `openclaw nodes …` 可針對此 Mac 執行）。
- 在遠端模式下，應用程式會為閘道連接埠開啟 SSH 通道，並連接到 `localhost`。

import en from "/components/footer/en.mdx";

<en />
