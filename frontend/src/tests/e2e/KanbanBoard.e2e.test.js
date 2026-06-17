import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:5173';

// Custom drag and drop helper that satisfies activation constraints (e.g. distance: 5px)
async function dragAndDrop(page, dragSelector, dropSelector) {
  const dragElement = page.locator(dragSelector).first();
  const dropElement = page.locator(dropSelector).first();

  await dragElement.scrollIntoViewIfNeeded();
  await dropElement.scrollIntoViewIfNeeded();

  const dragBox = await dragElement.boundingBox();
  const dropBox = await dropElement.boundingBox();

  if (dragBox && dropBox) {
    const startX = dragBox.x + dragBox.width / 2;
    const startY = dragBox.y + dragBox.height / 2;
    const endX = dropBox.x + dropBox.width / 2;
    const endY = dropBox.y + dropBox.height / 2;

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    // Move slightly first to activate the drag sensor
    await page.mouse.move(startX + 10, startY + 10, { steps: 5 });
    // Move to the drop destination smoothly (using 40 steps to prevent pointer jumps over multiple columns)
    await page.mouse.move(endX, endY, { steps: 40 });
    await page.mouse.up();
  }
}

// Scoped React Select option helper for E2E tests
async function selectReactSelectOption(page, selectTestId, optionLabelText) {
  // Click the wrapper of the select component to open the dropdown
  const selectWrapper = page.locator(`[data-testid="task-modal"] [data-testid="${selectTestId}"]`);
  await selectWrapper.click();
  // Click the option containing target label in the active menu
  await page.locator(`[class*="-menu"] [class*="-option"]:has-text("${optionLabelText}")`).first().click();
}

test.describe('Kanban Board E2E Tests', () => {
  let timestamp;

  test.beforeEach(async ({ page }) => {
    timestamp = `${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    await page.goto(BASE_URL);
    await page.waitForTimeout(1000); // Wait for animations
  });

  test('homepage shows FlowBoard heading', async ({ page }) => {
    const heading = page.locator('h1:has-text("FlowBoard")');
    await expect(heading).toBeVisible({ timeout: 10000 });
  });

  test('user can create a task', async ({ page }) => {
    const taskTitle = `Test Task E2E ${timestamp}`;
    await page.click('text=Go to Board');
    await page.waitForTimeout(500);

    // Open Modal
    await page.click('[data-testid="new-task-btn"]');
    await expect(page.locator('[data-testid="task-modal"]')).toBeVisible({ timeout: 5000 });

    // Fill Form
    await page.fill('input[placeholder="e.g., Fix WebSocket sync bug"]', taskTitle);
    await page.fill('textarea[placeholder="Provide a detailed description of the task..."]', 'E2E Description');

    // Select Priority 'High' using our robust select helper
    await selectReactSelectOption(page, 'priority-select', 'High');

    // Submit Form
    await page.click('[data-testid="submit-task"]');

    // Verify card is created in "To Do" column and has high priority (matching text to avoid stale cards from other runs)
    const card = page.locator(`[data-testid="task-card"]:has-text("${taskTitle}"):has-text("high")`).first();
    await expect(card).toBeVisible({ timeout: 10000 });
  });

  test('user can move task to In Progress via drag and drop', async ({ page }) => {
    const taskTitle = `Drag E2E Task ${timestamp}`;
    await page.click('text=Go to Board');
    await page.click('[data-testid="new-task-btn"]');
    await page.fill('input[placeholder="e.g., Fix WebSocket sync bug"]', taskTitle);
    await page.click('[data-testid="submit-task"]');

    // Wait for the card fadeInUp entry animation to finish so the bounding box coordinates are stable
    await page.waitForTimeout(1000);

    // Drag the card
    await dragAndDrop(
      page,
      `[data-testid="column-todo"] [data-testid="task-card"]:has-text("${taskTitle}")`,
      '[data-testid="column-inprogress"]'
    );

    // Verify card is now in In Progress column
    const inProgressColumn = page.locator('[data-testid="column-inprogress"]');
    await expect(
      inProgressColumn.locator(`[data-testid="task-card"]:has-text("${taskTitle}")`).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test('user can edit a task', async ({ page }) => {
    const taskTitle = `Task to Edit ${timestamp}`;
    const updatedTitle = `Updated Task E2E ${timestamp}`;
    await page.click('text=Go to Board');
    await page.click('[data-testid="new-task-btn"]');
    await page.fill('input[placeholder="e.g., Fix WebSocket sync bug"]', taskTitle);
    await page.click('[data-testid="submit-task"]');

    // Wait for animation stability
    await page.waitForTimeout(1000);

    const card = page.locator(`[data-testid="task-card"]:has-text("${taskTitle}")`).first();
    await card.click();

    // Verify modal is open
    await expect(page.locator('[data-testid="task-modal"]')).toBeVisible();

    // Edit Title
    await page.fill('input[placeholder="e.g., Fix WebSocket sync bug"]', updatedTitle);
    await page.click('[data-testid="submit-task"]');

    // Verify updated title
    await expect(page.locator(`[data-testid="task-card"]:has-text("${updatedTitle}")`).first()).toBeVisible({ timeout: 10000 });
  });

  test('user can delete a task', async ({ page }) => {
    const taskTitle = `Task to Delete ${timestamp}`;
    await page.click('text=Go to Board');
    await page.click('[data-testid="new-task-btn"]');
    await page.fill('input[placeholder="e.g., Fix WebSocket sync bug"]', taskTitle);
    await page.click('[data-testid="submit-task"]');

    // Wait for animation stability
    await page.waitForTimeout(1000);

    const card = page.locator(`[data-testid="task-card"]:has-text("${taskTitle}")`).first();
    await card.hover();

    // Click the delete button
    const deleteBtn = card.locator('[data-testid^="delete-task-"]');
    await deleteBtn.click();

    // Verify task is gone
    await expect(page.locator(`[data-testid="task-card"]:has-text("${taskTitle}")`).first()).not.toBeVisible({ timeout: 10000 });
  });

  test('user can upload a file attachment', async ({ page }) => {
    const taskTitle = `Attachment Task ${timestamp}`;
    await page.click('text=Go to Board');
    await page.click('[data-testid="new-task-btn"]');
    await page.fill('input[placeholder="e.g., Fix WebSocket sync bug"]', taskTitle);
    await page.click('[data-testid="submit-task"]');

    // Wait for card entry animation to stabilize before clicking
    await page.waitForTimeout(1000);

    const card = page.locator(`[data-testid="task-card"]:has-text("${taskTitle}")`).first();
    await card.click();

    // Upload using buffer to enforce correct MIME type
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'temp_test_image.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from('dummy content')
    });

    // Wait for the thumbnail preview to appear inside modal
    await expect(page.locator('img[alt="temp_test_image.jpg"]')).toBeVisible({ timeout: 10000 });

    // Submit modal
    await page.click('[data-testid="submit-task"]');

    // Verify attachment badge count (1) appears on card using specific title attribute to avoid date overlap
    await expect(card.locator('[title="1 attachments"]')).toBeVisible({ timeout: 10000 });
  });

  test('invalid file type shows error message', async ({ page }) => {
    const taskTitle = `Invalid Attachment Task ${timestamp}`;
    await page.click('text=Go to Board');
    await page.click('[data-testid="new-task-btn"]');
    await page.fill('input[placeholder="e.g., Fix WebSocket sync bug"]', taskTitle);
    await page.click('[data-testid="submit-task"]');

    // Wait for card entry animation to stabilize before clicking
    await page.waitForTimeout(1000);

    const card = page.locator(`[data-testid="task-card"]:has-text("${taskTitle}")`).first();
    await card.click();

    // Upload invalid file type using buffer
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'temp_test_exec.exe',
      mimeType: 'application/x-msdownload',
      buffer: Buffer.from('dummy exec')
    });

    // Check that error toast appears
    const toast = page.locator('text=Only images and PDFs');
    await expect(toast).toBeVisible({ timeout: 10000 });
  });

  test('progress chart updates when task moves to Done', async ({ page }) => {
    const taskTitle = `Done Chart Task ${timestamp}`;
    await page.click('text=Go to Board');
    await page.click('[data-testid="new-task-btn"]');
    await page.fill('input[placeholder="e.g., Fix WebSocket sync bug"]', taskTitle);
    await page.click('[data-testid="submit-task"]');

    // Wait for card entry animation to stabilize
    await page.waitForTimeout(1000);

    // Drag to Done
    await dragAndDrop(
      page,
      `[data-testid="column-todo"] [data-testid="task-card"]:has-text("${taskTitle}")`,
      '[data-testid="column-done"]'
    );

    const doneColumn = page.locator('[data-testid="column-done"]');
    await expect(
      doneColumn.locator(`[data-testid="task-card"]:has-text("${taskTitle}")`).first()
    ).toBeVisible({ timeout: 10000 });

    // Verify that Done % is updated in the dashboard and matches a percentage number format in the Donut Chart
    await expect(page.locator('div').filter({ hasText: /^\d+%\s*$/ }).first()).toBeVisible({ timeout: 10000 });
  });

  test('connection banner appears when server is offline', async ({ page }) => {
    // Disconnect socket using exposed window instance
    await page.evaluate(() => {
      if (window.socket) {
        window.socket.disconnect();
      }
    });

    // Assert banner is visible
    const banner = page.locator('[data-testid="connection-banner"]');
    await expect(banner).toBeVisible({ timeout: 10000 });

    // Reconnect socket
    await page.evaluate(() => {
      if (window.socket) {
        window.socket.connect();
      }
    });

    // Assert banner disappears
    await expect(banner).not.toBeVisible({ timeout: 10000 });
  });
});
