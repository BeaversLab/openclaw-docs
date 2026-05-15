---
summary: OpenClaw 最高風險路徑的機器檢查安全模型。
title: 形式驗證（安全性模型）
read_when:
  - Reviewing formal security model guarantees or limits
  - Reproducing or updating TLA+/TLC security model checks
permalink: /security/formal-verification/
---

本頁面追蹤 OpenClaw 的 **形式化安全模型**（目前為 TLA+/TLC；視需要增加更多）。

> 注意：部分較舊的連結可能會引用先前的專案名稱。

**目標（北極星）：**在明確的假設下，提供機器檢查的論證，證明 OpenClaw 執行其預期的安全性政策（授權、會話隔離、工具閘道與錯誤配置安全性）。

**這是什麼（目前）：**一個可執行的、由攻擊者驅動的**安全性回歸測試套件**：

- 每個主張都有一個在有限狀態空間上執行的模型檢查。
- 許多主題都有一個配對的**負向模型**，該模型會針對現實的錯誤類別產生反例追蹤。

**這暫時不是什麼：** 這並非證明「OpenClaw 在所有方面都是安全的」或其完整的 TypeScript 實作是正確的。

## 模型所在位置

模型維護在另一個儲存庫中：[vignesh07/openclaw-formal-models](https://github.com/vignesh07/openclaw-formal-models)。

## 重要注意事項

- 這些是**模型**，而非完整的 TypeScript 實作。模型與程式碼之間可能存在差異。
- 結果受 TLC 探索的狀態空間所限制；「綠燈」並不意味著在模型假設與邊界之外的安全性。
- 部分主張依賴於明確的環境假設（例如，正確的部署、正確的設定輸入）。

## 重現結果

目前，結果是透過在本地複製模型儲存庫並執行 TLC 來重現的（見下文）。未來的版本可能提供：

- 提供公開產出物（反例追蹤、執行記錄）的 CI 執行模型
- 針對小型、有限檢查的託管「執行此模型」工作流程

開始使用：

```bash
git clone https://github.com/vignesh07/openclaw-formal-models
cd openclaw-formal-models

# Java 11+ required (TLC runs on the JVM).
# The repo vendors a pinned `tla2tools.jar` (TLA+ tools) and provides `bin/tlc` + Make targets.

make <target>
```

### Gateway 暴露與開放 Gateway 錯誤配置

**主張：**在未經驗證的情況下綁定至 loopback 之外，可能導致遠端洩漏 / 增加暴露面；權杖/密碼可阻擋未經驗證的攻擊者（根據模型假設）。

- 綠燈執行：
  - `make gateway-exposure-v2`
  - `make gateway-exposure-v2-protected`
- 紅燈（預期）：
  - `make gateway-exposure-v2-negative`

另請參閱：模型儲存庫中的 `docs/gateway-exposure-matrix.md`。

### Node 執行管線（最高風險能力）

**聲明：** `exec host=node` 需要 (a) 節點指令允許清單加上已宣告指令，以及 (b) 在配置時的即時核准；核准已加入權杖化以防止重放（在模型中）。

- 綠色執行：
  - `make nodes-pipeline`
  - `make approvals-token`
- 紅色（預期）：
  - `make nodes-pipeline-negative`
  - `make approvals-token-negative`

### 配對存儲（DM 閘控）

**聲明：** 配對請求遵守 TTL 和待處理請求上限。

- 綠色執行：
  - `make pairing`
  - `make pairing-cap`
- 紅色（預期）：
  - `make pairing-negative`
  - `make pairing-cap-negative`

### 入口閘控（提及 + 控制指令繞過）

**主張：** 在需要提及的群組語境中，未經授權的「控制命令」無法繞過提及閘道。

- 綠色：
  - `make ingress-gating`
- 紅色（預期）：
  - `make ingress-gating-negative`

### 路由/會話金鑰隔離

**聲明：** 來自不同對等端的 DM 不會合併至同一個會話，除非已明確連結/配置。

- 綠色：
  - `make routing-isolation`
- 紅色（預期）：
  - `make routing-isolation-negative`

## v1++：額外的有界模型（並行、重試、追蹤正確性）

這些是後續模型，針對現實世界故障模式（非原子更新、重試和訊息扇出）提高了擬真度。

### 配對存儲並行 / 幪等性

**主張：** 配對存儲應即使在交錯操作下也強制執行 `MaxPending` 和等冪性（即「檢查後寫入」必須是原子/鎖定的；重新整理不應產生重複項）。

其含義：

- 在並發請求下，您無法超過頻道的 `MaxPending`。
- 針對同一 `(channel, sender)` 的重複請求/重新整理不應建立重複的有效待處理紀錄。

- 綠色執行：
  - `make pairing-race` （原子/鎖定上限檢查）
  - `make pairing-idempotency`
  - `make pairing-refresh`
  - `make pairing-refresh-race`
- 紅色（預期）：
  - `make pairing-race-negative` （非原子 begin/commit 上限競爭）
  - `make pairing-idempotency-negative`
  - `make pairing-refresh-negative`
  - `make pairing-refresh-race-negative`

### 入口追蹤關聯 / 幪等性

**聲明：** 擷取應在分散發布時保留追蹤關聯，並在提供者重試時保持冪等。

含義：

- 當一個外部事件變成多個內部訊息時，每個部分都保持相同的追蹤/事件身分。
- 重試不會導致重複處理。
- 如果缺少提供者事件 ID，去重會回退到安全金鑰（例如追蹤 ID）以避免丟失不同事件。

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

**聲明：** 路由必須預設保持 DM 會話隔離，並且僅在明確配置時才合併會話（通道優先順序 + 身分連結）。

含義：

- 特定通道的 dmScope 覆蓋必須勝過全域預設值。
- identityLinks 應僅在明確的連結群組內合併，而不是在無關的對等之間合併。

- 綠色：
  - `make routing-precedence`
  - `make routing-identitylinks`
- 紅色（預期）：
  - `make routing-precedence-negative`
  - `make routing-identitylinks-negative`

## 相關

- [威脅模型](/zh-Hant/security/THREAT-MODEL-ATLAS)
- [貢獻威脅模型](/zh-Hant/security/CONTRIBUTING-THREAT-MODEL)
