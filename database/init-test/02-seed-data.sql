-- Sales Reports Test Seed Data
  -- Generates 50 customers, 100 orders, and ~300 order items
  -- Reduced dataset for faster test execution

  DO $$
  DECLARE
      first_names TEXT[] := ARRAY[
          'John', 'Jane', 'Michael', 'Sarah', 'David', 'Lisa', 'Robert', 'Emily',
          'William', 'Jessica', 'James', 'Ashley', 'Christopher', 'Amanda', 'Daniel',
          'Jennifer', 'Matthew', 'Stephanie', 'Anthony', 'Nicole', 'Mark', 'Elizabeth',
          'Donald', 'Helen', 'Steven', 'Deborah', 'Paul', 'Rachel', 'Andrew', 'Carolyn'
      ];
      last_names TEXT[] := ARRAY[
          'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
          'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson',
          'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson',
          'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson'
      ];
      companies TEXT[] := ARRAY[
          'Tech Solutions Inc', 'Global Enterprises', 'Innovation Labs', 'Digital Systems',
          'Cloud Services Co', 'Data Analytics Corp', 'Software Dynamics', 'Enterprise Tools',
          'Smart Solutions', 'Future Tech', 'Cyber Systems', 'Quantum Computing',
          'AI Innovations', 'Blockchain Corp', 'Mobile Apps Inc', 'Web Services Ltd'
      ];
      products TEXT[] := ARRAY[
          'Laptop Pro 15"', 'Wireless Mouse', 'Mechanical Keyboard', 'USB-C Hub',
          'External SSD 1TB', 'Monitor 27"', 'Webcam HD', 'Headphones Wireless',
          'Desk Lamp LED', 'Office Chair', 'Standing Desk', 'Cable Organizer',
          'Phone Stand', 'Laptop Sleeve', 'Power Bank', 'Ethernet Cable',
          'HDMI Cable', 'Screen Protector', 'Cleaning Kit', 'Mousepad XL'
      ];
      statuses TEXT[] := ARRAY['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
      customer_id_val INTEGER;
      order_id_val INTEGER;
      items_count INTEGER;
      i INTEGER;
      j INTEGER;
  BEGIN
      -- Generate 50 customers (vs 200 in dev)
      FOR i IN 1..50 LOOP
          INSERT INTO customer (name, email, company, created_at)
          VALUES (
              first_names[1 + (random() * (array_length(first_names, 1) - 1))::INTEGER] || ' ' ||
              last_names[1 + (random() * (array_length(last_names, 1) - 1))::INTEGER],
              'customer' || i || '@example.com',
              CASE
                  WHEN random() < 0.7 THEN companies[1 + (random() * (array_length(companies, 1) - 1))::INTEGER]
                  ELSE NULL
              END,
              CURRENT_TIMESTAMP - (random() * INTERVAL '730 days')
          );
      END LOOP;

      -- Generate 100 orders (vs 500 in dev)
      FOR i IN 1..100 LOOP
          -- Random customer (some customers will have multiple orders)
          customer_id_val := 1 + (random() * 49)::INTEGER;

          INSERT INTO orders (customer_id, order_date, status, notes)
          VALUES (
              customer_id_val,
              CURRENT_TIMESTAMP - (random() * INTERVAL '365 days'),
              statuses[1 + (random() * (array_length(statuses, 1) - 1))::INTEGER],
              CASE
                  WHEN random() < 0.3 THEN 'Customer requested expedited shipping'
                  WHEN random() < 0.3 THEN 'Gift wrap requested'
                  ELSE NULL
              END
          )
          RETURNING id INTO order_id_val;

          -- Generate 3-5 order items per order
          items_count := 3 + (random() * 2)::INTEGER;

          FOR j IN 1..items_count LOOP
              INSERT INTO order_item (order_id, product_name, quantity, unit_price)
              VALUES (
                  order_id_val,
                  products[1 + (random() * (array_length(products, 1) - 1))::INTEGER],
                  1 + (random() * 4)::INTEGER,  -- quantity 1-5
                  (10 + random() * 990)::DECIMAL(10,2)  -- price $10-$1000
              );
          END LOOP;
      END LOOP;

      RAISE NOTICE 'Test seed data created: 50 customers, 100 orders, ~300 order items';
  END $$;
