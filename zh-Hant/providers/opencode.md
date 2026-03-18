---
summary: "使用 OpenCode Zen 和 Go 目錄搭配 OpenClaw"
read_when:
  - You want OpenCode-hosted model access
  - You want to pick between the Zen and Go catalogs
title: "OpenCode"
---

# OpenCode

OpenCode 在 OpenClaw 中公開了兩個託管目錄：

- `opencode/...` 用於 **Zen** 目錄
- `opencode-go/...` 用於 **Go** 目錄

這兩個目錄使用相同的 OpenCode API 金鑰。OpenClaw 將運行時提供者 ID 分開，以保持上游各模型的路由正確，但在上手和文件中，它們被視為一個 OpenCode 設定。

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

- 運行時提供者：`opencode`
- 範例模型：`opencode/claude-opus-4-6`、`opencode/gpt-5.2`、`opencode/gemini-3-pro`
- 當您需要經過策劃的 OpenCode 多模型代理時最佳

### Go

- 運行時提供者：`opencode-go`
- 範例模型：`opencode-go/kimi-k2.5`、`opencode-go/glm-5`、`opencode-go/minimax-m2.5`
- 當您需要 OpenCode 託管的 Kimi/GLM/MiniMax 產品線時最佳

## 備註

- `OPENCODE_ZEN_API_KEY` 也受支援。
- 在設定期間輸入一個 OpenCode 金鑰，即可儲存兩個運行時提供者的憑證。
- 您登入 OpenCode，新增帳單詳細資訊，並複製您的 API 金鑰。
- 帳單和目錄可用性是透過 OpenCode 儀表板管理的。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
