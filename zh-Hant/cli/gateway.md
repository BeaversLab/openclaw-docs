---
summary: "OpenClaw Gateway CLI (`openclaw gateway`) — 執行、查詢和探索閘道"
read_when:
  - 從 CLI 執行閘道 (開發或伺服器)
  - 偵錯閘道認證、綁定模式和連線能力
  - 透過 Bonjour 探索閘道 (LAN + tailnet)
title: "gateway"
---

# Gateway CLI

Gateway 是 OpenClaw 的 WebSocket 伺服器 (頻道、節點、會話、掛鉤)。

本頁中的子指令位於 `openclaw gateway …` 之下。

相關文件：

- [/gateway/bonjour](/zh-Hant/gateway/bonjour)
- [/gateway/discovery](/zh-Hant/gateway/discovery)
- [/gateway/configuration](/zh-Hant/gateway/configuration)

## 執行 Gateway

執行本機 Gateway 程序：

```bash
openclaw gateway
```

前景別名：

```bash
openclaw gateway run
```

注意事項：

- 預設情況下，除非在 `~/.openclaw/openclaw.json` 中設定了 `gateway.mode=local`，否則 Gateway 將拒絕啟動。請對於臨時/開發執行使用 `--allow-unconfigured`。
- 未經驗證而繫結至 loopback 之外的位址會被封鎖（安全防護措施）。
- 當經過授權時，`SIGUSR1` 會觸發程序內重新啟動（`commands.restart` 預設為啟用；設定 `commands.restart: false` 可封鎖手動重新啟動，但仍允許使用 gateway tool/config apply/update）。
- `SIGINT`/`SIGTERM` 處理程式會停止 gateway 程序，但它們不會復原任何自訂終端機狀態。如果您用 TUI 或原始模式輸入包裝 CLI，請在結束前復原終端機。

### 選項

- `--port <port>`：WebSocket 連接埠（預設值來自 config/env；通常是 `18789`）。
- `--bind <loopback|lan|tailnet|auto|custom>`：監聽器綁定模式。
- `--auth <token|password>`：驗證模式覆蓋。
- `--token <token>`：權杖覆蓋（同時為進程設定 `OPENCLAW_GATEWAY_TOKEN`）。
- `--password <password>`：密碼覆蓋。警告：內嵌密碼可能會在本地進程列表中暴露。
- `--password-file <path>`：從檔案讀取閘道密碼。
- `--tailscale <off|serve|funnel>`：透過 Tailscale 公開閘道。
- `--tailscale-reset-on-exit`：在關機時重設 Tailscale serve/funnel 設定。
- `--allow-unconfigured`：允許在設定中沒有 `gateway.mode=local` 的情況下啟動閘道。
- `--dev`：如果缺少，則建立開發設定 + 工作區（跳過 BOOTSTRAP.md）。
- `--reset`：重置開發設定 + 憑證 + 工作階段 + 工作區（需要 `--dev`）。
- `--force`：在啟動前終止選定連接埠上任何現有的監聽器。
- `--verbose`：詳細日誌。
- `--claude-cli-logs`：僅在主控台顯示 claude-cli 日誌（並啟用其 stdout/stderr）。
- `--ws-log <auto|full|compact>`：websocket 日誌樣式（預設為 `auto`）。
- `--compact`：`--ws-log compact` 的別名。
- `--raw-stream`：將原始模型串流事件記錄到 l。
- `--raw-stream-path <path>`：原始串流 l 路徑。

## 查詢運行中的 Gateway

所有查詢指令都使用 WebSocket RPC。

輸出模式：

- 預設：人類可讀格式（在 TTY 中為彩色）。
- `--json`：機器可讀的 JSON（無樣式/載入動畫）。
- `--no-color` (或 `NO_COLOR=1`)：停用 ANSI 同時保留人類版面配置。

共用選項 (如支援)：

- `--url <url>`：Gateway WebSocket URL。
- `--token <token>`：Gateway 權杖。
- `--password <password>`：Gateway 密碼。
- `--timeout <ms>`：逾時/預算 (依指令而異)。
- `--expect-final`：等待「最終」回應 (agent 呼叫)。

注意：當您設定 `--url` 時，CLI 不會退回使用設定檔或環境憑證。
請明確傳遞 `--token` 或 `--password`。缺少明確憑證即為錯誤。

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

- `--url <url>`：覆寫探測 URL。
- `--token <token>`：探測的 token 認證。
- `--password <password>`：探測的密碼認證。
- `--timeout <ms>`：探測逾時 (預設 `10000`)。
- `--no-probe`：跳過 RPC 探測 (僅服務檢視)。
- `--deep`：也掃描系統層級的服務。
- `--require-rpc`：當 RPC 探測失敗時以非零值結束。不能與 `--no-probe` 結合使用。

備註：

- `gateway status` 會在可能時為探測認證解析已設定的 auth SecretRefs。
- 如果此指令路徑中所需的 auth SecretRef 未解析，當探查連線/授權失敗時，`gateway status --json` 會回報 `rpc.authWarning`；請明確傳遞 `--token`/`--password` 或先解析 secret 來源。
- 如果探查成功，未解析的 auth-ref 警告將會被隱藏，以避免誤報。
- 當僅有聆聽服務不足且您需要 Gateway RPC 本身處於健康狀態時，請在腳本和自動化作業中使用 `--require-rpc`。
- 在 Linux systemd 安裝中，服務授權漂移檢查會從單元讀取 `Environment=` 和 `EnvironmentFile=` 值（包括 `%h`、帶引號的路徑、多個檔案以及可選的 `-` 檔案）。

### `gateway probe`

`gateway probe` 是「偵錯所有項目」的指令。它總是會探查：

- 您設定的遠端閘道（若有設定），以及
- localhost（迴路）**即使已設定遠端閘道**。

如果有多個閘道可連接，它會將其全部印出。當您使用獨立的設定檔/連接埠（例如救援機器人）時，支援多個閘道，但大多數安裝仍會執行單一閘道。

```bash
openclaw gateway probe
openclaw gateway probe --json
```

解讀：

- `Reachable: yes` 表示至少有一個目標接受了 WebSocket 連線。
- `RPC: ok` 表示詳細的 RPC 呼叫（`health`/`status`/`system-presence`/`config.get`）也成功。
- `RPC: limited - missing scope: operator.read` 表示連線成功，但詳細 RPC 受到範圍限制。這會被回報為 **部分降級** 的連線能力，而非完全失敗。
- 僅當沒有探測到的目標可連線時，結束代碼才為非零。

JSON 註解 (`--json`)：

- 頂層：
  - `ok`：至少有一個目標可連線。
  - `degraded`：至少有一個目標具有範圍限制的詳細資訊 RPC。
- 每個目標 (`targets[].connect`)：
  - `ok`：連線後的可連線性 + 降級分類。
  - `rpcOk`：完整詳細資訊 RPC 成功。
  - `scopeLimited`：由於缺少操作員範圍，詳細資訊 RPC 失敗。

#### 透過 SSH 遠端 (Mac app parity)

macOS 應用程式的「透過 SSH 遠端」模式使用本地連接埠轉送，因此遠端閘道 (可能僅綁定至 loopback) 可在 `ws://127.0.0.1:<port>` 連線。

CLI 對等項目：

```bash
openclaw gateway probe --ssh user@gateway-host
```

選項：

- `--ssh <target>`: `user@host` 或 `user@host:port`（連接埠預設為 `22`）。
- `--ssh-identity <path>`：身分識別檔案。
- `--ssh-auto`：選擇第一個探索到的 Gateway 主機作為 SSH 目標（僅限 LAN/WAB）。

組態（選用，用作預設值）：

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
- 當 token auth 需要 token 且 `gateway.auth.token` 由 SecretRef 管理時，`gateway install` 會驗證 SecretRef 是否可解析，但不會將解析後的 token 保存到服務環境元數據中。
- 如果 token auth 需要 token 且設定的 token SecretRef 無法解析，安裝將會失敗關閉，而不是保存後備純文本。
- 對於 `gateway run` 上的密碼認證，比起內聯 `--password`，優先選擇 `OPENCLAW_GATEWAY_PASSWORD`、`--password-file` 或 SecretRef 支援的 `gateway.auth.password`。
- 在推斷認證模式下，僅限 shell 的 `OPENCLAW_GATEWAY_PASSWORD`/`CLAWDBOT_GATEWAY_PASSWORD` 不會放寬安裝 token 的要求；安裝受管服務時，請使用持久化配置（`gateway.auth.password` 或 config `env`）。
- 如果同時配置了 `gateway.auth.token` 和 `gateway.auth.password` 且未設定 `gateway.auth.mode`，安裝將會被阻止，直到明確設定模式。
- 生命週期指令接受 `--json` 以用於腳本撰寫。

## 探索 Gateway (Bonjour)

`gateway discover` 會掃描 Gateway 訊標 (`_openclaw-gw._tcp`)。

- 多播 DNS-SD：`local.`
- 單播 DNS-SD (廣域 Bonjour)：選擇一個網域 (例如：`openclaw.internal.`) 並設定分流 DNS + DNS 伺服器；請參閱 [/gateway/bonjour](/zh-Hant/gateway/bonjour)

只有啟用了 Bonjour 探索功能 (預設) 的 Gateway 才會廣播訊標。

廣域探索記錄包括 (TXT)：

- `role` (Gateway 角色提示)
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
- `--json`：機器可讀輸出 (同時停用樣式/載入動畫)。

範例：

```bash
openclaw gateway discover --timeout 4000
openclaw gateway discover --json | jq '.beacons[].wsUrl'
```

import en from "/components/footer/en.mdx";

<en />
