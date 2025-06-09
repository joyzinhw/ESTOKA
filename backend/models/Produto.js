const mongoose = require('mongoose');

const produtoSchema = new mongoose.Schema({
  nome: { type: String, required: true },
  quantidade: { type: Number, default: 0 },
  vencimento: { type: Date },
  historico: [{
    tipo: String,
    quantidade: Number,
    data: { type: Date, default: Date.now }
  }]
});

module.exports = mongoose.model('Produto', produtoSchema);
