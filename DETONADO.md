# DETONADO: Sales Reports System Optimization

## Learning Objectives

By completing this guide, you will learn:

- What the N+1 query problem is and how it occurs in ORM applications
- How to identify N+1 queries using query logs and performance metrics
- The difference between lazy loading and eager loading in SQLAlchemy
- How to use `joinedload()` and `selectinload()` for query optimization
- Best practices for ORM query optimization in production

---

## Problem Identification

### Step 1: Establish Baseline Performance

Start the application and observe the current behavior:

```bash
# Ensure the system is running
make run

# Open the frontend
open http://localhost:3000
```

Click the "Load Report" button and observe the metrics at the bottom:

**Expected Baseline:**
- **Query Count:** ~685 queries
- **Execution Time:** 200-300ms (depends on your machine)
- **Total Orders:** 500

Take note of these numbers—they represent the **broken state** of the system.

### Step 2: Initial Questions

Before we diagnose, ask yourself:

1. Why would generating a report of 500 orders require 685 database queries?
2. What relationship does 685 have to the data structure (500 orders, 200 customers, ~2000 order items)?
3. What data does each order need to display?

Think about this for a moment before continuing.

---

## Understanding the Problem

### What is the N+1 Query Problem?

The **N+1 query problem** is a common performance issue when using ORMs (Object-Relational Mappers) like SQLAlchemy, Hibernate, or Django ORM.

**The Pattern:**
1. You execute **1 query** to fetch a list of N items
2. For each item, the ORM executes **1 additional query** to fetch related data
3. **Total: 1 + N queries** (hence "N+1")

**The Analogy:**

Imagine you're a librarian helping someone find information about 500 authors:

**Inefficient (N+1 Problem):**
```
1. Get list of 500 author names from main catalog (1 query)
2. For each author:
   - Walk to biography section to get their birthplace (500 queries)
   - Walk to publications section to count their books (500 queries)
Total: 1 + 500 + 500 = 1,001 trips
```

**Efficient (Eager Loading):**
```
1. Get all author names, birthplaces, and book counts in one trip (1-3 queries total)
Total: 1-3 trips
```

### How ORMs Create This Problem

ORMs use **lazy loading** by default—related data is only fetched when accessed:

```python
# This looks like one query...
orders = session.query(Orders).all()

# But this triggers N queries (one per order):
for order in orders:
    print(order.customer.name)  # Query 1, Query 2, Query 3...
    print(len(order.items))     # Query 501, Query 502, Query 503...
```

This is **convenient** for development but **disastrous** for performance.

---

## Diagnosis and Root Cause Analysis

### Step 1: Examine the Backend Logs

Look at your terminal running the backend service. You should see logs like this:

```
INFO:     Returning report data with 500 orders (Query count: 685, Time: 245.67ms)
```

Now let's understand where these 685 queries come from.

### Step 2: Check the Database Logs (Optional)

If you want to see the actual SQL queries being executed, you can enable SQLAlchemy query logging:

```bash
# In backend container, the logs will show each query
docker logs sales_report_backend -f
```

You'll see patterns like:

```sql
-- Query 1: Fetch all orders
SELECT orders.id, orders.customer_id, orders.order_date, orders.status, orders.notes
FROM orders;

-- Query 2: Fetch customer for order 1
SELECT customer.id, customer.name, customer.email, customer.company
FROM customer
WHERE customer.id = 45;

-- Query 3: Fetch items for order 1
SELECT order_item.id, order_item.product_name, order_item.quantity, order_item.unit_price
FROM order_item
WHERE order_item.order_id = 1;

-- Query 4: Fetch customer for order 2
SELECT customer.id, customer.name, customer.email, customer.company
FROM customer
WHERE customer.id = 23;

-- Query 5: Fetch items for order 2
...
```

**See the pattern?** For each of the 500 orders:
- 1 query to fetch the customer
- 1 query to fetch the order items

**Total: 1 + 500 + 500 = 1,001 queries** (though some customers are repeated, SQL can cache some results, reducing it to ~685)

### Step 3: Find the Problematic Code

Open the repository file:

**File:** `backend/app/repositories/orders.py`

```python
def get_all_orders(self) -> list[Orders]:
    """
    Get all orders in the database.

    Returns:
        list[Orders]: All orders from the database.
    """
    return self.db.query(Orders).all()
```

This looks innocent, but it's using **lazy loading**. When the service layer accesses `order.customer` or `order.items`, SQLAlchemy issues new queries.

**File:** `backend/app/services/orders.py` (the part that triggers extra queries):

```python
order_data = {
    "order_id": order.id,
    "customer_name": order.customer.name,  # ← Lazy load: triggers query
    "item_count": len(order.items),        # ← Lazy load: triggers query
    "total": sum(item.quantity * item.unit_price for item in order.items),
    "order_date": order.order_date.isoformat(),
    "status": order.status,
}
```

Every time `order.customer` or `order.items` is accessed, SQLAlchemy fetches that data with a new query.

---

## Solution Implementation

### Understanding Eager Loading in SQLAlchemy

SQLAlchemy provides two main strategies for eager loading:

1. **`joinedload()`** - Uses SQL JOINs to fetch related data in the same query
2. **`selectinload()`** - Uses separate SELECT IN queries to fetch related data efficiently

**When to use which:**

| Strategy | Best For | Trade-offs |
|----------|----------|------------|
| `joinedload()` | One-to-one relationships, small related datasets | Can create large result sets with duplicates |
| `selectinload()` | One-to-many relationships, large related datasets | Multiple queries but more efficient than N+1 |

For our case:
- **Customer relationship:** One order → one customer (`joinedload`)
- **Items relationship:** One order → many items (`selectinload`)

### Step 1: Modify the Repository

Open `backend/app/repositories/orders.py` and update the `get_all_orders` method:

**BEFORE:**
```python
from sqlalchemy.orm import Session

from app.models.orders import Orders


class OrdersRepository:
    """
    Repository for Orders database operations.
    """

    def __init__(self, db: Session) -> None:
        self.db = db

    def get_all_orders(self) -> list[Orders]:
        """
        Get all orders in the database.

        Returns:
            list[Orders]: All orders from the database.
        """
        return self.db.query(Orders).all()
```

**AFTER:**
```python
from sqlalchemy.orm import Session, joinedload, selectinload

from app.models.orders import Orders


class OrdersRepository:
    """
    Repository for Orders database operations.
    """

    def __init__(self, db: Session) -> None:
        self.db = db

    def get_all_orders(self) -> list[Orders]:
        """
        Get all orders in the database with eager loading of relationships.

        Uses eager loading to prevent N+1 query problem:
        - joinedload for customer (one-to-one relationship)
        - selectinload for items (one-to-many relationship)

        Returns:
            list[Orders]: All orders from the database with related data.
        """
        return (
            self.db.query(Orders)
            .options(joinedload(Orders.customer))
            .options(selectinload(Orders.items))
            .all()
        )
```

**Key Changes:**
1. **Import the eager loading functions:** `joinedload` and `selectinload` from `sqlalchemy.orm`
2. **Apply `joinedload(Orders.customer)`:** Fetches customer data using a JOIN
3. **Apply `selectinload(Orders.items)`:** Fetches items using a SELECT IN query
4. **Update docstring:** Documents the optimization

### Step 2: Save and Restart

The backend has hot-reload enabled, so your changes should apply automatically. If not:

```bash
# Restart the backend service
make restart
```

Wait for the backend to be healthy (check logs or refresh frontend).

---

## Verification and Expected Results

### Step 1: Reload the Report

Go back to the frontend (http://localhost:3000) and click "Load Report" again.

**Expected Results:**

**BEFORE:**
- Query Count: ~685
- Execution Time: 200-300ms

**AFTER:**
- Query Count: **3** queries
- Execution Time: **30-80ms** (3-5x faster)

### Step 2: Understand the New Query Pattern

With eager loading, SQLAlchemy now executes:

**Query 1: Fetch all orders with customers (JOIN)**
```sql
SELECT orders.*, customer.*
FROM orders
LEFT OUTER JOIN customer ON customer.id = orders.customer_id;
```

**Query 2: Fetch all order items (SELECT IN)**
```sql
SELECT order_item.*
FROM order_item
WHERE order_item.order_id IN (1, 2, 3, ..., 500);
```

**Total: 2-3 queries** (depending on query execution plan)

### Step 3: Verify Data Completeness

Ensure the data is still correct:
- All 500 orders are displayed
- Customer names appear correctly
- Item counts are accurate
- Totals are calculated properly

The optimization should **not change the output**—only the efficiency.

### Success Criteria

✅ Query count reduced from ~685 to 3-5 queries (99% reduction)
✅ Execution time reduced by 50-80%
✅ All orders display complete data
✅ No errors in backend logs
✅ Frontend loads faster and shows improved metrics

---

## Production Considerations

### 1. Relationship Loading Strategies

**Beyond `joinedload` and `selectinload`:**

- **`subqueryload()`:** Uses subqueries instead of SELECT IN (good for older databases)
- **`raiseload()`:** Raises an error if lazy loading is attempted (prevents N+1 in development)
- **`lazyload()`:** Explicitly use lazy loading (sometimes needed for specific cases)

**Example using `raiseload` to catch N+1 problems:**

```python
from sqlalchemy.orm import raiseload

# This will raise an error if you forget eager loading
query = session.query(Orders).options(
    joinedload(Orders.customer),
    selectinload(Orders.items),
    raiseload('*')  # Prevent any other lazy loads
)
```

### 2. Handling Deep Relationships

What if order items also have related data (e.g., product details)?

```python
from sqlalchemy.orm import selectinload

orders = (
    db.query(Orders)
    .options(
        joinedload(Orders.customer),
        selectinload(Orders.items).selectinload(OrderItem.product)
    )
    .all()
)
```

You can chain eager loading for nested relationships.

### 3. Pagination with Eager Loading

For large datasets, combine eager loading with pagination:

```python
from sqlalchemy import func

def get_orders_paginated(db: Session, page: int = 1, per_page: int = 50):
    return (
        db.query(Orders)
        .options(joinedload(Orders.customer), selectinload(Orders.items))
        .offset((page - 1) * per_page)
        .limit(per_page)
        .all()
    )
```

### 4. Query Performance Monitoring

**In production, use these tools:**

- **SQLAlchemy Query Logging:** Log slow queries automatically
- **Database Query Analyzers:** pg_stat_statements (PostgreSQL), slow query log (MySQL)
- **APM Tools:** New Relic, Datadog, Sentry for query performance tracking
- **Custom Middleware:** Track query counts per request

**Example: Custom query counter middleware**

```python
from contextvars import ContextVar

query_count = ContextVar('query_count', default=0)

# In SQLAlchemy event listener:
@event.listens_for(Engine, "before_cursor_execute")
def count_query(conn, cursor, statement, parameters, context, executemany):
    count = query_count.get()
    query_count.set(count + 1)

# In FastAPI middleware:
@app.middleware("http")
async def track_queries(request: Request, call_next):
    query_count.set(0)
    response = await call_next(request)
    count = query_count.get()
    if count > 50:
        logger.warning(f"High query count: {count} queries for {request.url}")
    return response
```

### 5. When Eager Loading Might Not Be Ideal

**Scenarios where you might NOT want eager loading:**

- **Very large related datasets:** If each order had 10,000 items, eagerly loading all items might use too much memory
- **Conditional access:** If you only access relationships for a few records, lazy loading might be more efficient
- **Write-heavy operations:** Bulk inserts/updates don't need eager loading

**Alternatives:**

- Use pagination with eager loading
- Use `defer()` to exclude large columns from initial load
- Use separate endpoints for detailed views

### 6. Database Index Optimization

Eager loading is more effective with proper indexes:

```sql
-- Ensure foreign key columns are indexed
CREATE INDEX idx_order_customer_id ON orders(customer_id);
CREATE INDEX idx_order_item_order_id ON order_item(order_id);
```

These indexes are already present in this system, but verify them in production.

---

## Key Takeaways

### When to Use Eager Loading

✅ **DO use eager loading when:**
- You know you'll access related data for all/most records
- Relationships have a reasonable size (not millions of related records)
- You're displaying lists or reports that need complete data
- You can predict which relationships will be accessed

### When NOT to Use Eager Loading

❌ **DON'T use eager loading when:**
- Related data is only needed conditionally
- Related datasets are extremely large
- You're doing bulk operations that don't need the data
- Memory usage is a concern

### Best Practices

1. **Profile first:** Always measure before optimizing
2. **Use eager loading strategically:** Not every query needs it
3. **Monitor query counts:** Set alerts for N+1 patterns in production
4. **Test thoroughly:** Ensure eager loading doesn't break functionality
5. **Document why:** Explain eager loading decisions in code comments

---

## Further Reading

- [SQLAlchemy Relationship Loading Techniques](https://docs.sqlalchemy.org/en/20/orm/queryguide/relationships.html)
- [Understanding the N+1 Query Problem](https://secure.phabricator.com/book/phabcontrib/article/n_plus_one/)
- [SQLAlchemy Performance Tips](https://docs.sqlalchemy.org/en/20/faq/performance.html)

---

## Congratulations!

You've successfully diagnosed and fixed the N+1 query problem! Your system now:

- Executes 99% fewer database queries
- Responds 3-5x faster
- Uses the same amount of memory
- Maintains data integrity and completeness

The skills you've learned here apply to any ORM in any language. Watch for the N+1 pattern in your future projects—it's one of the most common performance issues in web applications.

---

**Ready for more challenges?** Check out the other broken systems in the Lazy Bird repository to learn about different optimization patterns!
