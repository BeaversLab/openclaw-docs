---
title: 形式驗證（安全模型）
summary: 針對 OpenClaw 最高風險路徑的經機器檢查的安全模型。
permalink: /security/formal-verification/
---

# 形式驗證（安全模型）

此頁面追蹤 OpenClaw 的 **形式安全模型**（目前為 TLA+/TLC；視需求增加）。

> 注意：部分較舊的連結可能會參照先前的專案名稱。

**目標（北極星）：** 提供一個經機器檢查的論證，證明 OpenClaw 在明確的假設下執行了其預期的安全策略（授權、會話隔離、工具閘控以及錯誤配置安全性）。

**現狀（今天）：** 一個可執行的、由攻擊者驅動的 **安全回歸測試套件**：

- 每個主張都有針對有限狀態空間的可執行模型檢查。
- 許多主張都配有一個 **負面模型**，該模型會針對現實的錯誤類別產生反例追蹤。

**這還不是什麼：** 一個證明「OpenClaw 在各方面都是安全的」或完整的 TypeScript 實作是正確的。

## 模型的位置

模型維護在另一個倉庫中：[vignesh07/openclaw-formal-models](https://github.com/vignesh07/openclaw-formal-models)。

## 重要注意事項

- 這些是 **模型**，而非完整的 TypeScript 實作。模型與程式碼之間可能存在差異。
- 結果受 TLC 探索的狀態空間所限制；「綠燈」並不代表在模型假設和範圍之外的安全性。
- 某些主張依賴於明確的環境假設（例如，正確的部署、正確的配置輸入）。

## 重現結果

目前，透過在本地克隆模型倉庫並執行 TLC 來重現結果（見下文）。未來的迭代可能會提供：

- CI 執行的模型並提供公開工件（反例追蹤、執行日誌）
- 針對小型、有限檢查的託管「執行此模型」工作流程

入門指南：

```exec
git clone https://github.com/vignesh07/openclaw-formal-models
cd openclaw-formal-models

# Java 11+ required (TLC runs on the JVM).
# The repo vendors a pinned `tla2tools.jar` (TLA+ tools) and provides `bin/tlc` + Make targets.

make <target>
```

### Gateway 暴露與 open gateway 設定錯誤

**聲明：** 在未經驗證的情況下繫結至 loopback 之外，可能導致遠端漏洞或增加暴露風險；token/密碼可阻擋未經驗證的攻擊者（根據模型假設）。

- Green 執行：
  - `make gateway-exposure-v2`
  - `make gateway-exposure-v2-protected`
- Red (預期)：
  - `make gateway-exposure-v2-negative`

另請參閱：models repo 中的 `docs/gateway-exposure-matrix.md`。

### Nodes.run pipeline (最高風險能力)

**聲明：** `nodes.run` 需要 (a) 節點指令允許清單加上已宣告的指令，以及 (b) 在設定時進行即時批准；為防止重放 (replay)，批准會被標記化 (在模型中)。

- Green 執行：
  - `make nodes-pipeline`
  - `make approvals-token`
- Red (預期)：
  - `make nodes-pipeline-negative`
  - `make approvals-token-negative`

### 配對存儲 (DM 閘控)

**主張：** 配對請求遵守 TTL 和待處理請求上限。

- 綠色運行：
  - `make pairing`
  - `make pairing-cap`
- 紅色 (預期)：
  - `make pairing-negative`
  - `make pairing-cap-negative`

### 入口閘控 (提及 + 控制指令繞過)

**主張：** 在需要提及的群組語境中，未經授權的「控制指令」無法繞過提及閘控。

- 綠色：
  - `make ingress-gating`
- 紅色 (預期)：
  - `make ingress-gating-negative`

### 路由/會話金鑰隔離

**主張：** 來自不同對端的 DM 不會合併到同一個會話中，除非顯式連結/配置。

- 綠色：
  - `make routing-isolation`
- 紅色 (預期)：
  - `make routing-isolation-negative`

## v1++：額外的有界模型 (並發、重試、追蹤正確性)

這些是後續模型，針對現實世界的故障模式（非原子更新、重試和訊息扇出）提高了保真度。

### 配對儲存併發 / 冪等性

**聲明：** 即使在交錯操作下（即「檢查後寫入」必須是原子的/鎖定的；重新整理不應建立重複項），配對儲存也應強制執行 `MaxPending` 和冪等性。

其含義：

- 在併發請求下，您不能超過通道的 `MaxPending`。
- 對同一個 `(channel, sender)` 的重複請求/重新整理不應建立重複的即時待處理資料列。

- 綠色執行：
  - `make pairing-race` (原子/鎖定上限檢查)
  - `make pairing-idempotency`
  - `make pairing-refresh`
  - `make pairing-refresh-race`
- 紅色 (預期)：
  - `make pairing-race-negative` (非原子開始/提交上限競爭)
  - `make pairing-idempotency-negative`
  - `make pairing-refresh-negative`
  - `make pairing-refresh-race-negative`

### 入口追蹤關聯 / 冪等性

**宣告：** 摘取應在分散過程中保持追蹤關聯，並在提供者重試時保持冪等。

含義：

- 當一個外部事件變成多個內部訊息時，每個部分都保持相同的追蹤/事件身分。
- 重試不會導致重複處理。
- 如果缺少提供者事件 ID，去重會回退到安全金鑰（例如，追蹤 ID）以避免丟失不同的事件。

- 綠燈：
  - `make ingress-trace`
  - `make ingress-trace2`
  - `make ingress-idempotency`
  - `make ingress-dedupe-fallback`
- 紅燈（預期）：
  - `make ingress-trace-negative`
  - `make ingress-trace2-negative`
  - `make ingress-idempotency-negative`
  - `make ingress-dedupe-fallback-negative`

### 路由 dmScope 優先順序 + identityLinks

**聲明：** 路由預設必須保持 DM 會話隔離，且僅在明確配置時才合併會話（通道優先順序 + 身份連結）。

其含義：

- 特定通道的 dmScope 覆蓋必須優先於全域預設值。
- identityLinks 應僅在明確連結的群組內合併，而非跨不相關的同儕。

- 綠燈：
  - `make routing-precedence`
  - `make routing-identitylinks`
- 紅燈（預期）：
  - `make routing-precedence-negative`
  - `make routing-identitylinks-negative`
