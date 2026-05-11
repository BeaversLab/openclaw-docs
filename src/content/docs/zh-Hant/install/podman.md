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
- `OPENCLAW_DOCKER_APT_PACKAGES` -- 在映像檔建置期間安裝額外的 apt 套件
- `OPENCLAW_EXTENSIONS` -- 在建置時預先安裝外掛程式相依項

容器啟動：

```bash
./scripts/run-openclaw-podman.sh launch
```

該腳本會以您目前的 uid/gid 使用 `--userns=keep-id` 來啟動容器，並將您的 OpenClaw 狀態綁定掛載至容器中。

入門指引：

```bash
./scripts/run-openclaw-podman.sh launch setup
```

然後開啟 `http://127.0.0.1:18789/` 並使用來自 `~/.openclaw/.env` 的權杖。

主機 CLI 預設：

```bash
export OPENCLAW_CONTAINER=openclaw
```

然後，諸如此類的指令將會自動在該容器內執行：

```bash
openclaw dashboard --no-open
openclaw gateway status --deep   # includes extra service scan
openclaw doctor
openclaw channels login
```

在 macOS 上，Podman 機器可能會導致瀏覽器對閘道而言顯示為非本機。
如果控制 UI 在啟動後回報裝置驗證錯誤，請使用
[Podman + Tailscale](#podman--tailscale) 中的 Tailscale 指引。

<a id="podman--tailscale"></a>

## Podman + Tailscale

若要使用 HTTPS 或遠端瀏覽器存取，請遵循主要的 Tailscale 文件。

Podman 專屬說明：

- 請將 Podman 發布主機保持在 `127.0.0.1`。
- 優先使用主機管理的 `tailscale serve` 而非 `openclaw gateway --tailscale serve`。
- 在 macOS 上，如果本機瀏覽器裝置驗證內容不可靠，請使用 Tailscale 存取，而非臨時的本機通道解決方案。

參閱：

- [Tailscale](/zh-Hant/gateway/tailscale)
- [控制 UI](/zh-Hant/web/control-ui)

## Systemd (Quadlet，可選)

如果您執行了 `./scripts/podman/setup.sh --quadlet`，設定會在以下位置安裝 Quadlet 檔案：

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

若要在 SSH/無介面主機上實現開機持續性，請為您目前的使用者啟用長期保留：

```bash
sudo loginctl enable-linger "$(whoami)"
```

## 設定、環境變數和儲存空間

- **設定目錄：** `~/.openclaw`
- **工作區目錄：** `~/.openclaw/workspace`
- **權杖檔案：** `~/.openclaw/.env`
- **啟動輔助程式：** `./scripts/run-openclaw-podman.sh`

啟動腳本和 Quadlet 會將主機狀態綁定掛載至容器中：

- `OPENCLAW_CONFIG_DIR` -> `/home/node/.openclaw`
- `OPENCLAW_WORKSPACE_DIR` -> `/home/node/.openclaw/workspace`

預設情況下，這些是主機目錄，而非匿名容器狀態，因此
`openclaw.json`、每個代理的 `auth-profiles.json`、通道/提供者狀態、
工作階段和工作區在容器更換後會繼續存在。
Podman 設定還會為已發布的閘道埠上的 `127.0.0.1` 和 `localhost` 播種 `gateway.controlUi.allowedOrigins`，以便本地儀表板能與容器的非迴路綁定配合運作。

手動啟動器的有用環境變數：

- `OPENCLAW_PODMAN_CONTAINER` -- 容器名稱（預設為 `openclaw`）
- `OPENCLAW_PODMAN_IMAGE` / `OPENCLAW_IMAGE` -- 要執行的映像檔
- `OPENCLAW_PODMAN_GATEWAY_HOST_PORT` -- 對應到容器 `18789` 的主機連接埠
- `OPENCLAW_PODMAN_BRIDGE_HOST_PORT` -- 對應到容器 `18790` 的主機連接埠
- `OPENCLAW_PODMAN_PUBLISH_HOST` -- 已發布連接埠的主機介面；預設為 `127.0.0.1`
- `OPENCLAW_GATEWAY_BIND` -- 容器內的閘道綁定模式；預設為 `lan`
- `OPENCLAW_PODMAN_USERNS` -- `keep-id`（預設）、`auto` 或 `host`

手動啟動器會在確定容器/映像檔預設值之前讀取 `~/.openclaw/.env`，因此您可以將這些設定保存在那裡。

如果您使用非預設的 `OPENCLAW_CONFIG_DIR` 或 `OPENCLAW_WORKSPACE_DIR`，請為 `./scripts/podman/setup.sh` 和後續的 `./scripts/run-openclaw-podman.sh launch` 指令設定相同的變數。存放庫本地的啟動器不會在不同的 shell 之間保存自訂路徑覆寫。

Quadlet 說明：

- 產生的 Quadlet 服務刻意保持固定的、強化的預設形狀：`127.0.0.1` 已發布連接埠、容器內的 `--bind lan`，以及 `keep-id` 使用者命名空間。
- 它固定了 `OPENCLAW_NO_RESPAWN=1`、`Restart=on-failure` 和 `TimeoutStartSec=300`。
- 它會發布 `127.0.0.1:18789:18789` (gateway) 和 `127.0.0.1:18790:18790` (bridge)。
- 它讀取 `~/.openclaw/.env` 作為執行時 `EnvironmentFile` 以獲取諸如 `OPENCLAW_GATEWAY_TOKEN` 等數值，但它不會使用手動啟動器中 Podman 特定的覆寫允許清單。
- 如果您需要自訂發布埠、發布主機或其他容器執行標誌，請使用手動啟動器或直接編輯 `~/.config/containers/systemd/openclaw.container`，然後重新載入並重啟服務。

## 實用指令

- **容器日誌：** `podman logs -f openclaw`
- **停止容器：** `podman stop openclaw`
- **移除容器：** `podman rm -f openclaw`
- **從主機 CLI 開啟儀表板 URL：** `openclaw dashboard --no-open`
- **透過主機 CLI 檢查健康/狀態：** `openclaw gateway status --deep` (RPC 探測 + 額外的
  服務掃描)

## 疑難排解

- **在設定或工作區上出現權限拒絕 (EACCES)：** 容器預設以 `--userns=keep-id` 和 `--user <your uid>:<your gid>` 執行。請確保主機設定/工作區路徑由您目前的使用者所擁有。
- **Gateway 啟動受阻 (缺少 `gateway.mode=local`)：** 確保 `~/.openclaw/openclaw.json` 存在並設定了 `gateway.mode="local"`。`scripts/podman/setup.sh` 會在缺少時建立此檔案。
- **容器 CLI 指令作用於錯誤的目標：** 請明確使用 `openclaw --container <name> ...`，或在您的 shell 中匯出 `OPENCLAW_CONTAINER=<name>`。
- **`openclaw update` 失敗並出現 `--container`：** 這是預期的行為。請重新建置/拉取映像檔，然後重啟容器或 Quadlet 服務。
- **Quadlet 服務無法啟動：** 請執行 `systemctl --user daemon-reload`，然後執行 `systemctl --user start openclaw.service`。在無介面系統上，您可能還需要 `sudo loginctl enable-linger "$(whoami)"`。
- **SELinux 封鎖 bind 掛載：** 請保持預設的掛載行為不變；當 SELinux 處於 Enforcing 或 Permissive 模式時，啟動器會在 Linux 上自動新增 `:Z`。

## 相關

- [Docker](/zh-Hant/install/docker)
- [Gateway 背景程序](/zh-Hant/gateway/background-process)
- [Gateway 疑難排解](/zh-Hant/gateway/troubleshooting)
