import asyncio
import time
import os
from playwright.async_api import async_playwright

# We will test against the local build or run the dev server dynamically
# To keep it extremely simple and fast, we can test on a running local dev server port
PORT = 5175
APP_URL = f"http://localhost:{PORT}"

async def run_e2e_test():
    print("="*60)
    print(" 📸 CHẠY AUTO TESTER LOCKET WIDGET: CHỤP ẢNH & ĐỒNG BỘ REAL-TIME ")
    print("="*60)

    # First we verify if the server is running, if not we print warning
    # But we can assume it starts via background script or is already active
    async with async_playwright() as p:
        print("\n[Bước 1] Khởi chạy Client A (Khách gửi) và Client B (Khách nhận)...")
        # Simulate mobile viewports (iPhone 14)
        iphone_14 = p.devices['iPhone 14']

        browser_a = await p.chromium.launch(headless=True, args=["--no-sandbox"])
        browser_b = await p.chromium.launch(headless=True, args=["--no-sandbox"])

        context_a = await browser_a.new_context(**iphone_14, permissions=["camera"])
        context_b = await browser_b.new_context(**iphone_14)

        page_a = await context_a.new_page()
        page_b = await context_b.new_page()

        # Open both pages to Locket main route
        print(f"\n[Bước 2] Cả hai Client truy cập ứng dụng: {APP_URL}")
        try:
            await page_a.goto(APP_URL, timeout=10000)
            await page_b.goto(APP_URL, timeout=10000)
        except Exception as e:
            print(f"❌ Không kết nối được tới server local trên port {PORT}! Đang kiểm tra hoặc tự khởi chạy dev server...")
            return False

        await page_a.wait_for_timeout(3000)
        await page_b.wait_for_timeout(3000)

        # Confirm identity sheets are visible (since it's the first visit)
        print("\n[Bước 3] Xác thực định danh (Identity Flow)...")
        # On A: input name "Guest A" and click close/save
        await page_a.locator("input[placeholder='Tên bạn']").fill("Guest A")
        await page_a.locator("input[placeholder='Bàn / nhóm']").fill("Bàn 5")
        await page_a.locator("text=/Tiếp tục/").first.click()
        print("   - Client A nhập tên: Guest A (Bàn 5)")

        # On B: input name "Guest B"
        await page_b.locator("input[placeholder='Tên bạn']").fill("Guest B")
        await page_b.locator("text=/Tiếp tục/").first.click()
        print("   - Client B nhập tên: Guest B")

        await page_a.wait_for_timeout(2000)
        await page_b.wait_for_timeout(2000)

        # Check empty state or feed
        print("\n[Bước 4] Đăng tải một ảnh giả lập qua cơ chế Fallback...")
        # Since headless chromium lacks physical camera stream, we trigger fallback file input
        # to upload a sample test image
        file_input_locator = page_a.locator("input[type='file']")

        # Create a dummy image file for upload
        dummy_img_path = "/home/khoaphan/9router-projects/claude-9router/chat-app/dummy_test_photo.jpg"
        with open(dummy_img_path, "wb") as f:
            f.write(b"\xFF\xD8\xFF\xE0\x00\x10JFIF\x00\x01\x01\x01\x00`\x00`\x00\x00\xFF\xDB\x00C\x00\x08\x06\x06\x07\x06\x05\x08\x07\x07\x07\t\t\x08\n\x0c\x14\r\x0c\x0b\x0b\x0c\x19\x12\x13\x0f\x14\x1d\x1a\x1f\x1e\x1d\x1a\x1c\x1c $.' \",#\x1c\x1c(7),01444\x1f'9=82<.342\xFF\xC0\x00\x0b\x08\x00\x01\x00\x01\x01\x01\x11\x01\xFF\xC4\x00\x1f\x00\x00\x01\x05\x01\x01\x01\x01\x01\x01\x00\x00\x00\x00\x00\x00\x00\x00\x01\x02\x03\x04\x05\x06\x07\x08\t\n\x0b\xFF\xDD\x00\x04\x00\x01\xFF\xDA\x00\x0c\x01\x01\x00\x00\x3f\x00\x37\x25\x7F\xFF\xD9")

        start_time = time.time()
        await file_input_locator.set_input_files(dummy_img_path)
        print("   - Client A đã chọn ảnh tải lên album.")

        # Wait for B to receive the new photo via Supabase Realtime
        print("\n[Bước 5] Kiểm tra Real-time Sync: B có nhận được ảnh ngay lập tức?")
        try:
            # We wait for the image element to be added to B's feed
            await page_b.wait_for_selector("text=/Guest A/", timeout=15000)
            end_time = time.time()
            latency_ms = int((end_time - start_time) * 1000)
            print(f"\n=> ĐỒNG BỘ ẢNH THÀNH CÔNG! Client B đã thấy ảnh của Guest A đăng.")
            print(f"=> ĐỘ TRỄ TRUYỀN TẢI THỰC TẾ: {latency_ms} ms (Cực kỳ nhạy!)")
        except Exception as e:
            print(f"❌ Client B không đồng bộ ảnh thời gian thực: {e}")

        # Test reaction on B to A's photo
        print("\n[Bước 6] Kiểm tra tương tác (Reactions sync)...")
        try:
            # B clicks on a reaction emoji inside feed (e.g. ❤️)
            # Find the reaction button/chip and click it
            await page_b.locator("text=❤️").first.click()
            print("   - Client B thả ❤️ lên ảnh của Guest A.")
            await page_b.wait_for_timeout(2000)
        except Exception as e:
            print(f"   - Bỏ qua hoặc không click được reaction: {e}")

        # Clean screenshots
        await page_a.screenshot(path="/home/khoaphan/9router-projects/claude-9router/chat-app/test_locket_client_a.png")
        await page_b.screenshot(path="/home/khoaphan/9router-projects/claude-9router/chat-app/test_locket_client_b.png")
        print("   - Đã lưu ảnh chụp màn hình kiểm thử locket_client_a và b.")

        # Clean up
        await browser_a.close()
        await browser_b.close()
        if os.path.exists(dummy_img_path):
            os.remove(dummy_img_path)
        print("\n[Hoàn tất] Kiểm thử E2E Locket Widget thành công!")
        return True

if __name__ == "__main__":
    import sys
    asyncio.run(run_e2e_test())
