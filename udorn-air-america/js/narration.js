/* ============================================================
   narration.js — voice-over script + subtitle timing (EDIT ME)

   · One entry per narration line. start/end = seconds on the
     video timeline when that line is spoken in the voice-over.
   · [square brackets] mark keywords → shown in yellow.
   · Word timing: if a line has  words: [["คำ", start, end], ...]
     those exact times are used. Otherwise the line is split into
     Thai words (Intl.Segmenter) and the time is shared out by
     word length — fine for TTS, but for exact word-for-word sync
     either use the player's timing mode (key T) or import a
     word-timestamp JSON (Whisper/ElevenLabs style) with the 📝 button.
   · Facts: only widely documented history is stated. Check against
     your own sources before publishing.
   ============================================================ */
'use strict';

const NARRATION = {
  voiceSrc: 'assets/audio/voiceover.mp3',   // put your recording here (or load it in the player)
  musicSrc: 'assets/audio/music.mp3',       // optional; a built-in synth score plays if missing
  lines: [
    { start: 0.6,  end: 8.8,  text: 'ในยุค[สงครามเวียดนาม] ภาคอีสานของไทยมีฐานบินแห่งหนึ่ง ที่กลายเป็นศูนย์กลางปฏิบัติการทางอากาศสำคัญ นั่นคือ[ฐานบินอุดร]' },
    { start: 10.4, end: 18.9, text: 'ช่วงทศวรรษ [1960] สหรัฐอเมริกาทำสงครามในเวียดนาม และ[รัฐบาลไทย]ซึ่งเป็นพันธมิตร อนุญาตให้กองทัพสหรัฐฯ ใช้ฐานทัพอากาศหลายแห่งในประเทศไทย' },
    { start: 20.4, end: 28.9, text: 'อุดรอยู่ไม่ไกลจากชายแดนลาว กองทัพอากาศสหรัฐฯ ใช้ที่นี่เป็นฐานของ[เครื่องบินลาดตระเวน] และเครื่องบินขับไล่ [F-4 แฟนทอม]' },
    { start: 30.4, end: 38.9, text: 'ฐานเดียวกันนี้ยังเป็นที่ตั้งสำคัญของ [แอร์อเมริกา] สายการบินที่ดูเหมือนบริษัทพลเรือน แต่แท้จริงแล้ว[ซีไอเอ]เป็นเจ้าของอย่างลับ ๆ' },
    { start: 40.4, end: 49.2, text: 'นักบินแอร์อเมริกาขนส่งคน อาหาร และสิ่งของ ด้วยเครื่องบินอย่าง [พอร์เตอร์] และ [ซี-123] ลงจอดบนลานบินดินแคบ ๆ ตามภูเขาในลาว ที่เรียกว่า[ไลมาไซต์]' },
    { start: 50.4, end: 58.6, text: 'เฮลิคอปเตอร์อย่าง [เอช-34] และ[ฮิวอี้] ทำหน้าที่ขนส่ง และ[ค้นหาช่วยเหลือ]นักบินที่ถูกยิงตก' },
    { start: 60.4, end: 68.9, text: 'ทั้งหมดนี้เป็นส่วนหนึ่งของสิ่งที่เรียกว่า [สงครามลับในลาว] ซึ่งซีไอเอสนับสนุนกองกำลังม้ง โดยมีฐานหลักที่[ล่องแจ้ง]' },
    { start: 70.4, end: 79.0, text: 'หลังข้อตกลงหยุดยิงในลาวปี [2516] แอร์อเมริกายุติการบินในลาวในปี [2517] และทหารสหรัฐฯ ถอนออกจากไทยภายในปี [2519]' },
    { start: 80.4, end: 88.6, text: 'ปัจจุบันฐานบินแห่งนี้คือ[กองบิน 23] กองทัพอากาศไทย ใช้ทางวิ่งร่วมกับ[ท่าอากาศยานนานาชาติอุดรธานี]' },
  ],
};
