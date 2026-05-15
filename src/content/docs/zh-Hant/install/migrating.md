---
summary: "遷移中心：跨系統匯入、機器間遷移和外掛升級"
read_when:
  - You are moving OpenClaw to a new laptop or server
  - You are coming from another agent system and want to keep state
  - You are upgrading an in-place plugin
title: "遷移指南"
---

OpenClaw 支援三種遷移路徑：從另一個代理系統匯入、將現有安裝移動到新機器，以及就地升級外掛程式。

## 從另一個代理系統匯入

使用隨附的遷移提供者將指令、MCP 伺服器、技能、模型配置和（可選）API 金鑰帶入 OpenClaw。計畫會在任何變更前預覽，報告中的機密資訊會被遮蔽，且套用操作有經過驗證的備份支援。

<CardGroup cols={2}>
  <Card title="從 Claude 遷移" href="/zh-Hant/install/migrating-claude" icon="brain">
    匯入 Claude Code 和 Claude Desktop 的狀態，包括 `CLAUDE.md`、MCP 伺服器、技能和專案指令。
  </Card>
  <Card title="從 Hermes 遷移" href="/zh-Hant/install/migrating-hermes" icon="feather">
    匯入 Hermes 設定、提供者、MCP 伺服器、記憶體、技能以及支援的 `.env` 金鑰。
  </Card>
</CardGroup>

CLI 的進入點是 [`openclaw migrate`](/zh-Hant/cli/migrate)。當引導程式偵測到已知的來源時 (`openclaw onboard --flow import`)，也可以提供遷移選項。

## 將 OpenClaw 移動到新機器

複製 **狀態目錄** (預設為 `~/.openclaw/`) 和您的 **工作區** 以保留：

- **設定** — `openclaw.json` 和所有閘道設定。
- **驗證** — 每個代理程式的 `auth-profiles.json` (API 金鑰以及 OAuth)，以及 `credentials/` 下的任何通道或提供者狀態。
- **工作階段** — 對話歷史和代理狀態。
- **通道狀態** — WhatsApp 登入、Telegram 工作階段等類似資訊。
- **工作區檔案** — `MEMORY.md`、`USER.md`、技能和提示。

<Tip>
在舊機器上執行 `openclaw status` 以確認您的狀態目錄路徑。自訂設定檔使用 `~/.openclaw-<profile>/` 或透過 `OPENCLAW_STATE_DIR` 設定的路徑。
</Tip>

### 遷移步驟

<Steps>
  <Step title="停止閘道並備份">
    在**舊**機器上，停止閘道以免檔案在複製過程中變更，然後進行封存：

    ```bash
    openclaw gateway stop
    cd ~
    tar -czf openclaw-state.tgz .openclaw
    ```

    如果您使用多個設定檔 (例如 `~/.openclaw-work`)，請分別封存每一個。

  </Step>

<Step title="在新機器上安裝 OpenClaw">在新機器上[安裝](/zh-Hant/install) CLI（如果需要也包括 Node）。如果入門流程建立了一個新的 `~/.openclaw/` 亦無妨。您將在下一步覆寫它。</Step>

  <Step title="複製狀態目錄和工作區">
    透過 `scp`、`rsync -a` 或外部硬碟傳輸壓縮檔，然後解壓縮：

    ```bash
    cd ~
    tar -xzf openclaw-state.tgz
    ```

    確保包含隱藏目錄，且檔案擁有權與將執行 gateway 的使用者相符。

  </Step>

  <Step title="執行檢查工具並驗證">
    在新機器上，執行 [Doctor](/zh-Hant/gateway/doctor) 以套用設定遷移並修復服務：

    ```bash
    openclaw doctor
    openclaw gateway restart
    openclaw status
    ```

  </Step>
</Steps>

如果 Telegram 或 Discord 使用預設的環境變數後備機制（`TELEGRAM_BOT_TOKEN` 或 `DISCORD_BOT_TOKEN`），請驗證遷移後的 state-dir `.env` 包含這些金鑰，但不要列印出機密值：

```bash
awk -F= '/^(TELEGRAM_BOT_TOKEN|DISCORD_BOT_TOKEN)=/ { print $1 "=present" }' ~/.openclaw/.env
```

`openclaw doctor` 也會在啟用的預設 Telegram 或 Discord 帳號未設定權杖，且對應的環境變數無法供 doctor 程序使用時發出警示。

### 常見陷阱

<AccordionGroup>
  <Accordion title="設定檔或狀態目錄不相符">
    如果舊的 gateway 使用了 `--profile` 或 `OPENCLAW_STATE_DIR`，而新的沒有使用，頻道將顯示為已登出，且工作階段將是空的。請使用您遷移的**相同**設定檔或狀態目錄啟動 gateway，然後重新執行 `openclaw doctor`。
  </Accordion>

  <Accordion title="僅複製 openclaw.">
    單獨的設定檔是不夠的。模型驗證設定檔位於 `agents/<agentId>/agent/auth-profiles.json` 下，而頻道和提供者狀態位於 `credentials/` 下。請務必遷移**整個**狀態目錄。
  </Accordion>

<Accordion title="權限與所有權">如果您以 root 身份複製或切換了使用者，閘道可能無法讀取憑證。請確保狀態目錄和工作區是由執行閘道的使用者所擁有。</Accordion>

<Accordion title="遠端模式">如果您的 UI 指向 **遠端** 閘道，則遠端主機擁有會話和工作區。請遷移閘道主機本身，而不是您的本地筆記型電腦。請參閱 [FAQ](/zh-Hant/help/faq#where-things-live-on-disk)。</Accordion>

  <Accordion title="備份中的機密">
    狀態目錄包含驗證設定檔、通道憑證和其他提供者狀態。請將備份加密儲存，避免使用不安全的傳輸通道，如果您懷疑資料外洩，請輪替金鑰。
  </Accordion>
</AccordionGroup>

### 驗證檢查清單

在新機器上，確認：

- [ ] `openclaw status` 顯示閘道正在執行。
- [ ] 通道仍保持連線（無需重新配對）。
- [ ] 儀表板可以開啟並顯示現有的會話。
- [ ] 工作區檔案（記憶體、設定）都存在。

## 原地升級外掛程式

原地升級外掛程式會保留相同的外掛程式 ID 和設定金鑰，但可能會將磁碟上的狀態移至目前的佈局。特定於外掛程式的升級指南位於其通道旁：

- [Matrix 遷移](/zh-Hant/channels/matrix-migration)：加密狀態恢復限制、自動快照行為和手動恢復指令。

## 相關

- [`openclaw migrate`](/zh-Hant/cli/migrate)：跨系統匯入的 CLI 參考。
- [安裝概覽](/zh-Hant/install)：所有安裝方法。
- [Doctor](/zh-Hant/gateway/doctor)：遷移後的健康檢查。
- [解除安裝](/zh-Hant/install/uninstall)：徹底移除 OpenClaw。
