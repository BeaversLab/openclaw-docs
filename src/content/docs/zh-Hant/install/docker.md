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
- **沙盒說明**：當啟用沙盒時，預設的沙盒後端會使用 Docker，但沙盒預設為關閉，且並**不**需要完整的 Gateway 在 Docker 中執行。也有 SSH 和 OpenShell 沙盒後端可供使用。請參閱 [沙盒](/zh-Hant/gateway/sandboxing)。

## 先決條件

- Docker Desktop (或 Docker Engine) + Docker Compose v2
- 建構映像檔至少需要 2 GB RAM（在 1 GB RAM 的主機上，`pnpm install` 可能會因 OOM 被終止並以 exit code 137 退出）
- 足夠的磁碟空間以存放映像檔和日誌
- 如果在 VPS/公開主機上執行，請檢閱
  [網路暴露的安全加固](/zh-Hant/gateway/security)，
  特別是 Docker `DOCKER-USER` 防火牆策略。

## 容器化閘道

<Steps>
  <Step title="建構映像檔">
    從 repo 根目錄，執行設定腳本：

    ```bash
    ./scripts/docker/setup.sh
    ```

    這會在本地建構 Gateway 映像檔。若要改用預先建構的映像檔：

    ```bash
    export OPENCLAW_IMAGE="ghcr.io/openclaw/openclaw:latest"
    ./scripts/docker/setup.sh
    ```

    預先建構的映像檔發佈於
    [GitHub Container Registry](https://github.com/openclaw/openclaw/pkgs/container/openclaw)。
    常見標籤：`main`、`latest`、`<version>` (例如 `2026.2.26`)。

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

  <Step title="設定通道 (選用)">
    使用 CLI 容器來新增訊息通道：

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
| `OPENCLAW_IMAGE_APT_PACKAGES`              | 在建構期間安裝額外的 apt 套件（以空格分隔）             |
| `OPENCLAW_EXTENSIONS`                      | 在建構時預先安裝外掛依賴 (以空格分隔的名稱)             |
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

官方 Docker 映像檔並未隨附 Homebrew。在上線期間，當 OpenClaw 在不具備 `brew` 的 Linux 容器中執行時，會隱藏僅限 brew 的技能依賴安裝程式；這些依賴必須由自訂映像檔提供或手動安裝。對於可從 Debian 套件取得的依賴，請在映像檔建構期間使用 `OPENCLAW_IMAGE_APT_PACKAGES`。舊版 `OPENCLAW_DOCKER_APT_PACKAGES` 名稱仍被接受。

維護者可以透過將一個外掛來源目錄掛載至其打包後的來源路徑上，來針對打包的映像檔測試捆綁的外掛來源，例如 `OPENCLAW_EXTRA_MOUNTS=/path/to/fork/extensions/synology-chat:/app/extensions/synology-chat:ro`。
該掛載的來源目錄會覆寫相同外掛 ID 對應的編譯 `/app/dist/extensions/synology-chat` 套件。

### 可觀測性

OpenTelemetry 匯出是從 Gateway 容器向您的 OTLP 收集器的連線輸出。它不需要發佈的 Docker 連接埠。如果您在本機建構映像檔，並且希望在映像檔內提供內建的 OpenTelemetry 匯出器，請包含其執行時期相依性：

```bash
export OPENCLAW_EXTENSIONS="diagnostics-otel"
export OTEL_EXPORTER_OTLP_ENDPOINT="http://otel-collector:4318"
export OTEL_SERVICE_NAME="openclaw-gateway"
./scripts/docker/setup.sh
```

在啟用匯出之前，請從 ClawHub 在封裝的 Docker 安裝中安裝官方的 `@openclaw/diagnostics-otel` 插件。自訂的原始碼建構映像檔仍可以使用 `OPENCLAW_EXTENSIONS=diagnostics-otel` 包含本地插件原始碼。若要啟用匯出，請在設定中允許並啟用 `diagnostics-otel` 插件，然後設定 `diagnostics.otel.enabled=true` 或使用 [OpenTelemetry 匯出](/zh-Hant/gateway/opentelemetry) 中的設定範例。Collector 驗證標頭是透過 `diagnostics.otel.headers` 進行設定，而非透過 Docker 環境變數。

Prometheus 指標使用已發佈的 Gateway 連接埠。請安裝 `clawhub:@openclaw/diagnostics-prometheus`，啟用 `diagnostics-prometheus` 插件，然後進行抓取：

```text
http://<gateway-host>:18789/api/diagnostics/prometheus
```

此路由受到 Gateway 驗證的保護。請勿公開獨立的公用 `/metrics` 連接埠或未經驗證的反向代理路徑。請參閱 [Prometheus 指標](/zh-Hant/gateway/prometheus)。

### 健康檢查

容器探查端點（不需要驗證）：

```bash
curl -fsS http://127.0.0.1:18789/healthz   # liveness
curl -fsS http://127.0.0.1:18789/readyz     # readiness
```

Docker 映像檔包含內建的 `HEALTHCHECK`，會對 `/healthz` 進行 ping。如果檢查持續失敗，Docker 會將容器標記為 `unhealthy`，而編排系統可以重新啟動或取代它。

已驗證的深度健康狀態快照：

```bash
docker compose exec openclaw-gateway node dist/index.js health --token "$OPENCLAW_GATEWAY_TOKEN"
```

### 區域網路與回環

`scripts/docker/setup.sh` 預設為 `OPENCLAW_GATEWAY_BIND=lan`，以便主機對 `http://127.0.0.1:18789` 的存取能與 Docker 連接埠發佈配合運作。

- `lan` (預設值)：主機瀏覽器和主機 CLI 可以連線到已發佈的 gateway 連接埠。
- `loopback`：只有容器網路命名空間內的程序可以直接連線到 gateway。

<Note>請在 `gateway.bind` 中使用綁定模式值 (`lan` / `loopback` / `custom` / `tailnet` / `auto`)，而不是像 `0.0.0.0` 或 `127.0.0.1` 這樣的主機別名。</Note>

### Host Local Providers

當 OpenClaw 在 Docker 中執行時，容器內的 `127.0.0.1` 是容器本身，而非您的主機。對於在主機上執行的 AI 提供者，請使用 `host.docker.internal`：

| Provider  | Host default URL         | Docker setup URL                    |
| --------- | ------------------------ | ----------------------------------- |
| LM Studio | `http://127.0.0.1:1234`  | `http://host.docker.internal:1234`  |
| Ollama    | `http://127.0.0.1:11434` | `http://host.docker.internal:11434` |

隨附的 Docker 設定將這些主機 URL 用作 LM Studio 和 Ollama
的入門預設值，且 `docker-compose.yml` 會將 `host.docker.internal` 對應至
Linux Docker Engine 的 Docker 主機閘道。Docker Desktop 已在 macOS 和 Windows 上
提供相同的主機名稱。

主機服務也必須監聽 Docker 可存取的位址：

```bash
lms server start --port 1234 --bind 0.0.0.0
OLLAMA_HOST=0.0.0.0:11434 ollama serve
```

如果您使用自己的 Compose 檔案或 `docker run` 指令，請自行加入相同的主機
對應，例如
`--add-host=host.docker.internal:host-gateway`。

### Bonjour / mDNS

Docker 橋接網路通常無法可靠地轉發 Bonjour/mDNS 多播
(`224.0.0.251:5353`)。因此，隨附的 Compose 設定預設
`OPENCLAW_DISABLE_BONJOUR=1`，以免當橋接器丟棄多播流量時，Gateway
發生崩潰迴圈或反覆重啟廣告。

請使用已發佈的 Gateway URL、Tailscale 或廣域 DNS-SD 作為 Docker 主機。
僅在使用主機網路、macvlan 或其他已知 mDNS 多播
可運作的網路時，才設定 `OPENCLAW_DISABLE_BONJOUR=0`。

如需注意事項與疑難排解，請參閱 [Bonjour 探索](/zh-Hant/gateway/bonjour)。

### Storage and persistence

Docker Compose 將 `OPENCLAW_CONFIG_DIR` 綁定掛載至 `/home/node/.openclaw`，
將 `OPENCLAW_WORKSPACE_DIR` 綁定掛載至 `/home/node/.openclaw/workspace`，並
將 `OPENCLAW_AUTH_PROFILE_SECRET_DIR` 綁定掛載至 `/home/node/.config/openclaw`，使這些
路徑在容器更換後仍然存在。當任何變數未設定時，隨附的
`docker-compose.yml` 會回退至 `${HOME}` 之下，或在 `HOME` 本身
也遺失時回退至 `/tmp`。這能防止 `docker compose up` 在裸機環境中
發出空來源磁碟區規格。

該掛載的設定目錄是 OpenClaw 儲存以下內容的位置：

- `openclaw.json` 用於行為設定
- `agents/<agentId>/agent/auth-profiles.json` 用於已儲存的提供者 OAuth/API 金鑰驗證
- `.env` 用於環境變數支援的執行時期密碼，例如 `OPENCLAW_GATEWAY_TOKEN`

驗證設定檔金鑰目錄會儲存用於 OAuth 支援之驗證設定檔權杖物件的
本機加密金鑰。請將其與 Docker 主機狀態一起保存，
但需與 `OPENCLAW_CONFIG_DIR` 分開存放。

已安裝的可下載外掛程式會將其套件狀態儲存在掛載的 OpenClaw 主目錄下，因此外掛程式安裝記錄和套件根目錄在容器更換後仍然存在。閘道啟動不會產生內建外掛程式的相依性樹。

關於 VM 部署的完整持久性詳情，請參閱
[Docker VM Runtime - 什麼內容會保留在哪裡](/zh-Hant/install/docker-vm-runtime#what-persists-where)。

**磁碟空間增長熱點：** 請留意 `media/`、工作階段 JSONL 檔案、
`cron/runs/*.jsonl`、已安裝的外掛程式套件根目錄，以及位於
`/tmp/openclaw/` 下的輪替記錄檔。

### Shell 輔助工具（選用）

為了讓日常的 Docker 管理更輕鬆，請安裝 `ClawDock`：

```bash
mkdir -p ~/.clawdock && curl -sL https://raw.githubusercontent.com/openclaw/openclaw/main/scripts/clawdock/clawdock-helpers.sh -o ~/.clawdock/clawdock-helpers.sh
echo 'source ~/.clawdock/clawdock-helpers.sh' >> ~/.zshrc && source ~/.zshrc
```

如果您是透過較舊的 `scripts/shell-helpers/clawdock-helpers.sh` 原始路徑安裝 ClawDock，請重新執行上述安裝指令，讓您的本機輔助檔案追蹤新位置。

然後使用 `clawdock-start`、`clawdock-stop`、`clawdock-dashboard` 等。執行
`clawdock-help` 以查看所有指令。
請參閱 [ClawDock](/zh-Hant/install/clawdock) 以取得完整的輔助指南。

<AccordionGroup>
  <Accordion title="為 Docker 閘道啟用代理程式沙箱">
    ```bash
    export OPENCLAW_SANDBOX=1
    ./scripts/docker/setup.sh
    ```

    自訂 Socket 路徑 (例如無 Root 權限的 Docker)：

    ```bash
    export OPENCLAW_SANDBOX=1
    export OPENCLAW_DOCKER_SOCKET=/run/user/1000/docker.sock
    ./scripts/docker/setup.sh
    ```

    該指令碼僅在沙箱先決條件通過後才會掛載 `docker.sock`。如果
    沙箱設定無法完成，指令碼會將 `agents.defaults.sandbox.mode`
    重設為 `off`。當 OpenClaw 沙箱啟用時，Codex 程式碼模式輪次仍受限於 Codex
    `workspace-write`；請勿將主機 Docker socket 掛載至代理程式沙箱容器中。

  </Accordion>

  <Accordion title="自動化 / CI (非互動式)">
    使用 `-T` 停用 Compose 擬似 TTY 分配：

    ```bash
    docker compose run -T --rm openclaw-cli gateway probe
    docker compose run -T --rm openclaw-cli devices list --json
    ```

  </Accordion>

<Accordion title="共用網路安全性備註">`openclaw-cli` 使用 `network_mode: "service:openclaw-gateway"`，以便 CLI 指令透過 `127.0.0.1` 存取閘道。請將此視為共用信任邊界。Compose 設定會捨棄 `NET_RAW`/`NET_ADMIN` 並在 `openclaw-gateway` 和 `openclaw-cli` 上啟用 `no-new-privileges`。</Accordion>

  <Accordion title="Docker Desktop DNS failures in openclaw-cli">
    某些 Docker Desktop 設定在捨棄 `NET_RAW` 後，無法從共用網路的 `openclaw-cli` sidecar 進行 DNS 查詢，這在 `openclaw plugins install` 等 npm 支援的指令中會顯示為 `EAI_AGAIN`。
    請保留預設的強化 compose 檔案以進行正常的 Gateway 操作。
    下方的本機覆寫透過還原 Docker 的預設功能來放寬 CLI 容器的安全性姿態，因此僅將其用於需要存取套件 registry 的單次 CLI 指令，而非作為您預設的 Compose 叫用方式：

    ```bash
    printf '%s\n' \
      'services:' \
      '  openclaw-cli:' \
      '    cap_drop: !reset []' \
      > docker-compose.cli-no-dropped-caps.local.yml

    docker compose -f docker-compose.yml -f docker-compose.cli-no-dropped-caps.local.yml run --rm openclaw-cli plugins install <package>
    ```

    如果您已經建立了一個長期執行的 `openclaw-cli` 容器，請使用相同的覆寫重新建立它。
    `docker compose exec` 和 `docker exec` 無法在已建立的容器上更改 Linux 功能。

  </Accordion>

  <Accordion title="Permissions and EACCES">
    此映像檔以 `node` (uid 1000) 身分執行。如果您在 `/home/node/.openclaw` 上看到權限錯誤，請確保您的主機綁定掛載是由 uid 1000 所擁有：

    ```bash
    sudo chown -R 1000:1000 /path/to/openclaw-config /path/to/openclaw-workspace
    ```

    相同的不匹配情況可能會顯示為外掛警告，例如 `blocked plugin candidate: suspicious ownership (... uid=1000, expected uid=0 or root)`，接著是 `plugin present but blocked`。這表示程序 uid 與掛載的外掛目錄擁有者不一致。建議優先以預設的 uid 1000 執行容器並修正綁定掛載的擁有權。僅在您有意長期以 root 身分執行 OpenClaw 時，才將 `/path/to/openclaw-config/npm` chown 給 `root:root`。

  </Accordion>

  <Accordion title="Faster rebuilds">
    調整您的 Dockerfile 順序以快取相依性層。這可避免除非 lockfile 變更，否則重新執行 `pnpm install`：

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
    預設映像檔以安全為優先，並以非 root `node` 執行。若要使用
    功能更齊全的容器：

    1. **保存 `/home/node`**：`export OPENCLAW_HOME_VOLUME="openclaw_home"`
    2. **建置系統相依項**：`export OPENCLAW_IMAGE_APT_PACKAGES="git curl jq"`
    3. **建置 Playwright Chromium**：`export OPENCLAW_INSTALL_BROWSER=1`
    4. **或將 Playwright 瀏覽器安裝到保存的磁碟區中**：
       ```bash
       docker compose run --rm openclaw-cli \
         node /app/node_modules/playwright-core/cli.js install chromium
       ```
    5. **保存瀏覽器下載內容**：使用 `OPENCLAW_HOME_VOLUME` 或
       `OPENCLAW_EXTRA_MOUNTS`。OpenClaw 會自動偵測 Docker 映像檔在 Linux 上
       由 Playwright 管理的 Chromium。

  </Accordion>

<Accordion title="OpenAI Codex OAuth (無介面 Docker)">如果您在精靈介面中選擇了 OpenAI Codex OAuth，它會開啟瀏覽器 URL。在 Docker 或無介面設定中，請複製您到達的完整重新導向 URL，並將其貼回精靈介面以完成驗證。</Accordion>

  <Accordion title="基礎映像檔中繼資料">
    主要 Docker 執行時映像檔使用 `node:24-bookworm-slim` 並包含 `tini` 作為入口點初始化程序 (PID 1)，以確保殭屍程序被回收，且在長期執行的容器中正確處理信號。它會發佈 OCI 基礎映像檔註解，包括 `org.opencontainers.image.base.name`、
    `org.opencontainers.image.source` 等。Node 基礎摘要會透過 Dependabot Docker 基礎映像檔 PR 更新；發行版本組建不會執行
    發行版升級層。請參閱
    [OCI 映像檔註解](https://github.com/opencontainers/image-spec/blob/main/annotations.md)。
  </Accordion>
</AccordionGroup>

### 在 VPS 上執行？

請參閱 [Hetzner (Docker VPS)](/zh-Hant/install/hetzner) 與
[Docker VM Runtime](/zh-Hant/install/docker-vm-runtime) 以了解共用 VM 部署步驟，
包括二進位檔建置、保存與更新。

## Agent 沙箱

當使用 Docker 後端啟用 `agents.defaults.sandbox` 時，閘道會
在獨立的 Docker 容器中執行代理程式工具操作 (Shell、檔案讀寫等)，而閘道本身則停留在主機上。這為您提供了一道堅實的防線，
圍繞著不受信任或多租戶的代理程式工作階段，而無需將整個
閘道容器化。

沙箱範圍可為每個代理程式 (預設)、每個工作階段或共用。每個範圍
都會取得自己的工作區，掛載於 `/workspace`。您也可以設定
允許/拒絕工具政策、網路隔離、資源限制與瀏覽器
容器。

有關完整配置、映像檔、安全性說明和多 Agent 設定檔，請參閱：

- [沙盒](/zh-Hant/gateway/sandboxing) -- 完整的沙盒參考
- [OpenShell](/zh-Hant/gateway/openshell) -- 沙盒容器的互動式 shell 存取
- [Multi-Agent Sandbox and Tools](/zh-Hant/tools/multi-agent-sandbox-tools) -- 每個代理的覆寫

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
  <Accordion title="Image missing or sandbox container not starting">
    使用
    [`scripts/sandbox-setup.sh`](https://github.com/openclaw/openclaw/blob/main/scripts/sandbox-setup.sh)
    (原始碼检出) 或 [Sandboxing § Images and setup](/zh-Hant/gateway/sandboxing#images-and-setup) 中的內聯 `docker build` 指令 (npm install) 建置沙盒映像檔，
    或將 `agents.defaults.sandbox.docker.image` 設為您的自訂映像檔。
    容器會依需求自動建立於每個階段。
  </Accordion>

<Accordion title="Permission errors in sandbox">將 `docker.user` 設為符合您掛載工作區擁有權的 UID:GID， 或使用 chown 變更工作區資料夾的擁有者。</Accordion>

<Accordion title="Custom tools not found in sandbox">OpenClaw 使用 `sh -lc` (login shell) 執行指令，該指令會來源 `/etc/profile` 且可能重設 PATH。設定 `docker.env.PATH` 以前置您的 自訂工具路徑，或在 Dockerfile 中的 `/etc/profile.d/` 下新增腳本。</Accordion>

<Accordion title="OOM-killed during image build (exit 137)">VM 至少需要 2 GB RAM。請使用更大的機器類別並重試。</Accordion>

  <Accordion title="Unauthorized or pairing required in Control UI">
    取得新的儀表板連結並核准瀏覽器裝置：

    ```bash
    docker compose run --rm openclaw-cli dashboard --no-open
    docker compose run --rm openclaw-cli devices list
    docker compose run --rm openclaw-cli devices approve <requestId>
    ```

    更多詳情：[Dashboard](/zh-Hant/web/dashboard)、[Devices](/zh-Hant/cli/devices)。

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

- [安裝概覽](/zh-Hant/install) — 所有安裝方法
- [Podman](/zh-Hant/install/podman) — Podman 的 Docker 替代方案
- [ClawDock](/zh-Hant/install/clawdock) — Docker Compose 社群設定
- [更新](/zh-Hant/install/updating) — 保持 OpenClaw 為最新狀態
- [組態](/zh-Hant/gateway/configuration) — 安裝後的閘道器組態
