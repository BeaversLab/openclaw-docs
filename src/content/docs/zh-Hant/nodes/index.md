---
summary: "節點：配對、功能、權限以及用於畫布/相機/螢幕/裝置/通知/系統的 CLI 輔助工具"
read_when:
  - Pairing iOS/Android nodes to a gateway
  - Using node canvas/camera for agent context
  - Adding new node commands or CLI helpers
title: "節點"
---

**節點** 是一個伴隨裝置（macOS/iOS/Android/headless），使用 `role: "node"` 連接到閘道器 **WebSocket**（與操作員連接埠相同），並透過 `node.invoke` 公開指令介面（例如 `canvas.*`、`camera.*`、`device.*`、`notifications.*`、`system.*`）。協議詳情：[Gateway protocol](/zh-Hant/gateway/protocol)。

舊版傳輸：[Bridge protocol](/zh-Hant/gateway/bridge-protocol) (TCP JSONL；
僅供當前節點歷史參考)。

macOS 也可以在 **節點模式** 下執行：選單列應用程式連接到閘道器的
WS 伺服器，並將其本機畫布/相機指令作為節點公開（因此
`openclaw nodes …` 可在此 Mac 上執行）。在遠端閘道器模式下，瀏覽器
自動化是由 CLI 節點主機（`openclaw node run` 或
已安裝的節點服務）處理，而不是由原生應用程式節點處理。

注意：

- 節點是 **周邊設備**，不是閘道器。它們不執行閘道器服務。
- Telegram/WhatsApp/等訊息會落在 **閘道器** 上，而不是節點上。
- 故障排除手冊：[/nodes/troubleshooting](/zh-Hant/nodes/troubleshooting)

## 配對 + 狀態

**WS 節點使用裝置配對。** 節點在 `connect` 期間出示裝置身分識別；閘道器
會為 `role: node` 建立裝置配對請求。透過裝置 CLI（或 UI）批准。

快速 CLI：

```bash
openclaw devices list
openclaw devices approve <requestId>
openclaw devices reject <requestId>
openclaw nodes status
openclaw nodes describe --node <idOrNameOrIp>
```

如果節點使用變更後的驗證詳細資料（角色/範圍/公開金鑰）重試，則先前的
待處理請求將被取代，並建立一個新的 `requestId`。請在批准前
重新執行 `openclaw devices list`。

注意：

- 當節點的裝置配對角色包含 `node` 時，`nodes status` 會將節點標記為 **已配對**。
- 裝置配對記錄是持久化的已批准角色契約。Token 輪換
  保持在該契約範圍內；它無法將已配對的節點升級為
  配對批准從未授予的不同角色。
- `node.pair.*` (CLI: `openclaw nodes pending/approve/reject/remove/rename`) 是一個獨立的閘道器擁有的
  節點配對存儲；它**不**會阻擋 WS `connect` 交握。
- `openclaw nodes remove --node <id|name|ip>` 會從該獨立的閘道擁有的節點配對儲存空間中刪除過時的條目。
- 批准範圍遵循待處理請求中聲明的命令：
  - 無指令請求：`operator.pairing`
  - 非執行節點指令：`operator.pairing` + `operator.write`
  - `system.run` / `system.run.prepare` / `system.which`：`operator.pairing` + `operator.admin`

## 遠端節點主機 (system.run)

當您的閘道在一台機器上運行，並且您希望指令在另一台機器上執行時，請使用 **節點主機**。模型仍然與 **閘道** 對話；當選擇 `host=node` 時，閘道會將 `exec` 呼叫轉發給 **節點主機**。

### 什麼在哪裡運行

- **Gateway host**：接收訊息，運行模型，路由工具呼叫。
- **節點主機**：在節點機器上執行 `system.run`/`system.which`。
- **審批**：透過 `~/.openclaw/exec-approvals.json` 在節點主機上強制執行。

批准注意事項：

- 批准支援的節點運行綁定確切的請求上下文。
- 對於直接的 shell/runtime 執行檔案，OpenClaw 也會盡最大努力綁定一個具體的本機
  檔案操作數，並且如果該檔案在執行前被變更，則拒絕執行。
- 如果 OpenClaw 無法為解譯器/runtime 指令確切識別一個具體的本機檔案，
  將會拒絕需要批准的執行，而不是假設具有完整的 runtime 涵蓋範圍。請使用沙盒、
  獨立的主機，或明確的信任允許清單/完整工作流程，以獲得更廣泛的解譯器語意。

### 啟動節點主機 (前景)

在節點機器上：

```bash
openclaw node run --host <gateway-host> --port 18789 --display-name "Build Node"
```

### 透過 SSH 通道 (loopback bind) 連線遠端閘道

如果閘道綁定到 loopback (`gateway.bind=loopback`，本地模式下的預設值)，遠端節點主機將無法直接連線。建立 SSH 隧道並將節點主機指向隧道的本地端。

範例 (節點主機 -> 閘道主機)：

```bash
# Terminal A (keep running): forward local 18790 -> gateway 127.0.0.1:18789
ssh -N -L 18790:127.0.0.1:18789 user@gateway-host

# Terminal B: export the gateway token and connect through the tunnel
export OPENCLAW_GATEWAY_TOKEN="<gateway-token>"
openclaw node run --host 127.0.0.1 --port 18790 --display-name "Build Node"
```

備註：

- `openclaw node run` 支援權杖或密碼驗證。
- 偏好使用環境變數：`OPENCLAW_GATEWAY_TOKEN` / `OPENCLAW_GATEWAY_PASSWORD`。
- 組態備援方案是 `gateway.auth.token` / `gateway.auth.password`。
- 在本地模式下，節點主機會故意忽略 `gateway.remote.token` / `gateway.remote.password`。
- 在遠端模式下，根據遠端優先順序規則，`gateway.remote.token` / `gateway.remote.password` 是符合資格的。
- 如果配置了作用中的本地 `gateway.auth.*` SecretRefs 但未解析，節點主機驗證將失敗關閉。
- 節點主機驗證解析僅接受 `OPENCLAW_GATEWAY_*` 環境變數。

### 啟動節點主機 (服務)

```bash
openclaw node install --host <gateway-host> --port 18789 --display-name "Build Node"
openclaw node start
openclaw node restart
```

### 配對 + 命名

在閘道主機上：

```bash
openclaw devices list
openclaw devices approve <requestId>
openclaw nodes status
```

如果節點使用變更的驗證詳細資訊重試，請重新執行 `openclaw devices list` 並批准目前的 `requestId`。

命名選項：

- `--display-name` 於 `openclaw node run` / `openclaw node install` （持續存在於節點上的 `~/.openclaw/node.json` 中）。
- `openclaw nodes rename --node <id|name|ip> --name "Build Node"` （閘道覆寫）。

### 將指令加入允許清單

執行核准是**針對每個節點主機**的。請從閘道新增允許清單項目：

```bash
openclaw approvals allowlist add --node <id|name|ip> "/usr/bin/uname"
openclaw approvals allowlist add --node <id|name|ip> "/usr/bin/sw_vers"
```

審批位於節點主機的 `~/.openclaw/exec-approvals.json`。

### 將 exec 指向節點

設定預設值 (閘道組態)：

```bash
openclaw config set tools.exec.host node
openclaw config set tools.exec.security allowlist
openclaw config set tools.exec.node "<id-or-name>"
```

或是每個階段：

```
/exec host=node security=allowlist node=<id-or-name>
```

設定後，任何帶有 `host=node` 的 `exec` 呼叫都會在節點主機上執行（受限於
節點允許清單/核准）。

`host=auto` 不會自行隱含地選擇節點，但允許從 `auto` 發出明確的單次呼叫 `host=node` 請求。如果您希望節點 exec 成為該階段的預設值，請明確設定 `tools.exec.host=node` 或 `/exec host=node ...`。

相關：

- [節點主機 CLI](/zh-Hant/cli/node)
- [Exec 工具](/zh-Hant/tools/exec)
- [Exec 核准](/zh-Hant/tools/exec-approvals)

## 呼叫命令

底層 (原始 RPC)：

```bash
openclaw nodes invoke --node <idOrNameOrIp> --command canvas.eval --params '{"javaScript":"location.href"}'
```

針對常見的「提供代理程式媒體附件」工作流程，存在更高階的輔助工具。

## 螢幕截圖 (Canvas 快照)

如果節點正在顯示 Canvas (WebView)，`canvas.snapshot` 會傳回 `{ format, base64 }`。

CLI 輔助程式（寫入暫存檔案並印出 `MEDIA:<path>`）：

```bash
openclaw nodes canvas snapshot --node <idOrNameOrIp> --format png
openclaw nodes canvas snapshot --node <idOrNameOrIp> --format jpg --max-width 1200 --quality 0.9
```

### Canvas 控制

```bash
openclaw nodes canvas present --node <idOrNameOrIp> --target https://example.com
openclaw nodes canvas hide --node <idOrNameOrIp>
openclaw nodes canvas navigate https://example.com --node <idOrNameOrIp>
openclaw nodes canvas eval --node <idOrNameOrIp> --js "document.title"
```

備註：

- `canvas present` 接受 URL 或本機檔案路徑 (`--target`)，以及用於定位的選用 `--x/--y/--width/--height`。
- `canvas eval` 接受內嵌 JS (`--js`) 或位置參數。

### A2UI (Canvas)

```bash
openclaw nodes canvas a2ui push --node <idOrNameOrIp> --text "Hello"
openclaw nodes canvas a2ui push --node <idOrNameOrIp> --jsonl ./payload.jsonl
openclaw nodes canvas a2ui reset --node <idOrNameOrIp>
```

備註：

- 僅支援 A2UI v0.8 JSONL (v0.9/createSurface 會被拒絕)。

## 照片 + 影片 (節點相機)

照片 (`jpg`)：

```bash
openclaw nodes camera list --node <idOrNameOrIp>
openclaw nodes camera snap --node <idOrNameOrIp>            # default: both facings (2 MEDIA lines)
openclaw nodes camera snap --node <idOrNameOrIp> --facing front
```

視訊片段 (`mp4`)：

```bash
openclaw nodes camera clip --node <idOrNameOrIp> --duration 10s
openclaw nodes camera clip --node <idOrNameOrIp> --duration 3000 --no-audio
```

備註：

- 節點必須處於 **前景** 才能進行 `canvas.*` 和 `camera.*`（背景呼叫會傳回 `NODE_BACKGROUND_UNAVAILABLE`）。
- 片段持續時間會受到限制（目前為 `<= 60s`），以避免 base64 載荷過大。
- Android 盡可能會提示授與 `CAMERA`/`RECORD_AUDIO` 權限；遭拒絕的權限會傳回 `*_PERMISSION_REQUIRED` 錯誤。

## 螢幕錄製 (節點)

支援的節點會公開 `screen.record` (mp4)。範例：

```bash
openclaw nodes screen record --node <idOrNameOrIp> --duration 10s --fps 10
openclaw nodes screen record --node <idOrNameOrIp> --duration 10s --fps 10 --no-audio
```

備註：

- `screen.record` 的可用性取決於節點平台。
- 螢幕錄製會限制為 `<= 60s`。
- `--no-audio` 會在支援的平台上停用麥克風擷取。
- 當有多個螢幕可用時，使用 `--screen <index>` 來選擇顯示器。

## 位置 (節點)

當在設定中啟用位置時，節點會公開 `location.get`。

CLI 輔助程式：

```bash
openclaw nodes location get --node <idOrNameOrIp>
openclaw nodes location get --node <idOrNameOrIp> --accuracy precise --max-age 15000 --location-timeout 10000
```

備註：

- 位置**預設為關閉**。
- 「始終」需要系統權限；背景擷取為盡力而為。
- 回應包含經緯度、精確度 (公尺) 和時間戳記。

## SMS (Android 節點)

當使用者授予 **SMS** 權限且裝置支援電話功能時，Android 節點可以公開 `sms.send`。

低層級調用：

```bash
openclaw nodes invoke --node <idOrNameOrIp> --command sms.send --params '{"to":"+15555550123","message":"Hello from OpenClaw"}'
```

備註：

- 權限提示必須在 Android 裝置上被接受，才會公告此功能。
- 不支援電話功能的僅 Wi-Fi 裝置將不會通告 `sms.send`。

## Android 裝置 + 個人資料指令

當啟用對應功能時，Android 節點可以公告額外的指令系列。

可用系列：

- `device.status`、`device.info`、`device.permissions`、`device.health`
- `notifications.list`、`notifications.actions`
- `photos.latest`
- `contacts.search`、`contacts.add`
- `calendar.events`、`calendar.add`
- `callLog.search`
- `sms.search`
- `motion.activity`、`motion.pedometer`

調用範例：

```bash
openclaw nodes invoke --node <idOrNameOrIp> --command device.status --params '{}'
openclaw nodes invoke --node <idOrNameOrIp> --command notifications.list --params '{}'
openclaw nodes invoke --node <idOrNameOrIp> --command photos.latest --params '{"limit":1}'
```

備註：

- 動作指令取決於可用感應器的功能。

## 系統指令 (node host / mac node)

macOS 節點公開 `system.run`、`system.notify` 和 `system.execApprovals.get/set`。
無介面節點主機公開 `system.run`、`system.which` 和 `system.execApprovals.get/set`。

範例：

```bash
openclaw nodes notify --node <idOrNameOrIp> --title "Ping" --body "Gateway ready"
openclaw nodes invoke --node <idOrNameOrIp> --command system.which --params '{"name":"git"}'
```

備註：

- `system.run` 會在載荷中返回 stdout/stderr/退出碼。
- Shell 執行現在通過帶有 `host=node` 的 `exec` 工具進行；`nodes` 仍然是明確節點指令的直接 RPC 介面。
- `nodes invoke` 不公開 `system.run` 或 `system.run.prepare`；這些僅保留在 exec 路徑上。
- exec 路徑在批准之前會準備一個規範的 `systemRunPlan`。一旦授予批准，閘道會轉發該儲存的計劃，而不是任何後續呼叫者編輯的 command/cwd/session 欄位。
- `system.notify` 遵守 macOS 應用程式上的通知權限狀態。
- 無法識別的節點 `platform` / `deviceFamily` 元資料使用保守的預設允許清單，其中不包括 `system.run` 和 `system.which`。如果您針對未知平台有意需要這些指令，請透過 `gateway.nodes.allowCommands` 明確新增它們。
- `system.run` 支援 `--cwd`、`--env KEY=VAL`、`--command-timeout` 和 `--needs-screen-recording`。
- 對於 shell 包裝器（`bash|sh|zsh ... -c/-lc`），請求範圍的 `--env` 值會被縮減為明確的允許清單（`TERM`、`LANG`、`LC_*`、`COLORTERM`、`NO_COLOR`、`FORCE_COLOR`）。
- 在允許清單模式下，對於「一律允許」的決策，已知的分派包裝器（`env`、`nice`、`nohup`、`stdbuf`、`timeout`）會保存內部可執行檔路徑，而非包裝器路徑。如果解開包裝不安全，則不會自動保存允許清單項目。
- 在允許清單模式的 Windows 節點主機上，透過 `cmd.exe /c` 執行的 shell 包裝器需要核准（僅有允許清單項目並不會自動允許包裝器形式）。
- `system.notify` 支援 `--priority <passive|active|timeSensitive>` 和 `--delivery <system|overlay|auto>`。
- 節點主機會忽略 `PATH` 覆寫，並移除危險的啟動/shell 金鑰（`DYLD_*`、`LD_*`、`NODE_OPTIONS`、`PYTHON*`、`PERL*`、`RUBYOPT`、`SHELLOPTS`、`PS4`）。如果您需要額外的 PATH 項目，請設定節點主機服務環境（或將工具安裝在標準位置），而不是透過 `--env` 傳遞 `PATH`。
- 在 macOS 節點模式下，`system.run` 受 macOS 應用程式中的執行核准限制（設定 → 執行核准）。
  Ask/allowlist/full 的行為與無頭節點主機相同；被拒絕的提示會傳回 `SYSTEM_RUN_DENIED`。
- 在無頭節點主機上，`system.run` 受執行核准限制（`~/.openclaw/exec-approvals.json`）。

## Exec node 綁定

當有多個節點可用時，您可以將 exec 綁定到特定節點。
這會設定 `exec host=node` 的預設節點（並可針對每個代理程式進行覆寫）。

全域預設：

```bash
openclaw config set tools.exec.node "node-id-or-name"
```

個別 agent 覆蓋：

```bash
openclaw config get agents.list
openclaw config set agents.list[0].tools.exec.node "node-id-or-name"
```

取消設定以允許任何 node：

```bash
openclaw config unset tools.exec.node
openclaw config unset agents.list[0].tools.exec.node
```

## 權限對應

節點可能包含 `permissions` 地圖，位於 `node.list` / `node.describe` 中，以權限名稱為鍵（例如 `screenRecording`、`accessibility`），並具有布林值（`true` = 已授予）。

## Headless node host（跨平台）

OpenClaw 可以執行 **無頭節點主機**（無 UI），它連接到 Gateway
WebSocket 並公開 `system.run` / `system.which`。這在 Linux/Windows
上很有用，或是用於在伺服器旁邊執行最小化節點。

啟動它：

```bash
openclaw node run --host <gateway-host> --port 18789
```

備註：

- 仍然需要配對（Gateway 將顯示裝置配對提示）。
- 節點主機將其節點 ID、權杖、顯示名稱和 Gateway 連線資訊儲存在 `~/.openclaw/node.json` 中。
- Exec 批准是透過 `~/.openclaw/exec-approvals.json` 在本機強制執行的
  （請參閱 [Exec approvals](/zh-Hant/tools/exec-approvals)）。
- 在 macOS 上，無頭節點主機預設會在本機執行 `system.run`。請設定
  `OPENCLAW_NODE_EXEC_HOST=app` 以透過隨行應用程式 exec 主機路由 `system.run`；新增
  `OPENCLAW_NODE_EXEC_FALLBACK=0` 以要求應用程式主機，且如果無法使用則以封閉式失敗。
- 當 Gateway WS 使用 TLS 時，請新增 `--tls` / `--tls-fingerprint`。

## Mac 節點模式

- macOS 選單列應用程式會作為節點連接到 Gateway WS 伺服器（因此 `openclaw nodes …` 可針對此 Mac 運作）。
- 在遠端模式下，應用程式會為 Gateway 連接埠開啟 SSH 通道，並連接到 `localhost`。
