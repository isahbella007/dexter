import { schedulePublishService, SchedulePublishService } from "../../api/publish/services/schedule.publish.service";

interface SchedulerMetrics {
    totalProcessed: number;
    successfulPosts: number;
    failedPosts: number;
    lastRunTime: Date | null;
    averageProcessingTime: number;
  }

export class SchedulerService {
  constructor(private schedulePublishService: SchedulePublishService) {}
  private isRunning = false;
  private metrics: SchedulerMetrics = { 
    totalProcessed: 0,
    successfulPosts: 0,
    failedPosts: 0,
    lastRunTime: null,
    averageProcessingTime: 0

  }

  async start(): Promise<void> {
    if (this.isRunning) {
      throw new Error('Scheduler is already running');
    }
    this.isRunning = true;

    while(this.isRunning){ 
        const startTime = new Date();
        await this.schedulePublishService.processScheduledPosts();
        const endTime = new Date();

        this.updateMetrics(endTime.getTime() - startTime.getTime());

        // check every minute
        await new Promise(resolve => setTimeout(resolve, 60000));
    }
  }

  stop(): void {
    this.isRunning = false;
    console.log('Scheduler stopped');
  }

  private updateMetrics(processingTime: number): void {
    this.metrics.lastRunTime = new Date();
    this.metrics.averageProcessingTime =
      (this.metrics.averageProcessingTime * (this.metrics.totalProcessed - 1) +
        processingTime) /
      this.metrics.totalProcessed;
  }
}


export const schedulerService = new SchedulerService(schedulePublishService);