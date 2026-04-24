---
title: "Tencent Cloud (TokenHub)"
summary: "Tencent Cloud TokenHub 設定"
read_when:
  - You want to use Tencent Hy models with OpenClaw
  - You need the TokenHub API key setup
---

# Tencent Cloud (TokenHub)

Tencent Cloud 作為 **內建提供者外掛程式** 隨附於 OpenClaw 中。它透過 TokenHub 端點 (`tencent-tokenhub`) 提供對 Tencent Hy 模型的存取權。

此提供者使用與 OpenAI 相容的 API。

## 快速開始

```bash
openclaw onboard --auth-choice tokenhub-api-key
```

## 非互動式範例

```bash
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice tokenhub-api-key \
  --tokenhub-api-key "$TOKENHUB_API_KEY" \
  --skip-health \
  --accept-risk
```

## 提供者與端點

| 提供者             | 端點                          | 使用案例                      |
| ------------------ | ----------------------------- | ----------------------------- |
| `tencent-tokenhub` | `tokenhub.tencentmaas.com/v1` | 透過 Tencent TokenHub 存取 Hy |

## 可用模型

### tencent-tokenhub

- **hy3-preview** — Hy3 預覽版 (256K 上下文，推理，預設)

## 備註

- TokenHub 模型參照使用 `tencent-tokenhub/<modelId>`。
- 此外掛程式內建分層 Hy3 定價元數據，因此無需手動覆寫定價即可填入成本估算。
- 如有需要，請在 `models.providers` 中覆寫定價和上下文元數據。

## 環境注意事項

如果 Gateway 以常駐程式 (launchd/systemd) 執行，請確保 `TOKENHUB_API_KEY`
可供該程序存取 (例如，在 `~/.openclaw/.env` 中或透過
`env.shellEnv`)。

## 相關文件

- [OpenClaw 設定](/zh-Hant/gateway/configuration)
- [模型提供者](/zh-Hant/concepts/model-providers)
- [Tencent TokenHub](https://cloud.tencent.com/document/product/1823/130050)
