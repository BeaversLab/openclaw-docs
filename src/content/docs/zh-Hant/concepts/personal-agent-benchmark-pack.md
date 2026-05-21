---
summary: "用於隱私保護個人助理工作流程檢查的本機 QA 頻道情境。"
read_when:
  - Running local personal agent reliability checks
  - Extending the repo-backed QA scenario catalog
  - Verifying reminder, reply, memory, redaction, safe tool followthrough, task status, share-safe diagnostics, and proof-backed completion claims
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

## 情境

機器可讀的套件元數據位於
`extensions/qa-lab/src/scenario-packs.ts`。使用
`--pack personal-agent` 執行套件：

```bash
OPENCLAW_ENABLE_PRIVATE_QA_CLI=1 pnpm openclaw qa suite \
  --provider-mode mock-openai \
  --pack personal-agent \
  --concurrency 1
```

`--pack` 與重複的 `--scenario` 標誌具有累加性。明確指定的情境會
先執行，然後套件情境會按 `QA_PERSONAL_AGENT_SCENARIO_IDS` 順序執行，並
移除重複項。

該套件專為搭配 `mock-openai` 或其他本地 QA
供應商通道使用 `qa-channel` 而設計。不應將其指向即時聊天服務或真實的個人
帳戶。

## 隱私模型

這些情境僅使用假使用者、假偏好設定、假機密以及由套件建立的
temporary QA gateway workspace。它們絕不能讀取或寫入
真實的 OpenClaw 使用者記憶體、工作階段、憑證、啟動代理程式、全域設定，
或即時閘道狀態。

產出資保留在現有的 QA 套件產出目錄下，應將其視為測試輸出。編校檢查使用假標記，因此失敗情況是安全
的，可供檢查並提報為問題。

## 擴充套件

在 `qa/scenarios/personal/` 下新增案例，然後將情境 id 新增至
`QA_PERSONAL_AGENT_SCENARIO_IDS`。保持每個案例小而本地、在
`mock-openai` 中具有確定性，並專注於單一個人助理行為。

良好的後續候選項：

- 編校後的軌跡匯出檢查
- 僅限本地的外掛程式工作流程檢查

避免新增新的 runner、外掛程式、相依性、即時傳輸或模型評審，
直到情境目錄中有足夠穩定的案例足以支持該介面。
