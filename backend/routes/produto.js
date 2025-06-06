const express = require('express');
const router = express.Router();
const Produto = require('../models/Produto');

// Listar produtos
router.get('/', async (req, res) => {
    const produtos = await Produto.find();
    res.json(produtos);
});

// Adicionar produto
router.post('/', async (req, res) => {
    const novoProduto = new Produto(req.body);
    await novoProduto.save();
    res.json(novoProduto);
});

// Atualizar produto
router.put('/:id', async (req, res) => {
    const produtoAtualizado = await Produto.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(produtoAtualizado);
});

// Remover produto
router.delete('/:id', async (req, res) => {
    await Produto.findByIdAndDelete(req.params.id);
    res.json({ message: 'Produto removido!' });
});

module.exports = router;
