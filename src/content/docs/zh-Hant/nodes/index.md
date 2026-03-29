---
summary: "節點：配對、功能、權限以及用於畫布/相機/螢幕/裝置/通知/系統的 CLI 輔助工具"
read_when:
  - Pairing iOS/Android nodes to a gateway
  - Using node canvas/camera for agent context
  - Adding new node commands or CLI helpers
title: "節點"
---

# 節點

**節點** 是一個伴隨裝置（macOS/iOS/Android/headless），它使用 `role: "node"` 連接到閘道器 **WebSocket**（與操作員相同的連接埠），並透過 `node.invoke` 暴露指令介面（例如 `canvas.*`、`camera.*`、`device.*`、`notifications.*`、`system.*`）。協定詳情：[Gateway protocol](/en/gateway/protocol)。

舊版傳輸：[Bridge protocol](/en/gateway/bridge-protocol) (TCP JSONL；對於目前節點已被棄用/移除)。

macOS 也可以在 **節點模式** 下執行：功能表列應用程式連接到閘道器的 WS 伺服器，並將其本機畫布/相機指令作為節點暴露（因此 `openclaw nodes …` 可對此 Mac 執行）。

備註：

- 節點是 **週邊裝置**，而非閘道器。它們不執行閘道器服務。
- Telegram/WhatsApp/等訊息會抵達 **閘道器**，而不是節點。
- 故障排除手冊：[/nodes/troubleshooting](/en/nodes/troubleshooting)

## 配對 + 狀態

**WS 節點使用裝置配對。** 節點在 `connect` 期間展示裝置身分；閘道器
會為 `role: node` 建立裝置配對請求。透過裝置 CLI（或 UI）批准。

快速 CLI：

```bash
openclaw devices list
openclaw devices approve <requestId>
openclaw devices reject <requestId>
openclaw nodes status
openclaw nodes describe --node <idOrNameOrIp>
```

如果節點使用變更後的驗證詳細資料（角色/範圍/公開金鑰）重試，先前的
待處理請求將被取代，並建立一個新的 `requestId`。請在批准前重新執行
`openclaw devices list`。

備註：

- `nodes status` 在節點的裝置配對角色包含 `node` 時，將其標記為 **已配對**。
- `node.pair.*` (CLI: `openclaw nodes pending/approve/reject`) 是一個單獨的閘道器擁有
  的節點配對儲存；它 **不** 閘控 WS `connect` 交握。

## 遠端節點主機 (system.run)

當您的 Gateway 在一部機器上運行，並希望指令在另一部機器上執行時，請使用 **node host**。模型仍然與 **gateway** 對話；當選擇 `host=node` 時，gateway 會將 `exec` 呼叫轉發至 **node host**。

### 什麼在哪裡運行

- **Gateway host**：接收訊息、運行模型、路由工具呼叫。
- **Node host**：在 node 機器上執行 `system.run`/`system.which`。
- **Approvals**：透過 `~/.openclaw/exec-approvals.json` 在 node host 上強制執行。

核准備註：

- 有核准支援的 node runs 會綁定確切的請求上下文。
- 對於直接的 shell/runtime 執行檔案執行，OpenClaw 也會盡最大努力綁定一個具體的本機
  檔案操作數，並且如果該檔案在執行前變更則拒絕執行。
- 如果 OpenClaw 無法為解釋器/runtime 指令識別出確切的一個具體本機檔案，
  將會拒絕有核准支援的執行，而不是假裝具有完整的 runtime 涵蓋範圍。請使用沙盒、
  獨立的主機，或是針對更廣泛的解釋器語義使用明確的可信任允許清單/完整工作流程。

### 啟動 node host (前景)

在 node 機器上：

```bash
openclaw node run --host <gateway-host> --port 18789 --display-name "Build Node"
```

### 透過 SSH 通道遠端連接 gateway (loopback 綁定)

如果 Gateway 綁定到 loopback (`gateway.bind=loopback`，本地模式下的預設值)，
遠端 node hosts 將無法直接連線。請建立 SSH 通道並將 node host
指向通道的本地端。

範例 (node host -> gateway host)：

```bash
# Terminal A (keep running): forward local 18790 -> gateway 127.0.0.1:18789
ssh -N -L 18790:127.0.0.1:18789 user@gateway-host

# Terminal B: export the gateway token and connect through the tunnel
export OPENCLAW_GATEWAY_TOKEN="<gateway-token>"
openclaw node run --host 127.0.0.1 --port 18790 --display-name "Build Node"
```

備註：

- `openclaw node run` 支援 token 或密碼驗證。
- 建議使用環境變數： `OPENCLAW_GATEWAY_TOKEN` / `OPENCLAW_GATEWAY_PASSWORD`。
- 組態備選方案是 `gateway.auth.token` / `gateway.auth.password`。
- 在本地模式下，node host 會刻意忽略 `gateway.remote.token` / `gateway.remote.password`。
- 在遠端模式下，根據遠端優先順序規則，`gateway.remote.token` / `gateway.remote.password` 是有效的。
- 如果設定了有效的本地 `gateway.auth.*` SecretRefs 但未解析，node-host 驗證將會失敗並關閉。
- Node-host 驗證解析僅遵守 `OPENCLAW_GATEWAY_*` 環境變數。

### 啟動 node host (服務)

```bash
openclaw node install --host <gateway-host> --port 18789 --display-name "Build Node"
openclaw node restart
```

### 配對 + 命名

在 gateway host 上：

```bash
openclaw devices list
openclaw devices approve <requestId>
openclaw nodes status
```

如果節點使用變更的驗證詳細資訊重試，請重新執行 `openclaw devices list` 並核准目前的 `requestId`。

命名選項：

- `--display-name` 在 `openclaw node run` / `openclaw node install` 上（持續儲存在節點的 `~/.openclaw/node.json` 中）。
- `openclaw nodes rename --node <id|name|ip> --name "Build Node"`（閘道覆寫）。

### 將指令加入允許清單

執行核准是**針對每個節點主機**的。請從閘道新增允許清單項目：

```bash
openclaw approvals allowlist add --node <id|name|ip> "/usr/bin/uname"
openclaw approvals allowlist add --node <id|name|ip> "/usr/bin/sw_vers"
```

核准資訊儲存在節點主機的 `~/.openclaw/exec-approvals.json` 中。

### 將執行指向節點

設定預設值（閘道設定）：

```bash
openclaw config set tools.exec.host node
openclaw config set tools.exec.security allowlist
openclaw config set tools.exec.node "<id-or-name>"
```

或每個階段：

```
/exec host=node security=allowlist node=<id-or-name>
```

設定後，任何具有 `host=node` 的 `exec` 呼叫都會在節點主機上執行（受節點允許清單/核准約束）。

相關連結：

- [Node host CLI](/en/cli/node)
- [Exec tool](/en/tools/exec)
- [Exec approvals](/en/tools/exec-approvals)

## 呼叫指令

低階（原始 RPC）：

```bash
openclaw nodes invoke --node <idOrNameOrIp> --command canvas.eval --params '{"javaScript":"location.href"}'
```

針對常見的「提供代理程式 MEDIA 附件」工作流程，存在高階輔助程式。

## 螢幕截圖（畫布快照）

如果節點正在顯示畫布（WebView），`canvas.snapshot` 會傳回 `{ format, base64 }`。

CLI 輔助程式（寫入暫存檔案並列印 `MEDIA:<path>`）：

```bash
openclaw nodes canvas snapshot --node <idOrNameOrIp> --format png
openclaw nodes canvas snapshot --node <idOrNameOrIp> --format jpg --max-width 1200 --quality 0.9
```

### 畫布控制

```bash
openclaw nodes canvas present --node <idOrNameOrIp> --target https://example.com
openclaw nodes canvas hide --node <idOrNameOrIp>
openclaw nodes canvas navigate https://example.com --node <idOrNameOrIp>
openclaw nodes canvas eval --node <idOrNameOrIp> --js "document.title"
```

備註：

- `canvas present` 接受 URL 或本地檔案路徑（`--target`），以及用於定位的選用 `--x/--y/--width/--height`。
- `canvas eval` 接受內聯 JS（`--js`）或位置引數。

### A2UI (畫布)

```bash
openclaw nodes canvas a2ui push --node <idOrNameOrIp> --text "Hello"
openclaw nodes canvas a2ui push --node <idOrNameOrIp> --jsonl ./payload.jsonl
openclaw nodes canvas a2ui reset --node <idOrNameOrIp>
```

備註：

- 僅支援 A2UI v0.8 JSONL（拒絕 v0.9/createSurface）。

## 照片 + 影片（節點相機）

照片（`jpg`）：

```bash
openclaw nodes camera list --node <idOrNameOrIp>
openclaw nodes camera snap --node <idOrNameOrIp>            # default: both facings (2 MEDIA lines)
openclaw nodes camera snap --node <idOrNameOrIp> --facing front
```

影片片段（`mp4`）：

```bash
openclaw nodes camera clip --node <idOrNameOrIp> --duration 10s
openclaw nodes camera clip --node <idOrNameOrIp> --duration 3000 --no-audio
```

備註：

- 節點必須處於**前景**才能使用 `canvas.*` 和 `camera.*`（背景呼叫會傳回 `NODE_BACKGROUND_UNAVAILABLE`）。
- 片段持續時間會被限制（目前為 `<= 60s`），以避免 base64 載荷過大。
- Android 會在可能的情況下提示授予 `CAMERA`/`RECORD_AUDIO` 權限；被拒絕的權限會導致 `*_PERMISSION_REQUIRED` 失敗。

## 螢幕錄製（節點）

支援的節點會公開 `screen.record` (mp4)。範例：

```bash
openclaw nodes screen record --node <idOrNameOrIp> --duration 10s --fps 10
openclaw nodes screen record --node <idOrNameOrIp> --duration 10s --fps 10 --no-audio
```

備註：

- `screen.record` 的可用性取決於節點平台。
- 螢幕錄製被限制為 `<= 60s`。
- `--no-audio` 會在支援的平台上停用麥克風捕捉。
- 當有多個螢幕可用時，使用 `--screen <index>` 來選擇顯示器。

## 位置（節點）

當在設定中啟用位置時，節點會公開 `location.get`。

CLI 輔助工具：

```bash
openclaw nodes location get --node <idOrNameOrIp>
openclaw nodes location get --node <idOrNameOrIp> --accuracy precise --max-age 15000 --location-timeout 10000
```

備註：

- 位置**預設為關閉**。
- 「始終」需要系統權限；背景擷取則為盡力而為。
- 回應包括經緯度、精確度（公尺）和時間戳記。

## SMS（Android 節點）

當使用者授予 **SMS** 權限且裝置支援電話功能時，Android 節點可以公開 `sms.send`。

低層級調用：

```bash
openclaw nodes invoke --node <idOrNameOrIp> --command sms.send --params '{"to":"+15555550123","message":"Hello from OpenClaw"}'
```

備註：

- 在通告此功能之前，必須在 Android 裝置上接受權限提示。
- 不具電話功能的僅 Wi-Fi 裝置將不會通告 `sms.send`。

## Android 裝置 + 個人資料指令

當啟用對應功能時，Android 節點可以通告額外的指令系列。

可用的系列：

- `device.status`, `device.info`, `device.permissions`, `device.health`
- `notifications.list`, `notifications.actions`
- `photos.latest`
- `contacts.search`, `contacts.add`
- `calendar.events`, `calendar.add`
- `callLog.search`
- `sms.search`
- `motion.activity`, `motion.pedometer`

範例調用：

```bash
openclaw nodes invoke --node <idOrNameOrIp> --command device.status --params '{}'
openclaw nodes invoke --node <idOrNameOrIp> --command notifications.list --params '{}'
openclaw nodes invoke --node <idOrNameOrIp> --command photos.latest --params '{"limit":1}'
```

備註：

- 動作指令取決於可用感應器進行功能控制。

## 系統指令（節點主機 / mac 節點）

macOS 節點公開 `system.run`、`system.notify` 和 `system.execApprovals.get/set`。
無介面節點主機公開 `system.run`、`system.which` 和 `system.execApprovals.get/set`。

範例：

```bash
openclaw nodes run --node <idOrNameOrIp> -- echo "Hello from mac node"
openclaw nodes notify --node <idOrNameOrIp> --title "Ping" --body "Gateway ready"
```

備註：

- `system.run` 會在承載中傳回 stdout/stderr/exit code。
- `system.notify` 會遵守 macOS 應用程式上的通知權限狀態。
- 無法辨識的節點 `platform` / `deviceFamily` 中繼資料會使用保守的預設允許清單，排除 `system.run` 和 `system.which`。如果您刻意需要在未知平台上使用這些指令，請透過 `gateway.nodes.allowCommands` 明確新增它們。
- `system.run` 支援 `--cwd`、`--env KEY=VAL`、`--command-timeout` 和 `--needs-screen-recording`。
- 對於 Shell 包裝器 (`bash|sh|zsh ... -c/-lc`)，請求範圍的 `--env` 值會縮減為明確的允許清單 (`TERM`、`LANG`、`LC_*`、`COLORTERM`、`NO_COLOR`、`FORCE_COLOR`)。
- 對於允許清單模式下的「始終允許」決策，已知的分派包裝器 (`env`、`nice`、`nohup`、`stdbuf`、`timeout`) 會保存內部可執行檔路徑，而非包裝器路徑。如果解開包裝不安全，則不會自動保存允許清單項目。
- 在處於允許清單模式的 Windows 節點主機上，透過 `cmd.exe /c` 執行 Shell 包裝器需要核准 (僅憑允許清單項目不會自動允許包裝器形式)。
- `system.notify` 支援 `--priority <passive|active|timeSensitive>` 和 `--delivery <system|overlay|auto>`。
- Node hosts 會忽略 `PATH` 覆寫，並移除危險的啟動/Shell 金鑰（`DYLD_*`、`LD_*`、`NODE_OPTIONS`、`PYTHON*`、`PERL*`、`RUBYOPT`、`SHELLOPTS`、`PS4`）。如果您需要額外的 PATH 項目，請設定 node host 服務環境（或將工具安裝在標準位置），而不是透過 `--env` 傳遞 `PATH`。
- 在 macOS node 模式下，`system.run` 受 macOS 應用程式中的執行核准（Settings → Exec approvals）限制。
  Ask/allowlist/full 的行為與 headless node host 相同；被拒絕的提示會傳回 `SYSTEM_RUN_DENIED`。
- 在 headless node host 上，`system.run` 受執行核准（`~/.openclaw/exec-approvals.json`）限制。

## Exec node 綁定

當有多個 node 可用時，您可以將 exec 綁定到特定的 node。
這會設定 `exec host=node` 的預設 node（並可針對每個 agent 覆寫）。

全域預設：

```bash
openclaw config set tools.exec.node "node-id-or-name"
```

個別 agent 覆寫：

```bash
openclaw config get agents.list
openclaw config set agents.list[0].tools.exec.node "node-id-or-name"
```

取消設定以允許任何 node：

```bash
openclaw config unset tools.exec.node
openclaw config unset agents.list[0].tools.exec.node
```

## 權限對映

Node 可以在 `node.list` / `node.describe` 中包含 `permissions` 對映，以權限名稱為鍵（例如 `screenRecording`、`accessibility`），值為布林值（`true` = 已授予）。

## Headless node host（跨平台）

OpenClaw 可以執行 **headless node host**（無 UI），連接到 Gateway
WebSocket 並公開 `system.run` / `system.which`。這在 Linux/Windows 上
或與伺服器並行執行最小化 node 時非常有用。

啟動它：

```bash
openclaw node run --host <gateway-host> --port 18789
```

注意：

- 仍然需要配對（Gateway 會顯示裝置配對提示）。
- Node host 會將其 node ID、token、顯示名稱和 gateway 連線資訊儲存在 `~/.openclaw/node.json` 中。
- 執行核准會透過 `~/.openclaw/exec-approvals.json` 在本地強制執行
  （請參閱 [Exec approvals](/en/tools/exec-approvals)）。
- 在 macOS 上，無介面節點主機預設會在本機執行 `system.run`。設定
  `OPENCLAW_NODE_EXEC_HOST=app` 以透過伴隨應用程式 exec 主機路由 `system.run`；加入
  `OPENCLAW_NODE_EXEC_FALLBACK=0` 以要求應用程式主機，若其不可用則封閉失敗。
- 當 Gateway WS 使用 TLS 時，新增 `--tls` / `--tls-fingerprint`。

## Mac 節點模式

- macOS 選單列應用程式以節點身分連接到 Gateway WS 伺服器（因此 `openclaw nodes …` 可對此 Mac 運作）。
- 在遠端模式下，應用程式會為 Gateway 連接埠開啟 SSH 通道並連接到 `localhost`。
