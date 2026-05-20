import asyncio
import os
import sys
from playwright.async_api import async_playwright

COCCOC_BIN = "/usr/bin/coccoc-browser"
COCCOC_PROFILE = "/home/khoaphan/.config/coccoc-browser"

SUPABASE_URL = "https://pvuyoidmaiqloiumywoq.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB2dXlvaWRtYWlxbG9pdW15d29xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0MTgzNDcsImV4cCI6MjA4Nzk5NDM0N30.r2ZWwsz1zq0FB3KBrqIgPRvIz6TiDn6qt5XvPFiMZ1M"

async def run():
    print("="*60)
    print(" TIẾN HÀNH TỰ ĐỘNG CẤU HÌNH BIẾN MÔI TRƯỜNG VÀ REDEPLOY VERCEL ")
    print("="*60)
    print("\n[Bước 1] Đang kill tất cả tiến trình Cốc Cốc để giải phóng profile...")
    os.system("pkill -f coccoc")
    os.system("pkill -f /opt/coccoc")
    await asyncio.sleep(2)

    async with async_playwright() as p:
        print("\n[Bước 2] Đang khởi chạy Cốc Cốc bằng Profile cá nhân của bạn...")
        context = await p.chromium.launch_persistent_context(
            user_data_dir=COCCOC_PROFILE,
            executable_path=COCCOC_BIN,
            headless=False,
            args=["--no-sandbox", "--disable-setuid-sandbox"],
            viewport={"width": 1280, "height": 800}
        )
        page = await context.new_page()

        # Step 3: Open Vercel Settings
        print("\n[Bước 3] Đang mở trang cấu hình Vercel...")
        await page.goto("https://vercel.com/khoaphan8is-projects/realtime-chat-supabase-react/settings/environment-variables")
        await page.wait_for_timeout(6000)

        # Check if we need to log in
        if "login" in page.url or "signup" in page.url:
            print("\n[⚠️ Yêu cầu] Bạn chưa đăng nhập Vercel. Vui lòng đăng nhập trên cửa sổ trình duyệt Cốc Cốc vừa xuất hiện.")
            for i in range(120):
                if "settings/environment-variables" in page.url:
                    print("=> Đã phát hiện đăng nhập thành công!")
                    await page.wait_for_timeout(3000)
                    break
                print(f"   - Đang đợi bạn đăng nhập Vercel... ({120-i}s)")
                await asyncio.sleep(1)

        # Add VITE_SUPABASE_URL
        print("\n[Bước 4] Đang tự động điền VITE_SUPABASE_URL...")
        try:
            await page.fill("input[placeholder='Name']", "VITE_SUPABASE_URL")
            await page.fill("textarea[placeholder='Value'], input[placeholder='Value']", SUPABASE_URL)
            add_button = await page.wait_for_selector("button:has-text('Add'), button:has-text('Save')", timeout=8000)
            await add_button.click()
            await page.wait_for_timeout(4000)
            print("   - Đã thêm VITE_SUPABASE_URL thành công.")
        except Exception as e:
            print(f"   - Lỗi hoặc biến đã tồn tại: {e}")

        # Add VITE_SUPABASE_KEY
        print("\n[Bước 5] Đang tự động điền VITE_SUPABASE_KEY...")
        try:
            await page.fill("input[placeholder='Name']", "VITE_SUPABASE_KEY")
            await page.fill("textarea[placeholder='Value'], input[placeholder='Value']", SUPABASE_KEY)
            add_button = await page.wait_for_selector("button:has-text('Add'), button:has-text('Save')", timeout=8000)
            await add_button.click()
            await page.wait_for_timeout(4000)
            print("   - Đã thêm VITE_SUPABASE_KEY thành công.")
        except Exception as e:
            print(f"   - Lỗi hoặc biến đã tồn tại: {e}")

        # Step 6: Redeploy
        print("\n[Bước 6] Đang chuyển đến danh sách Deployments...")
        await page.goto("https://vercel.com/khoaphan8is-projects/realtime-chat-supabase-react/deployments")
        await page.wait_for_timeout(6000)

        print("\n[Bước 7] Tiến hành Redeploy phiên bản mới nhất...")
        try:
            # Click more actions menu button
            menu_btn = await page.wait_for_selector("button[aria-label='More Actions'], button[data-testid='deployment-menu']", timeout=12000)
            await menu_btn.click()
            await page.wait_for_timeout(1500)

            # Click Redeploy option
            redeploy_opt = await page.wait_for_selector("text=Redeploy", timeout=6000)
            await redeploy_opt.click()
            await page.wait_for_timeout(2000)

            # Confirm Redeploy in dialog
            confirm_btn = await page.wait_for_selector("button:has-text('Redeploy')", timeout=6000)
            await confirm_btn.click()
            await page.wait_for_timeout(6000)
            print("   => ĐÃ TRIGGER REDEPLOY THÀNH CÔNG! 🎉")
        except Exception as e:
            print(f"   - Không thể tự động kích hoạt nút Redeploy: {e}")
            print("   => Hãy tự click nút 'Redeploy' trên màn hình Cốc Cốc đang hiển thị.")

        print("\nHoàn tất! Đang đóng trình duyệt tự động...")
        await context.close()

if __name__ == "__main__":
    asyncio.run(run())
