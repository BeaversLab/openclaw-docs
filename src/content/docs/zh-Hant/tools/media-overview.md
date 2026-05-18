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
    透過 `image_generate`，根據文字提示或參考圖片建立與編輯圖片。 在聊天工作階段中為非同步 — 在背景執行，並在準備就緒時發佈結果。
  </Card>
  <Card title="影片生成" href="/zh-Hant/tools/video-generation" icon="video">
    透過 `video_generate` 進行文字轉影片、圖像轉影片以及影片轉影片。 非同步 — 在背景執行並於準備就緒時發佈結果。
  </Card>
  <Card title="音樂生成" href="/zh-Hant/tools/music-generation" icon="music">
    透過 `music_generate` 生成音樂或音訊軌道。在共用的媒體生成任務生命週期中，於聊天工作階段內非同步執行。
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
| fal         |  ✓   |  ✓   |  ✓   |     |     |          |          |
| Google      |  ✓   |  ✓   |  ✓   |  ✓  |     |    ✓     |    ✓     |
| Gradium     |      |      |      |  ✓  |     |          |          |
| Local CLI   |      |      |      |  ✓  |     |          |          |
| Microsoft   |      |      |      |  ✓  |     |          |          |
| MiniMax     |  ✓   |  ✓   |  ✓   |  ✓  |     |          |          |
| Mistral     |      |      |      |     |  ✓  |          |          |
| OpenAI      |  ✓   |  ✓   |      |  ✓  |  ✓  |    ✓     |    ✓     |
| OpenRouter  |  ✓   |  ✓   |  ✓   |  ✓  |  ✓  |          |    ✓     |
| Qwen        |      |  ✓   |      |     |     |          |          |
| Runway      |      |  ✓   |      |     |     |          |          |
| SenseAudio  |      |      |      |     |  ✓  |          |          |
| Together    |      |  ✓   |      |     |     |          |          |
| Vydra       |  ✓   |  ✓   |      |  ✓  |     |          |          |
| xAI         |  ✓   |  ✓   |      |  ✓  |  ✓  |          |    ✓     |
| Xiaomi MiMo |  ✓   |      |      |  ✓  |     |          |    ✓     |

<Note>媒體理解使用您提供者設定中註冊的任何具備視覺或音訊功能的模型。上方的矩陣列出了具備專用媒體理解支援的提供者；大多數多模態 LLM 提供者（Anthropic、Google、OpenAI 等）在設定為活動回覆模型時，也能理解傳入的媒體。</Note>

## 非同步與同步

| 功能       | 模式   | 原因                                                                   |
| ---------- | ------ | ---------------------------------------------------------------------- |
| 圖片       | 非同步 | 提供者處理時間可長於一個輪次；生成的附件使用共用的完成路徑。           |
| 文字轉語音 | 同步   | 提供者回應在幾秒內返回；附加至回覆音訊。                               |
| 影片       | 非同步 | 提供者處理耗時 30 秒至數分鐘；緩慢的佇列可能會執行直到設定的逾時時間。 |
| 音樂       | 非同步 | 提供者處理特性與影片相同。                                             |

對於非同步工具，OpenClaw 會將請求提交給提供者，立即傳回任務 ID，並在任務帳本中追蹤該工作。當工作執行時，代理程式會繼續回應其他訊息。當提供者完成時，OpenClaw 會使用生成的媒體路徑喚醒代理程式，以便它通知使用者並透過訊息工具傳送結果。OpenClaw 將遺失訊息工具遞送證據視為失敗的完成嘗試，並不會自動發佈生成的媒體作為備援方案。

## 語音轉文字與語音通話

當經過設定時，Deepgram、DeepInfra、ElevenLabs、Mistral、OpenAI、OpenRouter、SenseAudio 和 xAI 都可以透過批次 `tools.media.audio` 路徑轉錄輸入音訊。預檢語音訊息以進行提及閘控或指令解析的頻道外掛程式會在輸入內容上標示轉錄的附件，因此共用的媒體理解流程會重複使用該轉錄結果，而不是針對相同的音訊進行第二次 STT 呼叫。

Deepgram、ElevenLabs、Mistral、OpenAI 和 xAI 也註冊了語音通話串流 STT 提供者，因此即時電話音訊可以在不等待完整錄音的情況下轉發至選定的廠商。

對於即時使用者對話，建議使用 [Talk 模式](/zh-Hant/nodes/talk)。批次音訊附件會停留在媒體路徑上；瀏覽器即時、原生按鍵通話、電話和會議音訊應該使用 Talk 事件以及 Gateway 傳回的工作階段範圍目錄。

## 供應商對應（供應商如何跨越不同介面進行分割）

<AccordionGroup>
  <Accordion title="Google">圖像、影片、音樂、批次 TTS、後端即時語音以及 媒體理解介面。</Accordion>
  <Accordion title="OpenAI">圖像、影片、批次 TTS、批次 STT、語音通話串流 STT、後端 即時語音以及記憶體嵌入介面。</Accordion>
  <Accordion title="DeepInfra">聊天/模型路由、圖像生成/編輯、文字轉影片、批次 TTS、 批次 STT、圖像媒體理解以及記憶體嵌入介面。 DeepInfra 原生的重排序/分類/物件偵測模型在 OpenClaw 擁有這些類別的專屬供應商合約之前 將不會被註冊。</Accordion>
  <Accordion title="xAI">圖像、影片、搜尋、程式碼執行、批次 TTS、批次 STT 以及語音 通話串流 STT。xAI 即時語音是一項上游功能，但在 共享的即時語音合約能夠代表它之前， 不會在 OpenClaw 中註冊。</Accordion>
</AccordionGroup>

## 相關

- [圖像生成](/zh-Hant/tools/image-generation)
- [影片生成](/zh-Hant/tools/video-generation)
- [音樂生成](/zh-Hant/tools/music-generation)
- [文字轉語音](/zh-Hant/tools/tts)
- [媒體理解](/zh-Hant/nodes/media-understanding)
- [音訊節點](/zh-Hant/nodes/audio)
- [對談模式](/zh-Hant/nodes/talk)
