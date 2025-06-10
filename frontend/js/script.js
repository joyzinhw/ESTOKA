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

// Função para atualizar a tabela com os produtos
function atualizarTabela(produtos) {
  const tabela = document.getElementById('produtosTable');
  if (!tabela) return;

  tabela.innerHTML = '';

  produtos.forEach(prod => {
    const tr = document.createElement('tr');
    
    // Formata a data para exibição
    let dataFormatada = 'Sem data';
    if (prod.vencimento) {
      const date = new Date(prod.vencimento);
      if (!isNaN(date.getTime())) {
        // Ajusta para o timezone local antes de formatar
        const offset = date.getTimezoneOffset() * 60000; // offset em milissegundos
        const localDate = new Date(date.getTime() - offset);
        dataFormatada = localDate.toISOString().split('T')[0].split('-').reverse().join('/');
      }
    }
    
    tr.innerHTML = `
      <td>${prod.nome}</td>
      <td>${prod.quantidade ?? 0}</td>
      <td>${dataFormatada}</td>
      <td>
      <button onclick="deletarProduto('${prod._id}')">DELETAR</button>
      <button onclick="editarProdutoPrompt('${prod._id}')">EDITAR</button>
      </td>
    `;
    tabela.appendChild(tr);
  });
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
  const vencimento = document.getElementById('produtoVencimento').value;

  if (!nome || isNaN(quantidade) || quantidade < 0 || !vencimento) {
    alert('Preencha todos os campos corretamente! A data de vencimento é obrigatória.');
    return;
  }

  try {
    const res = await fetch(apiURL);
    const produtos = await res.json();
    const nomeExiste = produtos.some(p => p.nome.toLowerCase() === nome.toLowerCase());

    if (nomeExiste) {
      alert('Já existe um produto com esse nome!');
      return;
    }

    const response = await fetch(apiURL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome, quantidade, vencimento })
    });

    const novoProduto = await response.json();

    // Atualiza o cache local com o novo produto
    const cachedProdutos = JSON.parse(localStorage.getItem('cachedProdutos') || '[]');
    cachedProdutos.push(novoProduto);
    localStorage.setItem('cachedProdutos', JSON.stringify(cachedProdutos));

    document.getElementById('produtoNome').value = '';
    document.getElementById('produtoQtd').value = '';
    document.getElementById('produtoVencimento').value = '';
    
    // Atualiza a tabela
    atualizarTabela(cachedProdutos);
  } catch (error) {
    console.error('Erro ao cadastrar produto:', error);
    alert('Erro ao cadastrar produto.');
  }
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

async function editarProdutoPrompt(id) {
  const cachedProdutos = JSON.parse(localStorage.getItem('cachedProdutos') || '[]');
  const produto = cachedProdutos.find(p => p._id === id);
  if (!produto) {
    alert('Produto não encontrado.');
    return;
  }

  // Formata a data atual para exibição no prompt (DD/MM/AAAA)
  const dataAtual = produto.vencimento ? 
    new Date(produto.vencimento).toLocaleDateString('pt-BR') : '';

  const novoNome = prompt('Editar nome do produto:', produto.nome);
  if (novoNome === null) return;

  const novaQtdStr = prompt('Editar quantidade:', produto.quantidade);
  if (novaQtdStr === null) return;
  
  const novaQtd = parseInt(novaQtdStr);
  if (isNaN(novaQtd)) {
    alert('Quantidade deve ser um número válido.');
    return;
  }

  const novoVenc = prompt('Editar data de validade (DD/MM/AAAA):', dataAtual);
  if (novoVenc === null) return;

  // Converte a data de DD/MM/AAAA para AAAA-MM-DD (formato ISO)
  let vencimentoISO = null;
  if (novoVenc) {
    const [day, month, year] = novoVenc.split('/');
    vencimentoISO = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    
    // Valida a data
    const dateObj = new Date(vencimentoISO);
    if (isNaN(dateObj.getTime())) {
      alert('Data inválida! Use o formato DD/MM/AAAA.');
      return;
    }
  }

  await atualizarProduto(id, { 
    nome: novoNome, 
    quantidade: novaQtd, 
    vencimento: vencimentoISO 
  });
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
  }     console.error('Erro ao atualizar produto:', error);

  try {
    const response = await fetch(`${apiURL}/${id}/movimentar`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tipo, quantidade })
    });
    
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
  } catch (error) {
    console.error('Erro ao movimentar produto:', error);
    alert('Erro ao movimentar produto.');
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

  if (!nome || isNaN(qtd) || qtd <= 0) {
    alert('Informe o nome do produto e uma quantidade válida.');
    return;
  }

  const produto = await buscarProdutoPorNome(nome);
  if (!produto) {
    alert('Produto não encontrado.');
    return;
  }

  movimentarProduto(produto._id, tipo, qtd);

  document.getElementById('nomeProdutoMovimento').value = '';
  document.getElementById('qtdMovimento').value = '';
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