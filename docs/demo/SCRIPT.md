# Kịch bản video demo (< 5 phút)

Chuẩn bị: cửa sổ trình duyệt 1280×720, một terminal, VS Code mở repo. Quay bằng Win+Alt+R (Xbox Game Bar) hoặc OBS.

| Thời lượng | Nội dung | Thao tác |
|---|---|---|
| 0:00–0:20 | Giới thiệu | Mở README, đọc tên game và câu mô tả một dòng |
| 0:20–1:50 | **Chơi Đêm 1** | `npm run dev` → Bắt đầu → giới thiệu Đêm → nhặt đom đóm (thanh 10 ô) → `E` nạp đèn (nhắc "E — Nạp ánh sáng") → `F` Tỏa Sáng làm choáng Bóng Mực → `Shift` lướt → bị chạm (mất lửa, đom đóm rơi) → thắp một đèn (đảo sáng dần) |
| 1:50–2:30 | Đêm 2, Đêm 3 | Bục nhảy sang đảo B, Gió Lạc cướp đom đóm, Bùa Gió; Đêm 3: leo dốc, gió mạnh |
| 2:30–2:50 | Tạm dừng, cài đặt | `Esc` → Cài đặt (âm lượng, độ nhạy chuột) → Tiếp tục |
| 2:50–3:10 | Hiệu năng | `F3` hiện FPS ≈ 60 ở 1280×720 |
| 3:10–4:00 | **Bằng chứng chạy đúng** | Terminal: `npm test` (tất cả đạt) → chạy headless một Đêm → mở JSONL (snapshot/event/end) → chạy 2 lần và so hash (tất định) |
| 4:00–4:40 | Harness AI và quy trình | `AGENTS.md`, skill `headless-verify`, `docs/notes/assumptions.md`, `docs/proof/`; `git log --oneline` và các tag `phase-N` |
| 4:40–4:55 | Kết | Một câu về bài học lớn nhất (xem retro) |

Lệnh dùng trong video:
```bash
npm test
node src/headless/cli.js --seed 42 --night 1 --ticks 3600 --out a.jsonl
node src/headless/cli.js --seed 42 --night 1 --ticks 3600 --out b.jsonl
sha256sum a.jsonl b.jsonl
git log --oneline --decorate | head -20
```

Nén (nếu cần): `ffmpeg -i input.mp4 -t 300 -c:v libx264 -crf 28 -preset veryfast -c:a aac -b:a 96k demo.mp4`
