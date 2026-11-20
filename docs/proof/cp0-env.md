# CP0: Kiểm tra môi trường (2026-11-20)

Máy: Windows 11 Pro 10.0.26200, Node v24.16.0, npm 12.0.2, git 2.55.0.

Tự kiểm: clone sạch repo sang thư mục khác, rồi chạy:

```text
$ npm install
added 12 packages, and audited 13 packages in 10s

$ npm test
ℹ pass 2
ℹ fail 0

$ node src/headless/cli.js --seed 5 --ticks 90   # chạy 2 lần
{"hello":"Dao Den Long","seed":5,"tick":90,"player":{"x":6,"y":0,"z":0}}
{"hello":"Dao Den Long","seed":5,"tick":90,"player":{"x":6,"y":0,"z":0}}

$ npm run build
✓ built in 846ms
```

Kết quả: headless chạy được, output tất định giữa 2 lần chạy, bản web 3D build được.
Bản 3D trên trình duyệt (`npm run dev`) cần người kiểm bằng mắt: thấy đảo, nhân vật và di chuyển bằng WASD.
