const historicoSchema = new mongoose.Schema({
  tipo: { type: String, enum: ['entrada', 'saida'], required: true },
  quantidade: { type: Number, required: true, min: 0 },
  data: { type: Date, default: Date.now }
});

const produtoSchema = new mongoose.Schema({
  nome: { type: String, required: true },
  quantidade: { type: Number, default: 0 },
  vencimento: { type: Date },
  tipo: { 
    type: String, 
    enum: ['UN', 'CX', 'FR', 'BL', 'TB', 'MG', 'ML', 'G'],
    default: 'UN'
  },
  historico: [historicoSchema] 
});
