---
summary: "OpenClaw macOS 伴隨應用程式（選單列 + 閘道代理程式）"
read_when:
  - 實作 macOS 應用程式功能
  - 變更 macOS 上的閘道生命週期或節點橋接
title: "macOS 應用程式"
---

# OpenClaw macOS 伴隨程式（選單列 + 閘道代理程式）

macOS 應用程式是 OpenClaw 的 **選單列伴隨程式**。它擁有權限，
在本機管理/附加至閘道（launchd 或手動），並將 macOS
功能作為節點暴露給代理程式。

## 功能

- 在選單列中顯示原生通知與狀態。
- 擁有 TCC 提示（通知、輔助功能、螢幕錄製、麥克風、
  語音辨識、自動化/AppleScript）。
- 執行或連接至閘道（本機或遠端）。
- 揭露 macOS 專屬工具（Canvas、Camera、螢幕錄製、`system.run`）。
- 在 **遠端** 模式下啟動本機節點主機服務（launchd），並在 **本機** 模式下停止它。
- 選擇性地託管 **PeekabooBridge** 以進行 UI 自動化。
- 根據請求透過 npm/pnpm 安裝全域 CLI（`openclaw`）（不建議將 bun 用於閘道執行時期）。

## 本機模式與遠端模式

- **本機**（預設）：如果存在正在執行的本機閘道，應用程式會附加至該閘道；
  否則會透過 `openclaw gateway install` 啟用 launchd 服務。
- **遠端**：應用程式透過 SSH/Tailscale 連線至閘道，且永不啟動
  本機處理程序。
  應用程式會啟動本機 **節點主機服務**，以便遠端閘道能連接至此 Mac。
  應用程式不會將閘道作為子處理程序產生。

## Launchd 控制

應用程式管理一個標籤為 `ai.openclaw.gateway` 的每個使用者 LaunchAgent
（或當使用 `--profile`/`OPENCLAW_PROFILE` 時為 `ai.openclaw.<profile>`；舊版 `com.openclaw.*` 仍會卸載）。

```bash
launchctl kickstart -k gui/$UID/ai.openclaw.gateway
launchctl bootout gui/$UID/ai.openclaw.gateway
```

執行命名設定檔時，請將標籤替換為 `ai.openclaw.<profile>`。

若未安裝 LaunchAgent，請從應用程式啟用它，或執行
`openclaw gateway install`。

## 節點功能

macOS 應用程式將自身呈現為節點。常見指令：

- Canvas：`canvas.present`、`canvas.navigate`、`canvas.eval`、`canvas.snapshot`、`canvas.a2ui.*`
- Camera：`camera.snap`、`camera.clip`
- 螢幕：`screen.record`
- 系統：`system.run`, `system.notify`

節點會回報 `permissions` 映射，以便 Agent 決定允許執行的操作。

節點服務 + 應用程式 IPC：

- 當無介面節點主機服務正在執行時（遠端模式），它會作為節點連線到 Gateway WS。
- `system.run` 透過本機 Unix socket 在 macOS 應用程式中執行（UI/TCC 語境）；提示與輸出會保留在應用程式內。

圖表 (SCI)：

```
Gateway -> Node Service (WS)
                 |  IPC (UDS + token + HMAC + TTL)
                 v
             Mac App (UI + TCC + system.run)
```

## 執行核准

`system.run` 由 macOS 應用程式中的「執行核准」控制（設定 → 執行核准）。
安全性 + 詢問 + 允許清單會儲存在 Mac 的本機位置：

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

- `allowlist` 項目是已解析二進位路徑的 glob 模式。
- 包含 shell 控制或擴充語法（`&&`, `||`, `;`, `|`, `` ` ``, `$`, `<`, `>`, `(`, `)`) 的原始 shell 指令文字會被視為不符合允許清單，並且需要明確核准（或是將 shell 二進位檔加入允許清單）。
- 在提示中選擇「一律允許」會將該指令加入允許清單。
- `system.run` 環境變數覆寫會經過篩選（捨棄 `PATH`, `DYLD_*`, `LD_*`, `NODE_OPTIONS`, `PYTHON*`, `PERL*`, `RUBYOPT`, `SHELLOPTS`, `PS4`），然後再與應用程式的環境合併。
- 對於 shell 包裝器（`bash|sh|zsh ... -c/-lc`），請求範圍的環境變數覆寫會縮減為一小部分明確的允許清單（`TERM`, `LANG`, `LC_*`, `COLORTERM`, `NO_COLOR`, `FORCE_COLOR`）。
- 在允許清單模式下，對於「一律允許」的決定，已知的分發包裝器（`env`、`nice`、`nohup`、`stdbuf`、`timeout`）會保存內部可執行檔路徑，而不是包裝器路徑。如果解包不安全，則不會自動保存允許清單條目。

## 深層連結

應用程式註冊了 `openclaw://` URL scheme 用於本機操作。

### `openclaw://agent`

觸發 Gateway `agent` 請求。

```bash
open 'openclaw://agent?message=Hello%20from%20deep%20link'
```

查詢參數：

- `message` (必要)
- `sessionKey` (選用)
- `thinking` (選用)
- `deliver` / `to` / `channel` (選用)
- `timeoutSeconds` (選用)
- `key` (選用無人值守模式金鑰)

安全性：

- 如果沒有 `key`，應用程式會提示確認。
- 如果沒有 `key`，應用程式會對確認提示執行簡短訊息限制，並忽略 `deliver` / `to` / `channel`。
- 如果具有有效的 `key`，則該執行為無人值守（適用於個人自動化）。

## 上線流程（典型）

1. 安裝並啟動 **OpenClaw.app**。
2. 完成權限檢查清單（TCC 提示）。
3. 確保 **Local** 模式已啟用且 Gateway 正在執行。
4. 如果您想要終端機存取權限，請安裝 CLI。

## 狀態目錄位置 (macOS)

請避免將您的 OpenClaw 狀態目錄放在 iCloud 或其他雲端同步資料夾中。
同步支援的路徑可能會增加延遲，並偶爾導致工作階段和認證的檔案鎖定/同步競爭。

建議使用本機非同步的狀態路徑，例如：

```bash
OPENCLAW_STATE_DIR=~/.openclaw
```

如果 `openclaw doctor` 偵測到狀態位於：

- `~/Library/Mobile Documents/com~apple~CloudDocs/...`
- `~/Library/CloudStorage/...`

它會發出警告並建議移回本機路徑。

## 建置與開發工作流程 (原生)

- `cd apps/macos && swift build`
- `swift run OpenClaw` (或 Xcode)
- 打包應用程式：`scripts/package-mac-app.sh`

## 除錯 Gateway 連線 (macOS CLI)

使用除錯 CLI 來測試 macOS 應用程式所使用的相同 Gateway WebSocket 握手與探索邏輯，而無需啟動應用程式。

```bash
cd apps/macos
swift run openclaw-mac connect --json
swift run openclaw-mac discover --timeout 3000 --json
```

連線選項：

- `--url <ws://host:port>`：覆寫設定
- `--mode <local|remote>`：從設定解析（預設：config 或 local）
- `--probe`：強制重新進行健康檢查
- `--timeout <ms>`：請求逾時（預設：`15000`）
- `--json`：用於比對的結構化輸出

探索選項：

- `--include-local`：包含會被篩選為「本地」的 gateway
- `--timeout <ms>`：整體探索時間視窗（預設：`2000`）
- `--json`：用於比對的結構化輸出

提示：請與 `openclaw gateway discover --json` 進行比對，以查看 macOS 應用程式的探索管道（NWBrowser + tailnet DNS‑SD 回退機制）是否與 Node CLI 的 `dns-sd` 探索機制不同。

## 遠端連線管線（SSH 通道）

當 macOS 應用程式以 **遠端** 模式執行時，它會開啟 SSH 通道，讓本機 UI 元件能夠與遠端 Gateway 通訊，就像它在 localhost 上一樣。

### 控制通道（Gateway WebSocket 連接埠）

- **用途：** 健康檢查、狀態、Web Chat、設定以及其他控制平面呼叫。
- **本機連接埠：** Gateway 連接埠（預設為 `18789`），始終保持穩定。
- **遠端連接埠：** 遠端主機上的相同 Gateway 連接埠。
- **行為：** 沒有隨機的本機連接埠；應用程式會重複使用現有的健康通道，或視需要重新啟動它。
- **SSH 形式：** `ssh -N -L <local>:127.0.0.1:<remote>`，搭配 BatchMode + ExitOnForwardFailure + keepalive 選項。
- **IP 回報：** SSH 通道使用 loopback，因此 gateway 將會看到節點 IP 為 `127.0.0.1`。如果您希望顯示真實的用戶端 IP，請使用 **直接** 傳輸（詳見 [macOS 遠端存取](/zh-Hant/platforms/mac/remote)）。

如需設定步驟，請參閱 [macOS 遠端存取](/zh-Hant/platforms/mac/remote)。如需通訊協定詳細資訊，請參閱 [Gateway 通訊協定](/zh-Hant/gateway/protocol)。

## 相關文件

- [Gateway 操作手冊](/zh-Hant/gateway)
- [Gateway (macOS)](/zh-Hant/platforms/mac/bundled-gateway)
- [macOS 權限](/zh-Hant/platforms/mac/permissions)
- [Canvas](/zh-Hant/platforms/mac/canvas)

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
