---
summary: "探索：模型設定、設定檔與後援行為"
read_when:
  - Exploring future model selection + auth profile ideas
title: "模型設定探索"
---

# 模型設定（探索）

本文件記錄了未來模型設定的**想法**。這並非
正式規格。如需目前的行為，請參閱：

- [模型](/zh-Hant/concepts/models)
- [模型故障轉移](/zh-Hant/concepts/model-failover)
- [OAuth + 概要檔案](/zh-Hant/concepts/oauth)

## 動機

操作員想要：

- 每個提供者有多個驗證設定檔（個人與工作）。
- 簡單的 `/model` 選擇，且具有可預測的後援機制。
- 文字模型與支援影像功能的模型之間有明確的區分。

## 可能的方向（高層次）

- 保持模型選擇簡單：使用 `provider/model` 並搭配選用性別名。
- 讓提供者具備多個身分驗證設定檔，並具有明確的順序。
- 使用全域後援清單，讓所有工作階段都有一致的失效備援機制。
- 僅在明確設定時才覆寫影像路由。

## 未解決的問題

- 設定檔輪替應該是針對每個提供者還是每個模型？
- UI 應如何呈現工作階段的設定檔選擇？
- 從舊版設定金鑰遷移最安全的路徑為何？

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
