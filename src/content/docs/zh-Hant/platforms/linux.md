---
summary: "Linux 支援與伴隨應用程式狀態"
read_when:
  - Looking for Linux companion app status
  - Planning platform coverage or contributions
  - Debugging Linux OOM kills or exit 137 on a VPS or container
title: "Linux 應用程式"
---

# Linux 應用程式

Gateway 在 Linux 上受到完整支援。**Node 是建議的執行環境**。
不建議在 Gateway 上使用 Bun（WhatsApp/Telegram 錯誤）。

原生 Linux 伴隨應用程式正在計畫中。如果您願意協助建構，歡迎貢獻。

## 新手快速途徑 (VPS)

1. 安裝 Node 24（推薦；Node 22 LTS，目前為 `22.14+`，為了相容性仍然可用）
2. `npm i -g openclaw@latest`
3. `openclaw onboard --install-daemon`
4. 從您的筆記型電腦： `ssh -N -L 18789:127.0.0.1:18789 <user>@<host>`
5. 開啟 `http://127.0.0.1:18789/` 並使用設定的共享金鑰進行驗證（預設為 token；如果您設定了 `gateway.auth.mode: "password"` 則為密碼）

完整的 Linux 伺服器指南：[Linux Server](/zh-Hant/vps)。逐步的 VPS 範例：[exe.dev](/zh-Hant/install/exe-dev)

## 安裝

- [Getting Started](/zh-Hant/start/getting-started)
- [安裝與更新](/zh-Hant/install/updating)
- 可選流程：[Bun (實驗性)](/zh-Hant/install/bun)、[Nix](/zh-Hant/install/nix)、[Docker](/zh-Hant/install/docker)

## Gateway

- [Gateway runbook](/zh-Hant/gateway)
- [Configuration](/zh-Hant/gateway/configuration)

## Gateway 服務安裝 (CLI)

使用其中一個：

```
openclaw onboard --install-daemon
```

或是：

```
openclaw gateway install
```

或是：

```
openclaw configure
```

當提示時選擇 **Gateway service**。

修復/遷移：

```
openclaw doctor
```

## 系統控制 (systemd user unit)

OpenClaw 預設會安裝一個 systemd **user** 服務。請在共享或持續運行的伺服器上使用 **system** 服務。`openclaw gateway install` 和 `openclaw onboard --install-daemon` 已經為您呈現當前的規範單元；僅在您需要自訂系統/服務管理員設定時才手動撰寫。完整的服務指南位於 [Gateway runbook](/zh-Hant/gateway)。

最小化設定：

建立 `~/.config/systemd/user/openclaw-gateway[-<profile>].service`：

```
[Unit]
Description=OpenClaw Gateway (profile: <profile>, v<version>)
After=network-online.target
Wants=network-online.target

[Service]
ExecStart=/usr/local/bin/openclaw gateway --port 18789
Restart=always
RestartSec=5
TimeoutStopSec=30
TimeoutStartSec=30
SuccessExitStatus=0 143
KillMode=control-group

[Install]
WantedBy=default.target
```

啟用它：

```
systemctl --user enable --now openclaw-gateway[-<profile>].service
```

## 記憶體壓力與 OOM 強制終止

在 Linux 上，當主機、VM 或容器 cgroup 耗盡記憶體時，核心會選擇一個 OOM 受害者。Gateway 可能是個糟糕的受害者，因為它擁有長期存活的會話和通道連線。因此，OpenClaw 盡可能偏優先終止暫時性的子程序，而非 Gateway。

對於符合條件的 Linux 子程序衍生，OpenClaw 會透過一個簡短的 `/bin/sh` 包裝器啟動子程序，該包裝器會將子程序自己的 `oom_score_adj` 提高至 `1000`，然後 `exec`s 實際指令。這是一項無權限操作，因為子程序僅是增加了自己被 OOM 強制終止的可能性。

涵蓋的子進程介面包括：

- 由 supervisor 管理的指令子進程，
- PTY shell 子進程，
- MCP stdio 伺服器子進程，
- 由 OpenClaw 啟動的瀏覽器/Chrome 進程。

此包裝器僅適用於 Linux，當 `/bin/sh` 不可用時會跳過。如果子進程環境設定了 `OPENCLAW_CHILD_OOM_SCORE_ADJ=0`、`false`、`no` 或 `off`，也會跳過。

若要驗證子進程：

```bash
cat /proc/<child-pid>/oom_score_adj
```

涵蓋之子進程的預期值為 `1000`。Gateway 進程應保持其正常分數，通常為 `0`。

這並不能取代正常的記憶體調整。如果 VPS 或容器持續終止子進程，請增加記憶體限制、減少併發數，或新增更強的資源控制，例如 systemd `MemoryMax=` 或容器層級的記憶體限制。
