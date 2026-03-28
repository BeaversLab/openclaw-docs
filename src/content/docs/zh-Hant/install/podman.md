---
summary: "在無根 Podman 容器中執行 OpenClaw"
read_when:
  - You want a containerized gateway with Podman instead of Docker
title: "Podman"
---

# Podman

在 **rootless**（無根）Podman 容器中執行 OpenClaw Gateway。使用與 Docker 相同的映像檔（從程式庫的 [Dockerfile](https://github.com/openclaw/openclaw/blob/main/Dockerfile) 建構）。

## 先決條件

- **Podman**（無根模式）
- **sudo** 存取權限用於一次性設定（建立專屬使用者和建構映像檔）

## 快速入門

<Steps>
  <Step title="一次性設定">
    從 repo 根目錄執行設定腳本。它會建立一個專屬的 `openclaw` 使用者、建構容器映像檔，並安裝啟動腳本：

    ```exec
    ./scripts/podman/setup.sh
    ```

    這也會在 `~openclaw/.openclaw/openclaw.json` 建立一個最小設定（將 `gateway.mode` 設定為 `"local"`），以便無需執行精靈即可啟動 Gateway。

    根據預設，容器**不會**安裝為 systemd 服務——您會在下一步手動啟動它。若要使用具有自動啟動和重啟功能的生產環境風格設定，請改為傳入 `--quadlet`：

    ```exec
    ./scripts/podman/setup.sh --quadlet
    ```

    （或是設定 `OPENCLAW_PODMAN_QUADLET=1`。使用 `--container` 僅安裝容器和啟動腳本。）

    **選用建構時期環境變數**（在執行 `scripts/podman/setup.sh` 之前設定）：

    - `OPENCLAW_DOCKER_APT_PACKAGES` -- 在映像檔建構期間安裝額外的 apt 套件。
    - `OPENCLAW_EXTENSIONS` -- 預先安裝擴充功能相依項（以空格分隔的名稱，例如 `diagnostics-otel matrix`）。

  </Step>

  <Step title="啟動閘道">
    若要快速手動啟動：

    ```exec
    ./scripts/run-openclaw-podman.sh launch
    ```

  </Step>

  <Step title="執行入門精靈">
    若要以互動方式新增頻道或提供者：

    ```exec
    ./scripts/run-openclaw-podman.sh launch setup
    ```

    然後開啟 `http://127.0.0.1:18789/` 並使用來自 `~openclaw/.openclaw/.env` 的權杖（或是設定時列印的值）。

  </Step>
</Steps>

## Systemd (Quadlet, 選用)

如果您執行了 `./scripts/podman/setup.sh --quadlet` （或 `OPENCLAW_PODMAN_QUADLET=1`），則會安裝 [Podman Quadlet](https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html) 單元，以便閘道作為 openclaw 使用者的 systemd 使用者服務執行。該服務會在設定結束時啟用並啟動。

- **啟動：** `sudo systemctl --machine openclaw@ --user start openclaw.service`
- **停止：** `sudo systemctl --machine openclaw@ --user stop openclaw.service`
- **狀態：** `sudo systemctl --machine openclaw@ --user status openclaw.service`
- **日誌：** `sudo journalctl --machine openclaw@ --user -u openclaw.service -f`

quadlet 檔案位於 `~openclaw/.config/containers/systemd/openclaw.container`。若要變更連接埠或環境變數，請編輯該檔案（或其來源的 `.env`），然後 `sudo systemctl --machine openclaw@ --user daemon-reload` 並重新啟動服務。開機時，如果為 openclaw 啟用了 linger，服務會自動啟動（當 loginctl 可用時，設定會執行此操作）。

若要在最初未使用 quadlet 的設定**之後**新增 quadlet，請重新執行：`./scripts/podman/setup.sh --quadlet`。

## openclaw 使用者（非登入）

`scripts/podman/setup.sh` 會建立一個專用的系統使用者 `openclaw`：

- **Shell：** `nologin` — 無互動式登入；減少攻擊面。
- **Home：** 例如 `/home/openclaw` — 保存 `~/.openclaw`（設定、工作區）和啟動腳本 `run-openclaw-podman.sh`。
- **無根 Podman：** 使用者必須擁有 **subuid** 和 **subgid** 範圍。許多發行版在建立使用者時會自動分配這些。如果安裝程式印出警告，請在 `/etc/subuid` 和 `/etc/subgid` 中新增行：

  ```text
  openclaw:100000:65536
  ```

  然後以該使用者身份啟動閘道（例如從 cron 或 systemd）：

  ```exec
  sudo -u openclaw /home/openclaw/run-openclaw-podman.sh
  sudo -u openclaw /home/openclaw/run-openclaw-podman.sh setup
  ```

- **設定：** 只有 `openclaw` 和 root 可以存取 `/home/openclaw/.openclaw`。要編輯設定：在閘道運行後使用控制 UI，或 `sudo -u openclaw $EDITOR /home/openclaw/.openclaw/openclaw.json`。

## 環境與設定

- **Token：** 以 `OPENCLAW_GATEWAY_TOKEN` 形式儲存在 `~openclaw/.openclaw/.env` 中。如果缺少，`scripts/podman/setup.sh` 和 `run-openclaw-podman.sh` 會生成它（使用 `openssl`、`python3` 或 `od`）。
- **選填：** 在該 `.env` 中，您可以設定供應商金鑰（例如 `GROQ_API_KEY`、`OLLAMA_API_KEY`）及其他 OpenClaw 環境變數。
- **主機連接埠：** 預設情況下，腳本會映射 `18789`（gateway）和 `18790`（bridge）。啟動時，可以使用 `OPENCLAW_PODMAN_GATEWAY_HOST_PORT` 和 `OPENCLAW_PODMAN_BRIDGE_HOST_PORT` 覆蓋 **主機** 連接埠映射。
- **Gateway 繫結：** 預設情況下，`run-openclaw-podman.sh` 會以 `--bind loopback` 啟動 gateway 以便安全地從本機存取。若要在區域網路上公開，請設定 `OPENCLAW_GATEWAY_BIND=lan` 並在 `openclaw.json` 中設定 `gateway.controlUi.allowedOrigins`（或明確啟用 host-header 回退機制）。
- **路徑：** 主機配置和工作區預設為 `~openclaw/.openclaw` 和 `~openclaw/.openclaw/workspace`。使用 `OPENCLAW_CONFIG_DIR` 和 `OPENCLAW_WORKSPACE_DIR` 覆寫啟動腳本使用的主機路徑。

## 儲存模型

- **持久化主機資料：** `OPENCLAW_CONFIG_DIR` 和 `OPENCLAW_WORKSPACE_DIR` 會被綁定掛載（bind-mount）到容器中，並在主機上保留狀態。
- **暫時性沙箱 tmpfs：** 如果您啟用 `agents.defaults.sandbox`，工具沙箱容器會將 `tmpfs` 掛載於 `/tmp`、`/var/tmp` 和 `/run`。這些路徑是基於記憶體的，並會隨著沙箱容器消失；頂層 Podman 容器設定不會新增自己的 tmpfs 掛載。
- **磁盤增長熱點：** 需要關注的主要路徑包括 `media/`、`agents/<agentId>/sessions/sessions.json`、轉錄 JSONL 檔案、`cron/runs/*.jsonl`，以及 `/tmp/openclaw/` （或您配置的 `logging.file`）下的滾動檔案日誌。

`scripts/podman/setup.sh` 現在會將映像檔 tar 暫存於專用暫存目錄中，並在設定期間列印所選的基礎目錄。對於非 root 執行，僅當該基礎目錄安全可使用時才接受 `TMPDIR`；否則會退回到 `/var/tmp`，然後是 `/tmp`。儲存的 tar 保持僅所有者可讀，並串流到目標使用者的 `podman load` 中，因此專用的呼叫端暫存目錄不會阻擋設定。

## 實用指令

- **日誌：** 使用 quadlet：`sudo journalctl --machine openclaw@ --user -u openclaw.service -f`。使用 script：`sudo -u openclaw podman logs -f openclaw`
- **停止：** 使用 quadlet：`sudo systemctl --machine openclaw@ --user stop openclaw.service`。使用腳本：`sudo -u openclaw podman stop openclaw`
- **再次啟動：** 使用 quadlet：`sudo systemctl --machine openclaw@ --user start openclaw.service`。使用腳本：重新執行啟動腳本或 `podman start openclaw`
- **移除容器：** `sudo -u openclaw podman rm -f openclaw` — 主機上的設定和工作區會被保留

## 疑難排解

- **設定或 auth-profiles 權限被拒 (EACCES)：** 容器預設為 `--userns=keep-id`，並以與執行腳本的主機使用者相同的 uid/gid 運行。請確保您主機上的 `OPENCLAW_CONFIG_DIR` 和 `OPENCLAW_WORKSPACE_DIR` 是由該使用者擁有的。
- **Gateway 啟動受阻 (缺少 `gateway.mode=local`)：** 請確保 `~openclaw/.openclaw/openclaw.json` 存在並設定 `gateway.mode="local"`。`scripts/podman/setup.sh` 會在缺少該檔案時建立它。
- **Rootless Podman fails for user openclaw:** 檢查 `/etc/subuid` 和 `/etc/subgid` 是否包含 `openclaw` 的一行（例如 `openclaw:100000:65536`）。如果缺失則添加並重新啟動。
- **Container name in use:** 啟動腳本使用 `podman run --replace`，因此當您再次啟動時，現有的容器會被替換。若要手動清理：`podman rm -f openclaw`。
- **Script not found when running as openclaw:** 確保已執行 `scripts/podman/setup.sh`，以便將 `run-openclaw-podman.sh` 複製到 openclaw 的家目錄（例如 `/home/openclaw/run-openclaw-podman.sh`）。
- **找不到或無法啟動 Quadlet 服務：** 編輯 `.container` 檔案後，請執行 `sudo systemctl --machine openclaw@ --user daemon-reload`。Quadlet 需要 cgroups v2：`podman info --format '{{.Host.CgroupsVersion}}'` 應該顯示 `2`。

## 選用：以您自己的使用者身分執行

要以您的正常使用者身分（無專用 openclaw 使用者）執行閘道：建置映像檔，使用 `OPENCLAW_GATEWAY_TOKEN` 建立 `~/.openclaw/.env`，並使用 `--userns=keep-id` 以及掛載到您的 `~/.openclaw` 來執行容器。啟動腳本專為 openclaw-user 流程設計；對於單一使用者設定，您可以改為手動從腳本中執行 `podman run` 指令，並將設定和工作區指向您的家目錄。推薦給大多數使用者：使用 `scripts/podman/setup.sh` 並以 openclaw 使用者身分執行，以便讓設定和程序保持隔離。
