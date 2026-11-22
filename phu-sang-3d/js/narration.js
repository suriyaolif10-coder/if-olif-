/* ============================================================
   narration.js — the supplied voice-over script (EDIT TIMES ONLY)

   Text below is the supplied script word for word; subtitles show
   exactly these words. [square brackets] = yellow highlight only
   (they are not spoken differently).

   start/end below are measured from the pauses in voiceover.mp3
   (ElevenLabs, 0.5 s lead-in added). Word times inside a line are estimated.
   After recording in Google AI Studio:
     · put the file at assets/audio/voiceover.mp3 (or load it in the player)
     · press T in the player and hit Enter as each paragraph begins, or
     · import word timestamps (📝) — then paste the result here.
   Scene lengths follow these times automatically (scenes.js → syncScenesToNarration).
   ============================================================ */
'use strict';

const NARRATION = {
  voiceSrc: 'assets/audio/voiceover.mp3',
  musicSrc: 'assets/audio/music.mp3',      // optional — a built-in documentary-suspense score plays if missing
  lines: [
    { scene: 1, start: 0.50, end: 8.99,  text: 'คุณเชื่อไหมว่า...ป่าภูเขาในจังหวัด[หนองบัวลำภู] เคยเป็นหนึ่งในพื้นที่เคลื่อนไหวทางการเมืองที่สำคัญที่สุดแห่งหนึ่งของ[ภาคอีสาน]!' },
    { scene: 2, start: 9.56, end: 16.72, text: 'สถานที่แห่งนี้มีชื่อว่า “[เขตงานภูซาง]” ตั้งอยู่ในแนว[เทือกเขาภูพาน] บริเวณรอยต่อของหลายจังหวัด' },
    { scene: 3, start: 17.38, end: 25.41, text: 'ย้อนกลับไปในช่วงปี [พ.ศ. 2500 ถึง 2510] ประเทศไทยกำลังเผชิญ[ความขัดแย้งทางการเมือง]อย่างรุนแรง' },
    { scene: 4, start: 25.85, end: 36.09, text: 'ในปี [พ.ศ. 2504] การสร้าง[ถนนสายอุดรธานีถึงหนองบัวลำภู] กลับกลายเป็นจุดเริ่มต้นสำคัญของการรวมตัวและจัดตั้งมวลชนในพื้นที่' },
    { scene: 5, start: 36.60, end: 50.31, text: 'ต่อมาในปี [พ.ศ. 2509] เกิดเหตุการณ์โจมตี[สถานีตำรวจหนองบัวลำภู] นับเป็นจุดเริ่มต้นของการต่อสู้ด้วยอาวุธในขบวนการปฏิวัติแห่งเทือกเขาภูซาง โดยมี[ผู้เสียชีวิต 2 คน]ในเหตุการณ์นั้น' },
    { scene: 6, start: 50.85, end: 60.27, text: 'เมื่อพื้นที่เดิมเริ่มไม่ปลอดภัย การเคลื่อนไหวจึงขยายเข้าสู่[ป่าลึกของเทือกเขาภูซาง] ซึ่งกลายเป็น[ฐานที่มั่น]และแหล่งพักพิงของผู้ร่วมขบวนการ' },
    { scene: 7, start: 60.74, end: 74.88, text: 'ช่วงปี [พ.ศ. 2515 ถึง 2518] ถือเป็นช่วงที่เขตงานภูซาง[ขยายตัวอย่างรวดเร็ว] ขณะเดียวกัน[ฝ่ายรัฐบาล]ก็เพิ่มมาตรการปราบปราม และจัดตั้งหน่วยปฏิบัติการเข้าควบคุมสถานการณ์' },
    { scene: 8, start: 75.32, end: 85.92, text: 'แต่เรื่องราวของภูซางไม่ได้จบลงแค่การต่อสู้ ปัจจุบันยังมี[สถูปและพิพิธภัณฑ์เขตงานภูซาง] ที่เก็บรักษา[ความทรงจำ]ของผู้คนจากความขัดแย้งในอดีต' },
    { scene: 9, start: 86.44, end: 97.70, text: 'นี่คือประวัติศาสตร์อีกหน้าหนึ่งของหนองบัวลำภู...เรื่องราวที่เตือนให้[คนรุ่นหลัง]เข้าใจว่า ความขัดแย้งทางการเมืองครั้งหนึ่ง เคย[เปลี่ยนชีวิตผู้คนและชุมชน]ไปมากเพียงใด' },
  ],
};
