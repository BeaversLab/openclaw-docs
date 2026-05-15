---
summary: "OpenClaw 中的阿里雲 Model Studio Wan 視訊生成"
title: "阿里雲 Model Studio"
read_when:
  - You want to use Alibaba Wan video generation in OpenClaw
  - You need Model Studio or DashScope API key setup for video generation
---

OpenClaw 附帶一個內建的 `alibaba` 外掛程式，該程式在阿里雲 Model Studio（DashScope 的國際名稱）上為 Wan 模型註冊了一個視訊生成供應商。此外掛程式預設為啟用；您只需要設定一個 API 金鑰。

| 屬性          | 值                                                                              |
| ------------- | ------------------------------------------------------------------------------- |
| 供應商 ID     | `alibaba`                                                                       |
| 外掛程式      | 內建, `enabledByDefault: true`                                                  |
| 驗證環境變數  | `MODELSTUDIO_API_KEY` → `DASHSCOPE_API_KEY` → `QWEN_API_KEY` (第一個符合的優先) |
| 上架標誌      | `--auth-choice alibaba-model-studio-api-key`                                    |
| 直接 CLI 標誌 | `--alibaba-model-studio-api-key <key>`                                          |
| 預設模型      | `alibaba/wan2.6-t2v`                                                            |
| 預設基礎 URL  | `https://dashscope-intl.aliyuncs.com`                                           |

## 開始使用

<Steps>
  <Step title="設定 API 金鑰">
    使用上架功能將金鑰儲存到 `alibaba` 供應商：

    ```bash
    openclaw onboard --auth-choice alibaba-model-studio-api-key
    ```

    或在安裝/上架期間直接傳遞金鑰：

    ```bash
    openclaw onboard --alibaba-model-studio-api-key <your-key>
    ```

    或在啟動 Gateway 之前匯出任何接受的環境變數：

    ```bash
    export MODELSTUDIO_API_KEY=sk-...
    # or DASHSCOPE_API_KEY=...
    # or QWEN_API_KEY=...
    ```

  </Step>
  <Step title="設定預設視訊模型">
    ```json5
    {
      agents: {
        defaults: {
          videoGenerationModel: {
            primary: "alibaba/wan2.6-t2v",
          },
        },
      },
    }
    ```
  </Step>
  <Step title="驗證供應商已設定">
    ```bash
    openclaw models list --provider alibaba
    ```

    清單應包含所有五個內建的 Wan 模型。如果 `MODELSTUDIO_API_KEY` 未解析，`openclaw models status --json` 會在 `auth.unusableProfiles` 下回報缺少憑證。

  </Step>
</Steps>

<Note>Alibaba 外掛程式和 [Qwen 外掛程式](/zh-Hant/providers/qwen) 都對 DashScope 進行驗證並接受重疊的環境變數。使用 `alibaba/...` 模型 ID 來驅動專用的 Wan 視訊介面；當您想要 Qwen 的聊天、嵌入或媒體理解介面時，請使用 `qwen/...` ID。</Note>

## 內建 Wan 模型

| 模型參照                   | 模式                 |
| -------------------------- | -------------------- |
| `alibaba/wan2.6-t2v`       | 文字生成視訊（預設） |
| `alibaba/wan2.6-i2v`       | 圖生影片             |
| `alibaba/wan2.6-r2v`       | 參考生影片           |
| `alibaba/wan2.6-r2v-flash` | 參考生影片（快速）   |
| `alibaba/wan2.7-r2v`       | 參考生影片           |

## 功能與限制

內建提供者反映了 DashScope 的 Wan 影片 API 限制。這三種模式共用相同的單次請求影片數量與持續時間上限；僅輸入形態不同。

| 模式       | 最大輸出影片數 | 最大輸入圖片數 | 最大輸入影片數 | 最長持續時間 | 支援的控制項                                              |
| ---------- | -------------- | -------------- | -------------- | ------------ | --------------------------------------------------------- |
| 文生影片   | 1              | n/a            | n/a            | 10 秒        | `size`、`aspectRatio`、`resolution`、`audio`、`watermark` |
| 圖生影片   | 1              | 1              | n/a            | 10 秒        | `size`、`aspectRatio`、`resolution`、`audio`、`watermark` |
| 參考生影片 | 1              | n/a            | 4              | 10 秒        | `size`、`aspectRatio`、`resolution`、`audio`、`watermark` |

當請求省略 `durationSeconds` 時，提供者會發送 DashScope 接受的預設值 **5 秒**。若要延長至 10 秒，請在 [影片生成工具](/zh-Hant/tools/video-generation) 上明確設定 `durationSeconds`。

<Warning>參考圖片與影片輸入必須是遠端 `http(s)` URL。DashScope 的參考模式不接受本機檔案路徑；請先上傳至物件儲存，或使用會產生公開 URL 的 [媒體工具](/zh-Hant/tools/media-overview) 流程。</Warning>

## 進階設定

<AccordionGroup>
  <Accordion title="覆寫 DashScope 基礎 URL">
    提供者預設使用國際版 DashScope 端點。若要指定中國區端點，請設定：

    ```json5
    {
      models: {
        providers: {
          alibaba: {
            baseUrl: "https://dashscope.aliyuncs.com",
          },
        },
      },
    }
    ```

    提供者在建構 AIGC 任務 URL 前會移除結尾斜線。

  </Accordion>

  <Accordion title="Auth env priority">
    OpenClaw 會依下列順序從環境變數中解析 Alibaba API 金鑰，並採用第一個非空值：

    1. `MODELSTUDIO_API_KEY`
    2. `DASHSCOPE_API_KEY`
    3. `QWEN_API_KEY`

    設定的 `auth.profiles` 項目（透過 `openclaw models auth login` 設定）會覆蓋環境變數解析。請參閱 [模型常見問題中的驗證設定檔](/zh-Hant/help/faq-models#what-is-an-auth-profile) 以了解設定檔輪替、冷卻和覆蓋機制。

  </Accordion>

  <Accordion title="Relationship to the Qwen plugin">
    這兩個內建外掛都與 DashScope 通訊並接受重疊的 API 金鑰。使用：

    - `alibaba/wan*.*` ID 來驅動本頁記錄的專用 Wan 視訊提供者。
    - `qwen/*` ID 進行 Qwen 聊天、嵌入和媒體理解（請參閱 [Qwen](/zh-Hant/providers/qwen)）。

    由於驗證環境變數清單刻意重疊，只需設定一次 `MODELSTUDIO_API_KEY` 即可驗證這兩個外掛；您無需分別為每個外掛進行設定。

  </Accordion>
</AccordionGroup>

## 相關

<CardGroup cols={2}>
  <Card title="Video generation" href="/zh-Hant/tools/video-generation" icon="video">
    共用的視訊工具參數與提供者選擇。
  </Card>
  <Card title="Qwen" href="/zh-Hant/providers/qwen" icon="microchip">
    在相同的 DashScope 驗證上設定 Qwen 聊天、嵌入和媒體理解。
  </Card>
  <Card title="Configuration reference" href="/zh-Hant/gateway/config-agents#agent-defaults" icon="gear">
    Agent 預設值與模型設定。
  </Card>
  <Card title="Models FAQ" href="/zh-Hant/help/faq-models" icon="circle-question">
    驗證設定檔、切換模型以及解決「無設定檔」錯誤。
  </Card>
</CardGroup>
