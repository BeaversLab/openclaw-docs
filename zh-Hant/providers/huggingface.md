---
summary: "Hugging Face Inference 設定（驗證 + 模型選擇）"
read_when:
  - 您想搭配 OpenClaw 使用 Hugging Face Inference
  - 您需要 HF token 環境變數或 CLI 驗證選項
title: "Hugging Face (Inference)"
---

# Hugging Face (Inference)

[Hugging Face Inference Providers](https://huggingface.co/docs/inference-providers) 透過單一路由器 API 提供 OpenAI 相容的聊天完成功能。您可以使用一個 token 存取多種模型（DeepSeek、Llama 等）。OpenClaw 使用 **OpenAI 相容端點**（僅限聊天完成）；若需文字轉圖片、嵌入或語音功能，請直接使用 [HF inference clients](https://huggingface.co/docs/api-inference/quicktour)。

- 供應商：`huggingface`
- 驗證：`HUGGINGFACE_HUB_TOKEN` 或 `HF_TOKEN`（具有 **Make calls to Inference Providers** 權限的精細權限 token）
- API：OpenAI 相容 (`https://router.huggingface.co/v1`)
- 計費：單一 HF token；[定價](https://huggingface.co/docs/inference-providers/pricing) 依供應商費率計算，並提供免費層級。

## 快速開始

1. 在 [Hugging Face → Settings → Tokens](https://huggingface.co/settings/tokens/new?ownUserPermissions=inference.serverless.write&tokenType=fineGrained) 建立一個具有 **Make calls to Inference Providers** 權限的精細權限 token。
2. 執行上架 (onboarding) 並在供應商下拉式選單中選擇 **Hugging Face**，然後在提示時輸入您的 API 金鑰：

```bash
openclaw onboard --auth-choice huggingface-api-key
```

3. 在 **Default Hugging Face model** 下拉式選單中，選擇您想要的模型（當您擁有有效的 token 時，清單會從 Inference API 載入；否則會顯示內建清單）。您的選擇會儲存為預設模型。
4. 您也可以稍後在設定中設定或變更預設模型：

```json5
{
  agents: {
    defaults: {
      model: { primary: "huggingface/deepseek-ai/DeepSeek-R1" },
    },
  },
}
```

## 非互動式範例

```bash
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice huggingface-api-key \
  --huggingface-api-key "$HF_TOKEN"
```

這會將 `huggingface/deepseek-ai/DeepSeek-R1` 設定為預設模型。

## 環境注意事項

如果 Gateway 以背景服務 (daemon) (launchd/systemd) 執行，請確保 `HUGGINGFACE_HUB_TOKEN` 或 `HF_TOKEN`
可供該程序使用（例如，在 `~/.openclaw/.env` 中或透過
`env.shellEnv`）。

## 模型探索與上架下拉式選單

OpenClaw 透過直接呼叫 **Inference endpoint** 來探索模型：

```bash
GET https://router.huggingface.co/v1/models
```

(選用：傳送 `Authorization: Bearer $HUGGINGFACE_HUB_TOKEN` 或 `$HF_TOKEN` 以取得完整清單；部分端點在未經驗證的情況下會傳回子集。) 回應為 OpenAI 風格的 `{ "object": "list", "data": [ { "id": "Qwen/Qwen3-8B", "owned_by": "Qwen", ... }, ... ] }`。

當您設定 Hugging Face API 金鑰（透過 onboarding、`HUGGINGFACE_HUB_TOKEN` 或 `HF_TOKEN`）時，OpenClaw 會使用此 GET 要求來探索可用的聊天完成模型。在**互動式設定**期間，輸入您的權杖後，您會看到一個**預設 Hugging Face 模型**下拉式選單，其中的選項來自該清單（如果要求失敗，則來自內建目錄）。在執行時（例如 Gateway 啟動時），當存在金鑰時，OpenClaw 會再次呼叫 **GET** `https://router.huggingface.co/v1/models` 來重新整理目錄。該清單會與內建目錄合併（用於內容視窗和成本等中繼資料）。如果要求失敗或未設定金鑰，則僅使用內建目錄。

## 模型名稱和可編輯選項

- **來自 API 的名稱：** 當 API 傳回 `name`、`title` 或 `display_name` 時，模型顯示名稱會**從 GET /v1/models 填充**；否則它是從模型 ID 推導而來（例如 `deepseek-ai/DeepSeek-R1` → “DeepSeek R1”）。
- **覆寫顯示名稱：** 您可以在設定中為每個模型設定自訂標籤，使其在 CLI 和 UI 中以您想要的方式顯示：

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

- **供應商 / 政策選擇：** 將後綴附加到**模型 ID** 以選擇路由器選擇後端的方式：
  - **`:fastest`** — 最高輸送量（由路由器選擇；供應商選擇已**鎖定** — 沒有互動式後端選擇器）。
  - **`:cheapest`** — 每個輸出權杖的最低成本（由路由器選擇；供應商選擇已**鎖定**）。
  - **`:provider`** — 強制使用特定後端（例如 `:sambanova`、`:together`）。

  當您選擇 **:cheapest** 或 **:fastest**（例如在 onboarding 模型下拉式選單中）時，供應商會被鎖定：路由器會根據成本或速度決定，並且不會顯示可選的「偏好特定後端」步驟。您可以將這些作為單獨的項目新增到 `models.providers.huggingface.models` 或使用後綴設定 `model.primary`。您也可以在 [Inference Provider settings](https://hf.co/settings/inference-providers) 中設定您的預設順序（無後綴 = 使用該順序）。

- **配置合併：** 當合併配置時，會保留 `models.providers.huggingface.models` 中的現有條目（例如在 `models.json` 中）。因此，您在那裡設定的任何自訂 `name`、`alias` 或模型選項都會被保留。

## 模型 ID 與配置範例

模型參照使用 `huggingface/<org>/<model>` 的格式（Hub 風格的 ID）。以下列表來自 **GET** `https://router.huggingface.co/v1/models`；您的目錄可能包含更多內容。

**範例 ID（來自推論端點）：**

| 模型                  | 參照（加上 `huggingface/` 前綴）    |
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

您可以將 `:fastest`、`:cheapest` 或 `:provider`（例如 `:together`、`:sambanova`）附加到模型 ID。在 [推論提供者設定](https://hf.co/settings/inference-providers) 中設定您的預設順序；請參閱 [推論提供者](https://huggingface.co/docs/inference-providers) 和 **GET** `https://router.huggingface.co/v1/models` 以取得完整列表。

### 完整配置範例

**主要使用 DeepSeek R1，Qwen 作為備援：**

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

**預設使用 Qwen，並包含 :cheapest 和 :fastest 變體：**

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

**DeepSeek + Llama + GPT-OSS 配合別名：**

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

**使用 :provider 強制指定後端：**

```json5
{
  agents: {
    defaults: {
      model: { primary: "huggingface/deepseek-ai/DeepSeek-R1:together" },
      models: {
        "huggingface/deepseek-ai/DeepSeek-R1:together": { alias: "DeepSeek R1 (Together)" },
      },
    },
  },
}
```

**多個 Qwen 和 DeepSeek 模型配帶有策略後綴：**

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

import en from "/components/footer/en.mdx";

<en />
