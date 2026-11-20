# Kiểm thử trên Linux (Docker, Node 20)

Mục đích: contract yêu cầu chạy được trên macOS/Linux, nhưng máy phát triển là Windows. Image `node:20.18.1-bookworm-slim`.

```text
$ docker build -t dao-den-long .
$ docker run --rm dao-den-long sh -c '...'
Linux 6.18.33.2-microsoft-standard-WSL2
v20.18.1
# tests 30
# pass 30
# fail 0
810c92d2e28c8f9a   (night 2, seed 1, 3600 ticks, lần 1)
810c92d2e28c8f9a   (lần 2: giống hệt)
{"type":"end","ticks":3600,"state":"playing","score":0}
```

**Lỗi tìm ra nhờ bước này:** `npm test` dùng `node --test "tests/**/*.test.js"`. Node 20 không hỗ trợ glob ở đây (`Could not find '/app/tests/**/*.test.js'`), dù README ghi yêu cầu Node ≥ 20. Đã sửa bằng `scripts/run-tests.mjs` (tự liệt kê file test), chạy được cả trên Node 20 lẫn Node 24. Headless CLI không bị ảnh hưởng.
