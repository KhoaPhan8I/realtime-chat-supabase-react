import asyncio
import os
import shutil
import sys
from playwright.async_api import async_playwright

COCCOC_BIN = "/usr/bin/coccoc-browser"
COCCOC_PROFILE_ORIGINAL = "/home/khoaphan/.config/coccoc-browser"
COCCOC_PROFILE_TEMP = "/tmp/coccoc_temp"

SQL_PATH = os.path.join(os.path.dirname(__file__), "supabase", "migrations", "20240000000000_event_media_platform.sql")
with open(SQL_PATH, "r", encoding="utf-8") as f:
    SQL_QUERY = f.read()

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
    print(" BẮT ĐẦU TỰ ĐỘNG KHỞI TẠO EVENT MEDIA DATABASE TRÊN SUPABASE ")
    print("="*60)

    prepare_temp_profile()

    async with async_playwright() as p:
        print("\n[Bước 1] Đang khởi chạy Cốc Cốc...")
        context = await p.chromium.launch_persistent_context(
            user_data_dir=COCCOC_PROFILE_TEMP,
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
        print("\n[Bước 3] Đang tiến hành dán câu lệnh SQL...")
        try:
            # We want to wait for the monaco-editor or the query input textarea
            # Usually Monaco editor uses a textarea with class 'inputarea' or roles
            editor_textarea = await page.wait_for_selector("textarea.inputarea", timeout=15000)
            await editor_textarea.focus()

            # Select all existing text and delete it
            await page.keyboard.press("Control+A")
            await page.keyboard.press("Delete")
            await page.wait_for_timeout(500)

            # Fill the query
            await editor_textarea.fill(SQL_QUERY)
            await page.wait_for_timeout(1000)
            print("   - Đã nhập SQL khởi tạo events/event_photos/storage/realtime.")
        except Exception as e:
            print(f"   - Lỗi nhập liệu tự động: {e}")
            print("   => Hãy copy đoạn SQL sau dán vào màn hình nếu bị lỗi:\n", SQL_QUERY)

        # Step 4: Click RUN button
        print("\n[Bước 4] Đang kích hoạt nút RUN để thực thi SQL...")
        try:
            # Click the RUN button. It usually contains the text "Run" or acts as a button with aria-label/testids
            run_btn = await page.wait_for_selector("button:has-text('Run'), button[title='Run query (Ctrl + Enter)'], button[aria-label='Run query']", timeout=10000)
            await run_btn.click()
            print("   - Đã kích hoạt lệnh Run query.")
            await page.wait_for_timeout(5000)
            print("   => KHỞI TẠO EVENT MEDIA DB/STORAGE/REALTIME HOÀN TẤT! 🎉")
        except Exception as e:
            print(f"   - Lỗi kích hoạt Run query: {e}")
            print("   => Vui lòng tự nhấn nút 'Run' (màu xanh lá) trên giao diện Cốc Cốc.")

        print("\nHoàn tất tự động hóa!")
        await asyncio.sleep(3)
        await context.close()

if __name__ == "__main__":
    asyncio.run(run())
