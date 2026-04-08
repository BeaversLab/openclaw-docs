---
summary: "透過 OpenClaw 內建的 qwen 提供者使用 Qwen Cloud"
read_when:
  - You want to use Qwen with OpenClaw
  - You previously used Qwen OAuth
title: "Qwen"
---

# Qwen

<Warning>

**Qwen OAuth 已移除。** 使用 `portal.qwen.ai` 端點的免費層 OAuth 整合
(`qwen-portal`) 不再可用。
請參閱 [Issue #49557](https://github.com/openclaw/openclaw/issues/49557) 了解
背景資訊。

</Warning>

## 推薦：Qwen Cloud

OpenClaw 現在將 Qwen 視為一流的內建提供者，其正式 ID 為
`qwen`。該內建提供者以 Qwen Cloud / Alibaba DashScope 和
Coding Plan 端點為目標，並讓舊版 `modelstudio` ID 作為相容性別名繼續運作。

- 提供者：`qwen`
- 偏好的環境變數：`QWEN_API_KEY`
- 為了相容性也接受：`MODELSTUDIO_API_KEY`、`DASHSCOPE_API_KEY`
- API 風格：OpenAI 相容

如果您想要 `qwen3.6-plus`，請優先選擇 **標準** 端點。
Coding Plan 支援可能會落後於公開目錄。

```bash
# Global Coding Plan endpoint
openclaw onboard --auth-choice qwen-api-key

# China Coding Plan endpoint
openclaw onboard --auth-choice qwen-api-key-cn

# Global Standard (pay-as-you-go) endpoint
openclaw onboard --auth-choice qwen-standard-api-key

# China Standard (pay-as-you-go) endpoint
openclaw onboard --auth-choice qwen-standard-api-key-cn
```

舊版 `modelstudio-*` 驗證選擇 ID 和 `modelstudio/...` 模型參照
仍可作為相容性別名使用，但新的設定流程應優先使用正式的
`qwen-*` 驗證選擇 ID 和 `qwen/...` 模型參照。

註冊後，設定預設模型：

```json5
{
  agents: {
    defaults: {
      model: { primary: "qwen/qwen3.5-plus" },
    },
  },
}
```

## 方案類型與端點

| 方案                 | 區域 | 驗證選擇                   | 端點                                             |
| -------------------- | ---- | -------------------------- | ------------------------------------------------ |
| 標準                 | 中國 | `qwen-standard-api-key-cn` | `dashscope.aliyuncs.com/compatible-mode/v1`      |
| 標準                 | 全球 | `qwen-standard-api-key`    | `dashscope-intl.aliyuncs.com/compatible-mode/v1` |
| Coding Plan (訂閱制) | 中國 | `qwen-api-key-cn`          | `coding.dashscope.aliyuncs.com/v1`               |
| Coding Plan (訂閱制) | 全球 | `qwen-api-key`             | `coding-intl.dashscope.aliyuncs.com/v1`          |

提供者會根據您的驗證選擇自動選取端點。正式
選擇使用 `qwen-*` 系列；`modelstudio-*` 僅保留作為相容用途。
您可以在設定中透過自訂 `baseUrl` 來覆蓋。

原生 Model Studio 端點在共享的 `openai-completions` 傳輸上宣佈支援串流使用相容性。OpenClaw 金鑶現在會關閉端點功能，因此針對相同原生主機且相容 DashScope 的自訂供應商 ID 會繼承相同的串流使用行為，而不需要特別使用內建的 `qwen` 供應商 ID。

## 取得您的 API 金鑰

- **管理金鑰**：[home.qwencloud.com/api-keys](https://home.qwencloud.com/api-keys)
- **文件**：[docs.qwencloud.com](https://docs.qwencloud.com/developer-guides/getting-started/introduction)

## 內建目錄

OpenClaw 目前隨附此 Qwen 套件目錄：

| 模型參考                    | 輸入       | 上下文    | 備註                                   |
| --------------------------- | ---------- | --------- | -------------------------------------- |
| `qwen/qwen3.5-plus`         | 文字、影像 | 1,000,000 | 預設模型                               |
| `qwen/qwen3.6-plus`         | 文字、影像 | 1,000,000 | 當您需要此模型時，建議優先使用標準端點 |
| `qwen/qwen3-max-2026-01-23` | 文字       | 262,144   | Qwen Max 系列                          |
| `qwen/qwen3-coder-next`     | 文字       | 262,144   | 編碼                                   |
| `qwen/qwen3-coder-plus`     | 文字       | 1,000,000 | 編碼                                   |
| `qwen/MiniMax-M2.5`         | 文字       | 1,000,000 | 已啟用推理                             |
| `qwen/glm-5`                | 文字       | 202,752   | GLM                                    |
| `qwen/glm-4.7`              | 文字       | 202,752   | GLM                                    |
| `qwen/kimi-k2.5`            | 文字、影像 | 262,144   | 透過阿里巴巴提供的 Moonshot AI         |

即使模型存在於套件目錄中，可用性仍可能因端點和計費方案而異。

原生串流使用相容性適用於「編碼方案」主機和標準 DashScope 相容主機：

- `https://coding.dashscope.aliyuncs.com/v1`
- `https://coding-intl.dashscope.aliyuncs.com/v1`
- `https://dashscope.aliyuncs.com/compatible-mode/v1`
- `https://dashscope-intl.aliyuncs.com/compatible-mode/v1`

## Qwen 3.6 Plus 可用性

`qwen3.6-plus` 可於標準 (隨用隨付) Model Studio 端點上使用：

- 中國：`dashscope.aliyuncs.com/compatible-mode/v1`
- 全球：`dashscope-intl.aliyuncs.com/compatible-mode/v1`

如果編碼方案端點針對 `qwen3.6-plus` 傳回「不支援的模型」錯誤，請切換至標準 (隨用隨付)，而非使用編碼方案端點/金鑰組。

## 功能方案

`qwen` 擴充功能正被定位為完整 Qwen Cloud 表面的供應商主頁，不僅僅是編碼/文字模型。

- 文字/聊天模型：現已整合
- 工具呼叫、結構化輸出、思考：繼承自 OpenAI 相容傳輸
- 圖片生成：計劃於 provider-plugin 層實施
- 圖片/影片理解：現已在 Standard 端點上整合
- 語音/音訊：計劃於 provider-plugin 層實施
- 記憶嵌入/重排序：計劃透過 embedding adapter 介面實施
- 影片生成：現已透過共用的影片生成功能整合

## 多模態擴充功能

`qwen` 擴充功能現在也公開：

- 透過 `qwen-vl-max-latest` 進行影片理解
- Wan 影片生成透過：
  - `wan2.6-t2v` (預設)
  - `wan2.6-i2v`
  - `wan2.6-r2v`
  - `wan2.6-r2v-flash`
  - `wan2.7-r2v`

這些多模態介面使用 **Standard** DashScope 端點，而非
Coding Plan 端點。

- 全球/國際 Standard 基礎 URL：`https://dashscope-intl.aliyuncs.com/compatible-mode/v1`
- 中國 Standard 基礎 URL：`https://dashscope.aliyuncs.com/compatible-mode/v1`

對於影片生成，OpenClaw 會在提交工作前，將設定的 Qwen 區域對應至相應的
DashScope AIGC 主機：

- 全球/國際：`https://dashscope-intl.aliyuncs.com`
- 中國：`https://dashscope.aliyuncs.com`

這意味著，指向 Coding Plan 或 Standard Qwen 主機的
一般 `models.providers.qwen.baseUrl` 仍會將影片生成保持在正確的
區域 DashScope 影片端點上。

對於影片生成，請明確設定預設模型：

```json5
{
  agents: {
    defaults: {
      videoGenerationModel: { primary: "qwen/wan2.6-t2v" },
    },
  },
}
```

目前整合的 Qwen 影片生成限制：

- 每個請求最多 **1** 部輸出影片
- 最多 **1** 張輸入圖片
- 最多 **4** 部輸入影片
- 最長 **10 秒** 時長
- 支援 `size`、`aspectRatio`、`resolution`、`audio` 和 `watermark`
- 參考圖片/影片模式目前需要 **遠端 http(s) URLs**。由於 DashScope 影片端點不接受
  針對這些參考的上傳本機緩衝區，本機檔案路徑會在開始時被拒絕。

請參閱 [影片生成](/en/tools/video-generation) 以了解共用工具
參數、提供者選擇和容錯移轉行為。

## 環境注意事項

如果 Gateway 作為守護程序 (launchd/systemd) 執行，請確保該程序可使用 `QWEN_API_KEY` (例如，在 `~/.openclaw/.env` 中或透過 `env.shellEnv`)。
