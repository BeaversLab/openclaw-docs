---
summary: "媒體生成、理解和語音功能的統一登陸頁面"
read_when:
  - Looking for an overview of media capabilities
  - Deciding which media provider to configure
  - Understanding how async media generation works
title: "媒體總覽"
---

# 媒體生成與理解

OpenClaw 可以生成圖片、影片和音樂，理解傳入的媒體（圖片、音訊、影片），並透過文字轉語音朗讀回覆。所有媒體功能皆由工具驅動：代理程式會根據對話決定何時使用這些功能，且只有在至少設定了一個後端供應商時，才會顯示各個工具。

## 功能一覽

| 功能             | 工具             | 供應商                                                                                       | 作用                                 |
| ---------------- | ---------------- | -------------------------------------------------------------------------------------------- | ------------------------------------ |
| 圖片生成         | `image_generate` | ComfyUI, fal, Google, MiniMax, OpenAI, Vydra, xAI                                            | 根據文字提示或參考來源建立或編輯圖片 |
| 影片生成         | `video_generate` | Alibaba, BytePlus, ComfyUI, fal, Google, MiniMax, OpenAI, Qwen, Runway, Together, Vydra, xAI | 根據文字、圖片或現有影片建立影片     |
| 音樂生成         | `music_generate` | ComfyUI, Google, MiniMax                                                                     | 根據文字提示建立音樂或音軌           |
| 文字轉語音 (TTS) | `tts`            | ElevenLabs, Microsoft, MiniMax, OpenAI, xAI                                                  | 將傳出的回覆轉換為口語音訊           |
| 媒體理解         | (自動)           | 任何具備視覺/音訊功能的模型供應商，加上 CLI 備援方案                                         | 總結傳入的圖片、音訊和影片           |

## 供應商功能矩陣

此表格顯示各供應商在平台上支援哪些媒體功能。

| 供應商     | 圖片 | 影片 | 音樂 | TTS | STT / 轉錄 | 媒體理解 |
| ---------- | ---- | ---- | ---- | --- | ---------- | -------- |
| Alibaba    |      | 是   |      |     |            |          |
| BytePlus   |      | 是   |      |     |            |          |
| ComfyUI    | 是   | 是   | 是   |     |            |          |
| Deepgram   |      |      |      |     | 是         |          |
| ElevenLabs |      |      |      | 是  | 是         |          |
| fal        | 是   | 是   |      |     |            |          |
| Google     | 是   | 是   | 是   |     |            | 是       |
| Microsoft  |      |      |      | 是  |            |          |
| MiniMax    | 是   | 是   | 是   | 是  |            |          |
| Mistral    |      |      |      |     | 是         |          |
| OpenAI     | 是   | 是   |      | 是  | 是         | 是       |
| Qwen       |      | 是   |      |     |            |          |
| Runway     |      | 是   |      |     |            |          |
| Together   |      | 是   |      |     |            |          |
| Vydra      | 是   | 是   |      |     |            |          |
| xAI        | 是   | 是   |      | 是  | 是         | 是       |

<Note>媒體理解使用在您的供應商設定中註冊的任何具備視覺或音訊功能的模型。上表突顯了具有專用媒體理解支援的供應商；大多數具有多模態模型的 LLM 供應商（Anthropic、Google、OpenAI 等）在被設定為主動回覆模型時，也能理解輸入的媒體。</Note>

## 非同步生成如何運作

影片和音樂生成作為背景任務運行，因為供應商處理通常需要 30 秒到幾分鐘的時間。當代理呼叫 `video_generate` 或 `music_generate` 時，OpenClaw 會向供應商提交請求，立即傳回任務 ID，並在任務帳本中追蹤該任務。在任務運行時，代理會繼續回應其他訊息。當供應商完成後，OpenClaw 會喚醒代理，以便其將完成的媒體貼回原始頻道。圖像生成和 TTS 是同步的，並與回覆一起內聯完成。

Deepgram、ElevenLabs、Mistral、OpenAI 和 xAI 都可以在設定後透過批次 `tools.media.audio` 路徑轉錄輸入的音訊。Deepgram、
ElevenLabs、Mistral、OpenAI 和 xAI 也註冊了語音通話串流 STT
供應商，因此即時電話音訊可以轉發到選定的供應商，而無需等待錄製完成。

OpenAI 對應到 OpenClaw 的圖像、影片、批次 TTS、批次 STT、語音通話
串流 STT、即時語音和記憶體嵌入介面。xAI 目前
對應到 OpenClaw 的圖像、影片、搜尋、程式碼執行、批次 TTS、批次 STT
和語音通話串流 STT 介面。xAI 即時語音是一個上游
功能，但在共享即時語音合約能夠表示它之前，它不會在 OpenClaw 中註冊。

## 快速連結

- [圖像生成](/zh-Hant/tools/image-generation) -- 生成和編輯圖像
- [影片生成](/zh-Hant/tools/video-generation) -- 文字轉影片、圖像轉影片和影片轉影片
- [音樂生成](/zh-Hant/tools/music-generation) -- 創作音樂和音軌
- [文字轉語音](/zh-Hant/tools/tts) -- 將回覆轉換為口語音訊
- [媒體理解](/zh-Hant/nodes/media-understanding) -- 理解傳入的影像、音訊和視訊
