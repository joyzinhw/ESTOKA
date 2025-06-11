const apiURL = 'https://estoka.onrender.com/produtos';

// Elementos do formulário de login/signup
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
  // Carrega produtos do cache local enquanto busca do servidor
  if (document.getElementById('produtosTable')) {
    carregarProdutosDoCache();
    carregarProdutos();
  }
});

// Carrega produtos do localStorage enquanto espera resposta do servidor
function carregarProdutosDoCache() {
  const cachedProdutos = localStorage.getItem('cachedProdutos');
  if (cachedProdutos) {
    const produtos = JSON.parse(cachedProdutos);
    atualizarTabela(produtos);
  }
}

function formatarDataExibicao(dataString) {
  if (!dataString) return 'Sem data';
  
  try {
    const date = new Date(dataString);
    if (isNaN(date.getTime())) return 'Data inválida';
    
    // Formata para DD/MM/AAAA
    return date.toLocaleDateString('pt-BR');
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
    
    // Adiciona classes de alerta se necessário
    const diasRestantes = calcularDiasRestantes(prod.vencimento);
    if (diasRestantes >= 0 && diasRestantes < 10) {
      tr.classList.add('alerta-vencimento');
    }
    if (prod.quantidade < 10) {
      tr.classList.add('alerta-estoque');
    }
    
    tr.innerHTML = `
    <td>${prod.nome}</td>
    <td>${prod.quantidade ?? 0}</td>
    <td>${prod.tipo || '—'}</td>
    <td>${formatarDataExibicao(prod.vencimento)}</td>
    <td>
      <button onclick="deletarProduto('${prod._id}')">DELETAR</button>
      <button onclick="editarProdutoPrompt('${prod._id}')">EDITAR</button>
    </td>
    `;
    tabela.appendChild(tr);
  });
  
  // Atualizar a zona crítica sempre que a tabela principal for atualizada
  atualizarZonaCritica(produtos);
}


async function carregarProdutos() {
  try {
    const tabela = document.getElementById('produtosTable');
    if (!tabela) return;

    const res = await fetch(apiURL);
    const produtos = await res.json();

    // Atualiza o cache local
    localStorage.setItem('cachedProdutos', JSON.stringify(produtos));
    
    // Atualiza a tabela
    atualizarTabela(produtos);
  } catch (error) {
    console.error('Erro ao carregar produtos:', error);
    // Se falhar, mantém os dados do cache
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

    // Limpar campos após cadastro
    document.getElementById('produtoNome').value = '';
    document.getElementById('produtoQtd').value = '';
    document.getElementById('produtoTipo').value = '';
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

  const novoTipo = prompt('Editar tipo do produto:', produto.tipo || '');
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
    
    // Atualiza o cache local removendo o produto
    const cachedProdutos = JSON.parse(localStorage.getItem('cachedProdutos') || []);
    const novosProdutos = cachedProdutos.filter(p => p._id !== id);
    localStorage.setItem('cachedProdutos', JSON.stringify(novosProdutos));
    
    // Atualiza a tabela
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

    // Atualiza o cache local
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

// Restante das funções permanece igual...
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
    // Busca o produto no cache local primeiro
    const cachedProdutos = JSON.parse(localStorage.getItem('cachedProdutos') || '[]');
    let produto = cachedProdutos.find(p => p.nome.toLowerCase() === nome.toLowerCase());

    // Se não encontrou no cache, busca no servidor
    if (!produto) {
      const response = await fetch(`${apiURL}/buscar?nome=${encodeURIComponent(nome)}`);
      if (response.ok) {
        produto = await response.json();
      } else {
        throw new Error('Produto não encontrado');
      }
    }

    // Executa a movimentação
    const sucesso = await movimentarProduto(produto._id, tipo, qtd);
    
    if (sucesso) {
      // Limpa os campos após sucesso
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
    
    // Atualiza os produtos após importação
    carregarProdutos();
  } catch (error) {
    alert('Erro ao importar produtos.');
    console.error(error);
  }
}

// Função para calcular dias restantes até o vencimento
function calcularDiasRestantes(dataVencimento) {
  if (!dataVencimento) return Infinity; // Retorna infinito se não houver data
  
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  
  const vencimento = new Date(dataVencimento);
  vencimento.setHours(0, 0, 0, 0);
  
  const diffTime = vencimento - hoje;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
}

// Função para atualizar a zona crítica
function atualizarZonaCritica(produtos) {
  const hoje = new Date();
  
  // Filtrar produtos que estão próximos do vencimento (menos de 10 dias)
  const produtosVencendo = produtos.filter(produto => {
    if (!produto.vencimento) return false;
    const diasRestantes = calcularDiasRestantes(produto.vencimento);
    return diasRestantes >= 0 && diasRestantes < 10;
  });
  
  // Filtrar produtos com estoque baixo (menos de 10 unidades)
  const produtosAcabando = produtos.filter(produto => {
    return produto.quantidade < 10 && produto.quantidade > 0;
  });
  
  // Atualizar a tabela de produtos vencendo
  const tabelaVencendo = document.getElementById('tabelaVencendo').getElementsByTagName('tbody')[0];
  tabelaVencendo.innerHTML = '';
  
  produtosVencendo.forEach(produto => {
    const diasRestantes = calcularDiasRestantes(produto.vencimento);
    const tr = document.createElement('tr');
    
    // Adiciona classe de alerta se faltar menos de 3 dias
    if (diasRestantes < 3) {
      tr.classList.add('alerta-urgente');
    } else if (diasRestantes < 7) {
      tr.classList.add('alerta-proximo');
    }
    
    tr.innerHTML = `
      <td>${produto.nome}</td>
      <td>${produto.quantidade}</td>
      <td>${formatarDataExibicao(produto.vencimento)}</td>
      <td>${diasRestantes} dias</td>
    `;
    tabelaVencendo.appendChild(tr);
  });
  
  // Atualizar a tabela de produtos acabando
  const tabelaAcabando = document.getElementById('tabelaAcabando').getElementsByTagName('tbody')[0];
  tabelaAcabando.innerHTML = '';
  
  produtosAcabando.forEach(produto => {
    const tr = document.createElement('tr');
    
    // Adiciona classe de alerta se tiver menos de 3 unidades
    if (produto.quantidade < 3) {
      tr.classList.add('alerta-urgente');
    } else if (produto.quantidade < 5) {
      tr.classList.add('alerta-proximo');
    }
    
    tr.innerHTML = `
      <td>${produto.nome}</td>
      <td>${produto.quantidade}</td>
      <td>${formatarDataExibicao(produto.vencimento)}</td>
    `;
    tabelaAcabando.appendChild(tr);
  });
}