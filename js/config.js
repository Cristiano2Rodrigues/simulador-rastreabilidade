// ============================================================
// config.js — Configurações globais e estado da aplicação
// ============================================================

export const CONTRACT_ADDRESS = "0xd6E773Ef8C793a5D4d8637e5E06347551056d738";

export const CONTRACT_ABI = [
    "function registrarPassagem(string calldata _chassi, string calldata _posto, string calldata _operador, bool _statusSucesso) external",
    "function alterarStatusOperador(string calldata _operador, bool _entrou) external",
    "function totalOperadores() external view returns (uint256)",
    "function pecasProduzidas() external view returns (uint256)",
    "function consultarHistorico(string memory _chassi) public view returns (tuple(string posto, uint256 timestamp, string operador, bool statusSucesso)[])"
];

// Nome da planta (configurável no admin)
export function obterNomePlanta() {
    return localStorage.getItem('nome_planta') || 'Planta SP - Matriz';
}

export function salvarNomePlanta(nome) {
    localStorage.setItem('nome_planta', nome);
}

// Estado global da linha de produção
export const estado = {
    atualProduzido: 0,
    atualDPMU: 0,
    totalBipadoReal: 0,
    entradasReparo: 0,
    saidasReparo: 0,
    loopsRetrabalho: 0,
    pecasMontagem: 0,
    pecasTeste: 0,
    falhasTorque: 0,
    falhasFuncionais: 0,
    falhasEsteticas: 0,
    horaApontamentoAtual: 0
};

export function resetarEstado() {
    Object.keys(estado).forEach(k => estado[k] = 0);
}
