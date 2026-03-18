---
summary: "可選的 OpenClaw Docker 設定與入門"
read_when:
  - You want a containerized gateway instead of local installs
  - You are validating the Docker flow
title: "Docker"
---

# Docker（可選）

Docker 是**可選的**。僅在您需要容器化閘道或驗證 Docker 流程時使用。

## Docker 適合我嗎？

- **是**：您想要一個隔離的、可拋棄的閘道環境，或者在未進行本機安裝的主機上執行 OpenClaw。
- **否**：您在自己的機器上執行，並且只想要最快的開發迴圈。請改用一般安裝流程。
- **沙箱提示**：Agent 沙箱也使用 Docker，但它**不**需要完整的閘道在 Docker 中執行。請參閱[沙箱](/zh-Hant/gateway/sandboxing)。

本指南涵蓋：

- 容器化閘道（Docker 中的完整 OpenClaw）
- 每個會話的 Agent 沙箱（主機閘道 + Docker 隔離的 Agent 工具）

沙箱詳細資訊：[沙箱](/zh-Hant/gateway/sandboxing)

## 需求

- Docker Desktop（或 Docker Engine）+ Docker Compose v2
- 至少 2 GB RAM 用於映像檔建置（`pnpm install` 在 1 GB 主機上可能會因 OOM 被終止並以退出碼 137 離開）
- 足夠的磁碟空間用於映像檔和日誌
- 如果在 VPS/公開主機上執行，請參閱
  [網路暴露的安全防護](/zh-Hant/gateway/security#04-network-exposure-bind--port--firewall)，
  特別是 Docker `DOCKER-USER` 防火牆原則。

## 容器化閘道（Docker Compose）

### 快速入門（建議）

<Note>
  此處的 Docker 預設值假設為綁定模式（`lan`/`loopback`），而非主機別名。請在 `gateway.bind`
  中使用綁定模式值 （例如 `lan` 或 `loopback`），而不要使用像 `0.0.0.0` 或 `localhost`
  這樣的主機別名。
</Note>

從存放庫根目錄：

```bash
./docker-setup.sh
```

此腳本：

- 在本機建置閘道映像檔（如果設定了 `OPENCLAW_IMAGE` 則拉取遠端映像檔）
- 執行入門
- 列印可選的提供商設定提示
- 透過 Docker Compose 啟動閘道
- 產生閘道權杖並將其寫入 `.env`

可選的環境變數：

- `OPENCLAW_IMAGE` — 使用遠端映像檔而非本機建置（例如 `ghcr.io/openclaw/openclaw:latest`）
- `OPENCLAW_DOCKER_APT_PACKAGES` — 在建置期間安裝額外的 apt 套件
- `OPENCLAW_EXTENSIONS` — 在建置時預先安裝擴充功能依賴（以空格分隔的擴充功能名稱，例如 `diagnostics-otel matrix`）
- `OPENCLAW_EXTRA_MOUNTS` — 新增額外的主機繫結掛載
- `OPENCLAW_HOME_VOLUME` — 將 `/home/node` 持久化到命名卷中
- `OPENCLAW_SANDBOX` — 選擇加入 Docker 閘道沙箱引導。僅有明確的真值會啟用它：`1`、`true`、`yes`、`on`
- `OPENCLAW_INSTALL_DOCKER_CLI` — 本地映像檔建置的建置參數傳遞（`1` 會在映像檔中安裝 Docker CLI）。當 `OPENCLAW_SANDBOX=1` 進行本地建置時，`docker-setup.sh` 會自動設定此選項。
- `OPENCLAW_DOCKER_SOCKET` — 覆寫 Docker socket 路徑（預設為 `DOCKER_HOST=unix://...` 路徑，否則為 `/var/run/docker.sock`）
- `OPENCLAW_ALLOW_INSECURE_PRIVATE_WS=1` — 緊急情況：允許受信任的私人網路
  `ws://` 目標用於 CLI/入門客戶端路徑（預設僅限 loopback）
- `OPENCLAW_BROWSER_DISABLE_GRAPHICS_FLAGS=0` — 停用容器瀏覽器強化標誌
  當您需要
  WebGL/3D 相容性時停用 `--disable-3d-apis`、`--disable-software-rasterizer`、`--disable-gpu`。
- `OPENCLAW_BROWSER_DISABLE_EXTENSIONS=0` — 當瀏覽器
  流程需要時，保持擴充功能啟用（預設在沙箱瀏覽器中保持擴充功能停用）。
- `OPENCLAW_BROWSER_RENDERER_PROCESS_LIMIT=<N>` — 設定 Chromium 渲染程序
  限制；設為 `0` 以跳過該標誌並使用 Chromium 預設行為。

完成後：

- 在瀏覽器中開啟 `http://127.0.0.1:18789/`。
- 將貼語貼上至控制 UI（Settings → token）。
- 需要再次取得 URL？執行 `docker compose run --rm openclaw-cli dashboard --no-open`。

### 為 Docker 閘道啟用代理程式沙箱（選擇加入）

`docker-setup.sh` 也可以為 Docker
部署引導 `agents.defaults.sandbox.*`。

啟用方式：

```bash
export OPENCLAW_SANDBOX=1
./docker-setup.sh
```

自訂 socket 路徑（例如 rootless Docker）：

```bash
export OPENCLAW_SANDBOX=1
export OPENCLAW_DOCKER_SOCKET=/run/user/1000/docker.sock
./docker-setup.sh
```

備註：

- 腳本僅在沙箱先決條件通過後才掛載 `docker.sock`。
- 如果無法完成沙箱設定，腳本會將 `agents.defaults.sandbox.mode` 重設為 `off`，以避免在重新執行時出現過時/損壞的沙箱設定。
- 如果缺少 `Dockerfile.sandbox`，腳本會列印警告並繼續執行；如有需要，請使用 `scripts/sandbox-setup.sh` 來建置 `openclaw-sandbox:bookworm-slim`。
- 對於非本地的 `OPENCLAW_IMAGE` 值，映像檔必須已包含用於沙箱執行的 Docker CLI 支援。

### 自動化/CI（非互動式，無 TTY 雜訊）

對於腳本和 CI，請使用 `-T` 停用 Compose 虛擬 TTY 分配：

```bash
docker compose run -T --rm openclaw-cli gateway probe
docker compose run -T --rm openclaw-cli devices list --json
```

如果您的自動化未匯出任何 Claude 工作階段變數，現在讓其保持未設置狀態，預設會在 `docker-compose.yml` 中解析為空值，以避免重複出現「變數未設置」的警告。

### 共用網路安全性提示（CLI + gateway）

`openclaw-cli` 使用 `network_mode: "service:openclaw-gateway"`，以便 CLI 指令能透過 Docker 中的 `127.0.0.1` 可靠地連接到 gateway。

請將此視為一個共用的信任邊界：回圈繫結並非這兩個容器之間的隔離。如果您需要更強的隔離，請從單獨的容器/主機網路路徑執行指令，而不是使用捆綁的 `openclaw-cli` 服務。

為了降低 CLI 程序若遭入侵時的影響，compose 設定會捨棄 `NET_RAW`/`NET_ADMIN` 並在 `openclaw-cli` 上啟用 `no-new-privileges`。

它會在主機上寫入 config/workspace：

- `~/.openclaw/`
- `~/.openclaw/workspace`

在 VPS 上執行嗎？請參閱 [Hetzner (Docker VPS)](/zh-Hant/install/hetzner)。

### 使用遠端映像檔（略過本地建置）

官方預先建置的映像檔發佈於：

- [GitHub Container Registry 套件](https://github.com/openclaw/openclaw/pkgs/container/openclaw)

請使用映像檔名稱 `ghcr.io/openclaw/openclaw`（而非名稱相似的 Docker Hub 映像檔）。

常見標籤：

- `main` — 來自 `main` 的最新建置
- `<version>` — 發布標籤建置（例如 `2026.2.26`）
- `latest` — 最新穩定版發行標籤

### 基礎映像檔中繼資料

主要的 Docker 映像檔目前使用：

- `node:24-bookworm`

Docker 映像檔現在會發布 OCI 基礎映像檔註釋（sha256 是一個範例，
並指向該標籤鎖定的多架構資訊清單清單）：

- `org.opencontainers.image.base.name=docker.io/library/node:24-bookworm`
- `org.opencontainers.image.base.digest=sha256:3a09aa6354567619221ef6c45a5051b671f953f0a1924d1f819ffb236e520e6b`
- `org.opencontainers.image.source=https://github.com/openclaw/openclaw`
- `org.opencontainers.image.url=https://openclaw.ai`
- `org.opencontainers.image.documentation=https://docs.openclaw.ai/install/docker`
- `org.opencontainers.image.licenses=MIT`
- `org.opencontainers.image.title=OpenClaw`
- `org.opencontainers.image.description=OpenClaw gateway and CLI runtime container image`
- `org.opencontainers.image.revision=<git-sha>`
- `org.opencontainers.image.version=<tag-or-main>`
- `org.opencontainers.image.created=<rfc3339 timestamp>`

參考：[OCI 映像檔註釋](https://github.com/opencontainers/image-spec/blob/main/annotations.md)

發行版本背景：此存儲庫的標籤歷史記錄在
`v2026.2.22` 及更早的 2026 標籤（例如 `v2026.2.21`、`v2026.2.9`）中已經使用 Bookworm。

預設情況下，安裝腳本會從原始碼建構映像檔。若要改為提取預先建構的
映像檔，請在執行腳本前設定 `OPENCLAW_IMAGE`：

```bash
export OPENCLAW_IMAGE="ghcr.io/openclaw/openclaw:latest"
./docker-setup.sh
```

腳本會偵測到 `OPENCLAW_IMAGE` 並非預設的 `openclaw:local`，並
執行 `docker pull` 而非 `docker build`。其他所有事項（上架、
閘道啟動、權杖產生）的運作方式皆相同。

`docker-setup.sh` 仍然會從存儲庫根目錄執行，因為它使用本機的
`docker-compose.yml` 和輔助檔案。`OPENCLAW_IMAGE` 會跳過本機映像檔建構
時間；它不會取代 compose/setup 工作流程。

### Shell 輔助程式（選用）

為了更便於日常管理 Docker，請安裝 `ClawDock`：

```bash
mkdir -p ~/.clawdock && curl -sL https://raw.githubusercontent.com/openclaw/openclaw/main/scripts/shell-helpers/clawdock-helpers.sh -o ~/.clawdock/clawdock-helpers.sh
```

**加入至您的 shell 設定檔（zsh）：**

```bash
echo 'source ~/.clawdock/clawdock-helpers.sh' >> ~/.zshrc && source ~/.zshrc
```

然後使用 `clawdock-start`、`clawdock-stop`、`clawdock-dashboard` 等。執行 `clawdock-help` 以查看所有指令。

詳情請參閱 [`ClawDock` Helper README](https://github.com/openclaw/openclaw/blob/main/scripts/shell-helpers/README.md)。

### 手動流程（compose）

```bash
docker build -t openclaw:local -f Dockerfile .
docker compose run --rm openclaw-cli onboard
docker compose up -d openclaw-gateway
```

注意：請從儲存庫根目錄執行 `docker compose ...`。如果您已啟用
`OPENCLAW_EXTRA_MOUNTS` 或 `OPENCLAW_HOME_VOLUME`，設定腳本會寫入
`docker-compose.extra.yml`；在其他地方執行 Compose 時請包含該檔案：

```bash
docker compose -f docker-compose.yml -f docker-compose.extra.yml <command>
```

### 控制 UI 權杖 + 配對 (Docker)

如果您看到「未授權」或「已斷線 (1008)：需要配對」，請取得
新的儀表板連結並批准瀏覽器裝置：

```bash
docker compose run --rm openclaw-cli dashboard --no-open
docker compose run --rm openclaw-cli devices list
docker compose run --rm openclaw-cli devices approve <requestId>
```

更多詳細資訊：[儀表板](/zh-Hant/web/dashboard)、[裝置](/zh-Hant/cli/devices)。

### 額外的掛載 (可選)

如果您想要將額外的主機目錄掛載到容器中，請在執行 `docker-setup.sh` 之前設定
`OPENCLAW_EXTRA_MOUNTS`。這接受以逗號分隔的 Docker 綁定掛載列表，並透過產生 `docker-compose.extra.yml` 將其套用至
`openclaw-gateway` 和 `openclaw-cli`。

範例：

```bash
export OPENCLAW_EXTRA_MOUNTS="$HOME/.codex:/home/node/.codex:ro,$HOME/github:/home/node/github:rw"
./docker-setup.sh
```

注意：

- 路徑必須與 macOS/Windows 上的 Docker Desktop 共用。
- 每個項目必須是 `source:target[:options]` 且沒有空格、Tab 或換行符號。
- 如果您編輯 `OPENCLAW_EXTRA_MOUNTS`，請重新執行 `docker-setup.sh` 以重新產生
  額外的 compose 檔案。
- `docker-compose.extra.yml` 是產生的。請勿手動編輯。

### 保存整個容器主目錄 (可選)

如果您希望 `/home/node` 在重新建立容器後保存，請透過 `OPENCLAW_HOME_VOLUME` 設定一個命名
磁碟區。這會建立一個 Docker 磁碟區並將其掛載在
`/home/node`，同時保留標準的設定/工作區綁定掛載。請在此處使用
命名磁碟區 (而非綁定路徑)；若為綁定掛載，請使用
`OPENCLAW_EXTRA_MOUNTS`。

範例：

```bash
export OPENCLAW_HOME_VOLUME="openclaw_home"
./docker-setup.sh
```

您可以將此與額外的掛載結合使用：

```bash
export OPENCLAW_HOME_VOLUME="openclaw_home"
export OPENCLAW_EXTRA_MOUNTS="$HOME/.codex:/home/node/.codex:ro,$HOME/github:/home/node/github:rw"
./docker-setup.sh
```

注意：

- 命名磁碟區必須符合 `^[A-Za-z0-9][A-Za-z0-9_.-]*$`。
- 如果您變更 `OPENCLAW_HOME_VOLUME`，請重新執行 `docker-setup.sh` 以重新產生
  額外的 compose 檔案。
- 命名磁碟區會持續存在，直到使用 `docker volume rm <name>` 將其移除。

### 安裝額外的 apt 套件 (可選)

如果您需要映像檔內的系統套件（例如，建置工具或媒體
程式庫），請在執行 `docker-setup.sh` 之前設定 `OPENCLAW_DOCKER_APT_PACKAGES`。
這會在映像檔建置期間安裝這些套件，因此即使刪除
容器，這些套件也會保留。

範例：

```bash
export OPENCLAW_DOCKER_APT_PACKAGES="ffmpeg build-essential"
./docker-setup.sh
```

注意：

- 這會接受以空格分隔的 apt 套件名稱列表。
- 如果您變更 `OPENCLAW_DOCKER_APT_PACKAGES`，請重新執行 `docker-setup.sh` 以重新建置
  映像檔。

### 預先安裝擴充功能相依套件（選用）

擁有自己的 `package.json` 的擴充功能（例如 `diagnostics-otel`、`matrix`、
`msteams`）會在首次載入時安裝其 npm 相依套件。若要將這些
相依套件改為建置到映像檔中，請在執行 `docker-setup.sh` 之前設定
`OPENCLAW_EXTENSIONS`：

```bash
export OPENCLAW_EXTENSIONS="diagnostics-otel matrix"
./docker-setup.sh
```

或是直接建置時：

```bash
docker build --build-arg OPENCLAW_EXTENSIONS="diagnostics-otel matrix" .
```

注意：

- 這會接受以空格分隔的擴充功能目錄名稱列表（位於 `extensions/` 下）。
- 僅具有 `package.json` 的擴充功能會受到影響；不具備此功能的輕量型外掛將被忽略。
- 如果您變更 `OPENCLAW_EXTENSIONS`，請重新執行 `docker-setup.sh` 以重新建置
  映像檔。

### 進階使用者 / 全功能容器（選用）

預設的 Docker 映像檔採取**安全優先**原則，並以非 root 的 `node`
使用者身分執行。這能減少攻擊面，但也意味著：

- 無法在執行時期安裝系統套件
- 預設無 Homebrew
- 無內建的 Chromium/Playwright 瀏覽器

如果您想要功能更齊全的容器，請使用這些選用的設定：

1. **保存 `/home/node`**，讓瀏覽器下載內容和工具快取得以保存：

```bash
export OPENCLAW_HOME_VOLUME="openclaw_home"
./docker-setup.sh
```

2. **將系統相依套件建置到映像檔中**（可重複 + 持久化）：

```bash
export OPENCLAW_DOCKER_APT_PACKAGES="git curl jq"
./docker-setup.sh
```

3. **安裝 Playwright 瀏覽器而不使用 `npx`**（避免 npm 覆蓋衝突）：

```bash
docker compose run --rm openclaw-cli \
  node /app/node_modules/playwright-core/cli.js install chromium
```

如果您需要 Playwright 安裝系統相依套件，請使用 `OPENCLAW_DOCKER_APT_PACKAGES` 重新建置映像檔，
而不是在執行時期使用 `--with-deps`。

4. **保存 Playwright 瀏覽器下載內容**：

- 在 `docker-compose.yml` 中
  設定 `PLAYWRIGHT_BROWSERS_PATH=/home/node/.cache/ms-playwright`。
- 確保 `/home/node` 透過 `OPENCLAW_HOME_VOLUME` 持續存在，或者透過 `OPENCLAW_EXTRA_MOUNTS` 掛載
  `/home/node/.cache/ms-playwright`。

### 權限 + EACCES

映像檔以 `node` (uid 1000) 身份執行。如果您在 `/home/node/.openclaw` 上看到權限錯誤，請確保您的主機綁定掛載是由 uid 1000 擁有的。

範例 (Linux 主機):

```bash
sudo chown -R 1000:1000 /path/to/openclaw-config /path/to/openclaw-workspace
```

如果您為了方便而選擇以 root 身份執行，即表示您接受權衡安全性的取捨。

### 更快的重建速度 (建議)

為了加快重建速度，請排列您的 Dockerfile 順序以便快取相依性層。
這可以避免除非鎖定檔變更，否則重新執行 `pnpm install`:

```dockerfile
FROM node:24-bookworm

# Install Bun (required for build scripts)
RUN curl -fsSL https://bun.sh/install | bash
ENV PATH="/root/.bun/bin:${PATH}"

RUN corepack enable

WORKDIR /app

# Cache dependencies unless package metadata changes
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

### 頻道設定 (可選)

使用 CLI 容器來設定頻道，然後視需要重新啟動閘道。

WhatsApp (QR):

```bash
docker compose run --rm openclaw-cli channels login
```

Telegram (bot token):

```bash
docker compose run --rm openclaw-cli channels add --channel telegram --token "<token>"
```

Discord (bot token):

```bash
docker compose run --rm openclaw-cli channels add --channel discord --token "<token>"
```

文件: [WhatsApp](/zh-Hant/channels/whatsapp)、[Telegram](/zh-Hant/channels/telegram)、[Discord](/zh-Hant/channels/discord)

### OpenAI Codex OAuth (無頭 Docker)

如果您在精靈中選擇 OpenAI Codex OAuth，它會開啟瀏覽器 URL 並嘗試
在 `http://127.0.0.1:1455/auth/callback` 上擷取回呼。在 Docker 或
無頭設定的情況下，該回呼可能會顯示瀏覽器錯誤。複製您抵達的完整重新導向
URL 並將其貼回精靈中以完成驗證。

### 健康檢查

容器探測端點 (無需驗證):

```bash
curl -fsS http://127.0.0.1:18789/healthz
curl -fsS http://127.0.0.1:18789/readyz
```

別名: `/health` 和 `/ready`。

`/healthz` 是一個淺層存活度探測，用於「閘道程序已啟動」。
`/readyz` 在啟動寬限期內保持就緒，然後只有在必要的
受管理頻道在寬限期後仍未連線或之後中斷連線時，才會變為 `503`。

Docker 映像檔包含一個內建的 `HEALTHCHECK`，它會在後台
對 `/healthz` 進行 ping。簡單來說：Docker 會持續檢查 OpenClaw 是否
仍有回應。如果檢查持續失敗，Docker 會將容器標記為 `unhealthy`，
而編排系統 (Docker Compose 重新啟動策略、Swarm、Kubernetes 等)
可以自動重新啟動或取代它。

已驗證的深度健康狀態快照 (閘道 + 頻道):

```bash
docker compose exec openclaw-gateway node dist/index.js health --token "$OPENCLAW_GATEWAY_TOKEN"
```

### E2E 煙霧測試 (Docker)

```bash
scripts/e2e/onboard-docker.sh
```

### QR 匯入煙霧測試 (Docker)

```bash
pnpm test:docker:qr
```

### 區域網路 vs 本地迴路 (Docker Compose)

`docker-setup.sh` 預設為 `OPENCLAW_GATEWAY_BIND=lan`，因此主機對
`http://127.0.0.1:18789` 的存取適用於 Docker 連接埠發佈。

- `lan` (預設)：主機瀏覽器與主機 CLI 可連線至已發佈的 gateway 連接埠。
- `loopback`：只有容器網路命名空間內的程序能直接連線至
  gateway；透過主機發佈的連接埠存取可能會失敗。

安裝腳本也會在入職之後鎖定 `gateway.mode=local`，因此 Docker CLI
指令預設會以本地迴路為目標。

舊版設定備註：請在 `gateway.bind` 中使用綁定模式值 (`lan` / `loopback` /
`custom` / `tailnet` / `auto`)，而非主機別名 (`0.0.0.0`、`127.0.0.1`、
`localhost`、`::`、`::1`)。

如果您從 Docker CLI 指令看到 `Gateway target: ws://172.x.x.x:18789` 或重複的 `pairing required`
錯誤，請執行：

```bash
docker compose run --rm openclaw-cli config set gateway.mode local
docker compose run --rm openclaw-cli config set gateway.bind lan
docker compose run --rm openclaw-cli devices list --url ws://127.0.0.1:18789
```

### 備註

- Gateway 綁定預設為 `lan` 以供容器使用 (`OPENCLAW_GATEWAY_BIND`)。
- Dockerfile CMD 使用 `--allow-unconfigured`；掛載的設定若含 `gateway.mode` 而非 `local` 仍會啟動。請覆寫 CMD 以強制執行防護。
- Gateway 容器是作業階段的信任來源 (`~/.openclaw/agents/<agentId>/sessions/`)。

### 儲存模型

- **持續性主機資料：** Docker Compose 將 `OPENCLAW_CONFIG_DIR` 綁定掛載至 `/home/node/.openclaw`，並將 `OPENCLAW_WORKSPACE_DIR` 綁定掛載至 `/home/node/.openclaw/workspace`，因此這些路徑在容器更換後仍會保留。
- **暫時性沙箱 tmpfs：** 當啟用 `agents.defaults.sandbox` 時，沙箱容器會對 `/tmp`、`/var/tmp` 和 `/run` 使用 `tmpfs`。這些掛載與頂層 Compose 堆疊分開，並會隨沙箱容器消失。
- **磁盤增長熱點：** 請注意 `media/`、`agents/<agentId>/sessions/sessions.json`、transcript JSONL 檔案、`cron/runs/*.jsonl` 以及 `/tmp/openclaw/`（或您設定的 `logging.file`）下的滾動檔案日誌。如果您也在 Docker 外執行 macOS 應用程式，其服務日誌是分開的：`~/.openclaw/logs/gateway.log`、`~/.openclaw/logs/gateway.err.log` 和 `/tmp/openclaw/openclaw-gateway.log`。

## Agent Sandbox（主機閘道 + Docker 工具）

深度解析：[沙盒機制](/zh-Hant/gateway/sandboxing)

### 運作方式

當啟用 `agents.defaults.sandbox` 時，**非主要工作階段**會在 Docker 容器內執行工具。閘道保留在您的主機上，但工具執行是隔離的：

- 範圍：預設為 `"agent"`（每個 Agent 一個容器 + 工作區）
- 範圍：`"session"` 用於每個工作階段的隔離
- 每個範圍的工作區資料夾掛載於 `/workspace`
- 選用的 Agent 工作區存取權（`agents.defaults.sandbox.workspaceAccess`）
- 允許/拒絕工具原則（拒絕優先）
- 傳入的媒體會被複製到使用中的沙盒工作區（`media/inbound/*`），以便工具讀取（啟用 `workspaceAccess: "rw"` 時，這會存放在 Agent 工作區中）

警告：`scope: "shared"` 會停用跨工作階段隔離。所有工作階段共用一個容器和一個工作區。

### 個別 Agent 的沙盒設定檔（多 Agent）

如果您使用多 Agent 路由，每個 Agent 都可以覆寫沙盒和工具設定：
`agents.list[].sandbox` 和 `agents.list[].tools`（加上 `agents.list[].tools.sandbox.tools`）。這讓您能在一個閘道中執行混合存取層級：

- 完整存取（個人 Agent）
- 唯讀工具 + 唯讀工作區（家庭/工作 Agent）
- 無檔案系統/Shell 工具（公開 Agent）

請參閱 [Multi-Agent Sandbox & Tools](/zh-Hant/tools/multi-agent-sandbox-tools) 以取得範例、
優先順序和疑難排解。

### 預設行為

- 映像檔：`openclaw-sandbox:bookworm-slim`
- 每個 Agent 一個容器
- Agent 工作區存取權：`workspaceAccess: "none"`（預設）使用 `~/.openclaw/sandboxes`
  - `"ro"` 將沙箱工作區保留在 `/workspace`，並以唯讀方式掛載代理程式工作區於 `/agent`（停用 `write`/`edit`/`apply_patch`）
  - `"rw"` 以讀寫方式掛載代理程式工作區於 `/workspace`
- 自動修剪：閒置 > 24 小時 或 存在時間 > 7 天
- 網路：預設為 `none`（如果您需要出口流量，請明確選擇加入）
  - `host` 已被封鎖。
  - `container:<id>` 預設已被封鎖（命名空間加入風險）。
- 預設允許：`exec`、`process`、`read`、`write`、`edit`、`sessions_list`、`sessions_history`、`sessions_send`、`sessions_spawn`、`session_status`
- 預設拒絕：`browser`、`canvas`、`nodes`、`cron`、`discord`、`gateway`

### 啟用沙箱

如果您計劃在 `setupCommand` 中安裝套件，請注意：

- 預設的 `docker.network` 為 `"none"`（無出口流量）。
- `docker.network: "host"` 已被封鎖。
- `docker.network: "container:<id>"` 預設已被封鎖。
- 緊急覆寫：`agents.defaults.sandbox.docker.dangerouslyAllowContainerNamespaceJoin: true`。
- `readOnlyRoot: true` 會封鎖套件安裝。
- `user` 必須是 root 才能進行 `apt-get`（省略 `user` 或設定 `user: "0:0"`）。
  當 `setupCommand`（或 docker 配置）變更時，除非容器在最近（約 5 分鐘內）被使用過，否則 OpenClaw 會自動重建容器。熱容器會記錄一個包含確切 `openclaw sandbox recreate ...` 指令的警告。

```json5
{
  agents: {
    defaults: {
      sandbox: {
        mode: "non-main", // off | non-main | all
        scope: "agent", // session | agent | shared (agent is default)
        workspaceAccess: "none", // none | ro | rw
        workspaceRoot: "~/.openclaw/sandboxes",
        docker: {
          image: "openclaw-sandbox:bookworm-slim",
          workdir: "/workspace",
          readOnlyRoot: true,
          tmpfs: ["/tmp", "/var/tmp", "/run"],
          network: "none",
          user: "1000:1000",
          capDrop: ["ALL"],
          env: { LANG: "C.UTF-8" },
          setupCommand: "apt-get update && apt-get install -y git curl jq",
          pidsLimit: 256,
          memory: "1g",
          memorySwap: "2g",
          cpus: 1,
          ulimits: {
            nofile: { soft: 1024, hard: 2048 },
            nproc: 256,
          },
          seccompProfile: "/path/to/seccomp.json",
          apparmorProfile: "openclaw-sandbox",
          dns: ["1.1.1.1", "8.8.8.8"],
          extraHosts: ["internal.service:10.0.0.5"],
        },
        prune: {
          idleHours: 24, // 0 disables idle pruning
          maxAgeDays: 7, // 0 disables max-age pruning
        },
      },
    },
  },
  tools: {
    sandbox: {
      tools: {
        allow: [
          "exec",
          "process",
          "read",
          "write",
          "edit",
          "sessions_list",
          "sessions_history",
          "sessions_send",
          "sessions_spawn",
          "session_status",
        ],
        deny: ["browser", "canvas", "nodes", "cron", "discord", "gateway"],
      },
    },
  },
}
```

強化控制項位於 `agents.defaults.sandbox.docker` 之下：
`network`、`user`、`pidsLimit`、`memory`、`memorySwap`、`cpus`、`ulimits`、
`seccompProfile`、`apparmorProfile`、`dns`、`extraHosts`、
`dangerouslyAllowContainerNamespaceJoin`（僅緊急情況）。

多重代理：透過 `agents.list[].sandbox.{docker,browser,prune}.*` 為每個代理覆寫 `agents.defaults.sandbox.{docker,browser,prune}.*`
（當 `agents.defaults.sandbox.scope` / `agents.list[].sandbox.scope` 為 `"shared"` 時會被忽略）。

### 建構預設沙箱映像檔

```bash
scripts/sandbox-setup.sh
```

這會使用 `Dockerfile.sandbox` 來建構 `openclaw-sandbox:bookworm-slim`。

### 沙箱通用映像檔（選用）

如果您想要一個包含常見建構工具（Node、Go、Rust 等）的沙箱映像檔，請建構通用映像檔：

```bash
scripts/sandbox-common-setup.sh
```

這會建構 `openclaw-sandbox-common:bookworm-slim`。若要使用它：

```json5
{
  agents: {
    defaults: {
      sandbox: { docker: { image: "openclaw-sandbox-common:bookworm-slim" } },
    },
  },
}
```

### 沙箱瀏覽器映像檔

若要在沙箱內執行瀏覽器工具，請建構瀏覽器映像檔：

```bash
scripts/sandbox-browser-setup.sh
```

這會使用
`Dockerfile.sandbox-browser` 來建構 `openclaw-sandbox-browser:bookworm-slim`。容器會執行已啟用 CDP 的 Chromium
以及選用的 noVNC 觀察器（透過 Xvfb 的有介面模式）。

備註：

- Docker 和其他無介面/容器瀏覽器流程仍維持使用原始 CDP。Chrome MCP `existing-session` 適用於本機 Chrome，而非容器接管。
- 與無介面模式相比，有介面模式（Xvfb）可減少被封鎖的情況。
- 仍可以透過設定 `agents.defaults.sandbox.browser.headless=true` 來使用無介面模式。
- 不需要完整的桌面環境（GNOME）；Xvfb 會提供顯示功能。
- 瀏覽器容器預設會使用專屬的 Docker 網路（`openclaw-sandbox-browser`），而非全域的 `bridge`。
- 選用的 `agents.defaults.sandbox.browser.cdpSourceRange` 可透過 CIDR 限制容器邊緣的 CDP 入站流量（例如 `172.21.0.1/32`）。
- noVNC 觀察器存取預設受密碼保護；OpenClaw 提供一個短期的觀察器權杖 URL，該 URL 會提供本機引導頁面，並將密碼保留在 URL 片段（而非 URL 查詢參數）中。
- 瀏覽器容器啟動預設值對於共用/容器工作負載來說較為保守，包括：
  - `--remote-debugging-address=127.0.0.1`
  - `--remote-debugging-port=<derived from OPENCLAW_BROWSER_CDP_PORT>`
  - `--user-data-dir=${HOME}/.chrome`
  - `--no-first-run`
  - `--no-default-browser-check`
  - `--disable-3d-apis`
  - `--disable-software-rasterizer`
  - `--disable-gpu`
  - `--disable-dev-shm-usage`
  - `--disable-background-networking`
  - `--disable-features=TranslateUI`
  - `--disable-breakpad`
  - `--disable-crash-reporter`
  - `--metrics-recording-only`
  - `--renderer-process-limit=2`
  - `--no-zygote`
  - `--disable-extensions`
  - 如果設定了 `agents.defaults.sandbox.browser.noSandbox`，也會附加 `--no-sandbox` 和
    `--disable-setuid-sandbox`。
  - 上述三個圖形硬化旗標是可選的。如果您的工作負載需要
    WebGL/3D，請設定 `OPENCLAW_BROWSER_DISABLE_GRAPHICS_FLAGS=0` 以在沒有
    `--disable-3d-apis`、`--disable-software-rasterizer` 和 `--disable-gpu` 的情況下執行。
  - 擴充功能行為由 `--disable-extensions` 控制，並且可以透過 `OPENCLAW_BROWSER_DISABLE_EXTENSIONS=0` 停用
    (啟用擴充功能)，以用於依賴擴充功能的頁面或重度依賴擴充功能的工作流程。
  - `--renderer-process-limit=2` 也可以使用
    `OPENCLAW_BROWSER_RENDERER_PROCESS_LIMIT` 進行設定；當瀏覽器並行處理需要調整時，請設定 `0` 以讓 Chromium 選擇其
    預設的程序限制。

預設值在隨附的映像檔中預設會被套用。如果您需要不同的
Chromium 旗標，請使用自訂瀏覽器映像檔並提供您自己的進入點。

使用組態：

```json5
{
  agents: {
    defaults: {
      sandbox: {
        browser: { enabled: true },
      },
    },
  },
}
```

自訂瀏覽器映像檔：

```json5
{
  agents: {
    defaults: {
      sandbox: { browser: { image: "my-openclaw-browser" } },
    },
  },
}
```

啟用時，代理程式會收到：

- 沙盒瀏覽器控制 URL (用於 `browser` 工具)
- noVNC URL (如果已啟用且 headless=false)

請記住：如果您對工具使用允許清單，請新增 `browser` (並將其從
deny 中移除)，否則該工具將保持被封鎖狀態。
修剪規則 (`agents.defaults.sandbox.prune`) 也適用於瀏覽器容器。

### 自訂沙盒映像檔

建立您自己的映像檔並將組態指向它：

```bash
docker build -t my-openclaw-sbx -f Dockerfile.sandbox .
```

```json5
{
  agents: {
    defaults: {
      sandbox: { docker: { image: "my-openclaw-sbx" } },
    },
  },
}
```

### 工具原則 (允許/拒絕)

- `deny` 優先於 `allow`。
- 如果 `allow` 為空：所有工具（除了 deny）皆可用。
- 如果 `allow` 非空：僅 `allow` 中的工具可用（扣除 deny）。

### 清理策略

兩個控制選項：

- `prune.idleHours`：移除 X 小時內未使用的容器（0 = 停用）
- `prune.maxAgeDays`：移除超過 X 天的容器（0 = 停用）

範例：

- 保留忙碌的 Session 但限制存留時間：
  `idleHours: 24`, `maxAgeDays: 7`
- 永不清理：
  `idleHours: 0`, `maxAgeDays: 0`

### 安全性說明

- 嚴格隔離牆僅適用於**工具**（exec/read/write/edit/apply_patch）。
- 僅限主機的工具（如 browser/camera/canvas）預設為封鎖。
- 在沙箱中允許 `browser` 會**破壞隔離性**（瀏覽器將在主機上執行）。

## 疑難排解

- 映像檔遺失：使用 [`scripts/sandbox-setup.sh`](https://github.com/openclaw/openclaw/blob/main/scripts/sandbox-setup.sh) 建置，或設定 `agents.defaults.sandbox.docker.image`。
- 容器未執行：它將會依需求在每個 Session 中自動建立。
- 沙箱中的權限錯誤：將 `docker.user` 設定為符合您
  掛載工作區所有權的 UID:GID（或對工作區資料夾執行 chown）。
- 找不到自訂工具：OpenClaw 使用 `sh -lc`（登入 shell）執行指令，這會
  載入 `/etc/profile` 且可能重設 PATH。設定 `docker.env.PATH` 以加入您的
  自訂工具路徑（例如 `/custom/bin:/usr/local/share/npm-global/bin`），或在您的 Dockerfile 中
  於 `/etc/profile.d/` 下新增腳本。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
