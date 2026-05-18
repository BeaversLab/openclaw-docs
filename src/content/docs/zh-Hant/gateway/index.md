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
  - HTTP API (`/v1/models`, `/v1/embeddings`, `/v1/chat/completions`, `/v1/responses`, `/tools/invoke`)
  - 外掛程式 HTTP 路由，例如選用的 `/api/v1/admin/rpc`
  - 控制 UI 與 hooks
- 預設綁定模式：`loopback`。
- 預設需要驗證。共享金鑰設定使用
  `gateway.auth.token` / `gateway.auth.password` (或
  `OPENCLAW_GATEWAY_TOKEN` / `OPENCLAW_GATEWAY_PASSWORD`)，而非本機迴路
  的反向代理設定可以使用 `gateway.auth.mode: "trusted-proxy"`。

## OpenAI 相容端點

OpenClaw 目前最高效力的相容性介面為：

- `GET /v1/models`
- `GET /v1/models/{id}`
- `POST /v1/embeddings`
- `POST /v1/chat/completions`
- `POST /v1/responses`

為何此組合很重要：

- 大多數 Open WebUI、LobeChat 和 LibreChat 整合會先探測 `/v1/models`。
- 許多 RAG 和記憶管線預期使用 `/v1/embeddings`。
- 代理程式原生用戶端越來越傾向於使用 `/v1/responses`。

規劃備註：

- `/v1/models` 是代理程式優先的：它會回傳 `openclaw`、`openclaw/default` 和 `openclaw/<agentId>`。
- `openclaw/default` 是一個穩定的別名，永遠對應到已設定的預設代理程式。
- 當您想要覆寫後端提供者/模型時，請使用 `x-openclaw-model`；否則，所選代理程式的正常模型和嵌入設定將維持控管。

所有這些都運行在主 Gateway 埠上，並使用與 Gateway HTTP API 其餘部分相同的受信任操作員認證邊界。

管理員 HTTP RPC (`POST /api/v1/admin/rpc`) 是一個獨立的預設關閉外掛程式路由，供無法使用 WebSocket RPC 的主機工具使用。請參閱 [Admin HTTP RPC](/zh-Hant/plugins/admin-http-rpc)。

### 連接埠和綁定優先順序

| 設定           | 解析順序                                                      |
| -------------- | ------------------------------------------------------------- |
| Gateway 連接埠 | `--port` → `OPENCLAW_GATEWAY_PORT` → `gateway.port` → `18789` |
| 綁定模式       | CLI/override → `gateway.bind` → `loopback`                    |

已安裝的 Gateway 服務會將解析出的 `--port` 記錄在監督器元數據中。變更 `gateway.port` 後，請執行 `openclaw doctor --fix` 或 `openclaw gateway install --force`，以便 launchd/systemd/schtasks 在新連接埠上啟動程序。

Gateway 啟動時，在針對非回環連線植入本機 Control UI 來源時，會使用相同的有效連接埠和綁定。例如，`--bind lan --port 3000` 會在執行時期驗證執行前植入 `http://localhost:3000` 和 `http://127.0.0.1:3000`。請將任何遠端瀏覽器來源（例如 HTTPS 代理 URL）明確新增至 `gateway.controlUi.allowedOrigins`。

### 熱重載模式

| `gateway.reload.mode` | 行為                         |
| --------------------- | ---------------------------- |
| `off`                 | 不重載設定                   |
| `hot`                 | 僅套用熱安全變更             |
| `restart`             | 需要重載時重新啟動           |
| `hybrid`（預設值）    | 安全時熱套用，必要時重新啟動 |

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

`gateway status --deep` 是用於額外的服務探索（LaunchDaemons/systemd 系統單位/schtasks），而非更深入的 RPC 健康探測。

## 多個 Gateway（同一主機）

大多數安裝應該在每台機器上執行一個 Gateway。單一 Gateway 可以代管多個代理和通道。

只有當您刻意需要隔離或救援機器人時，才需要多個 Gateway。

有用的檢查：

```bash
openclaw gateway status --deep
openclaw gateway probe
```

預期事項：

- 當過時的 launchd/systemd/schtasks 安裝仍然存在時，`gateway status --deep` 可能會回報 `Other gateway-like services detected (best effort)` 並列印清理提示。
- 當多個目標回應時，`gateway probe` 可能會警告 `multiple reachable gateways`。
- 如果這是有意為之，請針對每個 Gateway 隔離連接埠、設定/狀態和工作區根目錄。

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
備援：SSH 通道。

```bash
ssh -N -L 18789:127.0.0.1:18789 user@host
```

然後將用戶端本機連線至 `ws://127.0.0.1:18789`。

<Warning>SSH 隧道不會繞過 Gateway 驗證。對於共享金鑰驗證，客戶端即使透過隧道仍必須發送 `token`/`password`。對於承載身分的模式，請求仍須滿足該驗證路徑。</Warning>

請參閱：[Remote Gateway](/zh-Hant/gateway/remote)、[Authentication](/zh-Hant/gateway/authentication)、[Tailscale](/zh-Hant/gateway/tailscale)。

## 監督與服務生命週期

在生產環境般的可靠性要求下，請使用監督執行。

<Tabs>
  <Tab title="macOS (launchd)">

```bash
openclaw gateway install
openclaw gateway status
openclaw gateway restart
openclaw gateway stop
```

使用 `openclaw gateway restart` 進行重啟。請勿將 `openclaw gateway stop` 與 `openclaw gateway start` 串接作為重啟的替代方案。

在 macOS 上，`gateway stop` 預設使用 `launchctl bootout` —— 這會從目前的啟動階段中移除 LaunchAgent 而不永久停用，因此 KeepAlive 自動恢復機制在意外崩潰後仍能運作，且 `gateway start` 能乾淨地重新啟用。若要跨重新啟動永久抑制自動重生，請傳入 `--disable`：`openclaw gateway stop --disable`。

LaunchAgent 標籤為 `ai.openclaw.gateway` (預設) 或 `ai.openclaw.<profile>` (命名設定檔)。`openclaw doctor` 會稽核並修復服務設定偏移。

  </Tab>

  <Tab title="Linux (systemd user)">

```bash
openclaw gateway install
systemctl --user enable --now openclaw-gateway[-<profile>].service
openclaw gateway status
```

若要在登出後保持運作，請啟用 linger：

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

原生 Windows 受控啟動使用名為 `OpenClaw Gateway` 的已排程任務
(或針對命名設定檔使用 `OpenClaw Gateway (<profile>)`)。如果建立已排程任務
被拒絕，OpenClaw 會退而使用每位使用者的啟動資料夾啟動器，
該啟動器指向狀態目錄中的 `gateway.cmd`。

  </Tab>

  <Tab title="Linux (系統服務)">

針對多用戶/永遠在線的主機，使用系統單元。

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now openclaw-gateway[-<profile>].service
```

使用與用戶單元相同的服務主體，但將其安裝在
`/etc/systemd/system/openclaw-gateway[-<profile>].service` 下，並在您的 `openclaw` 二進制文件位於其他位置時調整
`ExecStart=`。

不要同時讓 `openclaw doctor --fix` 為相同的配置檔案/端口安裝用戶級別的網關服務。當 Doctor 發現系統級別的 OpenClaw 網關服務時，它會拒絕該自動安裝；當系統單元擁有生命週期時，請使用 `OPENCLAW_SERVICE_REPAIR_POLICY=external`。

  </Tab>
</Tabs>

## 開發設定檔快速路徑

```bash
openclaw --dev setup
openclaw --dev gateway --allow-unconfigured
openclaw --dev status
```

預設值包括隔離的狀態/配置和基礎網關端口 `19001`。

## 協定快速參考（操作員檢視）

- 第一個客戶端框架必須是 `connect`。
- 網關返回 `hello-ok` 快照（`presence`、`health`、`stateVersion`、`uptimeMs`、限制/策略）。
- `hello-ok.features.methods` / `events` 是一個保守的發現列表，不是
  每個可調用的輔助路由的生成轉儲。
- 請求：`req(method, params)` → `res(ok/payload|error)`。
- 常見事件包括 `connect.challenge`、`agent`、`chat`、
  `session.message`、`session.operation`、`session.tool`、`sessions.changed`、
  `presence`、`tick`、`health`、`heartbeat`、配對/批准生命週期事件
  以及 `shutdown`。

Agent 執行分為兩個階段：

1. 立即接受的確認（`status:"accepted"`）
2. 最終完成響應（`status:"ok"|"error"`），中間穿插流式 `agent` 事件。

查看完整協議文檔：[Gateway Protocol](/zh-Hant/gateway/protocol)。

## 操作檢查

### 存活狀態

- 打開 WS 並發送 `connect`。
- 預期帶有快照的 `hello-ok` 響應。

### 就緒狀態

```bash
openclaw gateway status
openclaw channels status --probe
openclaw health
```

### 間隙恢復

事件不會重播。出現序列間隙時，請在繼續之前重新整理狀態（`health`、`system-presence`）。

## 常見失敗特徵

| 特徵                                                           | 可能問題                                       |
| -------------------------------------------------------------- | ---------------------------------------------- |
| `refusing to bind gateway ... without auth`                    | 非回送連線綁定且沒有有效的閘道驗證路徑         |
| `another gateway instance is already listening` / `EADDRINUSE` | 連接埠衝突                                     |
| `Gateway start blocked: set gateway.mode=local`                | 設定為遠端模式，或損毀的設定中缺少本地模式標記 |
| 連線期間的 `unauthorized`                                      | 客戶端與 Gateway 之間的驗證不符                |

如需完整的診斷階梯，請使用 [Gateway Troubleshooting](/zh-Hant/gateway/troubleshooting)。

## 安全性保證

- 當 Gateway 無法使用時，Gateway 協定客戶端會快速失敗（沒有隱含的直接通道後備）。
- 無效或非連線的第一幀會被拒絕並關閉。
- 在 Socket 關閉之前，正常關閉會發出 `shutdown` 事件。

---

相關：

- [Troubleshooting](/zh-Hant/gateway/troubleshooting)
- [Background Process](/zh-Hant/gateway/background-process)
- [Configuration](/zh-Hant/gateway/configuration)
- [Health](/zh-Hant/gateway/health)
- [Doctor](/zh-Hant/gateway/doctor)
- [Authentication](/zh-Hant/gateway/authentication)

## 相關

- [Configuration](/zh-Hant/gateway/configuration)
- [Gateway troubleshooting](/zh-Hant/gateway/troubleshooting)
- [Remote access](/zh-Hant/gateway/remote)
- [Secrets management](/zh-Hant/gateway/secrets)
