---
title: 形式化驗證（安全模型）
summary: 針對 OpenClaw 最高風險路徑的機器檢查安全模型。
read_when:
  - Reviewing formal security model guarantees or limits
  - Reproducing or updating TLA+/TLC security model checks
permalink: /security/formal-verification/
---

# 形式化驗證（安全模型）

本頁面追蹤 OpenClaw 的**形式化安全模型**（目前為 TLA+/TLC；視需要增加）。

> 注意：某些較舊的連結可能指的是先前的專案名稱。

**目標（指標）：** 在明確的假設下，提供一個機器檢查的論證，證明 OpenClaw 執行了其預期的安全策略（授權、會話隔離、工具閘控以及錯誤配置安全性）。

**目前的內容：** 一個可執行的、由攻擊者驅動的**安全回歸測試套件**：

- 每個主張都有針對有限狀態空間的可執行模型檢查。
- 許多主張都配對了一個**負面模型**，該模型會針對現實的錯誤類別產生反例追蹤。

**目前的限制：** 這並非證明「OpenClaw 在所有方面都是安全的」或完整的 TypeScript 實作是正確的。

## 模型所在位置

模型維護在另一個儲存庫中：[vignesh07/openclaw-formal-models](https://github.com/vignesh07/openclaw-formal-models)。

## 重要注意事項

- 這些是**模型**，並非完整的 TypeScript 實作。模型與程式碼之間可能存在差異。
- 結果受限於 TLC 探索的狀態空間；「綠燈」並不意味著在模型假設和邊界之外是安全的。
- 某些主張依賴於明確的環境假設（例如，正確的部署、正確的配置輸入）。

## 重現結果

目前，結果是透過在本地複製模型儲存庫並執行 TLC 來重現的（見下文）。未來的版本可能提供：

- 附帶公開產出物（反例追蹤、執行日誌）的 CI 執行模型
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

**主張：** 在沒有驗證的情況下綁定到 loopback 以外的位址可能會導致遠端入侵 / 增加暴露面；Token/密碼可以阻擋未經驗證的攻擊者（根據模型假設）。

- 通過的執行：
  - `make gateway-exposure-v2`
  - `make gateway-exposure-v2-protected`
- 失敗（預期）：
  - `make gateway-exposure-v2-negative`

另請參閱模型儲存庫中的 `docs/gateway-exposure-matrix.md`。

### Nodes.run pipeline（最高風險能力）

**聲明：** `nodes.run` 需要 (a) 節點指令允許清單加上已宣告的指令，以及 (b) 在設定時需要即時核准；核准會以權杖化處理以防止重放（在模型中）。

- 綠燈執行（通過）：
  - `make nodes-pipeline`
  - `make approvals-token`
- 紅燈（預期失敗）：
  - `make nodes-pipeline-negative`
  - `make approvals-token-negative`

### 配對儲存（DM 閘道控制）

**聲明：** 配對請求遵守 TTL 和待處理請求上限。

- 綠燈執行（通過）：
  - `make pairing`
  - `make pairing-cap`
- 紅燈（預期失敗）：
  - `make pairing-negative`
  - `make pairing-cap-negative`

### 入口閘道（提及 + 控制指令繞過）

**聲明：** 在需要提及的群組語境中，未經授權的「控制指令」無法繞過提及閘道。

- 綠燈（通過）：
  - `make ingress-gating`
- 紅燈（預期失敗）：
  - `make ingress-gating-negative`

### 路由/工作階段金鑰隔離

**聲明：** 來自不同對等的訊息不會合併到同一個工作階段中，除非有明確的連結或設定。

- 綠燈（通過）：
  - `make routing-isolation`
- 紅燈（預期失敗）：
  - `make routing-isolation-negative`

## v1++：額外的有限模型（並行、重試、追蹤正確性）

這些是後續模型，針對真實世界的故障模式（非原子更新、重試和訊息扇出）提高了保真度。

### 配對儲存並行 / 幂等性

**聲明：** 即使在交錯操作下，配對儲存也應該強制執行 `MaxPending` 和幂等性（即，「檢查後寫入」必須是原子 / 鎖定的；重新整理不應建立重複項目）。

含義：

- 在並行請求下，您不能超過通道的 `MaxPending`。
- 針對同一個 `(channel, sender)` 的重複請求/重新整理不應建立重複的有效待處理紀錄。

- 綠燈執行（通過）：
  - `make pairing-race` (原子/鎖定容量檢查)
  - `make pairing-idempotency`
  - `make pairing-refresh`
  - `make pairing-refresh-race`
- 紅燈（預期失敗）：
  - `make pairing-race-negative` (非原子 begin/commit 容量競爭)
  - `make pairing-idempotency-negative`
  - `make pairing-refresh-negative`
  - `make pairing-refresh-race-negative`

### 入口追蹤關聯 / 幂等性

**主張：** 擷取（ingestion）應在分流（fan-out）過程中保持追蹤關聯性，並在提供者重試時具備等冪性（idempotent）。

含義：

- 當一個外部事件變成多個內部訊息時，每個部分都保持相同的追蹤/事件身份。
- 重試不會導致重複處理。
- 如果缺少提供者事件 ID，去重機制會回退到安全的金鑰（例如，追蹤 ID），以避免丟失不同的事件。

- 綠燈（通過）：
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

**主張：** 路由預設必須保持 DM 會話隔離，並僅在明確配置時才合併會話（通道優先順序 + 身份連結）。

含義：

- 特定通道的 dmScope 覆蓋必須優先於全域預設值。
- identityLinks 應僅在明確連結的群組內合併，而不應跨越無關的對等端。

- 綠燈（通過）：
  - `make routing-precedence`
  - `make routing-identitylinks`
- 紅燈（預期）：
  - `make routing-precedence-negative`
  - `make routing-identitylinks-negative`

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
