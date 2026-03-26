---
summary: "OpenClaw 如何就地升級舊版 Matrix 外掛，包括加密狀態恢復的限制和手動恢復步驟。"
read_when:
  - Upgrading an existing Matrix installation
  - Migrating encrypted Matrix history and device state
title: "Matrix 遷移"
---

# Matrix 遷移

本頁面涵蓋從先前的公開 `matrix` 外掛升級至目前實作的內容。

對於大多數使用者而言，升級是就地進行的：

- 外掛保持 `@openclaw/matrix`
- 頻道保持 `matrix`
- 您的設定保持在 `channels.matrix` 之下
- 快取的憑證保持在 `~/.openclaw/credentials/matrix/` 之下
- 執行時狀態保持在 `~/.openclaw/matrix/` 之下

您不需要重新命名設定金鑰，或是以新名稱重新安裝外掛。

## 遷移會自動執行的項目

當閘道啟動時，以及當您執行 [`openclaw doctor --fix`](/zh-Hant/gateway/doctor) 時，OpenClaw 會嘗試自動修復舊的 Matrix 狀態。
在任何可執行的 Matrix 遷移步驟變更磁碟狀態之前，OpenClaw 會建立或重用專用的恢復快照。

當您使用 `openclaw update` 時，確切的觸發條件取決於 OpenClaw 的安裝方式：

- 原始碼安裝會在更新流程中執行 `openclaw doctor --fix`，然後預設重新啟動閘道
- 套件管理器安裝會更新套件，執行非互動式的檢查流程，然後依賴預設的閘道重新啟動，以便啟動時能完成 Matrix 遷移
- 如果您使用 `openclaw update --no-restart`，啟動時支援的 Matrix 遷移會延後到您稍後執行 `openclaw doctor --fix` 並重新啟動閘道

自動遷移涵蓋：

- 在 `~/Backups/openclaw-migrations/` 下建立或重用遷移前快照
- 重用您快取的 Matrix 憑證
- 保持相同的帳號選取和 `channels.matrix` 設定
- 將最舊的平面 Matrix 同步存放區移至目前的帳號範圍位置
- 當目標帳號可安全解析時，將最舊的平面 Matrix 加密存放區移至目前的帳號範圍位置
- 當該金鑰存在於本機時，從舊的 rust 加密存放區中擷取先前儲存的 Matrix 房間金鑰備份解密金鑰
- 當存取權杖後續變更時，為相同的 Matrix 帳戶、主伺服器和使用者重用最完整的現有權杖雜湊儲存根目錄
- 當 Matrix 存取權杖變更但帳戶/裝置身分保持不變時，掃描同層權杖雜湊儲存根目錄以尋找待處理的加密狀態還原元資料
- 在下次 Matrix 啟動時，將備份的房間金鑰還原到新的加密儲存中

快照詳情：

- OpenClaw 在成功快照後會在 `~/.openclaw/matrix/migration-snapshot.json` 寫入一個標記檔案，以便後續的啟動和修復程序可以重複使用相同的存檔。
- 這些自動 Matrix 遷移快照僅備份組態 + 狀態 (`includeWorkspace: false`)。
- 如果 Matrix 只有僅警告的遷移狀態，例如因為 `userId` 或 `accessToken` 仍然缺失，OpenClaw 尚不會建立快照，因為沒有 Matrix 變更是可執行的。
- 如果快照步驟失敗，OpenClaw 將跳過該次執行的 Matrix 遷移，而不是在沒有復原點的情況下變更狀態。

關於多帳號升級：

- 最舊的扁平 Matrix 存儲 (`~/.openclaw/matrix/bot-storage.json` 和 `~/.openclaw/matrix/crypto/`) 來自單一存儲佈局，因此 OpenClaw 只能將其遷移到一個已解析的 Matrix 帳號目標
- 已具有帳號範圍的舊版 Matrix 存儲會依照設定的 Matrix 帳號進行偵測和準備

## 遷移無法自動完成的事項

先前的公開 Matrix 外掛**並不會**自動建立 Matrix 金鑰備份。它會保存本機加密狀態並要求裝置驗證，但並不保證您的房間金鑰已備份至主伺服器。

這意味著部分加密安裝只能部分遷移。

OpenClaw 無法自動恢復：

- 從未備份過的僅限本機的房間金鑰
- 當目標 Matrix 帳戶尚無法解析時的加密狀態，因為 `homeserver`、`userId` 或 `accessToken` 仍無法使用
- 當設定了多個 Matrix 帳戶但未設定 `channels.matrix.defaultAccount` 時，自動遷移單一共享的扁平 Matrix 存儲
- 固定至儲存庫路徑而非標準 Matrix 套件的自訂外掛路徑安裝
- 舊的儲存庫有備份金鑰但未在本機保留解密金鑰時，卻缺少復原金鑰

目前的警告範圍：

- 自訂 Matrix 外掛路徑安裝會在閘道啟動和 `openclaw doctor` 中顯示

如果您舊的安裝中有從未備份過的僅限本機加密歷史，部分較舊的加密訊息在升級後可能仍然無法讀取。

## 建議的升級流程

1. 正常更新 OpenClaw 和 Matrix 外掛。
   優先使用沒有 `--no-restart` 的純 `openclaw update`，以便啟動時能立即完成 Matrix 移轉。
2. 執行：

   ```bash
   openclaw doctor --fix
   ```

   如果 Matrix 有可執行的移轉工作，doctor 會先建立或重複使用移轉前快照，並列印封存路徑。

3. 啟動或重新啟動閘道。
4. 檢查目前的驗證和備份狀態：

   ```bash
   openclaw matrix verify status
   openclaw matrix verify backup status
   ```

5. 如果 OpenClaw 提示您需要復原金鑰，請執行：

   ```bash
   openclaw matrix verify backup restore --recovery-key "<your-recovery-key>"
   ```

6. 如果此裝置仍未驗證，請執行：

   ```bash
   openclaw matrix verify device "<your-recovery-key>"
   ```

7. 如果您有意放棄無法復原的舊歷史記錄，並希望為未來的訊息建立全新的備份基準，請執行：

   ```bash
   openclaw matrix verify backup reset --yes
   ```

8. 如果尚未存在伺服器端金鑰備份，請為未來的復原建立一個：

   ```bash
   openclaw matrix verify bootstrap
   ```

## 加密遷移如何運作

加密遷移是一個兩階段的過程：

1. 如果加密遷移可行，啟動或 `openclaw doctor --fix` 會建立或重用遷移前快照。
2. 啟動或 `openclaw doctor --fix` 會透過現有的 Matrix 外掛安裝程式檢查舊的 Matrix 加密儲存庫。
3. 如果找到備份解密金鑰，OpenClaw 會將其寫入新的復原金鑰流程，並將房間金鑰復原標記為待處理。
4. 在下一次 Matrix 啟動時，OpenClaw 會自動將備份的房間金鑰復原到新的加密儲存庫中。

如果舊儲存庫回報有從未備份過的房間金鑰，OpenClaw 會發出警告，而不是假裝復原成功。

## 常見訊息及其含義

### 升級與偵測訊息

`Matrix plugin upgraded in place.`

- 含義：偵測到舊的磁碟上 Matrix 狀態並將其遷移至目前的版面配置。
- 處理方式：除非相同的輸出內容也包含警告，否則無須採取任何行動。

`Matrix migration snapshot created before applying Matrix upgrades.`

- 含義：OpenClaw 在變更 Matrix 狀態之前建立了還原封存檔。
- 處理方式：請保留列印出的封存路徑，直到您確認遷移成功為止。

`Matrix migration snapshot reused before applying Matrix upgrades.`

- 含義：OpenClaw 發現了現有的 Matrix 遷移快照標記，並重用了該封存檔，而非建立重複的備份。
- 處理方式：請保留列印出的封存路徑，直到您確認遷移成功為止。

`Legacy Matrix state detected at ... but channels.matrix is not configured yet.`

- 含義：舊的 Matrix 狀態存在，但 OpenClaw 無法將其對應到目前的 Matrix 帳戶，因為尚未設定 Matrix。
- 處理方式：設定 `channels.matrix`，然後重新執行 `openclaw doctor --fix` 或重新啟動閘道。

`Legacy Matrix state detected at ... but the new account-scoped target could not be resolved yet (need homeserver, userId, and access token for channels.matrix...).`

- 含義：OpenClaw 發現了舊狀態，但仍無法確定確切的目前帳號/裝置根目錄。
- 處理方式：使用有效的 Matrix 登入啟動閘道一次，或者在存在快取憑證後重新執行 `openclaw doctor --fix`。

`Legacy Matrix state detected at ... but multiple Matrix accounts are configured and channels.matrix.defaultAccount is not set.`

- 含義：OpenClaw 發現了一個共用的扁平 Matrix 存儲區，但它拒絕猜測哪個命名的 Matrix 帳號應該接收它。
- 處理方式：將 `channels.matrix.defaultAccount` 設定為目標帳號，然後重新執行 `openclaw doctor --fix` 或重新啟動閘道。

`Matrix legacy sync store not migrated because the target already exists (...)`

- 含義：新的帳號範圍位置已經具有同步或加密存儲區，因此 OpenClaw 並未自動覆寫它。
- 處理方式：在手動移除或移動衝突的目標之前，請確認目前的帳號是正確的。

`Failed migrating Matrix legacy sync store (...)` 或 `Failed migrating Matrix legacy crypto store (...)`

- 含義：OpenClaw 嘗試移動舊的 Matrix 狀態，但檔案系統操作失敗。
- 處理方式：檢查檔案系統權限和磁碟狀態，然後重新執行 `openclaw doctor --fix`。

`Legacy Matrix encrypted state detected at ... but channels.matrix is not configured yet.`

- 含義：OpenClaw 發現了舊的加密 Matrix 儲存，但沒有目前的 Matrix 設定可以將其附加。
- 處理方式：設定 `channels.matrix`，然後重新執行 `openclaw doctor --fix` 或重新啟動閘道。

`Legacy Matrix encrypted state detected at ... but the account-scoped target could not be resolved yet (need homeserver, userId, and access token for channels.matrix...).`

- 含義：加密儲存存在，但 OpenClaw 無法安全地判定其屬於哪個目前的帳號/裝置。
- 解決方法：使用有效的 Matrix 登入啟動閘道一次，或在可使用快取的憑證後重新執行 `openclaw doctor --fix`。

`Legacy Matrix encrypted state detected at ... but multiple Matrix accounts are configured and channels.matrix.defaultAccount is not set.`

- 含義：OpenClaw 發現了一個共用的舊版平面加密儲存，但它拒絕猜測應該將其接收至哪個命名的 Matrix 帳戶。
- 解決方法：將 `channels.matrix.defaultAccount` 設定為目標帳戶，然後重新執行 `openclaw doctor --fix` 或重新啟動閘道。

`Matrix migration warnings are present, but no on-disk Matrix mutation is actionable yet. No pre-migration snapshot was needed.`

- 含義：OpenClaw 偵測到舊的 Matrix 狀態，但遷移仍因缺少身分或憑證資料而受阻。
- 解決方法：完成 Matrix 登入或設定設定，然後重新執行 `openclaw doctor --fix` 或重新啟動閘道。

`Legacy Matrix encrypted state was detected, but the Matrix plugin helper is unavailable. Install or repair @openclaw/matrix so OpenClaw can inspect the old rust crypto store before upgrading.`

- 含義：OpenClaw 發現舊的加密 Matrix 狀態，但無法從通常負責檢查該儲存的 Matrix 外掛載入協助程式進入點。
- 解決方法：重新安裝或修復 Matrix 外掛（`openclaw plugins install @openclaw/matrix`，若是從 repo checkout 則使用 `openclaw plugins install ./extensions/matrix`），然後重新執行 `openclaw doctor --fix` 或重新啟動閘道。

`Matrix plugin helper path is unsafe: ... Reinstall @openclaw/matrix and try again.`

- 含義：OpenClaw 發現一個超出外掛根目錄或未通過外掛邊界檢查的輔助檔案路徑，因此拒絕匯入它。
- 解決方法：從受信任的路徑重新安裝 Matrix 外掛，然後重新執行 `openclaw doctor --fix` 或重新啟動閘道。

`- Failed creating a Matrix migration snapshot before repair: ...`

`- Skipping Matrix migration changes for now. Resolve the snapshot failure, then rerun "openclaw doctor --fix".`

- 含義：OpenClaw 拒絕變更 Matrix 狀態，因為它無法先建立復原快照。
- 解決方法：解決備份錯誤，然後重新執行 `openclaw doctor --fix` 或重新啟動閘道。

`Failed migrating legacy Matrix client storage: ...`

- 含義：Matrix 客戶端後備找到了舊的平面存儲，但移動失敗。OpenClaw 現在會中止該後備，而不是無聲地啟動一個新的存儲。
- 處理方式：檢查文件系統權限或衝突，保持舊狀態完整，並在修復錯誤後重試。

`Matrix is installed from a custom path: ...`

- 含義：Matrix 被固定為路徑安裝，因此主線更新不會自動將其替換為倉庫中的標準 Matrix 套件。
- 處理方式：當您想要返回默認的 Matrix 外掛時，請使用 `openclaw plugins install @openclaw/matrix` 重新安裝。

### 加密狀態恢復訊息

`matrix: restored X/Y room key(s) from legacy encrypted-state backup`

- 含義：備份的房間金鑰已成功還原到新的加密存儲中。
- 處理方式：通常無需操作。

`matrix: N legacy local-only room key(s) were never backed up and could not be restored automatically`

- 含義：某些舊的房間金鑰僅存在於舊的本地存儲中，且從未上傳到 Matrix 備份。
- 處理方式：預期部分舊的加密歷史記錄將保持無法存取，除非您可以從另一個已驗證的用戶端手動還原這些金鑰。

`Legacy Matrix encrypted state for account "..." has backed-up room keys, but no local backup decryption key was found. Ask the operator to run "openclaw matrix verify backup restore --recovery-key <key>" after upgrade if they have the recovery key.`

- 含義：備份存在，但 OpenClaw 無法自動還原還原金鑰。
- 處理方式：執行 `openclaw matrix verify backup restore --recovery-key "<your-recovery-key>"`。

`Failed inspecting legacy Matrix encrypted state for account "..." (...): ...`

- 含義：OpenClaw 找到了舊的加密存儲，但無法安全地檢查它以準備還原。
- 處理方式：重新執行 `openclaw doctor --fix`。如果重複出現，請保持舊的狀態目錄完整，並使用另一個已驗證的 Matrix 用戶端以及 `openclaw matrix verify backup restore --recovery-key "<your-recovery-key>"` 進行還原。

`Legacy Matrix backup key was found for account "...", but .../recovery-key.json already contains a different recovery key. Leaving the existing file unchanged.`

- 含義：OpenClaw 偵測到備份金鑰衝突，並拒絕自動覆蓋目前的還原金鑰檔案。
- 處理方式：在重試任何還原指令之前，請驗證哪一個還原金鑰是正確的。

`Legacy Matrix encrypted state for account "..." cannot be fully converted automatically because the old rust crypto store does not expose all local room keys for export.`

- 含義：這是舊儲存格式的硬性限制。
- 處理方式：已備份的金鑰仍可還原，但僅限本地的加密歷史記錄可能仍然無法使用。

`matrix: failed restoring room keys from legacy encrypted-state backup: ...`

- 含義：新外掛程式嘗試還原，但 Matrix 傳回了錯誤。
- 處理方式：執行 `openclaw matrix verify backup status`，然後如有需要，使用 `openclaw matrix verify backup restore --recovery-key "<your-recovery-key>"` 重試。

### 手動還原訊息

`Backup key is not loaded on this device. Run 'openclaw matrix verify backup restore' to load it and restore old room keys.`

- 含義：OpenClaw 知道您應該有備份金鑰，但在這台裝置上未啟用。
- 處理方式：執行 `openclaw matrix verify backup restore`，或如有需要傳遞 `--recovery-key`。

`Store a recovery key with 'openclaw matrix verify device <key>', then run 'openclaw matrix verify backup restore'.`

- 含義：此裝置目前未儲存還原金鑰。
- 處理方式：首先使用您的還原金鑰驗證裝置，然後還原備份。

`Backup key mismatch on this device. Re-run 'openclaw matrix verify device <key>' with the matching recovery key.`

- 含義：儲存的金鑰與現有的 Matrix 備份不符。
- 處理方式：使用正確的金鑰重新執行 `openclaw matrix verify device "<your-recovery-key>"`。

如果您接受無法復原的舊加密歷史記錄遺失，也可以改用 `openclaw matrix verify backup reset --yes` 重設目前的備份基線。

`Backup trust chain is not verified on this device. Re-run 'openclaw matrix verify device <key>'.`

- 含義：備份存在，但此裝置尚未充分信任交叉簽署鏈。
- 處理方式：重新執行 `openclaw matrix verify device "<your-recovery-key>"`。

`Matrix recovery key is required`

- 含義：您嘗試進行復原步驟，但在需要時未提供復原金鑰。
- 處理方式：使用您的復原金鑰重新執行指令。

`Invalid Matrix recovery key: ...`

- 含義：提供的金鑰無法解析或不符合預期的格式。
- 處理方式：使用您的 Matrix 用戶端或 recovery-key 檔案中的確切復原金鑰重試。

`Matrix device is still unverified after applying recovery key. Verify your recovery key and ensure cross-signing is available.`

- 意義：金鑰已套用，但裝置仍無法完成驗證。
- 處理方式：確認您使用了正確的金鑰，且帳號上有交叉簽署可用，然後重試。

`Matrix key backup is not active on this device after loading from secret storage.`

- 意義：秘密儲存並未在此裝置上產生效力的備份工作階段。
- 處理方式：先驗證裝置，然後使用 `openclaw matrix verify backup status` 重新檢查。

`Matrix crypto backend cannot load backup keys from secret storage. Verify this device with 'openclaw matrix verify device <key>' first.`

- 意義：此裝置在裝置驗證完成前，無法從秘密儲存還原。
- 處理方式：請先執行 `openclaw matrix verify device "<your-recovery-key>"`。

### 自訂外掛程式安裝訊息

`Matrix is installed from a custom path that no longer exists: ...`

- 意義：您的外掛程式安裝記錄指向一個已不存在的本機路徑。
- 處理方式：使用 `openclaw plugins install @openclaw/matrix` 重新安裝，或者如果您是從 repo checkout 執行，則使用 `openclaw plugins install ./extensions/matrix`。

## 如果加密歷史記錄仍然無法恢復

按順序執行這些檢查：

```bash
openclaw matrix verify status --verbose
openclaw matrix verify backup status --verbose
openclaw matrix verify backup restore --recovery-key "<your-recovery-key>" --verbose
```

如果備份成功還原，但某些舊房間仍然缺少歷史記錄，這些遺失的金鑰可能從未被先前的外掛程式備份。

## 如果您想為未來的訊息重新開始

如果您接受遺失無法復原的舊加密歷史記錄，並且只希望從現在開始有一個乾淨的備份基準，請按順序執行這些指令：

```bash
openclaw matrix verify backup reset --yes
openclaw matrix verify backup status --verbose
openclaw matrix verify status
```

如果在此之後裝置仍然未驗證，請從您的 Matrix 用戶端完成驗證，方法是比較 SAS 表情符號或十進位代碼並確認它們相符。

## 相關頁面

- [Matrix](/zh-Hant/channels/matrix)
- [Doctor](/zh-Hant/gateway/doctor)
- [遷移](/zh-Hant/install/migrating)
- [外掛程式](/zh-Hant/tools/plugin)

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
