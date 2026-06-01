---
summary: "OpenClaw macOS 伴隨應用程式（選單列 + 閘道代理程式）"
read_when:
  - Implementing macOS app features
  - Changing gateway lifecycle or node bridging on macOS
title: "macOS app"
---

macOS 應用程式是 OpenClaw 的 **選單列夥伴**。它擁有權限，在本地管理/附加至 Gateway（launchd 或手動），並將 macOS 功能作為節點公開給代理程式。

## 功能說明

- 在選單列中顯示原生通知與狀態。
- 擁有 TCC 提示（通知、輔助使用、螢幕錄製、麥克風、語音辨識、自動化/AppleScript）。
- 執行或連接至 Gateway（本機或遠端）。
- 公開僅限 macOS 的工具（Canvas、Camera、Screen Recording、`system.run`）。
- 在**遠端**模式（launchd）下啟動本機節點主機服務，並在**本機**模式下停止它。
- 選擇性地託管用於 UI 自動化的 **PeekabooBridge**。
- 根據要求透過 npm、pnpm 或 bun 安裝全域 CLI（`openclaw`）（應用程式偏好 npm，其次是 pnpm，然後是 bun；Node 仍是推薦的 Gateway 執行環境）。

## 本機與遠端模式

- **本機**（預設）：應用程式會附加至正在執行的本機 Gateway（如果存在）；否則它會透過 `openclaw gateway install` 啟用 launchd 服務。
- **遠端**：應用程式透過 SSH/Tailscale 連接至 Gateway，且從不啟動本機程序。
  應用程式會啟動本機 **節點主機服務**，以便遠端 Gateway 可以連線到此 Mac。
  應用程式不會將 Gateway 作為子程序生成。
  Gateway 探索現在偏好使用 Tailscale MagicDNS 名稱而非原始 tailnet IP，因此當 tailnet IP 變更時，Mac 應用程式能更可靠地恢復連線。

## Launchd 控制

該應用程式管理一個標記為 `ai.openclaw.gateway` 的每用戶 LaunchAgent
（或在使用 `--profile`/`OPENCLAW_PROFILE` 時為 `ai.openclaw.<profile>`；舊版 `com.openclaw.*` 仍會卸載）。

```bash
launchctl kickstart -k gui/$UID/ai.openclaw.gateway
launchctl bootout gui/$UID/ai.openclaw.gateway
```

執行命名設定檔時，請將標記替換為 `ai.openclaw.<profile>`。

如果未安裝 LaunchAgent，請從應用程式中啟用它或執行
`openclaw gateway install`。

如果 Gateway 反覆消失數分鐘到數小時，且只有在您觸碰控制 UI 或 SSH 進入主機時才恢復，請參閱 [Gateway 故障排除](/zh-Hant/gateway/troubleshooting#macos-gateway-silently-stops-responding-then-resumes-when-you-touch-the-dashboard) 中關於 macOS 維護睡眠 / `ENETDOWN` 當機以及 launchd 重新生成保護閘門的故障排除說明。

## 節點功能

macOS 應用程式將自己呈現為一個節點。常用指令：

- 畫布：`canvas.present`、`canvas.navigate`、`canvas.eval`、`canvas.snapshot`、`canvas.a2ui.*`
- 相機：`camera.snap`、`camera.clip`
- 螢幕：`screen.snapshot`、`screen.record`
- 系統：`system.run`、`system.notify`

該節點會回報 `permissions` 映射，以便 Agent 判定允許的內容。

節點服務 + 應用程式 IPC：

- 當無頭節點主機服務執行時（遠端模式），它會作為一個節點連接到 Gateway WS。
- `system.run` 會透過本地 Unix socket 在 macOS 應用程式中執行（UI/TCC 上下文）；提示和輸出會保留在應用程式內。

圖表 (SCI)：

```
Gateway -> Node Service (WS)
                 |  IPC (UDS + token + HMAC + TTL)
                 v
             Mac App (UI + TCC + system.run)
```

## 執行核准

`system.run` 由 macOS 應用程式中的 **執行核准** 控制（設定 → 執行核准）。
安全性 + 詢問 + 允許清單會儲存在 Mac 的本地：

```
~/.openclaw/exec-approvals.json
```

範例：

```json
{
  "version": 1,
  "defaults": {
    "security": "deny",
    "ask": "on-miss"
  },
  "agents": {
    "main": {
      "security": "allowlist",
      "ask": "on-miss",
      "allowlist": [{ "pattern": "/opt/homebrew/bin/rg" }]
    }
  }
}
```

備註：

- `allowlist` 條目是已解析二進位路徑的 glob 模式，或是透過 PATH 呼叫之指令的純指令名稱。
- 包含 shell 控制或擴充語法（`&&`、`||`、`;`、`|`、`` ` ``, `$`, `<`, `>`, `(`, `)`) 的原始 shell 指令文字會被視為不在允許清單中，需要明確核准（或將 shell 二進位檔加入允許清單）。
- 在提示中選擇「一律允許」會將該指令加入允許清單。
- `system.run` 環境覆寫會被過濾（捨棄 `PATH`、`DYLD_*`、`LD_*`、`NODE_OPTIONS`、`NODE_REDIRECT_WARNINGS`、`NODE_REPL_EXTERNAL_MODULE`、`NODE_REPL_HISTORY`、`NODE_V8_COVERAGE`、`PYTHON*`、`PERL*`、`RUBYOPT`、`SHELLOPTS`、`PS4`），然後與應用程式的環境合併。
- 對於 Shell 包裝器（`bash|sh|zsh ... -c/-lc`），請求範圍的環境覆寫會減少為一個小型明確的允許清單（`TERM`、`LANG`、`LC_*`、`COLORTERM`、`NO_COLOR`、`FORCE_COLOR`）。
- 對於允許清單模式中的「始終允許」決策，已知的調度包裝器（`env`、`nice`、`nohup`、`stdbuf`、`timeout`）會保存內部可執行檔路徑而非包裝器路徑。如果解開包裝並不安全，則不會自動保存允許清單項目。

## Deep links

應用程式註冊了 `openclaw://` URL 方案以用於本地操作。

### `openclaw://agent`

觸發 Gateway `agent` 請求。

```bash
open 'openclaw://agent?message=Hello%20from%20deep%20link'
```

查詢參數：

- `message`（必要）
- `sessionKey`（選用）
- `thinking`（選用）
- `deliver` / `to` / `channel`（選用）
- `timeoutSeconds`（選用）
- `key`（選用的無人看管模式金鑰）

安全性：

- 若沒有 `key`，應用程式會提示進行確認。
- 若沒有 `key`，應用程式會對確認提示執行簡短訊息長度限制，並忽略 `deliver` / `to` / `channel`。
- 擁有有效的 `key` 時，執行過程是無人值守的（適用於個人自動化）。

## 入門流程（典型）

1. 安裝並啟動 **OpenClaw.app**。
2. 完成權限檢查清單（TCC 提示）。
3. 確保 **本機** 模式已啟動，且 Gateway 正在執行。
4. 如果您需要終端機存取權限，請安裝 CLI。

## 狀態目錄位置（macOS）

避免將 OpenClaw 狀態目錄放在 iCloud 或其他雲端同步資料夾中。
同步備份的路徑可能會增加延遲，並偶爾導致會話和憑證的檔案鎖定/同步競爭。

建議使用本機非同步的狀態路徑，例如：

```bash
OPENCLAW_STATE_DIR=~/.openclaw
```

如果 `openclaw doctor` 偵測到狀態位於：

- `~/Library/Mobile Documents/com~apple~CloudDocs/...`
- `~/Library/CloudStorage/...`

它將發出警告並建議移回本機路徑。

## 建置與開發工作流程（原生）

- `cd apps/macos && swift build`
- `swift run OpenClaw`（或 Xcode）
- 封裝應用程式：`scripts/package-mac-app.sh`

## 除錯 Gateway 連線（macOS CLI）

使用除錯 CLI 來執行與 macOS 應用程式相同的 Gateway WebSocket 握手和探索邏輯，
而無需啟動應用程式。

```bash
cd apps/macos
swift run openclaw-mac connect --json
swift run openclaw-mac discover --timeout 3000 --json
```

連線選項：

- `--url <ws://host:port>`：覆寫設定
- `--mode <local|remote>`：從設定解析（預設值：config 或 local）
- `--probe`：強制重新進行健康檢查
- `--timeout <ms>`：請求逾時（預設值：`15000`）
- `--json`：用於比對的結構化輸出

探索選項：

- `--include-local`：包含會被過濾為「本機」的 gateway
- `--timeout <ms>`：整體探索視窗（預設值：`2000`）
- `--json`：用於比對的結構化輸出

<Tip>與 `openclaw gateway discover --json` 比對，以查看 macOS 應用程式的探索管道（`local.` 加上設定的廣域網域，並具有廣域網域和 Tailscale Serve 備援機制）是否與 Node CLI 基於 `dns-sd` 的探索有所不同。</Tip>

## 遠端連線配置（SSH 通道）

當 macOS 應用程式以 **遠端** 模式執行時，它會開啟 SSH 通道，讓本機 UI
元件能夠與遠端 Gateway 通訊，就像它在 localhost 上一樣。

### 控制通道 (Gateway WebSocket 埠)

- **用途：** 健康檢查、狀態、Web Chat、設定檔以及其他控制層呼叫。
- **本機埠：** Gateway 埠 (預設為 `18789`)，保持穩定不變。
- **遠端埠：** 遠端主機上的同一個 Gateway 埠。
- **行為：** 不使用隨機本機埠；應用程式會重複使用現有的健全通道，
  若有需要則會重新啟動。
- **SSH 模式：** `ssh -N -L <local>:127.0.0.1:<remote>` 搭配 BatchMode +
  ExitOnForwardFailure + keepalive 選項。
- **IP 回報：** SSH 通道使用 loopback，因此 gateway 會將節點
  IP 視為 `127.0.0.1`。如果您希望顯示真實的客戶端
  IP，請使用 **直接 (ws/wss)** 傳輸 (請參閱 [macOS 遠端存取](/zh-Hant/platforms/mac/remote))。

如需設定步驟，請參閱 [macOS 遠端存取](/zh-Hant/platforms/mac/remote)。如需通訊協定
詳細資訊，請參閱 [Gateway 通訊協定](/zh-Hant/gateway/protocol)。

## 相關文件

- [Gateway 手冊](/zh-Hant/gateway)
- [Gateway (macOS)](/zh-Hant/platforms/mac/bundled-gateway)
- [macOS 權限](/zh-Hant/platforms/mac/permissions)
- [Canvas](/zh-Hant/platforms/mac/canvas)
