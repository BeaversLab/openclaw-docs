---
title: 形式化驗證（安全模型）
summary: 針對 OpenClaw 最高風險路徑的機器檢查安全模型。
permalink: /security/formal-verification/
---

# 形式化驗證（安全模型）

此頁面追蹤 OpenClaw 的**形式化安全模型**（目前為 TLA+/TLC；視需求增加）。

> 註：部分較舊的連結可能仍引用先前的專案名稱。

**目標（北極星）：**提供一個機器檢查的論證，證明 OpenClaw 在明確假設下執行了其預期的安全策略（授權、會話隔離、工具閘控和錯誤配置安全性）。

**目前的內容：**一個可執行、由攻擊者驅動的**安全回歸測試套件**：

- 每個主張都有一個可在有限狀態空間上執行的模型檢查。
- 許多主題都有一個配對的**負面模型**，可針對真實的錯誤類別產生反例追蹤。

**目前不是的內容：**證明「OpenClaw 在各方面皆安全」或完整的 TypeScript 實作是正確的。

## 模型存放位置

模型維護在另一個倉庫中：[vignesh07/openclaw-formal-models](https://github.com/vignesh07/openclaw-formal-models)。

## 重要注意事項

- 這些是**模型**，而非完整的 TypeScript 實作。模型與程式碼之間可能會出現差異。
- 結果受限於 TLC 探索的狀態空間；「綠燈」並不意味著在模型假設和範圍之外的安全性。
- 某些主張依賴明確的環境假設（例如，正確的部署、正確的設定輸入）。

## 重現結果

目前，結果是透過在本機克隆模型倉庫並執行 TLC 來重現（見下文）。未來的版本可能會提供：

- 隨公開成品（反例追蹤、執行日誌）執行的 CI 模型
- 針對小型、有界檢查的託管「執行此模型」工作流程

開始使用：

```bash
git clone https://github.com/vignesh07/openclaw-formal-models
cd openclaw-formal-models

# Java 11+ required (TLC runs on the JVM).
# The repo vendors a pinned `tla2tools.jar` (TLA+ tools) and provides `bin/tlc` + Make targets.

make <target>
```

### Gateway 暴露與開放式 Gateway 錯誤配置

**主張：**在未經驗證的情況下繫結至 loopback 之外，可能導致遠端入侵 / 增加暴露風險；權杖/密碼可阻止未經驗證的攻擊者（根據模型假設）。

- 綠燈執行：
  - `make gateway-exposure-v2`
  - `make gateway-exposure-v2-protected`
- 紅燈（預期）：
  - `make gateway-exposure-v2-negative`

另請參閱：模型倉庫中的 `docs/gateway-exposure-matrix.md`。

### Nodes.run pipeline（最高風險能力）

**聲明：** `nodes.run` 需要 (a) 節點指令允許清單加上已宣告的指令，以及 (b) 設定時的即時批准；批准會進行代幣化以防止重放（在模型中）。

- Green 執行：
  - `make nodes-pipeline`
  - `make approvals-token`
- Red（預期）：
  - `make nodes-pipeline-negative`
  - `make approvals-token-negative`

### 配對存儲（DM 閘控）

**聲明：** 配對請求會遵守 TTL 和待處理請求上限。

- Green 執行：
  - `make pairing`
  - `make pairing-cap`
- Red（預期）：
  - `make pairing-negative`
  - `make pairing-cap-negative`

### 入口閘控（提及 + control-command 繞過）

**聲明：** 在需要提及的群組情境中，未經授權的「control command」無法繞過提及閘控。

- Green：
  - `make ingress-gating`
- Red（預期）：
  - `make ingress-gating-negative`

### 路由 / 會話金鑰隔離

**聲明：** 來自不同對等節點的 DM 不會合併到同一個會話中，除非有明確的連結或設定。

- Green：
  - `make routing-isolation`
- Red（預期）：
  - `make routing-isolation-negative`

## v1++：額外的有界模型（並行、重試、追蹤正確性）

這些是後續模型，用於提高對現實世界故障模式（非原子更新、重試和訊息扇出）的保真度。

### 配對存儲並行 / 幪等性

**聲明：** 配對存儲應該在交錯執行下強制執行 `MaxPending` 和幪等性（即，「檢查後寫入」必須是原子的 / 鎖定的；刷新不應建立重複項）。

其含義：

- 在並行請求下，您不能超過某個頻道的 `MaxPending`。
- 對同一個 `(channel, sender)` 的重複請求 / 刷新不應建立重複的有效待處理行。

- Green 執行：
  - `make pairing-race` (atomic/locked cap check)
  - `make pairing-idempotency`
  - `make pairing-refresh`
  - `make pairing-refresh-race`
- Red（預期）：
  - `make pairing-race-negative` (non-atomic begin/commit cap race)
  - `make pairing-idempotency-negative`
  - `make pairing-refresh-negative`
  - `make pairing-refresh-race-negative`

### 入口追蹤關聯 / 幪等性

**聲明：** 擷取應在分散傳輸時保留追蹤關聯，並在提供者重試時具備等冪性。

含義：

- 當一個外部事件變成多個內部訊息時，每個部分都保持相同的追蹤/事件識別。
- 重試不會導致重複處理。
- 如果缺少提供者事件 ID，去重會回退到安全的金鑰（例如追蹤 ID），以避免丟失不同的事件。

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

**聲明：** 路由預設必須保持 DM 會話隔離，且僅在明確配置時才合併會話（頻道優先順序 + 身分連結）。

含義：

- 特定頻道的 dmScope 覆蓋必須優先於全域預設值。
- identityLinks 應僅在明確連結的群組內合併，而不應跨不相關的對等端合併。

- 綠色：
  - `make routing-precedence`
  - `make routing-identitylinks`
- 紅色（預期）：
  - `make routing-precedence-negative`
  - `make routing-identitylinks-negative`
