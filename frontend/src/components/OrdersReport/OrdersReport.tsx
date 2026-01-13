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
        <p>
          The orders report system has been experiencing performance degradation.
          Management has reported that generating the daily orders report is taking
          significantly longer than it should, impacting operational efficiency.
        </p>
        <div className="note">
          <p>
            Note that orders are constantly being updated throughout the day, with
            new orders coming in and existing orders being modified every few seconds.
            This means caching solutions would not be practical for this real-time
            reporting requirement.
          </p>
        </div>
        <p>
          Click the button below to load the orders report and observe the load time.
          The system needs investigation to identify why report generation is so slow.
        </p>
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
