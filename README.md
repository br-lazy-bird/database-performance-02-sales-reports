# Orders Report System

An orders reporting system experiencing performance issues. Investigate why report generation is slow and optimize the backend to improve response times.

---

## Quick Start

### Prerequisites

- Docker and Docker Compose V2
- Make
- Git

### Running the System

```bash
# Copy environment file
cp .env.development .env

# Start all services (database, backend, frontend)
make run
```

The system will start three services:
- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:8000
- **PostgreSQL Database:** localhost:5432

**Note:** These are development credentials. Never use these in production.

---

## System Architecture

```
┌──────────────┐
│   Frontend   │
│  (React 19)  │
└──────┬───────┘
       │ HTTP Request
       ▼
┌──────────────┐
│   Backend    │
│   (FastAPI)  │
└──────┬───────┘
       │ SQLAlchemy ORM
       ▼
┌──────────────┐
│  PostgreSQL  │
│  (500 orders)│
└──────────────┘
```

### Tech Stack

- **Frontend:** React 19 with TypeScript
- **Backend:** FastAPI with Python 3.10+
- **Database:** PostgreSQL 15 with 500 orders, 200 customers, ~2000 order items
- **Infrastructure:** Docker Compose with hot-reload enabled

---

## Meet the Lazy Bird

> The Lazy Bird is a peculiar creature. It has an exceptional talent for catching bugs... but absolutely zero motivation to fix them. You'll find it wandering around codebases, spotting issues, and then immediately looking for someone else to do the hard work.
>
> Today, it found you.

---

## The Problem

> "Hey... so the sales team needs this orders report for their meeting, right? And they keep complaining that it takes forever to load."
>
> "I checked the metrics and... yeah, something's off. It's just 500 orders but the system is struggling. The backend logs look... busy."
>
> "I'd investigate more but I have a really important staring contest with my ceiling scheduled, so... could you take a look? Load that report and figure out why it's so slow. Thanks!"

**Your Mission:**

1. Investigate why the report generation is so slow
2. Diagnose the root cause of the performance issue
3. Implement the optimization to improve performance
4. Verify that the problem is resolved

**Important:** This system demonstrates a real-world database performance problem. Do NOT bypass the issue by reducing data volume or removing relationships. The goal is to optimize how the application interacts with the database.

**Note:** Orders are constantly being updated throughout the day, with new orders coming in and existing orders being modified every few seconds. This means caching solutions would not be practical for this real-time reporting requirement.

---

## Success Criteria

You'll know you've successfully optimized the system when:

- **Response time improves significantly:** The report loads much faster
- **The metrics show improvement:** The execution time visible in the frontend drops substantially
- **The data remains complete:** All orders still show customer names and item counts

The improvement should be immediately visible in the metrics footer displayed in the frontend after loading the report.

---

## How to Use the System

### Frontend Interface

1. Open http://localhost:3000 in your browser
2. Click the "Load Report" button
3. Observe the loading time (watch the spinner)
4. Once loaded, check the metrics at the bottom for performance data

The report displays a scrollable table with:
- Order ID
- Customer Name
- Number of Items
- Total Amount
- Order Date
- Order Status

### API Endpoints

**GET /orders/report**
- Returns the complete orders report with all orders
- Includes metadata: query_count, execution_time_ms, total_orders
- Response format:
  ```json
  {
    "report": [
      {
        "order_id": 1,
        "customer_name": "John Smith",
        "item_count": 3,
        "total": 450.50,
        "order_date": "2024-01-15T10:30:00",
        "status": "delivered"
      }
    ],
    "metadata": {
      "total_orders": 500,
      "query_count": 685,
      "execution_time_ms": 245.67
    }
  }
  ```

**GET /health**
- Health check endpoint
- Returns: `{"status": "healthy"}`

### Database Access

Connect to the PostgreSQL database to investigate:

```bash
# Access database shell
make db-shell

# Examine table structure
\d customer
\d orders
\d order_item

# Check indexes
\di

# View sample data
SELECT * FROM orders LIMIT 5;
SELECT * FROM customer LIMIT 5;
SELECT * FROM order_item LIMIT 10;
```

**Database Schema:**
- **customer:** id, name, email, company, created_at
- **orders:** id, customer_id (FK), order_date, status, notes
- **order_item:** id, order_id (FK), product_name, quantity, unit_price

---

## Running Tests

```bash
# Run tests (fast - uses cached images):
make test

# Rebuild and test (after code changes):
make test-build
```

The integration tests verify that:
- The `/orders/report` endpoint returns valid data
- All required fields are present in the response
- The system executes correctly with the expected data structure
- Performance metadata is tracked correctly

---

## Documentation

For detailed diagnostic guidance and step-by-step optimization instructions, see the [DETONADO Guide](./DETONADO.md).

The guide walks you through:
1. Identifying the performance bottleneck
2. Understanding the root cause of the slow performance
3. Implementing the optimization technique
4. Measuring the performance improvement
5. Production considerations for optimization

---

## Stopping the System

```bash
# Stop all services
make stop

# Remove all containers and volumes
make clean
```

---

Ready to start? Load the report and observe the performance metrics. Then dive into the DETONADO guide to learn how to optimize it!
