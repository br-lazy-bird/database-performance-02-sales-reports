import React from "react";
import OrdersReport from "./components/OrdersReport/OrdersReport";
import "./App.css";

const App: React.FC = () => {
  return (
    <div className="container">
      <div className="app-wrapper">
        <h1 className="page-title">Lazy Bird</h1>
        <OrdersReport />
      </div>
    </div>
  );
};

export default App;
