import { test, expect } from '@playwright/test';

test.describe('Recipe Creation and Home Page Display', () => {
    test('should create a recipe and see it on the home page', async ({ page }) => {
        // Relay console logs
        page.on('console', msg => console.log(`BROWSER LOG: ${msg.text()}`));

        // 1. Go to Home Page
        await page.goto('http://localhost:5173/bear-kitchen/');

        // Check if we are on the home page
        await expect(page.getByText('My Cozy Recipes')).toBeVisible();

        // 2. Click Add Recipe (or go directly to avoid responsive issues)
        await page.locator('a[href$="/new"]').first().click();

        // Verify we are on the edit/new page
        await expect(page).toHaveURL(/.*\/new/);

        // 3. Fill in recipe details
        const testTitle = `Test Recipe ${Date.now()}`;
        const testContent = 'This is a test recipe content with markdown: **yum!**';

        await page.getByPlaceholder('Recipe Title...').fill(testTitle);
        // Be more specific with the placeholder
        await page.locator('textarea').fill(testContent);

        // 4. Save the recipe
        const saveBtn = page.getByRole('button', { name: /Save/i });
        await expect(saveBtn).toBeEnabled();
        await saveBtn.click();

        // 5. Verify redirection to home
        await expect(page).toHaveURL(/.*\/bear-kitchen\/?$/);

        // 6. Verify recipe appears on home page
        // We might need to wait for the loading state to finish
        await expect(page.getByText('Gathering ingredients...')).not.toBeVisible({ timeout: 10000 });

        const recipeCard = page.getByText(testTitle);
        await expect(recipeCard).toBeVisible({ timeout: 5000 });

        console.log(`Success! Recipe "${testTitle}" is visible on home page.`);
    });

    test('should batch import multiple recipes', async ({ page }) => {
        await page.goto('http://localhost:5173/bear-kitchen/new');

        // Toggle Batch Mode
        const batchToggle = page.getByRole('button', { name: /Merge Mode/i });
        await batchToggle.click();
        await expect(page.getByText('⚡ Batch Mode')).toBeVisible();

        // Mock image upload (using actual test image)
        const imagePath = 'C:/Users/rogoz/.gemini/antigravity/brain/7797f51a-5973-4278-afb3-23cf4347ebb5/test_recipe_image_1769961148058.png';
        await page.setInputFiles('input[id="image-upload"]', [imagePath, imagePath]); // Upload 2

        await expect(page.getByText('Recipe Photos (2)')).toBeVisible();

        // Click Magic AI Scan (which does the batch scan)
        const scanBtn = page.getByText('Magic AI Scan ✨');
        await scanBtn.click();

        // Wait for batch completion toast and redirect
        await expect(page).toHaveURL(/.*\/bear-kitchen\/?$/, { timeout: 60000 });

        // Verify 2 new recipes (or at least one of the batch ones)
        await expect(page.getByText('Scanned Recipe').first()).toBeVisible({ timeout: 10000 });

        console.log('Batch import verified!');
    });
});
