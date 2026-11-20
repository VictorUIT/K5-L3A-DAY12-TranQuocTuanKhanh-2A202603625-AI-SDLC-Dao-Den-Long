# Đảo Đèn Lồng

> Video demo: _(sẽ cập nhật ở CP5)_

Game 3D góc nhìn thứ ba: Mây, người giữ đèn nhỏ tuổi, gom đom đóm để thắp lại các Đèn Lồng Lớn và né Bóng Mực trong sương đen.
Bài lab AI in Action, Day 12 (tài liệu đề bài ở [docs/lab/](docs/lab/README.md)).

## Cài đặt và chạy (Node >= 20, macOS/Linux/Windows)

```bash
npm install
npm run dev        # mở URL được in ra (vd. http://localhost:5173)
```

Bản web tĩnh: `npm run build` rồi phục vụ thư mục `dist/`.

## Điều khiển
| Phím | Hành động |
|---|---|
| `W A S D` | Đi (theo hướng camera) |
| Kéo chuột / `←` `→` | Xoay camera |
| `Space` | Nhảy |
| `E` | Nạp đom đóm vào đèn gần nhất |
| `F` | Tỏa sáng (tốn ánh sáng, làm choáng và đẩy Bóng Mực) |
| `R` | Chơi lại |

Đom đóm được nhặt tự động khi đi qua. Thắp đủ 5 đèn thì thắng; hết lửa hoặc trời sáng thì thua.

## Cách tính điểm
| Sự kiện | Điểm |
|---|---|
| Nhặt 1 đom đóm | +10 |
| Thắp 1 đèn | +100 |
| Làm choáng 1 Bóng Mực | +20 |
| Khi thắng: mỗi giây còn lại | +1 |
| Khi thắng: mỗi lửa còn lại | +50 |

## Headless (Test Contract v1.0) và test

```bash
node src/headless/cli.js --seed 1 --night 1 --ticks 3600 --out out.jsonl [--scenario s.json] [--inputs i.json] [--snapshot-every 10]
npm test
```

Khai báo số liệu: [game.contract.json](game.contract.json). `fall_enabled` là `false`: đảo có rào vô hình ở bán kính 30 m nên không thể rơi. Giả định cho chỗ mơ hồ: [docs/notes/assumptions.md](docs/notes/assumptions.md). Bằng chứng: [docs/proof/](docs/proof/).

## Cấu trúc
- `src/core/`: logic game thuần, tất định, dùng chung cho bản chơi và headless
- `src/headless/`: CLI theo Test Contract
- `src/web/`: hiển thị Three.js
- `tests/`: test (`node:test`)
- `docs/notes/`: giả định, nhật ký AI, retro · `docs/proof/`: bằng chứng
- `AGENTS.md` / `CLAUDE.md`: harness cho AI agent

## Sáng tạo của tôi
_(cập nhật dần)_
