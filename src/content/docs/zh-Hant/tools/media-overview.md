---
summary: "圖像、影片、音樂、語音與媒體理解功能概覽"
read_when:
  - Looking for an overview of OpenClaw's media capabilities
  - Deciding which media provider to configure
  - Understanding how async media generation works
title: "媒體概覽"
sidebarTitle: "媒體概覽"
---

OpenClaw 可以生成圖像、影片和音樂，理解輸入的媒體（圖像、音訊、影片），並透過文字轉語音大聲朗讀回覆。所有媒體功能均由工具驅動：代理程式會根據對話決定何時使用它們，而每個工具只有在至少設定了一個後端供應商時才會出現。

即時語音使用 Talk 會話合約，而不是一次性媒體工具路徑。Talk 有三種模式：供應商原生 `realtime`、本機或串流 `stt-tts`，以及僅用於觀察的語音擷取 `transcription`。這些模式與電話、會議、瀏覽器即時通訊和原生按鍵通話客戶端共享供應商目錄、事件封包和取消語意。

## 功能

<CardGroup cols={2}>
  <Card title="圖像生成" href="/zh-Hant/tools/image-generation" icon="image">
    透過 `image_generate` 從文字提示或參考圖像建立與編輯圖像。 同步 — 與回覆一併完成。
  </Card>
  <Card title="影片生成" href="/zh-Hant/tools/video-generation" icon="video">
    透過 `video_generate` 進行文字轉影片、圖像轉影片以及影片轉影片。 非同步 — 在背景執行並於準備就緒時發佈結果。
  </Card>
  <Card title="音樂生成" href="/zh-Hant/tools/music-generation" icon="music">
    透過 `music_generate` 生成音樂或音訊軌道。共用供應商上為非同步； ComfyUI 工作流程路徑則同步執行。
  </Card>
  <Card title="文字轉語音" href="/zh-Hant/tools/tts" icon="microphone">
    透過 `tts` 工具加上 `messages.tts` 設定，將傳出回覆轉換為口語音訊。同步。
  </Card>
  <Card title="媒體理解" href="/zh-Hant/nodes/media-understanding" icon="eye">
    使用具備視覺能力的模型供應商和專用的媒體理解外掛，摘要傳入的圖像、音訊和影片。
  </Card>
  <Card title="語音轉文字" href="/zh-Hant/nodes/audio" icon="ear-listen">
    透過批次 STT 或語音通話串流 STT 提供者轉錄傳入的語音訊息。
  </Card>
</CardGroup>

## 提供者功能矩陣

| 提供者      | 圖片 | 影片 | 音樂 | TTS | STT | 即時語音 | 媒體理解 |
| ----------- | :--: | :--: | :--: | :-: | :-: | :------: | :------: |
| Alibaba     |      |  ✓   |      |     |     |          |          |
| BytePlus    |      |  ✓   |      |     |     |          |          |
| ComfyUI     |  ✓   |  ✓   |  ✓   |     |     |          |          |
| DeepInfra   |  ✓   |  ✓   |      |  ✓  |  ✓  |          |    ✓     |
| Deepgram    |      |      |      |     |  ✓  |    ✓     |          |
| ElevenLabs  |      |      |      |  ✓  |  ✓  |          |          |
| fal         |  ✓   |  ✓   |      |     |     |          |          |
| Google      |  ✓   |  ✓   |  ✓   |  ✓  |     |    ✓     |    ✓     |
| Gradium     |      |      |      |  ✓  |     |          |          |
| Local CLI   |      |      |      |  ✓  |     |          |          |
| Microsoft   |      |      |      |  ✓  |     |          |          |
| MiniMax     |  ✓   |  ✓   |  ✓   |  ✓  |     |          |          |
| Mistral     |      |      |      |     |  ✓  |          |          |
| OpenAI      |  ✓   |  ✓   |      |  ✓  |  ✓  |    ✓     |    ✓     |
| OpenRouter  |  ✓   |  ✓   |      |  ✓  |  ✓  |          |    ✓     |
| Qwen        |      |  ✓   |      |     |     |          |          |
| Runway      |      |  ✓   |      |     |     |          |          |
| SenseAudio  |      |      |      |     |  ✓  |          |          |
| Together    |      |  ✓   |      |     |     |          |          |
| Vydra       |  ✓   |  ✓   |      |  ✓  |     |          |          |
| xAI         |  ✓   |  ✓   |      |  ✓  |  ✓  |          |    ✓     |
| Xiaomi MiMo |  ✓   |      |      |  ✓  |     |          |    ✓     |

<Note>媒體理解使用您提供者設定中註冊的任何具備視覺或音訊功能的模型。上方的矩陣列出了具備專用媒體理解支援的提供者；大多數多模態 LLM 提供者（Anthropic、Google、OpenAI 等）在設定為活動回覆模型時，也能理解傳入的媒體。</Note>

## 非同步與同步

| 功能           | 模式   | 原因                                                                   |
| -------------- | ------ | ---------------------------------------------------------------------- |
| 圖片           | 同步   | 提供者回應在幾秒內返回；與回覆一併完成。                               |
| 文字轉語音     | 同步   | 提供者回應在幾秒內返回；附加至回覆音訊。                               |
| 影片           | 非同步 | 提供者處理耗時 30 秒至數分鐘；緩慢的佇列可能會執行直到設定的逾時時間。 |
| 音樂（共用）   | 非同步 | 提供者處理特性與影片相同。                                             |
| 音樂 (ComfyUI) | 同步   | 本機工作流程對設定的 ComfyUI 伺服器執行內嵌處理。                      |

對於非同步工具，OpenClaw 會向供應商提交請求，立即返回任務 ID，並在任務賬本中追蹤該工作。在任務執行時，Agent 會繼續回應其他訊息。當供應商完成後，OpenClaw 會喚醒 Agent 並提供生成的媒體路徑，以便它能告知用戶，並在來源傳遞策略要求時，透過訊息工具轉發結果。對於僅使用訊息工具的群組/頻道路由，如果缺少訊息工具傳遞證據，OpenClaw 會將其視為嘗試完成失敗，並將生成的媒體備用方案直接傳送到原始頻道。

## 語音轉文字與語音通話

當配置後，Deepgram、DeepInfra、ElevenLabs、Mistral、OpenAI、OpenRouter、SenseAudio 和 xAI 都可以透過批次 `tools.media.audio` 路徑來轉錄輸入的音訊。
對於提及閘控或指令解析預檢語音訊息的頻道外掛會在輸入上下文中標記已轉錄的附件，因此共用的媒體理解程序會重複使用該轉錄結果，而不是對相同的音訊進行第二次 STT 呼叫。

Deepgram、ElevenLabs、Mistral、OpenAI 和 xAI 也註冊了語音通話串流 STT 供應商，因此即時電話音訊可以轉發到選定的供應商，而無需等待錄音完成。

對於即時用戶對話，建議優先使用 [Talk 模式](/zh-Hant/nodes/talk)。批次音訊附件保留在媒體路徑上；瀏覽器即時、原生按鍵通話、電話和會議音訊應使用 Talk 事件以及 Gateway 返回的會話範圍目錄。

## 供應商對應關係（供應商如何分散在各個介面上）

<AccordionGroup>
  <Accordion title="Google">影像、影片、音樂、批次 TTS、後端即時語音和 媒體理解介面。</Accordion>
  <Accordion title="OpenAI">影像、影片、批次 TTS、批次 STT、語音通話串流 STT、後端 即時語音和記憶體嵌入介面。</Accordion>
  <Accordion title="DeepInfra">聊天/模型路由、圖像生成/編輯、文字轉影片、批次 TTS、批次 STT、圖像媒體理解以及記憶嵌入表面。 DeepInfra 原生的 rerank/classification/object-detection 模型在 OpenClaw 擁有這些類別的專用提供者合約之前 不會被註冊。</Accordion>
  <Accordion title="xAI">圖像、影片、搜尋、程式碼執行、批次 TTS、批次 STT 以及語音 通話串流 STT。xAI Realtime voice 是一個上游功能，但在 共用的 realtime-voice 合約能夠 表示它之前，不會在 OpenClaw 中註冊。</Accordion>
</AccordionGroup>

## 相關

- [圖像生成](/zh-Hant/tools/image-generation)
- [影片生成](/zh-Hant/tools/video-generation)
- [音樂生成](/zh-Hant/tools/music-generation)
- [文字轉語音](/zh-Hant/tools/tts)
- [媒體理解](/zh-Hant/nodes/media-understanding)
- [音訊節點](/zh-Hant/nodes/audio)
- [Talk 模式](/zh-Hant/nodes/talk)
