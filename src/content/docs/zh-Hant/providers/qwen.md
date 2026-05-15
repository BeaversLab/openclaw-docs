---
summary: "透過 OpenClaw 內建的 qwen 提供者使用 Qwen Cloud"
read_when:
  - You want to use Qwen with OpenClaw
  - You previously used Qwen OAuth
title: "Qwen"
---

<Warning>

**Qwen OAuth 已移除。** 使用 `portal.qwen.ai` 端點的免費層 OAuth 整合
(`qwen-portal`) 不再可用。
請參閱 [Issue #49557](https://github.com/openclaw/openclaw/issues/49557) 瞭解
背景資訊。

</Warning>

OpenClaw 現在將 Qwen 視為一等內建供應商，其規範 ID 為
`qwen`。此內建供應商以 Qwen Cloud / Alibaba DashScope 和
Coding Plan 端點為目標，並讓舊版的 `modelstudio` ID 能作為
相容性別名繼續運作。

- 供應商： `qwen`
- 偏好的環境變數： `QWEN_API_KEY`
- 為相容性也接受： `MODELSTUDIO_API_KEY`, `DASHSCOPE_API_KEY`
- API 風格： OpenAI 相容

<Tip>如果您想要 `qwen3.6-plus`，請優先選擇 **標準** 端點。 Coding Plan 的支援可能會落後於公開目錄。</Tip>

## 開始使用

選擇您的方案類型並依照設定步驟操作。

<Tabs>
  <Tab title="Coding Plan (subscription)">
    **最適用於：** 透過 Qwen Coding Plan 進行訂閱式存取。

    <Steps>
      <Step title="Get your API key">
        從 [home.qwencloud.com/api-keys](https://home.qwencloud.com/api-keys) 建立或複製 API 金鑰。
      </Step>
      <Step title="Run onboarding">
        針對 **Global** 端點：

        ```bash
        openclaw onboard --auth-choice qwen-api-key
        ```

        針對 **China** 端點：

        ```bash
        openclaw onboard --auth-choice qwen-api-key-cn
        ```
      </Step>
      <Step title="Set a default model">
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
      <Step title="Verify the model is available">
        ```bash
        openclaw models list --provider qwen
        ```
      </Step>
    </Steps>

    <Note>
    舊版 `modelstudio-*` auth-choice ID 和 `modelstudio/...` 模型參照仍
    可作為相容性別名運作，但新的設定流程應優先使用標準
    `qwen-*` auth-choice ID 和 `qwen/...` 模型參照。如果您定義了具有其他 `api` 值的
    精確自訂 `models.providers.modelstudio` 項目，則該
    自訂供應商將擁有 `modelstudio/...` 參照，而非 Qwen 相容性
    別名。
    </Note>

  </Tab>

  <Tab title="標準（隨用隨付）">
    **最適合於：** 透過標準 Model Studio 端點進行隨用隨付存取，包括可能在 Coding Plan 上無法使用的模型，例如 `qwen3.6-plus`。

    <Steps>
      <Step title="取得您的 API 金鑰">
        從 [home.qwencloud.com/api-keys](https://home.qwencloud.com/api-keys) 建立或複製 API 金鑰。
      </Step>
      <Step title="執行入門引導">
        若是 **Global** 端點：

        ```bash
        openclaw onboard --auth-choice qwen-standard-api-key
        ```

        若是 **China** 端點：

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
    舊版的 `modelstudio-*` auth-choice id 和 `modelstudio/...` 模型參照仍可作為相容性別名使用，但新的設定流程應優先使用正式的 `qwen-*` auth-choice id 和 `qwen/...` 模型參照。如果您定義了具有其他 `api` 值的精確自訂 `models.providers.modelstudio` 項目，則該自訂供應商將擁有 `modelstudio/...` 參照，而不是 Qwen 相容性別名。
    </Note>

  </Tab>
</Tabs>

## 方案類型與端點

| 方案                       | 區域 | Auth choice                | 端點                                             |
| -------------------------- | ---- | -------------------------- | ------------------------------------------------ |
| Standard (pay-as-you-go)   | 中國 | `qwen-standard-api-key-cn` | `dashscope.aliyuncs.com/compatible-mode/v1`      |
| Standard (pay-as-you-go)   | 全球 | `qwen-standard-api-key`    | `dashscope-intl.aliyuncs.com/compatible-mode/v1` |
| Coding Plan (subscription) | 中國 | `qwen-api-key-cn`          | `coding.dashscope.aliyuncs.com/v1`               |
| Coding Plan (subscription) | 全球 | `qwen-api-key`             | `coding-intl.dashscope.aliyuncs.com/v1`          |

此提供者會根據您的 auth choice 自動選擇端點。標準選項使用 `qwen-*` 系列選項；`modelstudio-*` 僅保留作相容性使用。
您可以在設定中使用自訂 `baseUrl` 進行覆寫。

<Tip>**管理金鑰：** [home.qwencloud.com/api-keys](https://home.qwencloud.com/api-keys) | **文件：** [docs.qwencloud.com](https://docs.qwencloud.com/developer-guides/getting-started/introduction)</Tip>

## 內建目錄

OpenClaw 目前附帶此內建的 Qwen 目錄。已配置的目錄
具有端點感知功能：Coding Plan 配置會省略僅已知在
Standard 端點上運作的模型。

| 模型參考                    | 輸入       | 上下文    | 備註                                         |
| --------------------------- | ---------- | --------- | -------------------------------------------- |
| `qwen/qwen3.5-plus`         | 文字、圖像 | 1,000,000 | 預設模型                                     |
| `qwen/qwen3.6-plus`         | 文字、圖像 | 1,000,000 | 當您需要此模型時，建議優先使用 Standard 端點 |
| `qwen/qwen3-max-2026-01-23` | 文字       | 262,144   | Qwen Max 系列                                |
| `qwen/qwen3-coder-next`     | 文字       | 262,144   | 編碼                                         |
| `qwen/qwen3-coder-plus`     | 文字       | 1,000,000 | 編碼                                         |
| `qwen/MiniMax-M2.5`         | 文字       | 1,000,000 | 已啟用推理                                   |
| `qwen/glm-5`                | 文字       | 202,752   | GLM                                          |
| `qwen/glm-4.7`              | 文字       | 202,752   | GLM                                          |
| `qwen/kimi-k2.5`            | 文字、圖像 | 262,144   | 透過 Alibaba 提供的 Moonshot AI              |

<Note>即使模型出現在內建目錄中，其可用性仍可能因端點和計費方案而異。</Note>

## 思考控制

對於已啟用推理的 Qwen Cloud 模型，內建提供者會將 OpenClaw
思考層級對應至 DashScope 的頂層 `enable_thinking` 請求標誌。停用
思考會發送 `enable_thinking: false`；其他思考層級會發送
`enable_thinking: true`。

## 多模態附加功能

`qwen` 外掛程式也會在 **Standard**
DashScope 端點（而非 Coding Plan 端點）上公開多模態功能：

- **影片理解** 透過 `qwen-vl-max-latest`
- **Wan 影片生成** 透過 `wan2.6-t2v` (預設)、`wan2.6-i2v`、`wan2.6-r2v`、`wan2.6-r2v-flash`、`wan2.7-r2v`

若要將 Qwen 作為預設影片提供者：

```json5
{
  agents: {
    defaults: {
      videoGenerationModel: { primary: "qwen/wan2.6-t2v" },
    },
  },
}
```

<Note>請參閱 [影片生成](/zh-Hant/tools/video-generation) 以了解共用工具參數、供應商選擇和容錯移轉行為。</Note>

## 進階配置

<AccordionGroup>
  <Accordion title="圖像與視訊理解">
    隨附的 Qwen 外掛程式在 **Standard** DashScope 端點（非 Coding Plan 端點）上註冊了圖像和視訊的媒體理解功能。

    | 屬性      | 值                 |
    | ------------- | --------------------- |
    | 模型         | `qwen-vl-max-latest`  |
    | 支援的輸入 | 圖像、視訊       |

    媒體理解功能會從設定的 Qwen 驗證自動解析 — 不需要額外的設定。請確保您使用的是 Standard (pay-as-you-go) 端點以支援媒體理解功能。

  </Accordion>

  <Accordion title="Qwen 3.6 Plus 可用性">
    `qwen3.6-plus` 可在標準（隨用隨付）Model Studio
    端點上使用：

    - 中國：`dashscope.aliyuncs.com/compatible-mode/v1`
    - 全球：`dashscope-intl.aliyuncs.com/compatible-mode/v1`

    如果 Coding Plan 端點針對
    `qwen3.6-plus` 返回「不支援的模型」錯誤，請切換到標準（隨用隨付）計畫，而不是 Coding Plan
    端點/金鑰組合。

    OpenClaw 的內建 Qwen 目錄不在 Coding
    Plan 端點上公布 `qwen3.6-plus`，但在 `models.providers.qwen.models` 下明確設定的 `qwen/qwen3.6-plus` 項目會在 Coding Plan baseUrl 上受到尊重，因此如果 Aliyun 在您的訂閱中啟用了該模型，您可以選擇加入該模型。
    上游 API 仍會決定呼叫是否成功。

  </Accordion>

  <Accordion title="功能計畫">
    `qwen` 外掛程式正被定位為完整 Qwen
    Cloud 表面的供應商主體，而不僅僅是編碼/文字模型。

    - **文字/聊天模型：** 現已內建
    - **工具呼叫、結構化輸出、思考：** 繼承自 OpenAI 相容傳輸層
    - **影像生成：** 計畫在 provider-plugin 層級實現
    - **影像/影片理解：** 現已在標準端點上內建
    - **語音/音訊：** 計畫在 provider-plugin 層級實現
    - **記憶嵌入/重新排序：** 計畫通過嵌入介面卡表面實現
    - **影片生成：** 現已通過共享的影片生成功能內建

  </Accordion>

  <Accordion title="視訊生成細節">
    針對視訊生成，OpenClaw 會在提交任務前，將設定的 Qwen 區域對應到相符的
    DashScope AIGC 主機：

    - 全球/國際：`https://dashscope-intl.aliyuncs.com`
    - 中國：`https://dashscope.aliyuncs.com`

    這意味著，指向 Coding Plan 或標準 Qwen 主機的常規 `models.providers.qwen.baseUrl`
    仍會將視訊生成保持在正確的區域 DashScope 視訊端點上。

    目前內建的 Qwen 視訊生成限制：

    - 每次請求最多 **1** 個輸出視訊
    - 最多 **1** 張輸入圖片
    - 最多 **4** 個輸入視訊
    - 最長 **10 秒** 時長
    - 支援 `size`、`aspectRatio`、`resolution`、`audio` 和 `watermark`
    - 參考圖片/視訊模式目前需要 **遠端 http(s) URL**。由於 DashScope
      視訊端點不接受針對這些參考上傳的本機緩衝區，本機檔案路徑會在開始時被拒絕。

  </Accordion>

  <Accordion title="串流使用相容性">
    原生 Model Studio 端點在共用的 `openai-completions` 傳輸上宣稱支援串流使用。
    OpenClaw 現在會讀取端點功能，因此指向相同原生主機的 DashScope 相容自訂提供者 ID
    會繼承相同的串流使用行為，而不需要特別使用內建的 `qwen` 提供者 ID。

    原生串流使用相容性同時適用於 Coding Plan 主機和標準 DashScope 相容主機：

    - `https://coding.dashscope.aliyuncs.com/v1`
    - `https://coding-intl.dashscope.aliyuncs.com/v1`
    - `https://dashscope.aliyuncs.com/compatible-mode/v1`
    - `https://dashscope-intl.aliyuncs.com/compatible-mode/v1`

  </Accordion>

  <Accordion title="多模態端點區域">
    多模態介面（視訊理解和 Wan 視訊生成）使用
    **標準** DashScope 端點，而非 Coding Plan 端點：

    - 全球/國際標準基礎 URL：`https://dashscope-intl.aliyuncs.com/compatible-mode/v1`
    - 中國標準基礎 URL：`https://dashscope.aliyuncs.com/compatible-mode/v1`

  </Accordion>

  <Accordion title="Environment and daemon setup">
    如果 Gateway 作為守護行程 (launchd/systemd) 執行，請確保 `QWEN_API_KEY`
    對該行程可用（例如，在 `~/.openclaw/.env` 中或透過
    `env.shellEnv`）。
  </Accordion>
</AccordionGroup>

## 相關

<CardGroup cols={2}>
  <Card title="模型選擇" href="/zh-Hant/concepts/model-providers" icon="layers">
    選擇提供者、模型參照和故障轉移行為。
  </Card>
  <Card title="影片生成" href="/zh-Hant/tools/video-generation" icon="video">
    共用的影片工具參數與提供者選擇。
  </Card>
  <Card title="Alibaba (ModelStudio)" href="/zh-Hant/providers/alibaba" icon="cloud">
    舊版 ModelStudio 提供者與遷移說明。
  </Card>
  <Card title="疑難排解" href="/zh-Hant/help/troubleshooting" icon="wrench">
    一般疑難排解與常見問題。
  </Card>
</CardGroup>
