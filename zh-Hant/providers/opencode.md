---
summary: "在 OpenClaw 中使用 OpenCode Zen 和 Go 目錄"
read_when:
  - 您想要存取 OpenCode 託管的模型
  - 您想要在 Zen 和 Go 目錄之間進行選擇
title: "OpenCode"
---

# OpenCode

OpenCode 在 OpenClaw 中公開了兩個託管目錄：

- `opencode/...` 用於 **Zen** 目錄
- `opencode-go/...` 用於 **Go** 目錄

這兩個目錄使用相同的 OpenCode API 金鑰。OpenClaw 將執行時提供者 ID
分開，以便上游的各個模型路由保持正確，但在入門與文件中將它們
視為一個 OpenCode 設定。

## CLI 設定

### Zen 目錄

```bash
openclaw onboard --auth-choice opencode-zen
openclaw onboard --opencode-zen-api-key "$OPENCODE_API_KEY"
```

### Go 目錄

```bash
openclaw onboard --auth-choice opencode-go
openclaw onboard --opencode-go-api-key "$OPENCODE_API_KEY"
```

## 設定片段

```json5
{
  env: { OPENCODE_API_KEY: "sk-..." },
  agents: { defaults: { model: { primary: "opencode/claude-opus-4-6" } } },
}
```

## 目錄

### Zen

- 執行時提供者：`opencode`
- 範例模型：`opencode/claude-opus-4-6`、`opencode/gpt-5.2`、`opencode/gemini-3-pro`
- 當您想要經過策劃的 OpenCode 多模型代理時的最佳選擇

### Go

- 執行時提供者：`opencode-go`
- 範例模型：`opencode-go/kimi-k2.5`、`opencode-go/glm-5`、`opencode-go/minimax-m2.5`
- 當您想要 OpenCode 託管的 Kimi/GLM/MiniMax 系列時的最佳選擇

## 備註

- `OPENCODE_ZEN_API_KEY` 也受到支援。
- 在設定期間輸入一個 OpenCode 金鑰即可為兩個執行時提供者儲存憑證。
- 您登入 OpenCode，新增帳單詳細資訊，並複製您的 API 金鑰。
- 帳單和目錄可用性是透過 OpenCode 儀表板進行管理。

import en from "/components/footer/en.mdx";

<en />
