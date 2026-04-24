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
(`qwen-portal`) 已不再提供。
請參閱 [Issue #49557](https://github.com/openclaw/openclaw/issues/49557) 瞭解
背景資訊。

</Warning>

OpenClaw 現在將 Qwen 視為具有規範 ID
`qwen` 的一等內建提供者。此內建提供者以 Qwen Cloud / Alibaba DashScope 和
Coding Plan 端點為目標，並保留舊版 `modelstudio` ID 作為
相容性別名繼續運作。

- 提供者：`qwen`
- 首選環境變數：`QWEN_API_KEY`
- 為了相容性，亦接受：`MODELSTUDIO_API_KEY`、`DASHSCOPE_API_KEY`
- API 風格：OpenAI 相容

<Tip>如果您想要 `qwen3.6-plus`，請優先選擇 **Standard (pay-as-you-go)** 端點。 Coding Plan 的支援可能落後於公開目錄。</Tip>

## 開始使用

選擇您的方案類型並依照設定步驟進行。

<Tabs>
  <Tab title="Coding Plan (subscription)">
    **最適合：**透過 Qwen Coding Plan 進行基於訂閱的存取。

    <Steps>
      <Step title="取得您的 API 金鑰">
        從 [home.qwencloud.com/api-keys](https://home.qwencloud.com/api-keys) 建立或複製 API 金鑰。
      </Step>
      <Step title="執行入門引導">
        針對 **全球** 端點：

        ```bash
        openclaw onboard --auth-choice qwen-api-key
        ```

        針對 **中國** 端點：

        ```bash
        openclaw onboard --auth-choice qwen-api-key-cn
        ```
      </Step>
      <Step title="設定預設模型">
        ```json5
        {
          agents: {
            defaults: {
              model: { primary: "qwen/qwen3.5-plus" },
            },
          },
        }
        ```
      </Step>
      <Step title="驗證模型可用性">
        ```bash
        openclaw models list --provider qwen
        ```
      </Step>
    </Steps>

    <Note>
    舊版 `modelstudio-*` auth-choice ID 與 `modelstudio/...` 模型參照仍可作為相容性別名使用，但新的設定流程應優先使用標準 `qwen-*` auth-choice ID 與 `qwen/...` 模型參照。
    </Note>

  </Tab>

  <Tab title="標準（隨用隨付）">
    **最適合：** 透過標準 Model Studio 端點進行隨用隨付存取，包括可能無法在 Coding Plan 上使用的模型，例如 `qwen3.6-plus`。

    <Steps>
      <Step title="取得您的 API 金鑰">
        從 [home.qwencloud.com/api-keys](https://home.qwencloud.com/api-keys) 建立或複製 API 金鑰。
      </Step>
      <Step title="執行入門設定">
        對於 **Global** 端點：

        ```bash
        openclaw onboard --auth-choice qwen-standard-api-key
        ```

        對於 **China** 端點：

        ```bash
        openclaw onboard --auth-choice qwen-standard-api-key-cn
        ```
      </Step>
      <Step title="設定預設模型">
        ```json5
        {
          agents: {
            defaults: {
              model: { primary: "qwen/qwen3.5-plus" },
            },
          },
        }
        ```
      </Step>
      <Step title="驗證模型可用性">
        ```bash
        openclaw models list --provider qwen
        ```
      </Step>
    </Steps>

    <Note>
    舊版 `modelstudio-*` auth-choice ID 和 `modelstudio/...` 模型參照仍然
    作為相容性別名運作，但新的設定流程應優先使用標準
    `qwen-*` auth-choice ID 和 `qwen/...` 模型參照。
    </Note>

  </Tab>
</Tabs>

## 方案類型與端點

| 方案                  | 區域 | 驗證選擇                   | 端點                                             |
| --------------------- | ---- | -------------------------- | ------------------------------------------------ |
| 標準（隨用隨付）      | 中國 | `qwen-standard-api-key-cn` | `dashscope.aliyuncs.com/compatible-mode/v1`      |
| 標準（隨用隨付）      | 全球 | `qwen-standard-api-key`    | `dashscope-intl.aliyuncs.com/compatible-mode/v1` |
| Coding Plan（訂閱制） | 中國 | `qwen-api-key-cn`          | `coding.dashscope.aliyuncs.com/v1`               |
| Coding Plan（訂閱制） | 全球 | `qwen-api-key`             | `coding-intl.dashscope.aliyuncs.com/v1`          |

提供者會根據您的驗證選擇自動選取端點。標準
選擇使用 `qwen-*` 系列；`modelstudio-*` 僅保留作相容性用途。
您可以在設定中使用自訂 `baseUrl` 覆寫。

<Tip>**管理金鑰：** [home.qwencloud.com/api-keys](https://home.qwencloud.com/api-keys) | **文件：** [docs.qwencloud.com](https://docs.qwencloud.com/developer-guides/getting-started/introduction)</Tip>

## 內建目錄

OpenClaw 目前附帶此內建的 Qwen 目錄。配置的目錄是
端點感知的：Coding Plan 配置會省略僅已知在 Standard
端點上運作的模型。

| 模型參考                    | 輸入       | 上下文    | 備註                                         |
| --------------------------- | ---------- | --------- | -------------------------------------------- |
| `qwen/qwen3.5-plus`         | 文字，圖片 | 1,000,000 | 預設模型                                     |
| `qwen/qwen3.6-plus`         | 文字，圖片 | 1,000,000 | 當您需要此模型時，建議優先使用 Standard 端點 |
| `qwen/qwen3-max-2026-01-23` | 文字       | 262,144   | Qwen Max 系列                                |
| `qwen/qwen3-coder-next`     | 文字       | 262,144   | 編碼                                         |
| `qwen/qwen3-coder-plus`     | 文字       | 1,000,000 | 編碼                                         |
| `qwen/MiniMax-M2.5`         | 文字       | 1,000,000 | 啟用推理                                     |
| `qwen/glm-5`                | 文字       | 202,752   | GLM                                          |
| `qwen/glm-4.7`              | 文字       | 202,752   | GLM                                          |
| `qwen/kimi-k2.5`            | 文字，圖片 | 262,144   | 透過 Alibaba 使用的 Moonshot AI              |

<Note>即使模型出現在內建目錄中，可用性仍可能因端點和計費方案而異。</Note>

## 多模態擴充功能

`qwen` 外掛程式也在 **Standard** DashScope 端點（而非 Coding Plan 端點）上公開了多模態功能：

- **影片理解** 透過 `qwen-vl-max-latest`
- **Wan 影片生成** 透過 `wan2.6-t2v`（預設）、`wan2.6-i2v`、`wan2.6-r2v`、`wan2.6-r2v-flash`、`wan2.7-r2v`

要將 Qwen 作為預設影片提供者：

```json5
{
  agents: {
    defaults: {
      videoGenerationModel: { primary: "qwen/wan2.6-t2v" },
    },
  },
}
```

<Note>請參閱 [影片生成](/zh-Hant/tools/video-generation) 以了解共用工具參數、提供者選擇和故障轉移行為。</Note>

## 進階

<AccordionGroup>
  <Accordion title="影像與影片理解">
    內建的 Qwen 外掛程式會在 **Standard** DashScope 端點（而非 Coding Plan 端點）上註冊影像與影片的媒體理解功能。

    | 屬性      | 值                 |
    | ------------- | --------------------- |
    | 模型         | `qwen-vl-max-latest`  |
    | 支援的輸入 | 影像，影片       |

    媒體理解功能會從設定的 Qwen 驗證中自動解析 — 不需要
    額外的配置。請確保您使用的是 Standard（隨用隨付）
    端點以支援媒體理解功能。

  </Accordion>

  <Accordion title="Qwen 3.6 Plus 可用性">
    `qwen3.6-plus` 可在標準（隨用隨付）Model Studio
    端點上使用：

    - 中國：`dashscope.aliyuncs.com/compatible-mode/v1`
    - 全球：`dashscope-intl.aliyuncs.com/compatible-mode/v1`

    如果 Coding Plan 端點針對
    `qwen3.6-plus` 返回「不支援的模型」錯誤，請切換到標準（隨用隨付）而不是 Coding Plan
    端點/金鑰組合。

  </Accordion>

  <Accordion title="Capability plan">
    `qwen` 外掛程式被定位為完整 Qwen Cloud 表面的供應商主場，而不僅僅是程式碼/文字模型。

    - **文字/聊天模型：** 現已內建
    - **工具呼叫、結構化輸出、思考：** 繼承自 OpenAI 相容傳輸
    - **影像生成：** 計劃在供應商外掛程式層級實現
    - **影像/影片理解：** 現已在 Standard 端點上內建
    - **語音/音訊：** 計劃在供應商外掛程式層級實現
    - **記憶嵌入/重新排序：** 計劃透過嵌入介面卡表面實現
    - **影片生成：** 現已透過共享影片生成功能內建

  </Accordion>

  <Accordion title="視訊生成詳情">
    對於視訊生成，OpenClaw 會在提交任務前將設定的 Qwen 區域對應到相符的
    DashScope AIGC 主機：

    - Global/Intl: `https://dashscope-intl.aliyuncs.com`
    - China: `https://dashscope.aliyuncs.com`

    這意味著指向 Coding Plan 或標準 Qwen 主機的一般 `models.providers.qwen.baseUrl`
    仍能讓視訊生成保持在正確的區域 DashScope 視訊端點上。

    目前內建 Qwen 視訊生成的限制：

    - 每個請求最多 **1** 個輸出視訊
    - 最多 **1** 個輸入圖片
    - 最多 **4** 個輸入視訊
    - 最多 **10 秒** 時長
    - 支援 `size`、`aspectRatio`、`resolution`、`audio` 和 `watermark`
    - 參考圖片/視訊模式目前需要 **遠端 http(s) URL**。由於 DashScope 視訊端點不
      接受針對這些參考的上傳本機緩衝區，本機檔案路徑會在開頭被拒絕。

  </Accordion>

  <Accordion title="串流使用相容性">
    原生 Model Studio 端點在共用的 `openai-completions` 傳輸上宣佈支援串流使用。OpenClaw 現在會關閉端點
    功能，因此指向相同原生主機的 DashScope 相容自訂供應商 ID 會繼承相同的串流使用行為，而不
    需特別要求使用內建的 `qwen` 供應商 ID。

    原生串流使用相容性適用於 Coding Plan 主機和
    標準 DashScope 相容主機：

    - `https://coding.dashscope.aliyuncs.com/v1`
    - `https://coding-intl.dashscope.aliyuncs.com/v1`
    - `https://dashscope.aliyuncs.com/compatible-mode/v1`
    - `https://dashscope-intl.aliyuncs.com/compatible-mode/v1`

  </Accordion>

  <Accordion title="多模態端點區域">
    多模態介面（視訊理解和 Wan 視訊生成）使用
    **標準** DashScope 端點，而非 Coding Plan 端點：

    - Global/Intl 標準基礎 URL: `https://dashscope-intl.aliyuncs.com/compatible-mode/v1`
    - China 標準基礎 URL: `https://dashscope.aliyuncs.com/compatible-mode/v1`

  </Accordion>

  <Accordion title="環境和守護程序設定">
    如果 Gateway 作為守護程序 (launchd/systemd) 執行，請確保該程序可以使用 `QWEN_API_KEY`
    (例如，透過 `~/.openclaw/.env` 或
    `env.shellEnv`)。
  </Accordion>
</AccordionGroup>

## 相關

<CardGroup cols={2}>
  <Card title="模型選擇" href="/zh-Hant/concepts/model-providers" icon="layers">
    選擇提供者、模型參照和故障轉移行為。
  </Card>
  <Card title="視訊生成" href="/zh-Hant/tools/video-generation" icon="video">
    共用的視訊工具參數和提供者選擇。
  </Card>
  <Card title="Alibaba (ModelStudio)" href="/zh-Hant/providers/alibaba" icon="cloud">
    舊版 ModelStudio 提供者和遷移說明。
  </Card>
  <Card title="疑難排解" href="/zh-Hant/help/troubleshooting" icon="wrench">
    一般疑難排解和常見問題。
  </Card>
</CardGroup>
