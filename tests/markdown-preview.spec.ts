import { test, expect } from '@playwright/test';

test.describe('Markdown Editor Preview', () => {
    test('should render markdown correctly in preview mode', async ({ page }) => {
        // 1. Go to New Recipe Editor
        await page.goto('http://localhost:5173/bear-kitchen/new');

        // 2. Type Markdown in the textarea
        const markdownContent = '# My Tasty Cake\n\n**Ingredients:**\n- Flour\n- Sugar\n\n*Steps:*\n1. Mix\n2. Bake';
        await page.locator('textarea').fill(markdownContent);

        // 3. Switch to Preview Mode
        await page.getByRole('button', { name: 'Preview' }).click();

        // 4. Verify rendered HTML elements & debug
        try {
            await expect(page.locator('.prose h1')).toHaveText('My Tasty Cake', { timeout: 5000 });
            await expect(page.locator('.prose strong')).toHaveText('Ingredients:');
            await expect(page.locator('.prose ul li').first()).toHaveText('Flour');

            // Visual snapshot
            const previewArea = page.locator('.bear-card .prose');
            await expect(previewArea).toBeVisible();
            await expect(previewArea).toHaveScreenshot('markdown-preview.png');
        } catch (e) {
            console.log('Preview HTML:', await page.locator('.bear-card').innerHTML());
            throw e;
        }
    });
});
