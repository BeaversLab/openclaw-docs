---
summary: "OpenClaw 的可選 Docker 設定與上手導覽"
read_when:
  - You want a containerized gateway instead of local installs
  - You are validating the Docker flow
title: "Docker"
---

Docker 是**可選**的。僅在您想要容器化閘道或驗證 Docker 流程時使用。

## Docker 適合我嗎？

- **是**：您想要一個隔離的、可拋棄的閘道環境，或者想要在不進行本機安裝的主機上執行 OpenClaw。
- **否**：您在您自己的機器上執行，並且只想要最快的開發迴圈。請改用一般的安裝流程。
- **沙盒備註**：啟用沙盒時，預設的沙盒後端會使用 Docker，但沙盒預設為關閉，且**不**需要完整的閘道在 Docker 中執行。也可以使用 SSH 和 OpenShell 沙盒後端。請參閱 [Sandboxing](/zh-Hant/gateway/sandboxing)。

## 先決條件

- Docker Desktop (或 Docker Engine) + Docker Compose v2
- 建置映像檔至少需要 2 GB RAM（在 1 GB 的主機上，`pnpm install` 可能會因為 OOM 而被終止並回傳 exit 137）
- 足夠的磁碟空間以存放映像檔和日誌
- 如果在 VPS/公開主機上執行，請參閱
  [Security hardening for network exposure](/zh-Hant/gateway/security)，
  特別是 Docker `DOCKER-USER` 防火牆策略。

## 容器化閘道

<Steps>
  <Step title="建置映像檔">
    從存放庫根目錄執行安裝腳本：

    ```bash
    ./scripts/docker/setup.sh
    ```

    這會在本地建置 Gateway 映像檔。若要改用預先建置的映像檔：

    ```bash
    export OPENCLAW_IMAGE="ghcr.io/openclaw/openclaw:latest"
    ./scripts/docker/setup.sh
    ```

    預先建置的映像檔會發佈至
    [GitHub Container Registry](https://github.com/openclaw/openclaw/pkgs/container/openclaw)。
    常見標籤：`main`、`latest`、`<version>` (例如 `2026.2.26`)。

  </Step>

  <Step title="完成引導">
    安裝腳本會自動執行引導流程。它將會：

    - 提示輸入提供商 API 金鑰
    - 產生 gateway token 並寫入 `.env`
    - 建立 auth-profile 密鑰目錄
    - 透過 Docker Compose 啟動 gateway

    在設定過程中，啟動前的引導與設定寫入會直接透過
    `openclaw-gateway` 執行。`openclaw-cli` 則是用於在
    gateway 容器已存在後您所執行的指令。

  </Step>

  <Step title="Open the Control UI">
    在瀏覽器中開啟 `http://127.0.0.1:18789/`，並將配置好的
    共享金鑰貼上至設定中。設定腳本預設會將權杖寫入 `.env`；
    如果您將容器設定切換為密碼驗證，請改用該密碼。

    需要再次取得網址嗎？

    ```bash
    docker compose run --rm openclaw-cli dashboard --no-open
    ```

  </Step>

  <Step title="設定頻道（選用）">
    使用 CLI 容器新增訊息頻道：

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

<Note>請從 repo 根目錄執行 `docker compose`。如果您啟用了 `OPENCLAW_EXTRA_MOUNTS` 或 `OPENCLAW_HOME_VOLUME`，設定腳本會寫入 `docker-compose.extra.yml`； 請使用 `-f docker-compose.yml -f docker-compose.extra.yml` 將其包含在內。</Note>

<Note>因為 `openclaw-cli` 共用 `openclaw-gateway` 的網路命名空間，它是 一個啟動後工具。在 `docker compose up -d openclaw-gateway` 之前，請透過 `openclaw-gateway` 使用 `--no-deps --entrypoint node` 來執行上架和設定時間的設定寫入。</Note>

### 環境變數

安裝腳本接受這些選用的環境變數：

| 變數                                       | 用途                                                    |
| ------------------------------------------ | ------------------------------------------------------- |
| `OPENCLAW_IMAGE`                           | 使用遠端映像檔而非在本地建構                            |
| `OPENCLAW_IMAGE_APT_PACKAGES`              | 在建構期間安裝額外的 apt 套件（以空格分隔）             |
| `OPENCLAW_IMAGE_PIP_PACKAGES`              | 在建置期間安裝額外的 Python 套件（以空格分隔）          |
| `OPENCLAW_EXTENSIONS`                      | 在建置時預先安裝外掛程式相依性（以空格分隔的名稱）      |
| `OPENCLAW_EXTRA_MOUNTS`                    | 額外主機繫結掛載（以逗號分隔的 `source:target[:opts]`） |
| `OPENCLAW_HOME_VOLUME`                     | 在命名的 Docker volume 中保存 `/home/node`              |
| `OPENCLAW_SANDBOX`                         | 選擇加入沙箱啟動程序（`1`、`true`、`yes`、`on`）        |
| `OPENCLAW_SKIP_ONBOARDING`                 | 跳過互動式上架步驟（`1`、`true`、`yes`、`on`）          |
| `OPENCLAW_DOCKER_SOCKET`                   | 覆寫 Docker socket 路徑                                 |
| `OPENCLAW_DISABLE_BONJOUR`                 | 停用 Bonjour/mDNS 廣告（對 Docker 預設為 `1`）          |
| `OPENCLAW_DISABLE_BUNDLED_SOURCE_OVERLAYS` | 停用隨附的外掛程式原始碼繫結掛載疊加層                  |
| `OTEL_EXPORTER_OTLP_ENDPOINT`              | 用於 OpenTelemetry 匯出的共用 OTLP/HTTP 收集器端點      |
| `OTEL_EXPORTER_OTLP_*_ENDPOINT`            | 針對追蹤、指標或日誌的特定訊號 OTLP 端點                |
| `OTEL_EXPORTER_OTLP_PROTOCOL`              | OTLP 通訊協定覆寫。目前僅支援 `http/protobuf`           |
| `OTEL_SERVICE_NAME`                        | 用於 OpenTelemetry 資源的服務名稱                       |
| `OTEL_SEMCONV_STABILITY_OPT_IN`            | 選用最新的實驗性 GenAI 語意屬性                         |
| `OPENCLAW_OTEL_PRELOADED`                  | 當已預先載入一個 OpenTelemetry SDK 時，跳過啟動第二個   |

官方 Docker 映像檔並未附帶 Homebrew。在入門引導期間，當 OpenClaw 在沒有 `brew` 的 Linux 容器中執行時，會隱藏僅限 brew 的技能相依性安裝程式；這些相依性必須由自訂映像檔提供或手動安裝。對於可從 Debian 套件取得的相依性，請在映像檔建構期間使用 `OPENCLAW_IMAGE_APT_PACKAGES`。舊版 `OPENCLAW_DOCKER_APT_PACKAGES` 名稱仍可接受。
對於 Python 相依性，請使用 `OPENCLAW_IMAGE_PIP_PACKAGES`。這會在映像檔建構期間執行 `python3 -m pip install --break-system-packages`，因此請固定套件版本並僅使用您信任的套件索引。

維護者可以透過將一個外掛程式原始碼目錄掛載在其封裝的原始碼路徑之上，來針對封裝映像檔測試隨附的外掛程式原始碼，例如 `OPENCLAW_EXTRA_MOUNTS=/path/to/fork/extensions/synology-chat:/app/extensions/synology-chat:ro`。
該掛載的原始碼目錄會覆寫相同外掛程式 ID 的相符已編譯 `/app/dist/extensions/synology-chat` 套件組合。

### 可觀測性

OpenTelemetry 匯出是從 Gateway 容器向外傳送到您的 OTLP 收集器。它不需要發佈的 Docker 連接埠。如果您在本地建構映像檔，並希望映像檔內含隨附的 OpenTelemetry 匯出器，請包含其執行階段相依性：

```bash
export OPENCLAW_EXTENSIONS="diagnostics-otel"
export OTEL_EXPORTER_OTLP_ENDPOINT="http://otel-collector:4318"
export OTEL_SERVICE_NAME="openclaw-gateway"
./scripts/docker/setup.sh
```

在封裝的 Docker 安裝中，請在啟用匯出之前，從 ClawHub 安裝官方 `@openclaw/diagnostics-otel` 外掛程式。自訂從原始碼建構的映像檔仍可使用 `OPENCLAW_EXTENSIONS=diagnostics-otel` 包含本地外掛程式原始碼。若要啟用匯出，請在設定中允許並啟用 `diagnostics-otel` 外掛程式，然後設定 `diagnostics.otel.enabled=true` 或使用 [OpenTelemetry export](/zh-Hant/gateway/opentelemetry) 中的設定範例。收集器驗證標頭是透過 `diagnostics.otel.headers` 設定，而非透過 Docker 環境變數。

Prometheus 指標使用已發布的 Gateway 連接埠。請安裝
`clawhub:@openclaw/diagnostics-prometheus`，啟用
`diagnostics-prometheus` 外掛程式，然後進行抓取：

```text
http://<gateway-host>:18789/api/diagnostics/prometheus
```

此路由受到 Gateway 驗證的保護。請勿公開單獨的
公用 `/metrics` 連接埠或未經驗證的反向代理路徑。請參閱
[Prometheus 指標](/zh-Hant/gateway/prometheus)。

### 健康檢查

容器探測端點（無需驗證）：

```bash
curl -fsS http://127.0.0.1:18789/healthz   # liveness
curl -fsS http://127.0.0.1:18789/readyz     # readiness
```

Docker 映像檔包含內建的 `HEALTHCHECK`，可對 `/healthz` 進行 Ping。
如果檢查持續失敗，Docker 會將容器標記為 `unhealthy`，
編排系統便可以重新啟動或取代它。

已驗證的深度健康狀態快照：

```bash
docker compose exec openclaw-gateway node dist/index.js health --token "$OPENCLAW_GATEWAY_TOKEN"
```

### LAN vs loopback

`scripts/docker/setup.sh` 預設為 `OPENCLAW_GATEWAY_BIND=lan`，因此主機對
`http://127.0.0.1:18789` 的存取可透過 Docker 連接埠發佈運作。

- `lan` (預設)：主機瀏覽器和主機 CLI 可以連線到已發布的 gateway 連接埠。
- `loopback`：只有容器網路命名空間內的程序可以直接
  連線到 gateway。

<Note>請在 `gateway.bind` 中使用綁定模式值 (`lan` / `loopback` / `custom` / `tailnet` / `auto`)，而不是像 `0.0.0.0` 或 `127.0.0.1` 這樣的主機別名。</Note>

### 主機本機提供者

當 OpenClaw 在 Docker 中執行時，容器內的 `127.0.0.1` 是容器
本身，而不是您的主機。對於在主機上執行的 AI 提供者，請使用 `host.docker.internal`：

| 提供者    | 主機預設 URL             | Docker 設定 URL                     |
| --------- | ------------------------ | ----------------------------------- |
| LM Studio | `http://127.0.0.1:1234`  | `http://host.docker.internal:1234`  |
| Ollama    | `http://127.0.0.1:11434` | `http://host.docker.internal:11434` |

隨附的 Docker 設定使用這些主機 URL 作為 LM Studio 和 Ollama
的入門預設值，並且 `docker-compose.yml` 將 `host.docker.internal` 對應到
Linux Docker Engine 的 Docker 主機閘道。Docker Desktop 已經在 macOS 和 Windows 上
提供相同的主機名稱。

主機服務也必須監聽 Docker 可存取的位址：

```bash
lms server start --port 1234 --bind 0.0.0.0
OLLAMA_HOST=0.0.0.0:11434 ollama serve
```

如果您使用自己的 Compose 檔案或 `docker run` 指令，請自行加入相同的主機
映射，例如
`--add-host=host.docker.internal:host-gateway`。

### Bonjour / mDNS

Docker 橋接網路通常無法可靠地轉發 Bonjour/mDNS 多播
(`224.0.0.251:5353`)。因此，隨附的 Compose 設定預設
`OPENCLAW_DISABLE_BONJOUR=1`，以免當橋接網路捨棄多播流量時，Gateway 發生
崩潰迴圈或反覆重啟廣告。

對於 Docker 主機，請使用已發布的 Gateway URL、Tailscale 或廣域 DNS-SD。
僅在使用主機網路、macvlan 或其他已知 mDNS 多播可運作的網路時，才設定
`OPENCLAW_DISABLE_BONJOUR=0`。

如需注意事項與疑難排解，請參閱 [Bonjour discovery](/zh-Hant/gateway/bonjour)。

### 儲存與持久性

Docker Compose 將 `OPENCLAW_CONFIG_DIR` 綁定掛載至 `/home/node/.openclaw`，
將 `OPENCLAW_WORKSPACE_DIR` 綁定掛載至 `/home/node/.openclaw/workspace`，並將
`OPENCLAW_AUTH_PROFILE_SECRET_DIR` 綁定掛載至 `/home/node/.config/openclaw`，因此這些
路徑在容器替換後會保留下來。當任何變數未設定時，隨附的
`docker-compose.yml` 會回退至 `${HOME}` 之下，或在
`HOME` 本身也缺失時回退至 `/tmp`。這可防止
`docker compose up` 在裸機環境中發出空來源卷規格。

該掛載的設定目錄是 OpenClaw 用來存放以下內容的位置：

- `openclaw.json` 用於行為設定
- `agents/<agentId>/agent/auth-profiles.json` 用於儲存提供者 OAuth/API 金鑰驗證
- `.env` 用於環境變數支援的執行時機密，例如 `OPENCLAW_GATEWAY_TOKEN`

auth-profile 密鑰目錄儲存了用於 OAuth 支援之驗證設定檔 Token 材料的本機加密金鑰。
請將其與您的 Docker 主機狀態放在一起，但與 `OPENCLAW_CONFIG_DIR` 分開存放。

已安裝的可下載外掛程式會將其套件狀態儲存在掛載的
OpenClaw 主目錄下，因此外掛程式安裝記錄和套件根目錄在容器替換後會保留下來。
Gateway 啟動時不會產生隨附外掛程式的相依性樹狀結構。

關於 VM 部署的完整持久性詳細資訊，請參閱
[Docker VM Runtime - What persists where](/zh-Hant/install/docker-vm-runtime#what-persists-where)。

**磁碟增長熱點：** 請注意 `media/`、session JSONL 檔案、
`cron/runs/*.jsonl`、已安裝的外掛程式套件根目錄，以及 `/tmp/openclaw/` 下的滾動檔案日誌。

### Shell 輔助工具 (可選)

為了更輕鬆地進行日常 Docker 管理，請安裝 `ClawDock`：

```bash
mkdir -p ~/.clawdock && curl -sL https://raw.githubusercontent.com/openclaw/openclaw/main/scripts/clawdock/clawdock-helpers.sh -o ~/.clawdock/clawdock-helpers.sh
echo 'source ~/.clawdock/clawdock-helpers.sh' >> ~/.zshrc && source ~/.zshrc
```

如果您是從較舊的 `scripts/shell-helpers/clawdock-helpers.sh` 原始路徑安裝 ClawDock，請重新執行上述安裝指令，以便您的本機輔助檔案追蹤新位置。

然後使用 `clawdock-start`、`clawdock-stop`、`clawdock-dashboard` 等。執行
`clawdock-help` 以查看所有指令。
請參閱 [ClawDock](/zh-Hant/install/clawdock) 以取得完整的輔助工具指南。

<AccordionGroup>
  <Accordion title="Enable agent sandbox for Docker gateway">
    ```bash
    export OPENCLAW_SANDBOX=1
    ./scripts/docker/setup.sh
    ```

    自訂 socket 路徑 (例如無 root 權限的 Docker):

    ```bash
    export OPENCLAW_SANDBOX=1
    export OPENCLAW_DOCKER_SOCKET=/run/user/1000/docker.sock
    ./scripts/docker/setup.sh
    ```

    該腳本僅在沙箱先決條件通過後才會掛載 `docker.sock`。如果
    沙箱設定無法完成，腳本會將 `agents.defaults.sandbox.mode`
    重設為 `off`。當 OpenClaw 沙箱啟用時，Codex 程式碼模式輪次仍受限於 Codex
    `workspace-write`；請勿將主機 Docker socket 掛載到代理沙箱容器中。

  </Accordion>

  <Accordion title="Automation / CI (non-interactive)">
    使用 `-T` 停用 Compose 擬終端機 (pseudo-TTY) 配置：

    ```bash
    docker compose run -T --rm openclaw-cli gateway probe
    docker compose run -T --rm openclaw-cli devices list --json
    ```

  </Accordion>

<Accordion title="共用網路安全性備註">`openclaw-cli` 使用 `network_mode: "service:openclaw-gateway"`，因此 CLI 指令可以透過 `127.0.0.1` 存取閘道。請將此視為共用 信任邊界。compose 設定會捨棄 `NET_RAW`/`NET_ADMIN` 並在 `openclaw-gateway` 和 `openclaw-cli` 上啟用 `no-new-privileges`。</Accordion>

  <Accordion title="openclaw-cli 中的 Docker Desktop DNS 失敗">
    某些 Docker Desktop 設定在捨棄 `NET_RAW` 後，會無法從共用網路
    `openclaw-cli` sidecar 進行 DNS 查詢，這會在 `openclaw plugins install` 等 npm 支援的指令中顯示為
    `EAI_AGAIN`。
    請保留預設的加固 compose 檔案以進行正常的閘道操作。
    下方這個本地覆寫透過還原 Docker 的預設功能，放寬了 CLI 容器的安全性姿態，因此請僅針對需要套件登錄存取權的一次性 CLI
    指令使用，不要將其作為您預設的 Compose
    叫用方式：

    ```bash
    printf '%s\n' \
      'services:' \
      '  openclaw-cli:' \
      '    cap_drop: !reset []' \
      > docker-compose.cli-no-dropped-caps.local.yml

    docker compose -f docker-compose.yml -f docker-compose.cli-no-dropped-caps.local.yml run --rm openclaw-cli plugins install <package>
    ```

    如果您已經建立了一個長期執行的 `openclaw-cli` 容器，請使用相同的覆寫重新建立它。
    `docker compose exec` 和 `docker exec` 無法
    在已建立的容器上變更 Linux 功能。

  </Accordion>

  <Accordion title="權限與 EACCES">
    映像檔以 `node` (uid 1000) 身分執行。如果您在 `/home/node/.openclaw` 上看到權限錯誤，
    請確保您的主機掛載目錄是由 uid 1000 所擁有：

    ```bash
    sudo chown -R 1000:1000 /path/to/openclaw-config /path/to/openclaw-workspace
    ```

    相同的權限不符情況也可能顯示為外掛警告，例如 `blocked plugin candidate: suspicious ownership (... uid=1000, expected uid=0 or root)`
    接著是 `plugin present but blocked`。這表示程序 uid 與
    掛載的外掛目錄擁有者不一致。建議優先以預設 uid 1000 執行容器並修正掛載目錄的擁有權。
    只有當您有意長期以 root 身分執行 OpenClaw 時，才將 `/path/to/openclaw-config/npm` chown 為 `root:root`。

  </Accordion>

  <Accordion title="更快的重建速度">
    排列您的 Dockerfile 順序，以便快取相依性層。這樣可以避免除非鎖定檔變更，否則不會重新執行
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
    預設映像檔以安全為優先，並以非 root 身分 `node` 執行。若要獲得功能更齊全的容器：

    1. **保存 `/home/node`**：`export OPENCLAW_HOME_VOLUME="openclaw_home"`
    2. ** baked 系統相依性**：`export OPENCLAW_IMAGE_APT_PACKAGES="git curl jq"`
    3. ** baked Python 相依性**：`export OPENCLAW_IMAGE_PIP_PACKAGES="requests==2.32.5 humanize==4.14.0"`
    4. ** baked Playwright Chromium**：`export OPENCLAW_INSTALL_BROWSER=1`
    5. **或將 Playwright 瀏覽器安裝至保存的磁碟區中**：
       ```bash
       docker compose run --rm openclaw-cli \
         node /app/node_modules/playwright-core/cli.js install chromium
       ```
    6. **保存瀏覽器下載**：使用 `OPENCLAW_HOME_VOLUME` 或
       `OPENCLAW_EXTRA_MOUNTS`。OpenClaw 會自動偵測 Docker 映像檔在 Linux 上
       由 Playwright 管理的 Chromium。

  </Accordion>

<Accordion title="OpenAI Codex OAuth (無頭模式 Docker)">如果您在精靈中選擇 OpenAI Codex OAuth，它會開啟瀏覽器 URL。在 Docker 或無頭模式環境中，請複製您重新導向後的完整 URL，並將其貼回精靈中以完成驗證。</Accordion>

  <Accordion title="Base image metadata">
    主要的 Docker 運行時映像檔使用 `node:24-bookworm-slim` 並包含 `tini` 作為 entrypoint init 程序 (PID 1)，以確保殭屍程序被回收，且在長時間執行的容器中正確處理信號。它發佈 OCI 基礎映像檔註解，包括 `org.opencontainers.image.base.name`、
    `org.opencontainers.image.source` 等。Node 基礎摘要會透過 Dependabot Docker 基礎映像檔 PR 重新整理；發佈建構不會執行發行版升級層。請參閱
    [OCI image annotations](https://github.com/opencontainers/image-spec/blob/main/annotations.md)。
  </Accordion>
</AccordionGroup>

### 在 VPS 上執行？

請參閱 [Hetzner (Docker VPS)](/zh-Hant/install/hetzner) 和
[Docker VM Runtime](/zh-Hant/install/docker-vm-runtime) 以了解共用 VM 部署步驟，
包括二進位檔製作、持久化和更新。

## 代理程式沙盒

當啟用 `agents.defaults.sandbox` 並搭配 Docker 後端時，閘道會在獨立的 Docker 容器內執行代理程式工具操作 (shell、檔案讀寫等)，而閘道本身則停留在主機上。這為不受信任或多租戶的代理程式工作階段提供了一道堅固的防護牆，而無需將整個閘道容器化。

沙盒範圍可以是每個代理程式 (預設)、每個工作階段或共用。每個範圍都有自己的工作區，掛載於 `/workspace`。您也可以設定允許/拒絕工具原則、網路隔離、資源限制和瀏覽器容器。

如需完整設定、映像檔、安全性說明和多代理程式設定檔，請參閱：

- [Sandboxing](/zh-Hant/gateway/sandboxing) -- 完整的沙盒參考資料
- [OpenShell](/zh-Hant/gateway/openshell) -- 沙盒容器的互動式 shell 存取
- [Multi-Agent Sandbox and Tools](/zh-Hant/tools/multi-agent-sandbox-tools) -- 每個代理程式的覆寫

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

建構預設的沙盒映像檔 (從原始碼 checkout)：

```bash
scripts/sandbox-setup.sh
```

若為沒有原始碼 checkout 的 npm 安裝，請參閱 [Sandboxing § Images and setup](/zh-Hant/gateway/sandboxing#images-and-setup) 以取得內嵌的 `docker build` 指令。

## 疑難排解

<AccordionGroup>
  <Accordion title="映像檔遺失或沙盒容器未啟動">
    使用 [`scripts/sandbox-setup.sh`](https://github.com/openclaw/openclaw/blob/main/scripts/sandbox-setup.sh)
    (原始碼檢出) 或來自 [Sandboxing § Images and setup](/zh-Hant/gateway/sandboxing#images-and-setup) (npm install) 的內聯 `docker build` 指令來建置沙盒映像檔，
    或將 `agents.defaults.sandbox.docker.image` 設為您的自訂映像檔。
    容器會依需求自動為每個工作階段建立。
  </Accordion>

<Accordion title="沙盒中發生權限錯誤">將 `docker.user` 設為符合您掛載的工作區擁有權的 UID:GID， 或變更工作區資料夾的擁有者 (chown)。</Accordion>

<Accordion title="在沙盒中找不到自訂工具">OpenClaw 使用 `sh -lc` (登入 shell) 執行指令，這會載入 `/etc/profile` 且可能會重設 PATH。請設定 `docker.env.PATH` 以預先加入您的 自訂工具路徑，或在您的 Dockerfile 中於 `/etc/profile.d/` 下新增一個指令碼。</Accordion>

<Accordion title="建置映像檔期間發生 OOM-killed (exit 137)">VM 至少需要 2 GB RAM。請使用更大的機器等級並重試。</Accordion>

  <Accordion title="控制 UI 中顯示未授權或需要配對">
    取得一個新的儀表板連結並核准瀏覽器裝置：

    ```bash
    docker compose run --rm openclaw-cli dashboard --no-open
    docker compose run --rm openclaw-cli devices list
    docker compose run --rm openclaw-cli devices approve <requestId>
    ```

    更多細節：[Dashboard](/zh-Hant/web/dashboard)、[Devices](/zh-Hant/cli/devices)。

  </Accordion>

  <Accordion title="閘道目標顯示 ws://172.x.x.x 或來自 Docker CLI 的配對錯誤">
    重設閘道模式並綁定：

    ```bash
    docker compose run --rm openclaw-cli config set --batch-json '[{"path":"gateway.mode","value":"local"},{"path":"gateway.bind","value":"lan"}]'
    docker compose run --rm openclaw-cli devices list --url ws://127.0.0.1:18789
    ```

  </Accordion>
</AccordionGroup>

## 相關

- [安裝概覽](/zh-Hant/install) — 所有安裝方式
- [Podman](/zh-Hant/install/podman) — Docker 的 Podman 替代方案
- [ClawDock](/zh-Hant/install/clawdock) — Docker Compose 社群設置
- [更新](/zh-Hant/install/updating) — 保持 OpenClaw 為最新狀態
- [設定](/zh-Hant/gateway/configuration) — 安裝後的閘道設定
