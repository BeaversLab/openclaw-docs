---
summary: "使用 Podman 和 Caddy 在 EasyRunner 上執行 OpenClaw Gateway"
read_when:
  - Deploying OpenClaw on EasyRunner
  - Running the Gateway behind EasyRunner's Caddy proxy
  - Choosing persistent volumes and auth for a hosted Gateway
title: "EasyRunner"
---

EasyRunner 可以將 OpenClaw Gateway 託管為其 Caddy 代理後端的小型容器化應用程式。本指南假設 EasyRunner 主機執行與 Podman 相容的 Compose 應用程式，並透過 Caddy 公開 HTTPS。

## 開始之前

- 一台已設定域名路由的 EasyRunner 伺服器。
- 一個已建置或發佈的 OpenClau 容器映像檔。
- 一個用於 `/home/node/.openclaw` 的持久化設定磁碟區。
- 一個用於 `/workspace` 的持久化工作區磁碟區。
- 一個強大的 Gateway 權杖或密碼。

盡可能保持裝置驗證啟用。如果您的反向代理部署無法正確傳遞裝置身分，請先修復 trusted-proxy 設定；僅在完全私有的、由操作員控制的網路中使用危險的驗證繞過方式。

## Compose 應用程式

建立一個 EasyRunner 應用程式，其 Compose 檔案格式如下：

```yaml
services:
  openclaw:
    image: ghcr.io/openclaw/openclaw:latest
    restart: unless-stopped
    environment:
      OPENCLAW_GATEWAY_TOKEN: ${OPENCLAW_GATEWAY_TOKEN}
      OPENCLAW_HOME: /home/node
      OPENCLAW_STATE_DIR: /home/node/.openclaw
      OPENCLAW_CONFIG_PATH: /home/node/.openclaw/openclaw.json
      OPENCLAW_WORKSPACE_DIR: /workspace
    volumes:
      - openclaw-config:/home/node/.openclaw
      - openclaw-workspace:/workspace
    labels:
      caddy: openclaw.example.com
      caddy.reverse_proxy: "{{upstreams 1455}}"
    command: ["openclaw", "gateway", "--bind", "lan", "--port", "1455"]

volumes:
  openclaw-config:
  openclaw-workspace:
```

將 `openclaw.example.com` 替換為您的 Gateway 主機名稱。請將 `OPENCLAW_GATEWAY_TOKEN` 儲存在 EasyRunner 的密鑰/環境管理員中，而不是將其提交到應用程式定義中。

## 設定 OpenClaw

在持久化設定磁碟區內，確保 Gateway 僅能透過 proxy 存取，並要求驗證：

```json5
{
  gateway: {
    bind: "lan",
    port: 1455,
    auth: {
      token: "${OPENCLAW_GATEWAY_TOKEN}",
    },
  },
}
```

如果 Caddy 為 Gateway 終止 TLS，請針對確切的 proxy 路徑設定 trusted proxy 設定，而不是全域停用驗證檢查。請參閱[受信任的代理驗證](/zh-Hant/gateway/trusted-proxy-auth)。

## 驗證

從您的工作站：

```bash
openclaw gateway probe --url https://openclaw.example.com --token <token>
openclaw gateway status --url https://openclaw.example.com --token <token>
```

從 EasyRunner 主機，檢查應用程式日誌以確認 Gateway 正在監聽，且沒有啟動時的 SecretRef、外掛或通道驗證失敗。

## 更新與備份

- 提取或建置新的 OpenClaw 映像檔，然後重新部署 EasyRunner 應用程式。
- 在更新之前備份 `openclaw-config` 磁碟區。
- 如果代理程式在那裡寫入持久的專案資料，請備份 `openclaw-workspace`。
- 在主要更新後執行 `openclaw doctor` 以發現設定遷移和服務警告。

## 疑難排解

- `gateway probe` 無法連線：確認 Caddy 主機名稱指向應用程式，且容器正在監聽 `0.0.0.0:1455`。
- 驗證失敗：請同時在 EasyRunner 密鑰和本機用戶端指令中輪替權杖。
- 還原後檔案為 root 所擁有：修復已掛載的磁碟區，以便容器使用者能夠寫入 `/home/node/.openclaw` 和 `/workspace`。
- 瀏覽器或通道外掛程式失敗：請檢查容器內部是否有所需的外部二進位檔、網路出口以及已掛載的認證資訊。
