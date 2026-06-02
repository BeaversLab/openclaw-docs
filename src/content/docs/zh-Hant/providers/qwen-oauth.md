---
summary: "使用 Qwen Portal 提供者 ID 搭配 OpenClaw"
read_when:
  - You want to configure the qwen-oauth provider id
  - You previously used Qwen Portal OAuth credentials
  - You need the Qwen Portal endpoint or migration guidance
title: "Qwen OAuth / Portal"
---

`qwen-oauth` 是 Qwen Portal 提供者 ID。它以 Qwen Portal 端點為目標，並透過獨特的提供者 ID 保持舊版 Qwen OAuth / portal 設定可存取。

當您特別擁有 `https://portal.qwen.ai/v1` 的目前 Qwen Portal 權杖時，或是當您正在遷移較舊的 Qwen Portal / Qwen CLI 設定並希望將這些憑證與標準 Qwen Cloud 提供者分開時，請使用此提供者。這不是新 Qwen 使用者的建議首選。

對於新的 Qwen Cloud 設定，除非您特別擁有目前的 Qwen Portal 權杖，否則建議優先使用標準 ModelStudio 端點的 [Qwen](/zh-Hant/providers/qwen)。

## 設定

透過入門程序提供您的 portal 權杖：

```bash
openclaw onboard --auth-choice qwen-oauth
```

或設定：

```bash
export QWEN_API_KEY="<your-qwen-portal-token>" # pragma: allowlist secret
```

## 預設值

- 提供者：`qwen-oauth`
- 別名：`qwen-portal`, `qwen-cli`
- 基礎 URL：`https://portal.qwen.ai/v1`
- 環境變數：`QWEN_API_KEY`
- API 樣式：OpenAI 相容
- 預設模型：`qwen-oauth/qwen3.5-plus`

## 與 Qwen 的差異

OpenClaw 有兩個面向 Qwen 的提供者 ID：

| 提供者       | 端點系列                                           | 最適用於                                                            |
| ------------ | -------------------------------------------------- | ------------------------------------------------------------------- |
| `qwen`       | Qwen Cloud / Alibaba DashScope 和 Coding Plan 端點 | 新的 API 金鑰設定、標準隨用隨付、Coding Plan、多模態 DashScope 功能 |
| `qwen-oauth` | 位於 `portal.qwen.ai/v1` 的 Qwen Portal 端點       | 現有的 Qwen Portal 權杖和舊版 Qwen OAuth / CLI 設定                 |

這兩個提供者都使用 OpenAI 相容的請求格式，但它們是分開的驗證介面。為 `qwen-oauth` 儲存的權杖不應視為 DashScope 或 ModelStudio 金鑰，而新的 DashScope 金鑰應改用標準的 `qwen` 提供者。

## 何時選擇 Qwen OAuth / Portal

- 您已經有可用的 Qwen Portal 權杖。
- 您在轉移到 OpenClaw 的提供者模型時，正在保留舊版 Qwen OAuth 或 Qwen CLI 工作流程。
- 您需要特別測試與 Qwen Portal 端點的相容性。

對於新的設定、更廣泛的端點選擇、標準 ModelStudio、Coding Plan 以及完整的 Qwen 套件目錄，請選擇 [Qwen](/zh-Hant/providers/qwen)。

## 模型

套件目錄為 Qwen Portal 預設值提供了基礎：

- `qwen-oauth/qwen3.5-plus`

可用性取決於目前的 Qwen Portal 帳戶和權杖。如果您的帳戶改為使用 ModelStudio / DashScope API 金鑰，請設定標準 `qwen` 提供者：

```bash
openclaw onboard --auth-choice qwen-standard-api-key
openclaw models set qwen/qwen3-coder-plus
```

## 移轉

舊版 Qwen Portal OAuth 設定檔可能無法重新整理。如果 portal 設定檔停止運作，請使用目前的權杖重新驗證，或切換至標準 Qwen 提供者：

```bash
openclaw onboard --auth-choice qwen-standard-api-key
```

標準全球 ModelStudio 使用：

```text
https://dashscope-intl.aliyuncs.com/compatible-mode/v1
```

## 疑難排解

- Portal OAuth 重新整理失敗：舊版 Qwen Portal OAuth 設定檔可能無法重新整理。請使用目前的權杖重新執行上架流程。
- 錯誤的端點錯誤：使用 portal 權杖時，請確認模型參照以 `qwen-oauth/` 開頭。僅對標準 Qwen 提供者使用 `qwen/` 參照。
- `QWEN_API_KEY` 混淆：兩個 Qwen 頁面都提到了此環境變數，但上架會將認證資料儲存在選取的提供者 ID 下。當您在同一台機器上保留 `qwen` 和 `qwen-oauth` 時，建議優先使用上架。

## 相關

- [Qwen](/zh-Hant/providers/qwen)
- [Alibaba Model Studio](/zh-Hant/providers/alibaba)
- [模型提供者](/zh-Hant/concepts/model-providers)
- [所有提供者](/zh-Hant/providers/index)
