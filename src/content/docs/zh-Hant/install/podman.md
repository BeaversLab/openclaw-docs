---
summary: "在無 root 權限的 Podman 容器中執行 OpenClaw"
read_when:
  - You want a containerized gateway with Podman instead of Docker
title: "Podman"
---

# Podman

在無特權 Podman 容器中執行 OpenClaw Gateway，由您目前的非 root 使用者管理。

預期的模式是：

- Podman 執行閘道容器。
- 您的主機 `openclaw` CLI 是控制平面。
- 持久狀態預設儲存在主機的 `~/.openclaw` 下。
- 日常管理使用 `openclaw --container <name> ...` 而非 `sudo -u openclaw`、`podman exec` 或獨立的服務使用者。

## 先決條件

- **Podman** 處於無特權模式
- 主機上已安裝 **OpenClaw CLI**
- **可選：** 如果您想要由 Quadlet 管理的自動啟動，請安裝 `systemd --user`
- **可選：** 僅當您在無介面主機上需要 `loginctl enable-linger "$(whoami)"` 以實現開機持久化時，才安裝 `sudo`

## 快速開始

<Steps>
  <Step title="一次性設定">
    從 repo 根目錄執行 `./scripts/podman/setup.sh`。
  </Step>

<Step title="啟動 Gateway 容器">使用 `./scripts/run-openclaw-podman.sh launch` 啟動容器。</Step>

<Step title="在容器內執行入門設定">執行 `./scripts/run-openclaw-podman.sh launch setup`，然後開啟 `http://127.0.0.1:18789/`。</Step>

  <Step title="從主機 CLI 管理執行中的容器">
    設定 `OPENCLAW_CONTAINER=openclaw`，然後從主機使用一般的 `openclaw` 指令。
  </Step>
</Steps>

設定詳情：

- `./scripts/podman/setup.sh` 預設會在您的無 root 權限 Podman 儲存庫中建構 `openclaw:local`，或者如果您設定了 `OPENCLAW_IMAGE` / `OPENCLAW_PODMAN_IMAGE`，則會使用該設定。
- 如果不存在，它會使用 `gateway.mode: "local"` 建立 `~/.openclaw/openclaw.json`。
- 如果不存在，它會使用 `OPENCLAW_GATEWAY_TOKEN` 建立 `~/.openclaw/.env`。
- 對於手動啟動，輔助腳本僅從 `~/.openclaw/.env` 讀取一小部分與 Podman 相關的鍵值，並將明確的執行時環境變數傳遞給容器；它不會將完整的環境檔案交給 Podman。

由 Quadlet 管理的設定：

```bash
./scripts/podman/setup.sh --quadlet
```

Quadlet 僅適用於 Linux，因為它依賴 systemd 使用者服務。

您也可以設定 `OPENCLAW_PODMAN_QUADLET=1`。

可選的建置/設定環境變量：

- `OPENCLAW_IMAGE` 或 `OPENCLAW_PODMAN_IMAGE` —— 使用現有的/拉取的映像檔而不是建構 `openclaw:local`
- `OPENCLAW_DOCKER_APT_PACKAGES` —— 在建構映像檔期間安裝額外的 apt 套件
- `OPENCLAW_EXTENSIONS` —— 在建構時預先安裝擴充功能相依項

容器啟動：

```bash
./scripts/run-openclaw-podman.sh launch
```

該腳本會使用 `--userns=keep-id` 以您目前的 uid/gid 啟動容器，並將您的 OpenClaw 狀態綁定掛載到容器中。

入門：

```bash
./scripts/run-openclaw-podman.sh launch setup
```

然後開啟 `http://127.0.0.1:18789/` 並使用來自 `~/.openclaw/.env` 的令牌。

主機 CLI 預設值：

```bash
export OPENCLAW_CONTAINER=openclaw
```

然後，諸如此類的指令將自動在該容器內執行：

```bash
openclaw dashboard --no-open
openclaw gateway status --deep   # includes extra service scan
openclaw doctor
openclaw channels login
```

在 macOS 上，Podman machine 可能會讓瀏覽器對閘道而言顯示為非本機。
如果啟動後控制 UI 回報裝置驗證錯誤，請使用
[Podman + Tailscale](#podman--tailscale) 中的 Tailscale 指引。

<a id="podman--tailscale"></a>

## Podman + Tailscale

對於 HTTPS 或遠端瀏覽器存取，請遵循主要的 Tailscale 文件。

Podman 特定說明：

- 請將 Podman 發布主機保持在 `127.0.0.1`。
- 優先使用主機管理的 `tailscale serve` 而非 `openclaw gateway --tailscale serve`。
- 在 macOS 上，如果本機瀏覽器的裝置驗證內容不可靠，請使用 Tailscale 存取，而非臨時的本機隧道變通方法。

參閱：

- [Tailscale](/zh-Hant/gateway/tailscale)
- [Control UI](/zh-Hant/web/control-ui)

## Systemd (Quadlet，可選)

如果您執行了 `./scripts/podman/setup.sh --quadlet`，安裝程式會將 Quadlet 檔案安裝在：

```bash
~/.config/containers/systemd/openclaw.container
```

實用指令：

- **啟動：** `systemctl --user start openclaw.service`
- **停止：** `systemctl --user stop openclaw.service`
- **狀態：** `systemctl --user status openclaw.service`
- **日誌：** `journalctl --user -u openclaw.service -f`

編輯 Quadlet 檔案後：

```bash
systemctl --user daemon-reload
systemctl --user restart openclaw.service
```

為了在 SSH/無主機主機上開機持續運行，請為您目前的使用者啟用駐留功能：

```bash
sudo loginctl enable-linger "$(whoami)"
```

## 組態、環境和儲存空間

- **組態目錄：** `~/.openclaw`
- **工作區目錄：** `~/.openclaw/workspace`
- **令牌檔案：** `~/.openclaw/.env`
- **啟動輔助程式：** `./scripts/run-openclaw-podman.sh`

啟動腳本和 Quadlet 將主機狀態綁定掛載到容器中：

- `OPENCLAW_CONFIG_DIR` -> `/home/node/.openclaw`
- `OPENCLAW_WORKSPACE_DIR` -> `/home/node/.openclaw/workspace`

預設情況下，這些是主機目錄，而非匿名容器狀態，因此
`openclaw.json`、每個代理程式的 `auth-profiles.json`、通道/提供者狀態、
工作階段和工作區皆可在容器更換後保留。
Podman 設定還會為發布的閘道埠上的 `127.0.0.1` 和 `localhost` 預先設定 `gateway.controlUi.allowedOrigins`，以便本地儀表板能與容器的非回環綁定配合運作。

手動啟動器的實用環境變數：

- `OPENCLAW_PODMAN_CONTAINER` -- 容器名稱 (預設為 `openclaw`)
- `OPENCLAW_PODMAN_IMAGE` / `OPENCLAW_IMAGE` -- 要執行的映像檔
- `OPENCLAW_PODMAN_GATEWAY_HOST_PORT` -- 對應到容器 `18789` 的主機埠
- `OPENCLAW_PODMAN_BRIDGE_HOST_PORT` -- 對應到容器 `18790` 的主機埠
- `OPENCLAW_PODMAN_PUBLISH_HOST` -- 發布埠的主機介面；預設為 `127.0.0.1`
- `OPENCLAW_GATEWAY_BIND` -- 容器內的閘道綁定模式；預設為 `lan`
- `OPENCLAW_PODMAN_USERNS` -- `keep-id` (預設)、`auto` 或 `host`

手動啟動器會在最終確定容器/映像預設值之前讀取 `~/.openclaw/.env`，因此您可以將設定保存在該處。

如果您使用非預設的 `OPENCLAW_CONFIG_DIR` 或 `OPENCLAW_WORKSPACE_DIR`，請同時為 `./scripts/podman/setup.sh` 和後續的 `./scripts/run-openclaw-podman.sh launch` 指令設定相同的變數。存放庫本機啟動器不會在 shell 之間保留自訂路徑覆寫。

Quadlet 說明：

- 產生的 Quadlet 服務有意保持固定、強化的預設形態：`127.0.0.1` 發布埠、容器內的 `--bind lan`，以及 `keep-id` 使用者命名空間。
- 它會固定 `OPENCLAW_NO_RESPAWN=1`、`Restart=on-failure` 和 `TimeoutStartSec=300`。
- 它會同時發布 `127.0.0.1:18789:18789` (閘道) 和 `127.0.0.1:18790:18790` (橋接器)。
- 它將 `~/.openclaw/.env` 讀取為諸如 `OPENCLAW_GATEWAY_TOKEN` 等值的運行時 `EnvironmentFile`，但它不使用手動啟動器的 Podman 特定覆寫允許清單。
- 如果您需要自訂發佈連接埠、發佈主機或其他容器執行標誌，請使用手動啟動器或直接編輯 `~/.config/containers/systemd/openclaw.container`，然後重新載入並重啟服務。

## 常用指令

- **容器日誌：** `podman logs -f openclaw`
- **停止容器：** `podman stop openclaw`
- **移除容器：** `podman rm -f openclaw`
- **從主機 CLI 開啟儀表板 URL：** `openclaw dashboard --no-open`
- **透過主機 CLI 檢查健康狀態/狀態：** `openclaw gateway status --deep` (RPC 探測 + 額外服務掃描)

## 疑難排解

- **設定或工作區的權限被拒 (EACCES)：** 預設情況下，容器以 `--userns=keep-id` 和 `--user <your uid>:<your gid>` 運行。請確保主機上的設定/工作區路徑由您目前的用戶所擁有。
- **閘道器啟動受阻 (缺少 `gateway.mode=local`)：** 確保 `~/.openclaw/openclaw.json` 存在並設定了 `gateway.mode="local"`。`scripts/podman/setup.sh` 會在缺少時建立此檔案。
- **容器 CLI 指令作用於錯誤的目標：** 請明確使用 `openclaw --container <name> ...`，或在您的 shell 中匯出 `OPENCLAW_CONTAINER=<name>`。
- **`openclaw update` 失敗並顯示 `--container`：** 這是預期的行為。請重新建置/拉取映像檔，然後重新啟動容器或 Quadlet 服務。
- **Quadlet 服務無法啟動：** 執行 `systemctl --user daemon-reload`，然後執行 `systemctl --user start openclaw.service`。在無頭系統 上，您可能還需要 `sudo loginctl enable-linger "$(whoami)"`。
- **SELinux 阻止 bind 掛載：** 請勿修改預設的掛載行為；當 SELinux 處於 Enforcing 或 Permissive 模式時，啟動器會在 Linux 上自動新增 `:Z`。

## 相關

- [Docker](/zh-Hant/install/docker)
- [閘道器背景程序](/zh-Hant/gateway/background-process)
- [閘道器疑難排解](/zh-Hant/gateway/troubleshooting)
