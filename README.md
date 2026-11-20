# Đảo Đèn Lồng

> Video demo: _(sẽ cập nhật ở CP5)_

Game 3D góc nhìn thứ ba: Mây, người giữ đèn nhỏ tuổi, gom đom đóm để thắp lại các Đèn Lồng Lớn và né Bóng Mực trong sương đen.
Bài lab AI in Action, Day 12 (tài liệu đề bài ở [docs/lab/](docs/lab/README.md)).

## Cài đặt và chạy (Node >= 20)

```bash
npm install
npm run dev        # mở URL được in ra, điều khiển bằng WASD
```

## Headless và test

```bash
npm run headless -- --seed 1 --ticks 60
npm test
```

_(Định dạng headless sẽ theo Test Contract từ Phase 1.)_

## Điều khiển
- `W A S D`: di chuyển

## Cấu trúc
- `src/core/`: logic game thuần, tất định, dùng chung cho bản chơi và headless
- `src/headless/`: CLI theo Test Contract
- `src/web/`: hiển thị Three.js
- `tests/`: test (`node:test`)
- `docs/notes/`: giả định, nhật ký AI, retro · `docs/proof/`: bằng chứng
- `AGENTS.md` / `CLAUDE.md`: harness cho AI agent

## Sáng tạo của tôi
_(cập nhật dần)_
