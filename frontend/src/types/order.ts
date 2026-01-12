export type OrderStatus =
  | 'pending'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

export interface Order {
  order_id: number;
  customer_name: string;
  item_count: number;
  total: number;
  order_date: string; // ISO 8601 format
  status: OrderStatus;
}

export interface OrdersReportResponse {
  report: Order[];
  metadata: {
    total_orders: number;
    execution_time_ms: number;
    query_count: number;
  };
}
