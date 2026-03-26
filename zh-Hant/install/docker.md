---
summary: "OpenClaw 的可選 Docker 設定與入門"
read_when:
  - You want a containerized gateway instead of local installs
  - You are validating the Docker flow
title: "Docker"
---

# Docker（選用）

Docker 是**可選的**。僅在您需要容器化閘道或驗證 Docker 流程時使用。

## Docker 適合我嗎？

- **適合**：您想要一個隔離、可隨時捨棄的閘道環境，或者想在未進行本機安裝的主機上執行 OpenClaw。
- **不適合**：您是在自己的機器上執行，且只想要最快的開發循環。請改用一般的安裝流程。
- **沙盒備註**：Agent 沙盒也使用 Docker，但它**並不**要求完整的閘道在 Docker 中執行。請參閱[沙盒]/en/gateway/sandboxing。

## 先決條件

- Docker Desktop（或 Docker Engine）+ Docker Compose v2
- 建置映像檔至少需要 2 GB RAM（在 1 GB 主機上 `pnpm install` 可能會因 OOM 被終止並退出代碼 137）
- 足夠的磁碟空間用於映像檔和日誌
- 如果在 VPS/公開主機上執行，請檢閱
  [Security hardening for network exposure](/zh-Hant/gateway/security#0-4-network-exposure-bind-port-firewall)，
  特別是 Docker `DOCKER-USER` 防火牆原則。

## 容器化閘道

<Steps>
  <Step title="建構映像檔">
    從儲存庫根目錄執行設定指令碼：

    ```bash
    ./scripts/docker/setup.sh
    ```

    這會在本機建構閘道映像檔。若要改用預先建構的映像檔：

    ```bash
    export OPENCLAW_IMAGE="ghcr.io/openclaw/openclaw:latest"
    ./scripts/docker/setup.sh
    ```

    預先建構的映像檔會發佈於
    [GitHub Container Registry](https://github.com/openclaw/openclaw/pkgs/container/openclaw)。
    常見標籤：`main`、`latest`、`<version>` (例如 `2026.2.26`)。

  </Step>

  <Step title="完成入門">
    設定腳本會自動執行入門程序。它將會：

    - 提示輸入供應商 API 金鑰
    - 產生一個 gateway token 並將其寫入 `.env`
    - 透過 Docker Compose 啟動 gateway

  </Step>

  <Step title="開啟控制 UI">
    在瀏覽器中開啟 `http://127.0.0.1:18789/` 並將 token 貼上至
    Settings 中。

    需要網址嗎？

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

如果您更願意自行執行每個步驟，而不是使用設定腳本：

```bash
docker build -t openclaw:local -f Dockerfile .
docker compose run --rm openclaw-cli onboard
docker compose up -d openclaw-gateway
```

<Note>
  從儲存庫根目錄執行 `docker compose`。如果您啟用了 `OPENCLAW_EXTRA_MOUNTS` 或
  `OPENCLAW_HOME_VOLUME`，設定腳本會寫入 `docker-compose.extra.yml`；請使用 `-f docker-compose.yml
  -f docker-compose.extra.yml` 將其包含在內。
</Note>

### 環境變數

設定腳本接受這些可選的環境變數：

| 變數                           | 用途                                                    |
| ------------------------------ | ------------------------------------------------------- |
| `OPENCLAW_IMAGE`               | 使用遠端映像檔而非在本地建置                            |
| `OPENCLAW_DOCKER_APT_PACKAGES` | 在建置期間安裝額外的 apt 套件（以空格分隔）             |
| `OPENCLAW_EXTENSIONS`          | 在建置時預先安裝擴充功能相依項（以空格分隔的名稱）      |
| `OPENCLAW_EXTRA_MOUNTS`        | 額外主機綁定掛載（以逗號分隔的 `source:target[:opts]`） |
| `OPENCLAW_HOME_VOLUME`         | 將 `/home/node` 保持在命名的 Docker volume 中           |
| `OPENCLAW_SANDBOX`             | 選擇加入沙箱引導 (`1`, `true`, `yes`, `on`)             |
| `OPENCLAW_DOCKER_SOCKET`       | 覆蓋 Docker socket 路徑                                 |

### 健康檢查

容器探測端點（無需認證）：

```bash
curl -fsS http://127.0.0.1:18789/healthz   # liveness
curl -fsS http://127.0.0.1:18789/readyz     # readiness
```

Docker 映像檔包含內建的 `HEALTHCHECK`，會對 `/healthz` 進行 ping。
如果檢查持續失敗，Docker 會將容器標記為 `unhealthy`，
且編排系統可以重新啟動或取代它。

已驗證的深度健康狀態快照：

```bash
docker compose exec openclaw-gateway node dist/index.js health --token "$OPENCLAW_GATEWAY_TOKEN"
```

### LAN 與 loopback

`scripts/docker/setup.sh` 預設為 `OPENCLAW_GATEWAY_BIND=lan`，以便主機對
`http://127.0.0.1:18789` 的存取可配合 Docker 連接埠發佈運作。

- `lan` (預設值): 主機瀏覽器和主機 CLI 可以到達已發布的 gateway 埠。
- `loopback`: 只有容器網路命名空間內的處理程序才能直接存取 gateway。

<Note>
  在 `gateway.bind` 中使用綁定模式值 (`lan` / `loopback` / `custom` / `tailnet` / `auto`)，而不要
  使用主機別名，例如 `0.0.0.0` 或 `127.0.0.1`。
</Note>

### 儲存與持久性

Docker Compose 會將 `OPENCLAW_CONFIG_DIR` 綁定掛載到 `/home/node/.openclaw`，並將
`OPENCLAW_WORKSPACE_DIR` 綁定掛載到 `/home/node/.openclaw/workspace`，因此這些路徑
在容器被置換後會保留下來。

有關 VM 部署的完整持久性詳細資訊，請參閱
[Docker VM Runtime - What persists where](/zh-Hant/install/docker-vm-runtime#what-persists-where)。

**磁碟增長熱點：** 請留意 `media/`、session JSONL 檔案、`cron/runs/*.jsonl`
以及 `/tmp/openclaw/` 下的滾動檔案日誌。

### Shell 輔助工具（可選）

為了更輕鬆地進行日常 Docker 管理，請安裝 `ClawDock`：

```bash
mkdir -p ~/.clawdock && curl -sL https://raw.githubusercontent.com/openclaw/openclaw/main/scripts/shell-helpers/clawdock-helpers.sh -o ~/.clawdock/clawdock-helpers.sh
echo 'source ~/.clawdock/clawdock-helpers.sh' >> ~/.zshrc && source ~/.zshrc
```

然後使用 `clawdock-start`、`clawdock-stop`、`clawdock-dashboard` 等。執行
`clawdock-help` 查看所有指令。
請參閱 [`ClawDock` Helper README](https://github.com/openclaw/openclaw/blob/main/scripts/shell-helpers/README.md)。

<AccordionGroup>
  <Accordion title="為 Docker 閘道啟用代理程式沙箱">
    ```bash
    export OPENCLAW_SANDBOX=1
    ./scripts/docker/setup.sh
    ```

    自訂 socket 路徑（例如無根 Docker）：

    ```bash
    export OPENCLAW_SANDBOX=1
    export OPENCLAW_DOCKER_SOCKET=/run/user/1000/docker.sock
    ./scripts/docker/setup.sh
    ```

    該腳本僅在沙箱先決條件通過後才掛載 `docker.sock`。如果
    沙箱設置無法完成，腳本會將 `agents.defaults.sandbox.mode`
    重設為 `off`。

  </Accordion>

  <Accordion title="自動化 / CI（非互動式）">
    使用 `-T` 停用 Compose 偽 TTY 分配：

    ```bash
    docker compose run -T --rm openclaw-cli gateway probe
    docker compose run -T --rm openclaw-cli devices list --json
    ```

  </Accordion>

<Accordion title="共享網路安全性說明">
  `openclaw-cli` 使用 `network_mode: "service:openclaw-gateway"`，讓 CLI 指令可以透過 `127.0.0.1`
  存取 閘道。請將此視為共同的信任邊界。Compose 配置會捨棄 `NET_RAW`/`NET_ADMIN` 並在 `openclaw-cli`
  上啟用 `no-new-privileges`。
</Accordion>

  <Accordion title="權限與 EACCES">
    此映像檔以 `node` (uid 1000) 身分執行。如果您在
    `/home/node/.openclaw` 上看到權限錯誤，請確保您的主機繫結掛載是由 uid 1000 所擁有：

    ```bash
    sudo chown -R 1000:1000 /path/to/openclaw-config /path/to/openclaw-workspace
    ```

  </Accordion>

  <Accordion title="更快的重建">
    排序您的 Dockerfile 以便快取依賴層。這可以避免重新執行
    `pnpm install`，除非鎖定檔發生變更：

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
    功能更完整的容器：

    1. **保留 `/home/node`**：`export OPENCLAW_HOME_VOLUME="openclaw_home"`
    2. **建置系統相依項**：`export OPENCLAW_DOCKER_APT_PACKAGES="git curl jq"`
    3. **安裝 Playwright 瀏覽器**：
       ```bash
       docker compose run --rm openclaw-cli \
         node /app/node_modules/playwright-core/cli.js install chromium
       ```
    4. **保留瀏覽器下載項**：設定
       `PLAYWRIGHT_BROWSERS_PATH=/home/node/.cache/ms-playwright` 並使用
       `OPENCLAW_HOME_VOLUME` 或 `OPENCLAW_EXTRA_MOUNTS`。

  </Accordion>

<Accordion title="OpenAI Codex OAuth（無頭 Docker）">
  如果您在精靈中選擇 OpenAI Codex OAuth，它會開啟瀏覽器 URL。在 Docker 或無頭
  設定中，複製您前往的完整重新導向 URL 並將其貼回精靈中以完成驗證。
</Accordion>

  <Accordion title="基礎映像檔元資料">
    主要 Docker 映像檔使用 `node:24-bookworm` 並發布 OCI 基礎映像檔
    註解，包括 `org.opencontainers.image.base.name`、
    `org.opencontainers.image.source` 等。請參閱
    [OCI image annotations](https://github.com/opencontainers/image-spec/blob/main/annotations.md)。
  </Accordion>
</AccordionGroup>

### 在 VPS 上執行？

請參閱 [Hetzner (Docker VPS)](/zh-Hant/install/hetzner) 和
[Docker VM Runtime](/zh-Hant/install/docker-vm-runtime) 以了解共用 VM 部署步驟
，包括二進位檔製作、持久化和更新。

## Agent Sandbox

當啟用 `agents.defaults.sandbox` 時，閘道會在隔離的 Docker 容器內執行代理工具操作
（shell、檔案讀寫等），而閘道本身則停留在主機上。這為不受信任或
多租戶代理會話提供了堅固的隔離牆，而無需將整個閘道容器化。

沙箱範圍可以是每個代理（預設）、每個會話或共享的。每個範圍
都有自己的工作區，掛載於 `/workspace`。您還可以設定
允許/拒絕工具策略、網路隔離、資源限制和瀏覽器
容器。

有關完整的配置、映像檔、安全說明和多代理配置檔，請參閱：

- [Sandboxing](/zh-Hant/gateway/sandboxing) -- 完整的沙箱參考資料
- [OpenShell](/zh-Hant/gateway/openshell) -- 沙箱容器的互動式 shell 存取
- [多代理沙箱與工具](/zh-Hant/tools/multi-agent-sandbox-tools) -- 每個代理的覆蓋設定

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
  <Accordion title="映像檔遺失或沙箱容器無法啟動">
    使用
    [`scripts/sandbox-setup.sh`](https://github.com/openclaw/openclaw/blob/main/scripts/sandbox-setup.sh)
    建構沙箱映像檔，或將 `agents.defaults.sandbox.docker.image` 設定為您的自訂映像檔。
    容器會根據需求在每個工作階段自動建立。
  </Accordion>

<Accordion title="沙箱中的權限錯誤">
  將 `docker.user` 設定為符合您掛載工作區所有權的 UID:GID，或是對工作區資料夾執行 chown。
</Accordion>

<Accordion title="在沙盒中找不到自訂工具">
  OpenClaw 使用 `sh -lc` (login shell) 執行命令，這會載入 `/etc/profile` 並可能重置 PATH。請設定
  `docker.env.PATH` 以新增您的自訂工具路徑，或在您的 Dockerfile 中 `/etc/profile.d/`
  下新增一個腳本。
</Accordion>

<Accordion title="建置映像檔時發生 OOM-killed (exit 137)">
  VM 至少需要 2 GB RAM。請使用更大的機器等級並重試。
</Accordion>

  <Accordion title="Unauthorized or pairing required in Control UI">
    獲取新的儀表板連結並核准瀏覽器裝置：

    ```bash
    docker compose run --rm openclaw-cli dashboard --no-open
    docker compose run --rm openclaw-cli devices list
    docker compose run --rm openclaw-cli devices approve <requestId>
    ```

    更多細節：[儀表板](/zh-Hant/web/dashboard)、[裝置](/zh-Hant/cli/devices)。

  </Accordion>

  <Accordion title="Gateway target shows ws://172.x.x.x or pairing errors from Docker CLI">
    重置 Gateway 模式並綁定：

    ```bash
    docker compose run --rm openclaw-cli config set gateway.mode local
    docker compose run --rm openclaw-cli config set gateway.bind lan
    docker compose run --rm openclaw-cli devices list --url ws://127.0.0.1:18789
    ```

  </Accordion>
</AccordionGroup>

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
