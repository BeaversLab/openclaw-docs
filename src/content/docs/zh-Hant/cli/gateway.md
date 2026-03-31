---
summary: "OpenClaw Gateway CLI (`openclaw gateway`) — 執行、查詢及探索閘道"
read_when:
  - Running the Gateway from the CLI (dev or servers)
  - Debugging Gateway auth, bind modes, and connectivity
  - Discovering gateways via Bonjour (LAN + tailnet)
title: "閘道"
---

# Gateway CLI

Gateway 是 OpenClaw 的 WebSocket 伺服器（頻道、節點、工作階段、鉤子）。

本頁面的子指令位於 `openclaw gateway …` 之下。

相關文件：

- [/gateway/bonjour](/en/gateway/bonjour)
- [/gateway/discovery](/en/gateway/discovery)
- [/gateway/configuration](/en/gateway/configuration)

## 執行 Gateway

執行本機 Gateway 程序：

```bash
openclaw gateway
```

前景別名：

```bash
openclaw gateway run
```

備註：

- 預設情況下，除非在 `~/.openclaw/openclaw.json` 中設定了 `gateway.mode=local`，否則 Gateway 會拒絕啟動。請使用 `--allow-unconfigured` 進行臨時/開發執行。
- 未經授權而繫結至 loopback 以外的位址會被封鎖（安全防護）。
- 當獲得授權時，`SIGUSR1` 會觸發程序內重啟（`commands.restart` 預設為啟用；設定 `commands.restart: false` 可封鎖手動重啟，但仍允許 gateway tool/config apply/update）。
- `SIGINT`/`SIGTERM` 處理程序會停止 gateway 程序，但不會恢復任何自訂終端機狀態。如果您使用 TUI 或原始模式輸入來包裝 CLI，請在結束前恢復終端機。

### 選項

- `--port <port>`：WebSocket 連接埠（預設值來自設定/環境變數；通常為 `18789`）。
- `--bind <loopback|lan|tailnet|auto|custom>`：監聽器繫結模式。
- `--auth <token|password>`：授權模式覆寫。
- `--token <token>`：權杖覆寫（同時會為程序設定 `OPENCLAW_GATEWAY_TOKEN`）。
- `--password <password>`：密碼覆寫。警告：內聯密碼可能會暴露在本機程序列表中。
- `--password-file <path>`：從檔案讀取 gateway 密碼。
- `--tailscale <off|serve|funnel>`：透過 Tailscale 公開 Gateway。
- `--tailscale-reset-on-exit`：在關機時重設 Tailscale serve/funnel 設定。
- `--allow-unconfigured`：允許在設定中沒有 `gateway.mode=local` 的情況下啟動 gateway。
- `--dev`：如果缺少，則建立開發設定 + 工作區（跳過 BOOTSTRAP.md）。
- `--reset`：重設開發設定 + 憑證 + 會話 + 工作區（需要 `--dev`）。
- `--force`：在啟動前終止選定連接埠上任何現有的監聽程式。
- `--verbose`：詳細記錄。
- `--cli-backend-logs`：僅在主控台中顯示 CLI 後端日誌（並啟用 stdout/stderr）。
- `--claude-cli-logs`：`--cli-backend-logs` 的已棄用別名。
- `--ws-log <auto|full|compact>`：websocket 日誌樣式（預設為 `auto`）。
- `--compact`：`--ws-log compact` 的別名。
- `--raw-stream`：將原始模型串流事件記錄至 l。
- `--raw-stream-path <path>`：原始串流 l 路徑。

## 查詢執行中的 Gateway

所有查詢指令皆使用 WebSocket RPC。

輸出模式：

- 預設：人類可讀（在 TTY 中著色）。
- `--json`：機器可讀的 JSON（無樣式/載入動畫）。
- `--no-color` (or `NO_COLOR=1`): 停用 ANSI 但保留人類可讀佈局。

共享選項 (於支援時)：

- `--url <url>`: Gateway WebSocket URL。
- `--token <token>`: Gateway 權杖。
- `--password <password>`: Gateway 密碼。
- `--timeout <ms>`: 逾時/預算 (依指令而異)。
- `--expect-final`: 等待「最終」回應 (agent 呼叫)。

注意：當您設定 `--url` 時，CLI 不會回退至設定檔或環境認證資訊。
請明確傳遞 `--token` 或 `--password`。缺少明確認證資訊將視為錯誤。

### `gateway health`

```bash
openclaw gateway health --url ws://127.0.0.1:18789
```

### `gateway status`

`gateway status` 會顯示 Gateway 服務 (launchd/systemd/schtasks) 以及選用的 RPC 探測。

```bash
openclaw gateway status
openclaw gateway status --json
openclaw gateway status --require-rpc
```

選項：

- `--url <url>`：覆寫探查 URL。
- `--token <token>`：探查的 token 認證。
- `--password <password>`：探查的密碼認證。
- `--timeout <ms>`：探查逾時（預設 `10000`）。
- `--no-probe`：跳過 RPC 探查（僅限服務檢視）。
- `--deep`：一併掃描系統層級的服務。
- `--require-rpc`：當 RPC 探查失敗時以非零狀態碼結束。不能與 `--no-probe` 混用。

備註：

- `gateway status` 會在可能的情況下解析已設定的認證 SecretRefs 以用於探查認證。
- 如果在該指令路徑中所需的 auth SecretRef 未解析，當探查連線/授權失敗時，`gateway status --json` 會回報 `rpc.authWarning`；請明確傳遞 `--token`/`--password` 或先解析密碼來源。
- 如果探查成功，將會隱藏未解析的 auth-ref 警告以避免誤報。
- 在腳本和自動化中使用 `--require-rpc`，當僅有監聽服務不足且您需要 Gateway RPC 本身健康時。
- 在 Linux systemd 安裝上，服務授權漂移檢查會從單元讀取 `Environment=` 和 `EnvironmentFile=` 值（包括 `%h`、引號路徑、多個檔案和可選的 `-` 檔案）。

### `gateway probe`

`gateway probe` 是「除錯所有項目」的指令。它總是會探測：

- 您設定的遠端 gateway（如果有設定），以及
- localhost（loopback）**即使已設定遠端**。

如果有多個 gateway 可連線，它會將全部印出來。當您使用隔離的設定檔/埠（例如救援機器人）時，支援多個 gateway，但大多數安裝仍僅執行單一 gateway。

```bash
openclaw gateway probe
openclaw gateway probe --json
```

解讀方式：

- `Reachable: yes` 表示至少有一個目標接受了 WebSocket 連線。
- `RPC: ok` 表示詳細的 RPC 呼叫（`health`/`status`/`system-presence`/`config.get`）也成功。
- `RPC: limited - missing scope: operator.read` 表示連線成功但詳細 RPC 受到範圍限制。這會被回報為 **degraded**（部分降級）的連線能力，而非完全失敗。
- 只有在無法連接任何探測目標時，結束代碼才會是非零值。

JSON 備註 (`--json`)：

- 頂層：
  - `ok`：至少有一個目標可以連接。
  - `degraded`：至少有一個目標具有範圍受限的詳細資訊 RPC。
- 每個目標 (`targets[].connect`)：
  - `ok`：連接後的可達性 + 降級分類。
  - `rpcOk`：完整詳細資訊 RPC 成功。
  - `scopeLimited`：詳細資訊 RPC 因缺少操作員範圍而失敗。

#### 透過 SSH 遠端連線 (Mac 應用程式同等功能)

macOS 應用程式的「透過 SSH 遠端連線」模式使用本地連接埠轉發，因此遠端閘道 (可能僅綁定到 loopback) 可以在 `ws://127.0.0.1:<port>` 連接。

CLI 等效指令：

```bash
openclaw gateway probe --ssh user@gateway-host
```

選項：

- `--ssh <target>`：`user@host` 或 `user@host:port`（連接埠預設為 `22`）。
- `--ssh-identity <path>`：身分識別檔案。
- `--ssh-auto`：選擇第一個探索到的 gateway 主機作為 SSH 目標（僅限 LAN/WAB）。

設定（選用，用作預設值）：

- `gateway.remote.sshTarget`
- `gateway.remote.sshIdentity`

### `gateway call <method>`

低層級 RPC 輔助工具。

```bash
openclaw gateway call status
openclaw gateway call logs.tail --params '{"sinceMs": 60000}'
```

## 管理 Gateway 服務

```bash
openclaw gateway install
openclaw gateway start
openclaw gateway stop
openclaw gateway restart
openclaw gateway uninstall
```

備註：

- `gateway install` 支援 `--port`、`--runtime`、`--token`、`--force`、`--json`。
- 當 token auth 需要 token 且 `gateway.auth.token` 由 SecretRef 管理時，`gateway install` 會驗證 SecretRef 是否可解析，但不會將解析出的 token 持久化到服務環境元數據中。
- 如果 token auth 需要 token 且配置的 token SecretRef 未解析，安裝將失敗關閉，而不是持久化回退純文本。
- 對於 `gateway run` 上的密碼認證，優先選擇 `OPENCLAW_GATEWAY_PASSWORD`、`--password-file` 或 SecretRef 支持的 `gateway.auth.password`，而不是內聯 `--password`。
- 在推斷認證模式下，僅限 shell 的 `OPENCLAW_GATEWAY_PASSWORD` 不會放寬安裝 token 要求；在安裝託管服務時，請使用持久化配置（`gateway.auth.password` 或 config `env`）。
- 如果同時配置了 `gateway.auth.token` 和 `gateway.auth.password` 且未設定 `gateway.auth.mode`，則安裝將被阻止，直到明確設定模式。
- 生命週期指令接受 `--json` 以用於腳本。

## 探索 Gateway (Bonjour)

`gateway discover` 掃描 Gateway 信標 (`_openclaw-gw._tcp`)。

- 多播 DNS-SD：`local.`
- 單播 DNS-SD (廣域 Bonjour)：選擇一個網域 (例如：`openclaw.internal.`) 並設定分離 DNS + DNS 伺服器；參閱 [/gateway/bonjour](/en/gateway/bonjour)

只有啟用了 Bonjour 探索功能的 gateway (預設) 才會廣播信標。

廣域探索記錄包含 (TXT)：

- `role` (gateway 角色提示)
- `transport` (傳輸提示，例如 `gateway`)
- `gatewayPort` (WebSocket 連接埠，通常為 `18789`)
- `sshPort` (SSH 連接埠；若不存在則預設為 `22`)
- `tailnetDns` (MagicDNS 主機名稱，當可用時)
- `gatewayTls` / `gatewayTlsSha256` (已啟用 TLS + 憑證指紋)
- `cliPath` (遠端安裝的可選提示)

### `gateway discover`

```bash
openclaw gateway discover
```

選項：

- `--timeout <ms>`：每個指令的逾時時間 (瀏覽/解析)；預設為 `2000`。
- `--json`：機器可讀輸出 (也會停用樣式/載入動畫)。

範例：

```bash
openclaw gateway discover --timeout 4000
openclaw gateway discover --json | jq '.beacons[].wsUrl'
```
