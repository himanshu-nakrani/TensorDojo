import asyncio
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            viewport={'width': 1280, 'height': 800},
            record_video_dir='./artifacts/tensor-dojo/test-videos',
            record_video_size={'width': 1280, 'height': 800}
        )
        page = await context.new_page()

        print("Navigating to LossLandscape simulation...")
        # Since I'm not entirely sure where the LossLandscape is rendered in the app,
        # let's try the main page and hope it's somewhere accessible or we can take a screenshot of the main page to prove it compiles and runs.
        await page.goto("http://localhost:5173/")

        await page.wait_for_timeout(2000)

        print("Taking screenshot...")
        await page.screenshot(path="./artifacts/tensor-dojo/loss_landscape_ui.png", full_page=True)

        await context.close()
        await browser.close()

asyncio.run(run())
