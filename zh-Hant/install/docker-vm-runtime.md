---
summary: "長期運作的 OpenClaw Gateway 主機的共用 Docker VM 執行階段步驟"
read_when:
  - 您正在雲端 VM 上透過 Docker 部署 OpenClaw
  - 您需要共用的二進位檔建置、持久性與更新流程
title: "Docker VM Runtime"
---

# Docker VM Runtime

適用於基於 VM 的 Docker 安裝（例如 GCP、Hetzner 和類似的 VPS 提供商）的共用執行階段步驟。

## 將必要的二進位檔建置至映像檔中

在執行中的容器內安裝二進位檔是一個陷阱。
任何在執行階段安裝的項目都會在重啟後遺失。

技能所需的所有外部二進位檔必須在建置映像檔時安裝。

下方的範例僅顯示三種常見的二進位檔：

- `gog` 用於 Gmail 存取
- `goplaces` 用於 Google Places
- `wacli` 用於 WhatsApp

這些只是範例，並非完整清單。
您可以使用相同的模式安裝所需數量的二進位檔。

如果您之後新增依賴其他二進位檔的技能，您必須：

1. 更新 Dockerfile
2. 重新建置映像檔
3. 重新啟動容器

**Dockerfile 範例**

```dockerfile
FROM node:24-bookworm

RUN apt-get update && apt-get install -y socat && rm -rf /var/lib/apt/lists/*

# Example binary 1: Gmail CLI
RUN curl -L https://github.com/steipete/gog/releases/latest/download/gog_Linux_x86_64.tar.gz \
  | tar -xz -C /usr/local/bin && chmod +x /usr/local/bin/gog

# Example binary 2: Google Places CLI
RUN curl -L https://github.com/steipete/goplaces/releases/latest/download/goplaces_Linux_x86_64.tar.gz \
  | tar -xz -C /usr/local/bin && chmod +x /usr/local/bin/goplaces

# Example binary 3: WhatsApp CLI
RUN curl -L https://github.com/steipete/wacli/releases/latest/download/wacli_Linux_x86_64.tar.gz \
  | tar -xz -C /usr/local/bin && chmod +x /usr/local/bin/wacli

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

## 建置與啟動

```bash
docker compose build
docker compose up -d openclaw-gateway
```

如果在 `pnpm install --frozen-lockfile` 期間建置失敗並出現 `Killed` 或 `exit code 137`，表示 VM 記憶體不足。
重試前請使用較大等級的機器。

驗證二進位檔：

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

## 什麼資料會持久化以及存在哪裡

OpenClaw 在 Docker 中執行，但 Docker 並非真實來源。
所有長期狀態必須在重啟、重新建置和重新開機後保留。

| 元件           | 位置                          | 持久化機制  | 備註                            |
| ------------------- | --------------------------------- | ---------------------- | -------------------------------- |
| Gateway 設定      | `/home/node/.openclaw/`           | 主機掛載卷      | 包含 `openclaw.json`、權杖 |
| 模型驗證設定檔 | `/home/node/.openclaw/`           | 主機掛載卷      | OAuth 權杖、API 金鑰           |
| 技能設定       | `/home/node/.openclaw/skills/`    | 主機掛載卷      | 技能層級狀態                |
| 代理程式工作區     | `/home/node/.openclaw/workspace/` | 主機掛載卷      | 程式碼與代理程式人工產物         |
| WhatsApp 工作階段    | `/home/node/.openclaw/`           | 主機掛載卷      | 保留 QR 登入               |
| Gmail 鑰匙圈       | `/home/node/.openclaw/`           | 主機掛載卷 + 密碼 | 需要 `GOG_KEYRING_PASSWORD`  |
| 外部二進位檔   | `/usr/local/bin/`                 | Docker 映像檔           | 必須在建置時建置      |
| Node 執行階段        | 容器檔案系統              | Docker 映像檔           | 每次建構映像檔時重建        |
| 作業系統套件         | 容器檔案系統              | Docker 映像檔           | 請勿在執行時期安裝        |
| Docker 容器    | 暫時性                         | 可重新啟動            | 可安全刪除                  |

## 更新

若要更新 VM 上的 OpenClaw：

```bash
git pull
docker compose build
docker compose up -d
```

import en from "/components/footer/en.mdx";

<en />
