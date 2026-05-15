---
summary: "Gateway 服務、生命週期與操作手冊"
read_when:
  - Running or debugging the gateway process
title: "Gateway 運行手冊"
---

使用此頁面進行 Gateway 服務的初始啟動 (day-1) 和後續營運 (day-2)。

<CardGroup cols={2}>
  <Card title="深層故障排除" icon="siren" href="/zh-Hant/gateway/troubleshooting">
    以症狀為先導的診斷，提供精確的指令階梯和日誌特徵。
  </Card>
  <Card title="設定" icon="sliders" href="/zh-Hant/gateway/configuration">
    以任務為導向的設定指南 + 完整設定參考。
  </Card>
  <Card title="Secrets 管理" icon="key-round" href="/zh-Hant/gateway/secrets">
    SecretRef 合約、執行時期快照行為，以及遷移/重新載入作業。
  </Card>
  <Card title="Secrets 方案合約" icon="shield-check" href="/zh-Hant/gateway/secrets-plan-contract">
    精確的 `secrets apply` 目標/路徑規則以及僅參照的 auth-profile 行為。
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

健康的基準：`Runtime: running`、`Connectivity probe: ok` 和 `Capability: ...` 符合您的預期。當您需要讀取範圍的 RPC 證明而不僅僅是連線能力時，請使用 `openclaw gateway status --require-rpc`。

  </Step>

  <Step title="驗證通道就緒狀態">

```bash
openclaw channels status --probe
```

當 Gateway 可連線時，這會對每個帳戶執行即時通道探測和選用的稽核。
如果 Gateway 無法連線，CLI 將退回到僅包含設定的通道摘要，
而非即時探測輸出。

  </Step>
</Steps>

<Note>Gateway config reload watches the active config file path (resolved from profile/state defaults, or `OPENCLAW_CONFIG_PATH` when set). Default mode is `gateway.reload.mode="hybrid"`. After the first successful load, the running process serves the active in-memory config snapshot; successful reload swaps that snapshot atomically.</Note>

## 執行時期模型

- 一個持續運作的程序，用於路由、控制平面和通道連線。
- 單一多工連接埠用於：
  - WebSocket 控制/RPC
  - HTTP APIs、OpenAI 相容（`/v1/models`、`/v1/embeddings`、`/v1/chat/completions`、`/v1/responses`、`/tools/invoke`）
  - 控制 UI 和 hooks
- 預設綁定模式：`loopback`。
- 預設需要驗證。共享金鑰設定使用
  `gateway.auth.token` / `gateway.auth.password`（或
  `OPENCLAW_GATEWAY_TOKEN` / `OPENCLAW_GATEWAY_PASSWORD`），而非迴路
  reverse-proxy 設定可以使用 `gateway.auth.mode: "trusted-proxy"`。

## OpenAI 相容端點

OpenClaw 最高效益的相容性介面目前為：

- `GET /v1/models`
- `GET /v1/models/{id}`
- `POST /v1/embeddings`
- `POST /v1/chat/completions`
- `POST /v1/responses`

為何這組很重要：

- 大多數 Open WebUI、LobeChat 和 LibreChat 整合會先探測 `/v1/models`。
- 許多 RAG 和記憶管線預期使用 `/v1/embeddings`。
- 原生 Agent 客戶端越來越傾向於使用 `/v1/responses`。

規劃說明：

- `/v1/models` 是 Agent 優先：它返回 `openclaw`、`openclaw/default` 和 `openclaw/<agentId>`。
- `openclaw/default` 是一個穩定的別名，總是對應到已設定的預設 agent。
- 當您想要後端供應商/模型覆寫時，請使用 `x-openclaw-model`；否則所選 agent 的正常模型和嵌入設定將維持控制。

所有這些都在主要的 Gateway 連接埠上執行，並且使用與其餘 Gateway HTTP API 相同的受信任操作員驗證邊界。

### 連接埠和綁定優先順序

| 設定           | 解析順序                                                      |
| -------------- | ------------------------------------------------------------- |
| Gateway 連接埠 | `--port` → `OPENCLAW_GATEWAY_PORT` → `gateway.port` → `18789` |
| 綁定模式       | CLI/override → `gateway.bind` → `loopback`                    |

已安裝的 gateway 服務會將已解析的 `--port` 記錄在監督器元資料中。更改 `gateway.port` 後，請執行 `openclaw doctor --fix` 或 `openclaw gateway install --force`，以便 launchd/systemd/schtasks 在新連接埠上啟動程序。

當 Gateway 啟動為非回送綁定播種本機控制 UI 來源時，會使用相同的有效連接埠和綁定。例如，`--bind lan --port 3000` 會在執行階段驗證執行之前播種 `http://localhost:3000` 和 `http://127.0.0.1:3000`。請將任何遠端瀏覽器來源（例如 HTTPS proxy URL）明確新增至 `gateway.controlUi.allowedOrigins`。

### 熱重新載入模式

| `gateway.reload.mode` | 行為                         |
| --------------------- | ---------------------------- |
| `off`                 | 不重新載入設定               |
| `hot`                 | 僅套用熱安全變更             |
| `restart`             | 需要重新載入時重新啟動       |
| `hybrid` (預設)       | 安全時熱套用，需要時重新啟動 |

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

`gateway status --deep` 是用於額外的服務發現 (LaunchDaemons/systemd system units/schtasks)，而非更深入的 RPC 健康探測。

## 多個 gateway (同一主機)

大多數安裝應在每台機器上執行一個 gateway。單一 gateway 可以裝載多個 agent 和 channel。

只有在您刻意需要隔離或救援 bot 時，才需要多個 gateway。

有用的檢查：

```bash
openclaw gateway status --deep
openclaw gateway probe
```

預期情況：

- 當過時的 launchd/systemd/schtasks 安裝仍然存在時，`gateway status --deep` 可以回報 `Other gateway-like services detected (best effort)` 並列印清理提示。
- 當多個目標回應時，`gateway probe` 可以針對 `multiple reachable gateways` 發出警告。
- 如果這是有意的，請為每個 gateway 隔離連接埠、config/state 和工作區根目錄。

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

詳細設定：[/gateway/multiple-gateways](/zh-Hant/gateway/multiple-gateways)。

## 遠端存取

首選：Tailscale/VPN。
備用：SSH tunnel。

```bash
ssh -N -L 18789:127.0.0.1:18789 user@host
```

然後將用戶端在本機連線至 `ws://127.0.0.1:18789`。

<Warning>SSH tunnel 不會繞過 gateway 驗證。對於共用金鑰驗證，用戶端即使透過 tunnel 連線，仍必須傳送 `token`/`password`。對於承載身分的模式，請求仍必須滿足該驗證路徑。</Warning>

請參閱：[Remote Gateway](/zh-Hant/gateway/remote)、[Authentication](/zh-Hant/gateway/authentication)、[Tailscale](/zh-Hant/gateway/tailscale)。

## 監督與服務生命週期

請使用監督式執行以獲得類似生產環境的可靠性。

<Tabs>
  <Tab title="macOS (launchd)">

```bash
openclaw gateway install
openclaw gateway status
openclaw gateway restart
openclaw gateway stop
```

請使用 `openclaw gateway restart` 進行重啟。請勿將 `openclaw gateway stop` 和 `openclaw gateway start` 串接作為重啟的替代方案。

在 macOS 上，`gateway stop` 預設使用 `launchctl bootout` —— 這會從目前啟動階段中移除 LaunchAgent，而不會永久停用，因此 KeepAlive 自動恢復機制在意外當機後仍能運作，且 `gateway start` 能乾淨地重新啟用。若要在重啟後持續抑制自動重新生成，請傳入 `--disable`：`openclaw gateway stop --disable`。

LaunchAgent 標籤為 `ai.openclaw.gateway` (預設) 或 `ai.openclaw.<profile>` (命名設定檔)。`openclaw doctor` 會稽核並修復服務設定 drift。

  </Tab>

  <Tab title="Linux (systemd user)">

```bash
openclaw gateway install
systemctl --user enable --now openclaw-gateway[-<profile>].service
openclaw gateway status
```

若要在登出後持續運作，請啟用 linger：

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

  <Tab title="Windows (native)">

```powershell
openclaw gateway install
openclaw gateway status --json
openclaw gateway restart
openclaw gateway stop
```

原生 Windows 受控啟動使用名為 `OpenClaw Gateway`
(命名設定檔則為 `OpenClaw Gateway (<profile>)`) 的排程任務。如果建立排程任務被拒絕，OpenClaw 會退回至
指向狀態目錄中 `gateway.cmd` 的每位使用者啟動資料夾啟動器。

  </Tab>

  <Tab title="Linux (系統服務)">

針對多使用者/永遠線上的主機使用系統單元。

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now openclaw-gateway[-<profile>].service
```

使用與使用者單元相同的服務主體，但將其安裝在
`/etc/systemd/system/openclaw-gateway[-<profile>].service` 之下，並如果你的 `openclaw` 二進位檔位於其他位置，請調整
`ExecStart=`。

當系統單元擁有生命週期時，請勿讓 `openclaw doctor --fix` 為相同的設定檔/連接埠安裝使用者層級的閘道服務。當 Doctor 發現系統層級的 OpenClaw 閘道服務時，它會拒絕該自動安裝；請使用 `OPENCLAW_SERVICE_REPAIR_POLICY=external`。

  </Tab>
</Tabs>

## 開發設定檔快速路徑

```bash
openclaw --dev setup
openclaw --dev gateway --allow-unconfigured
openclaw --dev status
```

預設值包括獨立的狀態/設定檔以及基礎閘道連接埠 `19001`。

## 通訊協定快速參考 (操作員檢視)

- 第一個客戶端框架必須是 `connect`。
- 閘道會傳回 `hello-ok` 快照 (`presence`、`health`、`stateVersion`、`uptimeMs`、限制/原則)。
- `hello-ok.features.methods` / `events` 是一個保守的探索列表，
  並非每個可呼叫輔助路由的生成傾印。
- 請求：`req(method, params)` → `res(ok/payload|error)`。
- 常見事件包括 `connect.challenge`、`agent`、`chat`、
  `session.message`、`session.tool`、`sessions.changed`、`presence`、`tick`、
  `health`、`heartbeat`、配對/核准生命週期事件，以及 `shutdown`。

Agent 執行分為兩個階段：

1. 立即接受的回應 (`status:"accepted"`)
2. 最終完成回應 (`status:"ok"|"error"`)，中間包含串流的 `agent` 事件。

請參閱完整的通訊協定文件：[Gateway Protocol](/zh-Hant/gateway/protocol)。

## 操作檢查

### 存活度

- 開啟 WS 並傳送 `connect`。
- 預期 `hello-ok` 回應，其中包含快照。

### 就緒狀態

```bash
openclaw gateway status
openclaw channels status --probe
openclaw health
```

### 間隙恢復

事件不會重播。當序列出現間隙時，請在繼續之前重新整理狀態 (`health`, `system-presence`)。

## 常見失敗特徵

| 特徵                                                           | 可能原因                                           |
| -------------------------------------------------------------- | -------------------------------------------------- |
| `refusing to bind gateway ... without auth`                    | 非回送綁定且沒有有效的 gateway auth 路徑           |
| `another gateway instance is already listening` / `EADDRINUSE` | 連接埠衝突                                         |
| `Gateway start blocked: set gateway.mode=local`                | 配置設定為遠端模式，或損壞的配置中缺少本機模式標記 |
| 連線期間出現 `unauthorized`                                    | 用戶端與 Gateway 之間的驗證不匹配                  |

如需完整的診斷步驟，請使用 [Gateway 疑難排解](/zh-Hant/gateway/troubleshooting)。

## 安全保證

- 當 Gateway 不可用時，Gateway 協定用戶端會快速失敗（無隱含的直接通道後援）。
- 無效或非連線的第一個框架會被拒絕並關閉。
- 在通訊端關閉之前，優雅關閉會發出 `shutdown` 事件。

---

相關連結：

- [疑難排解](/zh-Hant/gateway/troubleshooting)
- [背景程序](/zh-Hant/gateway/background-process)
- [配置](/zh-Hant/gateway/configuration)
- [健康狀態](/zh-Hant/gateway/health)
- [診斷工具](/zh-Hant/gateway/doctor)
- [驗證](/zh-Hant/gateway/authentication)

## 相關

- [配置](/zh-Hant/gateway/configuration)
- [Gateway 疑難排解](/zh-Hant/gateway/troubleshooting)
- [遠端存取](/zh-Hant/gateway/remote)
- [機密管理](/zh-Hant/gateway/secrets)
