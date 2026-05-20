import asyncio
import os
from playwright.async_api import async_playwright

CHROME_BIN = "/usr/bin/google-chrome"
CHROME_PROFILE_TEMP = "/tmp/chrome_supabase_temp"
SQL_PATH = os.path.join(os.path.dirname(__file__), "supabase", "migrations", "20240000000000_event_media_platform.sql")
PROJECT_ID = "pvuyoidmaiqloiumywoq"

with open(SQL_PATH, "r", encoding="utf-8") as f:
    SQL_QUERY = f.read()

async def run():
    print("=" * 60)
    print(" KHỞI TẠO EVENT MEDIA DATABASE TRÊN SUPABASE BẰNG CHROME ")
    print("=" * 60)
    os.makedirs(CHROME_PROFILE_TEMP, exist_ok=True)

    async with async_playwright() as p:
        context = await p.chromium.launch_persistent_context(
            user_data_dir=CHROME_PROFILE_TEMP,
            executable_path=CHROME_BIN,
            headless=False,
            args=["--no-sandbox", "--disable-setuid-sandbox"],
            viewport={"width": 1280, "height": 800},
        )
        page = context.pages[0] if context.pages else await context.new_page()
        await page.goto(f"https://supabase.com/dashboard/project/{PROJECT_ID}/sql/new")
        await page.wait_for_timeout(5000)

        if "login" in page.url or "sign-in" in page.url or "oauth" in page.url:
            print("Hãy login Supabase/GitHub trong cửa sổ Chrome vừa mở.")
            print("Script sẽ tự chờ tối đa 5 phút tới khi vào SQL Editor.")
            for _ in range(300):
                if f"/project/{PROJECT_ID}/sql" in page.url:
                    break
                await page.wait_for_timeout(1000)
            await page.goto(f"https://supabase.com/dashboard/project/{PROJECT_ID}/sql/new")
            await page.wait_for_timeout(5000)

        print("Đang dán SQL...")
        try:
            editor = await page.wait_for_selector("textarea.inputarea", timeout=20000)
            await editor.focus()
            await page.keyboard.press("Control+A")
            await page.keyboard.press("Delete")
            await editor.fill(SQL_QUERY)
        except Exception as e:
            print(f"Không tự dán được SQL: {e}")
            print(SQL_QUERY)
            await page.wait_for_timeout(120000)

        print("Đang chạy SQL...")
        try:
            run_btn = await page.wait_for_selector("button:has-text('Run'), button[title='Run query (Ctrl + Enter)'], button[aria-label='Run query']", timeout=15000)
            await run_btn.click()
            await page.wait_for_timeout(8000)
            print("Đã click Run. Kiểm tra Supabase nếu có lỗi hiển thị.")
        except Exception as e:
            print(f"Không tự click Run được: {e}")
            print("Hãy tự click Run trong Chrome. Script giữ cửa sổ 2 phút.")
            await page.wait_for_timeout(120000)

        print("Giữ cửa sổ 20 giây để bạn xem kết quả.")
        await page.wait_for_timeout(20000)
        await context.close()

if __name__ == "__main__":
    asyncio.run(run())
