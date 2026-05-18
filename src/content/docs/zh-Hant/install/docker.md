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
- **沙箱備註**：當啟用沙箱時，預設的沙箱後端使用 Docker，但沙箱預設為關閉，且**不**需要完整的閘道在 Docker 中執行。也可以使用 SSH 和 OpenShell 沙箱後端。請參閱[沙箱](/zh-Hant/gateway/sandboxing)。

## 先決條件

- Docker Desktop (或 Docker Engine) + Docker Compose v2
- 建構映像檔至少需要 2 GB RAM（在 1 GB RAM 的主機上，`pnpm install` 可能會因 OOM 被終止並以 exit code 137 退出）
- 足夠的磁碟空間以存放映像檔和日誌
- 如果在 VPS/公開主機上執行，請參閱
  [針對網路曝露的安全性加固](/zh-Hant/gateway/security)，
  特別是 Docker `DOCKER-USER` 防火牆策略。

## 容器化閘道

<Steps>
  <Step title="建構映像檔">
    從存放庫根目錄執行安裝設定指令碼：

    ```bash
    ./scripts/docker/setup.sh
    ```

    這會在本地建構閘道映像檔。若要改用預先建構的映像檔：

    ```bash
    export OPENCLAW_IMAGE="ghcr.io/openclaw/openclaw:latest"
    ./scripts/docker/setup.sh
    ```

    預先建構的映像檔會發佈至
    [GitHub Container Registry](https://github.com/openclaw/openclaw/pkgs/container/openclaw)。
    常見標籤：`main`、`latest`、`<version>`（例如 `2026.2.26`）。

  </Step>

  <Step title="完成上手引導">
    安裝設定指令碼會自動執行上手引導。它將會：

    - 提示輸入供應商 API 金鑰
    - 產生閘道權杖並將其寫入 `.env`
    - 建立 auth-profile 秘密金鑰目錄
    - 透過 Docker Compose 啟動閘道

    在設定期間，啟動前上手引導和設定寫入會直接透過
    `openclaw-gateway` 執行。`openclaw-cli` 適用於您在
    閘道容器已存在後執行的指令。

  </Step>

  <Step title="開啟控制 UI">
    在瀏覽器中開啟 `http://127.0.0.1:18789/` 並將設定的
    共用金鑰貼上至 Settings 中。設定腳本預設會將權杖寫入 `.env`；
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

<Note>由於 `openclaw-cli` 共用 `openclaw-gateway` 的網路命名空間，因此它是 一個啟動後工具。在 `docker compose up -d openclaw-gateway` 之前，請透過 `openclaw-gateway` 並使用 `--no-deps --entrypoint node` 來執行上架和設定時期的設定寫入。</Note>

### 環境變數

安裝腳本接受這些選用的環境變數：

| 變數                                       | 用途                                                    |
| ------------------------------------------ | ------------------------------------------------------- |
| `OPENCLAW_IMAGE`                           | 使用遠端映像檔而非在本地建構                            |
| `OPENCLAW_DOCKER_APT_PACKAGES`             | 在建構期間安裝額外的 apt 套件（以空格分隔）             |
| `OPENCLAW_EXTENSIONS`                      | 在建置時包含選定的捆綁外掛程式輔助工具                  |
| `OPENCLAW_EXTRA_MOUNTS`                    | 額外主機綁定掛載（以逗號分隔的 `source:target[:opts]`） |
| `OPENCLAW_HOME_VOLUME`                     | 在具名的 Docker volume 中保存 `/home/node`              |
| `OPENCLAW_SANDBOX`                         | 選擇加入沙箱引導（`1`、`true`、`yes`、`on`）            |
| `OPENCLAW_SKIP_ONBOARDING`                 | 跳過互動式上架步驟（`1`、`true`、`yes`、`on`）          |
| `OPENCLAW_DOCKER_SOCKET`                   | 覆寫 Docker socket 路徑                                 |
| `OPENCLAW_DISABLE_BONJOUR`                 | 停用 Bonjour/mDNS 廣告（Docker 預設為 `1`）             |
| `OPENCLAW_DISABLE_BUNDLED_SOURCE_OVERLAYS` | 停用捆綁的外掛程式來源綁定掛載覆疊                      |
| `OTEL_EXPORTER_OTLP_ENDPOINT`              | 用於 OpenTelemetry 匯出的共用 OTLP/HTTP 收集器端點      |
| `OTEL_EXPORTER_OTLP_*_ENDPOINT`            | 針對追蹤、指標或日誌的特定訊號 OTLP 端點                |
| `OTEL_EXPORTER_OTLP_PROTOCOL`              | 覆寫 OTLP 協定。目前僅支援 `http/protobuf`              |
| `OTEL_SERVICE_NAME`                        | 用於 OpenTelemetry 資源的服務名稱                       |
| `OTEL_SEMCONV_STABILITY_OPT_IN`            | 啟用最新的實驗性 GenAI 語義屬性                         |
| `OPENCLAW_OTEL_PRELOADED`                  | 當已預先載入一個 OpenTelemetry SDK 時，跳過啟動第二個   |

官方 Docker 映像檔不附帶 Homebrew。在上手引導期間，當 OpenClaw
在沒有 `brew` 的 Linux 容器中執行時，
它會隱藏僅限 brew 的技能相依性安裝程式；這些相依性必須由自訂映像檔提供
或手動安裝。對於可從 Debian 套件取得的相依性，請在
映像檔建構期間使用 `OPENCLAW_DOCKER_APT_PACKAGES`。

維護者可以透過將一個外掛來源目錄掛載到其封裝來源路徑上，針對封裝映像檔測試打包的外掛來源，例如 `OPENCLAW_EXTRA_MOUNTS=/path/to/fork/extensions/synology-chat:/app/extensions/synology-chat:ro`。
該掛載的來源目錄會覆寫相同外掛 ID 對應的已編譯 `/app/dist/extensions/synology-chat` 套件。

### 可觀測性

OpenTelemetry 匯出是從 Gateway 容器向您的 OTLP 收集器的連線輸出。它不需要發佈的 Docker 連接埠。如果您在本機建構映像檔，並且希望在映像檔內提供內建的 OpenTelemetry 匯出器，請包含其執行時期相依性：

```bash
export OPENCLAW_EXTENSIONS="diagnostics-otel"
export OTEL_EXPORTER_OTLP_ENDPOINT="http://otel-collector:4318"
export OTEL_SERVICE_NAME="openclaw-gateway"
./scripts/docker/setup.sh
```

在啟用匯出之前，請在封裝的 Docker 安裝中從 ClawHub 安裝官方 `@openclaw/diagnostics-otel` 外掛。自訂來源建構的映像檔仍然可以使用 `OPENCLAW_EXTENSIONS=diagnostics-otel` 包含本機外掛來源。若要啟用匯出，請在設定中允許並啟用 `diagnostics-otel` 外掛，然後設定 `diagnostics.otel.enabled=true` 或使用 [OpenTelemetry 匯出](/zh-Hant/gateway/opentelemetry) 中的設定範例。收集器驗證標頭是透過 `diagnostics.otel.headers` 來設定，而非透過 Docker 環境變數。

Prometheus 指標使用已發佈的 Gateway 連接埠。安裝 `clawhub:@openclaw/diagnostics-prometheus`，啟用 `diagnostics-prometheus` 外掛，然後進行抓取：

```text
http://<gateway-host>:18789/api/diagnostics/prometheus
```

此路由受到 Gateway 驗證的保護。請勿公開單獨的公用 `/metrics` 連接埠或未經驗證的反向代理路徑。請參閱 [Prometheus 指標](/zh-Hant/gateway/prometheus)。

### 健康檢查

容器探查端點（不需要驗證）：

```bash
curl -fsS http://127.0.0.1:18789/healthz   # liveness
curl -fsS http://127.0.0.1:18789/readyz     # readiness
```

Docker 映像檔包含內建的 `HEALTHCHECK`，會對 `/healthz` 進行 Ping 檢查。
如果檢查持續失敗，Docker 會將容器標記為 `unhealthy`，而且協調系統可以重新啟動或取代它。

已驗證的深度健康狀態快照：

```bash
docker compose exec openclaw-gateway node dist/index.js health --token "$OPENCLAW_GATEWAY_TOKEN"
```

### 區域網路與回環

`scripts/docker/setup.sh` 預設為 `OPENCLAW_GATEWAY_BIND=lan`，因此主機對 `http://127.0.0.1:18789` 的存取可與 Docker 連接埠發佈搭配使用。

- `lan` (預設值)：主機瀏覽器和主機 CLI 可以到達已發佈的 gateway 連接埠。
- `loopback`：只有容器網路命名空間內的程序可以直接存取
  gateway。

<Note>在 `gateway.bind` 中使用綁定模式值（`lan` / `loopback` / `custom` / `tailnet` / `auto`），而不是像 `0.0.0.0` 或 `127.0.0.1` 這樣的主機別名。</Note>

### Host Local Providers

當 OpenClaw 在 Docker 中執行時，容器內的 `127.0.0.1` 是容器
本身，而不是您的主機。對於在主機上執行的 AI provider，請使用 `host.docker.internal`：

| Provider  | Host default URL         | Docker setup URL                    |
| --------- | ------------------------ | ----------------------------------- |
| LM Studio | `http://127.0.0.1:1234`  | `http://host.docker.internal:1234`  |
| Ollama    | `http://127.0.0.1:11434` | `http://host.docker.internal:11434` |

隨附的 Docker 設定使用那些主機 URL 作為 LM Studio 和 Ollama
的入門預設值，而 `docker-compose.yml` 會將 `host.docker.internal` 對應到
Linux Docker Engine 的 Docker 主機閘道。Docker Desktop 已經在 macOS 和 Windows 上
提供了相同的主機名稱。

主機服務也必須監聽 Docker 可存取的位址：

```bash
lms server start --port 1234 --bind 0.0.0.0
OLLAMA_HOST=0.0.0.0:11434 ollama serve
```

如果您使用自己的 Compose 檔案或 `docker run` 指令，請自行新增相同的主機
對應，例如
`--add-host=host.docker.internal:host-gateway`。

### Bonjour / mDNS

Docker 橋接網路通常無法可靠地轉發 Bonjour/mDNS 多播
(`224.0.0.251:5353`)。因此，隨附的 Compose 設定預設
`OPENCLAW_DISABLE_BONJOUR=1`，以免當橋接器丟棄多播流量時，Gateway
發生崩潰迴圈或重複重新啟動廣告。

對於 Docker 主機，請使用已發佈的 Gateway URL、Tailscale 或廣域 DNS-SD。
僅在使用主機網路、macvlan 或另一個已知可運作 mDNS 多播的網路時，才設定 `OPENCLAW_DISABLE_BONJOUR=0`。

如需注意事項和疑難排解，請參閱 [Bonjour discovery](/zh-Hant/gateway/bonjour)。

### Storage and persistence

Docker Compose 將 `OPENCLAW_CONFIG_DIR` 綁定掛載至 `/home/node/.openclaw`，
將 `OPENCLAW_WORKSPACE_DIR` 綁定掛載至 `/home/node/.openclaw/workspace`，並將
`OPENCLAW_AUTH_PROFILE_SECRET_DIR` 綁定掛載至 `/home/node/.config/openclaw`，因此這些
路徑在容器更換後仍然存在。當任何變數未設定時，內建的
`docker-compose.yml` 會回退到 `${HOME}` 之下，或是當 `HOME` 本身
也缺失時回退到 `/tmp`。這可防止 `docker compose up` 在裸機環境中發出空來源的
volume 規格。

該掛載的設定目錄是 OpenClaw 儲存以下內容的位置：

- `openclaw.json` 用於行為設定
- `agents/<agentId>/agent/auth-profiles.json` 用於儲存提供者 OAuth/API 金鑰認證
- `.env` 用於基於環境變數的執行時機密，例如 `OPENCLAW_GATEWAY_TOKEN`

認證設定檔金鑰目錄儲存了用於 OAuth 支援認證設定檔權杖材質的本機加密金鑰。請將其與您的 Docker 主機狀態一起保存，但需與 `OPENCLAW_CONFIG_DIR` 分開。

已安裝的可下載外掛程式會將其套件狀態儲存在掛載的 OpenClaw 主目錄下，因此外掛程式安裝記錄和套件根目錄在容器更換後仍然存在。閘道啟動不會產生內建外掛程式的相依性樹。

如需 VM 部署的完整持久性詳細資訊，請參閱
[Docker VM 執行時 - 什麼內容持久儲存在哪裡](/zh-Hant/install/docker-vm-runtime#what-persists-where)。

**磁碟增長熱點：** 請留意 `media/`、session JSONL 檔案、
`cron/runs/*.jsonl`、已安裝的外掛程式套件根目錄，以及 `/tmp/openclaw/` 下的輪替檔案記錄。

### Shell 輔助工具（選用）

為了更方便地進行日常 Docker 管理，請安裝 `ClawDock`：

```bash
mkdir -p ~/.clawdock && curl -sL https://raw.githubusercontent.com/openclaw/openclaw/main/scripts/clawdock/clawdock-helpers.sh -o ~/.clawdock/clawdock-helpers.sh
echo 'source ~/.clawdock/clawdock-helpers.sh' >> ~/.zshrc && source ~/.zshrc
```

如果您是從較舊的 `scripts/shell-helpers/clawdock-helpers.sh` 原始路徑安裝 ClawDock，請重新執行上述安裝指令，讓您的本機輔助檔案追蹤新位置。

然後使用 `clawdock-start`、`clawdock-stop`、`clawdock-dashboard` 等。執行
`clawdock-help` 以取得所有指令。
請參閱 [ClawDock](/zh-Hant/install/clawdock) 以取得完整的輔助工具指南。

<AccordionGroup>
  <Accordion title="Enable agent sandbox for Docker gateway">
    ```bash
    export OPENCLAW_SANDBOX=1
    ./scripts/docker/setup.sh
    ```

    自訂 socket 路徑（例如無 root Docker）：

    ```bash
    export OPENCLAW_SANDBOX=1
    export OPENCLAW_DOCKER_SOCKET=/run/user/1000/docker.sock
    ./scripts/docker/setup.sh
    ```

    此腳本僅在沙箱先決條件通過後才掛載 `docker.sock`。如果
    沙箱設定無法完成，腳本會將 `agents.defaults.sandbox.mode`
    重設為 `off`。當 OpenClaw 沙箱處於活動狀態時，Codex 代碼模式輪次仍受限於 Codex
    `workspace-write`；請勿將
    主機 Docker socket 掛載到代理沙箱容器中。

  </Accordion>

  <Accordion title="Automation / CI (non-interactive)">
    使用 `-T` 停用 Compose 虛擬 TTY 分配：

    ```bash
    docker compose run -T --rm openclaw-cli gateway probe
    docker compose run -T --rm openclaw-cli devices list --json
    ```

  </Accordion>

<Accordion title="Shared-network security note">`openclaw-cli` 使用 `network_mode: "service:openclaw-gateway"`，以便 CLI 指令可以透過 `127.0.0.1` 存取閘道。請將此視為共享信任邊界。Compose 設定會捨棄 `NET_RAW`/`NET_ADMIN` 並在 `openclaw-gateway` 和 `openclaw-cli` 上啟用 `no-new-privileges`。</Accordion>

  <Accordion title="Docker Desktop DNS failures in openclaw-cli">
    某些 Docker Desktop 設定在 `NET_RAW` 被丟棄後，無法從共用網路的 `openclaw-cli` sidecar 進行 DNS 查詢，這會在諸如 `openclaw plugins install` 等 npm 支援的指令中顯示為 `EAI_AGAIN`。
    請保留預設的加強版 compose 檔案以進行正常的閘道操作。下方的本機覆寫透過還原 Docker 的預設功能來放寬 CLI 容器的安全性姿態，因此僅將其用於需要存取套件註冊表的一次性 CLI 指令，而非作為您的預設 Compose 叫用方式：

    ```bash
    printf '%s\n' \
      'services:' \
      '  openclaw-cli:' \
      '    cap_drop: !reset []' \
      > docker-compose.cli-no-dropped-caps.local.yml

    docker compose -f docker-compose.yml -f docker-compose.cli-no-dropped-caps.local.yml run --rm openclaw-cli plugins install <package>
    ```

    如果您已經建立了一個長期執行的 `openclaw-cli` 容器，請使用相同的覆寫重新建立它。`docker compose exec` 和 `docker exec` 無法在已建立的容器上變更 Linux 功能。

  </Accordion>

  <Accordion title="Permissions and EACCES">
    此映像檔以 `node` (uid 1000) 身分執行。如果您在 `/home/node/.openclaw` 上看到權限錯誤，請確定您的主機綁定掛載是由 uid 1000 所擁有：

    ```bash
    sudo chown -R 1000:1000 /path/to/openclaw-config /path/to/openclaw-workspace
    ```

    相同的不匹配可能會顯示為外掛警告，例如 `blocked plugin candidate: suspicious ownership (... uid=1000, expected uid=0 or root)` 緊接著 `plugin present but blocked`。這表示處理程序 uid 和已掛載的外掛目錄擁有者不一致。建議以預設 uid 1000 執行容器並修正綁定掛載的擁有權。僅在您有意長期以 root 身分執行 OpenClaw 時，才將 `/path/to/openclaw-config/npm` chown 給 `root:root`。

  </Accordion>

  <Accordion title="Faster rebuilds">
    調整您的 Dockerfile 順序以快取相依性層。這能避免除非 lockfile 變更否則重新執行 `pnpm install`：

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
    預設映像檔以安全性為優先，並以非 root 身分執行 `node`。若要使用功能更完整的容器：

    1. **保存 `/home/node`**：`export OPENCLAW_HOME_VOLUME="openclaw_home"`
    2. **內建系統相依項**：`export OPENCLAW_DOCKER_APT_PACKAGES="git curl jq"`
    3. **內建 Playwright Chromium**：`export OPENCLAW_INSTALL_BROWSER=1`
    4. **或將 Playwright 瀏覽器安裝至持久化儲存卷中**：
       ```bash
       docker compose run --rm openclaw-cli \
         node /app/node_modules/playwright-core/cli.js install chromium
       ```
    5. **保存瀏覽器下載內容**：使用 `OPENCLAW_HOME_VOLUME` 或
       `OPENCLAW_EXTRA_MOUNTS`。OpenClaw 會自動偵測 Docker 映像檔中由 Playwright 管理
       的 Linux 版 Chromium。

  </Accordion>

<Accordion title="OpenAI Codex OAuth (無介面 Docker)">如果您在精靈介面中選擇了 OpenAI Codex OAuth，它會開啟瀏覽器 URL。在 Docker 或無介面設定中，請複製您到達的完整重新導向 URL，並將其貼回精靈介面以完成驗證。</Accordion>

  <Accordion title="基礎映像檔中繼資料">
    主要 Docker 執行時映像檔使用 `node:24-bookworm-slim`，並包含 `tini` 作為入口點 init 程序 (PID 1)，以確保殭屍程序被回收，且信號在長期執行的容器中能正確處理。它會發佈 OCI 基礎映像檔註解，包括 `org.opencontainers.image.base.name`、
    `org.opencontainers.image.source` 等。Node 基礎摘要會透過 Dependabot Docker 基礎映像檔 PR 進行更新；發行版本組建不會執行
    發行版升級層。請參閱
    [OCI image annotations](https://github.com/opencontainers/image-spec/blob/main/annotations.md)。
  </Accordion>
</AccordionGroup>

### 在 VPS 上執行？

請參閱 [Hetzner (Docker VPS)](/zh-Hant/install/hetzner) 和
[Docker VM Runtime](/zh-Hant/install/docker-vm-runtime) 以了解共用 VM 部署步驟，
包括二進位檔製作、持久化與更新。

## Agent 沙箱

當使用 Docker 後端啟用 `agents.defaults.sandbox` 時，閘道會在獨立的 Docker 容器內執行 Agent 工具（Shell、檔案讀寫等），而閘道本身則停留在主機上。這為不受信任或多租戶的 Agent 工作階段提供了一道嚴格的防線，而無需將整個閘道容器化。

沙箱範圍可以是 per-agent（預設）、per-session 或 shared。每個範圍都會獲得掛載在 `/workspace` 的專屬工作區。您也可以配置允許/拒絕工具原則、網路隔離、資源限制和瀏覽器容器。

有關完整配置、映像檔、安全性說明和多 Agent 設定檔，請參閱：

- [Sandboxing](/zh-Hant/gateway/sandboxing) -- 完整的沙箱參考資料
- [OpenShell](/zh-Hant/gateway/openshell) -- 沙箱容器的互動式 Shell 存取
- [Multi-Agent Sandbox and Tools](/zh-Hant/tools/multi-agent-sandbox-tools) -- per-agent 覆寫

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

建置預設的沙箱映像檔（從原始碼檢出）：

```bash
scripts/sandbox-setup.sh
```

對於沒有原始碼檢出的 npm 安裝，請參閱 [Sandboxing § Images and setup](/zh-Hant/gateway/sandboxing#images-and-setup) 以取得內聯 `docker build` 指令。

## 疑難排解

<AccordionGroup>
  <Accordion title="缺少映像檔或沙箱容器無法啟動">
    使用
    [`scripts/sandbox-setup.sh`](https://github.com/openclaw/openclaw/blob/main/scripts/sandbox-setup.sh)
    （原始碼檢出）或 [Sandboxing § Images and setup](/zh-Hant/gateway/sandboxing#images-and-setup) 中的內聯 `docker build` 指令（npm 安裝）
    來建置沙箱映像檔，或將 `agents.defaults.sandbox.docker.image` 設定為您的自訂映像檔。
    容器會根據需求為每個工作階段自動建立。
  </Accordion>

<Accordion title="沙箱中的權限錯誤">將 `docker.user` 設定為符合您掛載工作區所有權的 UID:GID， 或變更工作區資料夾的所有權 (chown)。</Accordion>

<Accordion title="Custom tools not found in sandbox">OpenClaw 使用 `sh -lc`（登入 shell）執行命令，這會載入 `/etc/profile` 並可能重設 PATH。設定 `docker.env.PATH` 以將您的 自訂工具路徑加入開頭，或在您的 Dockerfile 中將腳本新增至 `/etc/profile.d/`。</Accordion>

<Accordion title="OOM-killed during image build (exit 137)">VM 至少需要 2 GB RAM。請使用更大的機器類別並重試。</Accordion>

  <Accordion title="Unauthorized or pairing required in Control UI">
    取得新的儀表板連結並核准瀏覽器裝置：

    ```bash
    docker compose run --rm openclaw-cli dashboard --no-open
    docker compose run --rm openclaw-cli devices list
    docker compose run --rm openclaw-cli devices approve <requestId>
    ```

    更多資訊：[Dashboard](/zh-Hant/web/dashboard)、[Devices](/zh-Hant/cli/devices)。

  </Accordion>

  <Accordion title="Gateway target shows ws://172.x.x.x or pairing errors from Docker CLI">
    重設 gateway 模式並綁定：

    ```bash
    docker compose run --rm openclaw-cli config set --batch-json '[{"path":"gateway.mode","value":"local"},{"path":"gateway.bind","value":"lan"}]'
    docker compose run --rm openclaw-cli devices list --url ws://127.0.0.1:18789
    ```

  </Accordion>
</AccordionGroup>

## 相關

- [Install Overview](/zh-Hant/install) — 所有安裝方式
- [Podman](/zh-Hant/install/podman) — Podman 的 Docker 替代方案
- [ClawDock](/zh-Hant/install/clawdock) — Docker Compose 社群設定
- [Updating](/zh-Hant/install/updating) — 保持 OpenClaw 更新
- [Configuration](/zh-Hant/gateway/configuration) — 安裝後的 gateway 設定
