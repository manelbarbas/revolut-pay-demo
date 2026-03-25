export interface Config {
  revolutPublicKey: string;
}

export interface CreateOrderResponse {
  description: string;
  revolutPublicOrderId: string;
  state: string;
}

export interface PaymentEvent {
  type: 'success' | 'error' | 'cancel';
  error?: {
    message: string;
    code?: string;
  };
  dropOffState?: string;
}

export type StatusType = 'success' | 'error' | 'warning';

export interface Status {
  type: StatusType;
  title: string;
  content: string;
}

export interface LineItem {
  name: string;
  quantity: number;
  unitPriceAmount: number;
  unitPriceCurrency: string;
  totalPriceAmount: number;
  totalPriceCurrency: string;
}
