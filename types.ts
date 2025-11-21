export enum RestorationStatus {
  IDLE = 'IDLE',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR',
}

export interface RestorationItem {
  id: string;
  file: File;
  originalUrl: string;
  restoredUrl?: string;
  status: RestorationStatus;
  error?: string;
  width?: number;
  height?: number;
}

export interface Dimensions {
  width: number;
  height: number;
}
