---
summary: "OpenClaw 的選用性 Docker 設定與入門指南"
read_when:
  - You want a containerized gateway instead of local installs
  - You are validating the Docker flow
title: "Docker"
---

# Docker（選用）

Docker 是**選用**的。僅在您想要容器化的 Gateway 或是要驗證 Docker 流程時使用。

## Docker 適合我嗎？

- **是**：您想要一個隔離、可隨時丟棄的 Gateway 環境，或是想在沒有本地安裝的主機上執行 OpenClaw。
- **否**：您是在自己的機器上執行，且只想要最快的開發迴圈。請改用一般的安裝流程。
- **沙盒備註**：當啟用沙盒時，預設的沙盒後端會使用 Docker，但沙盒預設為關閉，並且**不**需要完整的閘道在 Docker 中執行。SSH 和 OpenShell 沙盒後端也可用。請參閱 [Sandboxing](/zh-Hant/gateway/sandboxing)。

## 必要條件

- Docker Desktop（或 Docker Engine）+ Docker Compose v2
- 建構映像檔至少需要 2 GB RAM（`pnpm install` 在 1 GB 的主機上可能會因 OOM 而被終止，退出代碼為 137）
- 足夠存放映像檔和日誌的磁碟空間
- 如果在 VPS/公開主機上執行，請檢閱
  [Security hardening for network exposure](/zh-Hant/gateway/security),
  特別是 Docker `DOCKER-USER` 防火牆原則。

## 容器化 Gateway

<Steps>
  <Step title="建置映像檔">
    從 repo 根目錄執行設定腳本：

    ```bash
    ./scripts/docker/setup.sh
    ```

    這會在本地建置 Gateway 映像檔。若要改用預先建置的映像檔：

    ```bash
    export OPENCLAW_IMAGE="ghcr.io/openclaw/openclaw:latest"
    ./scripts/docker/setup.sh
    ```

    預先建置的映像檔發佈於
    [GitHub Container Registry](https://github.com/openclaw/openclaw/pkgs/container/openclaw)。
    常見標籤： `main`, `latest`, `<version>` (例如 `2026.2.26`)。

  </Step>

  <Step title="完成入門設定">
    設定腳本會自動執行入門設定。它會：

    - 提示輸入供應商 API 金鑰
    - 產生 gateway token 並將其寫入 `.env`
    - 透過 Docker Compose 啟動 gateway

    在設定期間，啟動前的入門設定和設定檔寫入會直接透過
    `openclaw-gateway` 執行。`openclaw-cli` 則是用於您在 gateway 容器
    已存在後所執行的指令。

  </Step>

  <Step title="開啟控制 UI">
    在瀏覽器中開啟 `http://127.0.0.1:18789/` 並將設定的
    shared secret 貼到 Settings 中。設定腳本預設會將 token 寫入 `.env`；
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

    文件： [WhatsApp](/zh-Hant/channels/whatsapp), [Telegram](/zh-Hant/channels/telegram), [Discord](/zh-Hant/channels/discord)

  </Step>
</Steps>

### 手動流程

如果您偏好事自行執行每個步驟，而不是使用設定腳本：

```bash
docker build -t openclaw:local -f Dockerfile .
docker compose run --rm --no-deps --entrypoint node openclaw-gateway \
  dist/index.js onboard --mode local --no-install-daemon
docker compose run --rm --no-deps --entrypoint node openclaw-gateway \
  dist/index.js config set --batch-json '[{"path":"gateway.mode","value":"local"},{"path":"gateway.bind","value":"lan"},{"path":"gateway.controlUi.allowedOrigins","value":["http://localhost:18789","http://127.0.0.1:18789"]}]'
docker compose up -d openclaw-gateway
```

<Note>從 repo 根目錄執行 `docker compose`。如果您啟用了 `OPENCLAW_EXTRA_MOUNTS` 或 `OPENCLAW_HOME_VOLUME`，設定腳本會寫入 `docker-compose.extra.yml`； 請將其包含在 `-f docker-compose.yml -f docker-compose.extra.yml` 中。</Note>

<Note>因為 `openclaw-cli` 共用 `openclaw-gateway` 的網路命名空間，它是 一個啟動後工具。在 `docker compose up -d openclaw-gateway` 之前，請透過 `openclaw-gateway` 以 `--no-deps --entrypoint node` 執行上架和設定時期的設定寫入。</Note>

### 環境變數

設定腳本接受這些選用的環境變數：

| 變數                           | 用途                                                  |
| ------------------------------ | ----------------------------------------------------- |
| `OPENCLAW_IMAGE`               | 使用遠端映像檔而非在本地建置                          |
| `OPENCLAW_DOCKER_APT_PACKAGES` | 在建置期間安裝額外的 apt 套件（以空格分隔）           |
| `OPENCLAW_EXTENSIONS`          | 在建置時預先安裝擴充功能相依項（以空格分隔的名稱）    |
| `OPENCLAW_EXTRA_MOUNTS`        | 額外主機綁定掛載（以逗號分隔 `source:target[:opts]`） |
| `OPENCLAW_HOME_VOLUME`         | 將 `/home/node` 持久化到命名的 Docker volume 中       |
| `OPENCLAW_SANDBOX`             | 選擇加入沙箱引導（`1`、`true`、`yes`、`on`）          |
| `OPENCLAW_DOCKER_SOCKET`       | 覆寫 Docker socket 路徑                               |

### 健康檢查

容器探查端點（無需驗證）：

```bash
curl -fsS http://127.0.0.1:18789/healthz   # liveness
curl -fsS http://127.0.0.1:18789/readyz     # readiness
```

Docker 映像檔包含內建的 `HEALTHCHECK`，會對 `/healthz` 進行 ping 檢查。
如果檢查持續失敗，Docker 會將容器標記為 `unhealthy`，且
編排系統可以重新啟動或取代它。

經過驗證的深度健康快照：

```bash
docker compose exec openclaw-gateway node dist/index.js health --token "$OPENCLAW_GATEWAY_TOKEN"
```

### 區域網路與 Loopback

`scripts/docker/setup.sh` 預設為 `OPENCLAW_GATEWAY_BIND=lan`，以便主機對
`http://127.0.0.1:18789` 的存取能透過 Docker 連接埠發佈運作。

- `lan` (預設)：主機瀏覽器和主機 CLI 可以存取已發佈的 gateway 連接埠。
- `loopback`：只有容器網路命名空間內的程序可以直接存取
  gateway。

<Note>請在 `gateway.bind` 中使用綁定模式值（`lan` / `loopback` / `custom` / `tailnet` / `auto`），而不是像 `0.0.0.0` 或 `127.0.0.1` 這樣的主機別名。</Note>

### 儲存與持久性

Docker Compose 將 `OPENCLAW_CONFIG_DIR` 綁定掛載到 `/home/node/.openclaw`，並將
`OPENCLAW_WORKSPACE_DIR` 綁定掛載到 `/home/node/.openclaw/workspace`，因此這些路徑
在容器被取代後仍會保留。

該掛載的設定目錄是 OpenClaw 用來存放以下內容的位置：

- `openclaw.json` 用於行為設定
- `agents/<agentId>/agent/auth-profiles.json` 用於已儲存的供應商 OAuth/API 金鑰驗證
- `.env` 用於支援環境變數的執行時期密碼，例如 `OPENCLAW_GATEWAY_TOKEN`

關於 VM 部署的完整持久化詳情，請參閱
[Docker VM Runtime - 什麼會持續存在於哪裡](/zh-Hant/install/docker-vm-runtime#what-persists-where)。

**磁碟增長熱點：** 請注意 `media/`、session JSONL 檔案、`cron/runs/*.jsonl`，以及 `/tmp/openclaw/` 下的輪替日誌檔。

### Shell 輔助工具（選用）

為了更輕鬆地進行日常 Docker 管理，請安裝 `ClawDock`：

```bash
mkdir -p ~/.clawdock && curl -sL https://raw.githubusercontent.com/openclaw/openclaw/main/scripts/clawdock/clawdock-helpers.sh -o ~/.clawdock/clawdock-helpers.sh
echo 'source ~/.clawdock/clawdock-helpers.sh' >> ~/.zshrc && source ~/.zshrc
```

如果您是透過較舊的 `scripts/shell-helpers/clawdock-helpers.sh` 原始路徑安裝 ClawDock，請重新執行上述安裝指令，讓您的本機輔助檔案能追蹤新的位置。

然後使用 `clawdock-start`、`clawdock-stop`、`clawdock-dashboard` 等。執行
`clawdock-help` 查看所有指令。
請參閱 [ClawDock](/zh-Hant/install/clawdock) 以取得完整的輔助指南。

<AccordionGroup>
  <Accordion title="Enable agent sandbox for Docker gateway">
    ```bash
    export OPENCLAW_SANDBOX=1
    ./scripts/docker/setup.sh
    ```

    自訂 socket 路徑（例如 rootless Docker）：

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
    使用 `-T` 停用 Compose 擬態 TTY 分配：

    ```bash
    docker compose run -T --rm openclaw-cli gateway probe
    docker compose run -T --rm openclaw-cli devices list --json
    ```

  </Accordion>

<Accordion title="Shared-network security note">`openclaw-cli` 使用 `network_mode: "service:openclaw-gateway"`，讓 CLI 指令可以透過 `127.0.0.1` 到達閘道。請將此視為一個共享 的信任邊界。Compose 設定會捨棄 `NET_RAW`/`NET_ADMIN` 並在 `openclaw-cli` 上啟用 `no-new-privileges`。</Accordion>

  <Accordion title="Permissions and EACCES">
    映像檔以 `node` (uid 1000) 身分執行。如果您在
    `/home/node/.openclaw` 上看到權限錯誤，請確保您的主機掛載目錄是由 uid 1000 所擁有：

    ```bash
    sudo chown -R 1000:1000 /path/to/openclaw-config /path/to/openclaw-workspace
    ```

  </Accordion>

  <Accordion title="加快重新構建">
    請排序您的 Dockerfile，以便快取相依性層。這能避免除非鎖定檔變更，否則重新執行
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
    預設映像檔以安全為先，並以非 root 身分執行 `node`。若要功能更完整的容器：

    1. **保留 `/home/node`**：`export OPENCLAW_HOME_VOLUME="openclaw_home"`
    2. **建置系統相依項**：`export OPENCLAW_DOCKER_APT_PACKAGES="git curl jq"`
    3. **安裝 Playwright 瀏覽器**：
       ```bash
       docker compose run --rm openclaw-cli \
         node /app/node_modules/playwright-core/cli.js install chromium
       ```
    4. **保留瀏覽器下載**：設定
       `PLAYWRIGHT_BROWSERS_PATH=/home/node/.cache/ms-playwright` 並使用
       `OPENCLAW_HOME_VOLUME` 或 `OPENCLAW_EXTRA_MOUNTS`。

  </Accordion>

<Accordion title="OpenAI Codex OAuth (無介面 Docker)">如果您在精靈中選擇 OpenAI Codex OAuth，它會開啟瀏覽器 URL。在 Docker 或無介面設定中，請複製您抵達的完整重新導向 URL 並貼回精靈以完成驗證。</Accordion>

  <Accordion title="基礎映像檔中繼資料">
    主要 Docker 映像檔使用 `node:24-bookworm` 並發布 OCI 基礎映像檔註解，包括 `org.opencontainers.image.base.name`、
    `org.opencontainers.image.source` 等。請參閱
    [OCI 映像檔註解](https://github.com/opencontainers/image-spec/blob/main/annotations.md)。
  </Accordion>
</AccordionGroup>

### 在 VPS 上執行？

請參閱 [Hetzner (Docker VPS)](/zh-Hant/install/hetzner) 和
[Docker VM Runtime](/zh-Hant/install/docker-vm-runtime) 以了解共用 VM 部署步驟，
包括二進位檔建置、保存與更新。

## Agent 沙箱

當使用 Docker 後端啟用 `agents.defaults.sandbox` 時，閘道會在獨立的 Docker 容器中執行代理程式工具操作（shell、檔案讀寫等），而閘道本身則停留在主機上。這讓你在不將整個閘道容器化的情況下，也能為不受信任或多租戶的代理程式會話提供強硬的隔離屏障。

Sandbox 範圍可以是每個代理程式（預設）、每個工作階段或共用。每個範圍
都有自己的工作區掛載於 `/workspace`。您也可以設定
允許/拒絕工具政策、網路隔離、資源限制和瀏覽器
容器。

如需完整的配置、映像檔、安全性說明和多代理程式設定檔，請參閱：

- [Sandboxing](/zh-Hant/gateway/sandboxing) -- 完整的 sandbox 參考資料
- [OpenShell](/zh-Hant/gateway/openshell) -- sandbox 容器的互動式 shell 存取
- [Multi-Agent Sandbox and Tools](/zh-Hant/tools/multi-agent-sandbox-tools) -- 每個代理程式的覆寫設定

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

建構預設的 sandbox 映像檔：

```bash
scripts/sandbox-setup.sh
```

## 疑難排解

<AccordionGroup>
  <Accordion title="映像檔遺失或 sandbox 容器無法啟動">
    使用
    [`scripts/sandbox-setup.sh`](https://github.com/openclaw/openclaw/blob/main/scripts/sandbox-setup.sh)
    建構 sandbox 映像檔
    或將 `agents.defaults.sandbox.docker.image` 設定為您的自訂映像檔。
    容器會根據需求為每個工作階段自動建立。
  </Accordion>

<Accordion title="Sandbox 中的權限錯誤">將 `docker.user` 設定為符合您掛載工作區所有權的 UID:GID， 或變更工作區資料夾的所有權 (chown)。</Accordion>

<Accordion title="在 Sandbox 中找不到自訂工具">OpenClaw 使用 `sh -lc` (登入 shell) 執行命令，它會載入 `/etc/profile` 並可能重設 PATH。設定 `docker.env.PATH` 以在前面新增您的 自訂工具路徑，或在您的 Dockerfile 中於 `/etc/profile.d/` 下新增腳本。</Accordion>

<Accordion title="建構映像檔時 OOM-killed (exit 137)">VM 至少需要 2 GB RAM。使用更大的機器等級並重試。</Accordion>

  <Accordion title="控制 UI 中顯示未授權或需要配對">
    取得新的儀表板連結並核准瀏覽器裝置：

    ```bash
    docker compose run --rm openclaw-cli dashboard --no-open
    docker compose run --rm openclaw-cli devices list
    docker compose run --rm openclaw-cli devices approve <requestId>
    ```

    更多細節：[Dashboard](/zh-Hant/web/dashboard)、[Devices](/zh-Hant/cli/devices)。

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
- [Podman](/zh-Hant/install/podman) — Podman Docker 替代方案
- [ClawDock](/zh-Hant/install/clawdock) — Docker Compose 社群設定
- [更新](/zh-Hant/install/updating) — 保持 OpenClaw 為最新狀態
- [組態](/zh-Hant/gateway/configuration) — 安裝後的 gateway 組態
