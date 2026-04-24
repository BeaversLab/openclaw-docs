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

## 文件國際化

- 外語文件不在此倉庫中維護。生成的發布輸出位於單獨的 `openclaw/docs` 倉庫中（通常在本地複製為 `../openclaw-docs`）。
- 請勿在此處的 `docs/<locale>/**` 下新增或編輯本地化文件。
- 請將此倉庫中的英文文件以及詞彙表文件視為權威來源。
- 流程：在此處更新英文文件，視需要更新 `docs/.i18n/glossary.<locale>.json`，然後讓發布倉庫同步和 `scripts/docs-i18n` 在 `openclaw/docs` 中執行。
- 在重新執行 `scripts/docs-i18n` 之前，請為任何必須保持英文或使用固定翻譯的新技術術語、頁面標題或短導覽標籤新增詞彙表條目。
- `pnpm docs:check-i18n-glossary` 是針對已變更的英文文件標題和簡短內部文件標籤的檢查機制。
- 翻譯記憶儲存在發布倉庫中生成的 `docs/.i18n/*.tm.jsonl` 檔案中。
- 請參閱 `docs/.i18n/README.md`。
