import { test, expect, type Page, type CDPSession } from '@playwright/test';
import { createIsolatedBoard, type BoardData } from '../helpers/sf-data';

type LongTask = { name: string; duration: number; startTime: number };

declare global {
    interface Window {
        __longTasks?: LongTask[];
    }
}

/**
 * LWC Performance Benchmark Suite
 *
 * Uses Playwright CDP (Chrome DevTools Protocol) to capture:
 * - Page load metrics (DOM content loaded, first paint, EPT)
 * - JavaScript heap usage
 * - Long tasks (>50ms main-thread blocks)
 * - Navigation timing (TTFB, DOM interactive, load complete)
 * - Per-interaction timing (card click, filter, drag)
 *
 * Run: npx playwright test e2e/specs/performance.spec.ts --project=chromium
 * CI:  Triggered by benchmark-e2e-performance.yml workflow
 */

const SF_TIMEOUT = 60_000;

interface PerfMetrics {
    [key: string]: number;
}

interface TimingResult {
    label: string;
    durationMs: number;
}

/** Extract Chrome performance metrics via CDP */
async function getCdpMetrics(cdp: CDPSession): Promise<PerfMetrics> {
    const { metrics } = await cdp.send('Performance.getMetrics');
    const result: PerfMetrics = {};
    for (const m of metrics) {
        result[m.name] = m.value;
    }
    return result;
}

/** Calculate delta between two metric snapshots */
function metricDelta(
    before: PerfMetrics,
    after: PerfMetrics,
    key: string
): number {
    return (after[key] ?? 0) - (before[key] ?? 0);
}

/** Capture long tasks via PerformanceObserver injection */
async function startLongTaskObserver(page: Page): Promise<void> {
    await page.evaluate(() => {
        window.__longTasks = [];
        const observer = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
                window.__longTasks?.push({
                    name: entry.name,
                    duration: entry.duration,
                    startTime: entry.startTime
                });
            }
        });
        observer.observe({ type: 'longtask', buffered: true });
    });
}

async function getLongTasks(
    page: Page
): Promise<Array<{ name: string; duration: number; startTime: number }>> {
    return page.evaluate(() => window.__longTasks || []);
}

/** Get navigation timing metrics */
async function getNavigationTiming(page: Page): Promise<PerfMetrics> {
    return page.evaluate(() => {
        const nav = performance.getEntriesByType(
            'navigation'
        )[0] as PerformanceNavigationTiming;
        if (!nav) return {} as PerfMetrics;
        return {
            ttfb: nav.responseStart - nav.requestStart,
            domInteractive: nav.domInteractive - nav.startTime,
            domContentLoaded: nav.domContentLoadedEventEnd - nav.startTime,
            loadComplete: nav.loadEventEnd - nav.startTime,
            domNodes: document.querySelectorAll('*').length
        };
    });
}

/** Measure time for an action (returns ms) */
async function measureAction(
    _page: Page,
    label: string,
    action: () => Promise<void>
): Promise<TimingResult> {
    const start = Date.now();
    await action();
    const durationMs = Date.now() - start;
    return { label, durationMs };
}

test.describe('LWC Performance Benchmarks', () => {
    // Only run on Chromium (CDP required)
    test.skip(
        ({ browserName }) => browserName !== 'chromium',
        'CDP metrics require Chromium'
    );

    let boardData: BoardData & { baseUrl: string };

    test.beforeAll(() => {
        if (!process.env.SCRATCH_ORG_URL) {
            test.skip(true, 'SCRATCH_ORG_URL not set — skipping');
            return;
        }
        const data = createIsolatedBoard('perf', 'Project');
        const loginUrl = process.env.SCRATCH_ORG_URL || '';
        const baseUrl = loginUrl ? new URL(loginUrl).origin : '';
        boardData = { ...data, baseUrl };
    });

    test('board page load performance', async ({ page }) => {
        // Start CDP session
        const cdp = await page.context().newCDPSession(page);
        await cdp.send('Performance.enable');

        // Inject long task observer early
        await page.goto('about:blank');
        await startLongTaskObserver(page);

        // Snapshot before navigation
        const metricsBefore = await getCdpMetrics(cdp);

        // Navigate to board
        const boardUrl = `${boardData.baseUrl}/lightning/r/OpenSF__Board__c/${boardData.boardId}/view`;
        const loadTiming = await measureAction(
            page,
            'board_page_load',
            async () => {
                await page.goto(boardUrl, { waitUntil: 'domcontentloaded' });
                // Wait for LWC board component to render
                await page
                    .locator('.kanban-board-wrapper')
                    .waitFor({ state: 'visible', timeout: SF_TIMEOUT });
            }
        );

        // Wait for cards to render
        const cardRenderTiming = await measureAction(
            page,
            'cards_render',
            async () => {
                await page
                    .locator('.kanban-card')
                    .first()
                    .waitFor({ state: 'visible', timeout: SF_TIMEOUT });
            }
        );

        // Collect metrics after load
        const metricsAfter = await getCdpMetrics(cdp);
        const navTiming = await getNavigationTiming(page);
        const longTasks = await getLongTasks(page);

        // Build results
        const results = {
            boardPageLoad: loadTiming.durationMs,
            cardsRender: cardRenderTiming.durationMs,
            jsHeapUsedMB: (
                (metricsAfter.JSHeapUsedSize ?? 0) / 1048576
            ).toFixed(2),
            jsHeapTotalMB: (
                (metricsAfter.JSHeapTotalSize ?? 0) / 1048576
            ).toFixed(2),
            domNodes: navTiming.domNodes ?? 0,
            ttfbMs: Math.round(navTiming.ttfb ?? 0),
            domInteractiveMs: Math.round(navTiming.domInteractive ?? 0),
            domContentLoadedMs: Math.round(navTiming.domContentLoaded ?? 0),
            loadCompleteMs: Math.round(navTiming.loadComplete ?? 0),
            longTaskCount: longTasks.length,
            longestTaskMs: Math.round(
                Math.max(0, ...longTasks.map((t) => t.duration))
            ),
            totalLongTaskMs: Math.round(
                longTasks.reduce((sum, t) => sum + t.duration, 0)
            ),
            scriptDurationDelta: metricDelta(
                metricsBefore,
                metricsAfter,
                'ScriptDuration'
            ).toFixed(3),
            layoutDurationDelta: metricDelta(
                metricsBefore,
                metricsAfter,
                'LayoutDuration'
            ).toFixed(3),
            taskDurationDelta: metricDelta(
                metricsBefore,
                metricsAfter,
                'TaskDuration'
            ).toFixed(3)
        };

        // Output structured benchmark line for CI parsing
        console.log(`PERF_BENCHMARK|board_load|${JSON.stringify(results)}`);

        // Assertions — these are guardrails, not pass/fail gates
        // Adjust thresholds as you establish baselines
        expect(loadTiming.durationMs).toBeLessThan(30000);
        expect(longTasks.filter((t) => t.duration > 200).length).toBeLessThan(
            10
        );

        await cdp.detach();
    });

    test('board interaction performance', async ({ page }) => {
        const cdp = await page.context().newCDPSession(page);
        await cdp.send('Performance.enable');

        const boardUrl = `${boardData.baseUrl}/lightning/r/OpenSF__Board__c/${boardData.boardId}/view`;
        await page.goto(boardUrl, { waitUntil: 'domcontentloaded' });
        await page
            .locator('.kanban-board-wrapper')
            .waitFor({ state: 'visible', timeout: SF_TIMEOUT });
        await page
            .locator('.kanban-card')
            .first()
            .waitFor({ state: 'visible', timeout: SF_TIMEOUT });

        await startLongTaskObserver(page);
        const timings: TimingResult[] = [];

        // Measure: card click opens panel
        const cardElement = page.locator('.kanban-card').first();
        if (await cardElement.isVisible()) {
            const cardClick = await measureAction(
                page,
                'card_click_open_panel',
                async () => {
                    await cardElement.click();
                    // Wait for panel to appear (or just a short settle)
                    await page.waitForTimeout(1000);
                }
            );
            timings.push(cardClick);

            // Close panel if opened (press Escape)
            await page.keyboard.press('Escape');
            await page.waitForTimeout(500);
        }

        // Measure: search/filter input (kanbanFilterBar renders it unconditionally)
        const searchInput = page.locator('.kanban-filter-bar__search-input');
        await expect(searchInput).toBeVisible({ timeout: SF_TIMEOUT });
        const filterTiming = await measureAction(
            page,
            'search_filter',
            async () => {
                await searchInput.fill('Card');
                await page.waitForTimeout(500); // debounce
            }
        );
        timings.push(filterTiming);

        // Clear search
        await searchInput.fill('');
        await page.waitForTimeout(300);

        // Measure: refresh button
        const refreshBtn = page.locator(
            'button.topbar-icon-btn[title="Refresh"]'
        );
        if (await refreshBtn.isVisible()) {
            const refreshTiming = await measureAction(
                page,
                'refresh_board',
                async () => {
                    await refreshBtn.click();
                    await page
                        .locator('.kanban-card')
                        .first()
                        .waitFor({ state: 'visible', timeout: SF_TIMEOUT });
                }
            );
            timings.push(refreshTiming);
        }

        const longTasks = await getLongTasks(page);
        const metricsAfter = await getCdpMetrics(cdp);

        const results = {
            interactions: timings,
            jsHeapUsedMB: (
                (metricsAfter.JSHeapUsedSize ?? 0) / 1048576
            ).toFixed(2),
            longTaskCount: longTasks.length,
            totalLongTaskMs: Math.round(
                longTasks.reduce((sum, t) => sum + t.duration, 0)
            )
        };

        console.log(`PERF_BENCHMARK|interactions|${JSON.stringify(results)}`);

        // Sanity: interactions should complete in reasonable time
        for (const t of timings) {
            expect(t.durationMs).toBeLessThan(15000);
        }

        await cdp.detach();
    });

    test('memory leak check — navigate away and back', async ({ page }) => {
        const cdp = await page.context().newCDPSession(page);
        await cdp.send('Performance.enable');

        const boardUrl = `${boardData.baseUrl}/lightning/r/OpenSF__Board__c/${boardData.boardId}/view`;

        // First load
        await page.goto(boardUrl, { waitUntil: 'domcontentloaded' });
        await page
            .locator('.kanban-board-wrapper')
            .waitFor({ state: 'visible', timeout: SF_TIMEOUT });
        await page.waitForTimeout(2000);

        // Measure retained memory, not garbage that hasn't been collected yet
        await cdp.send('HeapProfiler.collectGarbage');
        const metricsFirst = await getCdpMetrics(cdp);
        const heapFirst = metricsFirst.JSHeapUsedSize ?? 0;

        // Navigate away
        await page.goto(`${boardData.baseUrl}/lightning/page/home`, {
            waitUntil: 'domcontentloaded'
        });
        await page.waitForTimeout(2000);

        // Navigate back
        await page.goto(boardUrl, { waitUntil: 'domcontentloaded' });
        await page
            .locator('.kanban-board-wrapper')
            .waitFor({ state: 'visible', timeout: SF_TIMEOUT });
        await page.waitForTimeout(2000);

        await cdp.send('HeapProfiler.collectGarbage');
        const metricsSecond = await getCdpMetrics(cdp);
        const heapSecond = metricsSecond.JSHeapUsedSize ?? 0;

        const heapGrowthMB = (heapSecond - heapFirst) / 1048576;

        console.log(
            `PERF_BENCHMARK|memory|${JSON.stringify({
                heapFirstMB: (heapFirst / 1048576).toFixed(2),
                heapSecondMB: (heapSecond / 1048576).toFixed(2),
                heapGrowthMB: heapGrowthMB.toFixed(2)
            })}`
        );

        // Allow up to 40MB growth (generous for SF Lightning framework)
        expect(heapGrowthMB).toBeLessThan(40);

        await cdp.detach();
    });
});
