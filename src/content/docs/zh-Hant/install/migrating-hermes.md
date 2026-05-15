---
summary: "Move from Hermes to OpenClaw with a previewed, reversible import"
read_when:
  - You are coming from Hermes and want to keep your model config, prompts, memory, and skills
  - You want to know what OpenClaw imports automatically and what stays archive-only
  - You need a clean, scripted migration path (CI, fresh laptop, automation)
title: "Migrating from Hermes"
---

OpenClaw 透過內建的遷移提供者匯入 Hermes 狀態。提供者在變更狀態前會預覽所有內容，在計畫和報告中編輯敏感資訊，並在套用前建立經過驗證的備份。

<Note>匯入需要全新的 OpenClaw 設定。如果您本機已有 OpenClaw 狀態，請先重設設定、憑證、工作階段和工作區，或在檢視計畫後直接搭配 `--overwrite` 使用 `openclaw migrate`。</Note>

## 兩種匯入方式

<Tabs>
  <Tab title="Onboarding wizard">
    最快速的路徑。精靈會偵測位於 `~/.hermes` 的 Hermes，並在套用前顯示預覽。

    ```bash
    openclaw onboard --flow import
    ```

    或指定特定來源：

    ```bash
    openclaw onboard --import-from hermes --import-source ~/.hermes
    ```

  </Tab>
  <Tab title="CLI">
    使用 `openclaw migrate` 進行腳本化或可重複的執行。請參閱 [`openclaw migrate`](/zh-Hant/cli/migrate) 以取得完整參考資料。

    ```bash
    openclaw migrate hermes --dry-run    # preview only
    openclaw migrate apply hermes --yes  # apply with confirmation skipped
    ```

    當 Hermes 位於 `~/.hermes` 之外時，請加入 `--from <path>`。

  </Tab>
</Tabs>

## 匯入的內容

<AccordionGroup>
  <Accordion title="Model configuration">
    - 從 Hermes 選取的預設模型 `config.yaml`。
    - 來自 `providers` 和 `custom_providers` 的已配置模型提供者和自訂 OpenAI 相容端點。

  </Accordion>
  <Accordion title="MCP servers">
    來自 `mcp_servers` 或 `mcp.servers` 的 MCP 伺服器定義。
  </Accordion>
  <Accordion title="Workspace files">
    - `SOUL.md` 和 `AGENTS.md` 會被複製到 OpenClaw 代理工作區中。
    - `memories/MEMORY.md` 和 `memories/USER.md` 將會被**附加**到對應的 OpenClaw 記憶檔案，而不是覆寫它們。

  </Accordion>
  <Accordion title="記憶體組態">
    記憶體組態預設為 OpenClaw 的檔案記憶體。外部記憶體提供者（例如 Honcho）會被記錄為歸檔或手動檢閱項目，以便您可以刻意地搬移它們。
  </Accordion>
  <Accordion title="技能">
    在 `skills/<name>/` 下具有 `SKILL.md` 檔案的技能會被複製，同時包含來自 `skills.config` 的個別技能組態值。
  </Accordion>
  <Accordion title="API 金鑰（選用）">
    設定 `--include-secrets` 以匯入支援的 `.env` 金鑰：`OPENAI_API_KEY`、`ANTHROPIC_API_KEY`、`OPENROUTER_API_KEY`、`GOOGLE_API_KEY`、`GEMINI_API_KEY`、`GROQ_API_KEY`、`XAI_API_KEY`、`MISTRAL_API_KEY`、`DEEPSEEK_API_KEY`。若未設定此旗標，絕不會複製機密資料。
  </Accordion>
</AccordionGroup>

## 什麼內容僅保留為歸檔

提供者會將這些項目複製到遷移報告目錄中以供手動檢閱，但會**不**將其載入到即時的 OpenClaw 組態或憑證中：

- `plugins/`
- `sessions/`
- `logs/`
- `cron/`
- `mcp-tokens/`
- `auth.json`
- `state.db`

OpenClaw 拒絕自動執行或信任此狀態，因為格式和信任假設可能會在系統之間產生偏移。在檢閱歸檔後，請手動搬移您需要的內容。

## 建議流程

<Steps>
  <Step title="預覽計畫">
    ```bash
    openclaw migrate hermes --dry-run
    ```

    此計畫會列出所有將變更的內容，包括衝突、跳過的項目以及任何敏感項目。計畫輸出會隱藏巢狀的類似金鑰的敏感性金鑰。

  </Step>
  <Step title="套用並備份">
    ```bash
    openclaw migrate apply hermes --yes
    ```

    OpenClaw 會在套用前建立並驗證備份。如果您需要匯入 API 金鑰，請新增 `--include-secrets`。

  </Step>
  <Step title="執行檢查">
    ```bash
    openclaw doctor
    ```

    [Doctor](/zh-Hant/gateway/doctor) 會重新套用任何擱置中的設定遷移，並檢查匯入期間引入的問題。

  </Step>
  <Step title="重新啟動並驗證">
    ```bash
    openclaw gateway restart
    openclaw status
    ```

    確認閘道狀態正常，且您匯入的模型、記憶和技能已載入。

  </Step>
</Steps>

## 衝突處理

當計畫回報衝突時（目標處已存在檔案或設定值），Apply 會拒絕繼續執行。

<Warning>僅當有意在替換現有目標時，才使用 `--overwrite` 重新執行。提供者仍可能在遷移報告目錄中為被覆寫的檔案寫入項目級備份。</Warning>

對於全新的 OpenClaw 安裝，衝突並不常見。它們通常出現在您在已有使用者編輯的設定上重新執行匯入時。

如果在套用過程中出現衝突（例如，設定檔發生意外的競爭條件），Hermes 會將剩餘的相依設定項目標記為 `skipped`，原因為 `blocked by earlier apply conflict`，而不是部分寫入它們。遷移報告會記錄每個被阻擋的項目，以便您解決原始衝突並重新執行匯入。

## 機密資訊

預設情況下，絕不會匯入機密資訊。

- 先執行 `openclaw migrate apply hermes --yes` 以匯入非機密狀態。
- 如果您也想複製支援的 `.env` 金鑰，請使用 `--include-secrets` 重新執行。
- 對於由 SecretRef 管理的憑證，請在匯入完成後設定 SecretRef 來源。

## 用於自動化的 JSON 輸出

```bash
openclaw migrate hermes --dry-run --json
openclaw migrate apply hermes --json --yes
```

使用 `--json` 且不使用 `--yes` 時，apply 會列印計畫且不會修改狀態。這對 CI 和共用腳本來說是最安全的模式。

## 疑難排解

<AccordionGroup>
  <Accordion title="套用因衝突而拒絕">檢查計畫輸出。每個衝突會標識來源路徑和現有目標。針對每個項目決定要跳過、編輯目標，還是使用 `--overwrite` 重新執行。</Accordion>
  <Accordion title="Hermes 位於 ~/.hermes 之外">傳遞 `--from /actual/path` (CLI) 或 `--import-source /actual/path` (onboarding)。</Accordion>
  <Accordion title="Onboarding 拒絕在現有設定上匯入">Onboarding 匯入需要全新的設定。請重設狀態並重新進行 onboarding，或直接使用 `openclaw migrate apply hermes`，它支援 `--overwrite` 和明確的備份控制。</Accordion>
  <Accordion title="API 金鑰未匯入">需要使用 `--include-secrets`，且僅會識別上述列出的金鑰。`.env` 中的其他變數會被忽略。</Accordion>
</AccordionGroup>

## 相關

- [`openclaw migrate`](/zh-Hant/cli/migrate)：完整的 CLI 參考資料、外掛合約以及 JSON 結構。
- [Onboarding](/zh-Hant/cli/onboard)：精靈流程和非互動式旗標。
- [Migrating](/zh-Hant/install/migrating)：在機器之間移動 OpenClaw 安裝。
- [Doctor](/zh-Hant/gateway/doctor)：遷移後的健康檢查。
- [Agent workspace](/zh-Hant/concepts/agent-workspace)：`SOUL.md`、`AGENTS.md` 和記憶體檔案所在的位置。
