---
summary: "在無 root 權限的 Podman 容器中執行 OpenClaw"
read_when:
  - You want a containerized gateway with Podman instead of Docker
title: "Podman"
---

在無根 Podman 容器中運行 OpenClaw Gateway，由您目前的非 root 使用者管理。

預期的模型是：

- Podman 運行 gateway 容器。
- 您主機上的 `openclaw` CLI 即為控制平面。
- 持久狀態預設儲存在主機的 `~/.openclaw` 下。
- 日常管理使用 `openclaw --container <name> ...`，而不是 `sudo -u openclaw`、`podman exec` 或單獨的服務使用者。

## 先決條件

- **Podman** 處於無根模式
- 主機上安裝了 **OpenClaw CLI**
- **可選：** 如果您需要 Quadlet 管理的自動啟動，請安裝 `systemd --user`
- **可選：** 僅當您需要在無頭主機上實現開機持續時，才需要 `loginctl enable-linger "$(whoami)"` 的 `sudo`

## 快速開始

<Steps>
  <Step title="一次性設定">
    從 repo 根目錄執行 `./scripts/podman/setup.sh`。
  </Step>

<Step title="啟動 Gateway 容器">使用 `./scripts/run-openclaw-podman.sh launch` 啟動容器。</Step>

<Step title="在容器內執行入門設定">執行 `./scripts/run-openclaw-podman.sh launch setup`，然後開啟 `http://127.0.0.1:18789/`。</Step>

  <Step title="從主機 CLI 管理正在運行的容器">
    設定 `OPENCLAW_CONTAINER=openclaw`，然後從主機使用正常的 `openclaw` 指令。
  </Step>
</Steps>

設定詳細資訊：

- `./scripts/podman/setup.sh` 預設會在您的無根 Podman 儲存庫中建置 `openclaw:local`，或者如果您設定了一個，則使用 `OPENCLAW_IMAGE` / `OPENCLAW_PODMAN_IMAGE`。
- 如果缺少，它會使用 `gateway.mode: "local"` 建立一個 `~/.openclaw/openclaw.json`。
- 如果缺少，它會使用 `OPENCLAW_GATEWAY_TOKEN` 建立一個 `~/.openclaw/.env`。
- 對於手動啟動，輔助程式僅從 `~/.openclaw/.env` 讀取一小部分與 Podman 相關的允許清單金鑰，並將明確的運行時環境變數傳遞給容器；它不會將完整的環境檔案交給 Podman。

Quadlet 管理的設定：

```bash
./scripts/podman/setup.sh --quadlet
```

Quadlet 僅適用於 Linux，因為它取決於 systemd 使用者服務。

您也可以設定 `OPENCLAW_PODMAN_QUADLET=1`。

可選的建置/設定環境變數：

- `OPENCLAW_IMAGE` 或 `OPENCLAW_PODMAN_IMAGE` -- 使用現有/提取的映像檔，而不建置 `openclaw:local`
- `OPENCLAW_IMAGE_APT_PACKAGES` -- 在映像建置期間安裝額外的 apt 套件（也接受舊版 `OPENCLAW_DOCKER_APT_PACKAGES`）
- `OPENCLAW_IMAGE_PIP_PACKAGES` -- 在建置映像檔期間安裝額外的 Python 套件；鎖定版本並僅使用您信任的套件索引
- `OPENCLAW_EXTENSIONS` -- 在建置時預先安裝外掛相依套件
- `OPENCLAW_INSTALL_BROWSER` -- 為瀏覽器自動化預先安裝 Chromium 和 Xvfb（設為 `1` 以啟用）

容器啟動：

```bash
./scripts/run-openclaw-podman.sh launch
```

該腳本會以您目前的 uid/gid 並透過 `--userns=keep-id` 啟動容器，並將您的 OpenClaw 狀態以 bind-mount 方式掛載至容器中。

入門導覽：

```bash
./scripts/run-openclaw-podman.sh launch setup
```

然後開啟 `http://127.0.0.1:18789/` 並使用來自 `~/.openclaw/.env` 的 token。

主機 CLI 預設值：

```bash
export OPENCLAW_CONTAINER=openclaw
```

然後諸如此類的指令將會自動在該容器內執行：

```bash
openclaw dashboard --no-open
openclaw gateway status --deep   # includes extra service scan
openclaw doctor
openclaw channels login
```

在 macOS 上，Podman machine 可能會導致瀏覽器對閘道而言顯示為非本機。
如果控制 UI 在啟動後回報裝置驗證錯誤，請使用
[Podman 和 Tailscale](#podman--tailscale) 中的 Tailscale 指引。

<a id="podman--tailscale"></a>

## Podman 和 Tailscale

若要進行 HTTPS 或遠端瀏覽器存取，請遵循主要的 Tailscale 文件。

Podman 特別說明：

- 將 Podman 的發布主機維持在 `127.0.0.1`。
- 優先使用主機管理的 `tailscale serve` 而非 `openclaw gateway --tailscale serve`。
- 在 macOS 上，如果本機瀏覽器裝置驗證上下文不可靠，請使用 Tailscale 存取，而非臨時的本機通道變通方案。

請參閱：

- [Tailscale](/zh-Hant/gateway/tailscale)
- [控制 UI](/zh-Hant/web/control-ui)

## Systemd (Quadlet，選用)

如果您執行了 `./scripts/podman/setup.sh --quadlet`，設定會在以下位置安裝一個 Quadlet 檔案：

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

若要在 SSH/無介面主機上開機後持續執行，請為您目前的使用者啟用 linger 功能：

```bash
sudo loginctl enable-linger "$(whoami)"
```

## 設定、環境變數與儲存空間

- **設定目錄：** `~/.openclaw`
- **工作區目錄：** `~/.openclaw/workspace`
- **Token 檔案：** `~/.openclaw/.env`
- **啟動輔助程式：** `./scripts/run-openclaw-podman.sh`

啟動腳本和 Quadlet 會將主機狀態以 bind-mount 方式掛載至容器：

- `OPENCLAW_CONFIG_DIR` -> `/home/node/.openclaw`
- `OPENCLAW_WORKSPACE_DIR` -> `/home/node/.openclaw/workspace`

預設情況下，這些是主機目錄，而非匿名的容器狀態，因此
`openclaw.json`、每個代理程式的 `auth-profiles.json`、通道/提供者狀態、
會話和工作區在容器更換後仍然保留。
Podman 設定也會在發布的閘道埠上為 `127.0.0.1` 和 `localhost` 播種 `gateway.controlUi.allowedOrigins`，以便本機儀表板能夠與容器的非回送綁定搭配使用。

手動啟動器的有用環境變數：

- `OPENCLAW_PODMAN_CONTAINER` -- 容器名稱（預設為 `openclaw`）
- `OPENCLAW_PODMAN_IMAGE` / `OPENCLAW_IMAGE` -- 要執行的映像檔
- `OPENCLAW_PODMAN_GATEWAY_HOST_PORT` -- 對應到容器 `18789` 的主機埠
- `OPENCLAW_PODMAN_BRIDGE_HOST_PORT` -- 對應到容器 `18790` 的主機埠
- `OPENCLAW_PODMAN_PUBLISH_HOST` -- 發布埠的主機介面；預設為 `127.0.0.1`
- `OPENCLAW_GATEWAY_BIND` -- 容器內的閘道綁定模式；預設為 `lan`
- `OPENCLAW_PODMAN_USERNS` -- `keep-id`（預設）、`auto` 或 `host`

手動啟動器在確定容器/映像檔預設值之前會讀取 `~/.openclaw/.env`，因此您可以在那裡保存這些設定。

如果您使用非預設的 `OPENCLAW_CONFIG_DIR` 或 `OPENCLAW_WORKSPACE_DIR`，請為 `./scripts/podman/setup.sh` 和後續的 `./scripts/run-openclaw-podman.sh launch` 指令設定相同的變數。存放庫本機啟動器不會跨 Shell 保存自訂路徑覆寫。

Quadlet 說明：

- 產生的 Quadlet 服務刻意保持固定的、經過強化的預設形態：`127.0.0.1` 發布埠、容器內的 `--bind lan` 以及 `keep-id` 使用者命名空間。
- 它固定 `OPENCLAW_NO_RESPAWN=1`、`Restart=on-failure` 和 `TimeoutStartSec=300`。
- 它會發布 `127.0.0.1:18789:18789` (gateway) 和 `127.0.0.1:18790:18790` (bridge)。
- 它將 `~/.openclaw/.env` 作為運行時 `EnvironmentFile` 來讀取諸如 `OPENCLAW_GATEWAY_TOKEN` 等值，但它不會使用手動啟動器的 Podman 特定覆寫允許列表。
- 如果您需要自訂發布連接埠、發布主機或其他容器執行標誌，請使用手動啟動器或直接編輯 `~/.config/containers/systemd/openclaw.container`，然後重新載入並重新啟動服務。

## 常用指令

- **Container 日誌：** `podman logs -f openclaw`
- **停止容器：** `podman stop openclaw`
- **移除容器：** `podman rm -f openclaw`
- **從主機 CLI 開啟儀表板 URL：** `openclaw dashboard --no-open`
- **透過主機 CLI 檢查健康/狀態：** `openclaw gateway status --deep` (RPC 探測 + 額外
  服務掃描)

## 疑難排解

- **在設定或工作區上權限被拒 (EACCES)：** 容器預設以 `--userns=keep-id` 和 `--user <your uid>:<your gid>` 執行。請確保主機設定/工作區路徑由您目前的用戶擁有。
- **Gateway 啟動受阻 (缺少 `gateway.mode=local`)：** 確保 `~/.openclaw/openclaw.json` 存在並設定了 `gateway.mode="local"`。如果缺少，`scripts/podman/setup.sh` 會建立它。
- **Container CLI 指令錯誤地指向目標：** 明確使用 `openclaw --container <name> ...`，或在您的 shell 中匯出 `OPENCLAW_CONTAINER=<name>`。
- **`openclaw update` 失敗並顯示 `--container`：** 這是預期的。重建/拉取映像，然後重新啟動容器或 Quadlet 服務。
- **Quadlet 服務無法啟動：** 執行 `systemctl --user daemon-reload`，然後執行 `systemctl --user start openclaw.service`。在無頭系統上，您可能還需要 `sudo loginctl enable-linger "$(whoami)"`。
- **SELinux 阻止 bind 掛載：** 請勿變更預設的掛載行為；當 SELinux 處於強制或寬鬆模式時，啟動器會在 Linux 上自動新增 `:Z`。

## 相關

- [Docker](/zh-Hant/install/docker)
- [Gateway 背景程序](/zh-Hant/gateway/background-process)
- [Gateway 疑難排解](/zh-Hant/gateway/troubleshooting)
