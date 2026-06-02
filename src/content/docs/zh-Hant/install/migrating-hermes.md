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
    使用 `openclaw migrate` 進行腳本化或可重複的執行。完整參考請參閱 [`openclaw migrate`](/zh-Hant/cli/migrate)。

    ```bash
    openclaw migrate hermes --dry-run    # preview only
    openclaw migrate apply hermes --yes  # apply with confirmation skipped
    ```

    當 Hermes 位於 `~/.hermes` 之外時，請新增 `--from <path>`。

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
  <Accordion title="Auth credentials">
    互動式 `openclaw migrate` 會在匯入身份驗證憑證前進行詢問，且預設選擇「是」。接受的匯入項目包括來自 OpenCode `auth.json` 的 OpenCode OpenAI OAuth 憑證、來自 OpenCode `auth.json` 的 OpenCode 和 GitHub Copilot 項目，以及[支援的 `.env` 金鑰](/zh-Hant/cli/migrate#supported-env-keys)。Hermes `auth.json` OAuth 項目屬於舊版狀態，不會匯入至實時身份驗證，而是會顯示為需要手動重新驗證/修復工具的項目。請使用 `--include-secrets` 進行非互動式 `openclaw migrate` 憑證匯入，使用 `--no-auth-credentials` 跳過它，或在從入門精靈匯入時使用入門 `--import-secrets`。
  </Accordion>
</AccordionGroup>

## 什麼內容僅保留為歸檔

提供者會將這些項目複製到遷移報告目錄中以供手動檢閱，但會**不**將其載入到即時的 OpenClaw 組態或憑證中：

- `plugins/`
- `sessions/`
- `logs/`
- `cron/`
- `mcp-tokens/`
- `state.db`

OpenClaw 拒絕自動執行或信任此狀態，因為格式和信任假設可能會在系統之間產生偏移。在審查存檔後，請手動移動您需要的內容。

## 建議流程

<Steps>
  <Step title="Preview the plan">
    ```bash
    openclaw migrate hermes --dry-run
    ```

    此計畫列出了所有將會變更的內容，包括衝突、跳過的項目以及任何敏感項目。計畫輸出會編輯掉嵌套的看起來像機密的金鑰。

  </Step>
  <Step title="Apply with backup">
    ```bash
    openclaw migrate apply hermes --yes
    ```

    OpenClaw 在套用之前會建立並驗證備份。這個非互動式範例會匯入非機密狀態。請在不加 `--yes` 的情況下執行，以回答憑證提示，或是新增 `--include-secrets` 以在無人值守執行中包含支援的憑證。

  </Step>
  <Step title="Run doctor">
    ```bash
    openclaw doctor
    ```

    [Doctor](/zh-Hant/gateway/doctor) 會重新套用任何待處理的設定遷移，並檢查匯入期間引入的問題。

  </Step>
  <Step title="Restart and verify">
    ```bash
    openclaw gateway restart
    openclaw status
    ```

    確認閘道健康狀態，以及您的匯入模型、記憶和技能已載入。

  </Step>
</Steps>

## 衝突處理

當計畫回報衝突（目標位置已存在檔案或設定值）時，Apply 會拒絕繼續執行。

<Warning>只有在故意取代現有目標時，才應使用 `--overwrite` 重新執行。提供者仍可能會在遷移報告目錄中，為被覆寫的檔案寫入項目層級的備份。</Warning>

對於全新的 OpenClaw 安裝，衝突並不常見。它們通常出現在您重新於已包含使用者編輯的設定上執行匯入時。

如果在套用過程中發生衝突（例如，設定檔發生非預期的競爭），Hermes 會將其餘相依的設定項目標記為 `skipped`，原因為 `blocked by earlier apply conflict`，而不是部分寫入它們。遷移報告會記錄每個被阻擋的項目，以便您解決原始衝突並重新執行匯入。

## 機密

互動式 `openclaw migrate` 會詢問是否匯入偵測到的驗證憑證，預設選擇「是」。

- 接受提示會匯入來自 OpenCode `auth.json` 的 OpenCode OpenAI OAuth 憑證、來自 OpenCode `auth.json` 的 OpenCode 和 GitHub Copilot 項目，以及[支援的 `.env` 金鑰](/zh-Hant/cli/migrate#supported-env-keys)。Hermes `auth.json` OAuth 項目將被報告以進行手動 OpenAI 重新驗證或修復工具修復。
- 使用 `--no-auth-credentials` 或在提示時選擇 no 以僅匯入非機密狀態。
- 使用 `--include-secrets` 以搭配 `--yes` 無人值守執行。
- 從入門嚮導匯入憑證時，請使用入門 `--import-secrets`。
- 對於 SecretRef 管理的憑證，請在匯入完成後設定 SecretRef 來源。

## 用於自動化的 JSON 輸出

```bash
openclaw migrate hermes --dry-run --json
openclaw migrate apply hermes --json --yes
```

搭配 `--json` 且不使用 `--yes` 時，apply 會列印計畫且不修改狀態。這是 CI 和共用腳本最安全的模式。

## 疑難排解

<AccordionGroup>
  <Accordion title="Apply 因衝突而拒絕執行">檢查計畫輸出。每個衝突都會指明來源路徑和現有目標。請逐項決定是跳過、編輯目標，還是使用 `--overwrite` 重新執行。</Accordion>
  <Accordion title="Hermes 位於 ~/.hermes 之外">傳遞 `--from /actual/path` (CLI) 或 `--import-source /actual/path` (入門)。</Accordion>
  <Accordion title="入門程式拒絕在現有設定上匯入">入門匯入需要全新的設定。請重設狀態並重新入門，或直接使用 `openclaw migrate apply hermes`，它支援 `--overwrite` 和明確的備份控制。</Accordion>
  <Accordion title="API 金鑰未匯入">互動式 `openclaw migrate` 僅在您接受憑證提示時才匯入 API 金鑰。非互動式 `--yes` 執行需要 `--include-secrets`；入門匯入需要 `--import-secrets`。僅會識別[支援的 `.env` 金鑰](/zh-Hant/cli/migrate#supported-env-keys)；`.env` 中的其他變數將被忽略。</Accordion>
</AccordionGroup>

## 相關

- [`openclaw migrate`](/zh-Hant/cli/migrate)：完整的 CLI 參考、外掛程式合約和 JSON 結構。
- [入門](/zh-Hant/cli/onboard)：嚮導流程和非互動式旗標。
- [Migrating](/zh-Hant/install/migrating)：在不同機器之間移動 OpenClaw 安裝。
- [Doctor](/zh-Hant/gateway/doctor)：遷移後的健康檢查。
- [Agent workspace](/zh-Hant/concepts/agent-workspace)：`SOUL.md`、`AGENTS.md` 和記憶檔案所在的位置。
