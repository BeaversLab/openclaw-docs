---
summary: "實驗性捕獲可重用程序作為工作區技能，並具備審查、批准、隔離和熱技能更新功能"
title: "技能研討會插件"
read_when:
  - You want agents to turn corrections or reusable procedures into workspace skills
  - You are configuring procedural skill memory
  - You are debugging skill_workshop tool behavior
  - You are deciding whether to enable automatic skill creation
---

技能研討會 處於**實驗性**階段。它預設為停用，其捕獲啟發式和審查者提示可能會在版本之間發生變化，並且應僅在審查待處理模式輸出後於受信任的工作區中使用自動寫入。

技能研討會是工作區技能的過程記憶。它允許代理將可重用的工作流程、使用者修正、來之不易的修復方法和常見陷阱轉化為以下位置的 `SKILL.md` 檔案：

```text
<workspace>/skills/<skill-name>/SKILL.md
```

這與長期記憶不同：

- **記憶體** 儲存事實、偏好設定、實體和過去的上下文。
- **技能** 儲存代理在未來任務中應遵循的可重用程序。
- **技能研討會** 是從有用的對話轉向持久工作區技能的橋樑，並具備安全檢查和可選的批准功能。

當代理學習以下程序時，技能研討會特別有用：

- 如何驗證外部來源的動畫 GIF 資產
- 如何替換螢幕截圖資產並驗證尺寸
- 如何執行特定儲存庫的 QA 情境
- 如何調試重複出現的提供者失敗
- 如何修復過時的本地工作流程筆記

它不適用於：

- 事實，例如「使用者喜歡藍色」
- 廣泛的自傳式記憶
- 原始逐字稿歸檔
- 秘密、憑證或隱藏的提示文字
- 不會重複的一次性指令

## 預設狀態

隨附的插件處於**實驗性**階段，且預設**停用**，除非在 `plugins.entries.skill-workshop` 中明確啟用。

插件清單未設定 `enabledByDefault: true`。插件配置架構內的 `enabled: true` 預設值僅在已選取並載入插件條目之後才會套用。

實驗性意味著：

- 該插件已獲得足夠的支援以供選擇加入測試和內部使用
- 提案儲存、審查者閾值和捕獲啟發式方法可以演進
- 待批准模式是推薦的起始模式
- 自動套用適用於受信任的個人或工作區設置，不適用於共用或充滿敵意的大量輸入環境

## 啟用

最小安全配置：

```json5
{
  plugins: {
    entries: {
      "skill-workshop": {
        enabled: true,
        config: {
          autoCapture: true,
          approvalPolicy: "pending",
          reviewMode: "hybrid",
        },
      },
    },
  },
}
```

使用此配置：

- `skill_workshop` 工具可用
- 明確的可重複修正會被排入待處理提案佇列
- 基於閾值的審查者通過可以提出技能更新
- 在應用待處理提案之前，不會寫入任何技能檔案

僅在受信任的工作區中使用自動寫入：

```json5
{
  plugins: {
    entries: {
      "skill-workshop": {
        enabled: true,
        config: {
          autoCapture: true,
          approvalPolicy: "auto",
          reviewMode: "hybrid",
        },
      },
    },
  },
}
```

`approvalPolicy: "auto"` 仍使用相同的掃描器和隔離路徑。它不會應用具有嚴重發現的提案。

## 組態

| 金鑰                 | 預設值      | 範圍 / 值                                   | 含義                                                   |
| -------------------- | ----------- | ------------------------------------------- | ------------------------------------------------------ |
| `enabled`            | `true`      | 布林值                                      | 在載入外掛條目後啟用此外掛。                           |
| `autoCapture`        | `true`      | 布林值                                      | 在成功的代理回合啟用回合後擷取/審查。                  |
| `approvalPolicy`     | `"pending"` | `"pending"`, `"auto"`                       | 將提案排入佇列或自動寫入安全提案。                     |
| `reviewMode`         | `"hybrid"`  | `"off"`, `"heuristic"`, `"llm"`, `"hybrid"` | 選擇明確修正擷取、LLM 審查者、兩者皆啟用，或皆不啟用。 |
| `reviewInterval`     | `15`        | `1..200`                                    | 在這麼多次成功回合後執行審查者。                       |
| `reviewMinToolCalls` | `8`         | `1..500`                                    | 在觀察到這麼多次工具呼叫後執行審查者。                 |
| `reviewTimeoutMs`    | `45000`     | `5000..180000`                              | 嵌入式審查者執行的逾時時間。                           |
| `maxPending`         | `50`        | `1..200`                                    | 每個工作區保留的最大待處理/隔離提案數。                |
| `maxSkillBytes`      | `40000`     | `1024..200000`                              | 產生的技能/支援檔案大小上限。                          |

建議的設定檔：

```json5
// Conservative: explicit tool use only, no automatic capture.
{
  autoCapture: false,
  approvalPolicy: "pending",
  reviewMode: "off",
}
```

```json5
// Review-first: capture automatically, but require approval.
{
  autoCapture: true,
  approvalPolicy: "pending",
  reviewMode: "hybrid",
}
```

```json5
// Trusted automation: write safe proposals immediately.
{
  autoCapture: true,
  approvalPolicy: "auto",
  reviewMode: "hybrid",
}
```

```json5
// Low-cost: no reviewer LLM call, only explicit correction phrases.
{
  autoCapture: true,
  approvalPolicy: "pending",
  reviewMode: "heuristic",
}
```

## 擷取路徑

Skill Workshop 有三種擷取路徑。

### 工具建議

當模型看到可重複的程序，或當使用者要求它儲存/更新技能時，可以直接呼叫 `skill_workshop`。

這是最明確的路徑，即使使用 `autoCapture: false` 也能運作。

### 啟發式擷取

當啟用 `autoCapture` 且 `reviewMode` 為 `heuristic` 或 `hybrid` 時，
此外掛程式會掃描成功的回合以尋找明確的使用者更正短語：

- `next time`
- `from now on`
- `remember to`
- `make sure to`
- `always ... use/check/verify/record/save/prefer`
- `prefer ... when/for/instead/use`
- `when asked`

此啟發式會根據最新的符合使用者指令建立提案。
它會使用主題提示來為常見工作流程選擇技能名稱：

- 動畫 GIF 任務 -> `animated-gif-workflow`
- 螢幕截圖或資產任務 -> `screenshot-asset-workflow`
- QA 或情境任務 -> `qa-scenario-workflow`
- GitHub PR 任務 -> `github-pr-workflow`
- 後備 -> `learned-workflows`

啟發式擷取是有意限制範圍的。它是用於明確的更正和可重複的程式說明，而非用於一般逐字稿摘要。

### LLM 審查者

當啟用 `autoCapture` 且 `reviewMode` 為 `llm` 或 `hybrid` 時，此外掛程式
會在達到閾值後執行緊湊的嵌入式審查者。

審查者會接收：

- 最近的逐字稿文字，上限為最後 12,000 個字元
- 最多 12 個現有工作區技能
- 來自每個現有技能的最多 2,000 個字元
- 僅限 JSON 的指示

審查者沒有工具：

- `disableTools: true`
- `toolsAllow: []`
- `disableMessageTool: true`

審閱者會回傳 `{ "action": "none" }` 或一個提案。`action` 欄位為 `create`、`append` 或 `replace` — 當相關技能已存在時，優先使用 `append`/`replace`；僅在沒有現有技能適用時使用 `create`。

`create` 範例：

```json
{
  "action": "create",
  "skillName": "media-asset-qa",
  "title": "Media Asset QA",
  "reason": "Reusable animated media acceptance workflow",
  "description": "Validate externally sourced animated media before product use.",
  "body": "## Workflow\n\n- Verify true animation.\n- Record attribution.\n- Store a local approved copy.\n- Verify in product UI before final reply."
}
```

`append` 新增 `section` + `body`。`replace` 在指定技能中將 `oldText` 替換為 `newText`。

## 提案生命週期

每個產生的更新都會成為一個提案，包含：

- `id`
- `createdAt`
- `updatedAt`
- `workspaceDir`
- 可選的 `agentId`
- 可選的 `sessionId`
- `skillName`
- `title`
- `reason`
- `source`: `tool`、`agent_end` 或 `reviewer`
- `status`
- `change`
- 可選的 `scanFindings`
- 可選的 `quarantineReason`

提案狀態：

- `pending` - 等待批准
- `applied` - 已寫入 `<workspace>/skills`
- `rejected` - 被操作員/模型拒絕
- `quarantined` - 因關鍵掃描器發現而被封鎖

狀態是按工作區存儲在 Gateway 狀態目錄下的：

```text
<stateDir>/skill-workshop/<workspace-hash>.json
```

待處理和隔離的提案會根據技能名稱和變更內容進行去重。存儲空間會保留最新的待處理/隔離提案，最多 `maxPending` 個。

## 工具參考

該插件註冊了一個代理工具：

```text
skill_workshop
```

### `status`

依狀態統計目前工作區的提案數量。

```json
{ "action": "status" }
```

結果結構：

```json
{
  "workspaceDir": "/path/to/workspace",
  "pending": 1,
  "quarantined": 0,
  "applied": 3,
  "rejected": 0
}
```

### `list_pending`

列出待處理的提案。

```json
{ "action": "list_pending" }
```

若要列出其他狀態：

```json
{ "action": "list_pending", "status": "applied" }
```

有效的 `status` 值：

- `pending`
- `applied`
- `rejected`
- `quarantined`

### `list_quarantine`

列出隔離的提案。

```json
{ "action": "list_quarantine" }
```

當自動擷取似乎沒有任何作用，且日誌提到 `skill-workshop: quarantined <skill>` 時，請使用此選項。

### `inspect`

根據 ID 取得提案。

```json
{
  "action": "inspect",
  "id": "proposal-id"
}
```

### `suggest`

建立提案。使用 `approvalPolicy: "pending"`（預設值），這會進入佇列而不是直接寫入。

```json
{
  "action": "suggest",
  "skillName": "animated-gif-workflow",
  "title": "Animated GIF Workflow",
  "reason": "User established reusable GIF validation rules.",
  "description": "Validate animated GIF assets before using them.",
  "body": "## Workflow\n\n- Verify the URL resolves to image/gif.\n- Confirm it has multiple frames.\n- Record attribution and license.\n- Avoid hotlinking when a local asset is needed."
}
```

<AccordionGroup>
  <Accordion title="Request immediate write in auto mode (apply: true)">

```json
{
  "action": "suggest",
  "apply": true,
  "skillName": "animated-gif-workflow",
  "description": "Validate animated GIF assets before using them.",
  "body": "## Workflow\n\n- Verify true animation.\n- Record attribution."
}
```

使用 `approvalPolicy: "pending"` 時，`apply: true` 仍會將提案加入佇列。請先審閱，然後在批准後使用
`apply` 動作。

  </Accordion>

  <Accordion title="在自動策略下強制待審">

```json
{
  "action": "suggest",
  "apply": false,
  "skillName": "screenshot-asset-workflow",
  "description": "Screenshot replacement workflow.",
  "body": "## Workflow\n\n- Verify dimensions.\n- Optimize the PNG.\n- Run the relevant gate."
}
```

  </Accordion>

  <Accordion title="附加到指定區塊">

```json
{
  "action": "suggest",
  "skillName": "qa-scenario-workflow",
  "section": "Workflow",
  "description": "QA scenario workflow.",
  "body": "- For media QA, verify generated assets render and pass final assertions."
}
```

  </Accordion>

  <Accordion title="替換精確文字">

```json
{
  "action": "suggest",
  "skillName": "github-pr-workflow",
  "oldText": "- Check the PR.",
  "newText": "- Check unresolved review threads, CI status, linked issues, and changed files before deciding."
}
```

  </Accordion>
</AccordionGroup>

### `apply`

套用待審提案。

使用 `approvalPolicy: "pending"` 時，此動作會在寫入工作區技能前詢問操作員核准。

```json
{
  "action": "apply",
  "id": "proposal-id"
}
```

`apply` 會拒絕被隔離的提案：

```text
quarantined proposal cannot be applied
```

### `reject`

將提案標記為已拒絕。

```json
{
  "action": "reject",
  "id": "proposal-id"
}
```

### `write_support_file`

在現有或提議的技能目錄中寫入支援檔案。

允許的頂層支援目錄：

- `references/`
- `templates/`
- `scripts/`
- `assets/`

範例：

```json
{
  "action": "write_support_file",
  "skillName": "release-workflow",
  "relativePath": "references/checklist.md",
  "body": "# Release Checklist\n\n- Run release docs.\n- Verify changelog.\n"
}
```

支援檔案會受到工作區範圍限制、路徑檢查、受 `maxSkillBytes` 的位元組數限制、掃描，並且以原子方式寫入。

## 技能寫入

Skill Workshop 僅寫入於：

```text
<workspace>/skills/<normalized-skill-name>/
```

技能名稱會經過正規化處理：

- 轉為小寫
- 非 `[a-z0-9_-]` 字元會變成 `-`
- 移除前導和結尾的非英數字元
- 最大長度為 80 個字元
- 最終名稱必須符合 `[a-z0-9][a-z0-9_-]{1,79}`

對於 `create`：

- 如果技能不存在，Skill Workshop 會寫入一個新的 `SKILL.md`
- 如果技能已存在，Skill Workshop 會將內容附加到 `## Workflow`

對於 `append`：

- 如果技能存在，Skill Workshop 會附加到要求的區段
- 如果技能不存在，Skill Workshop 會建立一個最小技能然後附加

對於 `replace`：

- 該技能必須已經存在
- `oldText` 必須精確存在
- 僅替換第一個精確匹配項

所有寫入操作都是原子的，並且會立即刷新記憶體中的技能快照，因此
無需重新啟動 Gateway 即可看到新增或更新的技能。

## 安全模型

Skill Workshop 對生成的 `SKILL.md` 內容和支援
檔案設有安全掃描器。

關鍵發現會隔離提案：

| 規則 ID                                | 封鎖...的內容                                             |
| -------------------------------------- | --------------------------------------------------------- |
| `prompt-injection-ignore-instructions` | 告知代理程式忽略先前/更高層級的指令                       |
| `prompt-injection-system`              | 參照系統提示詞、開發者訊息或隱藏指令                      |
| `prompt-injection-tool`                | 鼓勵繞過工具權限/核准                                     |
| `shell-pipe-to-shell`                  | 包含透過管道傳送至 `sh`、`bash` 或 `zsh` 的 `curl`/`wget` |
| `secret-exfiltration`                  | 似乎透過網路發送 env/process env 資料                     |

警告發現會被保留，但本身不會封鎖：

| 規則 ID              | 針對...發出警告            |
| -------------------- | -------------------------- |
| `destructive-delete` | 廣泛的 `rm -rf` 風格指令   |
| `unsafe-permissions` | `chmod 777` 風格的權限使用 |

被隔離的提案：

- 保留 `scanFindings`
- 保留 `quarantineReason`
- 出現在 `list_quarantine` 中
- 無法透過 `apply` 套用

若要從被隔離的提案中恢復，請建立一個移除了不安全內容的新安全提案。請勿手動編輯 store JSON。

## 提示詞指導

啟用後，Skill Workshop 會注入一小段提示詞，告知代理程式
使用 `skill_workshop` 作為持久的程序性記憶。

該指導強調：

- 程序，而非事實/偏好
- 使用者修正
- 不明顯的成功程序
- 反覆出現的陷阱
- 透過附加/替換來修復過時/薄弱/錯誤的技能
- 在漫長的工具迴圈或艱難的修復後儲存可重複使用的程序
- 簡短的命令式技能文字
- 不傾印對話紀錄

寫入模式文字會隨 `approvalPolicy` 變更：

- 待定模式 (pending mode)：將建議排入佇列；經明確批准後使用 `apply`
- 自動模式 (auto mode)：套用安全的工作區技能更新，除非 `apply: false` 改為將其排入佇列

## 成本與執行時期行為

啟發式擷取 (Heuristic capture) 不會呼叫模型。

LLM 審查會在作用中/預設代理模型上使用嵌入執行。它是基於閾值的，因此預設情況下不會在每個回合執行。

審查者：

- 在可用時使用相同設定的供應商/模型內容
- 回退至執行時期代理預設值
- 具有 `reviewTimeoutMs`
- 使用輕量級引導內容
- 沒有工具
- 不直接寫入任何內容
- 只能發出經過正常掃描器和批准/隔離路徑的提案

如果審查者失敗、逾時或傳回無效的 JSON，外掛程式會記錄
警告/除錯訊息並跳過該次審查。

## 操作模式

當使用者說以下內容時使用 Skill Workshop：

- "下次要做 X"
- "從現在開始，優先選擇 Y"
- "務必驗證 Z"
- "將此儲存為工作流程"
- "這花了一些時間；記住這個過程"
- "更新相關的本地技能"

好的技能文字：

```markdown
## Workflow

- Verify the GIF URL resolves to `image/gif`.
- Confirm the file has multiple frames.
- Record source URL, license, and attribution.
- Store a local copy when the asset will ship with the product.
- Verify the local asset renders in the target UI before final reply.
```

差的技能文字：

```markdown
The user asked about a GIF and I searched two websites. Then one was blocked by
Cloudflare. The final answer said to check attribution.
```

不應儲存較差版本的原因：

- 形狀像對話紀錄
- 非命令式
- 包含雜訊一勞永逸的細節
- 未告知下一個代理該做什麼

## 除錯

檢查外掛程式是否已載入：

```bash
openclaw plugins list --enabled
```

檢查來自代理/工具內容的提案計數：

```json
{ "action": "status" }
```

檢查待定提案：

```json
{ "action": "list_pending" }
```

檢查隔離提案：

```json
{ "action": "list_quarantine" }
```

常見徵狀：

| 徵狀                     | 可能原因                                                           | 檢查                                                                |
| ------------------------ | ------------------------------------------------------------------ | ------------------------------------------------------------------- |
| 工具無法使用             | 未啟用外掛程式項目                                                 | `plugins.entries.skill-workshop.enabled` 和 `openclaw plugins list` |
| 未出現自動提案           | `autoCapture: false`、`reviewMode: "off"`，或未達閾值              | 組態、提案狀態、Gateway 日誌                                        |
| 啟發式未擷取             | 使用者措辭不符合修正模式                                           | 使用明確的 `skill_workshop.suggest` 或啟用 LLM 審查者               |
| 審查者未建立提案         | 審查者傳回 `none`、無效的 JSON 或逾時                              | Gateway 日誌、`reviewTimeoutMs`、閾值                               |
| 未套用提案               | `approvalPolicy: "pending"`                                        | `list_pending`，然後 `apply`                                        |
| 提案從待處理狀態消失     | 重複的提案被重複使用、達到最大待處理修剪數量，或已被套用/拒絕/隔離 | `status`，帶有狀態過濾器的 `list_pending`，`list_quarantine`        |
| 技能檔案存在但模型未使用 | 技能快照未重新整理或技能閘門將其排除                               | `openclaw skills` 狀態與工作區技能資格                              |

相關日誌：

- `skill-workshop: queued <skill>`
- `skill-workshop: applied <skill>`
- `skill-workshop: quarantined <skill>`
- `skill-workshop: heuristic capture skipped: ...`
- `skill-workshop: reviewer skipped: ...`
- `skill-workshop: reviewer found no update`

## QA 情境

儲存庫支援的 QA 情境：

- `qa/scenarios/plugins/skill-workshop-animated-gif-autocreate.md`
- `qa/scenarios/plugins/skill-workshop-pending-approval.md`
- `qa/scenarios/plugins/skill-workshop-reviewer-autonomous.md`

執行確定性覆蓋率：

```bash
pnpm openclaw qa suite \
  --scenario skill-workshop-animated-gif-autocreate \
  --scenario skill-workshop-pending-approval \
  --concurrency 1
```

執行審查者覆蓋率：

```bash
pnpm openclaw qa suite \
  --scenario skill-workshop-reviewer-autonomous \
  --concurrency 1
```

審查者情境是有意分開的，因為它會啟用
`reviewMode: "llm"` 並執行內嵌的審查者通過。

## 何時不啟用自動套用

當發生以下情況時，避免使用 `approvalPolicy: "auto"`：

- 工作區包含敏感程序
- 代理正在處理不受信任的輸入
- 技能在廣泛的團隊中共享
- 您仍在調整提示詞或掃描器規則
- 模型經常處理惡意的網頁/電子郵件內容

請先使用待處理模式。僅在審查該工作區中代理提出的技能類型後，才切換到自動模式。

## 相關文件

- [技能](/zh-Hant/tools/skills)
- [外掛程式](/zh-Hant/tools/plugin)
- [測試](/zh-Hant/reference/test)
