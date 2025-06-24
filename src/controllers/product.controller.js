const db = require('../models/db');
const stockController = require('./stock.controller'); // Importa o controller de estoque

exports.getAll = (req, res) => {
  db.all('SELECT * FROM products', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
};

exports.getById = (req, res) => {
  db.get('SELECT * FROM products WHERE id = ?', [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Produto não encontrado' });
    res.json(row);
  });
};

exports.create = (req, res) => {
  const { name, quantity, categoryId } = req.body;
  db.run(
    'INSERT INTO products (name, quantity, categoryId) VALUES (?, ?, ?)',
    [name, quantity, categoryId],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ id: this.lastID, name, quantity, categoryId });
    }
  );
};

exports.update = (req, res) => {
  const { name, quantity, categoryId } = req.body;
  db.run(
    'UPDATE products SET name = ?, quantity = ?, categoryId = ? WHERE id = ?',
    [name, quantity, categoryId, req.params.id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'Produto atualizado' });
    }
  );
};

exports.remove = (req, res) => {
  db.run('DELETE FROM products WHERE id = ?', [req.params.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Produto removido' });
  });
};

// Adiciona quantidade ao produto
exports.addStock = (req, res) => {
  const { quantity } = req.body;
  const productId = req.params.id;

  if (!quantity || quantity <= 0) {
    return res.status(400).json({ error: 'Informe uma quantidade positiva para adicionar.' });
  }

  db.get('SELECT quantity FROM products WHERE id = ?', [productId], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Produto não encontrado' });

    const newQuantity = row.quantity + quantity;
    db.run('UPDATE products SET quantity = ? WHERE id = ?', [newQuantity, productId], function (err2) {
      if (err2) return res.status(500).json({ error: err2.message });

      // Registra movimentação de entrada
      const date = new Date().toISOString();
      db.run(
        'INSERT INTO stock (productId, quantity, type, date) VALUES (?, ?, ?, ?)',
        [productId, quantity, 'in', date],
        function (err3) {
          if (err3) return res.status(500).json({ error: err3.message });
          res.json({ message: `Adicionado ${quantity} itens ao produto ${productId}.` });
        }
      );
    });
  });
};

// Remove quantidade do produto
exports.removeStock = (req, res) => {
  const { quantity } = req.body;
  const productId = req.params.id;

  if (!quantity || quantity <= 0) {
    return res.status(400).json({ error: 'Informe uma quantidade positiva para remover.' });
  }

  db.get('SELECT quantity FROM products WHERE id = ?', [productId], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Produto não encontrado' });

    if (row.quantity < quantity) {
      return res.status(400).json({ error: 'Quantidade insuficiente em estoque.' });
    }

    const newQuantity = row.quantity - quantity;
    db.run('UPDATE products SET quantity = ? WHERE id = ?', [newQuantity, productId], function (err2) {
      if (err2) return res.status(500).json({ error: err2.message });

      // Registra movimentação de saída
      const date = new Date().toISOString();
      db.run(
        'INSERT INTO stock (productId, quantity, type, date) VALUES (?, ?, ?, ?)',
        [productId, quantity, 'out', date],
        function (err3) {
          if (err3) return res.status(500).json({ error: err3.message });
          res.json({ message: `Removido ${quantity} itens do produto ${productId}.` });
        }
      );
    });
  });
};
