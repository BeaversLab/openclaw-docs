---
summary: "在無根 Podman 容器中執行 OpenClaw"
read_when:
  - 您希望使用 Podman 而非 Docker 來建立容器化閘道
title: "Podman"
---

# Podman

在 **無根** Podman 容器中執行 OpenClaw 閘道。使用與 Docker 相同的映像檔（從儲存庫的 [Dockerfile](https://github.com/openclaw/openclaw/blob/main/Dockerfile) 建置）。

## 需求

- Podman (無特權)
- 用於一次性設定的 Sudo 權限 (建立使用者、建構映像)

## 快速開始

**1. 一次性設定** (從 repo 根目錄執行；建立使用者、建構映像、安裝啟動腳本)：

```bash
./setup-podman.sh
```

這也會建立一個最小的 `~openclaw/.openclaw/openclaw.json`（設定 `gateway.mode="local"`），以便閘道無需執行精靈即可啟動。

預設情況下，容器 **不會** 安裝為 systemd 服務，您需要手動啟動它 (見下文)。若要進行具有自動啟動和重新啟動功能的生產環境式設定，請改將其安裝為 systemd Quadlet 使用者服務：

```bash
./setup-podman.sh --quadlet
```

（或是設定 `OPENCLAW_PODMAN_QUADLET=1`；使用 `--container` 僅安裝容器和啟動腳本。）

可選的建置時期環境變數（在執行 `setup-podman.sh` 之前設定）：

- `OPENCLAW_DOCKER_APT_PACKAGES` — 在映像檔建置期間安裝額外的 apt 套件
- `OPENCLAW_EXTENSIONS` — 預先安裝擴充功能相依項（以空格分隔的擴充功能名稱，例如 `diagnostics-otel matrix`）

**2. 啟動閘道** (手動，用於快速測試)：

```bash
./scripts/run-openclaw-podman.sh launch
```

**3. 上線精靈** (例如新增頻道或供應商)：

```bash
./scripts/run-openclaw-podman.sh launch setup
```

然後開啟 `http://127.0.0.1:18789/` 並使用來自 `~openclaw/.openclaw/.env` 的 Token（或是安裝程式列印的值）。

## Systemd (Quadlet，選用)

如果您執行了 `./setup-podman.sh --quadlet`（或 `OPENCLAW_PODMAN_QUADLET=1`），則會安裝 [Podman Quadlet](https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html) 單元，使閘道以 openclaw 使用者的 systemd 使用者服務形式執行。該服務會在安裝結束時被啟用並啟動。

- **啟動：** `sudo systemctl --machine openclaw@ --user start openclaw.service`
- **停止：** `sudo systemctl --machine openclaw@ --user stop openclaw.service`
- **狀態：** `sudo systemctl --machine openclaw@ --user status openclaw.service`
- **日誌：** `sudo journalctl --machine openclaw@ --user -u openclaw.service -f`

quadlet 檔案位於 `~openclaw/.config/containers/systemd/openclaw.container`。若要變更連接埠或環境變數，請編輯該檔案（或其來源的 `.env`），然後 `sudo systemctl --machine openclaw@ --user daemon-reload` 並重新啟動服務。開機時，如果為 openclaw 啟用了 linger，服務會自動啟動（當 loginctl 可用時，安裝程式會執行此操作）。

若要在未使用 quadlet 的初始安裝**之後**新增 quadlet，請重新執行：`./setup-podman.sh --quadlet`。

## openclaw 使用者（non-login）

`setup-podman.sh` 會建立一個專用的系統使用者 `openclaw`：

- **Shell：** `nologin` — 無互動式登入；降低攻擊面。
- **Home：** 例如 `/home/openclaw` — 保存 `~/.openclaw`（設定、工作區）和啟動腳本 `run-openclaw-podman.sh`。
- **Rootless Podman：** 使用者必須擁有 **subuid** 和 **subgid** 範圍。許多發行版在建立使用者時會自動分配這些。如果安裝程式列印警告，請將行新增至 `/etc/subuid` 和 `/etc/subgid`：

  ```text
  openclaw:100000:65536
  ```

  然後以該使用者身份啟動閘道（例如從 cron 或 systemd）：

  ```bash
  sudo -u openclaw /home/openclaw/run-openclaw-podman.sh
  sudo -u openclaw /home/openclaw/run-openclaw-podman.sh setup
  ```

- **Config：** 只有 `openclaw` 和 root 可以存取 `/home/openclaw/.openclaw`。若要編輯設定：在閘道執行後使用控制 UI，或 `sudo -u openclaw $EDITOR /home/openclaw/.openclaw/openclaw.json`。

## 環境與設定

- **Token：** 儲存在 `~openclaw/.openclaw/.env` 中為 `OPENCLAW_GATEWAY_TOKEN`。`setup-podman.sh` 和 `run-openclaw-podman.sh` 會在缺少時生成它（使用 `openssl`、`python3` 或 `od`）。
- **Optional：** 在該 `.env` 中，您可以設定提供者金鑰（例如 `GROQ_API_KEY`、`OLLAMA_API_KEY`）和其他 OpenClaw 環境變數。
- **Host ports：** 預設情況下，腳本會對應 `18789`（閘道）和 `18790`（橋接器）。啟動時，使用 `OPENCLAW_PODMAN_GATEWAY_HOST_PORT` 和 `OPENCLAW_PODMAN_BRIDGE_HOST_PORT` 覆蓋 **host** 連接埠對應。
- **Gateway bind：** 預設情況下，`run-openclaw-podman.sh` 會以 `--bind loopback` 啟動閘道以進行安全的本機存取。若要在 LAN 上公開，請設定 `OPENCLAW_GATEWAY_BIND=lan` 並在 `openclaw.json` 中設定 `gateway.controlUi.allowedOrigins`（或明確啟用 host-header 回退）。
- **Paths：** Host 設定和工作區預設為 `~openclaw/.openclaw` 和 `~openclaw/.openclaw/workspace`。使用 `OPENCLAW_CONFIG_DIR` 和 `OPENCLAW_WORKSPACE_DIR` 覆蓋啟動腳本使用的 host 路徑。

## Storage model

- **Persistent host data：** `OPENCLAW_CONFIG_DIR` 和 `OPENCLAW_WORKSPACE_DIR` 被掛載到容器中，並在 host 上保留狀態。
- **暫時性沙箱 tmpfs：**如果您啟用 `agents.defaults.sandbox`，工具沙箱容器將在 `/tmp`、`/var/tmp` 和 `/run` 掛載 `tmpfs`。這些路徑是基於記憶體的，會隨沙箱容器一起消失；頂層 Podman 容器設定不會新增自己的 tmpfs 掛載。
- **磁碟增長熱點：**主要需要注意的路徑包括 `media/`、`agents/<agentId>/sessions/sessions.json`、transcript JSONL 檔案、`cron/runs/*.jsonl`，以及 `/tmp/openclaw/`（或您設定的 `logging.file`）下的滾動檔案日誌。

`setup-podman.sh` 現在會在私有暫存目錄中暫存映像檔 tar，並在設定期間列印所選的基礎目錄。對於非 root 執行，僅當該基礎目錄使用安全時才接受 `TMPDIR`；否則會後退到 `/var/tmp`，然後是 `/tmp`。儲存的 tar 保持僅擁有者可讀，並被串流到目標使用者的 `podman load` 中，因此私有呼叫者暫存目錄不會阻擋設定。

## Useful commands

- **日誌：**使用 quadlet：`sudo journalctl --machine openclaw@ --user -u openclaw.service -f`。使用腳本：`sudo -u openclaw podman logs -f openclaw`
- **停止：**使用 quadlet：`sudo systemctl --machine openclaw@ --user stop openclaw.service`。使用腳本：`sudo -u openclaw podman stop openclaw`
- **再次啟動：**使用 quadlet：`sudo systemctl --machine openclaw@ --user start openclaw.service`。使用腳本：重新執行啟動腳本或 `podman start openclaw`
- **移除容器：**`sudo -u openclaw podman rm -f openclaw` — 主機上的設定和工作區會被保留

## 疑難排解

- **設定或 auth-profiles 的權限被拒絕 (EACCES)：**容器預設為 `--userns=keep-id`，並以與執行腳本的主機使用者相同的 uid/gid 執行。請確保您主機上的 `OPENCLAW_CONFIG_DIR` 和 `OPENCLAW_WORKSPACE_DIR` 由該使用者擁有。
- **閘道啟動受阻（缺少 `gateway.mode=local`）：**確保 `~openclaw/.openclaw/openclaw.json` 存在並設定了 `gateway.mode="local"`。如果缺失，`setup-podman.sh` 將建立此檔案。
- **Rootless Podman 對於 openclaw 用戶失敗：** 檢查 `/etc/subuid` 和 `/etc/subgid` 是否包含 `openclaw` 的一行（例如 `openclaw:100000:65536`）。如果缺少則添加它並重新啟動。
- **容器名稱正在使用中：** 啟動腳本使用 `podman run --replace`，因此當您再次啟動時，現有容器將被替換。若要手動清理：`podman rm -f openclaw`。
- **以 openclaw 身分運行時找不到腳本：** 確保已運行 `setup-podman.sh`，以便將 `run-openclaw-podman.sh` 複製到 openclaw 的家目錄（例如 `/home/openclaw/run-openclaw-podman.sh`）。
- **找不到 Quadlet 服務或無法啟動：** 編輯 `.container` 檔案後運行 `sudo systemctl --machine openclaw@ --user daemon-reload`。Quadlet 需要 cgroups v2：`podman info --format '{{.Host.CgroupsVersion}}'` 應顯示 `2`。

## 選用：以您自己的使用者身分執行

要將閘道作為您的普通用戶運行（沒有專用的 openclaw 用戶）：建構映像檔，使用 `OPENCLAW_GATEWAY_TOKEN` 建立一個 `~/.openclaw/.env`，並使用 `--userns=keep-id` 和掛載到您的 `~/.openclaw` 的掛載項來運行容器。啟動腳本是為 openclaw 用戶流程設計的；對於單用戶設置，您可以改為手動運行腳本中的 `podman run` 指令，將配置和工作區指向您的家目錄。推薦給大多數用戶：使用 `setup-podman.sh` 並以 openclaw 用戶身份運行，以便隔離配置和流程。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
