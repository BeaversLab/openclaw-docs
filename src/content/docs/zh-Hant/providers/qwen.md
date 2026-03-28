---
summary: "在 OpenClaw 中使用 Qwen OAuth（免費層級）"
read_when:
  - You want to use Qwen with OpenClaw
  - You want free-tier OAuth access to Qwen Coder
title: "Qwen"
---

# Qwen

Qwen 為 Qwen Coder 和 Qwen Vision 模型提供免費層級的 OAuth 流程
（每天 2,000 次請求，受 Qwen 速率限制約束）。

## 啟用外掛程式

```exec
openclaw plugins enable qwen-portal-auth
```

啟用後重新啟動 Gateway。

## 驗證

```exec
openclaw models auth login --provider qwen-portal --set-default
```

這將執行 Qwen 裝置代碼 OAuth 流程，並將提供者條目寫入您的
`models.json`（加上 `qwen` 別名以便快速切換）。

## 模型 ID

- `qwen-portal/coder-model`
- `qwen-portal/vision-model`

使用以下指令切換模型：

```exec
openclaw models set qwen-portal/coder-model
```

## 重複使用 Qwen Code CLI 登入

如果您已使用 Qwen Code CLI 登入，OpenClaw 會在載入驗證儲存時
從 `~/.qwen/oauth_creds.json` 同步認證資訊。您仍然需要
`models.providers.qwen-portal` 條目（使用上面的登入指令來建立一個）。

## 備註

- Tokens 自動更新；如果更新失敗或存取權被撤銷，請重新執行登入指令。
- 預設基礎 URL：`https://portal.qwen.ai/v1`（如果 Qwen 提供不同的端點，請使用 `models.providers.qwen-portal.baseUrl` 覆寫）。
- 請參閱 [Model providers](/zh-Hant/concepts/model-providers) 以了解提供者範圍的規則。
