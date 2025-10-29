import { BaseAppError, ErrorCode } from './error-types';

export interface ErrorFingerprint {
  id: string;
  normalizedMessage: string;
  errorCode: ErrorCode;
  stackHash: string;
  componentPath?: string;
  metadata: {
    firstSeen: string;
    lastSeen: string;
    occurrenceCount: number;
    affectedUsers: Set<string>;
    affectedOrganizations: Set<string>;
  };
}

export class ErrorFingerprintGenerator {
  private static instance: ErrorFingerprintGenerator;
  private fingerprintCache = new Map<string, ErrorFingerprint>();

  private constructor() {}

  static getInstance(): ErrorFingerprintGenerator {
    if (!ErrorFingerprintGenerator.instance) {
      ErrorFingerprintGenerator.instance = new ErrorFingerprintGenerator();
    }
    return ErrorFingerprintGenerator.instance;
  }

  generateFingerprint(error: Error | BaseAppError, context?: any): string {
    const normalizedMessage = this.normalizeErrorMessage(error.message);
    const stackHash = this.generateStackHash(error.stack || '');
    const componentPath = this.extractComponentPath(error.stack || '');

    const errorCode = error instanceof BaseAppError ? error.code : ErrorCode.UNKNOWN_ERROR;

    const fingerprintId = this.createFingerprintId(
      errorCode,
      normalizedMessage,
      stackHash,
      componentPath
    );

    this.updateFingerprintMetadata(fingerprintId, {
      errorCode,
      normalizedMessage,
      stackHash,
      componentPath,
      context,
    });

    return fingerprintId;
  }

  private normalizeErrorMessage(message: string): string {
    return message
      .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '<UUID>')
      .replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/g, '<TIMESTAMP>')
      .replace(/\b\d+\b/g, '<NUM>')
      .replace(/['"].*?['"]/g, '<STRING>')
      .replace(/https?:\/\/[^\s]+/g, '<URL>')
      .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '<EMAIL>')
      .toLowerCase()
      .trim();
  }

  private generateStackHash(stack: string): string {
    const stackLines = stack.split('\n').slice(0, 5);
    const relevantStack = stackLines
      .map(line => line.replace(/:\d+:\d+/g, ''))
      .join('|');

    return this.simpleHash(relevantStack);
  }

  private extractComponentPath(stack: string): string | undefined {
    const componentMatch = stack.match(/at\s+(\w+)\s+\(/);
    if (componentMatch) {
      return componentMatch[1];
    }

    const fileMatch = stack.match(/([^/\\]+)\.(tsx?|jsx?):\d+:\d+/);
    if (fileMatch) {
      return fileMatch[1];
    }

    return undefined;
  }

  private createFingerprintId(
    errorCode: ErrorCode,
    normalizedMessage: string,
    stackHash: string,
    componentPath?: string
  ): string {
    const parts = [
      errorCode,
      normalizedMessage.substring(0, 50),
      stackHash,
      componentPath || 'unknown',
    ];
    return this.simpleHash(parts.join('|'));
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  private updateFingerprintMetadata(
    fingerprintId: string,
    data: {
      errorCode: ErrorCode;
      normalizedMessage: string;
      stackHash: string;
      componentPath?: string;
      context?: any;
    }
  ): void {
    const existing = this.fingerprintCache.get(fingerprintId);
    const now = new Date().toISOString();

    if (existing) {
      existing.metadata.lastSeen = now;
      existing.metadata.occurrenceCount++;

      if (data.context?.userId) {
        existing.metadata.affectedUsers.add(data.context.userId);
      }
      if (data.context?.organizationId) {
        existing.metadata.affectedOrganizations.add(data.context.organizationId);
      }
    } else {
      this.fingerprintCache.set(fingerprintId, {
        id: fingerprintId,
        normalizedMessage: data.normalizedMessage,
        errorCode: data.errorCode,
        stackHash: data.stackHash,
        componentPath: data.componentPath,
        metadata: {
          firstSeen: now,
          lastSeen: now,
          occurrenceCount: 1,
          affectedUsers: data.context?.userId ? new Set([data.context.userId]) : new Set(),
          affectedOrganizations: data.context?.organizationId
            ? new Set([data.context.organizationId])
            : new Set(),
        },
      });
    }
  }

  getFingerprint(fingerprintId: string): ErrorFingerprint | undefined {
    return this.fingerprintCache.get(fingerprintId);
  }

  getAllFingerprints(): ErrorFingerprint[] {
    return Array.from(this.fingerprintCache.values());
  }

  getFingerprintsByErrorCode(errorCode: ErrorCode): ErrorFingerprint[] {
    return this.getAllFingerprints().filter(fp => fp.errorCode === errorCode);
  }

  getMostFrequentFingerprints(limit: number = 10): ErrorFingerprint[] {
    return this.getAllFingerprints()
      .sort((a, b) => b.metadata.occurrenceCount - a.metadata.occurrenceCount)
      .slice(0, limit);
  }

  getRecentFingerprints(minutes: number = 60): ErrorFingerprint[] {
    const cutoff = new Date(Date.now() - minutes * 60 * 1000).toISOString();
    return this.getAllFingerprints().filter(
      fp => fp.metadata.lastSeen > cutoff
    );
  }

  clearOldFingerprints(olderThanHours: number = 24): void {
    const cutoff = new Date(Date.now() - olderThanHours * 60 * 60 * 1000).toISOString();

    for (const [id, fingerprint] of this.fingerprintCache.entries()) {
      if (fingerprint.metadata.lastSeen < cutoff) {
        this.fingerprintCache.delete(id);
      }
    }
  }

  getStatistics(): {
    totalFingerprints: number;
    totalOccurrences: number;
    uniqueUsers: number;
    uniqueOrganizations: number;
    errorsByCode: Record<string, number>;
  } {
    const fingerprints = this.getAllFingerprints();
    const allUsers = new Set<string>();
    const allOrgs = new Set<string>();
    const errorsByCode: Record<string, number> = {};

    let totalOccurrences = 0;

    fingerprints.forEach(fp => {
      totalOccurrences += fp.metadata.occurrenceCount;
      fp.metadata.affectedUsers.forEach(user => allUsers.add(user));
      fp.metadata.affectedOrganizations.forEach(org => allOrgs.add(org));
      errorsByCode[fp.errorCode] = (errorsByCode[fp.errorCode] || 0) + fp.metadata.occurrenceCount;
    });

    return {
      totalFingerprints: fingerprints.length,
      totalOccurrences,
      uniqueUsers: allUsers.size,
      uniqueOrganizations: allOrgs.size,
      errorsByCode,
    };
  }
}

export const errorFingerprintGenerator = ErrorFingerprintGenerator.getInstance();
