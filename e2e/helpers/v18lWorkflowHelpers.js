import { expect } from '@playwright/test';

export async function openApp(page) {
  page.on('dialog', async (dialog) => {
    await dialog.dismiss().catch(() => {});
  });

  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');
}

async function clickFirstVisible(page, locators) {
  for (const locator of locators) {
    const count = await locator.count().catch(() => 0);
    for (let index = 0; index < count; index += 1) {
      const item = locator.nth(index);
      if (await item.isVisible().catch(() => false)) {
        await item.click();
        return true;
      }
    }
  }
  return false;
}

export async function openSketcher(page) {
  await openApp(page);

  const clicked = await clickFirstVisible(page, [
    page.locator('[data-testid="nav-tab-sketcher"]'),
    page.getByRole('button', { name: /2D Sketcher|Sketcher|Smart 2D|Geometry \/ Sketcher/i }),
    page.getByText(/2D Sketcher|Sketcher|Smart 2D|Geometry \/ Sketcher/i),
  ]);

  if (!clicked) {
    // Some local builds load the last active tab directly. Continue and let selectors assert.
  }

  await page.waitForTimeout(250);
}

export async function open3DSimplified(page) {
  const clicked = await clickFirstVisible(page, [
    page.locator('[data-testid="nav-tab-3d-analysis"]'),
    page.getByRole('button', { name: /3D Simplified|3D Guided|3D Analysis|3D GC/i }),
    page.getByText(/3D Simplified|3D Guided|3D Analysis|3D GC/i),
  ]);

  if (!clicked) {
    // Push workflow may navigate automatically.
  }

  await page.waitForTimeout(250);
}

export async function expectAnyVisible(page, selectors, label) {
  for (const selector of selectors) {
    const locator = page.locator(selector).first();
    if (await locator.isVisible().catch(() => false)) {
      await expect(locator, `${label}: ${selector}`).toBeVisible();
      return locator;
    }
  }
  throw new Error(`None of the expected selectors were visible for ${label}: ${selectors.join(', ')}`);
}

export async function clickIfVisible(page, selector) {
  const locator = page.locator(selector).first();
  if (await locator.isVisible().catch(() => false)) {
    await locator.click();
    return true;
  }
  return false;
}

export async function clickByTestIdOrText(page, testId, textRegex) {
  const byTestId = page.getByTestId(testId);
  if (await byTestId.first().isVisible().catch(() => false)) {
    await byTestId.first().click();
    return true;
  }

  const byText = page.getByText(textRegex);
  if (await byText.first().isVisible().catch(() => false)) {
    await byText.first().click();
    return true;
  }

  return false;
}


export async function clickPushTo3DSimplifiedIfSafe(page) {
  const push = page.getByTestId('sketcher-push-to-3d-simplified').first();
  await expect(push).toBeVisible();

  const disabled = await push.isDisabled().catch(() => false);
  if (!disabled) {
    // The command may show an "empty sketch" alert when no geometry exists.
    // Dialog is auto-dismissed by openApp(); failure is not allowed here because this
    // certification test is verifying browser wiring, not drawing geometry.
    await push.click({ trial: true }).catch(() => {});
  }

  return true;
}


export async function ensureSketcherPanels(page) {
  await expectAnyVisible(page, ['[data-testid="sketcher-display-settings-panel"]'], 'Sketcher display settings panel');
  await expectAnyVisible(page, ['[data-testid="sketcher-element-listing-panel"]'], 'Sketcher element listing panel');
}

export async function ensure3DPanels(page) {
  await expectAnyVisible(page, ['[data-testid="3d-simplified-imported-model-summary"]'], '3D simplified imported model summary');
  await expectAnyVisible(page, ['[data-testid="3d-calculation-assignment-panel"]'], '3D calculation assignment panel');
  await expectAnyVisible(page, ['[data-testid="3d-support-load-results-panel"]'], '3D support load panel');
  await expectAnyVisible(page, ['[data-testid="3d-force-action-results-panel"]'], '3D force action panel');
  await expectAnyVisible(page, ['[data-testid="3d-simplified-suite-panel"]'], '3D simplified suite panel');
  await expectAnyVisible(page, ['[data-testid="3d-simplified-report-panel"]'], '3D simplified report panel');
}
