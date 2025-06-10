require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const multer = require('multer');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Modelo do Produto (ajuste o caminho conforme sua estrutura)
const Produto = require('./models/Produto');

// Configurar multer para upload de arquivos
const upload = multer({ dest: 'uploads/' });

const app = express();

app.use(cors({
  origin: 'https://estokkaa.netlify.app'
}));

app.use(express.json());

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log('MongoDB conectado!'))
  .catch(err => console.error('Erro na conexão com MongoDB:', err));

// // Listar todos os produtos
// app.get('/produtos', async (req, res) => {
//   const produtos = await Produto.find();
//   res.json(produtos);
// });

// // Cadastrar produto com verificação de nome duplicado (case-insensitive)
// app.post('/produtos', async (req, res) => {
//   const { nome, quantidade, vencimento } = req.body;

//   if (!nome || nome.trim() === '') {
//     return res.status(400).json({ erro: 'Nome do produto é obrigatório.' });
//   }

//   const produtoExiste = await Produto.findOne({ nome: new RegExp(`^${nome}$`, 'i') });
//   if (produtoExiste) {
//     return res.status(400).json({ erro: 'Produto com esse nome já existe.' });
//   }

//   let vencimentoDate = null;
//   if (vencimento) {
//     const parsed = new Date(vencimento);
//     if (!isNaN(parsed)) vencimentoDate = parsed;
//   }

//   const produto = new Produto({ nome, quantidade: quantidade || 0, vencimento: vencimentoDate });
//   await produto.save();
//   res.status(201).json(produto);
// });


// // Deletar produto
// app.delete('/produtos/:id', async (req, res) => {
//   await Produto.findByIdAndDelete(req.params.id);
//   res.json({ message: 'Produto deletado com sucesso!' });
// });

// // Movimentar produto (entrada ou saída de estoque)
// app.put('/produtos/:id/movimentar', async (req, res) => {
//   const { tipo, quantidade } = req.body;
//   const produto = await Produto.findById(req.params.id);

//   if (!produto) return res.status(404).json({ message: 'Produto não encontrado.' });

//   if (!['entrada', 'saida'].includes(tipo)) {
//     return res.status(400).json({ message: 'Tipo deve ser "entrada" ou "saida".' });
//   }

//   if (quantidade <= 0) {
//     return res.status(400).json({ message: 'Quantidade deve ser maior que zero.' });
//   }

//   if (tipo === 'entrada') {
//     produto.quantidade += quantidade;
//   } else if (tipo === 'saida') {
//     produto.quantidade -= quantidade;
//     if (produto.quantidade < 0) produto.quantidade = 0;
//   }

//   produto.historico.push({ tipo, quantidade });
//   await produto.save();

//   res.json(produto);
// });

// // Ver histórico de movimentações (ordenado do mais recente para o mais antigo)
// app.get('/produtos/:id/historico', async (req, res) => {
//   const produto = await Produto.findById(req.params.id);
//   if (!produto) return res.status(404).json({ message: 'Produto não encontrado.' });

//   const historicoOrdenado = [...produto.historico].sort((a, b) => b.data - a.data);
//   res.json(historicoOrdenado);
// });

// // Editar nome do produto
// app.put('/produtos/:id', async (req, res) => {
//   const { nome } = req.body;

//   if (!nome || nome.trim() === '') {
//     return res.status(400).json({ erro: 'Nome do produto é obrigatório.' });
//   }

//   const produtoExiste = await Produto.findOne({ 
//     _id: { $ne: req.params.id }, 
//     nome: new RegExp(`^${nome}$`, 'i') 
//   });

//   if (produtoExiste) {
//     return res.status(400).json({ erro: 'Já existe outro produto com esse nome.' });
//   }

//   const produto = await Produto.findByIdAndUpdate(
//     req.params.id,
//     { nome },
//     { new: true }
//   );

//   if (!produto) return res.status(404).json({ erro: 'Produto não encontrado.' });

//   res.json(produto);
// });


// /** 📤 EXPORTAR dados como .xlsx */
// app.get('/produtos/exportar', async (req, res) => {
//   try {
//     const produtos = await Produto.find({}, { nome: 1, quantidade: 1, vencimento: 1, _id: 0 });

//     const dados = produtos.map(p => ({
//       Nome: p.nome,
//       Quantidade: p.quantidade,
//       Vencimento: p.vencimento ? new Date(p.vencimento).toLocaleDateString('pt-BR') : ''
//     }));

//     const worksheet = XLSX.utils.json_to_sheet(dados);
//     const workbook = XLSX.utils.book_new();
//     XLSX.utils.book_append_sheet(workbook, worksheet, 'Produtos');

//     const filePath = path.join(__dirname, 'produtos.xlsx');
//     XLSX.writeFile(workbook, filePath);

//     res.download(filePath, 'produtos.xlsx', err => {
//       if (err) console.error('Erro ao baixar o arquivo:', err);
//       fs.unlinkSync(filePath);
//     });
//   } catch (err) {
//     res.status(500).json({ erro: 'Erro ao exportar dados.' });
//   }
// });

// /** 📥 IMPORTAR dados de .xlsx ou .csv */
// app.post('/produtos/importar', upload.single('arquivo'), async (req, res) => {
//   try {
//     const workbook = XLSX.readFile(req.file.path);
//     const sheetName = workbook.SheetNames[0];
//     const dados = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

//     for (const item of dados) {
//       const nome = item.Nome || item.nome;
//       const quantidade = parseInt(item.Quantidade || item.quantidade || 0);
//       const vencimentoStr = item.Vencimento || item.vencimento;

//       if (!nome) continue;

//       // Tenta converter a data de vencimento (se existir)
//       let vencimento = null;
//       if (vencimentoStr) {
//         const parsedDate = new Date(vencimentoStr);
//         if (!isNaN(parsedDate)) {
//           vencimento = parsedDate;
//         }
//       }

//       const existente = await Produto.findOne({ nome: new RegExp(`^${nome}$`, 'i') });
//       if (!existente) {
//         await Produto.create({ nome, quantidade, vencimento });
//       }
//     }

//     fs.unlinkSync(req.file.path);
//     res.json({ message: 'Importação concluída com sucesso!' });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ erro: 'Erro ao importar dados.' });
//   }
// });

// const PORT = process.env.PORT || 5000;
// app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));

app.get('/produtos', async (req, res) => {
  try {
    const produtos = await Produto.find().sort({ nome: 1 });
    res.json(produtos);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao buscar produtos' });
  }
});

// Cadastrar produto
app.post('/produtos', async (req, res) => {
  const { nome, quantidade, vencimento } = req.body;

  if (!nome || nome.trim() === '') {
    return res.status(400).json({ erro: 'Nome do produto é obrigatório.' });
  }

  try {
    // Verifica se já existe produto com o mesmo nome (case insensitive)
    const produtoExiste = await Produto.findOne({ 
      nome: { $regex: new RegExp(`^${nome}$`, 'i') } 
    });

    if (produtoExiste) {
      return res.status(400).json({ erro: 'Produto com esse nome já existe.' });
    }

    // Converte a data de vencimento se fornecida
    let vencimentoDate = null;
    if (vencimento) {
      vencimentoDate = new Date(vencimento);
      if (isNaN(vencimentoDate.getTime())) {
        return res.status(400).json({ erro: 'Data de vencimento inválida.' });
      }
    }

    const produto = new Produto({ 
      nome, 
      quantidade: quantidade || 0, 
      vencimento: vencimentoDate 
    });

    await produto.save();
    res.status(201).json(produto);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao cadastrar produto' });
  }
});

// Deletar produto
app.delete('/produtos/:id', async (req, res) => {
  try {
    const produto = await Produto.findByIdAndDelete(req.params.id);
    if (!produto) {
      return res.status(404).json({ erro: 'Produto não encontrado' });
    }
    res.json({ message: 'Produto deletado com sucesso' });
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao deletar produto' });
  }
});

// Movimentar produto (entrada/saída)
app.put('/produtos/:id/movimentar', async (req, res) => {
  const { tipo, quantidade } = req.body;

  if (!['entrada', 'saida'].includes(tipo)) {
    return res.status(400).json({ erro: 'Tipo de movimentação inválido' });
  }

  if (isNaN(quantidade) || quantidade <= 0) {
    return res.status(400).json({ erro: 'Quantidade inválida' });
  }

  try {
    const produto = await Produto.findById(req.params.id);
    if (!produto) {
      return res.status(404).json({ erro: 'Produto não encontrado' });
    }

    if (tipo === 'entrada') {
      produto.quantidade += quantidade;
    } else {
      produto.quantidade = Math.max(0, produto.quantidade - quantidade);
    }

    produto.historico.push({ tipo, quantidade });
    await produto.save();

    res.json(produto);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao movimentar produto' });
  }
});

// Ver histórico de movimentações
app.get('/produtos/:id/historico', async (req, res) => {
  try {
    const produto = await Produto.findById(req.params.id);
    if (!produto) {
      return res.status(404).json({ erro: 'Produto não encontrado' });
    }

    // Ordena do mais recente para o mais antigo
    const historicoOrdenado = produto.historico.sort((a, b) => b.data - a.data);
    res.json(historicoOrdenado);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao buscar histórico' });
  }
});

// Exportar produtos para Excel
app.get('/produtos/exportar', async (req, res) => {
  try {
    const produtos = await Produto.find({}, { nome: 1, quantidade: 1, vencimento: 1, _id: 0 });

    const dados = produtos.map(p => ({
      Nome: p.nome,
      Quantidade: p.quantidade,
      Vencimento: p.vencimento ? new Date(p.vencimento).toISOString().slice(0, 10) : ''
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
    res.status(500).json({ erro: 'Erro ao exportar dados' });
  }
});

// Importar produtos de Excel
app.post('/produtos/importar', upload.single('arquivo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ erro: 'Nenhum arquivo enviado' });
    }

    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const dados = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    const produtosImportados = [];
    const produtosAtualizados = [];

    for (const item of dados) {
      const nome = item.Nome || item.nome;
      const quantidade = parseInt(item.Quantidade || item.quantidade || 0);
      const vencimentoStr = item.Vencimento || item.vencimento;

      if (!nome) continue;

      // Converter data de vencimento
      let vencimento = null;
      if (vencimentoStr) {
        vencimento = new Date(vencimentoStr);
        if (isNaN(vencimento.getTime())) {
          vencimento = null;
        }
      }

      // Verificar se o produto já existe
      const produtoExistente = await Produto.findOne({ 
        nome: { $regex: new RegExp(`^${nome}$`, 'i') }
      });

      if (produtoExistente) {
        // Atualiza quantidade se o produto existir
        produtoExistente.quantidade = quantidade;
        if (vencimento) produtoExistente.vencimento = vencimento;
        await produtoExistente.save();
        produtosAtualizados.push(produtoExistente.nome);
      } else {
        // Cria novo produto
        const novoProduto = new Produto({
          nome,
          quantidade,
          vencimento
        });
        await novoProduto.save();
        produtosImportados.push(novoProduto.nome);
      }
    }

    fs.unlinkSync(req.file.path);

    res.json({
      message: 'Importação concluída com sucesso',
      importados: produtosImportados,
      atualizados: produtosAtualizados
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao importar dados' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));