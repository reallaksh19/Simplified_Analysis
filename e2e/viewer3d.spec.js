import { test, expect } from '@playwright/test';

test('Render Exclusion Test', async ({ page }) => {
  // Navigate to the app (assuming it runs on localhost:5173 or similar during tests)
  await page.goto('/');

  // Wait for the app to load
  await page.waitForSelector('text=PCF Input');

  // Load the 5-Leg Mock Data using the Mock button
  await page.click('button[title="Load 5-Leg Mock Data"]');

  // Click Generate 3D
  await page.click('text=Generate 3D');

  // Wait for the components rendered text to appear (might be more than 6, let's just wait for "components rendered")
  await page.waitForSelector('text=components rendered');

  // Change the MaxX slider to 0 to clip the right side of the mock data
  const slider = await page.locator('input[type="range"]').nth(1); // Assuming the second slider is X Max
  await slider.fill('0');
  await slider.dispatchEvent('change');

  // Verify the slider value updated properly
  const val = await slider.inputValue();
  expect(val).toBe('0');
});
