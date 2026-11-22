/* ============================================================
   narration.js — the supplied voice-over script (EDIT TIMES ONLY)

   Text below is the supplied script word for word; subtitles show
   exactly these words. [square brackets] = yellow highlight only
   (they are not spoken differently).

   start/end are PLACEHOLDER times from the 9-scene plan (90 s).
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
    { scene: 1, start: 0.6,  end: 7.6,  text: 'คุณเชื่อไหมว่า...ป่าภูเขาในจังหวัด[หนองบัวลำภู] เคยเป็นหนึ่งในพื้นที่เคลื่อนไหวทางการเมืองที่สำคัญที่สุดแห่งหนึ่งของ[ภาคอีสาน]!' },
    { scene: 2, start: 8.5,  end: 16.4, text: 'สถานที่แห่งนี้มีชื่อว่า “[เขตงานภูซาง]” ตั้งอยู่ในแนว[เทือกเขาภูพาน] บริเวณรอยต่อของหลายจังหวัด' },
    { scene: 3, start: 17.5, end: 25.4, text: 'ย้อนกลับไปในช่วงปี [พ.ศ. 2500 ถึง 2510] ประเทศไทยกำลังเผชิญ[ความขัดแย้งทางการเมือง]อย่างรุนแรง' },
    { scene: 4, start: 26.5, end: 35.4, text: 'ในปี [พ.ศ. 2504] การสร้าง[ถนนสายอุดรธานีถึงหนองบัวลำภู] กลับกลายเป็นจุดเริ่มต้นสำคัญของการรวมตัวและจัดตั้งมวลชนในพื้นที่' },
    { scene: 5, start: 36.5, end: 46.4, text: 'ต่อมาในปี [พ.ศ. 2509] เกิดเหตุการณ์โจมตี[สถานีตำรวจหนองบัวลำภู] นับเป็นจุดเริ่มต้นของการต่อสู้ด้วยอาวุธในขบวนการปฏิวัติแห่งเทือกเขาภูซาง โดยมี[ผู้เสียชีวิต 2 คน]ในเหตุการณ์นั้น' },
    { scene: 6, start: 47.5, end: 56.4, text: 'เมื่อพื้นที่เดิมเริ่มไม่ปลอดภัย การเคลื่อนไหวจึงขยายเข้าสู่[ป่าลึกของเทือกเขาภูซาง] ซึ่งกลายเป็น[ฐานที่มั่น]และแหล่งพักพิงของผู้ร่วมขบวนการ' },
    { scene: 7, start: 57.5, end: 67.4, text: 'ช่วงปี [พ.ศ. 2515 ถึง 2518] ถือเป็นช่วงที่เขตงานภูซาง[ขยายตัวอย่างรวดเร็ว] ขณะเดียวกัน[ฝ่ายรัฐบาล]ก็เพิ่มมาตรการปราบปราม และจัดตั้งหน่วยปฏิบัติการเข้าควบคุมสถานการณ์' },
    { scene: 8, start: 68.5, end: 77.4, text: 'แต่เรื่องราวของภูซางไม่ได้จบลงแค่การต่อสู้ ปัจจุบันยังมี[สถูปและพิพิธภัณฑ์เขตงานภูซาง] ที่เก็บรักษา[ความทรงจำ]ของผู้คนจากความขัดแย้งในอดีต' },
    { scene: 9, start: 78.5, end: 88.6, text: 'นี่คือประวัติศาสตร์อีกหน้าหนึ่งของหนองบัวลำภู...เรื่องราวที่เตือนให้[คนรุ่นหลัง]เข้าใจว่า ความขัดแย้งทางการเมืองครั้งหนึ่ง เคย[เปลี่ยนชีวิตผู้คนและชุมชน]ไปมากเพียงใด' },
  ],
};
