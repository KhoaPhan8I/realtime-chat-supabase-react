import asyncio
import os
import sys
from playwright.async_api import async_playwright

COCCOC_BIN = "/usr/bin/coccoc-browser"
COCCOC_PROFILE = "/home/khoaphan/.config/coccoc-browser"

SQL_QUERY = """
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';
"""

async def run():
    print("="*60)
    print(" TIẾN HÀNH TỰ ĐỘNG TẮT RLS TRỰC TIẾP TRÊN PROFILE THẬT ")
    print("="*60)

    async with async_playwright() as p:
        print("\n[Bước 1] Khởi chạy Cốc Cốc bằng Profile gốc của bạn...")
        # Launching with the actual profile directly (since user closed active Cốc Cốc)
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
                # Wait until user logs in
                while "login" in page.url:
                    await asyncio.sleep(1)
                print("=> Đăng nhập thành công! Đang chuyển tiếp...")
                await page.goto("https://supabase.com/dashboard/project/pvuyoidmaiqloiumywoq/sql/new")
                await page.wait_for_timeout(6000)
                break

            # Check if Monaco Editor input is visible
            try:
                el = await page.query_selector("textarea.inputarea")
                if el:
                    print("=> Đã tìm thấy SQL Editor!")
                    break
            except Exception:
                pass

            await asyncio.sleep(1)

        # Take a screenshot for debugging
        await page.screenshot(path="/home/khoaphan/9router-projects/claude-9router/chat-app/supabase_step1.png")

        print("\n[Bước 3] Đang tiến hành dán câu lệnh SQL...")
        try:
            # We focus on the text area of Monaco Editor
            editor = await page.wait_for_selector("textarea.inputarea", timeout=20000)
            await editor.focus()

            # Select all and delete
            await page.keyboard.press("Control+A")
            await page.keyboard.press("Delete")
            await page.wait_for_timeout(500)

            # Paste our query
            await editor.fill(SQL_QUERY)
            await page.wait_for_timeout(1000)
            print("   - Đã điền câu lệnh: " + SQL_QUERY)
        except Exception as e:
            print(f"   - Lỗi điền Monaco editor: {e}. Đang thử click thủ công bằng tọa độ...")
            # Fallback: Click in the center of the editor and type
            try:
                await page.click("div.monaco-editor")
                await page.keyboard.press("Control+A")
                await page.keyboard.press("Delete")
                await page.keyboard.type(SQL_QUERY)
                print("   - Đã nhập câu lệnh bằng mô phỏng bàn phím.")
            except Exception as ex:
                print(f"   - Không thể nhập liệu: {ex}")
                await page.screenshot(path="/home/khoaphan/9router-projects/claude-9router/chat-app/supabase_error_typing.png")
                sys.exit(1)

        # Take screenshot after typing
        await page.screenshot(path="/home/khoaphan/9router-projects/claude-9router/chat-app/supabase_step2.png")

        print("\n[Bước 4] Đang chạy câu lệnh (Run)...")
        try:
            # Click RUN button
            run_btn = await page.wait_for_selector("button:has-text('Run'), button[title*='Run query'], button[aria-label*='Run query']", timeout=10000)
            await run_btn.click()
            print("   - Đã click nút Run.")
            await page.wait_for_timeout(5000)
        except Exception as e:
            print(f"   - Không tìm thấy nút Run: {e}. Thử nhấn phím tắt Ctrl + Enter...")
            await page.keyboard.press("Control+Enter")
            await page.wait_for_timeout(5000)

        # Print results text
        try:
            print("\n[Kết quả từ UI]")
            results = await page.query_selector_all("div.grid-canvas, div.slick-cell, table, [role='gridcell']")
            for r in results[:20]:
                text = await r.inner_text()
                if text.strip():
                    print(f"   - {text.strip()}")

            # Print general status text
            status_bar = await page.query_selector("div:has-text('Success'), div:has-text('Error'), div:has-text('rows')")
            if status_bar:
                print(f"   - Status: {await status_bar.inner_text()}")
        except Exception as e:
            print(f"   - Không thể đọc kết quả: {e}")

        await page.screenshot(path="/home/khoaphan/9router-projects/claude-9router/chat-app/supabase_result.png")
        print("\n=> Quá trình tự động thực thi hoàn tất! Đang kiểm tra kết quả qua API...")

        await context.close()

if __name__ == "__main__":
    asyncio.run(run())
