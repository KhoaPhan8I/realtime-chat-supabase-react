import asyncio
import os
from playwright.async_api import async_playwright

COCCOC_BIN = "/usr/bin/coccoc-browser"
COCCOC_PROFILE_ORIGINAL = "/home/khoaphan/.config/coccoc-browser"

SQL_QUERY = """
alter table public.event_photos add column if not exists caption text check (char_length(caption) <= 120);
"""

async def run():
    print("="*60)
    print(" TIẾN HÀNH THÊM CỘT CAPTION CHO EVENT_PHOTOS TRÊN SUPABASE ")
    print("="*60)

    print("\n[Bước 0] Đang đóng Cốc Cốc cũ nếu có...")
    os.system("pkill -f coccoc")
    os.system("pkill -f /usr/bin/coccoc")
    await asyncio.sleep(2)

    async with async_playwright() as p:
        print("\n[Bước 1] Đang khởi chạy Cốc Cốc với Profile gốc...")
        context = await p.chromium.launch_persistent_context(
            user_data_dir=COCCOC_PROFILE_ORIGINAL,
            executable_path=COCCOC_BIN,
            headless=False,
            args=["--no-sandbox", "--disable-setuid-sandbox"],
            viewport={"width": 1280, "height": 800}
        )

        page = await context.new_page()

        print("\n[Bước 2] Đang mở SQL Editor trên Supabase...")
        await page.goto("https://supabase.com/dashboard/project/pvuyoidmaiqloiumywoq/sql/new")
        await page.wait_for_timeout(8000)

        # Check if login is required
        if "login" in page.url:
            print("\n[⚠️ Yêu cầu] Hãy đăng nhập tài khoản Supabase trên màn hình Cốc Cốc.")
            for i in range(120):
                if "sql/new" in page.url or "dashboard/project" in page.url:
                    print("=> Đã phát hiện đăng nhập thành công!")
                    if "sql/new" not in page.url:
                        await page.goto("https://supabase.com/dashboard/project/pvuyoidmaiqloiumywoq/sql/new")
                    await page.wait_for_timeout(6000)
                    break
                print(f"   - Đang đợi đăng nhập... ({120-i}s)")
                await asyncio.sleep(1)

        print("\n[Bước 3] Đang tiến hành dán câu lệnh SQL nâng cấp...")
        try:
            editor_textarea = await page.wait_for_selector("textarea.inputarea", timeout=25000)
            await editor_textarea.focus()

            await page.keyboard.press("Control+A")
            await page.keyboard.press("Delete")
            await page.wait_for_timeout(500)

            await editor_textarea.fill(SQL_QUERY)
            await page.wait_for_timeout(1000)
            print("   - Đã nhập câu lệnh SQL.")
        except Exception as e:
            print(f"   - Lỗi nhập liệu tự động: {e}. Thử gõ thủ công...")
            try:
                await page.click("div.monaco-editor")
                await page.keyboard.press("Control+A")
                await page.keyboard.press("Delete")
                await page.keyboard.type(SQL_QUERY)
                print("   - Đã gõ lệnh.")
            except Exception as ex:
                print(f"   - Fallback thất bại: {ex}")

        print("\n[Bước 4] Đang thực thi...")
        try:
            await page.keyboard.press("Control+Enter")
            await page.wait_for_timeout(6000)
            print("   - Đã gửi lệnh Run.")
        except Exception as e:
            print(f"   - Lỗi thực thi: {e}")

        # Save screenshot to confirm
        await page.screenshot(path="/home/khoaphan/9router-projects/claude-9router/chat-app/supabase_caption_result.png")
        print("\n=> Quá trình tự động thực thi hoàn tất!")
        await asyncio.sleep(2)
        await context.close()

if __name__ == "__main__":
    asyncio.run(run())
