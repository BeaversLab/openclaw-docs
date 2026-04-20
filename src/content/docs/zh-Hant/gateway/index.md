---
summary: "Gateway 服務、生命週期與操作手冊"
read_when:
  - Running or debugging the gateway process
title: "Gateway 手冊"
---

# Gateway runbook

使用此頁面進行 Gateway 服務的第一天啟動和第二天操作。

<CardGroup cols={2}>
  <Card title="深度疑難排解" icon="siren" href="/zh-Hant/gateway/troubleshooting">
    透過精確的命令階層與日誌特徵進行症狀優先診斷。
  </Card>
  <Card title="組態" icon="sliders" href="/zh-Hant/gateway/configuration">
    以任務為導向的設定指南 + 完整組態參考。
  </Card>
  <Card title="機密管理" icon="key-round" href="/zh-Hant/gateway/secrets">
    SecretRef 合約、執行時段快照行為，以及遷移/重新載入作業。
  </Card>
  <Card title="Secrets 計畫合約" icon="shield-check" href="/zh-Hant/gateway/secrets-plan-contract">
    精確的 `secrets apply` 目標/路徑規則，以及僅限參考的 auth-profile 行為。
  </Card>
</CardGroup>

## 5 分鐘本地啟動

<Steps>
  <Step title="啟動 Gateway">

```bash
openclaw gateway --port 18789
# debug/trace mirrored to stdio
openclaw gateway --port 18789 --verbose
# force-kill listener on selected port, then start
openclaw gateway --force
```

  </Step>

  <Step title="驗證服務健康狀態">

```bash
openclaw gateway status
openclaw status
openclaw logs --follow
```

健康基準：`Runtime: running` 和 `RPC probe: ok`。

  </Step>

  <Step title="驗證通道就緒狀態">

```bash
openclaw channels status --probe
```

若 gateway 可連線，這將執行即時的每帳戶通道探測與選用稽核。
如果 gateway 無法連線，CLI 將改回退至僅設定的通道摘要，
而非即時探測輸出。

  </Step>
</Steps>

<Note>Gateway 設定重新載入會監看作用中的設定檔路徑（解析自 profile/state 預設值，或設定時的 `OPENCLAW_CONFIG_PATH`）。 預設模式為 `gateway.reload.mode="hybrid"`。 在首次成功載入後，執行中的程序會提供作用中的記憶體內設定快照；成功重新載入會以原子方式替換該快照。</Note>

## 執行時模型

- 單一恆運行程序用於路由、控制平面與通道連線。
- 單一多工連接埠用於：
  - WebSocket 控制/RPC
  - HTTP API，OpenAI 相容（`/v1/models`、`/v1/embeddings`、`/v1/chat/completions`、`/v1/responses`、`/tools/invoke`）
  - 控制 UI 與 hooks
- 預設綁定模式：`loopback`。
- 預設需要認證。共享金鑰設定使用
  `gateway.auth.token` / `gateway.auth.password`（或
  `OPENCLAW_GATEWAY_TOKEN` / `OPENCLAW_GATEWAY_PASSWORD`），而非回環
  反向代理設定可使用 `gateway.auth.mode: "trusted-proxy"`。

## OpenAI 相容端點

OpenClaw 影響力最大的相容層面現為：

- `GET /v1/models`
- `GET /v1/models/{id}`
- `POST /v1/embeddings`
- `POST /v1/chat/completions`
- `POST /v1/responses`

為何此組合很重要：

- 大多數 Open WebUI、LobeChat 和 LibreChat 整合會先探測 `/v1/models`。
- 許多 RAG 和記憶體管線期望 `/v1/embeddings`。
- Agent 原生客戶端越來越偏好 `/v1/responses`。

規劃備註：

- `/v1/models` 是以代理為優先的：它返回 `openclaw`、`openclaw/default` 和 `openclaw/<agentId>`。
- `openclaw/default` 是一個穩定的別名，始終映射到配置的預設代理。
- 當您想要後端提供者/模型覆蓋時使用 `x-openclaw-model`；否則，所選代理的正常模型和嵌入設置將保持控制。

所有這些都運行在主 Gateway 埠上，並使用與 Gateway HTTP API 其餘部分相同的受信任操作員認證邊界。

### 埠和綁定優先級

| 設置       | 解析順序                                                      |
| ---------- | ------------------------------------------------------------- |
| Gateway 埠 | `--port` → `OPENCLAW_GATEWAY_PORT` → `gateway.port` → `18789` |
| 綁定模式   | CLI/override → `gateway.bind` → `loopback`                    |

### 熱重載模式

| `gateway.reload.mode` | 行為                         |
| --------------------- | ---------------------------- |
| `off`                 | 無配置重載                   |
| `hot`                 | 僅套用熱安全更改             |
| `restart`             | 在需要重載的更改時重新啟動   |
| `hybrid` (預設)       | 安全時熱套用，需要時重新啟動 |

## 操作員命令集

```bash
openclaw gateway status
openclaw gateway status --deep   # adds a system-level service scan
openclaw gateway status --json
openclaw gateway install
openclaw gateway restart
openclaw gateway stop
openclaw secrets reload
openclaw logs --follow
openclaw doctor
```

`gateway status --deep` 用於額外的服務發現 (LaunchDaemons/systemd 系統單元/schtasks)，而不是更深入的 RPC 健康探測。

## 多個 Gateway (同一主機)

大多數安裝應該在每台機器上運行一個 Gateway。單個 Gateway 可以託管多個代理和通道。

僅當您有意想要隔離或救援機器人時，才需要多個 Gateway。

有用的檢查：

```bash
openclaw gateway status --deep
openclaw gateway probe
```

預期情況：

- 當過時的 launchd/systemd/schtasks 安裝仍然存在時，`gateway status --deep` 可以報告 `Other gateway-like services detected (best effort)` 並列印清理提示。
- 當多個目標回應時，`gateway probe` 可以警告 `multiple reachable gateways`。
- 如果這是有意的，請為每個 Gateway 隔離埠、配置/狀態和工作區根目錄。

詳細設置：[/gateway/multiple-gateways](/zh-Hant/gateway/multiple-gateways)。

## 遠端存取

首選：Tailscale/VPN。
備選：SSH 通道。

```bash
ssh -N -L 18789:127.0.0.1:18789 user@host
```

然後在本地將客戶端連接到 `ws://127.0.0.1:18789`。

<Warning>SSH 隧道不會繞過 Gateway 驗證。對於共享金鑰驗證，客戶端仍然 必須透過隧道發送 `token`/`password`。對於身分驗證模式， 請求仍必須滿足該驗證路徑。</Warning>

請參閱：[遠端 Gateway](/zh-Hant/gateway/remote)、[驗證](/zh-Hant/gateway/authentication)、[Tailscale](/zh-Hant/gateway/tailscale)。

## 監督與服務生命週期

請使用監督執行以獲得類似生產環境的可靠性。

<Tabs>
  <Tab title="macOS (launchd)">

```bash
openclaw gateway install
openclaw gateway status
openclaw gateway restart
openclaw gateway stop
```

LaunchAgent 標籤為 `ai.openclaw.gateway` (預設) 或 `ai.openclaw.<profile>` (命名設定檔)。`openclaw doctor` 會稽核並修復服務設定偏移。

  </Tab>

  <Tab title="Linux (systemd user)">

```bash
openclaw gateway install
systemctl --user enable --now openclaw-gateway[-<profile>].service
openclaw gateway status
```

若要在登出後保持運作，請啟用 linger 功能：

```bash
sudo loginctl enable-linger <user>
```

當您需要自訂安裝路徑時的手動使用者單元範例：

```ini
[Unit]
Description=OpenClaw Gateway
After=network-online.target
Wants=network-online.target

[Service]
ExecStart=/usr/local/bin/openclaw gateway --port 18789
Restart=always
RestartSec=5
TimeoutStopSec=30
TimeoutStartSec=30
SuccessExitStatus=0 143
KillMode=control-group

[Install]
WantedBy=default.target
```

  </Tab>

  <Tab title="Windows (原生)">

```powershell
openclaw gateway install
openclaw gateway status --json
openclaw gateway restart
openclaw gateway stop
```

原生 Windows 管理啟動使用名為 `OpenClaw Gateway`
(或命名設定檔的 `OpenClaw Gateway (<profile>)`) 的排程任務。如果建立排程任務
被拒絕，OpenClaw 將回退到指向
狀態目錄內 `gateway.cmd` 的個別使用者啟動資料夾啟動器。

  </Tab>

  <Tab title="Linux (系統服務)">

請為多使用者/常時主機使用系統單元。

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now openclaw-gateway[-<profile>].service
```

使用與使用者單元相同的服務主體，但將其安裝在
`/etc/systemd/system/openclaw-gateway[-<profile>].service` 下方，如果您的 `openclaw` 二進位檔位於其他位置，請調整
`ExecStart=`。

  </Tab>
</Tabs>

## 單一主機上的多個 Gateway

大多數設定應該執行 **一個** Gateway。
僅在嚴格的隔離/備援需求時使用多個 (例如救援設定檔)。

每個執行個體的檢查清單：

- 唯一的 `gateway.port`
- 唯一的 `OPENCLAW_CONFIG_PATH`
- 唯一 `OPENCLAW_STATE_DIR`
- 唯一 `agents.defaults.workspace`

範例：

```bash
OPENCLAW_CONFIG_PATH=~/.openclaw/a.json OPENCLAW_STATE_DIR=~/.openclaw-a openclaw gateway --port 19001
OPENCLAW_CONFIG_PATH=~/.openclaw/b.json OPENCLAW_STATE_DIR=~/.openclaw-b openclaw gateway --port 19002
```

請參閱：[多個閘道](/zh-Hant/gateway/multiple-gateways)。

### 開發設定檔快速路徑

```bash
openclaw --dev setup
openclaw --dev gateway --allow-unconfigured
openclaw --dev status
```

預設值包括獨立的狀態/設定和基底閘道連接埠 `19001`。

## 協定快速參考（操作員檢視）

- 第一個客戶端框架必須是 `connect`。
- 閘道返回 `hello-ok` 快照 (`presence`、`health`、`stateVersion`、`uptimeMs`、限制/原則)。
- `hello-ok.features.methods` / `events` 是一個保守的探索列表，
  並非每個可呼叫輔助路由的生成傾印。
- 請求：`req(method, params)` → `res(ok/payload|error)`。
- 常見事件包括 `connect.challenge`、`agent`、`chat`、
  `session.message`、`session.tool`、`sessions.changed`、`presence`、`tick`、
  `health`、`heartbeat`、配對/核准生命週期事件以及 `shutdown`。

Agent 執行分為兩個階段：

1. 立即接受的確認 (`status:"accepted"`)
2. 最終完成回應 (`status:"ok"|"error"`)，其間包含串流的 `agent` 事件。

請參閱完整的協定文件：[Gateway Protocol](/zh-Hant/gateway/protocol)。

## 操作檢查

### 存活狀態

- 開啟 WS 並發送 `connect`。
- 預期包含快照的 `hello-ok` 回應。

### 就緒狀態

```bash
openclaw gateway status
openclaw channels status --probe
openclaw health
```

### 間隙恢復

事件不會重播。發生順序間隙時，請在繼續之前重新整理狀態 (`health`、`system-presence`)。

## 常見失敗特徵

| 特徵                                                           | 可能問題                                       |
| -------------------------------------------------------------- | ---------------------------------------------- |
| `refusing to bind gateway ... without auth`                    | 非回送連線綁定且沒有有效的閘道驗證路徑         |
| `another gateway instance is already listening` / `EADDRINUSE` | 連接埠衝突                                     |
| `Gateway start blocked: set gateway.mode=local`                | 設定為遠端模式，或損毀的設定中缺少本地模式標記 |
| 連線期間的 `unauthorized`                                      | 客戶端與 Gateway 之間的驗證不符                |

如需完整的診斷步驟，請使用 [Gateway 故障排除](/zh-Hant/gateway/troubleshooting)。

## 安全性保證

- 當 Gateway 無法使用時，Gateway 協定客戶端會快速失敗（沒有隱含的直接通道後備）。
- 無效或非連線的第一幀會被拒絕並關閉。
- 優雅關閉會在通訊端關閉之前發出 `shutdown` 事件。

---

相關：

- [故障排除](/zh-Hant/gateway/troubleshooting)
- [背景程序](/zh-Hant/gateway/background-process)
- [設定](/zh-Hant/gateway/configuration)
- [健康狀態](/zh-Hant/gateway/health)
- [Doctor](/zh-Hant/gateway/doctor)
- [驗證](/zh-Hant/gateway/authentication)
