import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth';
import { attachMetrics, assertSLA, SLA } from '../helpers/performance';

/**
 * Timing for every top-level nav-button click, gated against SLA Tier T2
 * (Navigation). Complements 007_top-nav-routes.spec.ts (which only checks
 * correctness of the route/section reached) with real click-to-visible
 * timing for each of the 6 sections.
 */
test.describe('Performance - Top Navigation', () => {
  test('every top-level section loads within the navigation SLA', async ({ page }, testInfo) => {
    await login(page);

    const sections: Array<{ nav: string; assertion: () => Promise<void> }> = [
      { nav: 'Dashboard', assertion: async () => expect(page).toHaveURL(/\/dashboard/) },
      {
        nav: 'Admins',
        assertion: async () => expect(page.getByRole('button', { name: 'Team Management' })).toBeVisible(),
      },
      { nav: 'Clients', assertion: async () => expect(page).toHaveURL(/\/clients/) },
      { nav: 'Markets', assertion: async () => expect(page.getByRole('tab', { name: 'ISIN' })).toBeVisible() },
      { nav: 'Upload', assertion: async () => expect(page).toHaveURL(/\/datas/) },
      { nav: 'Reports', assertion: async () => expect(page).toHaveURL(/\/reports/) },
    ];

    const summary: string[] = [];
    for (const { nav, assertion } of sections) {
      const start = Date.now();
      await page.getByRole('button', { name: nav }).click();
      await assertion();
      const ms = Date.now() - start;
      summary.push(assertSLA(`SLA T2 - Nav click "${nav}" to section visible`, ms, SLA.NAVIGATION));
    }

    console.log(`\n[PERF] Top Navigation:\n  ${summary.join('\n  ')}`);
    await attachMetrics(testInfo, 'navigation-performance-metrics', summary);
  });
});
