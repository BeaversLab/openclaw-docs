---
summary: "Linux 支援 + 伴隨應用程式狀態"
read_when:
  - Looking for Linux companion app status
  - Planning platform coverage or contributions
title: "Linux 應用程式"
---

# Linux 應用程式

Gateway 在 Linux 上獲得完整支援。**Node 是建議的執行時期**。
不建議在 Gateway 上使用 Bun（存在 WhatsApp/Telegram 錯誤）。

原生 Linux 伴隨應用程式已在計畫中。如果您願意協助建構，歡迎貢獻。

## 初學者快速途徑 (VPS)

1. 安裝 Node 24（建議；目前為 `22.16+` 的 Node 22 LTS 仍可用於相容性）
2. `npm i -g openclaw@latest`
3. `openclaw onboard --install-daemon`
4. 從您的筆記型電腦：`ssh -N -L 18789:127.0.0.1:18789 <user>@<host>`
5. 開啟 `http://127.0.0.1:18789/` 並貼上您的權杖

逐步 VPS 指南：[exe.dev](/zh-Hant/install/exe-dev)

## 安裝

- [開始使用](/zh-Hant/start/getting-started)
- [安裝與更新](/zh-Hant/install/updating)
- 選用流程：[Bun（實驗性）](/zh-Hant/install/bun)、[Nix](/zh-Hant/install/nix)、[Docker](/zh-Hant/install/docker)

## Gateway

- [Gateway 手冊](/zh-Hant/gateway)
- [組態設定](/zh-Hant/gateway/configuration)

## Gateway 服務安裝 (CLI)

使用其中一項：

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

當系統提示時，選取 **Gateway service**。

修復/遷移：

```
openclaw doctor
```

## 系統控制 (systemd 使用者單元)

OpenClaw 預設安裝 systemd **user** 服務。請針對共用或
24/7 運作的伺服器使用 **system** 服務。完整的單元範例
與指南位於 [Gateway 手冊](/zh-Hant/gateway)。

最簡設定：

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

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
