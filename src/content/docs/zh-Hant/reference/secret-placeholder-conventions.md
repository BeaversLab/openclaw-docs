---
summary: "適用於文件與範例的秘密掃描器安全佔位符慣例"
read_when:
  - Writing docs that include tokens, API keys, or credential snippets
  - Updating examples that may be scanned by secret-detection tooling
title: "秘密佔位符慣例"
---

# 秘密佔位符慣例

使用人類可讀但不類似真實秘密的佔位符。

## 建議風格

- 偏好具有描述性的數值，例如 `example-openai-key-not-real` 或 `example-discord-bot-token`。
- 對於 Shell 程式碼片段，偏好使用 `${OPENAI_API_KEY}` 而非內聯的類似 Token 字串。
- 保持範例明顯為虛構，並範圍限定於特定用途（提供者、頻道、驗證類型）。

## 在文件中避免使用這些模式

- 字面的 PEM 私鑰標頭或頁尾文字。
- 類似即時憑證的前綴，例如 `sk-...`、`xoxb-...`、`AKIA...`。
- 從執行時期日誌複製的、看似真實的 Bearer Token。

## 範例

```bash
# Good
export OPENAI_API_KEY="example-openai-key-not-real"

# Better (when the doc is about env wiring)
export OPENAI_API_KEY="${OPENAI_API_KEY}"
```
