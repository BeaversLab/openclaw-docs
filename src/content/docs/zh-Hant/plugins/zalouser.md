---
summary: "Zalo Personal 外掛程式：透過原生 zca-js 進行 QR 登入 + 傳訊（外掛程式安裝 + 頻道設定 + 工具）"
read_when:
  - You want Zalo Personal (unofficial) support in OpenClaw
  - You are configuring or developing the zalouser plugin
title: "Zalo Personal 外掛程式"
---

# Zalo Personal（外掛程式）

透過外掛程式為 OpenClaw 提供 Zalo Personal 支援，使用原生 `zca-js` 自動化一般 Zalo 使用者帳戶。

> **警告：** 非官方自動化可能導致帳戶停權或封鎖。使用風險自負。

## 命名

頻道 ID 為 `zalouser`，以明確表示這是用於自動化 **個人 Zalo 使用者帳戶**（非官方）。我們將 `zalo` 保留給未來可能推出的官方 Zalo API 整合。

## 執行位置

此外掛程式在 **閘道程序內部** 執行。

如果您使用遠端閘道，請在 **執行閘道的機器上** 安裝/設定，然後重新啟動閘道。

不需要外部的 `zca`/`openzca` CLI 二進制文件。

## 安裝

### 選項 A：從 npm 安裝

```exec
openclaw plugins install @openclaw/zalouser
```

之後重啟 Gateway。

### 選項 B：從本地文件夾安裝（開發用）

```exec
openclaw plugins install ./extensions/zalouser
cd ./extensions/zalouser && pnpm install
```

之後重啟 Gateway。

## 配置

頻道配置位於 `channels.zalouser` 下（而非 `plugins.entries.*`）：

```json5
{
  channels: {
    zalouser: {
      enabled: true,
      dmPolicy: "pairing",
    },
  },
}
```

## CLI

```exec
openclaw channels login --channel zalouser
openclaw channels logout --channel zalouser
openclaw channels status --probe
openclaw message send --channel zalouser --target <threadId> --message "Hello from OpenClaw"
openclaw directory peers list --channel zalouser --query "name"
```

## Agent 工具

工具名稱：`zalouser`

動作：`send`、`image`、`link`、`friends`、`groups`、`me`、`status`

頻道訊息動作也支援用於訊息反應的 `react`。
