export class dateUtils {
    static getStartOfDay(): Date {
        const now = new Date();
        return new Date(Date.UTC(
            now.getUTCFullYear(),
            now.getUTCMonth(),
            now.getUTCDate(),
            0, 0, 0, 0
        ));
    }

    static getCurrentUTCDate(): Date {
        return new Date(Date.now());
    }

    // Helper to check if a date is the same UTC day
    static isSameUTCDay(date1: Date, date2: Date): boolean {
        return (
            date1.getUTCFullYear() === date2.getUTCFullYear() &&
            date1.getUTCMonth() === date2.getUTCMonth() &&
            date1.getUTCDate() === date2.getUTCDate()
        );
    }

    // For testing/debugging
    static logDateComparison(): void {
        const localDate = new Date();
        const utcDate = this.getCurrentUTCDate();
        
        console.log({
            local: {
                full: localDate.toString(),
                date: localDate.toDateString(),
                time: localDate.toTimeString(),
                timestamp: localDate.getTime()
            },
            utc: {
                full: utcDate.toUTCString(),
                date: utcDate.getUTCDate(),
                time: `${utcDate.getUTCHours()}:${utcDate.getUTCMinutes()}`,
                timestamp: utcDate.getTime()
            }
        });
    }
}
