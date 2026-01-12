import { Order } from "../../types/order";

interface OrdersTableProps {
  orders: Order[];
}

const OrdersTable: React.FC<OrdersTableProps> = ({ orders }) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  return (
    <div className="ordersTableContainer">
      <table className="ordersTable">
        <thead>
          <tr>
            <th>Order ID</th>
            <th>Customer Name</th>
            <th>Items</th>
            <th>Total</th>
            <th>Order Date</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.order_id}>
              <td>{order.order_id}</td>
              <td>{order.customer_name}</td>
              <td>{order.item_count}</td>
              <td>${order.total.toFixed(2)}</td>
              <td>{formatDate(order.order_date)}</td>
              <td>{order.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default OrdersTable;
