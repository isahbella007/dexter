export interface Metrics {
    organicTraffic: number;
    pagesPerSession: number;
    bounceRate: number;
    crawlError: number;
    avgPosition: number;
}

export const METRIC_WEIGHTS: Metrics = {
    organicTraffic: 0.4, // Most important
    pagesPerSession: 0.2,
    bounceRate: 0.2, // Lower is better
    crawlError: 0.1, // Lower is better
    avgPosition: 0.1 // Lower is better
};

export function normalizeMetric(metric: string, value: number, maxValue: number): number {
   // If maxValue is 0, return 0 (no data to compare)
   if (maxValue === 0) {
        return 0;
    }
    switch (metric) {
        case 'bounceRate':
            // Bounce rate is already in decimal format (e.g., 0.2 = 20%)
            // Lower is better: invert the value
            return Math.max(0, 100 - (value * 100)); // Convert to percentage and invert
        case 'crawlError':
        case 'avgPosition':
            // Lower is better: invert the value
            return Math.max(0, 100 - (value / maxValue) * 100);
        default:
            // Higher is better
            return (value / maxValue) * 100;
    }
}

export function calculatePostScore(metrics: Metrics, maxValues: Metrics): number {
    // If all max values are 0, return 0 (no data to compare)
    if (Object.values(maxValues).every(val => val === 0)) {
        return 0;
    }

    let totalScore = 0;

    for (const [metric, value] of Object.entries(metrics)) {
        const normalizedValue = normalizeMetric(metric, value, maxValues[metric as keyof Metrics]);
        totalScore += normalizedValue * METRIC_WEIGHTS[metric as keyof Metrics];
    }

    return Math.round(totalScore); // Round to nearest integer
}

export function classifyScore(score: number): string {
    if (score === 0) {
        return 'notraffic'; // Special classification for no data
    } else if (score >= 85) {
        return 'good';
    } else if (score >= 50) {
        return 'medium';
    } else {
        return 'bad';
    }
}