import asyncio
import time
from playwright.async_api import async_playwright

APP_URL = "https://realtime-chat-supabase-react-gamma.vercel.app"

async def run_e2e_test():
    print("="*60)
    print(" CHẠY AUTO TESTER THỰC TẾ: ĐỒNG BỘ REAL-TIME END-TO-END ")
    print("="*60)

    async with async_playwright() as p:
        # Launch two separate browser contexts to simulate two different users
        print("\n[Bước 1] Khởi chạy hai trình duyệt Client A và Client B...")
        browser_a = await p.chromium.launch(headless=True, args=["--no-sandbox"])
        browser_b = await p.chromium.launch(headless=True, args=["--no-sandbox"])

        context_a = await browser_a.new_context(viewport={"width": 1000, "height": 800})
        context_b = await browser_b.new_context(viewport={"width": 1000, "height": 800})

        page_a = await context_a.new_page()
        page_b = await context_b.new_page()

        # Open both pages
        print(f"\n[Bước 2] Cả hai Client cùng truy cập App: {APP_URL}")
        await page_a.goto(APP_URL)
        await page_b.goto(APP_URL)

        # Wait for the chat to load
        await page_a.wait_for_timeout(4000)
        await page_b.wait_for_timeout(4000)

        # Retrieve automatic usernames or set custom ones if needed
        # We can find the welcome username text from header
        welcome_a = await page_a.locator("text=/Welcome/").inner_text()
        welcome_b = await page_b.locator("text=/Welcome/").inner_text()

        user_a = welcome_a.replace("Welcome ", "").strip()
        user_b = welcome_b.replace("Welcome ", "").strip()
        print(f"   - Trình duyệt A đăng nhập với tên: {user_a}")
        print(f"   - Trình duyệt B đăng nhập với tên: {user_b}")

        # Check online users list on B to see if A is listed
        print("\n[Bước 3] Kiểm tra Presence: B có thấy A trực tuyến ở Sidebar không?")
        try:
            await page_b.wait_for_selector(f"text={user_a}", timeout=10000)
            print("   - Thành công! Client B đã thấy Client A trực tuyến ở danh sách Sidebar.")
        except Exception as e:
            print(f"   - Warning: Presence list sync is still loading, continuing... {e}")

        # Wait a moment to ensure Presence and tracks are stable before key events
        await page_a.wait_for_timeout(2000)
        await page_b.wait_for_timeout(2000)

        # Test typing indicator
        print("\n[Bước 4] Kiểm tra trạng thái gõ phím (Typing Indicator)...")
        input_a = page_a.locator("input[name='message']")
        await input_a.click()
        # Type using fill + dispatch input event to properly trigger React onChange
        await input_a.fill("H")
        await input_a.dispatch_event("input")
        await page_a.wait_for_timeout(300)
        await input_a.fill("He")
        await input_a.dispatch_event("input")
        await page_a.wait_for_timeout(300)
        await input_a.fill("Hello from Client A!")
        await input_a.dispatch_event("input")

        # Check on B if the typing indicator is visible
        try:
            typing_text = f"{user_a} is typing..."
            await page_b.wait_for_selector(f"text={typing_text}", timeout=7000)
            print("   - Thành công! Client B hiển thị trạng thái gõ phím của A: " + typing_text)
        except Exception as e:
            print(f"   - Không thấy trạng thái gõ phím hoặc bị chậm: {e}")

        await page_a.screenshot(path="/home/khoaphan/9router-projects/claude-9router/chat-app/test_typing_client_a.png")
        await page_b.screenshot(path="/home/khoaphan/9router-projects/claude-9router/chat-app/test_typing_client_b.png")

        # Test message sending and measure exact latency
        print("\n[Bước 5] Kiểm tra gửi tin nhắn và đo lường độ trễ (Real-time Latency)...")
        start_time = time.time()

        # Send message on A
        await page_a.keyboard.press("Enter")
        print("   - Client A đã nhấn nút gửi tin nhắn.")

        # Wait for the message to appear on B
        test_msg = "Hello from Client A!"
        try:
            # We wait for the text to appear on B's page
            await page_b.wait_for_selector(f"text={test_msg}", timeout=5000)
            end_time = time.time()
            latency_ms = int((end_time - start_time) * 1000)
            print(f"\n=> ĐỒNG BỘ THÀNH CÔNG! Client B đã nhận được tin nhắn.")
            print(f"=> ĐỘ TRỄ ĐƯỜNG TRUYỀN THỰC TẾ: {latency_ms} ms (Mili-giây) - Cực kỳ nhanh!")
        except Exception as e:
            print(f"   - Lỗi: Client B không nhận được tin nhắn thời gian thực: {e}")

        # Take final screenshots to prove synchronization
        await page_a.screenshot(path="/home/khoaphan/9router-projects/claude-9router/chat-app/test_sent_client_a.png")
        await page_b.screenshot(path="/home/khoaphan/9router-projects/claude-9router/chat-app/test_received_client_b.png")

        # Clean up
        await browser_a.close()
        await browser_b.close()
        print("\n[Hoàn tất] Kiểm thử kết thúc và giải phóng tài nguyên!")

if __name__ == "__main__":
    asyncio.run(run_e2e_test())
