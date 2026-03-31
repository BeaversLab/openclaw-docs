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
- **沙箱備註**：Agent 沙箱也會使用 Docker，但這**並不**需要完整的 Gateway 在 Docker 中執行。請參閱 [沙箱隔離](/en/gateway/sandboxing)。

## 必要條件

- Docker Desktop（或 Docker Engine）+ Docker Compose v2
- 建構映像檔至少需要 2 GB RAM（`pnpm install` 在 1 GB 的主機上可能會因 OOM 而被終止，退出代碼為 137）
- 足夠存放映像檔和日誌的磁碟空間
- 如果在 VPS/公開主機上執行，請檢閱
  [針對網路暴露的安全加固](/en/gateway/security)，
  特別是 Docker `DOCKER-USER` 防火牆政策。

## 容器化 Gateway

<Steps>
  <Step title="建構映像檔">
    在 repo 根目錄執行設定腳本：

    ```bash
    ./scripts/docker/setup.sh
    ```

    這會在本地建構 gateway 映像檔。若要改用預先建構的映像檔：

    ```bash
    export OPENCLAW_IMAGE="ghcr.io/openclaw/openclaw:latest"
    ./scripts/docker/setup.sh
    ```

    預先建構的映像檔會發佈至
    [GitHub Container Registry](https://github.com/openclaw/openclaw/pkgs/container/openclaw)。
    常見標籤：`main`、`latest`、`<version>`（例如 `2026.2.26`）。

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

  <Step title="開啟控制介面">
    在瀏覽器中開啟 `http://127.0.0.1:18789/` 並將 token 貼上至
    Settings。

    再次需要網址嗎？

    ```bash
    docker compose run --rm openclaw-cli dashboard --no-open
    ```

  </Step>

  <Step title="設定頻道（選用）">
    使用 CLI 容器以新增訊息頻道：

    ```bash
    # WhatsApp (QR)
    docker compose run --rm openclaw-cli channels login

    # Telegram
    docker compose run --rm openclaw-cli channels add --channel telegram --token "<token>"

    # Discord
    docker compose run --rm openclaw-cli channels add --channel discord --token "<token>"
    ```

    文件：[WhatsApp](/en/channels/whatsapp)、[Telegram](/en/channels/telegram)、[Discord](/en/channels/discord)

  </Step>
</Steps>

### 手動流程

如果您偏好事自行執行每個步驟，而不是使用設定腳本：

```bash
docker build -t openclaw:local -f Dockerfile .
docker compose run --rm --no-deps --entrypoint node openclaw-gateway \
  dist/index.js onboard --mode local --no-install-daemon
docker compose run --rm --no-deps --entrypoint node openclaw-gateway \
  dist/index.js config set gateway.mode local
docker compose run --rm --no-deps --entrypoint node openclaw-gateway \
  dist/index.js config set gateway.bind lan
docker compose run --rm --no-deps --entrypoint node openclaw-gateway \
  dist/index.js config set gateway.controlUi.allowedOrigins \
  '["http://localhost:18789","http://127.0.0.1:18789"]' --strict-json
docker compose up -d openclaw-gateway
```

<Note>請從儲存庫根目錄執行 `docker compose`。如果您啟用了 `OPENCLAW_EXTRA_MOUNTS` 或 `OPENCLAW_HOME_VOLUME`，設定腳本會寫入 `docker-compose.extra.yml`； 請使用 `-f docker-compose.yml -f docker-compose.extra.yml` 將其包含在內。</Note>

<Note>由於 `openclaw-cli` 共用 `openclaw-gateway` 的網路命名空間，它是一個 啟動後工具。在 `docker compose up -d openclaw-gateway` 之前，請透過 `openclaw-gateway` 使用 `--no-deps --entrypoint node` 來執行上架和設定時的配置寫入。</Note>

### 環境變數

設定腳本接受這些選用的環境變數：

| 變數                           | 用途                                                      |
| ------------------------------ | --------------------------------------------------------- |
| `OPENCLAW_IMAGE`               | 使用遠端映像檔而非在本地建置                              |
| `OPENCLAW_DOCKER_APT_PACKAGES` | 在建置期間安裝額外的 apt 套件（以空格分隔）               |
| `OPENCLAW_EXTENSIONS`          | 在建置時預先安裝擴充功能相依項（以空格分隔的名稱）        |
| `OPENCLAW_EXTRA_MOUNTS`        | 額外的主機繫接掛載（以逗號分隔的 `source:target[:opts]`） |
| `OPENCLAW_HOME_VOLUME`         | 在具名的 Docker volume 中保存 `/home/node`                |
| `OPENCLAW_SANDBOX`             | 啟用沙盒引導（`1`、`true`、`yes`、`on`）                  |
| `OPENCLAW_DOCKER_SOCKET`       | 覆寫 Docker socket 路徑                                   |

### 健康檢查

容器探查端點（無需驗證）：

```bash
curl -fsS http://127.0.0.1:18789/healthz   # liveness
curl -fsS http://127.0.0.1:18789/readyz     # readiness
```

Docker 映像檔包含內建的 `HEALTHCHECK`，會對 `/healthz` 進行 ping。
如果檢查持續失敗，Docker 會將容器標記為 `unhealthy`，
而編排系統可以重新啟動或取代它。

經過驗證的深度健康快照：

```bash
docker compose exec openclaw-gateway node dist/index.js health --token "$OPENCLAW_GATEWAY_TOKEN"
```

### 區域網路與 Loopback

`scripts/docker/setup.sh` 預設為 `OPENCLAW_GATEWAY_BIND=lan`，因此主機對
`http://127.0.0.1:18789` 的存取可透過 Docker 連接埠發佈運作。

- `lan` (預設)：主機瀏覽器和主機 CLI 可以存取已發佈的 gateway 連接埠。
- `loopback`：只有容器網路命名空間內的處理程序可以直接
  存取 gateway。

<Note>在 `gateway.bind` (`lan` / `loopback` / `custom` / `tailnet` / `auto`) 中使用綁定模式值，而不是像 `0.0.0.0` 或 `127.0.0.1` 這樣的主機別名。</Note>

### 儲存與持久性

Docker Compose 將 `OPENCLAW_CONFIG_DIR` 綁定掛載至 `/home/node/.openclaw` 並將
`OPENCLAW_WORKSPACE_DIR` 綁定掛載至 `/home/node/.openclaw/workspace`，因此這些路徑
在容器被取代後仍會保留。

關於 VM 部署的完整持久性詳細資訊，請參閱
[Docker VM Runtime - 什麼內容會保留在哪裡](/en/install/docker-vm-runtime#what-persists-where)。

**磁碟增長熱點：** 請注意 `media/`、工作階段 JSONL 檔案、`cron/runs/*.jsonl`，
以及 `/tmp/openclaw/` 下的輪替檔案日誌。

### Shell 輔助工具 (可選)

為了更方便日常管理 Docker，請安裝 `ClawDock`：

```bash
mkdir -p ~/.clawdock && curl -sL https://raw.githubusercontent.com/openclaw/openclaw/main/scripts/shell-helpers/clawdock-helpers.sh -o ~/.clawdock/clawdock-helpers.sh
echo 'source ~/.clawdock/clawdock-helpers.sh' >> ~/.zshrc && source ~/.zshrc
```

然後使用 `clawdock-start`、`clawdock-stop`、`clawdock-dashboard` 等指令。執行
`clawdock-help` 可查看所有指令。
請參閱 [`ClawDock` Helper README](https://github.com/openclaw/openclaw/blob/main/scripts/shell-helpers/README.md)。

<AccordionGroup>
  <Accordion title="為 Docker 閘道啟用代理程式沙箱">
    ```bash
    export OPENCLAW_SANDBOX=1
    ./scripts/docker/setup.sh
    ```

    自訂 socket 路徑（例如無 root 權限的 Docker）：

    ```bash
    export OPENCLAW_SANDBOX=1
    export OPENCLAW_DOCKER_SOCKET=/run/user/1000/docker.sock
    ./scripts/docker/setup.sh
    ```

    腳本僅在沙箱先決條件通過後才掛載 `docker.sock`。如果
    沙箱設定無法完成，腳本會將 `agents.defaults.sandbox.mode`
    重設為 `off`。

  </Accordion>

  <Accordion title="自動化 / CI (非互動式)">
    使用 `-T` 停用 Compose 虛擬 TTY 分配：

    ```bash
    docker compose run -T --rm openclaw-cli gateway probe
    docker compose run -T --rm openclaw-cli devices list --json
    ```

  </Accordion>

<Accordion title="Shared-network security note">`openclaw-cli` 使用 `network_mode: "service:openclaw-gateway"`，以便 CLI 指令可以透過 `127.0.0.1` 存取閘道。將此視為共享信任邊界。 Compose 設定會捨棄 `NET_RAW`/`NET_ADMIN` 並在 `openclaw-cli` 上啟用 `no-new-privileges`。</Accordion>

  <Accordion title="權限與 EACCES">
    映像檔以 `node` (uid 1000) 身分執行。如果您在
    `/home/node/.openclaw` 上看到權限錯誤，請確保您的主機綁定掛載是由 uid 1000 所擁有：

    ```bash
    sudo chown -R 1000:1000 /path/to/openclaw-config /path/to/openclaw-workspace
    ```

  </Accordion>

  <Accordion title="更快的重新建置">
    排序您的 Dockerfile 以快取相依性層。這可以避免重新執行
    `pnpm install`，除非鎖定檔變更：

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
    預設映像檔以安全為優先，並以非 root `node` 身分執行。若要使用功能更完整的容器：

    1. **保存 `/home/node`**：`export OPENCLAW_HOME_VOLUME="openclaw_home"`
    2. **內建系統相依項**：`export OPENCLAW_DOCKER_APT_PACKAGES="git curl jq"`
    3. **安裝 Playwright 瀏覽器**：
       ```bash
       docker compose run --rm openclaw-cli \
         node /app/node_modules/playwright-core/cli.js install chromium
       ```
    4. **保存瀏覽器下載內容**：設定
       `PLAYWRIGHT_BROWSERS_PATH=/home/node/.cache/ms-playwright` 並使用
       `OPENCLAW_HOME_VOLUME` 或 `OPENCLAW_EXTRA_MOUNTS`。

  </Accordion>

<Accordion title="OpenAI Codex OAuth (無頭 Docker)">如果您在精靈中選擇 OpenAI Codex OAuth，它會開啟一個瀏覽器 URL。在 Docker 或無頭設定中，複製您抵達的完整重新導向 URL 並將其 貼回精靈中以完成驗證。</Accordion>

  <Accordion title="基礎映像檔中繼資料">
    主要的 Docker 映像檔使用 `node:24-bookworm` 並發布 OCI 基礎映像檔
    註解，包括 `org.opencontainers.image.base.name`、
    `org.opencontainers.image.source` 等。請參閱
    [OCI image annotations](https://github.com/opencontainers/image-spec/blob/main/annotations.md)。
  </Accordion>
</AccordionGroup>

### 在 VPS 上執行？

請參閱 [Hetzner (Docker VPS)](/en/install/hetzner) 和
[Docker VM Runtime](/en/install/docker-vm-runtime) 以了解共用 VM 部署步驟，
包括二進位檔製作、保存和更新。

## 代理程式沙盒

當啟用 `agents.defaults.sandbox` 時，閘道會在隔離的 Docker 容器內執行代理程式工具操作
（殼層、檔案讀寫等），而閘道本身則停留在主機上。這為不受信任或多租戶
的代理程式工作階段提供了強硬的隔離，而無需將整個閘道容器化。

沙盒範圍可以是每個代理程式（預設）、每個工作階段或共用。每個範圍
都會獲得掛載在 `/workspace` 的專屬工作區。您也可以設定
允許/拒絕工具原則、網路隔離、資源限制和瀏覽器
容器。

如需完整組態、映像檔、安全性備註和多代理程式設定檔，請參閱：

- [沙盒隔離](/en/gateway/sandboxing) -- 完整的沙盒參考資料
- [OpenShell](/en/gateway/openshell) -- 進入沙箱容器的互動式 shell
- [多智能體沙箱與工具](/en/tools/multi-agent-sandbox-tools) -- 每個智能體的覆寫設定

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

建構預設沙箱映像檔：

```bash
scripts/sandbox-setup.sh
```

## 疑難排解

<AccordionGroup>
  <Accordion title="缺少映像檔或沙箱容器無法啟動">
    使用 [`scripts/sandbox-setup.sh`](https://github.com/openclaw/openclaw/blob/main/scripts/sandbox-setup.sh) 建構沙箱映像檔
    或將 `agents.defaults.sandbox.docker.image` 設定為您的自訂映像檔。
    容器會在每次會話中按需求自動建立。
  </Accordion>

<Accordion title="沙箱中的權限錯誤">將 `docker.user` 設定為符合您掛載工作區所有權的 UID:GID， 或使用 chown 更改工作區資料夾的所有權。</Accordion>

<Accordion title="在沙盒中找不到自訂工具">OpenClaw 使用 `sh -lc`（登入 shell）執行指令，該過程會 執行 `/etc/profile` 並可能重設 PATH。請設定 `docker.env.PATH` 以將您的 自訂工具路徑加到前面，或在您的 Dockerfile 中的 `/etc/profile.d/` 下新增一個腳本。</Accordion>

<Accordion title="建置映像檔期間 OOM-killed（exit 137）">VM 至少需要 2 GB RAM。請使用更大的機器類別並重試。</Accordion>

  <Accordion title="控制 UI 中顯示未授權或需要配對">
    取得一個新的儀表板連結並核准瀏覽器裝置：

    ```bash
    docker compose run --rm openclaw-cli dashboard --no-open
    docker compose run --rm openclaw-cli devices list
    docker compose run --rm openclaw-cli devices approve <requestId>
    ```

    更多資訊：[儀表板](/en/web/dashboard)、[裝置](/en/cli/devices)。

  </Accordion>

  <Accordion title="閘道目標顯示 ws://172.x.x.x 或來自 Docker CLI 的配對錯誤">
    重設閘道模式與綁定：

    ```bash
    docker compose run --rm openclaw-cli config set gateway.mode local
    docker compose run --rm openclaw-cli config set gateway.bind lan
    docker compose run --rm openclaw-cli devices list --url ws://127.0.0.1:18789
    ```

  </Accordion>
</AccordionGroup>
