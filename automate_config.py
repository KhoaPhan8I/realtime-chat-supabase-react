import asyncio
import os
import shutil
import sys
from playwright.async_api import async_playwright

COCCOC_BIN = "/usr/bin/coccoc-browser"
COCCOC_PROFILE_ORIGINAL = "/home/khoaphan/.config/coccoc-browser"
COCCOC_PROFILE_TEMP = "/tmp/coccoc_temp"

def prepare_temp_profile():
    print("\n[Hệ thống] Đang chuẩn bị môi trường mô phỏng Cốc Cốc...")
    os.makedirs(os.path.join(COCCOC_PROFILE_TEMP, "Default"), exist_ok=True)

    # Files to copy for maintaining active sessions
    files_to_copy = ["Cookies", "Login Data", "Local State", "Preferences"]
    for f in files_to_copy:
        src = os.path.join(COCCOC_PROFILE_ORIGINAL, "Default", f) if f != "Local State" else os.path.join(COCCOC_PROFILE_ORIGINAL, f)
        dst = os.path.join(COCCOC_PROFILE_TEMP, "Default", f) if f != "Local State" else os.path.join(COCCOC_PROFILE_TEMP, f)

        if os.path.exists(src):
            try:
                shutil.copy2(src, dst)
            except Exception as e:
                print(f"   - Bỏ qua file {f}: {e}")

async def run():
    print("="*60)
    print(" BẮT ĐẦU CHƯƠNG TRÌNH TỰ ĐỘNG HÓA CẤU HÌNH SUPABASE & VERCEL ")
    print("="*60)
    print("\nĐã thiết lập: Kế thừa tất cả phiên đăng nhập từ trình duyệt Cốc Cốc của bạn.")
    print("Bạn KHÔNG CẦN đóng cửa sổ Cốc Cốc đang mở.")

    prepare_temp_profile()

    async with async_playwright() as p:
        # Launch Cốc Cốc with temporary user profile (cloned active session)
        context = await p.chromium.launch_persistent_context(
            user_data_dir=COCCOC_PROFILE_TEMP,
            executable_path=COCCOC_BIN,
            headless=False,
            args=["--no-sandbox", "--disable-setuid-sandbox"],
            viewport={"width": 1280, "height": 800}
        )

        page = await context.new_page()

        # Step 1: Open Supabase Project selection or settings
        print("\n[Bước 1] Đang mở Supabase Dashboard (đã đăng nhập sẵn)...")
        await page.goto("https://supabase.com/dashboard/projects")
        await page.wait_for_timeout(3000)

        input("\n--> Click chọn Project của bạn trên trình duyệt. Sau đó nhấn Enter tại đây...")

        # Let's guide the user to the API settings page automatically
        print("\n[Bước 2] Đang chuyển đến trang Settings API...")
        current_url = page.url
        # Supabase project URLs look like: https://supabase.com/dashboard/project/abcde/editor/...
        if "/project/" in current_url:
            project_id = current_url.split("/project/")[1].split("/")[0]
            api_settings_url = f"https://supabase.com/dashboard/project/{project_id}/settings/api"
            await page.goto(api_settings_url)
            await page.wait_for_timeout(3000)
        else:
            print("Không phát hiện được Project ID tự động. Hãy tự chuyển sang mục Settings -> API trên trình duyệt của bạn.")
            input("Sau khi đã ở mục Settings -> API, nhấn Enter tại đây...")

        # Extract Project URL
        print("\n[Bước 3] Đang quét lấy thông tin khóa kết nối...")
        try:
            # The Project URL input usually has a placeholder or label
            url_element = await page.wait_for_selector("input[readonly][value*='supabase.co']", timeout=10000)
            supabase_url = await url_element.get_attribute("value")
        except Exception:
            # Fallback prompt if we couldn't select
            print("Không thể tự động đọc URL. Hãy copy 'Project URL' từ màn hình Supabase:")
            supabase_url = input("Dán Project URL ở đây: ").strip()

        # Extract Anon Public Key
        try:
            # The anon key is usually a textarea/input with value starting with eyJ...
            key_element = await page.wait_for_selector("input[readonly][value^='eyJ']", timeout=10000)
            supabase_key = await key_element.get_attribute("value")
        except Exception:
            print("Không thể tự động đọc Anon Key. Hãy copy 'anon public' key từ màn hình Supabase:")
            supabase_key = input("Dán Anon Key ở đây: ").strip()

        print(f"\n=> Đã lấy thông tin thành công:")
        print(f"   - URL: {supabase_url[:30]}...")
        print(f"   - KEY: {supabase_key[:30]}...")

        # Step 4: Go to Vercel Environment variables settings page
        print("\n[Bước 4] Đang mở trang cấu hình Vercel...")
        await page.goto("https://vercel.com/khoaphan8is-projects/realtime-chat-supabase-react/settings/environment-variables")

        print("\nVui lòng đăng nhập vào Vercel (nếu được yêu cầu) — nhưng thường đã đăng nhập sẵn.")
        await page.wait_for_timeout(3000)

        async def add_vercel_env(name, value):
            print(f"\nĐang tự động điền {name}...")
            try:
                await page.fill("input[placeholder='Name']", name)
                await page.fill("textarea[placeholder='Value'], input[placeholder='Value']", value)
                add_button = await page.wait_for_selector("button:has-text('Add'), button:has-text('Save')", timeout=5000)
                await add_button.click()
                await page.wait_for_timeout(2000)
                print(f"   - Đã thêm {name} thành công.")
            except Exception as e:
                print(f"   - Không thể tự động điền {name}. Lỗi: {e}")
                print(f"   => Vui lòng tự thêm {name} bằng tay trên màn hình trình duyệt.")

        await add_vercel_env("VITE_SUPABASE_URL", supabase_url)
        await add_vercel_env("VITE_SUPABASE_KEY", supabase_key)
        await add_vercel_env("VITE_EVENT_ID", "wedding-demo")
        await add_vercel_env("VITE_MEDIA_BUCKET", "event-media")

        # Step 7: Trigger Redeployment
        print("\n[Bước 7] Đang chuyển đến trang Deployments để Redeploy...")
        await page.goto("https://vercel.com/khoaphan8is-projects/realtime-chat-supabase-react/deployments")
        await page.wait_for_timeout(3000)

        print("\n="*60)
        print(" HOÀN THÀNH CẤU HÌNH TỰ ĐỘNG ")
        print("="*60)
        print("\nBạn hãy click vào nút 3 chấm (...) bên cạnh bản deploy mới nhất trên Vercel và chọn 'Redeploy' để áp dụng.")
        input("\nNhấn Enter để kết thúc chương trình tự động và đóng trình duyệt...")

        await context.close()

if __name__ == "__main__":
    asyncio.run(run())
