---
summary: "Linux 支援 + 伴隨應用程式狀態"
read_when:
  - 尋找 Linux 伴隨應用程式狀態
  - 規劃平台涵蓋範圍或貢獻
title: "Linux App"
---

# Linux App

Gateway 在 Linux 上獲得完全支援。**Node 是推薦的執行環境**。
不建議在 Gateway 上使用 Bun（WhatsApp/Telegram 有錯誤）。

原生 Linux 伴隨應用程式正在計畫中。如果您願意協助建構其中一個，歡迎貢獻。

## 新手快速途徑 (VPS)

1. 安裝 Node 24（推薦；Node 22 LTS，目前 `22.16+`，仍可相容使用）
2. `npm i -g openclaw@latest`
3. `openclaw onboard --install-daemon`
4. 從您的筆記型電腦：`ssh -N -L 18789:127.0.0.1:18789 <user>@<host>`
5. 開啟 `http://127.0.0.1:18789/` 並貼上您的 token

逐步 VPS 指南：[exe.dev](/zh-Hant/install/exe-dev)

## 安裝

- [快速入門](/zh-Hant/start/getting-started)
- [安裝與更新](/zh-Hant/install/updating)
- 其他選項：[Bun (實驗性)](/zh-Hant/install/bun)、[Nix](/zh-Hant/install/nix)、[Docker](/zh-Hant/install/docker)

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

系統提示時選擇 **Gateway service**。

修復/遷移：

```
openclaw doctor
```

## 系統控制 (systemd 使用者單元)

OpenClaw 預設會安裝一個 systemd **使用者** 服務。請使用 **系統**
服務來應對共用或永遠線上的伺服器。完整的單元範例和指導
位於 [Gateway 操作手冊](/zh-Hant/gateway)。

最精簡設定：

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

import en from "/components/footer/en.mdx";

<en />
