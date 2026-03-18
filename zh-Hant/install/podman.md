---
summary: "在無特權的 Podman 容器中執行 OpenClaw"
read_when:
  - You want a containerized gateway with Podman instead of Docker
title: "Podman"
---

# Podman

在 **無特權** 的 Podman 容器中執行 OpenClaw 閘道。使用與 Docker 相同的映像（從 repo 的 [Dockerfile](https://github.com/openclaw/openclaw/blob/main/Dockerfile) 建構）。

## 需求

- Podman (無特權)
- 用於一次性設定的 Sudo 權限 (建立使用者、建構映像)

## 快速開始

**1. 一次性設定** (從 repo 根目錄執行；建立使用者、建構映像、安裝啟動腳本)：

```bash
./setup-podman.sh
```

這也會建立一個最小的 `~openclaw/.openclaw/openclaw.json` (設定 `gateway.mode="local"`)，以便閘道可以在不執行精靈的情況下啟動。

預設情況下，容器 **不會** 安裝為 systemd 服務，您需要手動啟動它 (見下文)。若要進行具有自動啟動和重新啟動功能的生產環境式設定，請改將其安裝為 systemd Quadlet 使用者服務：

```bash
./setup-podman.sh --quadlet
```

(或是設定 `OPENCLAW_PODMAN_QUADLET=1`；使用 `--container` 僅安裝容器和啟動腳本。)

選用的建構時期環境變數 (在執行 `setup-podman.sh` 之前設定)：

- `OPENCLAW_DOCKER_APT_PACKAGES` — 在映像建構期間安裝額外的 apt 套件
- `OPENCLAW_EXTENSIONS` — 預先安裝擴充功能相依項 (以空格分隔的擴充功能名稱，例如 `diagnostics-otel matrix`)

**2. 啟動閘道** (手動，用於快速測試)：

```bash
./scripts/run-openclaw-podman.sh launch
```

**3. 上線精靈** (例如新增頻道或供應商)：

```bash
./scripts/run-openclaw-podman.sh launch setup
```

然後開啟 `http://127.0.0.1:18789/` 並使用來自 `~openclaw/.openclaw/.env` 的 token (或設定過程中列印的值)。

## Systemd (Quadlet，選用)

如果您執行了 `./setup-podman.sh --quadlet` (或 `OPENCLAW_PODMAN_QUADLET=1`)，將會安裝 [Podman Quadlet](https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html) 單元，使閘道以 openclaw 使用者的 systemd 使用者服務形式執行。該服務會在設定結束時被啟用並啟動。

- **啟動：** `sudo systemctl --machine openclaw@ --user start openclaw.service`
- **停止：** `sudo systemctl --machine openclaw@ --user stop openclaw.service`
- **狀態：** `sudo systemctl --machine openclaw@ --user status openclaw.service`
- **日誌：** `sudo journalctl --machine openclaw@ --user -u openclaw.service -f`

quadlet 檔案位於 `~openclaw/.config/containers/systemd/openclaw.container`。若要變更連接埠或環境變數，請編輯該檔案（或其來源的 `.env`），然後 `sudo systemctl --machine openclaw@ --user daemon-reload` 並重新啟動服務。在開機時，如果為 openclaw 啟用了 linger，服務會自動啟動（當 loginctl 可用時，安裝程式會執行此操作）。

若要在未使用 quadlet 的初始安裝**之後**新增 quadlet，請重新執行：`./setup-podman.sh --quadlet`。

## openclaw 使用者（non-login）

`setup-podman.sh` 會建立一個專用的系統使用者 `openclaw`：

- **Shell：** `nologin` — 無互動式登入；減少攻擊面。
- **Home：** 例如 `/home/openclaw` — 包含 `~/.openclaw`（設定、工作區）以及啟動腳本 `run-openclaw-podman.sh`。
- **Rootless Podman：** 該使用者必須擁有 **subuid** 和 **subgid** 範圍。許多發行版在建立使用者時會自動指派這些內容。如果安裝程式顯示警告，請在 `/etc/subuid` 和 `/etc/subgid` 中新增以下行：

  ```text
  openclaw:100000:65536
  ```

  然後以該使用者身份啟動閘道（例如從 cron 或 systemd）：

  ```bash
  sudo -u openclaw /home/openclaw/run-openclaw-podman.sh
  sudo -u openclaw /home/openclaw/run-openclaw-podman.sh setup
  ```

- **Config：** 只有 `openclaw` 和 root 可以存取 `/home/openclaw/.openclaw`。若要編輯設定：請在閘道執行後使用控制 UI，或是 `sudo -u openclaw $EDITOR /home/openclaw/.openclaw/openclaw.json`。

## 環境與設定

- **Token：** 儲存在 `~openclaw/.openclaw/.env` 中為 `OPENCLAW_GATEWAY_TOKEN`。`setup-podman.sh` 和 `run-openclaw-podman.sh` 會在缺少時產生它（使用 `openssl`、`python3` 或 `od`）。
- **Optional：** 在該 `.env` 中，您可以設定提供者金鑰（例如 `GROQ_API_KEY`、`OLLAMA_API_KEY`）和其他 OpenClaw 環境變數。
- **Host ports：** 預設情況下，腳本會對應 `18789`（閘道）和 `18790`（橋接器）。啟動時，請使用 `OPENCLAW_PODMAN_GATEWAY_HOST_PORT` 和 `OPENCLAW_PODMAN_BRIDGE_HOST_PORT` 覆寫 **host** 連接埠對應。
- **Gateway bind:** 預設情況下，`run-openclaw-podman.sh` 會以 `--bind loopback` 啟動閘道以進行安全的本機存取。若要在區域網路上公開，請設定 `OPENCLAW_GATEWAY_BIND=lan` 並在 `openclaw.json` 中設定 `gateway.controlUi.allowedOrigins`（或明確啟用 host-header 備援機制）。
- **Paths:** 主機設定和工作區預設為 `~openclaw/.openclaw` 和 `~openclaw/.openclaw/workspace`。使用 `OPENCLAW_CONFIG_DIR` 和 `OPENCLAW_WORKSPACE_DIR` 覆寫啟動腳本使用的主機路徑。

## Storage model

- **Persistent host data:** `OPENCLAW_CONFIG_DIR` 和 `OPENCLAW_WORKSPACE_DIR` 會被 bind 掛載到容器中，並在主機上保留狀態。
- **Ephemeral sandbox tmpfs:** 如果您啟用 `agents.defaults.sandbox`，工具沙箱容器會將 `tmpfs` 掛載於 `/tmp`、`/var/tmp` 和 `/run`。這些路徑是記憶體支援的，會隨著沙箱容器而消失；頂層 Podman 容器設定不會新增自己的 tmpfs 掛載。
- **Disk growth hotspots:** 主要需要注意的路徑有 `media/`、`agents/<agentId>/sessions/sessions.json`、transcript JSONL 檔案、`cron/runs/*.jsonl`，以及 `/tmp/openclaw/` 下的輪替檔案日誌（或您設定的 `logging.file`）。

`setup-podman.sh` 現在會在私有的暫存目錄中暫存映像檔 tar，並在設定期間列印選定的基礎目錄。對於非 root 執行，僅當該基礎目錄可安全使用時，它才接受 `TMPDIR`；否則它會回退到 `/var/tmp`，然後是 `/tmp`。儲存的 tar 僅供擁有者存取，並被串流到目標使用者的 `podman load`，因此私有的呼叫者暫存目錄不會阻礙設定。

## Useful commands

- **Logs:** 使用 quadlet：`sudo journalctl --machine openclaw@ --user -u openclaw.service -f`。使用腳本：`sudo -u openclaw podman logs -f openclaw`
- **Stop:** 使用 quadlet：`sudo systemctl --machine openclaw@ --user stop openclaw.service`。使用腳本：`sudo -u openclaw podman stop openclaw`
- **重新開始：** 使用 quadlet：`sudo systemctl --machine openclaw@ --user start openclaw.service`。使用腳本：重新執行啟動腳本或 `podman start openclaw`
- **移除容器：** `sudo -u openclaw podman rm -f openclaw` — 主機上的設定與工作區會被保留

## 疑難排解

- **對設定或 auth-profiles 拒絕存取 (EACCES)：** 容器預設為 `--userns=keep-id`，並以執行腳本之主機使用者的相同 uid/gid 執行。請確保您的主機 `OPENCLAW_CONFIG_DIR` 與 `OPENCLAW_WORKSPACE_DIR` 為該使用者所擁有。
- **閘道啟動受阻 (缺少 `gateway.mode=local`)：** 確認 `~openclaw/.openclaw/openclaw.json` 存在並設定 `gateway.mode="local"`。`setup-podman.sh` 若缺少此檔案會自行建立。
- **Rootless Podman 對使用者 openclaw 失敗：** 檢查 `/etc/subuid` 與 `/etc/subgid` 是否包含 `openclaw` 的設定行 (例如 `openclaw:100000:65536`)。若缺少請加入並重新啟動。
- **容器名稱已被使用：** 啟動腳本使用 `podman run --replace`，因此當您重新啟動時，既有的容器會被替換。若要手動清理：`podman rm -f openclaw`。
- **以 openclaw 身分執行時找不到腳本：** 確認已執行 `setup-podman.sh`，以便將 `run-openclaw-podman.sh` 複製到 openclaw 的家目錄 (例如 `/home/openclaw/run-openclaw-podman.sh`)。
- **找不到 Quadlet 服務或啟動失敗：** 編輯 `.container` 檔案後請執行 `sudo systemctl --machine openclaw@ --user daemon-reload`。Quadlet 需要 cgroups v2：`podman info --format '{{.Host.CgroupsVersion}}'` 應顯示 `2`。

## 選用：以您自己的使用者身分執行

若要以您的普通用戶身分（不使用專用的 openclaw 用戶）執行閘道：請建置映像檔，使用 `OPENCLAW_GATEWAY_TOKEN` 建立 `~/.openclaw/.env`，並使用 `--userns=keep-id` 和掛載到您的 `~/.openclaw` 來執行容器。啟動腳本是為 openclaw 用戶流程設計的；對於單一用戶設定，您可以改為手動執行腳本中的 `podman run` 指令，並將配置和工作區指向您的家目錄。推薦大多數用戶：使用 `setup-podman.sh` 並以 openclaw 用戶身分執行，以便隔離配置和程序。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
