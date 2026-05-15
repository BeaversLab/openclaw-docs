---
summary: "新增用於傳送和接收 OpenClaw 訊息的 WhatsApp 頻道介面。"
read_when:
  - You are installing, configuring, or auditing the whatsapp plugin
title: "WhatsApp 外掛程式"
---

# WhatsApp 外掛程式

新增用於傳送和接收 OpenClaw 訊息的 WhatsApp 頻道介面。

## 發行版本

- 套件：`@openclaw/whatsapp`
- 安裝途徑：npm；ClawHub

## 介面

頻道：whatsapp

## Windows 安裝注意事項

在 Windows 上，WhatsApp 外掛程式在 npm install 期間需要 Git 位於 `PATH` 中，因為其其中一個 Baileys/libsignal 相依項是從 git URL 取得的。請安裝 Git for Windows，然後重新啟動 Shell 並重新執行安裝：

```powershell
winget install --id Git.Git -e
```

如果其 `bin` 目錄位於 `PATH` 上，便攜式 Git (Portable Git) 也可以運作。

## 相關文件

- [whatsapp](/zh-Hant/channels/whatsapp)
