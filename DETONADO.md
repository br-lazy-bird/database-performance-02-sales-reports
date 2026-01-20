# DETONADO: Orders Report System Optimization

## Learning Objectives

By completing this guide, you will learn:

- What the N+1 query problem is and how it occurs across all ORM frameworks
- How to identify N+1 queries using query logs and performance metrics
- The difference between lazy loading and eager loading strategies
- How to implement eager loading to solve the N+1 problem (using SQLAlchemy)
- Best practices for ORM query optimization applicable to any framework

---

## Problem Identification

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

Take note of these numbers, they represent the **broken state** of the system.

---

## Understanding the Problem

### What is the N+1 Query Problem?

The **N+1 query problem** is a common performance issue that occurs across virtually all ORM frameworks, regardless of programming language or database technology.

**The Pattern:**
1. You execute **1 query** to fetch a list of N items
2. For each item, the ORM executes **1 additional query** to fetch related data
3. **Total: 1 + N queries** (hence "N+1")

This pattern is language-agnostic and affects virtually all ORMs: SQLAlchemy, Django ORM, Hibernate, JPA, ActiveRecord, TypeORM, Sequelize, Entity Framework, Doctrine, and more.

### Why ORMs Create This Problem

Most ORMs use **lazy loading** by default, related data is only fetched when you access it in code. This is convenient for small datasets but becomes a bottleneck when processing collections with relationships.

**Example in SQLAlchemy (Python):**
```python
# This looks like one query...
orders = session.query(Orders).all()

# But this triggers N queries (one per order):
for order in orders:
    print(order.customer.name)  # Query 1, Query 2, Query 3...
    print(len(order.items))     # Query 501, Query 502, Query 503...
```

---

## Diagnosis and Root Cause Analysis

### Step 1: Examine the Backend Logs

In order to see the logs, you can execute `make logs`. 

Look at your terminal running the backend service. You should logs related to each `order_id` , that looks like this:

```sql

SELECT customer.id AS customer_id, customer.name AS customer_name, customer.email AS customer_email, customer.company AS customer_company, customer.created_at AS customer_created_at
FROM customer
WHERE customer.id = %(pk_1)s::INTEGER

...

SELECT order_item.id AS order_item_id, order_item.order_id AS order_item_order_id, order_item.product_name AS order_item_product_name, order_item.quantity AS order_item_quantity, order_item.unit_price AS order_item_unit_price
FROM order_item
WHERE %(param_1)s::INTEGER = order_item.order_id
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

### Understanding Eager Loading

**Eager loading** is the solution to the N+1 problem. Instead of loading related data on-demand (lazy), eager loading fetches all necessary data upfront using optimized queries.

**Core Concept:**
The ORM constructs queries that fetch both the main records AND their related data in a minimal number of database round-trips, typically using one of two strategies:

### 1. JOIN-Based Loading
- **How it works:** Uses SQL JOIN clauses to fetch related data in a single query
- **Best for:** One-to-one or many-to-one relationships
- **Database impact:** Single query, but result set contains duplicate rows
- **Memory impact:** Potentially larger result set due to row duplication

**SQL Example:**
```sql
SELECT orders.*, customers.*
FROM orders
LEFT JOIN customers ON orders.customer_id = customers.id;
```

### 2. Separate Query Loading (Batched)
- **How it works:** Fetches related data in a separate query using IN clause
- **Best for:** One-to-many relationships with many related records
- **Database impact:** 2-3 queries total (still much better than N+1)
- **Memory impact:** More efficient, no row duplication

**SQL Example:**
```sql
-- Query 1: Fetch main records
SELECT * FROM orders;

-- Query 2: Fetch all related records in one batch
SELECT * FROM order_items
WHERE order_id IN (1, 2, 3, ..., 500);
```

### Strategy Selection Guide

| Strategy | Best For | Trade-offs |
|----------|----------|------------|
| **JOIN-based** | One-to-one or many-to-one relationships | Single query but potential row duplication |
| **Separate query** | One-to-many with large datasets | Multiple queries but no duplication |

**For our orders report case:**
- **Customer relationship:** One order → one customer (use JOIN-based)
- **Items relationship:** One order → many items (use separate query strategy)

### Implementation in SQLAlchemy

SQLAlchemy provides specific functions to implement these strategies:

1. **`joinedload()`** - Implements JOIN-based loading
2. **`selectinload()`** - Implements separate query loading with SELECT IN

### Step 1: Modify the Repository

Open `backend/app/repositories/orders.py` and update the `get_all_orders` method:

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

Go back to the frontend (http://localhost:3000) and click "Load Report" again.

**Expected Results:**

| Metric | Before | After |
|--------|--------|-------|
| Query Count | ~685 queries | **2 queries** |
| Execution Time | 200-300ms | **30-80ms** (3-5x faster) |
| Data Completeness | 500 orders | 500 orders (unchanged) |

**What Changed:**
Instead of 685 individual queries (1 for orders + 500 for customers + 500 for items), the ORM now executes:
1. **Query 1:** JOIN to fetch orders + customers in one query
2. **Query 2:** IN clause to fetch all order items in one batch query

The optimization **does not change the output**, only the efficiency. All data should display correctly with dramatically improved performance.

---

## Beyond the Basics

This guide covered the fundamental N+1 problem and its solution using eager loading. For production use, you'll need to consider additional topics:

**Advanced Topics:**
- Deep/nested relationships (chaining eager loading)
- Pagination strategies with eager loading
- When NOT to use eager loading (conditional access, very large datasets)
- Query performance monitoring and alerting
- Database indexing for optimal eager loading performance

**Learn More:**
- **General N+1 concepts:** [Understanding the N+1 Query Problem](https://secure.phabricator.com/book/phabcontrib/article/n_plus_one/)
- **SQLAlchemy specifics:** [Relationship Loading Techniques](https://docs.sqlalchemy.org/en/20/orm/queryguide/relationships.html)
- **Other ORMs:** Django ([select_related](https://docs.djangoproject.com/en/stable/ref/models/querysets/#select-related)), Hibernate ([Fetching](https://docs.jboss.org/hibernate/orm/current/userguide/html_single/Hibernate_User_Guide.html#fetching)), ActiveRecord ([Eager Loading](https://guides.rubyonrails.org/active_record_querying.html#eager-loading-associations))

---

## Key Takeaways

**What You Learned:**
- The N+1 problem is universal across all ORMs (Python, Java, Ruby, JavaScript, .NET, PHP)
- Lazy loading is convenient but creates performance bottlenecks at scale
- Eager loading solves N+1 by fetching related data upfront using JOINs or batched queries
- Use JOIN-based loading for one-to-one/many-to-one, batched loading for one-to-many
- Profile first, optimize strategically, and always measure the impact

**Results Achieved:**
- 99% fewer queries (685 → 2)
- 3-5x faster response time
- Same functionality, better performance

---

> "Oh, you actually fixed it? Nice... I mean, I knew you could do it. That's why I picked you, obviously."
>
> "Eager loading, huh? Yeah, I was gonna suggest that... eventually. Anyway, thanks for the help. I'm gonna go back to my nap now. But hey, if I find another bug, I know who to call..."

**Ready for more challenges?** Check out the other broken systems in the Lazy Bird repository to learn about different optimization patterns!



git clone --recurse-submodules git@github.com:br-lazy-bird/lazy-bird.git