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

// Fetch products
app.get('/api/products', async (req, res) => {
  try {
    await sql.connect(config);
    const result = await sql.query(`
      SELECT 
        ProductId,
        ProductName,
        CostPrice,
        SellingPrice,
        Stock,
        ProductTypeId
      FROM Products
      FOR JSON PATH, ROOT('Products')
    `);
    
    // Send the result directly
    res.json(result.recordset[0]);  // JSON is in the first element of recordset
  } catch (err) {
    console.error('Error fetching data:', err);
    res.status(500).send('Error fetching products');
  } finally {
    await sql.close();
  }
});

app.get('/api/sales-trend/daily', async (req, res) => {
  const { year, month } = req.query;
  try {
    await sql.connect(config);
    const result = await sql.query(`
      SELECT
        DAY(SaleDateTime) AS Day,
        SUM(SalePrice * Quantity) AS TotalSales
      FROM Receipts
      JOIN SalesDetail ON Receipts.ReceiptId = SalesDetail.ReceiptId
      WHERE YEAR(SaleDateTime) = ${year} AND MONTH(SaleDateTime) = ${month}
      GROUP BY DAY(SaleDateTime)
      ORDER BY Day;
    `);
    res.json(result.recordset);
  } catch (err) {
    console.error('Error fetching sales data:', err);
    res.status(500).send('Error fetching sales trend');
  } finally {
    await sql.close();
  }
});

app.get('/api/sales-trend/monthly', async (req, res) => {
  const { year } = req.query;
  try {
    await sql.connect(config);
    const result = await sql.query(`
      SELECT
        MONTH(SaleDateTime) AS Month,
        SUM(SalePrice * Quantity) AS TotalSales
      FROM Receipts
      JOIN SalesDetail ON Receipts.ReceiptId = SalesDetail.ReceiptId
      WHERE YEAR(SaleDateTime) = ${year}
      GROUP BY MONTH(SaleDateTime)
      ORDER BY Month;
    `);
    res.json(result.recordset);
  } catch (err) {
    console.error('Error fetching sales data:', err);
    res.status(500).send('Error fetching sales trend');
  } finally {
    await sql.close();
  }
});

app.get('/api/profit-trend/daily', async (req, res) => {
  const { year, month } = req.query;
  try {
    await sql.connect(config);
    const result = await sql.query(`
      SELECT
        DAY(SaleDateTime) AS Day,
        SUM((SalePrice - CostPrice) * Quantity) AS TotalProfit
      FROM Receipts
      JOIN SalesDetail ON Receipts.ReceiptId = SalesDetail.ReceiptId
      JOIN Products ON SalesDetail.ProductId = Products.ProductId
      WHERE YEAR(SaleDateTime) = ${year} AND MONTH(SaleDateTime) = ${month}
      GROUP BY DAY(SaleDateTime)
      ORDER BY Day;
    `);
    res.json(result.recordset);
  } catch (err) {
    console.error('Error fetching profit data:', err);
    res.status(500).send('Error fetching profit trend');
  } finally {
    await sql.close();
  }
});

app.get('/api/profit-trend/monthly', async (req, res) => {
  const { year } = req.query;
  try {
    await sql.connect(config);
    const result = await sql.query(`
      SELECT
        MONTH(SaleDateTime) AS Month,
        SUM((SalePrice - CostPrice) * Quantity) AS TotalProfit
      FROM Receipts
      JOIN SalesDetail ON Receipts.ReceiptId = SalesDetail.ReceiptId
      JOIN Products ON SalesDetail.ProductId = Products.ProductId
      WHERE YEAR(SaleDateTime) = ${year}
      GROUP BY MONTH(SaleDateTime)
      ORDER BY Month;
    `);
    res.json(result.recordset);
  } catch (err) {
    console.error('Error fetching profit data:', err);
    res.status(500).send('Error fetching profit trend');
  } finally {
    await sql.close();
  }
});

app.get('/api/receipts', async (req, res) => {
  const { date } = req.query;
  try {
    await sql.connect(config);
    const result = await sql.query(`
      SELECT 
        ReceiptId, 
        SaleDateTime, 
        TotalAmount
      FROM Receipts
      WHERE CAST(SaleDateTime AS DATE) = '${date}';
    `);
    res.json(result.recordset);
  } catch (err) {
    console.error('Error fetching receipts:', err);
    res.status(500).send('Error fetching receipts');
  } finally {
    await sql.close();
  }
});

app.get('/api/receipt-details', async (req, res) => {
  const { receiptId } = req.query;
  try {
    await sql.connect(config);
    const result = await sql.query(`
      SELECT 
        ProductName, 
        Quantity, 
        SalePrice, 
        (SalePrice * Quantity) AS TotalPrice
      FROM SalesDetail
      JOIN Products ON SalesDetail.ProductId = Products.ProductId
      WHERE ReceiptId = ${receiptId};
    `);
    res.json(result.recordset);
  } catch (err) {
    console.error('Error fetching receipt details:', err);
    res.status(500).send('Error fetching receipt details');
  } finally {
    await sql.close();
  }
});

app.listen(port, () => {
  console.log(`API running on http://localhost:${port}`);
});
