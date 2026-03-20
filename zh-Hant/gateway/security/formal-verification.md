---
title: 形式化驗證（安全性模型）
summary: OpenClaw 最高風險路徑的機器檢查安全性模型。
permalink: /security/formal-verification/
---

# 形式化驗證（安全性模型）

此頁面追蹤 OpenClaw 的 **形式化安全性模型**（目前為 TLA+/TLC；視需求增加）。

> 注意：某些舊連結可能會引用先前的專案名稱。

**目標（北極星）：** 提供一個機器檢查的論證，證明 OpenClaw 在明確的假設下，能夠執行其預期的安全性策略（授權、會話隔離、工具閘道以及錯誤設定安全性）。

**目前的內容：** 一個可執行的、由攻擊者驅動的 **安全性回歸測試套件**：

- 每個主張都有一個可對有限狀態空間執行的模型檢查。
- 許多主張都有一個配對的 **負面模型**，能夠針對現實的錯誤類別產生反例軌跡。

**目前還不是：** 一項證明「OpenClaw 在各方面都安全」或完整的 TypeScript 實作正確性的證明。

## 模型位置

模型維護在另一個 repo 中：[vignesh07/openclaw-formal-models](https://github.com/vignesh07/openclaw-formal-models)。

## 重要注意事項

- 這些是 **模型**，而非完整的 TypeScript 實作。模型與程式碼之間可能存在差異。
- 結果受 TLC 探索的狀態空間所限制；「綠燈」並不代表在模型假設和邊界之外具有安全性。
- 某些主張依賴於明確的環境假設（例如：正確的部署、正確的設定輸入）。

## 重現結果

目前，結果是透過在本地複製模型 repo 並執行 TLC 來重現的（見下文）。未來的版本可能提供：

- CI 執行的模型，並提供公開的成果（反例軌跡、執行紀錄）
- 一個託管的「執行此模型」工作流程，用於小型、有限制的檢查

入門指南：

```bash
git clone https://github.com/vignesh07/openclaw-formal-models
cd openclaw-formal-models

# Java 11+ required (TLC runs on the JVM).
# The repo vendors a pinned `tla2tools.jar` (TLA+ tools) and provides `bin/tlc` + Make targets.

make <target>
```

### Gateway 曝露與開放 Gateway 的錯誤設定

**主張：** 在未經驗證的情況下綁定至 loopback 之外，可能導致遠端入侵或增加曝露風險；令牌/密碼可阻擋未經驗證的攻擊者（根據模型假設）。

- 綠燈執行：
  - `make gateway-exposure-v2`
  - `make gateway-exposure-v2-protected`
- 紅燈（預期）：
  - `make gateway-exposure-v2-negative`

另請參閱：模型 repo 中的 `docs/gateway-exposure-matrix.md`。

### Nodes.run pipeline（最高風險功能）

**聲明：**`nodes.run` 需要 (a) 節點指令允許清單加上已宣告的指令，以及 (b) 在設定時需要即時批准；批准已加入權杖以防止重放（在模型中）。

- Green runs：
  - `make nodes-pipeline`
  - `make approvals-token`
- Red (expected)：
  - `make nodes-pipeline-negative`
  - `make approvals-token-negative`

### 配對儲存 (DM 閘控)

**聲明：** 配對請求會遵守 TTL 和待處理請求上限。

- Green runs：
  - `make pairing`
  - `make pairing-cap`
- Red (expected)：
  - `make pairing-negative`
  - `make pairing-cap-negative`

### 入口閘控 (提及 + 控制指令繞過)

**聲明：** 在需要提及的群組語境中，未授權的「控制指令」無法繞過提及閘控。

- Green：
  - `make ingress-gating`
- Red (expected)：
  - `make ingress-gating-negative`

### 路由 / 會話金鑰隔離

**聲明：** 來自不同對等端的 DM 不會合併到同一個會話中，除非經過明確連結 / 設定。

- Green：
  - `make routing-isolation`
- Red (expected)：
  - `make routing-isolation-negative`

## v1++：額外的有界模型 (並發、重試、追蹤正確性)

這些是後續模型，旨在提高對真實世界故障模式（非原子更新、重試和訊息扇出）的擬真度。

### 配對儲存並行 / 等冪性

**聲明：** 即使在交錯情況下，配對儲存也應強制執行 `MaxPending` 和等冪性（即，「檢查後寫入」必須是原子 / 鎖定的；重新整理不應建立重複項）。

含義：

- 在並行請求下，您無法超過頻道的 `MaxPending`。
- 對同一個 `(channel, sender)` 重複請求 / 重新整理不應建立重複的有效待處理紀錄。

- Green runs：
  - `make pairing-race` (原子 / 鎖定的上限檢查)
  - `make pairing-idempotency`
  - `make pairing-refresh`
  - `make pairing-refresh-race`
- Red (expected)：
  - `make pairing-race-negative` (非原子 begin/commit 上限競爭)
  - `make pairing-idempotency-negative`
  - `make pairing-refresh-negative`
  - `make pairing-refresh-race-negative`

### 入口追蹤關聯 / 等冪性

**主張：** 摘取應在扇出時保留追蹤關聯性，且在供應商重試時具冪等性。

其意義為：

- 當一個外部事件變成多個內部訊息時，每個部分都保持相同的追蹤/事件身分。
- 重試不會導致重複處理。
- 如果缺少供應商事件 ID，去重機制會回退到安全的金鑰（例如追蹤 ID），以避免遺漏不同的事件。

- 綠色：
  - `make ingress-trace`
  - `make ingress-trace2`
  - `make ingress-idempotency`
  - `make ingress-dedupe-fallback`
- 紅色（預期）：
  - `make ingress-trace-negative`
  - `make ingress-trace2-negative`
  - `make ingress-idempotency-negative`
  - `make ingress-dedupe-fallback-negative`

### 路由 dmScope 優先順序 + identityLinks

**主張：** 路由必須預設保持 DM 會話隔離，且僅在明確設定時才合併會話（頻道優先順序 + 身分連結）。

其意義為：

- 特定頻道的 dmScope 覆寫必須優先於全域預設值。
- identityLinks 應僅在明確連結的群組內合併，而不應跨越不相關的同儕。

- 綠色：
  - `make routing-precedence`
  - `make routing-identitylinks`
- 紅色（預期）：
  - `make routing-precedence-negative`
  - `make routing-identitylinks-negative`

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
