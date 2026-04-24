---
title: "腾讯云 (TokenHub)"
summary: "腾讯云 TokenHub 设置"
read_when:
  - You want to use Tencent Hy models with OpenClaw
  - You need the TokenHub API key setup
---

# 腾讯云 (TokenHub)

腾讯云作为 **bundled 提供商 plugin** 内置于 OpenClaw 中。它通过 TokenHub 端点 (`tencent-tokenhub`) 提供对腾讯 Hy 模型的访问。

该提供商使用与 OpenAI 兼容的 API。

## 快速开始

```bash
openclaw onboard --auth-choice tokenhub-api-key
```

## 非交互式示例

```bash
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice tokenhub-api-key \
  --tokenhub-api-key "$TOKENHUB_API_KEY" \
  --skip-health \
  --accept-risk
```

## 提供商和端点

| 提供商             | 端点                          | 用例                      |
| ------------------ | ----------------------------- | ------------------------- |
| `tencent-tokenhub` | `tokenhub.tencentmaas.com/v1` | 通过腾讯 TokenHub 使用 Hy |

## 可用模型

### tencent-tokenhub

- **hy3-preview** — Hy3 预览版（256K 上下文，推理，默认）

## 注意

- TokenHub 模型引用使用 `tencent-tokenhub/<modelId>`。
- 该插件内置了分层的 Hy3 定价元数据，因此无需手动覆盖定价即可填充成本估算。
- 如需，请覆盖 `models.providers` 中的定价和上下文元数据。

## 环境说明

如果 Gateway(网关) 作为守护进程（launchd/systemd）运行，请确保 `TOKENHUB_API_KEY`
对该进程可用（例如，在 `~/.openclaw/.env` 中或通过
`env.shellEnv`）。

## 相关文档

- [OpenClaw 配置](/zh/gateway/configuration)
- [模型提供商](/zh/concepts/model-providers)
- [Tencent TokenHub](https://cloud.tencent.com/document/product/1823/130050)
