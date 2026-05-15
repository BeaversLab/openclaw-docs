# 文件指南

此目錄負責文件撰寫、Mintlify 連結規則以及文件國際化政策。

## Mintlify 規則

- 文件託管在 Mintlify (`https://docs.openclaw.ai`) 上。
- `docs/**/*.md` 中的內部文檔鏈接必須保持相對於根路徑，且不帶 `.md` 或 `.mdx` 後綴（例如：`[Config](/gateway/configuration)`）。
- 章節交叉引用應在相對於根路徑的路徑上使用錨點（例如：`[Hooks](/gateway/configuration-reference#hooks)`）。
- 文件標題應避免使用破折號和撇號，因為 Mintlify 的錨點生成機制在這方面比較脆弱。
- README 和其他 GitHub 渲染的文件應保留絕對文件 URL，以便連結在 Mintlify 之外也能正常運作。
- 文件內容必須保持通用：不得出現個人設備名稱、主機名稱或本地路徑；請使用如 `user@gateway-host` 等佔位符。

## 文件內容規則

- 對於文件、UI 文字和選取器列表，除非該章節明確描述了執行順序或自動偵測順序，否則請按字母順序排列服務/提供者。
- 套件外掛程式的命名應與根目錄 `AGENTS.md` 中的全專案外掛術語規則保持一致。

## 內部文件

- 長期存在的私有操作員文件屬於 `~/Projects/manager/docs/`。
- 存放於本地的內部暫存/鏡像檔文件可以位於被忽略的 `docs/internal/` 下。
- 切勿將 `docs/internal/**` 頁面新增至 `docs/docs.json` 導航，或從公開文件連結至這些頁面。
- 如果稍後強制新增頁面，`scripts/docs-sync-publish.mjs` 會從公開的 `openclaw/docs` 發布儲存庫中排除並修剪 `docs/internal/**`。
- 內部文件可以提及儲存庫路徑、私有應用程式名稱、1Password 項目名稱和操作手冊，但絕不能包含秘密值。

## 文件 i18n

- 外語文件不在此儲存庫中維護。生成的發布輸出位於單獨的 `openclaw/docs` 儲存庫中（通常在本機複製為 `../openclaw-docs`）。
- 請勿在此處的 `docs/<locale>/**` 下新增或編輯本地化文件。
- 將此儲存庫中的英文文件加上詞彙表檔案視為事實來源。
- 流程：在此更新英文文件，視需要更新 `docs/.i18n/glossary.<locale>.json`，然後讓發布儲存庫同步並在 `openclaw/docs` 中執行 `scripts/docs-i18n`。
- 在重新執行 `scripts/docs-i18n` 之前，請為任何必須保持英文或使用固定翻譯的新技術術語、頁面標題或簡短導航標籤新增詞彙表條目。
- `pnpm docs:check-i18n-glossary` 是變更英文文件標題和簡短內部文件標籤的防護機制。
- 翻譯記憶位於發布儲存庫中生成的 `docs/.i18n/*.tm.jsonl` 檔案中。
- 請參閱 `docs/.i18n/README.md`。
