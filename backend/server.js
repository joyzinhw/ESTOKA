const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const Produto = require('./models/Produto');

const app = express();

app.use(cors());
app.use(express.json());

mongoose.connect('mongodb+srv://joyzinhw:moura100@dbmango.2wyzlmm.mongodb.net/estoqueDB?retryWrites=true&w=majority', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log('MongoDB conectado!'))
  .catch(err => console.error('Erro:', err));

// Listar
app.get('/produtos', async (req, res) => {
  const produtos = await Produto.find();
  res.json(produtos);
});

// Cadastrar
// Cadastrar produto - corrigido para aceitar quantidade
app.post('/produtos', async (req, res) => {
  const { nome, quantidade } = req.body;
  const produto = new Produto({ nome, quantidade: quantidade || 0 });
  await produto.save();
  res.json(produto);
});


// Deletar
app.delete('/produtos/:id', async (req, res) => {
  await Produto.findByIdAndDelete(req.params.id);
  res.json({ message: 'Produto deletado!' });
});

app.put('/produtos/:id/movimentar', async (req, res) => {
  const { tipo, quantidade } = req.body;
  const produto = await Produto.findById(req.params.id);
  
  if (!produto) return res.status(404).json({ message: 'Produto não encontrado' });

  if (tipo === 'entrada') {
    produto.quantidade += quantidade;
  } else if (tipo === 'saida') {
    produto.quantidade -= quantidade;
    if (produto.quantidade < 0) produto.quantidade = 0; // Evita negativo
  } else {
    return res.status(400).json({ message: 'Tipo inválido' });
  }

  produto.historico.push({ tipo, quantidade });
  await produto.save();

  res.json(produto);
});

app.get('/produtos/:id/historico', async (req, res) => {
  const produto = await Produto.findById(req.params.id);
  if (!produto) return res.status(404).json({ message: 'Produto não encontrado' });

  res.json(produto.historico);
});


app.listen(5000, () => console.log('Servidor rodando na porta 5000'));

