---
summary: "在 OpenClaw 中使用 Qwen OAuth（免費層級）"
read_when:
  - 您想將 Qwen 與 OpenClaw 一起使用
  - 您想要 Qwen Coder 的免費層級 OAuth 存取權限
title: "Qwen"
---

# Qwen

Qwen 為 Qwen Coder 和 Qwen Vision 模型提供免費層級的 OAuth 流程
（每天 2,000 次請求，受 Qwen 速率限制約束）。

## 啟用外掛程式

```bash
openclaw plugins enable qwen-portal-auth
```

啟用後重新啟動 Gateway。

## 驗證

```bash
openclaw models auth login --provider qwen-portal --set-default
```

這會執行 Qwen 裝置代碼 OAuth 流程，並將供應商條目寫入您的
`models.json`（加上一個 `qwen` 別名以便快速切換）。

## 模型 ID

- `qwen-portal/coder-model`
- `qwen-portal/vision-model`

使用以下方式切換模型：

```bash
openclaw models set qwen-portal/coder-model
```

## 重複使用 Qwen Code CLI 登入

如果您已經使用 Qwen Code CLI 登入，OpenClaw 將在載入驗證儲存庫時從
`~/.qwen/oauth_creds.json` 同步認證資訊。您仍然需要一個
`models.providers.qwen-portal` 條目（使用上述登入指令來建立一個）。

## 備註

- Token 會自動重新整理；如果重新整理失敗或存取權被撤銷，請重新執行登入指令。
- 預設基礎 URL：`https://portal.qwen.ai/v1`（如果 Qwen 提供不同的端點，則使用
  `models.providers.qwen-portal.baseUrl` 覆寫）。
- 參閱 [模型供應商](/zh-Hant/concepts/model-providers) 以了解供應商範圍的規則。

import en from "/components/footer/en.mdx";

<en />
