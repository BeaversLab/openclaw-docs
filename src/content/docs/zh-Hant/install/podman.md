---
summary: "在無 root 權限的 Podman 容器中執行 OpenClaw"
read_when:
  - You want a containerized gateway with Podman instead of Docker
title: "Podman"
---

# Podman

在 **rootless** Podman 容器中執行 OpenClaw Gateway。使用與 Docker 相同的映像檔（從儲存庫的 [Dockerfile](https://github.com/openclaw/openclaw/blob/main/Dockerfile) 建構）。

## 先決條件

- **Podman** (無 root 權限模式)
- **sudo** 存取權限，用於一次性設定（建立專屬使用者及建構映像檔）

## 快速開始

<Steps>
  <Step title="一次性設定">
    從儲存庫根目錄執行設定腳本。它會建立一個專屬的 `openclaw` 使用者、建構容器映像檔，並安裝啟動腳本：

    ```bash
    ./scripts/podman/setup.sh
    ```

    這也會在 `~openclaw/.openclaw/openclaw.json` 建立一個最小設定（將 `gateway.mode` 設為 `"local"`），以便 Gateway 能夠在不執行精靈的情況下啟動。

    預設情況下，容器**不會**安裝為 systemd 服務——您需要在下一步手動啟動它。若要使用自動啟動和重新啟動的生產環境風格設定，請改為傳入 `--quadlet`：

    ```bash
    ./scripts/podman/setup.sh --quadlet
    ```

    （或是設定 `OPENCLAW_PODMAN_QUADLET=1`。使用 `--container` 僅安裝容器和啟動腳本。）

    **選用建構時期環境變數**（在執行 `scripts/podman/setup.sh` 前設定）：

    - `OPENCLAW_DOCKER_APT_PACKAGES` -- 在映像檔建構期間安裝額外的 apt 套件。
    - `OPENCLAW_EXTENSIONS` -- 預先安裝擴充功能相依項（以空格分隔的名稱，例如 `diagnostics-otel matrix`）。

  </Step>

  <Step title="啟動 Gateway">
    若要快速手動啟動：

    ```bash
    ./scripts/run-openclaw-podman.sh launch
    ```

  </Step>

  <Step title="執行上架精靈">
    若要以互動方式新增頻道或供應商：

    ```bash
    ./scripts/run-openclaw-podman.sh launch setup
    ```

    然後開啟 `http://127.0.0.1:18789/` 並使用來自 `~openclaw/.openclaw/.env` 的 token（或設定過程中列印的值）。

  </Step>
</Steps>

## Systemd (Quadlet, 選用)

如果您執行了 `./scripts/podman/setup.sh --quadlet`（或 `OPENCLAW_PODMAN_QUADLET=1`），則會安裝 [Podman Quadlet](https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html) 單元，以便閘道作為 openclaw 使用者的 systemd 使用者服務執行。該服務會在設定結束時被啟用並啟動。

- **啟動：** `sudo systemctl --machine openclaw@ --user start openclaw.service`
- **停止：** `sudo systemctl --machine openclaw@ --user stop openclaw.service`
- **狀態：** `sudo systemctl --machine openclaw@ --user status openclaw.service`
- **日誌：** `sudo journalctl --machine openclaw@ --user -u openclaw.service -f`

quadlet 檔案位於 `~openclaw/.config/containers/systemd/openclaw.container`。若要更改連接埠或環境變數，請編輯該檔案（或其引入的 `.env`），然後 `sudo systemctl --machine openclaw@ --user daemon-reload` 並重新啟動服務。開機時，如果為 openclaw 啟用了 linger，該服務會自動啟動（當 loginctl 可用時，設定程序會執行此操作）。

若要在未使用 quadlet 的初始設定**之後**新增 quadlet，請重新執行：`./scripts/podman/setup.sh --quadlet`。

## openclaw 使用者（非登入）

`scripts/podman/setup.sh` 會建立一個專屬的系統使用者 `openclaw`：

- **Shell：** `nologin` — 無互動式登入；減少攻擊面。
- **Home：** 例如 `/home/openclaw` — 包含 `~/.openclaw`（設定、工作區）和啟動腳本 `run-openclaw-podman.sh`。
- **Rootless Podman：** 該使用者必須擁有 **subuid** 和 **subgid** 範圍。許多發行版在建立使用者時會自動分配這些範圍。如果設定列印出警告，請將行新增至 `/etc/subuid` 和 `/etc/subgid`：

  ```text
  openclaw:100000:65536
  ```

  然後以該使用者身分啟動閘道（例如從 cron 或 systemd）：

  ```bash
  sudo -u openclaw /home/openclaw/run-openclaw-podman.sh
  sudo -u openclaw /home/openclaw/run-openclaw-podman.sh setup
  ```

- **設定：** 只有 `openclaw` 和 root 可以存取 `/home/openclaw/.openclaw`。若要編輯設定：在閘道運行後使用控制 UI，或 `sudo -u openclaw $EDITOR /home/openclaw/.openclaw/openclaw.json`。

## 環境和設定

- **Token：** 儲存在 `~openclaw/.openclaw/.env` 中作為 `OPENCLAW_GATEWAY_TOKEN`。`scripts/podman/setup.sh` 和 `run-openclaw-podman.sh` 會在遺失時生成它（使用 `openssl`、`python3` 或 `od`）。
- **可選：** 在該 `.env` 中，您可以設定供應商金鑰（例如 `GROQ_API_KEY`、`OLLAMA_API_KEY`）和其他 OpenClaw 環境變數。
- **主機連接埠：** 預設情況下，該腳本會映射 `18789`（gateway）和 `18790`（bridge）。啟動時，請使用 `OPENCLAW_PODMAN_GATEWAY_HOST_PORT` 和 `OPENCLAW_PODMAN_BRIDGE_HOST_PORT` 覆寫 **主機** 連接埠映射。
- **Gateway 繫結：** 預設情況下，`run-openclaw-podman.sh` 會以 `--bind loopback` 啟動 gateway 以便安全地在本機存取。若要暴露在區域網路上，請設定 `OPENCLAW_GATEWAY_BIND=lan` 並在 `openclaw.json` 中設定 `gateway.controlUi.allowedOrigins`（或明確啟用 host-header 後援機制）。
- **路徑：** 主機設定和工作區預設為 `~openclaw/.openclaw` 和 `~openclaw/.openclaw/workspace`。請使用 `OPENCLAW_CONFIG_DIR` 和 `OPENCLAW_WORKSPACE_DIR` 覆寫啟動腳本使用的主機路徑。

## 儲存模型

- **持久化主機資料：** `OPENCLAW_CONFIG_DIR` 和 `OPENCLAW_WORKSPACE_DIR` 會被繫結掛載到容器中，並在主機上保留狀態。
- **暫時性沙箱 tmpfs：** 如果您啟用 `agents.defaults.sandbox`，工具沙箱容器會在 `/tmp`、`/var/tmp` 和 `/run` 掛載 `tmpfs`。這些路徑是基於記憶體的，並會隨沙箱容器消失；頂層 Podman 容器設定不會新增自己的 tmpfs 掛載。
- **磁碟增長熱點：** 主要需注意的路徑為 `media/`、`agents/<agentId>/sessions/sessions.json`、transcript JSONL 檔案、`cron/runs/*.jsonl`，以及 `/tmp/openclaw/`（或您設定的 `logging.file`）下的滾動檔案日誌。

`scripts/podman/setup.sh` 現在會將映像檔 tar 暫存於私有的臨時目錄中，並在設定期間印出所選的基礎目錄。對於非 root 執行，僅當該基礎目錄可安全使用時，它才接受 `TMPDIR`；否則它會回退到 `/var/tmp`，然後是 `/tmp`。儲存的 tar 檔案僅供擁有者使用，並會被串流傳輸到目標使用者的 `podman load`，因此私有的呼叫者臨時目錄不會阻擋設定。

## 實用指令

- **日誌：** 使用 quadlet：`sudo journalctl --machine openclaw@ --user -u openclaw.service -f`。使用腳本：`sudo -u openclaw podman logs -f openclaw`
- **停止：** 使用 quadlet：`sudo systemctl --machine openclaw@ --user stop openclaw.service`。使用腳本：`sudo -u openclaw podman stop openclaw`
- **再次啟動：** 使用 quadlet：`sudo systemctl --machine openclaw@ --user start openclaw.service`。使用腳本：重新執行啟動腳本或 `podman start openclaw`
- **移除容器：** `sudo -u openclaw podman rm -f openclaw` — 主機上的設定和工作區會被保留

## 疑難排解

- **設定或 auth-profiles 權限被拒 (EACCES)：** 容器預設為 `--userns=keep-id` 並以執行腳本的主機使用者相同的 uid/gid 執行。請確保您的主機 `OPENCLAW_CONFIG_DIR` 和 `OPENCLAW_WORKSPACE_DIR` 為該使用者所擁有。
- **Gateway 啟動受阻 (缺少 `gateway.mode=local`)：** 確保 `~openclaw/.openclaw/openclaw.json` 存在並設定 `gateway.mode="local"`。`scripts/podman/setup.sh` 如果缺少此檔案會建立它。
- **Rootless Podman 對使用者 openclaw 失敗：** 檢查 `/etc/subuid` 和 `/etc/subgid` 是否包含 `openclaw` 的行（例如 `openclaw:100000:65536`）。如果缺少則新增並重新啟動。
- **容器名稱正在使用中：** 啟動腳本使用 `podman run --replace`，因此當您再次啟動時，現有的容器會被取代。若要手動清理：`podman rm -f openclaw`。
- **以 openclaw 身分執行時找不到腳本：** 確保已執行 `scripts/podman/setup.sh`，以便將 `run-openclaw-podman.sh` 複製到 openclaw 的家目錄（例如 `/home/openclaw/run-openclaw-podman.sh`）。
- **Quadlet 服務找不到或無法啟動：** 編輯 `.container` 檔案後，請執行 `sudo systemctl --machine openclaw@ --user daemon-reload`。Quadlet 需要 cgroups v2：`podman info --format '{{.Host.CgroupsVersion}}'` 應該顯示 `2`。

## 選用：以您自己的使用者身分執行

若要以您的一般使用者身分（無專用的 openclaw 使用者）執行閘道：建置映像檔，使用 `OPENCLAW_GATEWAY_TOKEN` 建立 `~/.openclaw/.env`，並使用 `--userns=keep-id` 和掛載點到您的 `~/.openclaw` 來執行容器。啟動腳本是為 openclaw 使用者流程設計的；對於單一使用者設定，您可以改為手動從腳本中執行 `podman run` 指令，將設定和工作區指向您的家目錄。建議大多數使用者：使用 `scripts/podman/setup.sh` 並以 openclaw 使用者身分執行，以便將設定和程序隔離。
