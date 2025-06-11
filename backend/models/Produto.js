const mongoose = require('mongoose');

const historicoSchema = new mongoose.Schema({
  tipo: { type: String, enum: ['entrada', 'saida'], required: true },
  quantidade: { type: Number, required: true },
  data: { type: Date, default: Date.now }
});

const produtoSchema = new mongoose.Schema({
  nome: { type: String, required: true, unique: true },
  quantidade: { type: Number, default: 0 },
  vencimento: { type: Date, default: null },
  tipo: { type: String, default: 'outros' },
  historico: [historicoSchema]
});

module.exports = mongoose.model('Produto', produtoSchema);
