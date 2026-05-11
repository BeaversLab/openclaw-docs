---
summary: "Gateway 服務的 Runbook、生命週期與營運"
read_when:
  - Running or debugging the gateway process
title: "Gateway runbook"
---

使用此頁面進行 Gateway 服務的初始啟動 (day-1) 和後續營運 (day-2)。

<CardGroup cols={2}>
  <Card title="深度疑難排解" icon="siren" href="/zh-Hant/gateway/troubleshooting">
    透過確切命令階層與日誌特徵進行症狀優先的診斷。
  </Card>
  <Card title="組態" icon="sliders" href="/zh-Hant/gateway/configuration">
    任務導向的設定指南 + 完整組態參考。
  </Card>
  <Card title="機密管理" icon="key-round" href="/zh-Hant/gateway/secrets">
    SecretRef 合約、執行時段快照行為，以及遷移/重新載入作業。
  </Card>
  <Card title="機密計畫合約" icon="shield-check" href="/zh-Hant/gateway/secrets-plan-contract">
    確切的 `secrets apply` 目標/路徑規則與僅參照 auth-profile 行為。
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

健康基準：`Runtime: running`、`Connectivity probe: ok` 與符合預期的 `Capability: ...`。當您需要讀取範圍 (read-scope) RPC 證明而不僅僅是連線性時，請使用 `openclaw gateway status --require-rpc`。

  </Step>

  <Step title="驗證通道就緒狀態">

```bash
openclaw channels status --probe
```

若可連線至 Gateway，此指令會針對每個帳戶執行即時通道探測與選用稽核。
若無法連線至 Gateway，CLI 會改為回退至僅組態的通道摘要，
而非即時探測輸出。

  </Step>
</Steps>

<Note>Gateway 配置重新載入會監視作用中的設定檔路徑（從設定檔/狀態預設值解析，或在設定時從 `OPENCLAW_CONFIG_PATH` 解析）。 預設模式為 `gateway.reload.mode="hybrid"`。 在第一次成功載入後，執行中的程序會提供作用中的記憶體內設定快照；成功重新載入會以原子方式交換該快照。</Note>

## 執行時期模型

- 一個持續運作的程序，用於路由、控制平面和通道連線。
- 單一多工連接埠用於：
  - WebSocket 控制/RPC
  - HTTP API，OpenAI 相容 (`/v1/models`, `/v1/embeddings`, `/v1/chat/completions`, `/v1/responses`, `/tools/invoke`)
  - 控制 UI 和 hooks
- 預設綁定模式：`loopback`。
- 預設情況下需要驗證。共用金鑰設定使用
  `gateway.auth.token` / `gateway.auth.password` (或
  `OPENCLAW_GATEWAY_TOKEN` / `OPENCLAW_GATEWAY_PASSWORD`)，而非非迴路
  反向代理設定可以使用 `gateway.auth.mode: "trusted-proxy"`。

## OpenAI 相容端點

OpenClaw 最高效益的相容性介面現在是：

- `GET /v1/models`
- `GET /v1/models/{id}`
- `POST /v1/embeddings`
- `POST /v1/chat/completions`
- `POST /v1/responses`

為何這組很重要：

- 大多數 Open WebUI、LobeChat 和 LibreChat 整合會先探查 `/v1/models`。
- 許多 RAG 和記憶體管線預期 `/v1/embeddings`。
- Agent 原生用戶端越來越偏好 `/v1/responses`。

規劃說明：

- `/v1/models` 是 agent-first：它會傳回 `openclaw`、`openclaw/default` 和 `openclaw/<agentId>`。
- `openclaw/default` 是穩定的別名，永遠對應到設定的預設 agent。
- 當您想要後端提供者/模型覆寫時，請使用 `x-openclaw-model`；否則所選 agent 的正常模型和嵌入設定會維持控制。

所有這些都在主要的 Gateway 連接埠上執行，並且使用與其餘 Gateway HTTP API 相同的受信任操作員驗證邊界。

### 連接埠和綁定優先順序

| 設定           | 解析順序                                                      |
| -------------- | ------------------------------------------------------------- |
| Gateway 連接埠 | `--port` → `OPENCLAW_GATEWAY_PORT` → `gateway.port` → `18789` |
| 綁定模式       | CLI/override → `gateway.bind` → `loopback`                    |

已安裝的 gateway 服務會將解析出的 `--port` 記錄在 supervisor metadata 中。變更 `gateway.port` 後，請執行 `openclaw doctor --fix` 或 `openclaw gateway install --force`，以便 launchd/systemd/schtasks 在新連接埠上啟動程序。

Gateway 啟動時，在為非 loopback 綁定植入本機 Control UI 來源時，會使用相同的有效連接埠和綁定。例如，`--bind lan --port 3000` 會在執行時期驗證之前植入 `http://localhost:3000` 和 `http://127.0.0.1:3000`。請將任何遠端瀏覽器來源（例如 HTTPS proxy URL）明確新增至 `gateway.controlUi.allowedOrigins`。

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

`gateway status --deep` 用於額外的服務探索 (LaunchDaemons/systemd system units/schtasks)，而非更深入的 RPC 健康狀態檢查。

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
- 當有多個目標回應時，`gateway probe` 可以針對 `multiple reachable gateways` 發出警告。
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

## VoiceClaw 即時大腦端點

OpenClaw 在 `/voiceclaw/realtime` 公開一個 VoiceClaw 相容的即時 WebSocket 端點。當 VoiceClaw 桌面客戶端應直接與即時 OpenClaw 大腦通訊，而不透過個別中繼程序時使用它。

此端點使用 Gemini Live 進行即時音訊處理，並透過將 OpenClaw 工具直接公開給 Gemini Live，來呼叫 OpenClaw 作為大腦。工具呼叫會傳回即時 `working` 結果以保持語音輪詢的回應性，然後 OpenClaw 會非同步執行實際工具，並將結果重新注入即時工作階段。在 Gateway 程序環境中設定 `GEMINI_API_KEY`。如果啟用了 Gateway 驗證，桌面客戶端會在其第一個 `session.config` 訊息中傳送 Gateway 權杖或密碼。

即時大腦存取會執行所有者授權的 OpenClaw 代理程式指令。請將 `gateway.auth.mode: "none"` 限制為僅限回送測試執行個體。非本機即時大腦連線需要 Gateway 驗證。

若要建立獨立的測試 Gateway，請使用自己的連接埠、設定和狀態執行個別執行個體：

```bash
OPENCLAW_CONFIG_PATH=/path/to/openclaw-realtime/openclaw.json \
OPENCLAW_STATE_DIR=/path/to/openclaw-realtime/state \
OPENCLAW_SKIP_CHANNELS=1 \
GEMINI_API_KEY=... \
openclaw gateway --port 19789
```

然後設定 VoiceClaw 以使用：

```text
ws://127.0.0.1:19789/voiceclaw/realtime
```

## 遠端存取

首選：Tailscale/VPN。
備選：SSH 通道。

```bash
ssh -N -L 18789:127.0.0.1:18789 user@host
```

然後將客戶端在本機連線至 `ws://127.0.0.1:18789`。

<Warning>SSH 通道無法繞過 Gateway 驗證。對於共用金鑰驗證，客戶端即使在通道上仍必須傳送 `token`/`password`。對於承載識別的模式，請求仍須滿足該驗證路徑。</Warning>

請參閱：[Remote Gateway](/zh-Hant/gateway/remote)、[Authentication](/zh-Hant/gateway/authentication)、[Tailscale](/zh-Hant/gateway/tailscale)。

## 監督與服務生命週期

使用監督執行以獲得生產環境等級的可靠性。

<Tabs>
  <Tab title="macOS (launchd)">

```bash
openclaw gateway install
openclaw gateway status
openclaw gateway restart
openclaw gateway stop
```

請使用 `openclaw gateway restart` 進行重新啟動。請勿連結使用 `openclaw gateway stop` 和 `openclaw gateway start`；在 macOS 上，`gateway stop` 會在停止服務之前刻意停用 LaunchAgent。

LaunchAgent 標籤為 `ai.openclaw.gateway` (預設) 或 `ai.openclaw.<profile>` (命名設定檔)。`openclaw doctor` 會稽核並修復服務設定偏移。

  </Tab>

  <Tab title="Linux (systemd user)">

```bash
openclaw gateway install
systemctl --user enable --now openclaw-gateway[-<profile>].service
openclaw gateway status
```

若要在登出後保持執行，請啟用 lingering 功能：

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

原生 Windows 受控啟動會使用名為 `OpenClaw Gateway`
(或命名設定檔則為 `OpenClaw Gateway (<profile>)`) 的「排定任務」。若建立「排定任務」
被拒絕，OpenClaw 會退回到每個使用者的「啟動」資料夾啟動器，
該啟動器指向狀態目錄內的 `gateway.cmd`。

  </Tab>

  <Tab title="Linux (system service)">

請針對多使用者/一直線主機使用系統單元。

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now openclaw-gateway[-<profile>].service
```

使用與使用者單元相同的服務內容，但將其安裝在
`/etc/systemd/system/openclaw-gateway[-<profile>].service` 之下，並在您的 `openclaw` 執行檔位於其他位置時調整
`ExecStart=`。

同時不要讓 `openclaw doctor --fix` 為相同的設定檔/連接埠安裝使用者層級的閘道服務。當 Doctor 發現系統層級的 OpenClaw 閘道服務時，會拒絕該自動安裝；當系統單元擁有生命週期時，請使用 `OPENCLAW_SERVICE_REPAIR_POLICY=external`。

  </Tab>
</Tabs>

## Dev 設定檔快速途徑

```bash
openclaw --dev setup
openclaw --dev gateway --allow-unconfigured
openclaw --dev status
```

預設值包括隔離的狀態/設定和基礎閘道連接埠 `19001`。

## 通訊協定快速參考 (操作員檢視)

- 第一個客戶端框架必須是 `connect`。
- Gateway 傳回 `hello-ok` 快照（`presence`、`health`、`stateVersion`、`uptimeMs`、limits/policy）。
- `hello-ok.features.methods` / `events` 是一個保守的探索清單，並非
  所有可呼叫協助路由的傾印。
- 請求：`req(method, params)` → `res(ok/payload|error)`。
- 常見事件包括 `connect.challenge`、`agent`、`chat`、
  `session.message`、`session.tool`、`sessions.changed`、`presence`、`tick`、
  `health`、`heartbeat`、配對/核准生命週期事件以及 `shutdown`。

Agent 執行分為兩個階段：

1. 立即接受的確認（`status:"accepted"`）
2. 最終完成回應（`status:"ok"|"error"`），中間包含串流的 `agent` 事件。

請參閱完整的通訊協定文件：[Gateway 通訊協定](/zh-Hant/gateway/protocol)。

## 營運檢查

### 存活度

- 開啟 WS 並傳送 `connect`。
- 預期收到帶有快照的 `hello-ok` 回應。

### 就緒度

```bash
openclaw gateway status
openclaw channels status --probe
openclaw health
```

### 間隙恢復

事件不會重播。當序列出現間隙時，請在繼續之前重新整理狀態（`health`、`system-presence`）。

## 常見失敗特徵

| 特徵                                                           | 可能問題                                                   |
| -------------------------------------------------------------- | ---------------------------------------------------------- |
| `refusing to bind gateway ... without auth`                    | 在沒有有效的 gateway auth 路徑的情況下進行非 loopback 繫結 |
| `another gateway instance is already listening` / `EADDRINUSE` | 連接埠衝突                                                 |
| `Gateway start blocked: set gateway.mode=local`                | 設定為遠端模式，或是損毀的設定中缺少 local-mode 標記       |
| 連線期間發生 `unauthorized`                                    | 用戶端與 Gateway 之間的驗證不符                            |

如需完整的診斷步驟，請使用 [Gateway 疑難排解](/zh-Hant/gateway/troubleshooting)。

## 安全性保證

- 當 Gateway 無法使用時，Gateway 通訊協定用戶端會快速失敗（沒有隱含的直接通道後援）。
- 無效或非連線的首幀會被拒絕並關閉。
- 在關閉 socket 之前，優雅停機會發出 `shutdown` 事件。

---

相關：

- [疑難排解](/zh-Hant/gateway/troubleshooting)
- [背景處理程序](/zh-Hant/gateway/background-process)
- [組態](/zh-Hant/gateway/configuration)
- [健全狀況](/zh-Hant/gateway/health)
- [醫生](/zh-Hant/gateway/doctor)
- [驗證](/zh-Hant/gateway/authentication)

## 相關

- [組態](/zh-Hant/gateway/configuration)
- [Gateway 疑難排解](/zh-Hant/gateway/troubleshooting)
- [遠端存取](/zh-Hant/gateway/remote)
- [機密管理](/zh-Hant/gateway/secrets)
