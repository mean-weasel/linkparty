import { test, expect } from '@playwright/test'

test.describe('Auth Wall', () => {
  test('unauthenticated user sees landing page at home', async ({ page }) => {
    await page.goto('/')
    // Root is public — unauthenticated users see the landing page
    await expect(page.getByRole('heading', { name: /stop losing links/i })).toBeVisible()
  })

  test('unauthenticated user is redirected to login from create', async ({ page }) => {
    await page.goto('/create')
    await expect(page).toHaveURL(/\/login/)
    const url = new URL(page.url())
    expect(url.searchParams.get('redirect')).toMatch(/^\/create\/?$/)
  })

  test('unauthenticated user is redirected to login from join', async ({ page }) => {
    await page.goto('/join')
    await expect(page).toHaveURL(/\/login/)
  })

  test('login page is accessible without auth', async ({ page }) => {
    await page.goto('/login')
    await expect(page).toHaveURL(/\/login/)
    await expect(page.getByRole('heading')).toBeVisible()
  })

  test('signup page is accessible without auth', async ({ page }) => {
    await page.goto('/signup')
    await expect(page).toHaveURL(/\/signup/)
  })
})
