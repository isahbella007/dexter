// Define reasonable maximum values for each metric
export const MAX_VALUES = {
    totalKeywords: 1000,
    withMetaTags: 100,
    topPages: 1000,
    pageVisits: 10000,
    avgDuration: 600, // 10 minutes
    bounceRate: 100 // Percentage
};

export function calculateDVS(analytics: any): {DVS: number, domain: number, website: number, classification: any} {
     // Calculate the sum of all metrics for relative normalization
     const totalSum = (
        analytics.totalKeywords.total + // Keywords
        analytics.megaTagStatusScore.withMetaTags + // MetaTags
        analytics.topPagesScore.total + // TopPages
        analytics.pageVisitsScore.total + // PageVisits
        analytics.avgDurationScore.total + // AvgDuration
        (100 - analytics.bounceRateScore.total) // BounceRate (inverted)
    );

    // Calculate domain and website totals
    const domainTotal = (
        analytics.totalKeywords.total + // Keywords
        analytics.megaTagStatusScore.withMetaTags + // MetaTags
        analytics.topPagesScore.total // TopPages
    );

    const websiteTotal = (
        analytics.pageVisitsScore.total + // PageVisits
        analytics.avgDurationScore.total + // AvgDuration
        (100 - analytics.bounceRateScore.total) // BounceRate (inverted)
    );

    // Normalize each group to a score out of 100 based on their proportion of the total sum
    const domainScore = (domainTotal / totalSum) * 100;
    const websiteScore = (websiteTotal / totalSum) * 100;

    // Apply weights (e.g., domainScore is 60% important, websiteScore is 40%)
    const DOMAIN_WEIGHT = 0.5;
    const WEBSITE_WEIGHT = 0.5;

    // Calculate weighted DVS
    const dvs = (domainScore * DOMAIN_WEIGHT) + (websiteScore * WEBSITE_WEIGHT);

    // Classify each metric
    const totalPages = analytics.megaTagStatusScore.totalUrl
    const classification = {
        totalKeywords: classifyTotalKeywords(analytics.totalKeywords.total, totalPages),
        withMetaTags: classifyMetaTagStatus(analytics.megaTagStatusScore.withMetaTags, totalPages),
        topPages: classifyTopPages(analytics.topPagesScore.total, analytics.totalPages),
        pageVisits: classifyPageVisits(analytics.pageVisitsScore.total, analytics.totalPages),
        bounceRate: classifyBounceRate(analytics.bounceRateScore.total),
        avgDuration: classifyAvgDuration(analytics.avgDurationScore.total, analytics.totalPages)
    };
    return { DVS: dvs, domain: domainScore, website: websiteScore, classification };
}

export function classifyTotalKeywords(value: number, urlCount: number): string {
    // Calculate Keyword-to-Page Ratio (KPR)
    const KPR = value / urlCount;

    // Define benchmarks
    const GOOD_THRESHOLD = 15; // 15+ keywords per post
    const AVERAGE_THRESHOLD = 8; // 8-15 keywords per post

    if (KPR >= GOOD_THRESHOLD) return 'good';
    if (KPR >= AVERAGE_THRESHOLD) return 'average';
    return 'bad';
}

export function classifyMetaTagStatus(withMetaTags: number, totalPages: number): string {
    // Calculate Meta Tag Optimization Score (MTOS)
    const MTOS = (withMetaTags / totalPages) * 100;

    // Define benchmarks
    const GOOD_THRESHOLD = 90; // 90%+ of pages have optimized meta tags
    const AVERAGE_THRESHOLD = 70; // 70-89% of pages have optimized meta tags

    if (MTOS >= GOOD_THRESHOLD) return 'good';
    if (MTOS >= AVERAGE_THRESHOLD) return 'average';
    return 'bad';
}

export function classifyTopPages(topPagesScore: number, totalPages: number): string {
    // Calculate Top Pages Performance Score (TPPS)
    const TPPS = (topPagesScore / totalPages) * 100;

    // Define benchmarks
    const GOOD_THRESHOLD = 90; // 90%+ of top pages are performing well
    const AVERAGE_THRESHOLD = 70; // 70-89% of top pages are performing well

    if (TPPS >= GOOD_THRESHOLD) return 'good';
    if (TPPS >= AVERAGE_THRESHOLD) return 'average';
    return 'bad';
}

export function classifyPageVisits(pageVisitsScore: number, totalPages: number): string {
    // Calculate Page Visits Performance Score (PVPS)
    const PVPS = (pageVisitsScore / totalPages) * 100;

    // Define benchmarks
    const GOOD_THRESHOLD = 90; // 90%+ of pages have high visits
    const AVERAGE_THRESHOLD = 70; // 70-89% of pages have moderate visits

    if (PVPS >= GOOD_THRESHOLD) return 'good';
    if (PVPS >= AVERAGE_THRESHOLD) return 'average';
    return 'bad';
}

export function classifyBounceRate(bounceRateScore: number): string {
    // Define benchmarks (no need to multiply by 100)
    const GOOD_THRESHOLD = 30; // Bounce rate below 30% is good
    const AVERAGE_THRESHOLD = 50; // Bounce rate between 30-50% is average

    if (bounceRateScore <= GOOD_THRESHOLD) return 'good';
    if (bounceRateScore <= AVERAGE_THRESHOLD) return 'average';
    return 'bad';
}

export function classifyAvgDuration(avgDurationScore: number, totalPages: number): string {
    // Calculate average visit duration per page
    const avgDurationPerPage = avgDurationScore / totalPages;

    // Define benchmarks (in seconds per page)
    const GOOD_THRESHOLD = 5; // 5+ seconds per page is good
    const AVERAGE_THRESHOLD = 2; // 2-5 seconds per page is average

    if (avgDurationPerPage >= GOOD_THRESHOLD) return 'good';
    if (avgDurationPerPage >= AVERAGE_THRESHOLD) return 'average';
    return 'bad';
}