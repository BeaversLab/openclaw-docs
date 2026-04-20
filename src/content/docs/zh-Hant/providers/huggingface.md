---
summary: "Hugging Face Inference 設定（驗證 + 模型選擇）"
read_when:
  - You want to use Hugging Face Inference with OpenClaw
  - You need the HF token env var or CLI auth choice
title: "Hugging Face (Inference)"
---

# Hugging Face (Inference)

[Hugging Face Inference Providers](https://huggingface.co/docs/inference-providers) 提供透過單一路由器 API 相容 OpenAI 的聊天完成。您可以透過一個 Token 存取多種模型（DeepSeek、Llama 等）。OpenClaw 使用 **OpenAI 相容端點**（僅限聊天完成）；若需文字轉圖片、嵌入或語音功能，請直接使用 [HF 推論用戶端](https://huggingface.co/docs/api-inference/quicktour)。

- 供應商：`huggingface`
- 驗證：`HUGGINGFACE_HUB_TOKEN` 或 `HF_TOKEN`（具有 **Make calls to Inference Providers** 權限的精細權限 Token）
- API：OpenAI 相容 (`https://router.huggingface.co/v1`)
- 計費：單一 HF Token；[價格](https://huggingface.co/docs/inference-providers/pricing) 依照供應商費率並提供免費層級。

## 開始使用

<Steps>
  <Step title="建立精細權限 Token">
    前往 [Hugging Face Settings Tokens](https://huggingface.co/settings/tokens/new?ownUserPermissions=inference.serverless.write&tokenType=fineGrained) 並建立一個新的精細權限 Token。

    <Warning>
    Token 必須啟用 **Make calls to Inference Providers** 權限，否則 API 請求將會被拒絕。
    </Warning>

  </Step>
  <Step title="執行引導設定">
    在供應商下拉選單中選擇 **Hugging Face**，然後在提示時輸入您的 API 金鑰：

    ```bash
    openclaw onboard --auth-choice huggingface-api-key
    ```

  </Step>
  <Step title="選取預設模型">
    在 **Default Hugging Face model** 下拉選單中，挑選您想要的模型。當您擁有有效的 Token 時，清單會從推論 API 載入；否則會顯示內建清單。您的選擇會被儲存為預設模型。

    您也可以稍後在設定中設定或變更預設模型：

    ```json5
    {
      agents: {
        defaults: {
          model: { primary: "huggingface/deepseek-ai/DeepSeek-R1" },
        },
      },
    }
    ```

  </Step>
  <Step title="驗證模型是否可用">
    ```bash
    openclaw models list --provider huggingface
    ```
  </Step>
</Steps>

### 非互動式設定

```bash
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice huggingface-api-key \
  --huggingface-api-key "$HF_TOKEN"
```

這將會設定 `huggingface/deepseek-ai/DeepSeek-R1` 為預設模型。

## 模型 ID

模型參照使用 `huggingface/<org>/<model>` 格式（Hub 風格 ID）。以下清單來自 **GET** `https://router.huggingface.co/v1/models`；您的目錄可能包含更多內容。

| 模型                   | 參照（加上 `huggingface/` 前綴）    |
| ---------------------- | ----------------------------------- |
| DeepSeek R1            | `deepseek-ai/DeepSeek-R1`           |
| DeepSeek V3.2          | `deepseek-ai/DeepSeek-V3.2`         |
| Qwen3 8B               | `Qwen/Qwen3-8B`                     |
| Qwen2.5 7B Instruct    | `Qwen/Qwen2.5-7B-Instruct`          |
| Qwen3 32B              | `Qwen/Qwen3-32B`                    |
| Llama 3.3 70B Instruct | `meta-llama/Llama-3.3-70B-Instruct` |
| Llama 3.1 8B Instruct  | `meta-llama/Llama-3.1-8B-Instruct`  |
| GPT-OSS 120B           | `openai/gpt-oss-120b`               |
| GLM 4.7                | `zai-org/GLM-4.7`                   |
| Kimi K2.5              | `moonshotai/Kimi-K2.5`              |

<Tip>您可以將 `:fastest` 或 `:cheapest` 附加到任何模型 ID。您可以在 [推論提供者設定](https://hf.co/settings/inference-providers) 中設定預設順序；請參閱 [推論提供者](https://huggingface.co/docs/inference-providers) 及 **GET** `https://router.huggingface.co/v1/models` 以取得完整清單。</Tip>

## 進階詳細資訊

<AccordionGroup>
  <Accordion title="模型探索與上線下拉式選單">
    OpenClaw 透過直接呼叫 **推論端點** 來探索模型：

    ```bash
    GET https://router.huggingface.co/v1/models
    ```

    （選用：傳送 `Authorization: Bearer $HUGGINGFACE_HUB_TOKEN` 或 `$HF_TOKEN` 以取得完整清單；部分端點在未經授權的情況下僅傳回子集。）回應為 OpenAI 格式的 `{ "object": "list", "data": [ { "id": "Qwen/Qwen3-8B", "owned_by": "Qwen", ... }, ... ] }`。

    當您設定 Hugging Face API 金鑰（透過上線流程、`HUGGINGFACE_HUB_TOKEN` 或 `HF_TOKEN`）時，OpenClaw 會使用此 GET 要求來探索可用的聊天完成模型。在 **互動式設定** 期間，輸入權杖後，您會看到由該清單填入的 **預設 Hugging Face 模型** 下拉式選單（若要求失敗，則使用內建目錄）。在執行階段（例如 Gateway 啟動）時，若存在金鑰，OpenClaw 會再次呼叫 **GET** `https://router.huggingface.co/v1/models` 來重新整理目錄。此清單會與內建目錄合併（用於內容視窗和成本等中繼資料）。若要求失敗或未設定金鑰，則僅使用內建目錄。

  </Accordion>

  <Accordion title="Model names, aliases, and policy suffixes">
    - **Name from API:** The model display name is **hydrated from GET /v1/models** when the API returns `name`, `title`, or `display_name`; otherwise it is derived from the model id (e.g. `deepseek-ai/DeepSeek-R1` becomes "DeepSeek R1").
    - **Override display name:** You can set a custom label per model in config so it appears the way you want in the CLI and UI:

    ```json5
    {
      agents: {
        defaults: {
          models: {
            "huggingface/deepseek-ai/DeepSeek-R1": { alias: "DeepSeek R1 (fast)" },
            "huggingface/deepseek-ai/DeepSeek-R1:cheapest": { alias: "DeepSeek R1 (cheap)" },
          },
        },
      },
    }
    ```

    - **Policy suffixes:** OpenClaw's bundled Hugging Face docs and helpers currently treat these two suffixes as the built-in policy variants:
      - **`:fastest`** — highest throughput.
      - **`:cheapest`** — lowest cost per output token.

      You can add these as separate entries in `models.providers.huggingface.models` or set `model.primary` with the suffix. You can also set your default provider order in [Inference Provider settings](https://hf.co/settings/inference-providers) (no suffix = use that order).

    - **Config merge:** Existing entries in `models.providers.huggingface.models` (e.g. in `models.json`) are kept when config is merged. So any custom `name`, `alias`, or model options you set there are preserved.

  </Accordion>

  <Accordion title="Environment and daemon setup">
    If the Gateway runs as a daemon (launchd/systemd), make sure `HUGGINGFACE_HUB_TOKEN` or `HF_TOKEN` is available to that process (for example, in `~/.openclaw/.env` or via `env.shellEnv`).

    <Note>
    OpenClaw accepts both `HUGGINGFACE_HUB_TOKEN` and `HF_TOKEN` as env var aliases. Either one works; if both are set, `HUGGINGFACE_HUB_TOKEN` takes precedence.
    </Note>

  </Accordion>

  <Accordion title="Config: DeepSeek R1 with Qwen fallback">
    ```json5
    {
      agents: {
        defaults: {
          model: {
            primary: "huggingface/deepseek-ai/DeepSeek-R1",
            fallbacks: ["huggingface/Qwen/Qwen3-8B"],
          },
          models: {
            "huggingface/deepseek-ai/DeepSeek-R1": { alias: "DeepSeek R1" },
            "huggingface/Qwen/Qwen3-8B": { alias: "Qwen3 8B" },
          },
        },
      },
    }
    ```
  </Accordion>

  <Accordion title="Config: Qwen with cheapest and fastest variants">
    ```json5
    {
      agents: {
        defaults: {
          model: { primary: "huggingface/Qwen/Qwen3-8B" },
          models: {
            "huggingface/Qwen/Qwen3-8B": { alias: "Qwen3 8B" },
            "huggingface/Qwen/Qwen3-8B:cheapest": { alias: "Qwen3 8B (cheapest)" },
            "huggingface/Qwen/Qwen3-8B:fastest": { alias: "Qwen3 8B (fastest)" },
          },
        },
      },
    }
    ```
  </Accordion>

  <Accordion title="Config: DeepSeek + Llama + GPT-OSS with aliases">
    ```json5
    {
      agents: {
        defaults: {
          model: {
            primary: "huggingface/deepseek-ai/DeepSeek-V3.2",
            fallbacks: [
              "huggingface/meta-llama/Llama-3.3-70B-Instruct",
              "huggingface/openai/gpt-oss-120b",
            ],
          },
          models: {
            "huggingface/deepseek-ai/DeepSeek-V3.2": { alias: "DeepSeek V3.2" },
            "huggingface/meta-llama/Llama-3.3-70B-Instruct": { alias: "Llama 3.3 70B" },
            "huggingface/openai/gpt-oss-120b": { alias: "GPT-OSS 120B" },
          },
        },
      },
    }
    ```
  </Accordion>

  <Accordion title="設定：多個 Qwen 和 DeepSeek 並搭配原則後綴">
    ```json5
    {
      agents: {
        defaults: {
          model: { primary: "huggingface/Qwen/Qwen2.5-7B-Instruct:cheapest" },
          models: {
            "huggingface/Qwen/Qwen2.5-7B-Instruct": { alias: "Qwen2.5 7B" },
            "huggingface/Qwen/Qwen2.5-7B-Instruct:cheapest": { alias: "Qwen2.5 7B (cheap)" },
            "huggingface/deepseek-ai/DeepSeek-R1:fastest": { alias: "DeepSeek R1 (fast)" },
            "huggingface/meta-llama/Llama-3.1-8B-Instruct": { alias: "Llama 3.1 8B" },
          },
        },
      },
    }
    ```
  </Accordion>
</AccordionGroup>

## 相關

<CardGroup cols={2}>
  <Card title="Model providers" href="/zh-Hant/concepts/model-providers" icon="layers">
    所有供應商、模型參考和故障轉移行為的概覽。
  </Card>
  <Card title="Model selection" href="/zh-Hant/concepts/models" icon="brain">
    如何選擇和配置模型。
  </Card>
  <Card title="Inference Providers docs" href="https://huggingface.co/docs/inference-providers" icon="book">
    Hugging Face 推理供應商官方文件。
  </Card>
  <Card title="Configuration" href="/zh-Hant/gateway/configuration" icon="gear">
    完整配置參考。
  </Card>
</CardGroup>
