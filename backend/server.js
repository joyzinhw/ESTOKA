require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const Produto = require('./models/Produto');

const app = express();

app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log('MongoDB conectado!'))
  .catch(err => console.error('Erro na conexão com MongoDB:', err));

// Listar todos os produtos
app.get('/produtos', async (req, res) => {
  const produtos = await Produto.find();
  res.json(produtos);
});

// Cadastrar produto com verificação de nome duplicado (case-insensitive)
app.post('/produtos', async (req, res) => {
  const { nome, quantidade } = req.body;

  if (!nome || nome.trim() === '') {
    return res.status(400).json({ erro: 'Nome do produto é obrigatório.' });
  }

  const produtoExiste = await Produto.findOne({ nome: new RegExp(`^${nome}$`, 'i') });
  if (produtoExiste) {
    return res.status(400).json({ erro: 'Produto com esse nome já existe.' });
  }

  const produto = new Produto({ nome, quantidade: quantidade || 0 });
  await produto.save();
  res.status(201).json(produto);
});

// Deletar produto
app.delete('/produtos/:id', async (req, res) => {
  await Produto.findByIdAndDelete(req.params.id);
  res.json({ message: 'Produto deletado com sucesso!' });
});

// Movimentar produto (entrada ou saída de estoque)
app.put('/produtos/:id/movimentar', async (req, res) => {
  const { tipo, quantidade } = req.body;
  const produto = await Produto.findById(req.params.id);

  if (!produto) return res.status(404).json({ message: 'Produto não encontrado.' });

  if (!['entrada', 'saida'].includes(tipo)) {
    return res.status(400).json({ message: 'Tipo deve ser "entrada" ou "saida".' });
  }

  if (quantidade <= 0) {
    return res.status(400).json({ message: 'Quantidade deve ser maior que zero.' });
  }

  if (tipo === 'entrada') {
    produto.quantidade += quantidade;
  } else if (tipo === 'saida') {
    produto.quantidade -= quantidade;
    if (produto.quantidade < 0) produto.quantidade = 0;
  }

  produto.historico.push({ tipo, quantidade });
  await produto.save();

  res.json(produto);
});

// Ver histórico de movimentações (ordenado do mais recente para o mais antigo)
app.get('/produtos/:id/historico', async (req, res) => {
  const produto = await Produto.findById(req.params.id);
  if (!produto) return res.status(404).json({ message: 'Produto não encontrado.' });

  const historicoOrdenado = [...produto.historico].sort((a, b) => b.data - a.data);
  res.json(historicoOrdenado);
});

// Editar nome do produto
app.put('/produtos/:id', async (req, res) => {
  const { nome } = req.body;

  if (!nome || nome.trim() === '') {
    return res.status(400).json({ erro: 'Nome do produto é obrigatório.' });
  }

  const produtoExiste = await Produto.findOne({ 
    _id: { $ne: req.params.id }, 
    nome: new RegExp(`^${nome}$`, 'i') 
  });

  if (produtoExiste) {
    return res.status(400).json({ erro: 'Já existe outro produto com esse nome.' });
  }

  const produto = await Produto.findByIdAndUpdate(
    req.params.id,
    { nome },
    { new: true }
  );

  if (!produto) return res.status(404).json({ erro: 'Produto não encontrado.' });

  res.json(produto);
});

// Iniciar servidor
app.listen(5000, () => console.log('Servidor rodando na porta 5000'));
