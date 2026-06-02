export interface AISlashLaunchOptions {
  productName: string;
  category: string;
  pricePerSlot: number;
  totalValue: number;
  noOfSlots: number;
  quantity: number;
  emoji?: string;
  timeLimit: string;
  hubName: string;
  hubCity: string;
  hubState: string;
}

export interface AIProductCopyOptions {
  name: string;
  category: string;
  description?: string;
  emoji?: string;
  noOfSlots: number;
  totalValue: number;
  quantity: number;
}

export interface AIResponseResult {
  text: string;
  metadata?: Record<string, unknown>;
}
