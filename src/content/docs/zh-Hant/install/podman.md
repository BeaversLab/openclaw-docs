---
summary: "在無特權 Podman 容器中執行 OpenClaw"
read_when:
  - You want a containerized gateway with Podman instead of Docker
title: "Podman"
---

# Podman

在無特權 Podman 容器中執行 OpenClaw Gateway，由您目前的非 root 使用者管理。

預期的模式是：

- Podman 執行閘道容器。
- 您的主機 `openclaw` CLI 是控制平面。
- 持久狀態預設存在於主機的 `~/.openclaw` 下。
- 日常管理使用 `openclaw --container <name> ...` 而非 `sudo -u openclaw`、`podman exec` 或個別的服務使用者。

## 先決條件

- **Podman** 處於無特權模式
- 主機上已安裝 **OpenClaw CLI**
- **選用：** 如果您想要由 Quadlet 管理的自動啟動，請安裝 `systemd --user`
- **選用：** 僅當您在無介面主機上為了開機持久化而需要 `loginctl enable-linger "$(whoami)"` 時，才安裝 `sudo`

## 快速開始

<Steps>
  <Step title="一次性設定">
    從 repo 根目錄執行 `./scripts/podman/setup.sh`。
  </Step>

<Step title="啟動 Gateway 容器">使用 `./scripts/run-openclaw-podman.sh launch` 啟動容器。</Step>

<Step title="在容器內執行上架">執行 `./scripts/run-openclaw-podman.sh launch setup`，然後開啟 `http://127.0.0.1:18789/`。</Step>

  <Step title="從主機 CLI 管理執行中的容器">
    設定 `OPENCLAW_CONTAINER=openclaw`，然後從主機使用正常的 `openclaw` 指令。
  </Step>
</Steps>

設定詳情：

- `./scripts/podman/setup.sh` 預設會在您的 rootless Podman 儲存庫中建置 `openclaw:local`，或者如果您有設定的話，會使用 `OPENCLAW_IMAGE` / `OPENCLAW_PODMAN_IMAGE`。
- 如果缺失，它會建立帶有 `gateway.mode: "local"` 的 `~/.openclaw/openclaw.json`。
- 如果缺失，它會建立帶有 `OPENCLAW_GATEWAY_TOKEN` 的 `~/.openclaw/.env`。
- 對於手動啟動，輔助指令稿只會從 `~/.openclaw/.env` 讀取一小部分 Podman 相關的允許清單金鑰，並將明確的執行時環境變數傳遞給容器；它不會將完整的 env 檔案交給 Podman。

由 Quadlet 管理的設定：

```bash
./scripts/podman/setup.sh --quadlet
```

Quadlet 僅適用於 Linux，因為它依賴 systemd 使用者服務。

您也可以設定 `OPENCLAW_PODMAN_QUADLET=1`。

可選的建置/設定環境變量：

- `OPENCLAW_IMAGE` 或 `OPENCLAW_PODMAN_IMAGE` -- 使用現有/提取的映像檔而不是建置 `openclaw:local`
- `OPENCLAW_DOCKER_APT_PACKAGES` -- 在映像檔建置期間安裝額外的 apt 套件
- `OPENCLAW_EXTENSIONS` -- 在建置時預先安裝擴充功能相依項

容器啟動：

```bash
./scripts/run-openclaw-podman.sh launch
```

該腳本會以您目前的 uid/gid 使用 `--userns=keep-id` 啟動容器，並將您的 OpenClaw 狀態綁定掛載到容器中。

入門：

```bash
./scripts/run-openclaw-podman.sh launch setup
```

然後打開 `http://127.0.0.1:18789/` 並使用來自 `~/.openclaw/.env` 的令牌。

主機 CLI 預設值：

```bash
export OPENCLAW_CONTAINER=openclaw
```

然後，諸如此類的指令將自動在該容器內執行：

```bash
openclaw dashboard --no-open
openclaw gateway status --deep
openclaw doctor
openclaw channels login
```

在 macOS 上，Podman 機器可能會讓瀏覽器對網關而言顯示為非本地。
如果控制介面在啟動後報告裝置驗證錯誤，請優先使用 [macOS Podman SSH 隧道](#macos-podman-ssh-tunnel) 中的 SSH 隧道流程。若要進行遠端 HTTPS 存取，請使用
[Podman + Tailscale](#podman--tailscale) 中的 Tailscale 指引。

## macOS Podman SSH tunnel

在 macOS 上，即使發布的端口僅在 `127.0.0.1` 上，Podman 機器也可能會讓瀏覽器對網關而言顯示為非本地。

對於本機瀏覽器存取，請使用 SSH 隧道進入 Podman VM，並改為開啟隧道的 localhost 連接埠。

推薦的本機隧道連接埠：

- Mac 主機上的 `28889`
- 轉發到 Podman VM 內部的 `127.0.0.1:18789`

在單獨的終端機中啟動隧道：

```bash
ssh -N \
  -i ~/.local/share/containers/podman/machine/machine \
  -p <podman-vm-ssh-port> \
  -L 28889:127.0.0.1:18789 \
  core@127.0.0.1
```

在該指令中，`<podman-vm-ssh-port>` 是 Mac 主機上 Podman VM 的 SSH 連接埠。請使用以下指令檢查您目前的值：

```bash
podman system connection list
```

允許經過隧道的瀏覽器來源一次。這是您首次使用隧道時所必需的，因為啟動器可以自動植入 Podman 發布的連接埠，但無法推斷您選擇的瀏覽器隧道連接埠：

```bash
OPENCLAW_CONTAINER=openclaw openclaw config set gateway.controlUi.allowedOrigins \
  '["http://127.0.0.1:18789","http://localhost:18789","http://127.0.0.1:28889","http://localhost:28889"]' \
  --strict-json
podman restart openclaw
```

這是針對預設 `28889` 隧道的一次性步驟。

然後開啟：

```text
http://127.0.0.1:28889/
```

備註：

- `18789` 通常已被 Podman 發布的網關連接埠佔用，因此該隧道使用 `28889` 作為本地瀏覽器連接埠。
- 如果 UI 要求配對核准，請優先使用明確指定容器目標或明確 URL 的指令，以免主機 CLI 回退到本機配對檔案：

```bash
openclaw --container openclaw devices list
openclaw --container openclaw devices approve --latest
```

- 對等的明確 URL 形式：

```bash
openclaw devices list \
  --url ws://127.0.0.1:28889 \
  --token "$(sed -n 's/^OPENCLAW_GATEWAY_TOKEN=//p' ~/.openclaw/.env | head -n1)"
```

<a id="podman--tailscale"></a>

## Podman + Tailscale

若要進行 HTTPS 或遠端瀏覽器存取，請遵循主要的 Tailscale 文件。

Podman 特別注意事項：

- 將 Podman 發布主機保持在 `127.0.0.1`。
- 優先使用主機管理的 `tailscale serve` 而非 `openclaw gateway --tailscale serve`。
- 若要在沒有 HTTPS 的情況下從本機 macOS 瀏覽器存取，請優先使用上述 SSH 隧道部分。

參閱：

- [Tailscale](/en/gateway/tailscale)
- [控制介面](/en/web/control-ui)

## Systemd (Quadlet，可選)

如果您執行了 `./scripts/podman/setup.sh --quadlet`，設置會在以下位置安裝 Quadlet 檔案：

```bash
~/.config/containers/systemd/openclaw.container
```

常用指令：

- **啟動：** `systemctl --user start openclaw.service`
- **停止：** `systemctl --user stop openclaw.service`
- **狀態：** `systemctl --user status openclaw.service`
- **日誌：** `journalctl --user -u openclaw.service -f`

編輯 Quadlet 檔案後：

```bash
systemctl --user daemon-reload
systemctl --user restart openclaw.service
```

若要在 SSH/無主機主機上開機後保持運行，請為您目前的使用者啟用 lingering：

```bash
sudo loginctl enable-linger "$(whoami)"
```

## 設定、環境變數和儲存空間

- **設定目錄：** `~/.openclaw`
- **工作區目錄：** `~/.openclaw/workspace`
- **Token 檔案：** `~/.openclaw/.env`
- **啟動輔助程式：** `./scripts/run-openclaw-podman.sh`

啟動腳本和 Quadlet 會將主機狀態以 bind-mount 方式掛載進容器中：

- `OPENCLAW_CONFIG_DIR` -> `/home/node/.openclaw`
- `OPENCLAW_WORKSPACE_DIR` -> `/home/node/.openclaw/workspace`

預設情況下，這些是主機目錄，而非匿名的容器狀態，因此設定和工作區在容器更換後會被保留。
Podman 設定也會針對已發布的閘道連接埠，為 `127.0.0.1` 和 `localhost` 植入 `gateway.controlUi.allowedOrigins`，以便本機儀表板能與容器的非迴路繫位相容。

手動啟動器有用的環境變數：

- `OPENCLAW_PODMAN_CONTAINER` -- 容器名稱（預設為 `openclaw`）
- `OPENCLAW_PODMAN_IMAGE` / `OPENCLAW_IMAGE` -- 要執行的映像檔
- `OPENCLAW_PODMAN_GATEWAY_HOST_PORT` -- 對應到容器 `18789` 的主機連接埠
- `OPENCLAW_PODMAN_BRIDGE_HOST_PORT` -- 對應到容器 `18790` 的主機連接埠
- `OPENCLAW_PODMAN_PUBLISH_HOST` -- 已發布連接埠的主機介面；預設為 `127.0.0.1`
- `OPENCLAW_GATEWAY_BIND` -- 容器內的閘道繫位模式；預設為 `lan`
- `OPENCLAW_PODMAN_USERNS` -- `keep-id`（預設）、`auto` 或 `host`

手動啟動器在確定容器/映像檔預設值之前會讀取 `~/.openclaw/.env`，因此您可以在那裡保存這些設定。

如果您使用非預設的 `OPENCLAW_CONFIG_DIR` 或 `OPENCLAW_WORKSPACE_DIR`，請為 `./scripts/podman/setup.sh` 和後續的 `./scripts/run-openclaw-podman.sh launch` 指令設定相同的變數。存放庫本地的啟動器不會跨 shell 保留自訂路徑覆蓋。

Quadlet 說明：

- 產生的 Quadlet 服務刻意保持固定的、強化的預設形態：`127.0.0.1` 已發布的連接埠、容器內的 `--bind lan`，以及 `keep-id` 使用者命名空間。
- 它仍會讀取 `~/.openclaw/.env` 以取得 Gateway 執行階段環境變數（例如 `OPENCLAW_GATEWAY_TOKEN`），但它不會使用手動啟動器中 Podman 專用的覆寫允許清單。
- 如果您需要自訂發佈連接埠、發佈主機或其他容器執行旗標，請使用手動啟動器或直接編輯 `~/.config/containers/systemd/openclaw.container`，然後重新載入並重新啟動服務。

## 實用指令

- **容器日誌：** `podman logs -f openclaw`
- **停止容器：** `podman stop openclaw`
- **移除容器：** `podman rm -f openclaw`
- **從主機 CLI 開啟儀表板 URL：** `openclaw dashboard --no-open`
- **透過主機 CLI 查看健康狀態/狀態：** `openclaw gateway status --deep`

## 疑難排解

- **設定或工作區權限被拒（EACCES）：** 容器預設以 `--userns=keep-id` 和 `--user <your uid>:<your gid>` 執行。請確保主機上的設定/工作區路徑是由您目前的使用者所擁有。
- **Gateway 啟動受阻（缺少 `gateway.mode=local`）：** 請確認 `~/.openclaw/openclaw.json` 存在並設定 `gateway.mode="local"`。如果缺少，`scripts/podman/setup.sh` 會建立它。
- **容器 CLI 指令錯誤地作用於目標：** 請明確使用 `openclaw --container <name> ...`，或在您的 shell 中匯出 `OPENCLAW_CONTAINER=<name>`。
- **`openclaw update` 失敗並顯示 `--container`：** 這是預期行為。請重新建置/提取映像檔，然後重新啟動容器或 Quadlet 服務。
- **Quadlet 服務無法啟動：** 請執行 `systemctl --user daemon-reload`，然後執行 `systemctl --user start openclaw.service`。在無介面系統上，您可能也需要 `sudo loginctl enable-linger "$(whoami)"`。
- **SELinux 阻擋 bind mounts：** 請保留預設的掛載行為；當 Linux 上的 SELinux 處於 Enforcing 或 Permissive 模式時，啟動器會自動新增 `:Z`。

## 相關

- [Docker](/en/install/docker)
- [Gateway 背景程序](/en/gateway/background-process)
- [Gateway 疑難排解](/en/gateway/troubleshooting)
