---
summary: "節點：配對、功能、權限，以及畫布/相機/螢幕/裝置/通知/系統的 CLI 輔助工具"
read_when:
  - Pairing iOS/Android nodes to a gateway
  - Using node canvas/camera for agent context
  - Adding new node commands or CLI helpers
title: "節點"
---

# 節點

**節點** 是一個伴隨裝置（macOS/iOS/Android/headless），使用 `role: "node"` 連接到閘道器 **WebSocket**（與操作員使用相同的連接埠），並透過 `node.invoke` 公開指令介面（例如 `canvas.*`、`camera.*`、`device.*`、`notifications.*`、`system.*`）。協定詳細資訊：[閘道器協定](/zh-Hant/gateway/protocol)。

舊版傳輸：[橋接協定](/zh-Hant/gateway/bridge-protocol) (TCP JSONL；對於目前的節點已棄用/移除)。

macOS 也可以在 **節點模式** 下執行：選單列應用程式連接到閘道器的 WS 伺服器，並將其本機畫布/相機指令作為節點公開（因此 `openclaw nodes …` 可針對此 Mac 執行）。

備註：

- 節點是 **週邊裝置**，不是閘道器。它們不執行閘道器服務。
- Telegram/WhatsApp/等訊息會傳送到 **閘道器**，而不是節點。
- 疑難排解手冊：[/nodes/troubleshooting](/zh-Hant/nodes/troubleshooting)

## 配對 + 狀態

**WS 節點使用裝置配對。** 節點在 `connect` 期間出示裝置身分；閘道器
會為 `role: node` 建立裝置配對請求。透過裝置 CLI（或 UI）批准。

快速 CLI：

```bash
openclaw devices list
openclaw devices approve <requestId>
openclaw devices reject <requestId>
openclaw nodes status
openclaw nodes describe --node <idOrNameOrIp>
```

備註：

- 當節點的裝置配對角色包含 `node` 時，`nodes status` 會將節點標記為 **已配對**。
- `node.pair.*` (CLI: `openclaw nodes pending/approve/reject`) 是一個獨立的閘道器擁有之
  節點配對儲存；它 **不會** 閘控 WS `connect` 交握。

## 遠端節點主機 (system.run)

當您的閘道器執行於一部機器上，而您希望指令在另一部機器上執行時，請使用 **節點主機**。模型仍與 **閘道器** 通訊；當選取 `host=node` 時，閘道器會將 `exec` 呼叫轉送到 **節點主機**。

### 什麼在哪裡執行

- **Gateway 主機**：接收訊息、執行模型、路由工具呼叫。
- **Node 主機**：在節點機器上執行 `system.run`/`system.which`。
- **Approvals**：透過 `~/.openclaw/exec-approvals.json` 在節點主機上強制執行。

Approval 註記：

- 基於 Approval 的 node 執行會綁定確切的要求上下文。
- 對於直接的 shell/runtime 執行檔執行，OpenClaw 也會盡最大努力綁定一個具體的本機檔案運算元，並在該檔案於執行前變更時拒絕執行。
- 如果 OpenClaw 無法為直譯器/runtime 指令識別出唯一的具體本機檔案，將拒絕基於 Approval 的執行，而不是偽裝完整的 runtime 涵蓋範圍。請使用沙盒、獨立的主機，或明確的信任允許清單/完整工作流程，以獲得更廣泛的直譯器語意。

### 啟動節點主機 (前景)

在節點機器上：

```bash
openclaw node run --host <gateway-host> --port 18789 --display-name "Build Node"
```

### 透過 SSH 通道的遠端 Gateway (loopback bind)

如果 Gateway 綁定到 loopback (`gateway.bind=loopback`，本機模式下的預設值)，遠端節點主機將無法直接連線。請建立 SSH 通道，並將節點主機指向通道的本機端。

範例 (節點主機 -> Gateway 主機)：

```bash
# Terminal A (keep running): forward local 18790 -> gateway 127.0.0.1:18789
ssh -N -L 18790:127.0.0.1:18789 user@gateway-host

# Terminal B: export the gateway token and connect through the tunnel
export OPENCLAW_GATEWAY_TOKEN="<gateway-token>"
openclaw node run --host 127.0.0.1 --port 18790 --display-name "Build Node"
```

註記：

- `openclaw node run` 支援 token 或密碼驗證。
- 建議使用環境變數：`OPENCLAW_GATEWAY_TOKEN` / `OPENCLAW_GATEWAY_PASSWORD`。
- 組態備援方案為 `gateway.auth.token` / `gateway.auth.password`。
- 在本機模式下，節點主機會刻意忽略 `gateway.remote.token` / `gateway.remote.password`。
- 在遠端模式下，根據遠端優先順序規則，`gateway.remote.token` / `gateway.remote.password` 是有效的。
- 如果設定了使用中本機 `gateway.auth.*` SecretRefs 但未解析，節點主機驗證將會失敗關閉 (fail closed)。
- 舊版 `CLAWDBOT_GATEWAY_*` 環境變數會被節點主機驗證解析刻意忽略。

### 啟動節點主機 (服務)

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

- `--display-name` 於 `openclaw node run` / `openclaw node install` (持續存在於節點上的 `~/.openclaw/node.json`)。
- `openclaw nodes rename --node <id|name|ip> --name "Build Node"` (Gateway 覆寫)。

### 允許清單指令

Exec 核准是**針對每個節點主機**的。請從 Gateway 新增允許清單項目：

```bash
openclaw approvals allowlist add --node <id|name|ip> "/usr/bin/uname"
openclaw approvals allowlist add --node <id|name|ip> "/usr/bin/sw_vers"
```

核准記錄位於節點主機的 `~/.openclaw/exec-approvals.json` 中。

### 指向節點的 exec

設定預設值（gateway config）：

```bash
openclaw config set tools.exec.host node
openclaw config set tools.exec.security allowlist
openclaw config set tools.exec.node "<id-or-name>"
```

或每個階段：

```
/exec host=node security=allowlist node=<id-or-name>
```

設定後，任何帶有 `host=node` 的 `exec` 呼叫都會在節點主機上執行（受節點允許清單/核准機制約束）。

相關連結：

- [節點主機 CLI](/zh-Hant/cli/node)
- [Exec 工具](/zh-Hant/tools/exec)
- [Exec 核准](/zh-Hant/tools/exec-approvals)

## 呼叫指令

底層（原始 RPC）：

```bash
openclaw nodes invoke --node <idOrNameOrIp> --command canvas.eval --params '{"javaScript":"location.href"}'
```

針對常見的「提供代理程式 MEDIA 附加檔案」工作流程，存在更高層級的輔助工具。

## 螢幕截圖 (canvas snapshots)

如果節點正在顯示 Canvas (WebView)，`canvas.snapshot` 會傳回 `{ format, base64 }`。

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

- `canvas present` 接受 URL 或本地檔案路徑 (`--target`)，以及用於定位的可選 `--x/--y/--width/--height`。
- `canvas eval` 接受內嵌 JS (`--js`) 或位置參數。

### A2UI (Canvas)

```bash
openclaw nodes canvas a2ui push --node <idOrNameOrIp> --text "Hello"
openclaw nodes canvas a2ui push --node <idOrNameOrIp> --jsonl ./payload.jsonl
openclaw nodes canvas a2ui reset --node <idOrNameOrIp>
```

備註：

- 僅支援 A2UI v0.8 JSONL（會拒絕 v0.9/createSurface）。

## 照片 + 影片 (節點相機)

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

- 節點必須處於 **前景** 狀態才能使用 `canvas.*` 和 `camera.*`（背景呼叫會傳回 `NODE_BACKGROUND_UNAVAILABLE`）。
- 片段持續時間會受到限制（目前為 `<= 60s`），以避免 base64 承載過大。
- Android 盡可能會提示授與 `CAMERA`/`RECORD_AUDIO` 權限；拒絕權限將導致失敗並傳回 `*_PERMISSION_REQUIRED`。

## 螢幕錄製 (nodes)

支援的節點會公開 `screen.record` (mp4)。範例：

```bash
openclaw nodes screen record --node <idOrNameOrIp> --duration 10s --fps 10
openclaw nodes screen record --node <idOrNameOrIp> --duration 10s --fps 10 --no-audio
```

備註：

- `screen.record` 的可用性取決於節點平台。
- 螢幕錄製會被限制在 `<= 60s`。
- `--no-audio` 會在支援的平台上停用麥克風擷取。
- 當有多個螢幕可用時，使用 `--screen <index>` 來選擇顯示器。

## 位置（節點）

當在設定中啟用位置時，節點會公開 `location.get`。

CLI 輔助工具：

```bash
openclaw nodes location get --node <idOrNameOrIp>
openclaw nodes location get --node <idOrNameOrIp> --accuracy precise --max-age 15000 --location-timeout 10000
```

備註：

- 位置功能**預設關閉**。
- 「始終」需要系統權限；背景抓取為盡力而為。
- 回應包含經緯度、準確度（公尺）和時間戳記。

## SMS（Android 節點）

當使用者授予 **SMS** 權限且裝置支援電話功能時，Android 節點可以公開 `sms.send`。

底層調用：

```bash
openclaw nodes invoke --node <idOrNameOrIp> --command sms.send --params '{"to":"+15555550123","message":"Hello from OpenClaw"}'
```

備註：

- 必須在 Android 裝置上接受權限提示，才會廣播此功能。
- 不支援電話功能的僅 Wi-Fi 裝置將不會廣播 `sms.send`。

## Android 裝置 + 個人資料指令

當啟用對應功能時，Android 節點可以廣播額外的指令系列。

可用系列：

- `device.status`、`device.info`、`device.permissions`、`device.health`
- `notifications.list`、`notifications.actions`
- `photos.latest`
- `contacts.search`、`contacts.add`
- `calendar.events`、`calendar.add`
- `callLog.search`
- `motion.activity`、`motion.pedometer`

調用範例：

```bash
openclaw nodes invoke --node <idOrNameOrIp> --command device.status --params '{}'
openclaw nodes invoke --node <idOrNameOrIp> --command notifications.list --params '{}'
openclaw nodes invoke --node <idOrNameOrIp> --command photos.latest --params '{"limit":1}'
```

備註：

- 動作指令由可用感應器進行功能閘控。

## 系統指令（節點主機 / mac node）

macOS 節點公開 `system.run`、`system.notify` 和 `system.execApprovals.get/set`。
無介面節點主機公開 `system.run`、`system.which` 和 `system.execApprovals.get/set`。

範例：

```bash
openclaw nodes run --node <idOrNameOrIp> -- echo "Hello from mac node"
openclaw nodes notify --node <idOrNameOrIp> --title "Ping" --body "Gateway ready"
```

備註：

- `system.run` 在 payload 中傳回 stdout/stderr/exit code。
- `system.notify` 遵守 macOS 應用程式上的通知權限狀態。
- 無法辨識的節點 `platform` / `deviceFamily` 元資料使用保守的預設允許清單，該清單排除 `system.run` 和 `system.which`。如果您確實需要在未知平台上使用這些指令，請透過 `gateway.nodes.allowCommands` 明確新增它們。
- `system.run` 支援 `--cwd`、`--env KEY=VAL`、`--command-timeout` 和 `--needs-screen-recording`。
- 對於 Shell 包裝程式 (`bash|sh|zsh ... -c/-lc`)，請求範圍的 `--env` 值會被縮減為明確的允許清單 (`TERM`、`LANG`、`LC_*`、`COLORTERM`、`NO_COLOR`、`FORCE_COLOR`)。
- 對於允許清單模式下的「一律允許」決策，已知的調度包裝程式 (`env`、`nice`、`nohup`、`stdbuf`、`timeout`) 會保存內部可執行檔路徑，而不是包裝程式路徑。如果解開包裝程式不安全，則不會自動保存允許清單項目。
- 在允許清單模式下的 Windows 節點主機上，透過 `cmd.exe /c` 執行的 Shell 包裝程式需要批准（單靠允許清單項目不會自動允許包裝程式形式）。
- `system.notify` 支援 `--priority <passive|active|timeSensitive>` 和 `--delivery <system|overlay|auto>`。
- 節點主機會忽略 `PATH` 覆寫並移除危險的啟動/Shell 金鑰 (`DYLD_*`、`LD_*`、`NODE_OPTIONS`、`PYTHON*`、`PERL*`、`RUBYOPT`、`SHELLOPTS`、`PS4`)。如果您需要額外的 PATH 項目，請設定節點主機服務環境 (或將工具安裝在標準位置)，而不是透過 `--env` 傳遞 `PATH`。
- 在 macOS 節點模式下，`system.run` 受到 macOS 應用程式中的執行核准限制（設定 → 執行核准）。
  詢問/允許清單/完全的行為與無頭節點主機相同；拒絕的提示會返回 `SYSTEM_RUN_DENIED`。
- 在無頭節點主機上，`system.run` 受到執行核准（`~/.openclaw/exec-approvals.json`）的限制。

## 執行節點綁定

當有多個節點可用時，您可以將執行綁定到特定節點。
這會設定 `exec host=node` 的預設節點（並且可以針對每個代理程式進行覆蓋）。

全域預設：

```bash
openclaw config set tools.exec.node "node-id-or-name"
```

每個代理程式覆寫：

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

節點可以在 `node.list` / `node.describe` 中包含 `permissions` 映射，以權限名稱為鍵（例如 `screenRecording`、`accessibility`）並具有布林值（`true` = 已授予）。

## 無頭節點主機（跨平台）

OpenClaw 可以執行連接到 Gateway WebSocket 並公開 `system.run` / `system.which` 的**無頭節點主機**（無 UI）。這在 Linux/Windows 上很有用，或者用於在伺服器旁執行最小節點。

啟動它：

```bash
openclaw node run --host <gateway-host> --port 18789
```

備註：

- 仍然需要配對（Gateway 將顯示裝置配對提示）。
- 節點主機將其節點 ID、權杖、顯示名稱和 Gateway 連線資訊儲存在 `~/.openclaw/node.json` 中。
- 執行核准透過 `~/.openclaw/exec-approvals.json` 在本地強制執行
  （請參閱[執行核准](/zh-Hant/tools/exec-approvals)）。
- 在 macOS 上，無頭節點主機預設在本地執行 `system.run`。設定
  `OPENCLAW_NODE_EXEC_HOST=app` 將 `system.run` 透過伴隨應用程式執行主機路由；新增
  `OPENCLAW_NODE_EXEC_FALLBACK=0` 以要求應用程式主機，並在無法使用時失敗封閉。
- 當 Gateway WS 使用 TLS 時，新增 `--tls` / `--tls-fingerprint`。

## Mac 節點模式

- macOS 功能表列應用程式作為節點連接到 Gateway WS 伺服器（因此 `openclaw nodes …` 可對此 Mac 運作）。
- 在遠端模式下，應用程式會為 Gateway 埠開啟 SSH 通道並連接到 `localhost`。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
