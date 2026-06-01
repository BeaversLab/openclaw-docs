---
summary: "Gateway 客戶端的操作員角色、範圍以及配對時檢查"
read_when:
  - Debugging missing operator scope errors
  - Reviewing device or node pairing approvals
  - Adding or classifying Gateway RPC methods
title: "操作員範圍"
---

操作員範圍定義了 Gateway 客戶端在通過驗證後可以執行的操作。它們是在單一受信任的 Gateway 操作員域內的控制平面防護措施，而非針對敵對多租戶的隔離機制。如果您需要人員、團隊或機器之間的強烈隔離，請在不同的作業系統使用者或主機下執行個別的 Gateway。

相關：[安全性](/zh-Hant/gateway/security)、[Gateway 協定](/zh-Hant/gateway/protocol)、
[Gateway 配對](/zh-Hant/gateway/pairing)、[Devices CLI](/zh-Hant/cli/devices)。

## 角色

Gateway WebSocket 客戶端使用以下其中一種角色連線：

- `operator`：控制平面客戶端，例如 CLI、Control UI、自動化工具和
  受信任的輔助程序。
- `node`：功能主機，例如 macOS、iOS、Android 或無頭節點，透過 `node.invoke` 暴露指令。

操作員 RPC 方法需要 `operator` 角色。節點發起的方法
需要 `node` 角色。

## 範圍層級

| 範圍                    | 含義                                                                                                           |
| ----------------------- | -------------------------------------------------------------------------------------------------------------- |
| `operator.read`         | 唯讀狀態、清單、目錄、日誌、工作階段讀取和其他非變異控制平面呼叫。                                             |
| `operator.write`        | 正常的變異操作員操作，例如傳送訊息、叫用工具、更新 Talk/語音設定以及節點指令中繼。同時也滿足 `operator.read`。 |
| `operator.admin`        | 管理控制平面存取。滿足每個 `operator.*` 範圍。組態變異、更新、原生攔截器、敏感的保留命名空間和高風險審核所需。 |
| `operator.pairing`      | 裝置和節點配對管理，包括列出、核准、拒絕、移除、輪替和撤銷配對記錄或裝置權杖。                                 |
| `operator.approvals`    | Exec 和外掛程式核准 API。                                                                                      |
| `operator.talk.secrets` | 讀取包含機密的 Talk 組態。                                                                                     |

未知的未來 `operator.*` 範圍需要完全匹配，除非呼叫者擁有
`operator.admin`。

## 方法範圍僅是第一道關卡

每個 Gateway RPC 都具有最小權限的方法範圍。該方法範圍決定
請求是否能到達處理程式。然後，部分處理程式會根據正在批准或變更的具體物件，
應用更嚴格的批准時間檢查。

範例：

- `device.pair.approve` 可透過 `operator.pairing` 存取，但批准
  運算子裝置只能產生或保留呼叫者已持有的範圍。
- `node.pair.approve` 可透過 `operator.pairing` 存取，然後從待處理的節點指令清單
  衍生額外的批准範圍。
- `chat.send` 通常是具有寫入範圍的方法，但持續性的 `/config set`
  和 `/config unset` 需要在指令層級具備 `operator.admin`。

這讓較低範圍的運算子能執行低風險的配對動作，而無需將
所有配對批准設為僅限管理員。

## 裝置配對批准

裝置配對記錄是已批准角色和範圍的持久來源。
已配對的裝置不會自動獲得更廣泛的存取權：請求更廣泛角色或範圍的重連
會建立一個新的待處理升級請求。

批准裝置請求時：

- 沒有運算子角色的請求不需要運算子權杖範圍批准。
- 請求非操作員裝置角色（例如 `node`）需要
  `operator.admin`，即使 `device.pair.approve` 可透過
  `operator.pairing` 到達。
- 請求 `operator.read`、`operator.write`、`operator.approvals`、
  `operator.pairing` 或 `operator.talk.secrets` 需要呼叫者持有
  這些範圍，或 `operator.admin`。
- 請求 `operator.admin` 需要 `operator.admin`。
- 沒有明確範圍的修復請求可以繼承現有的操作員
  權杖範圍。如果現有的權杖具有管理員範圍，批准仍然需要
  `operator.admin`。

非管理員共享祕密和受信任代理程式會話只能在其自己宣告的操作員範圍內批准操作員-裝置
請求。批准非操作員
角色僅限管理員，即使這些會話在其他情況下可以使用
`operator.pairing`。

對於已配對裝置權杖會話，除非呼叫者擁有
`operator.admin`，否則管理也是自我範圍的：非管理員呼叫者只能看到自己的配對
項目，只能批准或拒絕自己的待處理請求，並且只能輪換、
撤銷或移除自己的裝置項目。

## 節點配對批准

舊版 `node.pair.*` 使用獨立的 Gateway 擁有的節點配對儲存。WS 節點
使用帶有 `role: node` 的裝置配對，但適用相同的批准級別詞彙
。

`node.pair.approve` 使用待處理請求命令列表來推導額外
的必需範圍：

- 無命令請求：`operator.pairing`
- 非 exec 節點命令：`operator.pairing` + `operator.write`
- `system.run`、`system.run.prepare` 或 `system.which`：
  `operator.pairing` + `operator.admin`

節點配對建立身分與信任。它並不取代節點自身的 `system.run` exec 審核策略。

## 共享密鑰驗證

共用閘道 token/密碼驗證被視為該閘道的受信任操作員存取。OpenAI 相容 HTTP 介面、`/tools/invoke` 以及 HTTP 會話歷史端點會恢復為共用密鑰 bearer 驗證設定的正常完整操作員預設範圍，即使呼叫方傳送了較窄的宣告範圍。

承載身分的模式，例如受信任的代理驗證或 private-ingress `none`，仍可遵守明確宣告的範圍。請使用獨立的閘道來達成真正的信任邊界隔離。
