---
summary: "適用於 Hy3 預覽的 Tencent Cloud TokenHub 設定"
title: "Tencent Cloud (TokenHub)"
read_when:
  - You want to use Tencent Hy3 preview with OpenClaw
  - You need the TokenHub API key setup
---

# Tencent Cloud TokenHub

Tencent Cloud 作為 **內建供應商外掛程式** 隨附於 OpenClaw 中。它透過 TokenHub 端點 (`tencent-tokenhub`) 提供對 Tencent Hy3 預覽的存取權。

此提供者使用與 OpenAI 相容的 API。

| 屬性     | 值                                         |
| -------- | ------------------------------------------ |
| 供應商   | `tencent-tokenhub`                         |
| 預設模型 | `tencent-tokenhub/hy3-preview`             |
| 驗證     | `TOKENHUB_API_KEY`                         |
| API      | 相容 OpenAI 的聊天完成                     |
| 基礎 URL | `https://tokenhub.tencentmaas.com/v1`      |
| 全域 URL | `https://tokenhub-intl.tencentmaas.com/v1` |

## 快速開始

<Steps>
  <Step title="建立 TokenHub API 金鑰">在 Tencent Cloud TokenHub 中建立 API 金鑰。如果您為金鑰選擇了有限的存取範圍，請在允許的模型中包含 **Hy3 preview**。</Step>
  <Step title="執行入門導覽">```bash openclaw onboard --auth-choice tokenhub-api-key ```</Step>
  <Step title="驗證模型">```bash openclaw models list --provider tencent-tokenhub ```</Step>
</Steps>

## 非互動式設定

```bash
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice tokenhub-api-key \
  --tokenhub-api-key "$TOKENHUB_API_KEY" \
  --skip-health \
  --accept-risk
```

## 內建目錄

| 模型參照                       | 名稱                   | 輸入 | 語境    | 最大輸出 | 備註             |
| ------------------------------ | ---------------------- | ---- | ------- | -------- | ---------------- |
| `tencent-tokenhub/hy3-preview` | Hy3 preview (TokenHub) | 文字 | 256,000 | 64,000   | 預設；具推理能力 |

Hy3 preview 是 Tencent Hunyuan 用於推理、長語境指令遵循、程式碼和代理工作流程的大型 MoE 語言模型。Tencent 的 OpenAI 相容範例使用 `hy3-preview` 作為模型 ID，並支援標準聊天完成工具呼叫以及 `reasoning_effort`。

<Tip>模型 ID 是 `hy3-preview`。請勿將其與 Tencent 的 `HY-3D-*` 模型混淆，後者是 3D 生成 API，並非由此供應商設定的 OpenClaw 聊天模型。</Tip>

## 端點覆寫

OpenClaw 預設使用 Tencent Cloud 的 `https://tokenhub.tencentmaas.com/v1` 端點。Tencent 也記錄了國際 TokenHub 端點：

```bash
openclaw config set models.providers.tencent-tokenhub.baseUrl "https://tokenhub-intl.tencentmaas.com/v1"
```

僅當您的 TokenHub 帳戶或區域有要求時，才覆寫端點。

## 備註

- TokenHub 模型參照使用 `tencent-tokenhub/<modelId>`。
- 內置目錄目前包含 `hy3-preview`。
- 此外掛程式將 Hy3 preview 標記為具備推理能力與串流使用能力。
- 此外掛程式附帶分級的 Hy3 定價中繼資料，因此無需手動覆寫定價即可填入成本估算值。
- 僅在需要時才在 `models.providers` 中覆寫定價、上下文或端點中繼資料。

## 環境注意事項

如果 Gateway 作為守護程式 (launchd/systemd) 運行，請確保 `TOKENHUB_API_KEY`
對該程式可用（例如，在 `~/.openclaw/.env` 中或透過
`env.shellEnv`）。

## 相關文件

- [OpenClaw 設定](/zh-Hant/gateway/configuration)
- [模型提供者](/zh-Hant/concepts/model-providers)
- [Tencent TokenHub 產品頁面](https://cloud.tencent.com/product/tokenhub)
- [Tencent TokenHub 文字生成](https://cloud.tencent.com/document/product/1823/130079)
- [Tencent TokenHub Hy3 preview 的 Cline 設定](https://cloud.tencent.com/document/product/1823/130932)
- [Tencent Hy3 preview 模型卡](https://huggingface.co/tencent/Hy3-preview)
