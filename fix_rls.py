import asyncio
import os
import shutil
import sys
from playwright.async_api import async_playwright

COCCOC_BIN = "/usr/bin/coccoc-browser"
COCCOC_PROFILE_ORIGINAL = "/home/khoaphan/.config/coccoc-browser"
COCCOC_PROFILE_TEMP = "/tmp/coccoc_temp"

SQL_QUERY = "ALTER TABLE messages DISABLE ROW LEVEL SECURITY;"

def prepare_temp_profile():
    print("\n[Hệ thống] Đang chuẩn bị môi trường mô phỏng Cốc Cốc...")
    os.makedirs(os.path.join(COCCOC_PROFILE_TEMP, "Default"), exist_ok=True)

    files_to_copy = ["Cookies", "Login Data", "Local State", "Preferences"]
    for f in files_to_copy:
        src = os.path.join(COCCOC_PROFILE_ORIGINAL, "Default", f) if f != "Local State" else os.path.join(COCCOC_PROFILE_ORIGINAL, f)
        dst = os.path.join(COCCOC_PROFILE_TEMP, "Default", f) if f != "Local State" else os.path.join(COCCOC_PROFILE_TEMP, f)

        if os.path.exists(src):
            try:
                shutil.copy2(src, dst)
            except Exception as e:
                pass

async def run():
    print("="*60)
    print(" TIẾN HÀNH TỰ ĐỘNG TẮT RLS TRÊN SUPABASE ĐỂ FIX LỖI SEND MESSAGE ")
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

        # Step 2: Open Supabase SQL Editor directly
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

        # Step 3: Write and Run SQL Query
        print("\n[Bước 3] Đang tiến hành dán câu lệnh SQL tắt RLS...")
        try:
            editor_textarea = await page.wait_for_selector("textarea.inputarea", timeout=25000)
            await editor_textarea.focus()

            await page.keyboard.press("Control+A")
            await page.keyboard.press("Delete")
            await page.wait_for_timeout(500)

            await editor_textarea.fill(SQL_QUERY)
            await page.wait_for_timeout(1000)
            print("   - Đã nhập câu lệnh SQL: " + SQL_QUERY)
        except Exception as e:
            print(f"   - Lỗi nhập liệu tự động: {e}. Thử fallback type...")
            try:
                await page.click("div.monaco-editor")
                await page.keyboard.press("Control+A")
                await page.keyboard.press("Delete")
                await page.keyboard.type(SQL_QUERY)
                print("   - Đã gõ lệnh bằng keyboard type.")
            except Exception as ex:
                print(f"   - Fallback thất bại: {ex}")

        # Step 4: Click RUN button
        print("\n[Bước 4] Đang kích hoạt nút RUN để thực thi...")
        try:
            # First try Control+Enter
            print("   - Đang nhấn Control + Enter...")
            await page.keyboard.press("Control+Enter")
            await page.wait_for_timeout(6000)
            print("   - Đã gửi Control+Enter. Đang kiểm tra nút bấm...")

            run_btn = await page.wait_for_selector("button:has-text('Run'), button[title*='Run query'], button[aria-label*='Run query']", timeout=5000)
            await run_btn.click()
            print("   - Đã click nút Run trên giao diện.")
            await page.wait_for_timeout(5000)
        except Exception as e:
            print(f"   - Không thể click nút hoặc gửi phím tắt: {e}")

        # Save screenshot
        await page.screenshot(path="/home/khoaphan/9router-projects/claude-9router/chat-app/rls_disable_result.png")
        print("\n=> Quá trình tự động thực thi hoàn tất!")
        await asyncio.sleep(3)
        await context.close()

if __name__ == "__main__":
    asyncio.run(run())
