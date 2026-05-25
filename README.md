# 🏭 Projeto HackWeb — Rastreabilidade Operacional em Linha

Sistema de monitoramento industrial com rastreabilidade imutável via Blockchain (Sepolia Testnet).

**Residência em TIC 29**

---

## 📁 Estrutura de Arquivos

```
projeto-hackweb/
├── index.html          ← HTML principal
├── css/
│   └── styles.css      ← Todos os estilos
└── js/
    ├── main.js         ← Ponto de entrada (inicializa tudo)
    ├── config.js       ← Endereço do contrato e estado global
    ├── blockchain.js   ← Integração MetaMask + Sepolia (transações reais)
    ├── charts.js       ← Inicialização e atualização dos gráficos
    ├── simulacao.js    ← Lógica dos postos de produção
    ├── storage.js      ← Persistência por data/turno (localStorage)
    └── ui.js           ← KPIs, Andon, tabs, admin, exportação
```

---

## 🚀 Como subir no GitHub Pages

1. Crie um repositório no GitHub (pode ser público)
2. Faça upload de todos os arquivos **mantendo a estrutura de pastas**
3. Vá em **Settings → Pages → Branch: main → / (root)**
4. Aguarde ~1 min e acesse: `https://seu-usuario.github.io/nome-do-repo`

> ⚠️ **Importante:** o GitHub Pages serve os arquivos via HTTP, o que é necessário para os módulos ES6 funcionarem. Abrir o `index.html` direto no computador (sem servidor) não vai funcionar.

---

## 🔗 Blockchain

- **Rede:** Sepolia Testnet
- **Contrato:** `0xd6E773Ef8C793a5D4d8637e5E06347551056d738`
- Cada passagem de peça ou operador gera uma **transação real** assinada pela MetaMask
- Após confirmação, um link para o **Sepolia Etherscan** aparece no painel admin

### Pré-requisitos para usar o Blockchain
- MetaMask instalada no navegador
- Rede Sepolia configurada (o sistema troca automaticamente se necessário)
- Saldo de **SepoliaETH** na carteira (para pagar o gás das transações)
  - Faucet gratuito: https://sepoliafaucet.com

---

## 🛠️ Testando Localmente

Use a extensão **Live Server** do VS Code:
1. Abra a pasta do projeto no VS Code
2. Clique com botão direito em `index.html` → **Open with Live Server**

Ou use Python:
```bash
python -m http.server 8080
# Acesse: http://localhost:8080
```

---

## ⚙️ Configurações

No **Painel Admin** (usuário: `admin` / senha: `admin`) você pode:
- Ajustar Meta Diária, Limite DPMU e HC Previsto
- Configurar os Tempos de Ciclo de cada posto (não são mais fixos no código)
- Exportar relatório `.xlsx` por intervalo de datas
- Ver o link de cada transação confirmada no Etherscan

---

## 📊 KPIs Monitorados

| KPI | Descrição |
|---|---|
| **Meta do Dia** | Progresso de peças embaladas vs meta configurada |
| **DPMU** | Defeitos Por Milhão de Unidades |
| **FPY** | First Pass Yield — % aprovadas de primeira |
| **Operadores** | Headcount bipado vs planejado |
