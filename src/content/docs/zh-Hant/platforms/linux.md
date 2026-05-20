---
summary: "Linux 支援與伴隨應用程式狀態"
read_when:
  - Looking for Linux companion app status
  - Planning platform coverage or contributions
  - Debugging Linux OOM kills or exit 137 on a VPS or container
title: "Linux 應用程式"
---

Gateway 完全支援 Linux。**Node 是建議的執行環境**。
不建議在 Gateway 上使用 Bun（會有 WhatsApp/Telegram 的錯誤）。

原生 Linux 伴隨應用程式正在計畫中。如果您願意協助建構，歡迎貢獻。

## 初學者快速入門 (VPS)

1. 安裝 Node 24（建議；Node 22 LTS，目前為 `22.19+`，仍可相容使用）
2. `npm i -g openclaw@latest`
3. `openclaw onboard --install-daemon`
4. 從您的筆記型電腦： `ssh -N -L 18789:127.0.0.1:18789 <user>@<host>`
5. 開啟 `http://127.0.0.1:18789/` 並使用設定的共用金鑰進行驗證（預設為 token；如果您設定了 `gateway.auth.mode: "password"` 則為密碼）

完整 Linux 伺服器指南：[Linux Server](/zh-Hant/vps)。逐步 VPS 範例：[exe.dev](/zh-Hant/install/exe-dev)

## 安裝

- [Getting Started](/zh-Hant/start/getting-started)
- [Install & updates](/zh-Hant/install/updating)
- 其他選擇性流程：[Bun (experimental)](/zh-Hant/install/bun)、[Nix](/zh-Hant/install/nix)、[Docker](/zh-Hant/install/docker)

## Gateway

- [Gateway runbook](/zh-Hant/gateway)
- [Configuration](/zh-Hant/gateway/configuration)

## Gateway 服務安裝 (CLI)

使用下列其中之一：

```
openclaw onboard --install-daemon
```

或：

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

OpenClaw 預設會安裝一個 systemd **使用者** 服務。請針對共用或
永遠運作的伺服器使用 **系統** 服務。`openclaw gateway install` 和
`openclaw onboard --install-daemon` 已經為您轉譯目前的規範單元；
僅在您需要自訂系統/服務管理員設定時才手動撰寫。完整的服務指南位於
[Gateway runbook](/zh-Hant/gateway)。

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

## 記憶體壓力與 OOM 殺程序

在 Linux 上，當主機、VM 或容器 cgroup 耗盡記憶體時，核心會選擇
一個 OOM 受害者。Gateway 可能不是一個好的受害者，因為它擁有長期的
會話和通道連線。因此，OpenClaw 盡可能會偏愛將短暫的子程序
在 Gateway 之前終止。

對於符合條件的 Linux 子進程，OpenClaw 會通過一個簡短的
`/bin/sh` 包裝器啟動子進程，該包裝器將子進程自己的 `oom_score_adj` 提高到
`1000`，然後 `exec` 真正的命令。這是一個無特權操作，因為子進程
只是增加自己的 OOM 殺死可能性。

覆蓋的子進程表面包括：

- 由 supervisor 管理的命令子進程，
- PTY shell 子進程，
- MCP stdio 伺服器子進程，
- 由 OpenClaw 啟動的瀏覽器/Chrome 進程。

該包裝器僅適用於 Linux，當 `/bin/sh` 不可用時會跳過。如果
子進程環境設置了 `OPENCLAW_CHILD_OOM_SCORE_ADJ=0`、`false`、
`no` 或 `off`，也會跳過。

要驗證子進程：

```bash
cat /proc/<child-pid>/oom_score_adj
```

覆蓋子進程的期望值為 `1000`。Gateway 進程應保持
其正常分數，通常為 `0`。

這不能取代正常的記憶體調整。如果 VPS 或容器反覆
殺死子進程，請增加記憶體限制、減少並發性，或添加更強的
資源控制，例如 systemd `MemoryMax=` 或容器級別的記憶體限制。

## 相關

- [安裝概述](/zh-Hant/install)
- [Linux 伺服器](/zh-Hant/vps)
- [Raspberry Pi](/zh-Hant/platforms/raspberry-pi)
