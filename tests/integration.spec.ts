import { test, expect } from '@playwright/test';

test.describe('Final Integration Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Go to home page
        await page.goto('http://localhost:5173/bear-kitchen/');
    });

    test('Verification: AI OCR Scan Flow', async ({ page }) => {
        await page.goto('http://localhost:5173/bear-kitchen/new');

        const imagePath = 'C:/Users/rogoz/.gemini/antigravity/brain/7797f51a-5973-4278-afb3-23cf4347ebb5/test_recipe_image_1769961148058.png';

        console.log('Uploading image...');
        await page.setInputFiles('input[id="image-upload"]', imagePath);

        console.log('Waiting for image preview...');
        await expect(page.locator('img[src^="blob:"]')).toBeVisible({ timeout: 15000 });

        console.log('Clicking OCR Scan button...');
        const scanBtn = page.getByText('Simple OCR Scan (with Tesseract)');
        await expect(scanBtn).toBeEnabled();

        // Setup dialog listener before click
        const dialogPromise = page.waitForEvent('dialog');
        await scanBtn.click();

        console.log('Waiting for OCR Complete dialog...');
        const dialog = await dialogPromise;
        expect(dialog.message()).toContain('OCR Complete!');
        await dialog.accept();

        console.log('Waiting for content in textarea...');
        const textarea = page.locator('textarea');
        await expect(textarea).not.toHaveValue('', { timeout: 60000 });

        const content = await textarea.inputValue();
        console.log('Success! OCR Result length:', content.length);
    });

    test('Verification: Google Drive Sync Panel', async ({ page }) => {
        // Click the Sync button in Nav
        console.log('Clicking Sync button in Nav...');
        const syncNavBtn = page.locator('button[title="Sync with Google"]');
        await expect(syncNavBtn).toBeVisible();
        await syncNavBtn.click();

        // Check if SyncPanel is visible
        console.log('Checking for SyncPanel title...');
        await expect(page.getByText('Cloud & Sync')).toBeVisible();

        // Depending on whether it's the first time, we might see "Save Settings & Connect" or "Sync Now"
        const connectBtn = page.getByRole('button', { name: /Save Settings & Connect|Sync Now/i });
        console.log('Checking for Connect/Sync button...');
        await expect(connectBtn).toBeVisible();

        console.log('Sync Panel verified!');
    });
});
