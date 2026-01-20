import { useState } from "react";
import { OrdersReportResponse } from "../../types/order";
import { Card } from "../../shared-components/Card";
import { LoadingSpinner } from "../../shared-components/LoadingSpinner";
import { ErrorDisplay } from "../../shared-components/ErrorDisplay";
import { MetricsFooter } from "../../shared-components/MetricsFooter";
import OrdersTable from "./OrdersTable";
import "./OrdersReport.css";

const API_ENDPOINT = "/orders/report";

const OrdersReport: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<OrdersReportResponse | null>(null);

  const loadReport = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(API_ENDPOINT);
      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }
      const result: OrdersReportResponse = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load report");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <h2 className="ordersReportTitle">Orders Report</h2>

      <div className="ordersReportDescription">
        <div className="dialogue">
          <img src="/lazy-bird.png" alt="Lazy Bird" className="mascot-icon" />
          <p>
            "So, this is the orders report I mentioned in the <a href="https://github.com/br-lazy-bird/database-performance-02-orders-reports/blob/main/README.md#the-problem" target="_blank" rel="noopener noreferrer">README</a>...
            The sales team needs it for their meeting but it takes forever to load. It's just 500 orders but the system is struggling.
            The backend logs look... busy. I'd investigate more but I have a really important staring contest with my ceiling scheduled, so...
            could you load that report and figure out why it's so slow? Thanks!"
          </p>
        </div>
        <div className="note">
          <p>
            Note that orders are constantly being updated throughout the day, with
            new orders coming in and existing orders being modified every few seconds.
            This means caching solutions would not be practical for this real-time
            reporting requirement.
          </p>
        </div>
      </div>

      {!loading && (
        <div className="loadButtonContainer">
          <button className="button" onClick={loadReport}>
            Load Report
          </button>
        </div>
      )}

      {loading && !data && <LoadingSpinner message="Loading report..." />}

      {loading && data && (
        <div style={{ marginBottom: "20px" }}>
          <LoadingSpinner message="Reloading report..." />
        </div>
      )}

      {error && <ErrorDisplay message={error} />}

      {data && (
        <>
          <OrdersTable orders={data.report} />
          <MetricsFooter
            metrics={[
              {
                label: "Query Count",
                value: data.metadata.query_count.toString(),
              },
              {
                label: "Execution Time",
                value: `${data.metadata.execution_time_ms.toFixed(2)}ms`,
              },
            ]}
          />
        </>
      )}
    </Card>
  );
};

export default OrdersReport;
