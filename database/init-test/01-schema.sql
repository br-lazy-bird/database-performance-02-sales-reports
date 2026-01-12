-- Customers Table
  CREATE TABLE IF NOT EXISTS customer (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      company VARCHAR(100),
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  -- Orders Table
  CREATE TABLE IF NOT EXISTS orders (
      id SERIAL PRIMARY KEY,
      customer_id INTEGER NOT NULL,
      order_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'processing', 'shipped', 'delivered', 'cancelled')),
      notes TEXT,
      CONSTRAINT fk_customer
          FOREIGN KEY (customer_id)
          REFERENCES customer(id)
          ON DELETE CASCADE
  );

  -- Order Items Table
  CREATE TABLE IF NOT EXISTS order_item (
      id SERIAL PRIMARY KEY,
      order_id INTEGER NOT NULL,
      product_name VARCHAR(200) NOT NULL,
      quantity INTEGER NOT NULL CHECK (quantity > 0),
      unit_price DECIMAL(10,2) NOT NULL CHECK (unit_price >= 0),
      CONSTRAINT fk_order
          FOREIGN KEY (order_id)
          REFERENCES orders(id)
          ON DELETE CASCADE
  );

  -- Indexes for foreign keys (standard practice)
  CREATE INDEX idx_order_customer_id ON orders(customer_id);
  CREATE INDEX idx_order_item_order_id ON order_item(order_id);

  -- Index for email lookups
  CREATE INDEX idx_customer_email ON customer(email);
