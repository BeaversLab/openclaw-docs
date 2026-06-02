---
summary: "透過 OpenClaw 的內建 qwen 提供者使用 Qwen Cloud"
read_when:
  - You want to use Qwen with OpenClaw
  - You previously used Qwen OAuth
title: "Qwen"
---

OpenClaw 現在將 Qwen 視為具有標準 ID
`qwen` 的一等內建提供者。此內建提供者以 Qwen Cloud / Alibaba DashScope 和 Coding Plan 端點為目標，保留舊版 `modelstudio` ID 作為相容性
別名，並將 Qwen Portal 權杖流程公開為提供者 `qwen-oauth`。

- 提供者：`qwen`
- Portal 提供者：[`qwen-oauth`](/zh-Hant/providers/qwen-oauth)
- 首選環境變數：`QWEN_API_KEY`
- 為相容性也接受：`MODELSTUDIO_API_KEY`、`DASHSCOPE_API_KEY`
- API 風格： OpenAI 相容

<Tip>如果您想要 `qwen3.6-plus`，請優先使用 **Standard (pay-as-you-go)** 端點。 Coding Plan 的支援可能會落後於公開目錄。</Tip>

## 開始使用

選擇您的方案類型並依照設定步驟操作。

<Tabs>
  <Tab title="Coding Plan (subscription)">
    **最適用於：** 透過 Qwen Coding Plan 進行訂閱制存取。

    <Steps>
      <Step title="取得您的 API 金鑰">
        從 [home.qwencloud.com/api-keys](https://home.qwencloud.com/api-keys) 建立或複製 API 金鑰。
      </Step>
      <Step title="執行上架流程">
        若是針對 **全球** 端點：

        ```bash
        openclaw onboard --auth-choice qwen-api-key
        ```

        若是針對 **中國** 端點：

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
      <Step title="驗證模型是否可用">
        ```bash
        openclaw models list --provider qwen
        ```
      </Step>
    </Steps>

    <Note>
    舊版的 `modelstudio-*` auth-choice id 與 `modelstudio/...` 模型參照
    仍可作為相容性別名運作，但新的設定流程應優先使用標準
    `qwen-*` auth-choice id 與 `qwen/...` 模型參照。若您定義了
    具有其他 `api` 值的精確自訂 `models.providers.modelstudio` 項目，
    則該自訂供應商將擁有 `modelstudio/...` 參照，而非 Qwen 相容性別名。
    </Note>

  </Tab>

  <Tab title="標準版（隨用隨付）">
    **最適合用於：** 透過標準 Model Studio 端點進行隨用隨付存取，包含可能無法在 Coding Plan 上取得的模型（例如 `qwen3.6-plus`）。

    <Steps>
      <Step title="取得您的 API 金鑰">
        從 [home.qwencloud.com/api-keys](https://home.qwencloud.com/api-keys) 建立或複製 API 金鑰。
      </Step>
      <Step title="執行入門引導">
        針對 **Global** 端點：

        ```bash
        openclaw onboard --auth-choice qwen-standard-api-key
        ```

        針對 **China** 端點：

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
      <Step title="驗證模型是否可用">
        ```bash
        openclaw models list --provider qwen
        ```
      </Step>
    </Steps>

    <Note>
    舊版 `modelstudio-*` auth-choice ID 與 `modelstudio/...` 模型參照仍然可以作為相容性別名運作，但新的設定流程應優先使用標準的 `qwen-*` auth-choice ID 與 `qwen/...` 模型參照。如果您定義了一個具有其他 `api` 值的確切自訂 `models.providers.modelstudio` 項目，則該自訂供應商將擁有 `modelstudio/...` 參照，而不是 Qwen 相容性別名。
    </Note>

  </Tab>

  <Tab title="Qwen OAuth / Portal">
    **最適合：**針對 `https://portal.qwen.ai/v1` 的 Qwen Portal 權杖。

    參閱 [Qwen OAuth / Portal](/zh-Hant/providers/qwen-oauth) 以取得專屬提供者頁面與遷移說明。

    <Steps>
      <Step title="提供您的 portal 權杖">
        ```bash
        openclaw onboard --auth-choice qwen-oauth
        ```
      </Step>
      <Step title="設定預設模型">
        ```json5
        {
          agents: {
            defaults: {
              model: { primary: "qwen-oauth/qwen3.5-plus" },
            },
          },
        }
        ```
      </Step>
      <Step title="驗證模型可用性">
        ```bash
        openclaw models list --provider qwen-oauth
        ```
      </Step>
    </Steps>

    <Note>
    `qwen-oauth` 使用與 DashScope 提供者相同的 `QWEN_API_KEY` 環境變數名稱，但在透過 OpenClaw 引導設定時，會將驗證資訊儲存在 `qwen-oauth` 提供者 ID 下。
    </Note>

  </Tab>
</Tabs>

## 方案類型與端點

| 方案        | 區域 | 驗證選擇                   | 端點                                             |
| ----------- | ---- | -------------------------- | ------------------------------------------------ |
| 標準方案    | 中國 | `qwen-standard-api-key-cn` | `dashscope.aliyuncs.com/compatible-mode/v1`      |
| 標準方案    | 全球 | `qwen-standard-api-key`    | `dashscope-intl.aliyuncs.com/compatible-mode/v1` |
| 編碼方案    | 中國 | `qwen-api-key-cn`          | `coding.dashscope.aliyuncs.com/v1`               |
| 編碼方案    | 全球 | `qwen-api-key`             | `coding-intl.dashscope.aliyuncs.com/v1`          |
| Qwen Portal | 全球 | `qwen-oauth`               | `portal.qwen.ai/v1`                              |

此提供者會根據您的驗證選擇自動選取端點。標準選項使用 `qwen-*` 系列；`modelstudio-*` 僅保留作為相容性用途。您可以在設定中使用自訂 `baseUrl` 來覆寫。

<Tip>**管理金鑰：** [home.qwencloud.com/api-keys](https://home.qwencloud.com/api-keys) | **文件：** [docs.qwencloud.com](https://docs.qwencloud.com/developer-guides/getting-started/introduction)</Tip>

## 內建目錄

OpenClaw 目前隨附此捆綁的 Qwen 目錄。設定的目錄具備端點感知功能：編碼方案設定會省略僅已知可在標準端點上運作的模型。

| 模型參照                    | 輸入       | 語境      | 備註                                         |
| --------------------------- | ---------- | --------- | -------------------------------------------- |
| `qwen/qwen3.5-plus`         | 文字、圖片 | 1,000,000 | 預設模型                                     |
| `qwen/qwen3.6-plus`         | 文字、圖像 | 1,000,000 | 當您需要此模型時，建議優先使用 Standard 端點 |
| `qwen/qwen3-max-2026-01-23` | 文字       | 262,144   | Qwen Max 系列產品                            |
| `qwen/qwen3-coder-next`     | 文字       | 262,144   | 程式碼編寫                                   |
| `qwen/qwen3-coder-plus`     | 文字       | 1,000,000 | 程式碼編寫                                   |
| `qwen/MiniMax-M2.5`         | 文字       | 1,000,000 | 已啟用推理                                   |
| `qwen/glm-5`                | 文字       | 202,752   | GLM                                          |
| `qwen/glm-4.7`              | 文字       | 202,752   | GLM                                          |
| `qwen/kimi-k2.5`            | 文字、圖像 | 262,144   | 透過阿里雲存取 Moonshot AI                   |
| `qwen-oauth/qwen3.5-plus`   | 文字、圖像 | 1,000,000 | Qwen Portal 預設值                           |

<Note>即使模型包含在捆綁目錄中，可用性仍可能因端點和計費方案而異。</Note>

## 思考控制

對於已啟用推理的 Qwen Cloud 模型，捆綁提供者會將 OpenClaw 思考等級
對應至 DashScope 的頂層 `enable_thinking` 請求旗標。停用
思考會發送 `enable_thinking: false`；其他思考等級則會發送
`enable_thinking: true`。

## 多模態附加功能

`qwen` 外掛程式也在 **Standard**
DashScope 端點（而非 Coding Plan 端點）上公開多模態功能：

- 透過 `qwen-vl-max-latest` **理解影片**
- 透過 `wan2.6-t2v`（預設）、`wan2.6-i2v`、`wan2.6-r2v`、`wan2.6-r2v-flash`、`wan2.7-r2v` 進行 **Wan 影片生成**

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

<Note>請參閱 [影片生成](/zh-Hant/tools/video-generation) 以了解共用工具參數、提供者選擇和容錯移轉行為。</Note>

## 進階設定

<AccordionGroup>
  <Accordion title="圖像與視訊理解">
    內建的 Qwen 外掛程式會在 **標準** DashScope 端點（而非 Coding Plan 端點）上
    註冊圖像與視訊的媒體理解功能。

    | 屬性      | 值                 |
    | ------------- | --------------------- |
    | 模型         | `qwen-vl-max-latest`  |
    | 支援的輸入 | 圖像、視訊       |

    媒體理解功能會從已設定的 Qwen 驗證資訊自動解析 — 不需要
    額外的設定。請確保您使用的是標準（隨用隨付）
    端點以獲得媒體理解支援。

  </Accordion>

  <Accordion title="Qwen 3.6 Plus 可用性">
    `qwen3.6-plus` 可在標準（隨用隨付）Model Studio
    端點上使用：

    - 中國：`dashscope.aliyuncs.com/compatible-mode/v1`
    - 全球：`dashscope-intl.aliyuncs.com/compatible-mode/v1`

    如果 Coding Plan 端點對於
    `qwen3.6-plus` 傳回「不支援的模型」錯誤，請改用標準（隨用隨付）而非 Coding Plan
    端點/金鑰組合。

    OpenClaw 的內建 Qwen 型錄不會在 Coding
    Plan 端點上宣佈 `qwen3.6-plus`，但會在 Coding Plan baseUrls 上接受明確設定的 `qwen/qwen3.6-plus` 項目（位於
    `models.providers.qwen.models` 之下），因此如果
    Aliyun 在您的訂閱中啟用了該模型，您可以選擇啟用該模型。上游 API 仍會決定呼叫是否成功。

  </Accordion>

  <Accordion title="功能計畫">
    `qwen` 外掛程式正被定位為完整 Qwen
    Cloud 表面的供應商首頁，而不僅僅是編碼/文字模型。

    - **文字/聊天模型：** 現已內建
    - **工具呼叫、結構化輸出、思考：** 繼承自 OpenAI 相容傳輸
    - **圖像生成：** 計畫在 provider-plugin 層級實現
    - **圖像/視訊理解：** 現已在標準端點上內建
    - **語音/音訊：** 計畫在 provider-plugin 層級實現
    - **記憶嵌入/重排序：** 計畫透過 embedding adapter 表面實現
    - **視訊生成：** 現已透過共用的視訊生成功能內建

  </Accordion>

  <Accordion title="視訊生成詳情">
    針對視訊生成，OpenClaw 會在提交任務前，將設定的 Qwen 區域對應至相應的
    DashScope AIGC 主機：

    - Global/Intl: `https://dashscope-intl.aliyuncs.com`
    - China: `https://dashscope.aliyuncs.com`

    這意味著一個指向 Coding Plan 或標準 Qwen 主機的常規 `models.providers.qwen.baseUrl` 仍然能夠將視訊生成保持在
    正確區域的 DashScope 視訊端點上。

    目前內建 Qwen 視訊生成的限制：

    - 每次請求最多輸出 **1** 個視訊
    - 最多 **1** 張輸入圖片
    - 最多 **4** 個輸入視訊
    - 長度最長 **10 秒**
    - 支援 `size`、`aspectRatio`、`resolution`、`audio` 和 `watermark`
    - 參考圖片/視訊模式目前需要 **遠端 http(s) URL**。本地
      檔案路徑會在一開始就被拒絕，因為 DashScope 視訊端點不會針對這些參考接受
      上傳的本地緩衝區。

  </Accordion>

  <Accordion title="串流使用相容性">
    原生 Model Studio 端點在共享的 `openai-completions` 傳輸上宣佈支援串流使用相容性。
    OpenClaw 現在會關閉端點功能，因此指向相同原生主機且與 DashScope 相容的自訂供應商 ID
    會繼承相同的串流使用行為，而無需特別要求使用內建的 `qwen` 供應商 ID。

    原生串流使用相容性同時適用於 Coding Plan 主機和標準的 DashScope 相容主機：

    - `https://coding.dashscope.aliyuncs.com/v1`
    - `https://coding-intl.dashscope.aliyuncs.com/v1`
    - `https://dashscope.aliyuncs.com/compatible-mode/v1`
    - `https://dashscope-intl.aliyuncs.com/compatible-mode/v1`

  </Accordion>

  <Accordion title="多模態端點區域">
    多模態介面（視訊理解和 Wan 視訊生成）使用的是
    **標準** DashScope 端點，而非 Coding Plan 端點：

    - Global/Intl Standard base URL: `https://dashscope-intl.aliyuncs.com/compatible-mode/v1`
    - China Standard base URL: `https://dashscope.aliyuncs.com/compatible-mode/v1`

  </Accordion>

  <Accordion title="環境與守護程式設定">
    如果 Gateway 以守護程式 (launchd/systemd) 執行，請確保 `QWEN_API_KEY` 可供該程序使用 (例如，在 `~/.openclaw/.env` 中或透過 `env.shellEnv`)。
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
    舊版 ModelStudio 提供者與移駁注意事項。
  </Card>
  <Card title="疑難排解" href="/zh-Hant/help/troubleshooting" icon="wrench">
    一般疑難排解與常見問題。
  </Card>
</CardGroup>
