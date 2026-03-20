---
summary: "OpenClaw 入門選項與流程概覽"
read_when:
  - 選擇入門途徑
  - 設定新環境
title: "入門概覽"
sidebarTitle: "入門概覽"
---

# 入門概覽

OpenClaw 支援多種入門途徑，取決於 Gateway 的執行位置以及您偏好如何設定提供者。

## 選擇您的入門途徑

- **CLI 入門**，適用於 macOS、Linux 和 Windows (透過 WSL2)。
- **macOS 應用程式**，適用於 Apple 晶片或 Intel Mac 的引導式首次執行。

## CLI 入門

在終端機中執行入門：

```bash
openclaw onboard
```

當您想要完全控制 Gateway、工作區、頻道和技能時，請使用 CLI 入門。文件：

- [入門 (CLI)](/zh-Hant/start/wizard)
- [`openclaw onboard` 指令](/zh-Hant/cli/onboard)

## macOS 應用程式入門

當您希望在 macOS 上進行完全引導式的設定時，請使用 OpenClaw 應用程式。文件：

- [入門 (macOS App)](/zh-Hant/start/onboarding)

## 自訂提供者

如果您需要的端點未列於其中，包括公開標準 OpenAI 或 Anthropic API 的託管提供者，請在 CLI 入門中選擇 **Custom Provider**。系統將會要求您：

- 選擇 OpenAI 相容、Anthropic 相容，或 **Unknown** (自動偵測)。
- 輸入基礎 URL 和 API 金鑰 (如果提供者有要求)。
- 提供模型 ID 和選用的別名。
- 選擇端點 ID，以便多個自訂端點可以同時存在。

如需詳細步驟，請依照上述 CLI 入門文件操作。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
