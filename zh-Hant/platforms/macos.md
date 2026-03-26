---
summary: "OpenClaw macOS 伴隨應用程式 (選單列 + 閘道代理程式)"
read_when:
  - Implementing macOS app features
  - Changing gateway lifecycle or node bridging on macOS
title: "macOS 應用程式"
---

# OpenClaw macOS 伴隨程式 (選單列 + 閘道代理程式)

macOS 應用程式是 OpenClaw 的 **選單列伴隨程式**。它擁有權限，在本地管理或附加至閘道 (透過 launchd 或手動)，並將 macOS 功能作為節點暴露給代理程式。

## 功能說明

- 在選單列中顯示原生通知與狀態。
- 擁有 TCC 提示 (通知、輔助功能、螢幕錄製、麥克風、語音辨識、自動化/AppleScript)。
- 執行或連線至閘道 (本地或遠端)。
- 暴露僅限 macOS 的工具 (Canvas、Camera、螢幕錄製、`system.run`)。
- 在 **遠端** 模式 (launchd) 下啟動本地節點主機服務，並在 **本地** 模式下將其停止。
- 可選性地託管 **PeekabooBridge** 以進行 UI 自動化。
- 根據請求透過 npm/pnpm 安裝全域 CLI (`openclaw`)（不建議將 bun 用於 Gateway 執行時）。

## 本機模式與遠端模式

- **Local（本機）**（預設）：如果存在正在執行的本機 Gateway，應用程式會附加至該 Gateway；否則它會透過 `openclaw gateway install` 啟用 launchd 服務。
- **Remote（遠端）**：應用程式透過 SSH/Tailscale 連接到 Gateway，並且從不啟動本機程序。
  應用程式會啟動本機 **node host service**，以便遠端 Gateway 可以連接至此 Mac。
  應用程式不會將 Gateway 作為子程序生成。

## Launchd 控制

應用程式管理一個標記為 `ai.openclaw.gateway` 的每使用者 LaunchAgent
（或在使用 `--profile`/`OPENCLAW_PROFILE` 時為 `ai.openclaw.<profile>`；舊版 `com.openclaw.*` 仍會解除載入）。

```bash
launchctl kickstart -k gui/$UID/ai.openclaw.gateway
launchctl bootout gui/$UID/ai.openclaw.gateway
```

執行命名設定檔時，請將標籤替換為 `ai.openclaw.<profile>`。

如果尚未安裝 LaunchAgent，請從應用程式啟用，或執行
`openclaw gateway install`。

## 節點功能 (mac)

macOS 應用程式將自身呈現為一個節點。常見指令：

- 畫布： `canvas.present`、 `canvas.navigate`、 `canvas.eval`、 `canvas.snapshot`、 `canvas.a2ui.*`
- 相機： `camera.snap`、 `camera.clip`
- 螢幕： `screen.record`
- 系統： `system.run`、 `system.notify`

節點會回報 `permissions` 對映表，以便代理程式決定允許的內容。

節點服務 + 應用程式 IPC：

- 當無頭節點主機服務正在執行時 (遠端模式)，它會以節點身分連線至 Gateway WS。
- `system.run` 在 macOS 應用程式（UI/TCC 語境）中透過本地 Unix socket 執行；提示與輸出保留在應用程式內。

圖表 (SCI)：

```
Gateway -> Node Service (WS)
                 |  IPC (UDS + token + HMAC + TTL)
                 v
             Mac App (UI + TCC + system.run)
```

## 執行核准 (system.run)

`system.run` 由 macOS 應用程式中的 **執行核准** 所控制（設定 → 執行核准）。
安全性 + 詢問 + 允許清單會在本機 Mac 上儲存於：

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

註記：

- `allowlist` 項目是已解析二進位路徑的 glob 模式。
- 包含 shell 控制或擴展語法（`&&`、`||`、`;`、`|`、`` ` ``, `$`, `<`, `>`, `(`, `)`）的原始 shell 指令文字會被視為允許清單遺漏，並需要明確批准（或將 shell 二進位檔加入允許清單）。
- 在提示中選擇「始終允許」會將該指令新增至允許清單中。
- `system.run` 環境覆寫會被過濾（移除 `PATH`、`DYLD_*`、`LD_*`、`NODE_OPTIONS`、`PYTHON*`、`PERL*`、`RUBYOPT`、`SHELLOPTS`、`PS4`），然後與應用程式的環境合併。
- 對於 Shell 包裝器（`bash|sh|zsh ... -c/-lc`），請求範圍的環境覆寫會減少到一個很小的明確允許清單（`TERM`、`LANG`、`LC_*`、`COLORTERM`、`NO_COLOR`、`FORCE_COLOR`）。
- 對於允許清單模式中的「一律允許」決策，已知的分發包裝程式（`env`、`nice`、`nohup`、`stdbuf`、`timeout`）會儲存內部可執行檔路徑，而非包裝程式路徑。如果解包不安全，則不會自動儲存允許清單項目。

## Deep links

應用程式註冊了 `openclaw://` URL scheme 以執行本機操作。

### `openclaw://agent`

觸發 Gateway `agent` 請求。

```bash
open 'openclaw://agent?message=Hello%20from%20deep%20link'
```

Query parameters:

- `message` (必要)
- `sessionKey` (選用)
- `thinking` (選用)
- `deliver` / `to` / `channel` (選用)
- `timeoutSeconds` (選用)
- `key`（可選的非干預模式金鑰）

安全性：

- 如果沒有 `key`，應用程式會提示確認。
- 如果沒有 `key`，應用程式會對確認提示執行簡短訊息限制，並忽略 `deliver` / `to` / `channel`。
- 如果提供有效的 `key`，執行將是非干預的（適用於個人自動化）。

## 入門流程（典型）

1. 安裝並啟動 **OpenClaw.app**。
2. 完成權限檢查清單（TCC 提示）。
3. 確保 **Local** 模式已啟用，且 Gateway 正在執行。
4. 如果您需要終端機存取權限，請安裝 CLI。

## State 目錄位置

請避免將您的 OpenClaw 狀態目錄放在 iCloud 或其他雲端同步資料夾中。
同步支援的路徑可能會增加延遲，並偶爾會導致階段作業和認證的檔案鎖定/同步競爭。

建議使用本機非同步的狀態路徑，例如：

```bash
OPENCLAW_STATE_DIR=~/.openclaw
```

如果 `openclaw doctor` 偵測到以下位置下的狀態：

- `~/Library/Mobile Documents/com~apple~CloudDocs/...`
- `~/Library/CloudStorage/...`

它將發出警告並建議移回本機路徑。

## 建置與開發工作流程 (原生)

- `cd apps/macos && swift build`
- `swift run OpenClaw` (或 Xcode)
- 封裝應用程式： `scripts/package-mac-app.sh`

## 除錯閘道連線 (macOS CLI)

使用除錯 CLI 來執行與 macOS 應用程式相同的 Gateway WebSocket 握手與探索
邏輯，而無需啟動應用程式。

```bash
cd apps/macos
swift run openclaw-mac connect --json
swift run openclaw-mac discover --timeout 3000 --json
```

連線選項：

- `--url <ws://host:port>`：覆寫設定
- `--mode <local|remote>`：從設定解析 (預設：config 或 local)
- `--probe`：強制執行新的健康探測
- `--timeout <ms>`：請求逾時（預設值：`15000`）
- `--json`：用於比較的結構化輸出

探索選項：

- `--include-local`：包含會被篩選為「本機」的閘道
- `--timeout <ms>`：整體探索視窗（預設值：`2000`）
- `--json`：用於比較的結構化輸出

提示：與 `openclaw gateway discover --json` 比較，以查看 macOS 應用程式的探索管道（NWBrowser + tailnet DNS‑SD 後援）是否不同於 Node CLI 基於 `dns-sd` 的探索。

## 遠端連線管線（SSH 隧道）

當 macOS 應用程式以 **遠端 (Remote)** 模式執行時，它會開啟 SSH 隧道，讓本機 UI 元件能與遠端 Gateway 通訊，就像它在 localhost 上一樣。

### 控制隧道 (Gateway WebSocket 連接埠)

- **用途：** 健康檢查、狀態、Web Chat、設定以及其他控制層呼叫。
- **本機連接埠：** Gateway 連接埠 (預設為 `18789`)，始終保持穩定。
- **遠端連接埠：** 遠端主機上相同的 Gateway 連接埠。
- **行為：** 沒有隨機本機連接埠；應用程式會重複使用現有的健全隧道，或在需要時重新啟動它。
- **SSH 形式：** `ssh -N -L <local>:127.0.0.1:<remote>` 搭配 BatchMode + ExitOnForwardFailure + keepalive 選項。
- **IP 回報：** SSH 隧道使用 loopback，因此 gateway 會將節點 IP 視為 `127.0.0.1`。如果您希望顯示真實的客戶端 IP，請使用 **直接 (ws/wss)** 傳輸 (請參閱 [macOS 遠端存取](/zh-Hant/platforms/mac/remote))。

如需設定步驟，請參閱 [macOS 遠端存取](/zh-Hant/platforms/mac/remote)。如需通訊協定詳細資訊，請參閱 [Gateway 通訊協定](/zh-Hant/gateway/protocol)。

## 相關文件

- [Gateway 操作手冊](/zh-Hant/gateway)
- [Gateway (macOS)](/zh-Hant/platforms/mac/bundled-gateway)
- [macOS 權限](/zh-Hant/platforms/mac/permissions)
- [Canvas](/zh-Hant/platforms/mac/canvas)

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
