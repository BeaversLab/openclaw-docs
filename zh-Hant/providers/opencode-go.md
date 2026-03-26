---
summary: "使用共用 OpenCode 設定的 OpenCode Go 目錄"
read_when:
  - You want the OpenCode Go catalog
  - You need the runtime model refs for Go-hosted models
title: "OpenCode Go"
---

# OpenCode Go

OpenCode Go 是 [OpenCode](/zh-Hant/providers/opencode) 中的 Go 目錄。
它使用與 Zen 目錄相同的 `OPENCODE_API_KEY`，但保留執行時期
提供者 ID `opencode-go`，以便上游的個別模型路由保持正確。

## 支援的模型

- `opencode-go/kimi-k2.5`
- `opencode-go/glm-5`
- `opencode-go/minimax-m2.5`

## CLI 設定

```bash
openclaw onboard --auth-choice opencode-go
# or non-interactive
openclaw onboard --opencode-go-api-key "$OPENCODE_API_KEY"
```

## 設定片段

```json5
{
  env: { OPENCODE_API_KEY: "YOUR_API_KEY_HERE" }, // pragma: allowlist secret
  agents: { defaults: { model: { primary: "opencode-go/kimi-k2.5" } } },
}
```

## 路由行為

當模型參考使用 `opencode-go/...` 時，OpenClaw 會自動處理個別模型的路由。

## 注意事項

- 關於共用的入門和目錄概覽，請使用 [OpenCode](/zh-Hant/providers/opencode)。
- Runtime refs 保持明確：Zen 為 `opencode/...`，Go 為 `opencode-go/...`。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
