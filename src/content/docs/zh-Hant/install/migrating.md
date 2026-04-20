---
summary: "將 OpenClaw 安裝從一台機器移動（遷移）到另一台機器"
read_when:
  - You are moving OpenClaw to a new laptop/server
  - You want to preserve sessions, auth, and channel logins (WhatsApp, etc.)
title: "遷移指南"
---

# 將 OpenClaw 遷移到新機器

本指南將 OpenClaw 閘道移至新機器，無需重新進入入門流程。

## 會遷移什麼

當您複製 **狀態目錄**（預設為 `~/.openclaw/`）和您的 **工作區** 時，您會保留：

- **設定** -- `openclaw.json` 和所有閘道設定
- **Auth** -- 每個代理 `auth-profiles.json` (API 金鑰 + OAuth)，以及 `credentials/` 下的任何通道/提供者狀態
- **工作階段** -- 對話歷史和代理程式狀態
- **通道狀態** -- WhatsApp 登入、Telegram 工作階段等。
- **工作區檔案** -- `MEMORY.md`、`USER.md`、技能和提示

<Tip>
在舊機器上執行 `openclaw status` 以確認您的狀態目錄路徑。
自訂設定檔使用 `~/.openclaw-<profile>/` 或透過 `OPENCLAW_STATE_DIR` 設定的路徑。
</Tip>

## 遷移步驟

<Steps>
  <Step title="Stop the gateway and back up">
    在**舊**機器上，停止閘道，以免檔案在複製中途發生變更，然後進行封存：

    ```bash
    openclaw gateway stop
    cd ~
    tar -czf openclaw-state.tgz .openclaw
    ```

    如果您使用多個設定檔（例如 `~/.openclaw-work`），請分別封存每一個。

  </Step>

<Step title="Install OpenClaw on the new machine">在新機器上[安裝](/zh-Hant/install) CLI（以及 Node，如果需要）。 如果上架流程建立了新的 `~/.openclaw/` 也沒關係——您接下來會將其覆蓋。</Step>

  <Step title="Copy state directory and workspace">
    透過 `scp`、`rsync -a` 或外接硬碟傳輸封存檔，然後解壓縮：

    ```bash
    cd ~
    tar -xzf openclaw-state.tgz
    ```

    請確保隱藏目錄已包含在內，且檔案擁有權符合將執行閘道的使用者。

  </Step>

  <Step title="Run doctor and verify">
    在新機器上，執行 [Doctor](/zh-Hant/gateway/doctor) 以套用設定遷移並修復服務：

    ```bash
    openclaw doctor
    openclaw gateway restart
    openclaw status
    ```

  </Step>
</Steps>

## 常見陷阱

<AccordionGroup>
  <Accordion title="Profile or state-dir mismatch">
    如果舊閘道使用了 `--profile` 或 `OPENCLAW_STATE_DIR` 而新閘道沒有，
    通道將顯示為已登出且會話將為空。
    請使用您遷移的**相同**設定檔或 state-dir 啟動閘道，然後重新執行 `openclaw doctor`。
  </Accordion>

  <Accordion title="僅複製 openclaw.">
    僅複製設定檔是不夠的。模型驗證設定檔位於
    `agents/<agentId>/agent/auth-profiles.json`，而頻道/提供者的狀態仍然
    位於 `credentials/`。請務必遷移**整個**狀態目錄。
  </Accordion>

<Accordion title="權限與所有權">如果您以 root 身份複製或切換了使用者，閘道可能無法讀取憑證。 請確保狀態目錄和工作區是由執行閘道的使用者所擁有。</Accordion>

<Accordion title="遠端模式">如果您的 UI 指向**遠端**閘道，遠端主機會擁有工作階段和工作區。 請遷移閘道主機本身，而不是您的本地筆記型電腦。請參閱 [常見問題](/zh-Hant/help/faq#where-things-live-on-disk)。</Accordion>

  <Accordion title="備份中的機密資料">
    狀態目錄包含驗證設定檔、頻道憑證，以及其他
    提供者狀態。
    請將備份加密儲存，避免使用不安全的傳輸通道，如果懷疑資料外洩請輪換金鑰。
  </Accordion>
</AccordionGroup>

## 驗證檢查清單

在新機器上，確認：

- [ ] `openclaw status` 顯示閘道正在執行
- [ ] 頻道仍然保持連線（無需重新配對）
- [ ] 儀表板開啟並顯示現有的工作階段
- [ ] 工作區檔案（記憶體、設定）都存在
