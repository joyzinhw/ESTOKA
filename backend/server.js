require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

// Modelo do Produto
const Produto = require('./models/Produto');

// Configurações iniciais
const app = express();
const upload = multer({ dest: 'uploads/' });

// Middlewares
app.use(cors({ origin: ['https://estokkaa.netlify.app']}));
app.use(express.json());

// Conexão com MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log('MongoDB conectado!'))
  .catch(err => console.error('Erro na conexão com MongoDB:', err));

// Middleware de log para debug 
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Rotas

// Listar todos os produtos
app.get('/produtos', async (req, res, next) => {
  try {
    const produtos = await Produto.find();
    res.json(produtos);
  } catch (err) {
    next(err);
  }
});

// Cadastrar produto
app.post('/produtos', async (req, res, next) => {
  try {
    const { nome, quantidade, vencimento, tipo } = req.body;

    if (!nome || nome.trim() === '') {
      return res.status(400).json({ error: 'Nome do produto é obrigatório.' });
    }

    // Validação do tipo
    const tiposValidos = ['UN', 'CX', 'FR', 'BL', 'TB', 'MG', 'ML', 'G'];
    const tipoFinal = tiposValidos.includes(tipo) ? tipo : 'UN';

    const produtoExiste = await Produto.findOne({ nome: new RegExp(`^${nome}$`, 'i') });
    if (produtoExiste) {
      return res.status(400).json({ error: 'Produto com esse nome já existe.' });
    }

    let vencimentoDate = null;
    if (vencimento) {
      const parsed = new Date(vencimento);
      if (!isNaN(parsed)) vencimentoDate = parsed;
    }

    const produto = new Produto({
      nome,
      quantidade: quantidade || 0,
      vencimento: vencimentoDate,
      tipo: tipoFinal
    });

    await produto.save();
    res.status(201).json(produto);
  } catch (err) {
    next(err);
  }
});

// Deletar produto
app.delete('/produtos/:id', async (req, res, next) => {
  try {
    const produto = await Produto.findByIdAndDelete(req.params.id);
    if (!produto) {
      return res.status(404).json({ error: 'Produto não encontrado.' });
    }
    res.json({ message: 'Produto deletado com sucesso!' });
  } catch (err) {
    next(err);
  }
});

// Movimentar produto (entrada ou saída de estoque)
app.put('/produtos/:id/movimentar', async (req, res, next) => {
  try {
    const { tipo, quantidade } = req.body;
    
    if (!req.params.id || !mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'ID do produto inválido.' });
    }

    const produto = await Produto.findById(req.params.id);
    if (!produto) {
      return res.status(404).json({ error: 'Produto não encontrado.' });
    }

    if (!tipo || !['entrada', 'saida'].includes(tipo)) {
      return res.status(400).json({ error: 'Tipo deve ser "entrada" ou "saida".' });
    }

    if (!quantidade || isNaN(quantidade) || quantidade <= 0) {
      return res.status(400).json({ error: 'Quantidade deve ser um número maior que zero.' });
    }

    if (tipo === 'entrada') {
      produto.quantidade += Number(quantidade);
    } else {
      if (produto.quantidade < quantidade) {
        return res.status(400).json({ 
          error: 'Quantidade em estoque insuficiente.',
          estoqueDisponivel: produto.quantidade
        });
      }
      produto.quantidade -= Number(quantidade);
    }

    produto.historico.push({
      tipo,
      quantidade: Number(quantidade),
      data: new Date()
    });

    await produto.save();
    res.json(produto);
  } catch (err) {
    console.error('Erro detalhado:', err);
    next(err);
  }
});

// Ver histórico de movimentações
app.get('/produtos/:id/historico', async (req, res, next) => {
  try {
    if (!req.params.id || !mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'ID do produto inválido.' });
    }

    const produto = await Produto.findById(req.params.id);
    if (!produto) {
      return res.status(404).json({ error: 'Produto não encontrado.' });
    }

    // Converter datas para strings ISO para evitar problemas de serialização
    const historicoFormatado = produto.historico.map(item => ({
      ...item._doc,
      data: item.data.toISOString()
    })).sort((a, b) => new Date(b.data) - new Date(a.data));

    res.json(historicoFormatado);
  } catch (err) {
    console.error('Erro detalhado:', err);
    next(err);
  }
});

// Editar produto
app.put('/produtos/:id', async (req, res, next) => {
  try {
    const { nome, quantidade, vencimento, tipo } = req.body;

    if (!nome || nome.trim() === '') {
      return res.status(400).json({ error: 'Nome do produto é obrigatório.' });
    }

    // Validação do tipo
    const tiposValidos = ['UN', 'CX', 'FR', 'BL', 'TB', 'MG', 'ML', 'G'];
    const tipoFinal = tiposValidos.includes(tipo) ? tipo : 'UN';

    const produtoExiste = await Produto.findOne({ 
      _id: { $ne: req.params.id }, 
      nome: new RegExp(`^${nome}$`, 'i') 
    });

    if (produtoExiste) {
      return res.status(400).json({ error: 'Já existe outro produto com esse nome.' });
    }

    let vencimentoDate = null;
    if (vencimento) {
      vencimentoDate = new Date(vencimento);
      if (isNaN(vencimentoDate.getTime())) {
        return res.status(400).json({ error: 'Data de vencimento inválida.' });
      }
    }

    const produto = await Produto.findByIdAndUpdate(
      req.params.id,
      { nome, quantidade, vencimento: vencimentoDate, tipo: tipoFinal },
      { new: true }
    );

    if (!produto) {
      return res.status(404).json({ error: 'Produto não encontrado.' });
    }

    res.json(produto);
  } catch (err) {
    next(err);
  }
});

// Exportar dados como .xlsx
app.get('/produtos/exportar', async (req, res, next) => {
  try {
    const produtos = await Produto.find({}, { nome: 1, quantidade: 1, vencimento: 1, tipo: 1, _id: 0 });

    const dados = produtos.map(p => ({
      Nome: p.nome,
      Quantidade: p.quantidade,
      Tipo: p.tipo,
      Vencimento: p.vencimento ? formatarDataParaExcel(p.vencimento) : ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(dados);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Produtos');

    const filePath = path.join(__dirname, 'produtos.xlsx');
    XLSX.writeFile(workbook, filePath);

    res.download(filePath, 'produtos.xlsx', err => {
      if (err) console.error('Erro ao baixar o arquivo:', err);
      fs.unlinkSync(filePath);
    });
  } catch (err) {
    next(err);
  }
});

// Importar dados de .xlsx ou .csv
app.post('/produtos/importar', upload.single('arquivo'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
    }

    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const dados = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    const tiposValidos = ['UN', 'CX', 'FR', 'BL', 'TB', 'MG', 'ML', 'G'];
    const resultados = [];
    
    for (const item of dados) {
      try {
        const nome = item.Nome || item.nome;
        const quantidade = parseInt(item.Quantidade || item.quantidade || 0);
        const vencimentoStr = item.Vencimento || item.vencimento;
        const tipo = tiposValidos.includes(item.Tipo || item.tipo) ? (item.Tipo || item.tipo) : 'UN';

        if (!nome) continue;

        let vencimento = null;
        if (vencimentoStr) {
          if (typeof vencimentoStr === 'string' && vencimentoStr.includes('/')) {
            const [day, month, year] = vencimentoStr.split('/');
            vencimento = new Date(`${year}-${month}-${day}`);
          } 
          else if (typeof vencimentoStr === 'number') {
            const excelDate = XLSX.SSF.parse_date_code(vencimentoStr);
            vencimento = new Date(excelDate.y, excelDate.m - 1, excelDate.d);
          }
          else if (vencimentoStr instanceof Date) {
            vencimento = vencimentoStr;
          }
          
          if (isNaN(vencimento?.getTime())) {
            vencimento = null;
          }
        }

        const existente = await Produto.findOne({ nome: new RegExp(`^${nome}$`, 'i') });
        if (existente) {
          resultados.push({ nome, status: 'ignorado', motivo: 'já existe' });
        } else {
          await Produto.create({ nome, quantidade, vencimento, tipo });
          resultados.push({ nome, status: 'importado' });
        }
      } catch (err) {
        resultados.push({ 
          nome: item.Nome || item.nome || 'desconhecido', 
          status: 'erro', 
          motivo: err.message 
        });
      }
    }

    fs.unlinkSync(req.file.path);
    res.json({ 
      message: 'Importação concluída com sucesso!',
      resultados 
    });
  } catch (err) {
    next(err);
  }
});

// Rota para produtos próximos do vencimento
app.get('/produtos/vencendo', async (req, res, next) => {
  try {
    const hoje = new Date();
    const dezDias = new Date(hoje);
    dezDias.setDate(hoje.getDate() + 10);
    
    const produtos = await Produto.find({
      vencimento: {
        $gte: hoje,
        $lte: dezDias
      }
    });
    
    res.json(produtos);
  } catch (err) {
    next(err);
  }
});

// Rota para produtos com estoque baixo
app.get('/produtos/estoque-baixo', async (req, res, next) => {
  try {
    const produtos = await Produto.find({
      quantidade: {
        $lt: 10,
        $gt: 0
      }
    });
    
    res.json(produtos);
  } catch (err) {
    next(err);
  }
});

// Rota para buscar produto por nome
app.get('/produtos/buscar', async (req, res, next) => {
  try {
    const { nome } = req.query;
    if (!nome) {
      return res.status(400).json({ error: 'Parâmetro "nome" é obrigatório.' });
    }

    const produto = await Produto.findOne({ nome: new RegExp(nome, 'i') });
    if (!produto) {
      return res.status(404).json({ error: 'Produto não encontrado.' });
    }

    res.json(produto);
  } catch (err) {
    next(err);
  }
});

// Função auxiliar para formatar data no formato dd/mm/yyyy
function formatarDataParaExcel(date) {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

// Middleware para rotas não encontradas
app.use((req, res, next) => {
  res.status(404).json({ error: 'Rota não encontrada.' });
});

// Middleware de tratamento de erros
app.use((err, req, res, next) => {
  console.error('Erro:', err.stack);
  
  // Erros de validação do Mongoose
  if (err.name === 'ValidationError') {
    return res.status(400).json({ 
      error: 'Erro de validação',
      details: Object.values(err.errors).map(e => e.message) 
    });
  }
  
  // Erros de cast (IDs inválidos)
  if (err.name === 'CastError') {
    return res.status(400).json({ error: 'ID inválido' });
  }
  
  res.status(500).json({ 
    error: 'Erro interno do servidor',
    message: err.message 
  });
});

// Iniciar servidor
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));