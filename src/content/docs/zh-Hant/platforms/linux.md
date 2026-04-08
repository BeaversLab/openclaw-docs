---
summary: "Linux 支援與伴隨應用程式狀態"
read_when:
  - Looking for Linux companion app status
  - Planning platform coverage or contributions
title: "Linux 應用程式"
---

# Linux 應用程式

Gateway 在 Linux 上受到完整支援。**Node 是建議的執行環境**。
不建議在 Gateway 上使用 Bun（WhatsApp/Telegram 錯誤）。

原生 Linux 伴隨應用程式正在計畫中。如果您願意協助建構，歡迎貢獻。

## 新手快速途徑 (VPS)

1. 安裝 Node 24（建議；Node 22 LTS，目前為 `22.14+`，為了相容性仍可使用）
2. `npm i -g openclaw@latest`
3. `openclaw onboard --install-daemon`
4. 從您的筆記型電腦：`ssh -N -L 18789:127.0.0.1:18789 <user>@<host>`
5. 開啟 `http://127.0.0.1:18789/` 並使用設定的共享金鑰進行驗證（預設為 token；若您設定了 `gateway.auth.mode: "password"` 則為密碼）

完整的 Linux 伺服器指南：[Linux Server](/en/vps)。逐步的 VPS 範例：[exe.dev](/en/install/exe-dev)

## 安裝

- [開始使用](/en/start/getting-started)
- [安裝與更新](/en/install/updating)
- 可選流程：[Bun (實驗性)](/en/install/bun)、[Nix](/en/install/nix)、[Docker](/en/install/docker)

## Gateway

- [Gateway 執行手冊](/en/gateway)
- [設定](/en/gateway/configuration)

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

OpenClaw 預設會安裝一個 systemd **user** 服務。請對共用或全天候運行的伺服器使用 **system** 服務。`openclaw gateway install` 和 `openclaw onboard --install-daemon` 已經為您呈現當前的標準單元；僅在您需要自訂 system/service-manager 設定時才需要手動撰寫。完整的服務指南位於 [Gateway runbook](/en/gateway)。

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
