---
summary: "長期運行的 OpenClaw Gateway 主機的共用 Docker VM 執行階段步驟"
read_when:
  - You are deploying OpenClaw on a cloud VM with Docker
  - You need the shared binary bake, persistence, and update flow
title: "Docker VM runtime"
---

適用於 GCP、Hetzner 和類似 VPS 提供商等基於 VM 的 Docker 安裝的共享執行時步驟。

## 將所需的二進位檔案內建於映像檔中

在運行中的容器內安裝二進位檔案是一個陷阱。
任何在執行時安裝的內容都會在重啟後遺失。

Skills 所需的所有外部二進位檔案都必須在映像檔建置期間安裝。

以下範例僅顯示三種常見的二進位檔案：

- `gog` (來自 `gogcli`) 用於 Gmail 存取
- `goplaces` 用於 Google Places
- `wacli` 用於 WhatsApp

這些只是範例，並非完整清單。
您可以使用相同的模式安裝任意數量的二進位檔案。

如果您稍後新增依賴其他二進位檔案的新 skills，您必須：

1. 更新 Dockerfile
2. 重新建置映像檔
3. 重新啟動容器

**Dockerfile 範例**

```dockerfile
FROM node:24-bookworm

RUN apt-get update && apt-get install -y socat && rm -rf /var/lib/apt/lists/*

# Example binary 1: Gmail CLI (gogcli — installs as `gog`)
# Copy the current Linux asset URL from https://github.com/steipete/gogcli/releases
RUN curl -L https://github.com/steipete/gogcli/releases/latest/download/gogcli_linux_amd64.tar.gz \
  | tar -xzO gog > /usr/local/bin/gog; \
  chmod +x /usr/local/bin/gog

# Example binary 2: Google Places CLI
# Copy the current Linux asset URL from https://github.com/steipete/goplaces/releases
RUN curl -L https://github.com/steipete/goplaces/releases/latest/download/goplaces_linux_amd64.tar.gz \
  | tar -xzO goplaces > /usr/local/bin/goplaces; \
  chmod +x /usr/local/bin/goplaces

# Example binary 3: WhatsApp CLI
# Copy the current Linux asset URL from https://github.com/steipete/wacli/releases
RUN curl -L https://github.com/steipete/wacli/releases/latest/download/wacli-linux-amd64.tar.gz \
  | tar -xzO wacli > /usr/local/bin/wacli; \
  chmod +x /usr/local/bin/wacli

# Add more binaries below using the same pattern

WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY ui/package.json ./ui/package.json
COPY scripts ./scripts

RUN corepack enable
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build
RUN pnpm ui:install
RUN pnpm ui:build

ENV NODE_ENV=production

CMD ["node","dist/index.js"]
```

<Note>上述 URL 僅為範例。對於基於 ARM 的 VM，請選擇 `arm64` 資產。為了可重複的構建，請固定版本發佈的 URL。</Note>

## 建置與啟動

```bash
docker compose build
docker compose up -d openclaw-gateway
```

如果在 `pnpm install --frozen-lockfile` 期間因 `Killed` 或 `exit code 137` 而構建失敗，則表示 VM 記憶體不足。
重試前請使用更大的機器類型。

驗證二進位檔案：

```bash
docker compose exec openclaw-gateway which gog
docker compose exec openclaw-gateway which goplaces
docker compose exec openclaw-gateway which wacli
```

預期輸出：

```
/usr/local/bin/gog
/usr/local/bin/goplaces
/usr/local/bin/wacli
```

驗證 Gateway：

```bash
docker compose logs -f openclaw-gateway
```

預期輸出：

```
[gateway] listening on ws://0.0.0.0:18789
```

## 持久化位置與機制

OpenClaw 在 Docker 中運行，但 Docker 並非單一真實來源。
所有長期存在的狀態都必須在重啟、重建和重新啟動後保留。

| 組件           | 位置                                                   | 持久化機制        | 備註                                                          |
| -------------- | ------------------------------------------------------ | ----------------- | ------------------------------------------------------------- |
| Gateway 設定   | `/home/node/.openclaw/`                                | 主機磁碟區掛載    | 包含 `openclaw.json`, `.env`                                  |
| 模型授權設定檔 | `/home/node/.openclaw/agents/`                         | 主機磁碟區掛載    | `agents/<agentId>/agent/auth-profiles.json` (OAuth, API 金鑰) |
| Skill 設定     | `/home/node/.openclaw/skills/`                         | 主機磁碟區掛載    | Skill 層級狀態                                                |
| Agent 工作區   | `/home/node/.openclaw/workspace/`                      | 主機磁碟區掛載    | 程式碼和 agent 產生件                                         |
| WhatsApp 會話  | `/home/node/.openclaw/`                                | 主機磁碟區掛載    | 保留 QR 登入                                                  |
| Gmail 鑰匙圈   | `/home/node/.openclaw/`                                | 主機磁碟區 + 密碼 | 需要 `GOG_KEYRING_PASSWORD`                                   |
| 外掛程式套件   | `/home/node/.openclaw/npm`, `/home/node/.openclaw/git` | 主機磁碟區掛載    | 可下載的外掛程式套件根目錄                                    |
| 外部二進位檔案 | `/usr/local/bin/`                                      | Docker 映像檔     | 必須在建置時納入                                              |
| Node 執行環境  | 容器檔案系統                                           | Docker 映像檔     | 每次建置映像檔時重新建置                                      |
| OS 套件        | 容器檔案系統                                           | Docker 映像檔     | 請勿在執行時安裝                                              |
| Docker 容器    | 暫時性                                                 | 可重新啟動        | 可安全刪除                                                    |

## 更新

若要更新 VM 上的 OpenClaw：

```bash
git pull
docker compose build
docker compose up -d
```

## 相關

- [Docker](/zh-Hant/install/docker)
- [Podman](/zh-Hant/install/podman)
- [ClawDock](/zh-Hant/install/clawdock)
