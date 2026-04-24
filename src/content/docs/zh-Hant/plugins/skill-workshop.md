---
title: "Skill Workshop Plugin"
summary: "實驗性擷取可重複使用的程序作為工作區技能，具有審查、批准、隔離和熱技能重新整理功能"
read_when:
  - You want agents to turn corrections or reusable procedures into workspace skills
  - You are configuring procedural skill memory
  - You are debugging skill_workshop tool behavior
  - You are deciding whether to enable automatic skill creation
---

# Skill Workshop Plugin

Skill Workshop 是**實驗性**功能。它預設為停用，其擷取啟發式和審查者提示可能會在版本之間變更，且應僅在先審查擱置模式輸出後，於受信任的工作區中使用自動寫入。

Skill Workshop 是工作區技能的程序記憶。它讓代理人將可重複使用的工作流程、使用者修正、得來不易的修復和常見陷阱轉變為以下目錄下的 `SKILL.md` 檔案：

```text
<workspace>/skills/<skill-name>/SKILL.md
```

這與長期記憶不同：

- **記憶** 儲存事實、偏好設定、實體和過去的語境。
- **技能** 儲存代理人在未來任務中應遵循的可重複使用程序。
- **Skill Workshop** 是從有用的對話轉變為持久工作區技能的橋樑，具有安全檢查和選擇性批准。

當代理人學習到以下程序時，Skill Workshop 非常有用：

- 如何驗證外部來源的動畫 GIF 資源
- 如何取代截圖資源並驗證尺寸
- 如何執行特定儲存庫的 QA 情境
- 如何除錯重複發生的提供者失敗
- 如何修復過期的本地工作流程備忘錄

它不適用於：

- 諸如「使用者喜歡藍色」之類的事實
- 廣泛的自傳式記憶
- 原始逐字稿歸檔
- 機密、憑證或隱藏的提示文字
- 不會重複發生的一次性指令

## Default State

隨附的外掛程式是**實驗性**的，且預設為**停用**，除非在 `plugins.entries.skill-workshop` 中明確啟用。

外掛程式清單未設定 `enabledByDefault: true`。外掛程式配置架構內的 `enabled: true` 預設值僅在外掛程式項目已被選取並載入之後才會套用。

實驗性功能意味著：

- 該外掛程式已獲得足夠支援，可供選擇性測試和內部使用
- 提議儲存、審查者閾值和擷取啟發式方法可能會演進
- 擱置批准是建議的起始模式
- 自動套用適用於受信任的個人/工作區設定，而非共用或敵對的輸入繁重的環境

## Enable

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
- 明確的可重複修正會排入待定提案
- 基於閾值的審查者通過可以提出技能更新
- 在應用待定提案之前，不會寫入任何技能檔案

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

`approvalPolicy: "auto"` 仍使用相同的掃描器和隔離路徑。
它不會應用帶有關鍵發現的提案。

## 組態

| 金鑰                 | 預設值      | 範圍 / 值                                   | 含義                                                   |
| -------------------- | ----------- | ------------------------------------------- | ------------------------------------------------------ |
| `enabled`            | `true`      | 布林值                                      | 在載入外掛條目後啟用此外掛。                           |
| `autoCapture`        | `true`      | 布林值                                      | 在成功的主體輪次後啟用輪次後擷取/審查。                |
| `approvalPolicy`     | `"pending"` | `"pending"`, `"auto"`                       | 將提案排入佇列或自動寫入安全的提案。                   |
| `reviewMode`         | `"hybrid"`  | `"off"`, `"heuristic"`, `"llm"`, `"hybrid"` | 選擇明確的修正擷取、LLM 審查者、兩者皆有，或皆不選擇。 |
| `reviewInterval`     | `15`        | `1..200`                                    | 在這麼多次成功的輪次後執行審查者。                     |
| `reviewMinToolCalls` | `8`         | `1..500`                                    | 在觀察到這麼多次工具呼叫後執行審查者。                 |
| `reviewTimeoutMs`    | `45000`     | `5000..180000`                              | 嵌入式審查者執行的逾時時間。                           |
| `maxPending`         | `50`        | `1..200`                                    | 每個工作區保留的待定/隔離提案的最大數量。              |
| `maxSkillBytes`      | `40000`     | `1024..200000`                              | 生成的技能/支援檔案的最大大小。                        |

推薦的設定檔：

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

技能工作坊有三種擷取路徑。

### 工具建議

當模型看到可重複使用的程序，或者使用者要求它儲存/更新技能時，
可以直接呼叫 `skill_workshop`。

這是最明確的路徑，即使使用 `autoCapture: false` 也能運作。

### 啟發式擷取

當 `autoCapture` 啟用且 `reviewMode` 為 `heuristic` 或 `hybrid` 時，
外掛程式會掃描成功的回合以尋找明確的使用者更正片語：

- `next time`
- `from now on`
- `remember to`
- `make sure to`
- `always ... use/check/verify/record/save/prefer`
- `prefer ... when/for/instead/use`
- `when asked`

啟發式會根據最新的相符使用者指令建立提議。它使用主題提示來為常見工作流程選擇技能名稱：

- 動畫 GIF 任務 -> `animated-gif-workflow`
- 螢幕擷圖或資產任務 -> `screenshot-asset-workflow`
- QA 或情境任務 -> `qa-scenario-workflow`
- GitHub PR 任務 -> `github-pr-workflow`
- 後備方案 -> `learned-workflows`

啟發式擷取是有意限制範圍的。它僅適用於明確的更正和可重複的程式說明，而非一般的逐字稿摘要。

### LLM 審查者

當 `autoCapture` 啟用且 `reviewMode` 為 `llm` 或 `hybrid` 時，外掛程式
會在達到閾值後執行精簡的嵌入式審查者。

審查者接收：

- 最近的逐字稿文字，上限為最後 12,000 個字元
- 最多 12 個現有工作區技能
- 來自每個現有技能的最多 2,000 個字元
- 僅限 JSON 的指令

審查者沒有任何工具：

- `disableTools: true`
- `toolsAllow: []`
- `disableMessageTool: true`

它可以傳回：

```json
{ "action": "none" }
```

或一個技能提議：

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

它也可以附加到現有技能：

```json
{
  "action": "append",
  "skillName": "qa-scenario-workflow",
  "title": "QA Scenario Workflow",
  "reason": "Animated media QA needs reusable checks",
  "description": "QA scenario workflow.",
  "section": "Workflow",
  "body": "- For animated GIF tasks, verify frame count and attribution before passing."
}
```

或取代現有技能中的確切文字：

```json
{
  "action": "replace",
  "skillName": "screenshot-asset-workflow",
  "title": "Screenshot Asset Workflow",
  "reason": "Old validation missed image optimization",
  "oldText": "- Replace the screenshot asset.",
  "newText": "- Replace the screenshot asset, preserve dimensions, optimize the PNG, and run the relevant validation gate."
}
```

當相關技能已經存在時，優先使用 `append` 或 `replace`。僅當沒有現有
技能適合時才使用 `create`。

## 提議生命週期

每個產生的更新都會成為具有以下內容的提議：

- `id`
- `createdAt`
- `updatedAt`
- `workspaceDir`
- 選填 `agentId`
- 選填 `sessionId`
- `skillName`
- `title`
- `reason`
- `source`：`tool`、`agent_end` 或 `reviewer`
- `status`
- `change`
- 選填 `scanFindings`
- 選填 `quarantineReason`

提案狀態：

- `pending` - 等待審批
- `applied` - 已寫入 `<workspace>/skills`
- `rejected` - 被操作員/模型拒絕
- `quarantined` - 因關鍵掃描器發現而被封鎖

狀態按工作區儲存在 Gateway 狀態目錄下：

```text
<stateDir>/skill-workshop/<workspace-hash>.json
```

待處理和隔離的提案會依據技能名稱和變更 payload 進行去重。儲存最多會保留
`maxPending` 個最新的待處理/隔離提案。

## 工具參考

此外掛註冊了一個代理工具：

```text
skill_workshop
```

### `status`

依狀態計算目前工作區的提案數量。

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

當自動擷取似乎沒有任何動作，且日誌中提及
`skill-workshop: quarantined <skill>` 時使用此功能。

### `inspect`

依 ID 取得提案。

```json
{
  "action": "inspect",
  "id": "proposal-id"
}
```

### `suggest`

建立提案。若使用 `approvalPolicy: "pending"`，預設會加入佇列。

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

強制安全寫入：

```json
{
  "action": "suggest",
  "apply": true,
  "skillName": "animated-gif-workflow",
  "description": "Validate animated GIF assets before using them.",
  "body": "## Workflow\n\n- Verify true animation.\n- Record attribution."
}
```

即使在 `approvalPolicy: "auto"` 中也強制設為待處理：

```json
{
  "action": "suggest",
  "apply": false,
  "skillName": "screenshot-asset-workflow",
  "description": "Screenshot replacement workflow.",
  "body": "## Workflow\n\n- Verify dimensions.\n- Optimize the PNG.\n- Run the relevant gate."
}
```

附加至區段：

```json
{
  "action": "suggest",
  "skillName": "qa-scenario-workflow",
  "section": "Workflow",
  "description": "QA scenario workflow.",
  "body": "- For media QA, verify generated assets render and pass final assertions."
}
```

替換精確文字：

```json
{
  "action": "suggest",
  "skillName": "github-pr-workflow",
  "oldText": "- Check the PR.",
  "newText": "- Check unresolved review threads, CI status, linked issues, and changed files before deciding."
}
```

### `apply`

套用待處理的提案。

```json
{
  "action": "apply",
  "id": "proposal-id"
}
```

`apply` 會拒絕隔離的提案：

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

在現有或建議的技能目錄內寫入一個支援檔案。

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

支援檔案受工作區範圍限制、經過路徑檢查、受 `maxSkillBytes` 位元組限制、會被掃描，並且以原子方式寫入。

## 技能寫入

Skill Workshop 僅寫入至以下位置：

```text
<workspace>/skills/<normalized-skill-name>/
```

技能名稱會經過正規化處理：

- 轉為小寫
- 非 `[a-z0-9_-]` 連續字串會變成 `-`
- 開頭和結尾的非英數字元會被移除
- 最大長度為 80 個字元
- 最終名稱必須符合 `[a-z0-9][a-z0-9_-]{1,79}`

對於 `create`：

- 如果技能不存在，Skill Workshop 會寫入一個新的 `SKILL.md`
- 如果技能已存在，Skill Workshop 會將內容附加至 `## Workflow`

對於 `append`：

- 如果技能存在，Skill Workshop 會附加到請求的區段
- 如果技能不存在，Skill Workshop 會建立一個最小化的技能然後附加內容

對於 `replace`：

- 技能必須已經存在
- `oldText` 必須完全存在
- 只有第一個完全符合的項目會被替換

所有寫入操作都是原子的，並會立即重新整理記憶體中的技能快照，因此
不需要重新啟動 Gateway 即可看到新增或更新的技能。

## 安全模型

Skill Workshop 對於生成的 `SKILL.md` 內容和支援
檔案具有安全掃描器。

關鍵發現會隔離提案：

| 規則 ID                                | 封鎖以下內容...                                           |
| -------------------------------------- | --------------------------------------------------------- |
| `prompt-injection-ignore-instructions` | 告知代理程式忽略先前/較高層級的指示                       |
| `prompt-injection-system`              | 參照系統提示詞、開發者訊息或隱藏的指示                    |
| `prompt-injection-tool`                | 鼓勵繞過工具權限/核准                                     |
| `shell-pipe-to-shell`                  | 包含透過管道傳送至 `sh`、`bash` 或 `zsh` 的 `curl`/`wget` |
| `secret-exfiltration`                  | 似乎透過網路發送環境變數/行程環境變數資料                 |

Warn findings are retained but do not block by themselves:

| Rule id              | Warns on...                      |
| -------------------- | -------------------------------- |
| `destructive-delete` | broad `rm -rf` style commands    |
| `unsafe-permissions` | `chmod 777` style permission use |

Quarantined proposals:

- keep `scanFindings`
- keep `quarantineReason`
- appear in `list_quarantine`
- cannot be applied through `apply`

To recover from a quarantined proposal, create a new safe proposal with the
unsafe content removed. Do not edit the store JSON by hand.

## Prompt Guidance

When enabled, Skill Workshop injects a short prompt section that tells the agent
to use `skill_workshop` for durable procedural memory.

The guidance emphasizes:

- procedures, not facts/preferences
- user corrections
- non-obvious successful procedures
- recurring pitfalls
- stale/thin/wrong skill repair through append/replace
- saving reusable procedure after long tool loops or hard fixes
- short imperative skill text
- no transcript dumps

The write mode text changes with `approvalPolicy`:

- pending mode: queue suggestions; apply only after explicit approval
- auto mode: apply safe workspace-skill updates when clearly reusable

## Costs and Runtime Behavior

Heuristic capture does not call a model.

LLM review uses an embedded run on the active/default agent model. It is
threshold-based so it does not run on every turn by default.

The reviewer:

- uses the same configured provider/model context when available
- falls back to runtime agent defaults
- has `reviewTimeoutMs`
- uses lightweight bootstrap context
- has no tools
- writes nothing directly
- can only emit a proposal that goes through the normal scanner and
  approval/quarantine path

If the reviewer fails, times out, or returns invalid JSON, the plugin logs a
warning/debug message and skips that review pass.

## Operating Patterns

Use Skill Workshop when the user says:

- “next time, do X”
- “from now on, prefer Y”
- “make sure to verify Z”
- “save this as a workflow”
- “this took a while; remember the process”
- “update the local skill for this”

Good skill text:

```markdown
## Workflow

- Verify the GIF URL resolves to `image/gif`.
- Confirm the file has multiple frames.
- Record source URL, license, and attribution.
- Store a local copy when the asset will ship with the product.
- Verify the local asset renders in the target UI before final reply.
```

Poor skill text:

```markdown
The user asked about a GIF and I searched two websites. Then one was blocked by
Cloudflare. The final answer said to check attribution.
```

Reasons the poor version should not be saved:

- 逐字稿形狀
- 非指令式
- 包含一次性雜訊細節
- 未告知下一個代理該做什麼

## 除錯

檢查外掛程式是否已載入：

```bash
openclaw plugins list --enabled
```

從代理/工具上下文檢查提案計數：

```json
{ "action": "status" }
```

檢查待處理提案：

```json
{ "action": "list_pending" }
```

檢查隔離提案：

```json
{ "action": "list_quarantine" }
```

常見症狀：

| 症狀                       | 可能原因                                                 | 檢查                                                                |
| -------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------- |
| 工具無法使用               | 外掛程式項目未啟用                                       | `plugins.entries.skill-workshop.enabled` 和 `openclaw plugins list` |
| 未出現自動提案             | `autoCapture: false`、`reviewMode: "off"` 或未達閾值     | 設定、提案狀態、Gateway 日誌                                        |
| 啟發式未捕獲               | 使用者措辭不符合修正模式                                 | 使用明確的 `skill_workshop.suggest` 或啟用 LLM 審查者               |
| 審查者未建立提案           | 審查者返回 `none`、無效 JSON 或逾時                      | Gateway 日誌、`reviewTimeoutMs`、閾值                               |
| 提案未套用                 | `approvalPolicy: "pending"`                              | `list_pending`，然後 `apply`                                        |
| 提案從待處理中消失         | 重複提案被重用、待處理數量上限修剪，或已被套用/拒絕/隔離 | `status`、帶狀態過濾器的 `list_pending`、`list_quarantine`          |
| 技能檔案存在但模型遺漏了它 | 技能快照未重新整理或技能閘門排除了它                     | `openclaw skills` 狀態和工作區技能資格                              |

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

審查者情境刻意分開，因為它啟用了
`reviewMode: "llm"` 並執行內建審查者傳遞。

## 何時不啟用自動套用

當下列情況時避免 `approvalPolicy: "auto"`：

- 工作區包含敏感程序
- 代理正在處理不受信任的輸入
- 技能在大型團隊中共享
- 您仍在調整提示詞或掃描器規則
- 模型經常處理惡意的網路/電子郵件內容

請先使用待審模式。僅在審查代理在該工作區中提出的技能類型後，再切換到自動模式。

## 相關文件

- [技能](/zh-Hant/tools/skills)
- [外掛程式](/zh-Hant/tools/plugin)
- [測試](/zh-Hant/reference/test)
