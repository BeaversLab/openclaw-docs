---
summary: "安全地更新 OpenClaw（全域安裝或來源），以及回滾策略"
read_when:
  - Updating OpenClaw
  - Something breaks after an update
title: "更新"
---

保持 OpenClaw 為最新狀態。

## 建議：`openclaw update`

最快的更新方式。它會偵測您的安裝類型（npm 或 git），取得最新版本，執行 `openclaw doctor`，並重新啟動閘道。

```bash
openclaw update
```

若要切換頻道或指定特定版本：

```bash
openclaw update --channel beta
openclaw update --channel dev
openclaw update --tag main
openclaw update --dry-run   # preview without applying
```

`--channel beta` 偏好 beta，但當 beta 標籤缺失或比最新穩定版舊時，執行時會回退至 stable/latest。如果您想要針對單次套件更新使用原始 npm beta dist-tag，請使用 `--tag beta`。

請參閱 [開發頻道](/zh-Hant/install/development-channels) 以了解頻道語意。

## 在 npm 與 git 安裝之間切換

當您想要變更安裝類型時，請使用頻道。更新程式會將您的狀態、設定、憑證和工作區保留在 `~/.openclaw` 中；它僅會變更 CLI 與閘道所使用的 OpenClaw 程式碼安裝。

```bash
# npm package install -> editable git checkout
openclaw update --channel dev

# git checkout -> npm package install
openclaw update --channel stable
```

請先使用 `--dry-run` 執行，以預覽確切的安裝模式切換：

```bash
openclaw update --channel dev --dry-run
openclaw update --channel stable --dry-run
```

`dev` 頻道會確保進行 git checkout、建構它，並從該 checkout 安裝全域 CLI。`stable` 和 `beta` 頻道則使用套件安裝。如果閘道已經安裝，除非您傳遞 `--no-restart`，否則 `openclaw update` 會重新整理服務中繼資料並重新啟動它。

## 替代方案：重新執行安裝程式

```bash
curl -fsSL https://openclaw.ai/install.sh | bash
```

加入 `--no-onboard` 以跳過入引導。若要透過安裝程式強制執行特定安裝類型，請傳遞 `--install-method git --no-onboard` 或 `--install-method npm --no-onboard`。

如果 `openclaw update` 在 npm 套件安裝階段後失敗，請重新執行安裝程式。安裝程式不會呼叫舊的更新程式；它會直接執行全域套件安裝，並可恢復部分更新的 npm 安裝。

```bash
curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method npm
```

若要將恢復固定至特定版本或 dist-tag，請加入 `--version`：

```bash
curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method npm --version <version-or-dist-tag>
```

## 替代方案：手動 npm、pnpm 或 bun

```bash
npm i -g openclaw@latest
```

當 `openclaw update` 管理全域 npm 安裝時，它會先將目標安裝到臨時 npm 前綴目錄，驗證打包的 `dist` 清單，然後將乾淨的套件樹交換到實際的全域前綴目錄中。這避免了 npm 將新套件覆蓋在舊套件的過時檔案上。如果安裝指令失敗，OpenClaw 會使用 `--omit=optional` 重試一次。這項重試有助於無法編譯原生選用相依性的主機，同時在備用方案也失敗時保持原始失敗訊息的可見性。

```bash
pnpm add -g openclaw@latest
```

```bash
bun add -g openclaw@latest
```

### 進階 npm 安裝主題

<AccordionGroup>
  <Accordion title="唯讀套件樹">
    OpenClaw 在執行時將打包的全域安裝視為唯讀，即使全域套件目錄可被目前使用者寫入。打包的插件執行時期相依性會被暫存到可寫入的執行時期目錄，而不是變更套件樹。這可以防止 `openclaw update` 與正在修復同一安裝期間插件相依性的執行中閘道或本機代理程式產生競爭。

    某些 Linux npm 設定會將全域套件安裝在 root 擁有的目錄下，例如 `/usr/lib/node_modules/openclaw`。OpenClaw 透過相同的外部暫存路徑支援該佈局。

  </Accordion>
  <Accordion title="強化的 systemd 單元">
    設定包含在 `ReadWritePaths` 中的可寫入暫存目錄：

    ```ini
    Environment=OPENCLAW_PLUGIN_STAGE_DIR=/var/lib/openclaw/plugin-runtime-deps
    ReadWritePaths=/var/lib/openclaw /home/openclaw/.openclaw /tmp
    ```

    `OPENCLAW_PLUGIN_STAGE_DIR` 也接受路徑清單。OpenClaw 會從左到右跨列出的根目錄解析打包的插件執行時期相依性，將較早的根目錄視為唯讀的預安裝層，並僅安裝或修復到最後一個可寫入的根目錄：

    ```ini
    Environment=OPENCLAW_PLUGIN_STAGE_DIR=/opt/openclaw/plugin-runtime-deps:/var/lib/openclaw/plugin-runtime-deps
    ReadWritePaths=/var/lib/openclaw /home/openclaw/.openclaw /tmp
    ```

    如果未設定 `OPENCLAW_PLUGIN_STAGE_DIR`，OpenClaw 會在 systemd 提供時使用 `$STATE_DIRECTORY`，然後回退到 `~/.openclaw/plugin-runtime-deps`。修復步驟會將該暫存目錄視為 OpenClaw 擁有的本機套件根目錄，並忽略使用者 npm 前綴和全域設定，因此全域安裝的 npm 設定不會將打包的插件相依性重新導向到 `~/node_modules` 或全域套件樹。

  </Accordion>
  <Accordion title="磁碟空間預檢">
    在套件更新和綑綁的執行時期相依性修復之前，OpenClaw 會盡力檢查目標磁碟區的磁碟空間。空間不足會產生包含已檢查路徑的警告，但並不會阻擋更新，因為檔案系統配額、快照和網路磁碟區在檢查後可能會變動。實際的 npm 安裝、複製和安裝後驗證仍然具有決定性。
  </Accordion>
  <Accordion title="綑綁的外掛程式執行時期相依性">
    封裝安裝會將綑綁的外掛程式執行時期相依性保持在唯讀套件樹之外。在啟動期間以及執行 `openclaw doctor --fix` 時，OpenClaw 僅會針對在設定中啟用、透過舊版通道設定啟用，或由其綑綁清單預設啟用的綑綁外掛程式修復執行時期相依性。僅持續儲存的通道驗證狀態並不會觸發 Gateway 啟動時的執行時期相依性修復。

    明確的停用具有優先權。已停用的外掛程式或通道不會因為存在於套件中就獲得執行時期相依性修復。外部外掛程式和自訂載入路徑仍然使用 `openclaw plugins install` 或 `openclaw plugins update`。

  </Accordion>
</AccordionGroup>

## 自動更新程式

自動更新程式預設為關閉。請在 `~/.openclaw/openclaw.json` 中啟用它：

```json5
{
  update: {
    channel: "stable",
    auto: {
      enabled: true,
      stableDelayHours: 6,
      stableJitterHours: 12,
      betaCheckIntervalHours: 1,
    },
  },
}
```

| 通道     | 行為                                                                                    |
| -------- | --------------------------------------------------------------------------------------- |
| `stable` | 等待 `stableDelayHours`，然後在 `stableJitterHours` 範圍內套用決定性抖動 (分階段推出)。 |
| `beta`   | 每隔 `betaCheckIntervalHours` 檢查一次 (預設為每小时)，並立即套用。                     |
| `dev`    | 不自動套用。請手動使用 `openclaw update`。                                              |

Gateway 也會在啟動時記錄更新提示 (可使用 `update.checkOnStart: false` 停用)。
若要進行降級或事故復原，請在 Gateway 環境中設定 `OPENCLAW_NO_AUTO_UPDATE=1` 以阻擋自動套用，即使已設定 `update.auto.enabled` 也一樣。除非同時停用 `update.checkOnStart`，否則啟動更新提示仍可執行。

## 更新後

<Steps>

### 執行 doctor

```bash
openclaw doctor
```

遷移配置、審核 DM 政策並檢查 Gateway 健康狀態。詳情：[Doctor](/zh-Hant/gateway/doctor)

### 重新啟動 Gateway

```bash
openclaw gateway restart
```

### 驗證

```bash
openclaw health
```

</Steps>

## 還原

### 鎖定版本 (npm)

```bash
npm i -g openclaw@<version>
openclaw doctor
openclaw gateway restart
```

<Tip>`npm view openclaw version` 顯示當前已發布的版本。</Tip>

### 鎖定提交 (source)

```bash
git fetch origin
git checkout "$(git rev-list -n 1 --before=\"2026-01-01\" origin/main)"
pnpm install && pnpm build
openclaw gateway restart
```

若要返回最新版本：`git checkout main && git pull`。

## 如果您遇到困難

- 再次執行 `openclaw doctor` 並仔細閱讀輸出內容。
- 對於原始碼檢出上的 `openclaw update --channel dev`，更新程式會在需要時自動啟動 `pnpm`。如果您看到 pnpm/corepack 啟動錯誤，請手動安裝 `pnpm`（或重新啟用 `corepack`）並重新執行更新。
- 檢查：[疑難排解](/zh-Hant/gateway/troubleshooting)
- 在 Discord 中發問：[https://discord.gg/clawd](https://discord.gg/clawd)

## 相關

- [安裝概覽](/zh-Hant/install)：所有安裝方法。
- [Doctor](/zh-Hant/gateway/doctor)：更新後的健康檢查。
- [遷移](/zh-Hant/install/migrating)：主要版本遷移指南。
