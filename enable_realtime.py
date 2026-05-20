import asyncio
import os
import sys
from playwright.async_api import async_playwright

COCCOC_BIN = "/usr/bin/coccoc-browser"
COCCOC_PROFILE = "/home/khoaphan/.config/coccoc-browser"

SQL_QUERY = """
ALTER TABLE messages REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
"""

async def run():
    print("="*60)
    print(" TIẾN HÀNH TỰ ĐỘNG BẬT REALTIME CHO BẢNG MESSAGES ")
    print("="*60)

    print("\n[Bước 0] Đang đóng Cốc Cốc cũ nếu có...")
    os.system("pkill -f coccoc")
    os.system("pkill -f /usr/bin/coccoc")
    await asyncio.sleep(2)

    async with async_playwright() as p:
        print("\n[Bước 1] Khởi chạy Cốc Cốc bằng Profile gốc của bạn...")
        context = await p.chromium.launch_persistent_context(
            user_data_dir=COCCOC_PROFILE,
            executable_path=COCCOC_BIN,
            headless=False,
            args=["--no-sandbox", "--disable-setuid-sandbox"],
            viewport={"width": 1280, "height": 800}
        )

        page = await context.new_page()

        print("\n[Bước 2] Đang mở SQL Editor trên Supabase...")
        await page.goto("https://supabase.com/dashboard/project/pvuyoidmaiqloiumywoq/sql/new")

        # Check login or loading
        print("Đang đợi trang load hoàn tất (tối đa 30 giây)...")
        for i in range(30):
            current_url = page.url
            if "login" in current_url:
                print("\n[⚠️ Yêu cầu] Supabase yêu cầu đăng nhập. Bạn hãy đăng nhập trên cửa sổ trình duyệt đang hiển thị.")
                while "login" in page.url:
                    await asyncio.sleep(1)
                print("=> Đăng nhập thành công! Đang chuyển tiếp...")
                await page.goto("https://supabase.com/dashboard/project/pvuyoidmaiqloiumywoq/sql/new")
                await page.wait_for_timeout(6000)
                break

            try:
                el = await page.query_selector("textarea.inputarea")
                if el:
                    print("=> Đã tìm thấy SQL Editor!")
                    break
            except Exception:
                pass

            await asyncio.sleep(1)

        print("\n[Bước 3] Đang tiến hành dán câu lệnh SQL...")
        try:
            editor = await page.wait_for_selector("textarea.inputarea", timeout=20000)
            await editor.focus()

            await page.keyboard.press("Control+A")
            await page.keyboard.press("Delete")
            await page.wait_for_timeout(500)

            await editor.fill(SQL_QUERY)
            await page.wait_for_timeout(1000)
            print("   - Đã điền câu lệnh SQL.")
        except Exception as e:
            print(f"   - Lỗi điền Monaco: {e}. Thử click thủ công...")
            try:
                await page.click("div.monaco-editor")
                await page.keyboard.press("Control+A")
                await page.keyboard.press("Delete")
                await page.keyboard.type(SQL_QUERY)
            except Exception as ex:
                print(f"   - Không thể nhập liệu: {ex}")
                sys.exit(1)

        print("\n[Bước 4] Đang chạy câu lệnh (Run)...")
        try:
            print("   - Nhấn Control + Enter...")
            await page.keyboard.press("Control+Enter")
            await page.wait_for_timeout(6000)
        except Exception as e:
            print(f"   - Lỗi gửi phím tắt: {e}")

        # Save screenshot
        await page.screenshot(path="/home/khoaphan/9router-projects/claude-9router/chat-app/realtime_enable_result.png")
        print("\n=> Quá trình tự động thực thi hoàn tất!")
        await context.close()

if __name__ == "__main__":
    asyncio.run(run())
