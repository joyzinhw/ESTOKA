const apiURL = 'https://estoka.onrender.com/produtos';

const tipos = {
  'UN': 'Unidade',
  'CX': 'Caixa',
  'FR': 'Frasco',
  'BL': 'Blister',
  'TB': 'Tubo',
  'MG': 'Miligrama',
  'ML': 'Mililitro',
  'G': 'Grama',
  'PARES': 'Pares',
  'LT': 'Litro',
};

// Elementos do formulário
const signUpButton = document.getElementById('signUpButton');
const signInButton = document.getElementById('signInButton');
const signInForm = document.getElementById('signIn');
const signUpForm = document.getElementById('signup');

if (signUpButton && signInButton) {
  signUpButton.addEventListener('click', function () {
    signInForm.style.display = "none";
    signUpForm.style.display = "block";
  });
  signInButton.addEventListener('click', function () {
    signInForm.style.display = "block";
    signUpForm.style.display = "none";
  });
}

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('produtosTable')) {
    carregarProdutosDoCache();
    carregarProdutos();
  }
});

function carregarProdutosDoCache() {
  const cachedProdutos = localStorage.getItem('cachedProdutos');
  if (cachedProdutos) {
    try {
      const produtos = JSON.parse(cachedProdutos);
      if (Array.isArray(produtos)) {
        atualizarTabela(produtos);
      } else {
        console.warn('cachedProdutos não é um array:', produtos);
        localStorage.removeItem('cachedProdutos'); // remove dados inválidos
      }
    } catch (e) {
      console.error('Erro ao fazer parse do cache:', e);
      localStorage.removeItem('cachedProdutos'); // também remove caso o JSON esteja corrompido
    }
  }
}


function formatarDataExibicao(dataString) {
  if (!dataString) return 'Sem data';
  
  try {
    const date = new Date(dataString);
    if (isNaN(date.getTime())) return 'Data inválida';
    
    // Ajusta para compensar o fuso horário
    const adjustedDate = new Date(date.getTime() + date.getTimezoneOffset() * 60000);
    
    return adjustedDate.toLocaleDateString('pt-BR');
  } catch (error) {
    console.error('Erro ao formatar data:', error);
    return 'Data inválida';
  }
}

function atualizarTabela(produtos) {
  const tabela = document.getElementById('produtosTable');
  if (!tabela) return;

  tabela.innerHTML = '';

  produtos.forEach(prod => {
    const tr = document.createElement('tr');
    const diasRestantes = calcularDiasRestantes(prod.vencimento);
    const tipoExibicao = tipos[prod.tipo] || prod.tipo || '—';
    
    if (diasRestantes >= 0 && diasRestantes < 10) {
      tr.classList.add('alerta-vencimento');
    }
    if (prod.quantidade < 10) {
      tr.classList.add('alerta-estoque');
    }
    
    tr.innerHTML = `
      <td>${prod.nome}</td>
      <td>${prod.quantidade ?? 0}</td>
      <td>${tipoExibicao}</td>
      <td>${formatarDataExibicao(prod.vencimento)}</td>
      <td>
        <button onclick="deletarProduto('${prod._id}')">DELETAR</button>
        <button onclick="editarProdutoPrompt('${prod._id}')">EDITAR</button>
      </td>
    `;
    tabela.appendChild(tr);
  });
  
  atualizarZonaCritica(produtos);
}

async function carregarProdutos() {
  try {
    const tabela = document.getElementById('produtosTable');
    if (!tabela) return;

    const res = await fetch(apiURL);
    const produtos = await res.json();

    localStorage.setItem('cachedProdutos', JSON.stringify(produtos));
    atualizarTabela(produtos);
  } catch (error) {
    console.error('Erro ao carregar produtos:', error);
  }
}

async function cadastrarProduto() {
  const nome = document.getElementById('produtoNome').value.trim();
  const quantidade = parseInt(document.getElementById('produtoQtd').value);
  const tipo = document.getElementById('produtoTipo').value;
  const vencimentoInput = document.getElementById('produtoVencimento').value;

  if (!nome || isNaN(quantidade) || !tipo) {
    alert('Preencha todos os campos corretamente!');
    return;
  }

  try {
    const response = await fetch(apiURL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        nome, 
        quantidade, 
        tipo,
        vencimento: vencimentoInput || null 
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.erro || 'Erro ao cadastrar produto');
    }

    const novoProduto = await response.json();
    
    const cachedProdutos = JSON.parse(localStorage.getItem('cachedProdutos') || '[]');
    cachedProdutos.push(novoProduto);
    localStorage.setItem('cachedProdutos', JSON.stringify(cachedProdutos));

    document.getElementById('produtoNome').value = '';
    document.getElementById('produtoQtd').value = '';
    document.getElementById('produtoTipo').value = 'UN';
    document.getElementById('produtoVencimento').value = '';

    atualizarTabela(cachedProdutos);
  } catch (error) {
    console.error('Erro ao cadastrar produto:', error);
    alert(error.message);
  }
}

async function editarProdutoPrompt(id) {
  const cachedProdutos = JSON.parse(localStorage.getItem('cachedProdutos')) || [];
  const produto = cachedProdutos.find(p => p._id === id);
  
  if (!produto) {
    alert('Produto não encontrado.');
    return;
  }

  let dataAtual = '';
  if (produto.vencimento) {
    const date = new Date(produto.vencimento);
    if (!isNaN(date.getTime())) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      dataAtual = `${year}-${month}-${day}`;
    }
  }

  const novoNome = prompt('Editar nome do produto:', produto.nome);
  if (novoNome === null) return;

  const novaQtd = parseInt(prompt('Editar quantidade:', produto.quantidade));
  if (isNaN(novaQtd)) {
    alert('Quantidade deve ser um número válido.');
    return;
  }

  const novoTipo = prompt('Editar tipo do produto (UN, CX, FR, BL, TB, MG, ML, G, LT):', produto.tipo || 'UN');
  if (novoTipo === null) return;

  const novoVenc = prompt('Editar data de validade (AAAA-MM-DD):', dataAtual);
  if (novoVenc === null) return;

  if (novoVenc) {
    const date = new Date(novoVenc);
    if (isNaN(date.getTime())) {
      alert('Data inválida! Use o formato AAAA-MM-DD.');
      return;
    }
  }

  await atualizarProduto(id, {
    nome: novoNome,
    quantidade: novaQtd,
    tipo: novoTipo,
    vencimento: novoVenc || null
  });
}

async function deletarProduto(id) {
  const confirmar = confirm('Tem certeza que deseja deletar este produto?');
  if (!confirmar) return;

  try {
    await fetch(`${apiURL}/${id}`, {
      method: 'DELETE'
    });
    
    const cachedProdutos = JSON.parse(localStorage.getItem('cachedProdutos') || []);
    const novosProdutos = cachedProdutos.filter(p => p._id !== id);
    localStorage.setItem('cachedProdutos', JSON.stringify(novosProdutos));
    
    atualizarTabela(novosProdutos);
  } catch (error) {
    console.error('Erro ao deletar produto:', error);
    alert('Erro ao deletar produto.');
  }
}

async function atualizarProduto(id, dadosAtualizados) {
  try {
    const response = await fetch(`${apiURL}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dadosAtualizados)
    });

    if (!response.ok) {
      throw new Error('Erro ao atualizar produto');
    }

    const produtoAtualizado = await response.json();

    let cachedProdutos = JSON.parse(localStorage.getItem('cachedProdutos') || '[]');
    const index = cachedProdutos.findIndex(p => p._id === id);
    if (index !== -1) {
      cachedProdutos[index] = produtoAtualizado;
      localStorage.setItem('cachedProdutos', JSON.stringify(cachedProdutos));
    }

    atualizarTabela(cachedProdutos);
    alert('Produto atualizado com sucesso!');
  } catch (error) {
    console.error('Erro ao atualizar produto:', error);
    alert('Erro ao atualizar produto: ' + error.message);
  }
}

async function movimentarProduto(id, tipo, quantidade) {
  if (!['entrada', 'saida'].includes(tipo) || isNaN(quantidade) || quantidade <= 0) {
    alert('Tipo ou quantidade inválida para movimentação!');
    return;
  }

  try {
    const response = await fetch(`${apiURL}/${id}/movimentar`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tipo, quantidade })
    });
    
    if (!response.ok) {
      throw new Error('Erro na resposta do servidor');
    }
    
    const produtoAtualizado = await response.json();
    
    // Atualiza o cache local
    const cachedProdutos = JSON.parse(localStorage.getItem('cachedProdutos') || []);
    const index = cachedProdutos.findIndex(p => p._id === id);
    if (index !== -1) {
      cachedProdutos[index] = produtoAtualizado;
      localStorage.setItem('cachedProdutos', JSON.stringify(cachedProdutos));
    }
    
    // Atualiza a tabela
    atualizarTabela(cachedProdutos);
    alert('Movimentação realizada com sucesso!');
    return true;
  } catch (error) {
    console.error('Erro ao movimentar produto:', error);
    alert(`Erro ao movimentar produto: ${error.message}`);
    return false;
  }
}

async function buscarProdutoPorNome(nome) {
  try {
    const cachedProdutos = JSON.parse(localStorage.getItem('cachedProdutos') || []);
    return cachedProdutos.find(p => p.nome.toLowerCase() === nome.toLowerCase());
  } catch (error) {
    console.error('Erro ao buscar produto:', error);
    alert('Erro ao buscar produto.');
    return null;
  }
}

async function executarMovimento(tipo) {
  const nome = document.getElementById('nomeProdutoMovimento').value.trim();
  const qtd = parseInt(document.getElementById('qtdMovimento').value);

  if (!nome) {
    alert('Informe o nome do produto.');
    return;
  }

  if (isNaN(qtd) || qtd <= 0) {
    alert('Informe uma quantidade válida (maior que zero).');
    return;
  }

  try {
    const cachedProdutos = JSON.parse(localStorage.getItem('cachedProdutos') || '[]');
    let produto = cachedProdutos.find(p => p.nome.toLowerCase() === nome.toLowerCase());

    if (!produto) {
      const response = await fetch(`${apiURL}/buscar?nome=${encodeURIComponent(nome)}`);
      if (response.ok) {
        produto = await response.json();
      } else {
        throw new Error('Produto não encontrado');
      }
    }

    const sucesso = await movimentarProduto(produto._id, tipo, qtd);
    
    if (sucesso) {
      document.getElementById('nomeProdutoMovimento').value = '';
      document.getElementById('qtdMovimento').value = '';
    }
  } catch (error) {
    console.error('Erro no movimento:', error);
    alert(`Erro: ${error.message}`);
  }
}

async function verHistorico(id) {
  try {
    const res = await fetch(`${apiURL}/${id}/historico`);
    const historico = await res.json();

    const lista = document.getElementById('listaHistorico');
    lista.innerHTML = '';

    if (historico.length === 0) {
      lista.innerHTML = '<li>Sem movimentações para este produto.</li>';
      return;
    }

    historico.forEach(item => {
      const li = document.createElement('li');
      li.textContent = `Tipo: ${item.tipo}, Quantidade: ${item.quantidade}, Data: ${new Date(item.data).toLocaleString()}`;
      lista.appendChild(li);
    });
  } catch (error) {
    console.error('Erro ao buscar histórico:', error);
    alert('Erro ao buscar histórico.');
  }
}

async function verHistoricoPorNome() {
  const nome = document.getElementById('nomeProdutoHistorico').value.trim();
  if (!nome) {
    alert('Informe o nome do produto.');
    return;
  }

  const produto = await buscarProdutoPorNome(nome);
  if (!produto) {
    alert('Produto não encontrado.');
    return;
  }

  verHistorico(produto._id);
  document.getElementById('nomeProdutoHistorico').value = '';
}

function mostrarSecao(idSecao) {
  const secoes = document.querySelectorAll('main > section');
  secoes.forEach(sec => sec.className = 'secao-oculta');
  const secaoAtiva = document.getElementById(idSecao);
  if (secaoAtiva) secaoAtiva.className = 'secao-visivel';
}

async function consultarSaldo() {
  const nomeBusca = document.getElementById('buscaNome').value.trim();
  const resultadoDiv = document.getElementById('resultadoSaldo');

  if (!nomeBusca) {
    resultadoDiv.innerHTML = '<p style="color: red;">Por favor, digite o nome do produto.</p>';
    return;
  }

  const produto = await buscarProdutoPorNome(nomeBusca);

  if (produto) {
    resultadoDiv.innerHTML = `
      <p>Produto: <strong>${produto.nome}</strong></p>
      <p>Quantidade em estoque: <strong>${produto.quantidade ?? 0}</strong></p>
      <p>Tipo: <strong>${produto.tipo || 'Não especificado'}</strong></p>
    `;
  } else {
    resultadoDiv.innerHTML = '<p style="color: red;">Produto não encontrado.</p>';
  }
}

async function exportarProdutos() {
  try {
    const res = await fetch(`${apiURL}/exportar`);
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'produtos.xlsx';
    document.body.appendChild(a);
    a.click();
    a.remove();
  } catch (error) {
    alert('Erro ao exportar produtos.');
    console.error(error);
  }
}

async function importarProdutos() {
  const input = document.getElementById('arquivoImportacao');
  const file = input.files[0];
  if (!file) {
    alert('Selecione um arquivo!');
    return;
  }

  const formData = new FormData();
  formData.append('arquivo', file);

  try {
    const res = await fetch(`${apiURL}/importar`, {
      method: 'POST',
      body: formData
    });

    const result = await res.json();
    alert(result.message || 'Importação realizada!');
    
    carregarProdutos();
  } catch (error) {
    alert('Erro ao importar produtos.');
    console.error(error);
  }
}

function calcularDiasRestantes(dataVencimento) {
  if (!dataVencimento) return Infinity;
  
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  
  const vencimento = new Date(dataVencimento);
  vencimento.setHours(0, 0, 0, 0);
  
  const diffTime = vencimento - hoje;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
}

function atualizarZonaCritica(produtos) {
  const hoje = new Date();
  
  const produtosVencendo = produtos.filter(produto => {
    if (!produto.vencimento) return false;
    const diasRestantes = calcularDiasRestantes(produto.vencimento);
    return diasRestantes >= 0 && diasRestantes < 10;
  });
  
  const produtosAcabando = produtos.filter(produto => {
    return produto.quantidade < 10 && produto.quantidade > 0;
  });
  
  const tabelaVencendo = document.getElementById('tabelaVencendo').getElementsByTagName('tbody')[0];
  tabelaVencendo.innerHTML = '';
  
    produtosVencendo.forEach(produto => {
    const diasRestantes = calcularDiasRestantes(produto.vencimento);
    const tipoExibicao = tipos[produto.tipo] || produto.tipo || '—';
    const tr = document.createElement('tr');
    
    
    if (diasRestantes < 3) {
      tr.classList.add('alerta-urgente');
    } else if (diasRestantes < 7) {
      tr.classList.add('alerta-proximo');
    }
    
    tr.innerHTML = `
      <td>${produto.nome}</td>
      <td>${produto.quantidade}</td>
      <td>${tipoExibicao}</td>
      <td>${formatarDataExibicao(produto.vencimento)}</td>
      <td>${diasRestantes} dias</td>
    `;
    tabelaVencendo.appendChild(tr);
  });
  
  const tabela = document.getElementById('tabelaAcabando').querySelector('tbody');
  if (!tabela) return;

  tabela.innerHTML = '';

  const limitesCriticos = {
    'UN': 10,
    'CX': 5,
    'FR': 10,
    'TB': 5,
    'BL': 5,
    "LT":  5,
    "PARES": 5
    // Você pode incluir mais se quiser
  };

  const produtosCriticos = produtos.filter(prod => {
    const limite = limitesCriticos[prod.tipo] ?? 0;
    return prod.quantidade <= limite;
  });

produtosCriticos.forEach(prod => {
    const tipoExibicao = tipos[prod.tipo] || prod.tipo || '—';
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${prod.nome}</td>
      <td>${prod.quantidade}</td>
      <td>${tipoExibicao}</td>
      <td>${formatarDataExibicao(prod.vencimento)}</td>
  
    `;
    tabela.appendChild(tr);
  });

  // const secao = document.getElementById('secaoAcabando');
  // secao.classList.toggle('secao-oculta', produtosCriticos.length === 0);
}
