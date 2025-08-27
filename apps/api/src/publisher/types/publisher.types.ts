export type ProcessJob = {
  submissionId: number;
  traceId?: string;
  filePath?: string;
};

export type ReevalJob = {
  submissionId: number;
  traceId?: string;
};

export type JobData = ProcessJob | ReevalJob;
