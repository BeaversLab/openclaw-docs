---
summary: "用於隱私保護個人助理工作流程檢查的本機 QA 頻道情境。"
read_when:
  - Running local personal agent reliability checks
  - Extending the repo-backed QA scenario catalog
  - Verifying reminder, reply, memory, redaction, safe tool followthrough, task status, share-safe diagnostics, proof-backed completion claims, and failure recovery
title: "Personal agent benchmark pack"
---

Personal Agent Benchmark Pack 是一個用於本機個人助理工作流程的小型 repo-backed QA 情境包。它不是通用的模型基準測試，也不需要新的執行器。該套件重複使用了 [QA overview](/zh-Hant/concepts/qa-e2e-automation) 中描述的私有 QA 堆疊、合成的 [QA channel](/zh-Hant/channels/qa-channel)，以及現有的 `qa/scenarios` markdown 目錄。

第一個套件是有意保持狹窄的：

- 透過本機 cron 傳遞的假個人提醒
- 透過 `qa-channel` 的假 DM 和執行緒回覆路由
- 從暫時性 QA 工作區記憶體檔案中回憶假偏好設定
- 假機密不回顯檢查
- 在短暫的批准風格回合後，安全地執行基於讀取的工具後續操作
- 針對敏感本地讀取請求的批准、拒絕和停止行為
- 基於證據的任務狀態報告，將待處理、已阻擋和已完成分開
- 可分享的安全診斷產出資產，在保留有用狀態的同時省略原始個人內容
- 有憑證支援的完成聲明，在存在本地證據之前避免虛假進度
- 失敗恢復會回報部分狀態並保持重試邊界清晰

## 場景

機器可讀取的套件中繼資料位於
`extensions/qa-lab/src/scenario-packs.ts`。使用
`--pack personal-agent` 執行套件：

```bash
OPENCLAW_ENABLE_PRIVATE_QA_CLI=1 pnpm openclaw qa suite \
  --provider-mode mock-openai \
  --pack personal-agent \
  --concurrency 1
```

`--pack` 對於重複的 `--scenario` 旗標具有累加效果。明確指定的場景會先執行，接著在 `QA_PERSONAL_AGENT_SCENARIO_IDS` 順序中執行套件場景，並移除重複項目。

此套件專為 `qa-channel` 與 `mock-openai` 或其他本機 QA 提供者通道而設計。不應將其指向即時聊天服務或真實的個人帳戶。

## 隱私模型

這些場景僅使用假使用者、假偏好設定、假機密資訊，以及由套件建立的暫時性 QA 閘道工作區。它們絕對不得讀取或寫入真實的 OpenClaw 使用者記憶體、工作階段、憑證、啟動代理程式、全域組態，或即時閘道狀態。

成品會保留在現有的 QA 套件成品目錄下，應視為測試輸出處理。遮蔽檢查會使用假標記，因此檢查失敗時可以安全地檢視並回報問題。

## 擴充套件

在 `qa/scenarios/personal/` 下新增案例，然後將場景 ID 新增到
`QA_PERSONAL_AGENT_SCENARIO_IDS`。保持每個案例小型、本機化、在 `mock-openai` 中具有決定性，並專注於單一個人助理行為。

良好的後續候選項：

- 已遮蔽的軌跡匯出檢查
- 僅限本機的外掛程式工作流程檢查

在場景目錄有足夠穩定的案例足以證明該介面的合理性之前，請避免新增新的執行器、外掛程式、相依性、即時傳輸或模型評判。
