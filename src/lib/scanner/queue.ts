// Simple in-memory scan queue to prevent resource exhaustion

interface ScanJob {
  scanId: string;
  userId: string;
  startedAt: number;
}

class ScanQueue {
  private activeScans: Map<string, ScanJob> = new Map();
  private readonly maxConcurrentScans = 10;
  private readonly maxScansPerUser = 2;
  private readonly scanTimeout = 10 * 60 * 1000; // 10 minutes

  canStartScan(userId: string): { allowed: boolean; reason?: string } {
    this.cleanup();

    const totalActive = this.activeScans.size;
    if (totalActive >= this.maxConcurrentScans) {
      return {
        allowed: false,
        reason: `Server is processing ${totalActive} scans. Please try again in a few minutes.`,
      };
    }

    const userScans = Array.from(this.activeScans.values()).filter(
      (job) => job.userId === userId
    );
    if (userScans.length >= this.maxScansPerUser) {
      return {
        allowed: false,
        reason: `You have ${userScans.length} active scans. Please wait for them to complete.`,
      };
    }

    return { allowed: true };
  }

  startScan(scanId: string, userId: string): void {
    this.activeScans.set(scanId, {
      scanId,
      userId,
      startedAt: Date.now(),
    });
  }

  endScan(scanId: string): void {
    this.activeScans.delete(scanId);
  }

  getActiveScanCount(): number {
    this.cleanup();
    return this.activeScans.size;
  }

  getUserActiveScanCount(userId: string): number {
    this.cleanup();
    return Array.from(this.activeScans.values()).filter(
      (job) => job.userId === userId
    ).length;
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [scanId, job] of this.activeScans.entries()) {
      if (now - job.startedAt > this.scanTimeout) {
        console.error(`Scan ${scanId} exceeded timeout, removing from queue`);
        this.activeScans.delete(scanId);
      }
    }
  }
}

export const scanQueue = new ScanQueue();
