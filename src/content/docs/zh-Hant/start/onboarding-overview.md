---
summary: "OpenClaw 入門選項與流程概述"
read_when:
  - Choosing an onboarding path
  - Setting up a new environment
title: "入門概述"
sidebarTitle: "入門概述"
---

# 入門概述

OpenClaw 有兩種入門途徑。兩者都會設定認證、Gateway 和
選用頻道 —— 它們的區別僅在於您與設定過程的互動方式。

## 我應該使用哪種途徑？

|            | CLI 入門                             | macOS 應用程式入門    |
| ---------- | ------------------------------------ | --------------------- |
| **平台**   | macOS、Linux、Windows（原生或 WSL2） | 僅限 macOS            |
| **介面**   | 終端機精靈                           | 應用程式中的引導式 UI |
| **最適合** | 伺服器、無介面環境、完全控制         | 桌面 Mac、視覺化設定  |
| **自動化** | `--non-interactive` 用於腳本         | 僅限手動              |
| **指令**   | `openclaw onboard`                   | 啟動應用程式          |

大多數使用者應該從 **CLI 入門** 開始 —— 它適用於任何地方，並提供
您最大的控制權。

## 入門設定了什麼

無論您選擇哪種途徑，入門都會設定：

1. **模型提供者和認證** — 您選擇的提供者的 API 金鑰、OAuth 或設定權杖
2. **工作區** — 用於代理程式檔案、引導範本和記憶體的目錄
3. **Gateway** — 連接埠、綁定位址、認證模式
4. **頻道**（選用）— WhatsApp、Telegram、Discord 等
5. **背景程式**（選用）— 背景服務，讓 Gateway 自動啟動

## CLI 入門

在任何終端機中執行：

```exec
openclaw onboard
```

新增 `--install-daemon` 以一步安裝背景服務。

完整參考：[入門 (CLI)](/zh-Hant/start/wizard)
CLI 指令文件：[`openclaw onboard`](/zh-Hant/cli/onboard)

## macOS 應用程式入門

開啟 OpenClaw 應用程式。首次執行精靈會透過視覺化介面引導您完成相同的步驟。

完整參考：[入門 (macOS 應用程式)](/zh-Hant/start/onboarding)

## 自訂或未列出的提供者

如果您的提供者未列在入門選項中，請選擇 **自訂提供者** 並
輸入：

- API 相容性模式（OpenAI 相容、Anthropic 相容或自動偵測）
- 基本 URL 和 API 金鑰
- 模型 ID 和選用別名

多個自訂端點可以共存 — 每個都有其自己的端點 ID。
