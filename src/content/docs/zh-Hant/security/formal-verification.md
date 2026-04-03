---
title: 形式化驗證（安全性模型）
summary: 針對 OpenClaw 最高風險路徑的機器檢查安全性模型。
read_when:
  - Reviewing formal security model guarantees or limits
  - Reproducing or updating TLA+/TLC security model checks
permalink: /security/formal-verification/
---

# 形式化驗證（安全性模型）

此頁面追蹤 OpenClaw 的**形式化安全性模型**（目前為 TLA+/TLC；視需要增加更多）。

> 注意：某些較舊的連結可能會引用先前的專案名稱。

**目標（指導原則）：** 提供一個機器檢查的論證，證明 OpenClaw 在明確的假設下能執行其預期的安全性策略（授權、會話隔離、工具閘道，以及錯誤配置安全性）。

**目前的用途：** 一個可執行的、由攻擊者驅動的**安全性迴歸測試套件：**

- 每個主張都有一個可針對有限狀態空間執行的模型檢查。
- 許多主題都有一個配對的**負面模型**，該模型會針對現實的漏洞類別產生反例軌跡。

**目前的限制：** 這並非「OpenClaw 在各方面都安全」或完整的 TypeScript 實作正確性的證明。

## 模型的位置

模型維護在一個獨立的 repo 中：[vignesh07/openclaw-formal-models](https://github.com/vignesh07/openclaw-formal-models)。

## 重要注意事項

- 這些是**模型**，而非完整的 TypeScript 實作。模型與程式碼之間可能會出現差異。
- 結果受限於 TLC 探索的狀態空間；「綠燈」並不代表超出模型假設與邊界的安全性。
- 某些主張依賴於明確的環境假設（例如：正確的部署、正確的設定輸入）。

## 重現結果

目前，透過在本地複製模型 repo 並執行 TLC 來重現結果（見下文）。未來的版本可能會提供：

- 隨公開產出項目（反例軌跡、執行記錄）執行的 CI 模型
- 針對小型、有限檢查的託管「執行此模型」工作流程

開始使用：

```bash
git clone https://github.com/vignesh07/openclaw-formal-models
cd openclaw-formal-models

# Java 11+ required (TLC runs on the JVM).
# The repo vendors a pinned `tla2tools.jar` (TLA+ tools) and provides `bin/tlc` + Make targets.

make <target>
```

### 閘道暴露與開放閘道錯誤配置

**主張：** 在未經驗證的情況下綁定到 loopback 之外，可能會導致遠端入侵 / 增加暴露；token/密碼可阻擋未經驗證的攻擊者（根據模型假設）。

- 綠燈執行（安全）：
  - `make gateway-exposure-v2`
  - `make gateway-exposure-v2-protected`
- 紅燈執行（預期會失敗）：
  - `make gateway-exposure-v2-negative`

另請參閱：模型 repo 中的 `docs/gateway-exposure-matrix.md`。

### Node 執行管線（最高風險能力）

**聲明：** `exec host=node` 需要 (a) 節點命令允許清單以及已宣告的命令，以及 (b) 在配置時進行即時審批；審批已透過權杖化以防止重放（在模型中）。

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

**聲明：** 在需要提及的群組上下文中，未經授權的「控制指令」無法繞過提及閘控。

- 綠色：
  - `make ingress-gating`
- 紅色（預期）：
  - `make ingress-gating-negative`

### 路由/會話密鑰隔離

**聲明：** 來自不同對端的 DM 不會合併到同一個會話中，除非明確鏈接/配置。

- 綠色：
  - `make routing-isolation`
- 紅色（預期）：
  - `make routing-isolation-negative`

## v1++：額外的有界模型（並發、重試、追蹤正確性）

這些是後續模型，圍繞現實世界的故障模式（非原子更新、重試和訊息扇出）提高了保真度。

### 配對存儲並發性 / 冪等性

**聲明：** 即使在交錯操作下，配對存儲也應執行 `MaxPending` 和冪等性（即，「檢查後寫入」必須是原子/鎖定的；刷新不應創建重複項）。

含義：

- 在並發請求下，對於一個頻道，您不能超過 `MaxPending`。
- 對於同一個 `(channel, sender)`，重複的請求/刷新不應創建重複的活躍待處理行。

- 綠色執行：
  - `make pairing-race` （原子/鎖定上限檢查）
  - `make pairing-idempotency`
  - `make pairing-refresh`
  - `make pairing-refresh-race`
- 紅色（預期）：
  - `make pairing-race-negative` （非原子開始/提交上限競爭）
  - `make pairing-idempotency-negative`
  - `make pairing-refresh-negative`
  - `make pairing-refresh-race-negative`

### 入口追蹤關聯 / 冪等性

**聲明：** 摂取應在扇出時保留追蹤關聯，並在提供者重試時保持冪等。

含義：

- 當一個外部事件變成多個內部訊息時，每個部分都保持相同的追蹤/事件身份。
- 重試不會導致重複處理。
- 如果缺少提供者事件 ID，重複資料刪除會回退到安全金鑰（例如，追蹤 ID）以避免丟失不同的事件。

- 綠燈（通過）：
  - `make ingress-trace`
  - `make ingress-trace2`
  - `make ingress-idempotency`
  - `make ingress-dedupe-fallback`
- 紅燈（預期失敗）：
  - `make ingress-trace-negative`
  - `make ingress-trace2-negative`
  - `make ingress-idempotency-negative`
  - `make ingress-dedupe-fallback-negative`

### 路由 dmScope 優先順序 + identityLinks

**聲明：** 路由必須預設保持 DM 會話隔離，並且僅在明確配置時才合併會話（通道優先順序 + 身份連結）。

含義：

- 特定通道的 dmScope 覆蓋必須優先於全域預設值。
- identityLinks 應僅在明確連結的群組內合併，而不應跨越不相關的對等節點。

- 綠燈（通過）：
  - `make routing-precedence`
  - `make routing-identitylinks`
- 紅燈（預期失敗）：
  - `make routing-precedence-negative`
  - `make routing-identitylinks-negative`
