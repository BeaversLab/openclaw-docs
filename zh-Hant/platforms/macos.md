---
summary: "OpenClaw macOS 伴隨應用程式（選單列 + 閘道代理程式）"
read_when:
  - Implementing macOS app features
  - Changing gateway lifecycle or node bridging on macOS
title: "macOS 應用程式"
---

# OpenClaw macOS 伴隨程式（選單列 + 閘道代理程式）

macOS 應用程式是 OpenClaw 的 **選單列伴隨程式**。它擁有權限，
在本機管理/附加至閘道（launchd 或手動），並將 macOS
功能作為節點暴露給代理程式。

## 功能說明

- 在選單列中顯示原生通知與狀態。
- 擁有 TCC 提示權限（通知、輔助功能、螢幕錄製、麥克風、
  語音辨識、自動化/AppleScript）。
- 執行或連線至閘道（本機或遠端）。
- 暴露 macOS 專屬工具（Canvas、Camera、螢幕錄製、`system.run`）。
- 在 **遠端** 模式下啟動本機節點主機服務（launchd），並在 **本機** 模式下停止它。
- 選擇性託管 **PeekabooBridge** 以進行 UI 自動化。
- 根據要求透過 npm/pnpm 安裝全域 CLI（`openclaw`）（不建議將 bun 用於閘道執行時）。

## 本機模式與遠端模式

- **本機**（預設）：如果存在執行中的本機閘道，應用程式會附加至該閘道；
  否則它會透過 `openclaw gateway install` 啟用 launchd 服務。
- **遠端**：應用程式透過 SSH/Tailscale 連線至閘道，且永不啟動
  本機程序。
  應用程式會啟動本機 **節點主機服務**，以便遠端閘道能連線到此 Mac。
  應用程式不會將閘道衍生為子程序。

## Launchd 控制

應用程式管理標記為 `ai.openclaw.gateway` 的每個使用者 LaunchAgent
（或在 `--profile`/`OPENCLAW_PROFILE` 時使用 `ai.openclaw.<profile>`；舊版 `com.openclaw.*` 仍會卸載）。

```bash
launchctl kickstart -k gui/$UID/ai.openclaw.gateway
launchctl bootout gui/$UID/ai.openclaw.gateway
```

執行命名設定檔時，請將標籤替換為 `ai.openclaw.<profile>`。

如果未安裝 LaunchAgent，請從應用程式中啟用它，或執行
`openclaw gateway install`。

## 節點功能 (mac)

macOS 應用程式將自身呈現為一個節點。常見指令：

- Canvas：`canvas.present`、`canvas.navigate`、`canvas.eval`、`canvas.snapshot`、`canvas.a2ui.*`
- Camera：`camera.snap`、`camera.clip`
- Screen: `screen.record`
- System: `system.run`, `system.notify`

The node reports a `permissions` map so agents can decide what’s allowed.

Node service + app IPC:

- When the headless node host service is running (remote mode), it connects to the Gateway WS as a node.
- `system.run` executes in the macOS app (UI/TCC context) over a local Unix socket; prompts + output stay in-app.

Diagram (SCI):

```
Gateway -> Node Service (WS)
                 |  IPC (UDS + token + HMAC + TTL)
                 v
             Mac App (UI + TCC + system.run)
```

## Exec approvals (system.run)

`system.run` is controlled by **Exec approvals** in the macOS app (Settings → Exec approvals).
Security + ask + allowlist are stored locally on the Mac in:

```
~/.openclaw/exec-approvals.json
```

Example:

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

Notes:

- `allowlist` entries are glob patterns for resolved binary paths.
- Raw shell command text that contains shell control or expansion syntax (`&&`, `||`, `;`, `|`, `` ` ``, `$`, `<`, `>`, `(`, `)`) is treated as an allowlist miss and requires explicit approval (or allowlisting the shell binary).
- Choosing “Always Allow” in the prompt adds that command to the allowlist.
- `system.run` environment overrides are filtered (drops `PATH`, `DYLD_*`, `LD_*`, `NODE_OPTIONS`, `PYTHON*`, `PERL*`, `RUBYOPT`, `SHELLOPTS`, `PS4`) and then merged with the app’s environment.
- For shell wrappers (`bash|sh|zsh ... -c/-lc`), request-scoped environment overrides are reduced to a small explicit allowlist (`TERM`, `LANG`, `LC_*`, `COLORTERM`, `NO_COLOR`, `FORCE_COLOR`).
- 在允許清單模式下，對於始終允許的決策，已知的調度包裝器（`env`、`nice`、`nohup`、`stdbuf`、`timeout`）會保存內部可執行檔路徑而非包裝器路徑。如果解包不安全，則不會自動保存任何允許清單條目。

## Deep links

該應用程式註冊了 `openclaw://` URL scheme 以用於本機操作。

### `openclaw://agent`

觸發 Gateway `agent` 請求。

```bash
open 'openclaw://agent?message=Hello%20from%20deep%20link'
```

Query parameters:

- `message`（必填）
- `sessionKey`（選填）
- `thinking`（選填）
- `deliver` / `to` / `channel`（選填）
- `timeoutSeconds`（選填）
- `key`（選填的無人值守模式金鑰）

安全性：

- 如果沒有 `key`，應用程式會提示進行確認。
- 如果沒有 `key`，應用程式會對確認提示執行簡短訊息限制，並忽略 `deliver` / `to` / `channel`。
- 如果具有有效的 `key`，則執行將無人值守（適用於個人自動化）。

## Onboarding flow (typical)

1. 安裝並啟動 **OpenClaw.app**。
2. 完成權限檢查清單（TCC 提示）。
3. 確保 **Local** 模式處於啟用狀態，且 Gateway 正在執行。
4. 如果您需要終端機存取權，請安裝 CLI。

## State dir placement (macOS)

避免將您的 OpenClaw 狀態目錄放在 iCloud 或其他雲端同步資料夾中。
同步備份的路徑可能會增加延遲，並偶爾導致會話和憑證的檔案鎖定/同步競爭。

建議使用本機非同步狀態路徑，例如：

```bash
OPENCLAW_STATE_DIR=~/.openclaw
```

如果 `openclaw doctor` 偵測到以下位置的狀態：

- `~/Library/Mobile Documents/com~apple~CloudDocs/...`
- `~/Library/CloudStorage/...`

它將發出警告並建議移回本機路徑。

## Build & dev workflow (native)

- `cd apps/macos && swift build`
- `swift run OpenClaw`（或 Xcode）
- 封裝應用程式：`scripts/package-mac-app.sh`

## Debug gateway connectivity (macOS CLI)

使用偵錯 CLI 來執行與 macOS 應用程式相同的 Gateway WebSocket 握手和探索邏輯，而無需啟動應用程式。

```bash
cd apps/macos
swift run openclaw-mac connect --json
swift run openclaw-mac discover --timeout 3000 --json
```

連線選項：

- `--url <ws://host:port>`：覆寫設定
- `--mode <local|remote>`：從設定解析（預設：config 或 local）
- `--probe`：強制執行全新的健康檢查
- `--timeout <ms>`：請求逾時（預設：`15000`）
- `--json`：用於比對差異的結構化輸出

探索選項：

- `--include-local`：包含會被篩選為「本機」的 gateway
- `--timeout <ms>`：整體探索時間視窗（預設：`2000`）
- `--json`：用於比對差異的結構化輸出

提示：與 `openclaw gateway discover --json` 比對，以查看 macOS 應用程式的探索管道（NWBrowser + tailnet DNS‑SD 回退）是否與 Node CLI 基於 `dns-sd` 的探索不同。

## 遠端連線機制（SSH 通道）

當 macOS 應用程式以**遠端**模式執行時，它會開啟 SSH 通道，讓本機 UI 元件能夠與遠端 Gateway 通訊，就像它在 localhost 上一樣。

### 控制通道（Gateway WebSocket 連接埠）

- **用途：** 健康檢查、狀態、Web Chat、設定和其他控制平面呼叫。
- **本機連接埠：** Gateway 連接埠（預設 `18789`），始終穩定。
- **遠端連接埠：** 遠端主機上的相同 Gateway 連接埠。
- **行為：** 沒有隨機本機連接埠；應用程式會重複使用現有的健全通道，或在需要時重新啟動它。
- **SSH 形狀：** `ssh -N -L <local>:127.0.0.1:<remote>` 搭配 BatchMode + ExitOnForwardFailure + keepalive 選項。
- **IP 回報：** SSH 通道使用回傳位址，因此 gateway 會將節點 IP 視為 `127.0.0.1`。如果您希望顯示真實的用戶端 IP，請使用**直接**傳輸（請參閱 [macOS remote access](/zh-Hant/platforms/mac/remote)）。

如需設定步驟，請參閱 [macOS remote access](/zh-Hant/platforms/mac/remote)。如需通訊協定詳細資訊，請參閱 [Gateway protocol](/zh-Hant/gateway/protocol)。

## 相關文件

- [Gateway runbook](/zh-Hant/gateway)
- [Gateway (macOS)](/zh-Hant/platforms/mac/bundled-gateway)
- [macOS 權限](/zh-Hant/platforms/mac/permissions)
- [畫布](/zh-Hant/platforms/mac/canvas)

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
