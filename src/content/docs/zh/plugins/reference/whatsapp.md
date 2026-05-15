---
summary: "添加用于发送和接收 WhatsApp 消息的 OpenClaw 渠道表面。"
read_when:
  - You are installing, configuring, or auditing the whatsapp plugin
title: "WhatsApp 插件"
---

# WhatsApp 插件

添加用于发送和接收 WhatsApp 消息的 OpenClaw 渠道表面。

## 分发

- 包：`@openclaw/whatsapp`
- 安装途径：npm；ClawHub

## 表面

channels: whatsapp

## Windows 安装说明

在 Windows 上，WhatsApp 插件在 npm 安装期间需要 `PATH` 上的 Git，因为它的一个 Baileys/libsignal 依赖项是从 git URL 获取的。安装 Git for Windows，然后重启 shell 并重新运行安装：

```powershell
winget install --id Git.Git -e
```

如果便携式 Git 的 `bin` 目录位于 `PATH` 上，则也可以使用便携式 Git。

## 相关文档

- [whatsapp](/zh/channels/whatsapp)
