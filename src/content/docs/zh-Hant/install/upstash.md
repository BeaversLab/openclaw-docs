---
summary: "在 Upstash Box 上託管 OpenClaw，並提供保持連線和 SSH 隧道存取功能"
read_when:
  - Deploying OpenClaw to Upstash Box
  - You want a managed Linux environment for OpenClaw with SSH-tunneled dashboard access
title: "Upstash Box"
---

在 Upstash Box 上執行持續運作的 OpenClaw Gateway，這是一個具備保持連線生命週期支援的受管理 Linux 環境。

使用 SSH 隧道來存取儀表板。請勿將 Gateway 連接埠直接暴露至公開網際網路。

## 先決條件

- Upstash 帳戶
- 保持連線 (Keep-alive) 的 Upstash Box
- 您本機上的 SSH 用戶端

## 建立 Box

在 Upstash Console 中建立一個保持連線的 Box。請記下 Box ID（例如
`right-flamingo-14486`）以及您的 Box API 金鑰。

Upstash 在 [OpenClaw Setup](https://upstash.com/docs/box/guides/openclaw-setup) 維護其最新的 OpenClaw Box 逐步指南。

## 使用 SSH 隧道連線

將 OpenClaw 儀表板連接埠轉發到您的本機。當系統提示時，使用您的 Box API 金鑰
作為 SSH 密碼：

```bash
ssh -o ServerAliveInterval=15 -o ServerAliveCountMax=3 -L 18789:127.0.0.1:18789 <box-id>@us-east-1.box.upstash.com
```

保持連線選項可減少初始化設定期間因閒置而斷線的情況。

## 安裝 OpenClaw

在 Box 內部：

```bash
sudo npm install -g openclaw
```

## 執行初始化設定

```bash
openclaw onboard --install-daemon
```

依照提示操作。當初始化設定完成時，請複製儀表板 URL 和權杖。

## 啟動 Gateway

為 Box 網路設定 Gateway 並在背景啟動它：

```bash
openclaw config set gateway.bind lan
nohup openclaw gateway > gateway.log 2>&1 &
```

啟動 SSH 隧道後，在本地開啟儀表板 URL：

```text
http://127.0.0.1:18789/#token=<your-token>
```

## 自動重新啟動

將此指令設為 Box init script，這樣當 Box
啟動時 Gateway 就會重新啟動：

```bash
nohup openclaw gateway > gateway.log 2>&1 &
```

## 疑難排解

如果在初始化設定期間 SSH 凍結，請使用乾淨的 SSH 設定和
keepalives 重新連線：

```bash
ssh -F /dev/null -o ControlMaster=no -o ServerAliveInterval=15 -o ServerAliveCountMax=3 -L 18789:127.0.0.1:18789 <box-id>@us-east-1.box.upstash.com
```

這會繞過過時的本機 `~/.ssh/config` 設定，並在網路閒置期間
保持隧道啟動狀態。

## 相關連結

- [遠端存取](/zh-Hant/gateway/remote)
- [Gateway 安全性](/zh-Hant/gateway/security)
- [更新 OpenClaw](/zh-Hant/install/updating)
