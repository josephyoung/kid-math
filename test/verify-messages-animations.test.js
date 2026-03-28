const { test, expect } = require("@playwright/test");

test("page loads and app works", async ({ page }) => {
  await page.goto("http://localhost:8080");

  // 页面标题正确
  await expect(page).toHaveTitle("算术练习");

  // Vue 应用挂载，题目正常显示
  const questionFirst = await page.locator(".question-wrapper span").first();
  await expect(questionFirst).toBeVisible();

  // 输入框存在
  const input = page.locator(".arco-input-number input");
  await expect(input).toBeVisible();

  // 提交按钮存在且禁用（因为还没输入答案）
  const submitBtn = page.locator('a-button[type="primary"]');
  await expect(submitBtn).toBeDisabled();
});

test("random responses work for correct answer", async ({ page }) => {
  await page.goto("http://localhost:8080");

  // 获取题目计算正确答案
  const first = await page
    .locator(".question-wrapper span")
    .nth(0)
    .textContent();
  const operator = await page
    .locator(".question-wrapper span")
    .nth(1)
    .textContent();
  const second = await page
    .locator(".question-wrapper span")
    .nth(2)
    .textContent();
  const correctAnswer = eval(
    `${first} ${operator === "÷" ? "/" : operator} ${second}`,
  );

  // 输入正确答案
  await page.locator(".arco-input-number input").fill(String(correctAnswer));

  // 点击提交
  await page.click('a-button[type="primary"]');

  // 响应区域显示，有正确提示语
  const response = page.locator(".response span");
  await expect(response).toBeVisible();

  // 有动画类
  const responseClass = await response.getAttribute("class");
  expect(responseClass).toContain("animate__animated");

  // 检查提示语非空
  const responseText = await response.textContent();
  expect(responseText.trim()).not.toBe("");
});

test("random responses work for wrong answer", async ({ page }) => {
  await page.goto("http://localhost:8080");

  // 输入一个错误答案
  await page.locator(".arco-input-number input").fill("999");

  // 点击提交
  await page.click('a-button[type="primary"]');

  // 响应区域显示
  const response = page.locator(".response span");
  await expect(response).toBeVisible();

  // 检查提示语非空
  const responseText = await response.textContent();
  expect(responseText.trim()).not.toBe("");
});

test("verify counts are correct", async ({ page }) => {
  await page.goto("http://localhost:8080");

  // 将三个数组暴露到window以便测试
  await page.evaluate(() => {
    window.RIGHT_RESPONSES = RIGHT_RESPONSES;
    window.ERROR_RESPONSES = ERROR_RESPONSES;
    window.ANIMATION_CLASSES = ANIMATION_CLASSES;
  });

  // 检查窗口对象上有定义，验证数量
  const rightCount = await page.evaluate(() => window.RIGHT_RESPONSES.length);
  const errorCount = await page.evaluate(() => window.ERROR_RESPONSES.length);
  const animationCount = await page.evaluate(
    () => window.ANIMATION_CLASSES.length,
  );

  console.log(
    `Counts - Right: ${rightCount}, Error: ${errorCount}, Animations: ${animationCount}`,
  );

  // 验证预期数量
  expect(rightCount).toBe(34);
  expect(errorCount).toBe(16);
  expect(animationCount).toBe(30);
});

test("speech synthesis is callable", async ({ page }) => {
  await page.goto("http://localhost:8080");
  // 验证 speechSynthesis 在 window 上存在
  const hasSpeech = await page.evaluate(() => "speechSynthesis" in window);
  expect(hasSpeech).toBeTruthy();
});
