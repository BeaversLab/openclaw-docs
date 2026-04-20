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
  <Step title="Start the Gateway">

```bash
openclaw gateway --port 18789
# debug/trace mirrored to stdio
openclaw gateway --port 18789 --verbose
# force-kill listener on selected port, then start
openclaw gateway --force
```

  </Step>

  <Step title="驗證服務健全狀況">

```bash
openclaw gateway status
openclaw status
openclaw logs --follow
```

健全基準：`Runtime: running` 與 `RPC probe: ok`。

  </Step>

  <Step title="驗證通道就緒狀態">

```bash
openclaw channels status --probe
```

若可連線到 Gateway，這會執行各帳戶通道的即時探測與選用的稽核。
若 Gateway 無法連線，CLI 會改回退至僅含組態資訊的通道摘要，
而不會產生即時探測輸出。

  </Step>
</Steps>

<Note>Gateway 組態重新載入會監看現用的組態檔案路徑（從 profile/state 預設值解析，或設定時的 `OPENCLAW_CONFIG_PATH`）。 預設模式為 `gateway.reload.mode="hybrid"`。 在首次成功載入後，執行中的程序會提供現用的記憶體內組態快照；成功重新載入會以原子方式替換該快照。</Note>

## Runtime model

- 一個用於路由、控制平面和通道連線的常駐程序。
- 單一多工連接埠用於：
  - WebSocket 控制/RPC
  - HTTP API，OpenAI 相容 (`/v1/models`, `/v1/embeddings`, `/v1/chat/completions`, `/v1/responses`, `/tools/invoke`)
  - 控制 UI 和 hooks
- 預設綁定模式：`loopback`。
- 預設需要驗證。共享金鑰設定使用
  `gateway.auth.token` / `gateway.auth.password` (或
  `OPENCLAW_GATEWAY_TOKEN` / `OPENCLAW_GATEWAY_PASSWORD`)，而非迴路
  反向代理設定可以使用 `gateway.auth.mode: "trusted-proxy"`。

## OpenAI 相容端點

OpenClaw 目前最高杠杆的相容性介面為：

- `GET /v1/models`
- `GET /v1/models/{id}`
- `POST /v1/embeddings`
- `POST /v1/chat/completions`
- `POST /v1/responses`

為何這組端點很重要：

- 大多數 Open WebUI、LobeChat 和 LibreChat 整合會先探測 `/v1/models`。
- 許多 RAG 和記憶體管線預期使用 `/v1/embeddings`。
- 原生代理用戶端越來越傾向於使用 `/v1/responses`。

規劃備註：

- `/v1/models` 是代理優先：它會傳回 `openclaw`、`openclaw/default` 和 `openclaw/<agentId>`。
- `openclaw/default` 是穩定的別名，始終對應至已設定的預設代理。
- 當您想要後端提供者/模型覆寫時，請使用 `x-openclaw-model`；否則所選代理的一般模型和嵌入設定將維持控制。

所有這些都運作在主要 Gateway 連接埠上，並使用與其餘 Gateway HTTP API 相同的可信操作員驗證邊界。

### 連接埠與綁定優先順序

| 設定           | 解析順序                                                      |
| -------------- | ------------------------------------------------------------- |
| Gateway 連接埠 | `--port` → `OPENCLAW_GATEWAY_PORT` → `gateway.port` → `18789` |
| 綁定模式       | CLI/覆寫 → `gateway.bind` → `loopback`                        |

### 熱重載模式

| `gateway.reload.mode` | 行為                     |
| --------------------- | ------------------------ |
| `off`                 | 不重新載入設定           |
| `hot`                 | 僅套用熱安全變更         |
| `restart`             | 當需要重新載入變更時重啟 |
| `hybrid` (預設)       | 安全時熱套用，必要時重啟 |

## 操作員指令集

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

`gateway status --deep` 是用於額外的服務探索 (LaunchDaemons/systemd system
units/schtasks)，而不是更深層的 RPC 健康檢查。

## 多個閘道 (同一台主機)

大多數安裝應該在每台機器上執行一個閘道。單一閘道可以託管多個
代理和頻道。

只有當您刻意需要隔離或救援機器人時，才需要多個閘道。

有用的檢查：

```bash
openclaw gateway status --deep
openclaw gateway probe
```

預期事項：

- `gateway status --deep` 可以回報 `Other gateway-like services detected (best effort)`
  並在仍有過時的 launchd/systemd/schtasks 安裝時印出清理提示。
- `gateway probe` 可以在超過一個目標
  回應時警告 `multiple reachable gateways`。
- 如果這是有意為之，請針對每個閘道隔離連接埠、設定/狀態以及工作區根目錄。

詳細設定：[/gateway/multiple-gateways](/zh-Hant/gateway/multiple-gateways)。

## 遠端存取

首選：Tailscale/VPN。
備選：SSH tunnel。

```bash
ssh -N -L 18789:127.0.0.1:18789 user@host
```

然後在本地將用戶端連線至 `ws://127.0.0.1:18789`。

<Warning>SSH tunnel 不會繞過閘道驗證。對於共用金鑰驗證，客戶端仍 必須透過 tunnel 發送 `token`/`password`。對於承載身分的模式， 請求仍然必須滿足該驗證路徑。</Warning>

參閱：[Remote Gateway](/zh-Hant/gateway/remote)、[Authentication](/zh-Hant/gateway/authentication)、[Tailscale](/zh-Hant/gateway/tailscale)。

## 監督與服務生命週期

對於生產環境等級的可靠性，請使用監督式執行。

<Tabs>
  <Tab title="macOS (launchd)">

```bash
openclaw gateway install
openclaw gateway status
openclaw gateway restart
openclaw gateway stop
```

LaunchAgent 標籤為 `ai.openclaw.gateway` (預設) 或 `ai.openclaw.<profile>` (命名設定檔)。`openclaw doctor` 會稽核並修復服務設定漂移。

  </Tab>

  <Tab title="Linux (systemd user)">

```bash
openclaw gateway install
systemctl --user enable --now openclaw-gateway[-<profile>].service
openclaw gateway status
```

為了在登出後持續執行，請啟用 lingering：

```bash
sudo loginctl enable-linger <user>
```

當您需要自訂安裝路徑時的手動 user-unit 範例：

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

  <Tab title="Windows (native)">

```powershell
openclaw gateway install
openclaw gateway status --json
openclaw gateway restart
openclaw gateway stop
```

原生 Windows 受管理啟動會使用名為 `OpenClaw Gateway`
(或命名設定檔的 `OpenClaw Gateway (<profile>)`) 的排定任務。如果建立排定任務
被拒絕，OpenClaw 會退回到每個使用者的啟動資料夾啟動器，
該啟動器指向狀態目錄中的 `gateway.cmd`。

  </Tab>

  <Tab title="Linux (system service)">

請針對多使用者/持續運行的主機使用系統單元。

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now openclaw-gateway[-<profile>].service
```

使用與使用者單元相同的服務主體，但將其安裝在
`/etc/systemd/system/openclaw-gateway[-<profile>].service` 下，如果您的 `openclaw` 二進位檔案位於其他位置，請調整
`ExecStart=`。

  </Tab>
</Tabs>

## 同一主機上的多個閘道

大多數設定應執行 **一個** 閘道。
僅在嚴格的隔離/備援需求時使用多個（例如救援設定檔）。

每個執行個體的檢查清單：

- 唯一的 `gateway.port`
- 唯一的 `OPENCLAW_CONFIG_PATH`
- 唯一的 `OPENCLAW_STATE_DIR`
- 唯一的 `agents.defaults.workspace`

範例：

```bash
OPENCLAW_CONFIG_PATH=~/.openclaw/a.json OPENCLAW_STATE_DIR=~/.openclaw-a openclaw gateway --port 19001
OPENCLAW_CONFIG_PATH=~/.openclaw/b.json OPENCLAW_STATE_DIR=~/.openclaw-b openclaw gateway --port 19002
```

請參閱：[Multiple gateways](/zh-Hant/gateway/multiple-gateways)。

### 開發設定檔快速途徑

```bash
openclaw --dev setup
openclaw --dev gateway --allow-unconfigured
openclaw --dev status
```

預設值包括隔離的狀態/設定和基礎閘道連接埠 `19001`。

## 通訊協定快速參考（操作員觀點）

- 第一個用戶端框架必須是 `connect`。
- 閘道傳回 `hello-ok` 快照 (`presence`、`health`、`stateVersion`、`uptimeMs`、限制/原則)。
- `hello-ok.features.methods` / `events` 是一個保守的探索清單，並非
  每個可呼叫協助程式路由的生成傾印。
- 請求：`req(method, params)` → `res(ok/payload|error)`。
- 常見事件包括 `connect.challenge`、`agent`、`chat`、
  `session.message`、`session.tool`、`sessions.changed`、`presence`、`tick`、
  `health`、`heartbeat`、配對/核准生命週期事件，以及 `shutdown`。

代理程式執行分為兩個階段：

1. 立即接受的回應 (`status:"accepted"`)
2. 最終完成回應 (`status:"ok"|"error"`)，中間伴隨串流 `agent` 事件。

請參閱完整的通訊協定文件：[Gateway 通訊協定](/zh-Hant/gateway/protocol)。

## 運作檢查

### 存活檢查

- 開啟 WS 並發送 `connect`。
- 預期會收到包含快照的 `hello-ok` 回應。

### 就緒檢查

```bash
openclaw gateway status
openclaw channels status --probe
openclaw health
```

### 間隙恢復

事件不會重播。當發生序列間隙時，請在繼續之前重新整理狀態 (`health`, `system-presence`)。

## 常見失敗特徵

| 特徵                                                           | 可能問題                                         |
| -------------------------------------------------------------- | ------------------------------------------------ |
| `refusing to bind gateway ... without auth`                    | 非回繫 繫結且沒有有效的 gateway auth 路徑        |
| `another gateway instance is already listening` / `EADDRINUSE` | 連接埠衝突                                       |
| `Gateway start blocked: set gateway.mode=local`                | 設定設為遠端模式，或損毀的設定中缺少本地模式標記 |
| 連線時發生 `unauthorized`                                      | 客戶端與 Gateway 之間的驗證不符                  |

若要取得完整的診斷步驟，請使用 [Gateway 疑難排解](/zh-Hant/gateway/troubleshooting)。

## 安全性保證

- 當 Gateway 無法使用時，Gateway 通訊協定客戶端會快速失敗 (沒有隱含的直接通道後援)。
- 無效或非連線的第一個影格會被拒絕並關閉。
- 在通訊端關閉之前，優雅關閉會發出 `shutdown` 事件。

---

相關連結：

- [疑難排解](/zh-Hant/gateway/troubleshooting)
- [背景處理序](/zh-Hant/gateway/background-process)
- [設定](/zh-Hant/gateway/configuration)
- [健康狀態](/zh-Hant/gateway/health)
- [診斷工具](/zh-Hant/gateway/doctor)
- [驗證](/zh-Hant/gateway/authentication)
