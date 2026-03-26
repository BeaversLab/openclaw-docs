---
summary: "將 OpenClaw 安裝從一台機器移動（遷移）到另一台機器"
read_when:
  - You are moving OpenClaw to a new laptop/server
  - You want to preserve sessions, auth, and channel logins (WhatsApp, etc.)
title: "遷移指南"
---

# 將 OpenClaw 遷移到新機器

本指南將 OpenClaw 網關移至新機器，無需重新進行入職設定。

## 會遷移什麼

當您複製 **狀態目錄**（預設為 `~/.openclaw/`）和您的 **工作區** 時，您將保留：

- **配置** -- `openclaw.json` 以及所有網關設定
- **驗證** -- API 金鑰、OAuth 權杖、憑證設定檔
- **會話** -- 對話歷史和代理狀態
- **通道狀態** -- WhatsApp 登入、Telegram 會話等
- **工作區檔案** -- `MEMORY.md`、`USER.md`、技能和提示詞

<Tip>
在舊機器上執行 `openclaw status` 以確認您的狀態目錄路徑。
自訂設定檔使用 `~/.openclaw-<profile>/` 或透過 `OPENCLAW_STATE_DIR` 設定的路徑。
</Tip>

## 移轉步驟

<Steps>
  <Step title="停止閘道並備份">
    在**舊**機器上，停止閘道以免檔案在複製過程中變更，然後進行封存：

    ```bash
    openclaw gateway stop
    cd ~
    tar -czf openclaw-state.tgz .openclaw
    ```

    如果您使用多個設定檔（例如 `~/.openclaw-work`），請分別封存每一個。

  </Step>

<Step title="在新機器上安裝 OpenClaw">
  在新機器上[安裝](/zh-Hant/install) CLI（以及 Node，如果需要）。即使入門程式 建立了全新的
  `~/.openclaw/` 也沒關係——您接下來會覆寫它。
</Step>

  <Step title="複製狀態目錄和工作區">
    透過 `scp`、`rsync -a` 或外接硬碟傳輸壓縮檔，然後解壓縮：

    ```bash
    cd ~
    tar -xzf openclaw-state.tgz
    ```

    確保包含隱藏目錄，且檔案所有權符合將執行閘道器的使用者。

  </Step>

  <Step title="執行診斷並驗證">
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
  <Accordion title="設定檔或 state-dir 不符">
    如果舊的閘道使用了 `--profile` 或 `OPENCLAW_STATE_DIR` 而新的沒有，
    頻道將顯示為已登出且階段作業（sessions）將會是空的。
    請使用您遷移時使用的**相同**設定檔或 state-dir 啟動閘道，然後重新執行 `openclaw doctor`。
  </Accordion>

<Accordion title="僅複製 openclaw.">
  單獨的設定檔是不夠的。憑證儲存在 `credentials/` 下，而代理程式狀態儲存在 `agents/`
  下。請務必遷移**整個**狀態目錄。
</Accordion>

<Accordion title="Permissions and ownership">
  如果您以 root 身份複製或切換了用戶，閘道可能無法讀取憑證。請確保
  狀態目錄和工作區是由運行閘道的用戶所擁有的。
</Accordion>

<Accordion title="Remote mode">
  如果您的 UI 指向一個 **遠端** 閘道，則遠端主機擁有會話和工作區。請遷移
  閘道主機本身，而不是您的本地筆記型電腦。請參閱
  [FAQ](/zh-Hant/help/faq#where-does-openclaw-store-its-data)。
</Accordion>

  <Accordion title="Secrets in backups">
    狀態目錄包含 API 金鑰、OAuth 權杖和頻道憑證。
    請將備份加密存儲，避免使用不安全的傳輸通道，並在懷疑洩露時輪換金鑰。
  </Accordion>
</AccordionGroup>

## 驗證檢查清單

在新機器上，確認：

- [ ] `openclaw status` 顯示閘道正在執行
- [ ] 頻道仍保持連線（無需重新配對）
- [ ] 儀表板開啟並顯示現有的工作階段
- [ ] 工作區檔案（記憶體、設定）皆存在

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
