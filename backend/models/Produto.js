const mongoose = require('mongoose');

const ProdutoSchema = new mongoose.Schema({
  nome: { type: String, required: true },
  quantidade: { type: Number, default: 0 },
  historico: [{
    data: { type: Date, default: Date.now },
    tipo: { type: String, enum: ['entrada', 'saida'] },
    quantidade: Number
  }]
});

module.exports = mongoose.model('Produto', ProdutoSchema);
