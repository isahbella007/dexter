import { dateUtils } from "../../utils/helpers/date";

describe('DateUtils', () => {
    it('should handle different timezones correctly', () => {
        const startOfDay = dateUtils.getStartOfDay();
        const currentUTC = dateUtils.getCurrentUTCDate();
        
        // Should be the same UTC day
        expect(dateUtils.isSameUTCDay(startOfDay, currentUTC)).toBe(true);
        
        // Start of day should always be 00:00:00
        expect(startOfDay.getUTCHours()).toBe(0);
        expect(startOfDay.getUTCMinutes()).toBe(0);
        expect(startOfDay.getUTCSeconds()).toBe(0);
    });

    it('should create consistent timestamps across timezones', () => {
        const date1 = dateUtils.getCurrentUTCDate();
        
        // Simulate different timezone by adding offset
        const date2 = new Date(date1.getTime() + (3 * 60 * 60 * 1000)); // +3 hours
        
        // Should still be same UTC day
        expect(dateUtils.isSameUTCDay(date1, date2)).toBe(true);
    });
});