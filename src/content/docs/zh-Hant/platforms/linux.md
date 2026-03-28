---
summary: "Linux 支援 + 伴隨應用程式狀態"
read_when:
  - Looking for Linux companion app status
  - Planning platform coverage or contributions
title: "Linux App"
---

# Linux App

Gateway 在 Linux 上受到完全支援。**Node 是建議的執行環境**。
不建議在 Gateway 上使用 Bun（WhatsApp/Telegram 錯誤）。

原生 Linux 伴隨應用程式已在計劃中。如果您願意協助建構，歡迎貢獻。

## 初學者快速路徑 (VPS)

1. 安裝 Node 24（建議；目前為 `22.16+` 的 Node 22 LTS 仍為了相容性而運作正常）
2. `npm i -g openclaw@latest`
3. `openclaw onboard --install-daemon`
4. 從您的筆記型電腦： `ssh -N -L 18789:127.0.0.1:18789 <user>@<host>`
5. 開啟 `http://127.0.0.1:18789/` 並貼上您的 token

完整的 Linux 伺服器指南：[Linux Server](/zh-Hant/vps)。逐步 VPS 範例：[exe.dev](/zh-Hant/install/exe-dev)

## 安裝

- [開始使用](/zh-Hant/start/getting-started)
- [安裝與更新](/zh-Hant/install/updating)
- 可選流程：[Bun (實驗性)](/zh-Hant/install/bun)、[Nix](/zh-Hant/install/nix)、[Docker](/zh-Hant/install/docker)

## Gateway

- [Gateway 操作手冊](/zh-Hant/gateway)
- [設定](/zh-Hant/gateway/configuration)

## Gateway 服務安裝 (CLI)

使用其中之一：

```
openclaw onboard --install-daemon
```

或：

```
openclaw gateway install
```

或：

```
openclaw configure
```

系統提示時，選擇 **Gateway service**。

修復/遷移：

```
openclaw doctor
```

## 系統控制 (systemd 使用者單元)

OpenClaw 預設安裝 systemd **user** 服務。請在共用或 24/7 運行的伺服器上使用 **system** 服務。完整的單元範例與指南位於 [Gateway 操作手冊](/zh-Hant/gateway)。

最小設定：

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

[Install]
WantedBy=default.target
```

啟用它：

```
systemctl --user enable --now openclaw-gateway[-<profile>].service
```
