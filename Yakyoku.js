const express = require('express');
const sql = require('mssql');
const app = express();
const path = require('path');
const port = 3000;


const config = {
  user: 'sa',
  password: 'phillip',
  port: 60124,  
  server: 'localhost',
  database: 'DrugstoreSales',
  options: {
    encrypt: true,
    trustServerCertificate: true
  }
};

app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/products', async (req, res) => {
  try {
    await sql.connect(config);
    const result = await sql.query(`
      SELECT 
        ProductId,
        ProductName,
        Category,
        CostPrice,
        SellingPrice,
        Stock
      FROM Products
      FOR JSON PATH, ROOT('Products')
    `);
    res.json(result.recordset[0]);
  } catch (err) {
    console.error('Error fetching data:', err);
    res.status(500).send('Error fetching products');
  } finally {
    await sql.close();
  }
});

app.get('/api/sales', async (req, res) => {
  try {
    await sql.connect(config);
    const result = await sql.query(`
      SELECT 
        SaleId,
        TransactionId,
        ProductId,
        Quantity,
        TotalPrice
      FROM Sales
      FOR JSON PATH, ROOT('Sales')
    `);
    res.json(result.recordset[0]);
  } catch (err) {
    console.error('Error fetching sales:', err);
    res.status(500).send('Error fetching sales');
  } finally {
    await sql.close();
  }
});

app.get('/api/transactions', async (req, res) => {
  try {
    await sql.connect(config);
    const result = await sql.query(`
      SELECT 
        t.TransactionId,
        t.TransactionDate,
        s.SaleId,
        s.ProductId,
        s.Quantity,
        s.TotalPrice,
        p.ProductName
      FROM Transactions t
      LEFT JOIN Sales s ON t.TransactionId = s.TransactionId
      LEFT JOIN Products p ON s.ProductId = p.ProductId
      ORDER BY t.TransactionDate DESC
      FOR JSON PATH, ROOT('Transactions')
    `);
    res.json(result.recordset[0]);
  } catch (err) {
    console.error('Error fetching transactions:', err);
    res.status(500).send('Error fetching transactions');
  } finally {
    await sql.close();
  }
});

app.get('/api/transactions/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await sql.connect(config);
    const result = await sql.query(`
      SELECT 
        t.TransactionId,
        t.TransactionDate,
        s.SaleId,
        s.ProductId,
        s.Quantity,
        s.TotalPrice,
        p.ProductName,
        p.CostPrice,
        p.SellingPrice
      FROM Transactions t
      LEFT JOIN Sales s ON t.TransactionId = s.TransactionId
      LEFT JOIN Products p ON s.ProductId = p.ProductId
      WHERE t.TransactionId = ${id}
      FOR JSON PATH, ROOT('TransactionDetails')
    `);
    res.json(result.recordset[0] || { TransactionDetails: [] });
  } catch (err) {
    console.error('Error fetching transaction details:', err);
    res.status(500).json({ error: err.message });
  } finally {
    await sql.close();
  }
});

app.get('/api/sales/reports', async (req, res) => {
  const { date } = req.query;
  if (!date) return res.status(400).send('Date parameter is required');
  try {
    await sql.connect(config);
    const result = await sql.query(`
      SELECT 
        t.TransactionDate,
        s.ProductId,
        s.Quantity,
        s.TotalPrice,
        p.ProductName
      FROM Sales s
      JOIN Transactions t ON s.TransactionId = t.TransactionId
      JOIN Products p ON s.ProductId = p.ProductId
      WHERE CAST(t.TransactionDate AS DATE) = '${date}'
      ORDER BY t.TransactionDate;
    `);
    res.json({ salesReport: result.recordset });
  } catch (error) {
    console.error('Error fetching sales report:', error);
    res.status(500).json({ error: error.message });
  } finally {
    await sql.close();
  }
});

app.get('/api/sales/trends/daily', async (req, res) => {
  const { yearMonth } = req.query;
  if (!yearMonth) return res.status(400).json({ error: "yearMonth is required (e.g. 2025-04)" });
  try {
    await sql.connect(config);
    const result = await sql.query(`
      SELECT 
        CAST(t.TransactionDate AS DATE) AS SaleDate,
        SUM(s.TotalPrice) AS TotalSales
      FROM Transactions t
      JOIN Sales s ON t.TransactionId = s.TransactionId
      WHERE FORMAT(t.TransactionDate, 'yyyy-MM') = '${yearMonth}'
      GROUP BY CAST(t.TransactionDate AS DATE)
      ORDER BY SaleDate
      FOR JSON PATH, ROOT('DailySales')
    `);
    res.json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    await sql.close();
  }
});

app.get('/api/sales/trends/monthly', async (req, res) => {
  const { year } = req.query;
  if (!year) return res.status(400).json({ error: "year is required (e.g. 2025)" });
  try {
    await sql.connect(config);
    const result = await sql.query(`
      SELECT 
        FORMAT(t.TransactionDate, 'yyyy-MM') AS SaleMonth,
        SUM(s.TotalPrice) AS TotalSales
      FROM Transactions t
      JOIN Sales s ON t.TransactionId = s.TransactionId
      WHERE YEAR(t.TransactionDate) = ${year}
      GROUP BY FORMAT(t.TransactionDate, 'yyyy-MM')
      ORDER BY SaleMonth
      FOR JSON PATH, ROOT('MonthlySales')
    `);
    res.json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    await sql.close();
  }
});

app.get('/api/profit/trends/daily', async (req, res) => {
  const { yearMonth } = req.query;
  if (!yearMonth) return res.status(400).json({ error: "yearMonth is required (e.g. 2025-04)" });
  try {
    await sql.connect(config);
    const result = await sql.query(`
      SELECT 
        CAST(t.TransactionDate AS DATE) AS SaleDate,
        SUM((p.SellingPrice - p.CostPrice) * s.Quantity) AS TotalProfit
      FROM Transactions t
      JOIN Sales s ON t.TransactionId = s.TransactionId
      JOIN Products p ON s.ProductId = p.ProductId
      WHERE FORMAT(t.TransactionDate, 'yyyy-MM') = '${yearMonth}'
      GROUP BY CAST(t.TransactionDate AS DATE)
      ORDER BY SaleDate
      FOR JSON PATH, ROOT('DailyProfit')
    `);
    res.json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    await sql.close();
  }
});

app.get('/api/profit/trends/monthly', async (req, res) => {
  const { year } = req.query;
  if (!year) return res.status(400).json({ error: "the year is required (e.g. 2025)" });
  try {
    await sql.connect(config);
    const result = await sql.query(`
      SELECT 
        FORMAT(t.TransactionDate, 'yyyy-MM') AS SaleMonth,
        SUM((p.SellingPrice - p.CostPrice) * s.Quantity) AS TotalProfit
      FROM Transactions t
      JOIN Sales s ON t.TransactionId = s.TransactionId
      JOIN Products p ON s.ProductId = p.ProductId
      WHERE YEAR(t.TransactionDate) = ${year}
      GROUP BY FORMAT(t.TransactionDate, 'yyyy-MM')
      ORDER BY SaleMonth
      FOR JSON PATH, ROOT('MonthlyProfit')
    `);
    res.json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    await sql.close();
  }
});

app.listen(port, () => {
  console.log(`API running on http://localhost:${port}`);
});
