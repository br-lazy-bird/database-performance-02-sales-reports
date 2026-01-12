"""
End-to-end integration test for sales reports API.
Tests the complete flow: API -> Service -> Repository -> Database
"""

import httpx


def test_orders_report_endpoint_e2e(api_url):
    """
    E2E test for /orders/report endpoint.

    Validates:
    - Backend API is running and accessible
    - Orders Service successfully connects to database
    - Backend successfully retrieves all orders with relationships
    - Response contains report array with order data
    - Metadata includes execution time and query count
    - Each order has expected fields (order_id, customer_name, item_count, etc.)
    """

    # Make request to backend API endpoint via HTTP
    with httpx.Client(timeout=30.0) as client:
        response = client.get(f"{api_url}/orders/report")

        # Validate successful response
        if response.status_code != 200:
            print(f"\nError response: {response.text}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("\nSUCCESS: API endpoint returned 200 OK")

        data = response.json()

        # Validate top-level structure
        assert "report" in data, "Missing report in response"
        assert "metadata" in data, "Missing metadata in response"
        print("SUCCESS: Response has correct top-level structure")

        # Validate report is a list
        report = data["report"]
        assert isinstance(report, list), "Report should be a list"
        assert len(report) > 0, "Should return at least one order"
        print(f"SUCCESS: Retrieved {len(report)} orders")

        # Validate first order structure
        first_order = report[0]
        assert "order_id" in first_order, "Missing order_id in order"
        assert "customer_name" in first_order, "Missing customer_name in order"
        assert "item_count" in first_order, "Missing item_count in order"
        assert "order_date" in first_order, "Missing order_date in order"
        assert "status" in first_order, "Missing status in order"
        assert "total" in first_order, "Missing total in order"
        print("SUCCESS: Order structure is valid")

        # Validate data types for first order
        assert isinstance(first_order["order_id"], int), "order_id should be an integer"
        assert isinstance(first_order["customer_name"], str), "customer_name should be a string"
        assert isinstance(first_order["item_count"], int), "item_count should be an integer"
        assert isinstance(first_order["status"], str), "status should be a string"
        assert isinstance(first_order["total"], (int, float)), "total should be a number"
        assert len(first_order["customer_name"]) > 0, "customer_name should not be empty"
        assert first_order["item_count"] > 0, "item_count should be positive"
        print(f"SUCCESS: Order data valid - Order {first_order['order_id']} from {first_order['customer_name']}")

        # Validate metadata structure
        metadata = data["metadata"]
        assert "total_orders" in metadata, "Missing total_orders in metadata"
        assert "execution_time_ms" in metadata, "Missing execution_time_ms in metadata"
        assert "query_count" in metadata, "Missing query_count in metadata"
        print("SUCCESS: Metadata structure is valid")

        # Validate metadata data types and values
        assert isinstance(metadata["total_orders"], int), "total_orders should be an integer"
        assert isinstance(metadata["execution_time_ms"], (int, float)), "execution_time_ms should be a number"
        assert isinstance(metadata["query_count"], int), "query_count should be an integer"
        assert metadata["total_orders"] == len(report), "total_orders should match report length"
        assert metadata["execution_time_ms"] >= 0, "execution_time_ms should be non-negative"
        assert metadata["query_count"] > 0, "query_count should be positive (N+1 problem visible)"
        print(f"SUCCESS: Metadata valid - Execution time: {metadata['execution_time_ms']}ms, Queries: {metadata['query_count']}")

        print("\n" + "=" * 70)
        print("E2E TEST PASSED: Sales reports endpoint working correctly!")
        print("=" * 70)
        print(f"\nComplete response:")
        print(f"  Total orders: {len(report)}")
        print(f"  Sample order: Order {first_order['order_id']} from {first_order['customer_name']}")
        print(f"  Sample order items: {first_order['item_count']}")
        print(f"  Execution time: {metadata['execution_time_ms']}ms")
        print(f"  Query count: {metadata['query_count']} (N+1 problem demonstration)")
        print("=" * 70)
