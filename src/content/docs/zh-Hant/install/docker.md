---
summary: "可選的 OpenClaw Docker 設定與上手指南"
read_when:
  - You want a containerized gateway instead of local installs
  - You are validating the Docker flow
title: "Docker"
---

Docker 是**可選**的。僅在您想要容器化閘道或驗證 Docker 流程時使用。

## Docker 適合我嗎？

- **是**：您想要一個隔離的、可拋棄的閘道環境，或者想要在不進行本機安裝的主機上執行 OpenClaw。
- **否**：您在您自己的機器上執行，並且只想要最快的開發迴圈。請改用一般的安裝流程。
- **沙盒注意事項**：預設的沙盒後端在啟用沙盒時會使用 Docker，但沙盒預設是關閉的，並且**不**需要完整的閘道在 Docker 中執行。SSH 和 OpenShell 沙盒後端也可用。請參閱 [沙盒](/zh-Hant/gateway/sandboxing)。

## 先決條件

- Docker Desktop (或 Docker Engine) + Docker Compose v2
- 建置映像檔至少需要 2 GB RAM (在 1 GB 的主機上，`pnpm install` 可能會因 OOM 被終止並以 exit code 137 退出)
- 足夠的磁碟空間以存放映像檔和日誌
- 如果在 VPS/公開主機上執行，請檢閱
  [針對網路暴露的安全性加固](/zh-Hant/gateway/security)，
  特別是 Docker `DOCKER-USER` 防火牆政策。

## 容器化閘道

<Steps>
  <Step title="建置映像檔">
    從 repo 根目錄，執行設定腳本：

    ```bash
    ./scripts/docker/setup.sh
    ```

    這會在本機建置閘道映像檔。若要改用預先建置的映像檔：

    ```bash
    export OPENCLAW_IMAGE="ghcr.io/openclaw/openclaw:latest"
    ./scripts/docker/setup.sh
    ```

    預先建置的映像檔會發佈於
    [GitHub Container Registry](https://github.com/openclaw/openclaw/pkgs/container/openclaw)。
    常見標籤：`main`、`latest`、`<version>` (例如 `2026.2.26`)。

  </Step>

  <Step title="完成上手設定">
    設定腳本會自動執行上手設定。它將會：

    - 提示輸入 provider API 金鑰
    - 產生閘道 token 並將其寫入 `.env`
    - 透過 Docker Compose 啟動閘道

    在設定期間，啟動前的上手設定和配置寫入會直接透過
    `openclaw-gateway` 執行。`openclaw-cli` 是用於您在
    閘道容器已經存在後執行的指令。

  </Step>

  <Step title="開啟控制 UI">
    在瀏覽器中開啟 `http://127.0.0.1:18789/` 並將設定好的
    共享金鑰貼上至設定中。安裝腳本預設會將權杖寫入 `.env`；
    如果您將容器設定切換為密碼驗證，請改用該密碼。

    再次需要網址？

    ```bash
    docker compose run --rm openclaw-cli dashboard --no-open
    ```

  </Step>

  <Step title="設定頻道（選用）">
    使用 CLI 容器來新增訊息頻道：

    ```bash
    # WhatsApp (QR)
    docker compose run --rm openclaw-cli channels login

    # Telegram
    docker compose run --rm openclaw-cli channels add --channel telegram --token "<token>"

    # Discord
    docker compose run --rm openclaw-cli channels add --channel discord --token "<token>"
    ```

    文件：[WhatsApp](/zh-Hant/channels/whatsapp)、[Telegram](/zh-Hant/channels/telegram)、[Discord](/zh-Hant/channels/discord)

  </Step>
</Steps>

### 手動流程

如果您希望自己執行每個步驟，而不是使用安裝腳本：

```bash
docker build -t openclaw:local -f Dockerfile .
docker compose run --rm --no-deps --entrypoint node openclaw-gateway \
  dist/index.js onboard --mode local --no-install-daemon
docker compose run --rm --no-deps --entrypoint node openclaw-gateway \
  dist/index.js config set --batch-json '[{"path":"gateway.mode","value":"local"},{"path":"gateway.bind","value":"lan"},{"path":"gateway.controlUi.allowedOrigins","value":["http://localhost:18789","http://127.0.0.1:18789"]}]'
docker compose up -d openclaw-gateway
```

<Note>從 repo 根目錄執行 `docker compose`。如果您啟用了 `OPENCLAW_EXTRA_MOUNTS` 或 `OPENCLAW_HOME_VOLUME`，安裝腳本會寫入 `docker-compose.extra.yml`； 請使用 `-f docker-compose.yml -f docker-compose.extra.yml` 將其包含在內。</Note>

<Note>因為 `openclaw-cli` 共用 `openclaw-gateway` 的網路命名空間，它是 一個啟動後工具。在 `docker compose up -d openclaw-gateway` 之前，請透過 `openclaw-gateway` 使用 `--no-deps --entrypoint node` 來執行上架與安裝時期的設定寫入。</Note>

### 環境變數

安裝腳本接受這些選用的環境變數：

| 變數                                       | 用途                                                      |
| ------------------------------------------ | --------------------------------------------------------- |
| `OPENCLAW_IMAGE`                           | 使用遠端映像檔而非在本地建構                              |
| `OPENCLAW_DOCKER_APT_PACKAGES`             | 在建構期間安裝額外的 apt 套件（以空格分隔）               |
| `OPENCLAW_EXTENSIONS`                      | 在建構時預先安裝外掛相依項（以空格分隔的名稱）            |
| `OPENCLAW_EXTRA_MOUNTS`                    | 額外的主機綁定掛載（以逗號分隔的 `source:target[:opts]`） |
| `OPENCLAW_HOME_VOLUME`                     | 在具名的 Docker volume 中保存 `/home/node`                |
| `OPENCLAW_SANDBOX`                         | 選擇加入沙箱啟動程序（`1`、`true`、`yes`、`on`）          |
| `OPENCLAW_DOCKER_SOCKET`                   | 覆寫 Docker socket 路徑                                   |
| `OPENCLAW_DISABLE_BONJOUR`                 | 停用 Bonjour/mDNS 廣告（Docker 預設為 `1`）               |
| `OPENCLAW_DISABLE_BUNDLED_SOURCE_OVERLAYS` | 停用捆綁的外掛來源綁定掛載覆疊                            |
| `OTEL_EXPORTER_OTLP_ENDPOINT`              | 用於 OpenTelemetry 匯出的共用 OTLP/HTTP 收集器端點        |
| `OTEL_EXPORTER_OTLP_*_ENDPOINT`            | 用於追蹤、指標或日誌的特定訊號 OTLP 端點                  |
| `OTEL_EXPORTER_OTLP_PROTOCOL`              | OTLP 協定覆寫。目前僅支援 `http/protobuf`                 |
| `OTEL_SERVICE_NAME`                        | 用於 OpenTelemetry 資源的服務名稱                         |
| `OTEL_SEMCONV_STABILITY_OPT_IN`            | 啟用最新的實驗性 GenAI 語意屬性                           |
| `OPENCLAW_OTEL_PRELOADED`                  | 當預先載入一個 OpenTelemetry SDK 時，跳過啟動第二個 SDK   |

維護者可以透過將一個外掛來源目錄掛載到其封裝的來源路徑上，來針對封裝的映像檔測試捆綁的外掛來源，例如 `OPENCLAW_EXTRA_MOUNTS=/path/to/fork/extensions/synology-chat:/app/extensions/synology-chat:ro`。該掛載的來源目錄會覆寫相同外掛 ID 的相符已編譯 `/app/dist/extensions/synology-chat` 捆綁包。

### 可觀測性

OpenTelemetry 匯出是從 Gateway 容器向外到您的 OTLP 收集器。它不需要發布的 Docker 連接埠。如果您在本地建構映像檔並且希望映像檔內部有可用的捆綁 OpenTelemetry 匯出器，請包含其執行時期相依性：

```bash
export OPENCLAW_EXTENSIONS="diagnostics-otel"
export OTEL_EXPORTER_OTLP_ENDPOINT="http://otel-collector:4318"
export OTEL_SERVICE_NAME="openclaw-gateway"
./scripts/docker/setup.sh
```

官方的 OpenClaw Docker 發行映像檔包含捆綁的 `diagnostics-otel` 外掛來源。根據映像檔和快取狀態，Gateway 可能仍會在第一次啟用外掛時暫存外掛本地的 OpenTelemetry 執行時期相依性，因此請允許該首次啟動連線到套件登錄庫，或是在您的發行管道中預熱映像檔。若要啟用匯出，請在設定中允許並啟用 `diagnostics-otel` 外掛，然後設定 `diagnostics.otel.enabled=true` 或使用 [OpenTelemetry export](/zh-Hant/gateway/opentelemetry) 中的設定範例。收集器驗證標頭是透過 `diagnostics.otel.headers` 設定的，而不是透過 Docker 環境變數。

Prometheus 指標使用已發布的 Gateway 連接埠。啟用 `diagnostics-prometheus` 外掛，然後進行擷取：

```text
http://<gateway-host>:18789/api/diagnostics/prometheus
```

此路由受 Gateway 驗證保護。請勿公開單獨的
公用 `/metrics` 連接埠或未經驗證的反向 Proxy 路徑。請參閱
[Prometheus 指標](/zh-Hant/gateway/prometheus)。

### 健康檢查

容器探測端點（無需驗證）：

```bash
curl -fsS http://127.0.0.1:18789/healthz   # liveness
curl -fsS http://127.0.0.1:18789/readyz     # readiness
```

Docker 映像檔包含內建的 `HEALTHCHECK`，會對 `/healthz` 進行 Ping 檢查。
如果檢查持續失敗，Docker 會將容器標記為 `unhealthy`，
編排系統即可重新啟動或取代它。

經驗證的深度健康狀態快照：

```bash
docker compose exec openclaw-gateway node dist/index.js health --token "$OPENCLAW_GATEWAY_TOKEN"
```

### 區域網路 vs 回環

`scripts/docker/setup.sh` 預設為 `OPENCLAW_GATEWAY_BIND=lan`，因此主機對
`http://127.0.0.1:18789` 的存取可透過 Docker 連接埠發佈運作。

- `lan` (預設)：主機瀏覽器和主機 CLI 可存取已發佈的 Gateway 連接埠。
- `loopback`：僅容器網路命名空間內的程序
  可直接存取 Gateway。

<Note>請在 `gateway.bind` 中使用綁定模式值 (`lan` / `loopback` / `custom` / `tailnet` / `auto`)，請勿使用 `0.0.0.0` 或 `127.0.0.1` 等主機別名。</Note>

### 主機本機提供者

當 OpenClaw 在 Docker 中執行時，容器內的 `127.0.0.1` 是容器
本身，而非您的主機。請對在主機上執行的 AI 提供者使用 `host.docker.internal`：

| 提供者    | 主機預設 URL             | Docker 設定 URL                     |
| --------- | ------------------------ | ----------------------------------- |
| LM Studio | `http://127.0.0.1:1234`  | `http://host.docker.internal:1234`  |
| Ollama    | `http://127.0.0.1:11434` | `http://host.docker.internal:11434` |

隨附的 Docker 設定會將這些主機 URL 用作 LM Studio 和 Ollama
的入門預設值，且 `docker-compose.yml` 會將 `host.docker.internal` 對應至
Linux Docker Engine 的 Docker 主機閘道。Docker Desktop 已在 macOS 和 Windows 上
提供相同的主機名稱。

主機服務也必須監聽 Docker 可存取的位址：

```bash
lms server start --port 1234 --bind 0.0.0.0
OLLAMA_HOST=0.0.0.0:11434 ollama serve
```

如果您使用自己的 Compose 檔案或 `docker run` 指令，請自行加入相同的主機對應，例如
`--add-host=host.docker.internal:host-gateway`。

### Bonjour / mDNS

Docker 橋接網路通常無法可靠地轉發 Bonjour/mDNS 多播
(`224.0.0.251:5353`)。因此，隨附的 Compose 設定預設
`OPENCLAW_DISABLE_BONJOUR=1`，以免當橋接網路丟棄多播流量時，Gateway 進入崩潰迴圈或
重複重新啟動廣播。

對於 Docker 主機，請使用發布的 Gateway URL、Tailscale 或廣域 DNS-SD。
僅當使用主機網路、macvlan 或其他已知可正常使用 mDNS 多播的網路時，才設定
`OPENCLAW_DISABLE_BONJOUR=0`。

如需注意事項和故障排除，請參閱 [Bonjour discovery](/zh-Hant/gateway/bonjour)。

### 儲存空間與持久性

Docker Compose 將 `OPENCLAW_CONFIG_DIR` 綁定掛載至 `/home/node/.openclaw`，並將
`OPENCLAW_WORKSPACE_DIR` 綁定掛載至 `/home/node/.openclaw/workspace`，因此這些路徑
在容器更換後會保留下來。

該掛載的設定目錄是 OpenClaw 儲存以下內容的地方：

- `openclaw.json` 用於行為設定
- `agents/<agentId>/agent/auth-profiles.json` 用於儲存的供應商 OAuth/API 金鑰認證
- `.env` 用於基於環境變數的執行時期秘密，例如 `OPENCLAW_GATEWAY_TOKEN`

關於 VM 部署的完整持久性詳細資訊，請參閱
[Docker VM Runtime - What persists where](/zh-Hant/install/docker-vm-runtime#what-persists-where)。

**磁碟空間增長熱點：** 請注意 `media/`、session JSONL 檔案、
`cron/runs/*.jsonl`，以及 `/tmp/openclaw/` 下的輪替檔案紀錄。

### Shell 輔助工具（可選）

為了更輕鬆地進行日常 Docker 管理，請安裝 `ClawDock`：

```bash
mkdir -p ~/.clawdock && curl -sL https://raw.githubusercontent.com/openclaw/openclaw/main/scripts/clawdock/clawdock-helpers.sh -o ~/.clawdock/clawdock-helpers.sh
echo 'source ~/.clawdock/clawdock-helpers.sh' >> ~/.zshrc && source ~/.zshrc
```

如果您是透過較舊的 `scripts/shell-helpers/clawdock-helpers.sh` 原始路徑安裝 ClawDock，請重新執行上述安裝指令，讓您的本機輔助檔案追蹤到新位置。

然後使用 `clawdock-start`、`clawdock-stop`、
`clawdock-dashboard` 等。執行
`clawdock-help` 查看所有指令。
如需完整的輔助工具指南，請參閱 [ClawDock](/zh-Hant/install/clawdock)。

<AccordionGroup>
  <Accordion title="Enable agent sandbox for Docker gateway">
    ```bash
    export OPENCLAW_SANDBOX=1
    ./scripts/docker/setup.sh
    ```

    自訂 socket 路徑（例如無 root 權限的 Docker）

    ```bash
    export OPENCLAW_SANDBOX=1
    export OPENCLAW_DOCKER_SOCKET=/run/user/1000/docker.sock
    ./scripts/docker/setup.sh
    ```

    此腳本會在沙箱先決條件通過後才掛載 `docker.sock`。如果
    沙箱設定無法完成，腳本會將 `agents.defaults.sandbox.mode`
    重設為 `off`。

  </Accordion>

  <Accordion title="Automation / CI (non-interactive)">
    使用 `-T` 停用 Compose 擬似 TTY 配置：

    ```bash
    docker compose run -T --rm openclaw-cli gateway probe
    docker compose run -T --rm openclaw-cli devices list --json
    ```

  </Accordion>

<Accordion title="Shared-network security note">`openclaw-cli` 使用 `network_mode: "service:openclaw-gateway"`，讓 CLI 指令能透過 `127.0.0.1` 存取閘道。請將此視為一個共享 的信任邊界。Compose 配置會捨棄 `NET_RAW`/`NET_ADMIN` 並在 `openclaw-cli` 上啟用 `no-new-privileges`。</Accordion>

  <Accordion title="Permissions and EACCES">
    映像檔以 `node` (uid 1000) 身分執行。如果您在 `/home/node/.openclaw` 上看到
    權限錯誤，請確定您的主機綁定掛載是由 uid 1000 所擁有：

    ```bash
    sudo chown -R 1000:1000 /path/to/openclaw-config /path/to/openclaw-workspace
    ```

  </Accordion>

  <Accordion title="Faster rebuilds">
    排序您的 Dockerfile 以快取相依性層。這可避免除非鎖定檔變更，否則重新執行
    `pnpm install`：

    ```dockerfile
    FROM node:24-bookworm
    RUN curl -fsSL https://bun.sh/install | bash
    ENV PATH="/root/.bun/bin:${PATH}"
    RUN corepack enable
    WORKDIR /app
    COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
    COPY ui/package.json ./ui/package.json
    COPY scripts ./scripts
    RUN pnpm install --frozen-lockfile
    COPY . .
    RUN pnpm build
    RUN pnpm ui:install
    RUN pnpm ui:build
    ENV NODE_ENV=production
    CMD ["node","dist/index.js"]
    ```

  </Accordion>

  <Accordion title="進階使用者容器選項">
    預設映像檔以安全為優先，並以非 root 身分執行 `node`。若要使用
    功能更齊全的容器：

    1. **保存 `/home/node`**：`export OPENCLAW_HOME_VOLUME="openclaw_home"`
    2. **內建系統相依項**：`export OPENCLAW_DOCKER_APT_PACKAGES="git curl jq"`
    3. **安裝 Playwright 瀏覽器**：
       ```bash
       docker compose run --rm openclaw-cli \
         node /app/node_modules/playwright-core/cli.js install chromium
       ```
    4. **保存瀏覽器下載項目**：設定
       `PLAYWRIGHT_BROWSERS_PATH=/home/node/.cache/ms-playwright` 並使用
       `OPENCLAW_HOME_VOLUME` 或 `OPENCLAW_EXTRA_MOUNTS`。

  </Accordion>

<Accordion title="OpenAI Codex OAuth (無頭模式 Docker)">如果您在精靈中選擇 OpenAI Codex OAuth，它會開啟瀏覽器 URL。在 Docker 或無頭模式設定中，請複製您重新導向後的完整 URL，並貼回 精靈中以完成驗證。</Accordion>

  <Accordion title="基礎映像檔中繼資料">
    主要 Docker 執行時映像檔使用 `node:24-bookworm-slim` 並發布 OCI
    基礎映像檔註解，包括 `org.opencontainers.image.base.name`、
    `org.opencontainers.image.source` 等。Node 基礎摘要會透過 Dependabot Docker 基礎映像檔 PR 重新整理；發布版本不會執行
    發行版升級層。請參閱
    [OCI image annotations](https://github.com/opencontainers/image-spec/blob/main/annotations.md)。
  </Accordion>
</AccordionGroup>

### 在 VPS 上執行？

請參閱 [Hetzner (Docker VPS)](/zh-Hant/install/hetzner) 和
[Docker VM Runtime](/zh-Hant/install/docker-vm-runtime) 以取得共用 VM 部署步驟，
包括二進位檔製作、資料持久化與更新。

## Agent 沙盒

當使用 Docker 後端啟用 `agents.defaults.sandbox` 時，閘道
會在隔離的 Docker 容器內執行 agent 工具操作 (shell、檔案讀寫等)，
而閘道本身則停留在主機上。這為不信任或多租戶的 agent 工作階段提供了強力的隔離，
而無需將整個閘道容器化。

沙盒範圍可以是每個 agent (預設)、每個工作階段或共用。每個範圍
都有自己的工作區，掛載於 `/workspace`。您也可以設定
允許/拒絕工具原則、網路隔離、資源限制和瀏覽器
容器。

有關完整的配置、映像檔、安全性說明以及多代理設定檔，請參閱：

- [Sandboxing](/zh-Hant/gateway/sandboxing) -- 完整的沙盒參考資料
- [OpenShell](/zh-Hant/gateway/openshell) -- 沙盒容器的互動式 shell 存取
- [Multi-Agent Sandbox and Tools](/zh-Hant/tools/multi-agent-sandbox-tools) -- 每個代理的覆寫設定

### 快速啟用

```json5
{
  agents: {
    defaults: {
      sandbox: {
        mode: "non-main", // off | non-main | all
        scope: "agent", // session | agent | shared
      },
    },
  },
}
```

建構預設的沙盒映像檔：

```bash
scripts/sandbox-setup.sh
```

## 疑難排解

<AccordionGroup>
  <Accordion title="Image missing or sandbox container not starting">
    使用
    [`scripts/sandbox-setup.sh`](https://github.com/openclaw/openclaw/blob/main/scripts/sandbox-setup.sh)
    建構沙盒映像檔，或將 `agents.defaults.sandbox.docker.image` 設定為您的自訂映像檔。
    容器會根據需求在每個工作階段自動建立。
  </Accordion>

<Accordion title="Permission errors in sandbox">將 `docker.user` 設定為符合您掛載工作區所有權的 UID:GID， 或對工作區資料夾執行 chown。</Accordion>

<Accordion title="Custom tools not found in sandbox">OpenClaw 會使用 `sh -lc` (login shell) 執行指令，該 shell 會載入 `/etc/profile` 並可能重設 PATH。請設定 `docker.env.PATH` 以在前面新增您的 自訂工具路徑，或在您的 Dockerfile 中 `/etc/profile.d/` 下新增一個腳本。</Accordion>

<Accordion title="OOM-killed during image build (exit 137)">VM 至少需要 2 GB RAM。請使用更大的機器類別並重試。</Accordion>

  <Accordion title="Unauthorized or pairing required in Control UI">
    取得一個新的儀表板連結並核准瀏覽器裝置：

    ```bash
    docker compose run --rm openclaw-cli dashboard --no-open
    docker compose run --rm openclaw-cli devices list
    docker compose run --rm openclaw-cli devices approve <requestId>
    ```

    更多細節：[Dashboard](/zh-Hant/web/dashboard)、[Devices](/zh-Hant/cli/devices)。

  </Accordion>

  <Accordion title="Gateway target shows ws://172.x.x.x or pairing errors from Docker CLI">
    重設 gateway 模式並重新綁定：

    ```bash
    docker compose run --rm openclaw-cli config set --batch-json '[{"path":"gateway.mode","value":"local"},{"path":"gateway.bind","value":"lan"}]'
    docker compose run --rm openclaw-cli devices list --url ws://127.0.0.1:18789
    ```

  </Accordion>
</AccordionGroup>

## 相關內容

- [Install Overview](/zh-Hant/install) — 所有安裝方法
- [Podman](/zh-Hant/install/podman) — Podman 的 Docker 替代方案
- [ClawDock](/zh-Hant/install/clawdock) — Docker Compose 社群設置
- [更新](/zh-Hant/install/updating) — 保持 OpenClaw 為最新狀態
- [組態](/zh-Hant/gateway/configuration) — 安裝後的閘道組態
