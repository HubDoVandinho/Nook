import { auth, db } from './firebase-config.js';
import { 
    onAuthStateChanged, 
    signOut, 
    sendPasswordResetEmail, 
    deleteUser 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { 
    collection, 
    addDoc, 
    onSnapshot, 
    query, 
    doc, 
    updateDoc, 
    deleteDoc, 
    arrayUnion, 
    arrayRemove, 
    where,
    getDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// VARIÁVEIS DE ESTADO
let usuarioAtual = null;
let viagens = [];
let viagemAtivaId = null;
let gastoAtivoId = null;
let unsubscribeViagens = null; // Variável para controlar o ouvinte

onAuthStateChanged(auth, (user) => {
    if (user) {
        usuarioAtual = user;
        // Limpa ouvinte anterior se existir para evitar duplicidade
        if (unsubscribeViagens) unsubscribeViagens(); 
        
        ouvirViagens();
    } else { 
        window.location.href = 'index.html'; 
    }
});

function ouvirViagens() {
    const q = query(collection(db, "viagens"), where("participantes", "array-contains", usuarioAtual.uid));
    
    // Armazena a função de cancelamento
    unsubscribeViagens = onSnapshot(q, (snapshot) => {
        viagens = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderizarListaViagens();
        
        // Só renderiza gastos se estivermos na tela de detalhes
        if (viagemAtivaId) {
            renderizarGastos();
        }
    });
}



// =========================================
// 2. FUNÇÕES DE AVISO/MODAL CUSTOMIZADO
// =========================================
window.mostrarAviso = (titulo, mensagem) => {
    document.getElementById("modal-aviso-titulo").innerText = titulo;
    document.getElementById("modal-aviso-mensagem").innerText = mensagem;
    document.getElementById("modal-aviso")?.classList.remove("hidden");
};

window.fecharModalAviso = () => {
    document.getElementById("modal-aviso")?.classList.add("hidden");
};

// =========================================
// 3. SIDEBAR E CONTA
// =========================================
window.alternarSidebar = () => {
    const sidebar = document.getElementById("sidebar");
    const overlay = document.getElementById("sidebar-overlay");
    if (sidebar && overlay) {
        sidebar.classList.toggle("ativa");
        overlay.classList.toggle("hidden");
    }
};

window.logout = () => signOut(auth);

window.solicitarResetSenha = () => {
    if (!usuarioAtual) return;
    sendPasswordResetEmail(auth, usuarioAtual.email)
        .then(() => mostrarAviso("Sucesso", "E-mail de redefinição enviado!" + "\nVerifique sua caixa de entrada."))
        .catch(err => mostrarAviso("Erro", err.message));
};

window.abrirModalExcluirConta = () => {
    document.getElementById("modal-delete-account")?.classList.remove("hidden");
};

window.fecharModalExcluirConta = () => {
    document.getElementById("modal-delete-account")?.classList.add("hidden");
};

window.confirmarExcluirConta = () => {
    if (!usuarioAtual) return;
    deleteUser(usuarioAtual)
        .then(() => { 
            mostrarAviso("Sucesso", "Conta excluída permanentemente.");
            setTimeout(() => window.location.href = 'index.html', 1500);
        })
        .catch(() => mostrarAviso("Erro", "Por segurança, saia e entre novamente na conta antes de excluí-la."));
};

// =========================================
// 4. GESTÃO DE VIAGENS (FIRESTORE)
// =========================================


window.alternarFormularioViagem = (el) => {
    const container = document.querySelector(".btn-add-viagem");
    if (container) container.classList.toggle("aberto");
};

// Criar Nova Viagem
document.querySelector(".box-nova-viagem")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const nome = document.getElementById("nome-viagem").value;
    const data = document.getElementById("data-viagem").value;

    try {
        await addDoc(collection(db, "viagens"), {
            nome: nome,
            data: data,
            status: "Em andamento",
            gastos: [],
            participantes: [usuarioAtual.uid],
            criador: usuarioAtual.uid,
            criadoEm: Date.now()
        });
        e.target.reset();
        window.alternarFormularioViagem();
        mostrarAviso("Sucesso!", "Viagem criada com sucesso! 🎉");
    } catch (err) { 
        mostrarAviso("Erro", "Erro ao criar viagem: " + err.message);
    }
});

// Entrar em viagem coletiva via Código
window.entrarNaViagem = async () => {
    const cod = document.getElementById("codigo-convite").value.trim();
    if (!cod) return mostrarAviso("Atenção", "Insira o código da viagem.");
    
    if (cod.length < 10) {
        return mostrarAviso("Atenção", "Código inválido. Copie o código completo.");
    }
    
    try {
        const viagem = await getDoc(doc(db, "viagens", cod));
        
        if (!viagem.exists()) {
            mostrarAviso("Erro", "Viagem não encontrada. Verifique o código.");
            return;
        }
        
        const viagemData = viagem.data();
        const participantes = viagemData.participantes || [];
        
        // Verificar se já é participante
        if (participantes.includes(usuarioAtual.uid)) {
            mostrarAviso("Atenção", "Você já faz parte de '" + viagemData.nome + "'!");
            document.getElementById("codigo-convite").value = "";
            return;
        }
        
        // Adiciona o usuário aos participantes (apenas UID)
        await updateDoc(doc(db, "viagens", cod), { 
            participantes: arrayUnion(usuarioAtual.uid) 
        });
        mostrarAviso("Sucesso!", "Bem-vindo a '" + viagemData.nome + "'! 🎉");
        document.getElementById("codigo-convite").value = "";
        
        // Aguarda um pouco para o Firestore sincronizar e recarrega
        setTimeout(() => {
            window.location.reload();
        }, 1500);
    } catch (err) { 
        console.error("Erro ao entrar na viagem:", err);
        mostrarAviso("Erro", "Erro ao entrar na viagem: " + err.message);
    }
};

// =========================================
// 5. GESTÃO DE GASTOS
// =========================================
document.getElementById("form-gasto")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const valRaw = document.getElementById("gasto-valor").value;
    const val = parseFloat(valRaw.replace("R$ ", "").replace(/\./g, "").replace(",", "."));
    
    if (isNaN(val) || val <= 0) return mostrarAviso("Atenção", "Por favor, insira um valor válido.");

    const novoGasto = { 
        id: Date.now(), 
        nome: document.getElementById("gasto-nome").value, 
        valor: val, 
        autor: usuarioAtual.email, 
        data: new Date().toLocaleDateString('pt-BR'),
        hora: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    try {
        await updateDoc(doc(db, "viagens", viagemAtivaId), { 
            gastos: arrayUnion(novoGasto) 
        });
        e.target.reset();
        mostrarAviso("Sucesso", "Gasto adicionado com sucesso!");
    } catch (err) {
        mostrarAviso("Erro", "Erro ao adicionar gasto: " + err.message);
    }
});

// =========================================
// 6. GESTÃO DE PARTICIPANTES
// =========================================
function renderizarParticipantes() {
    const v = viagens.find(x => x.id === viagemAtivaId);
    if (!v) return;

    const lista = document.getElementById("lista-participantes");
    if (!lista) return;
    
    lista.innerHTML = "";
    
    if (!v.participantes || v.participantes.length === 0) {
        const p = document.createElement("p");
        p.textContent = "Nenhum participante ainda.";
        p.style.fontSize = "0.9rem";
        p.style.color = "#666";
        lista.appendChild(p);
        return;
    }

    v.participantes.forEach(participante => {
        // Compatibilidade: se participante for string (uid), usa uid direto
        const uid = typeof participante === 'string' ? participante : participante.uid;
        
        const div = document.createElement("div");
        div.style.display = "flex";
        div.style.justifyContent = "space-between";
        div.style.alignItems = "center";
        div.style.padding = "8px 0";
        div.style.borderBottom = "1px solid #eee";

        const info = document.createElement("span");
        const isCreator = uid === v.criador;
        const isMeCreator = v.criador === usuarioAtual.uid;
        
        // Mostra nome se for você, caso contrário mostra UID
        const displayName = uid === usuarioAtual.uid ? "(Você)" : uid;
        info.textContent = (isCreator ? "👑 " : "") + displayName;
        info.style.fontSize = "0.9rem";
        info.style.fontWeight = isCreator ? "bold" : "normal";
        div.appendChild(info);

        if (isMeCreator && uid !== usuarioAtual.uid) {
            const btn = document.createElement("button");
            btn.textContent = "Remover";
            btn.style.padding = "4px 8px";
            btn.style.fontSize = "0.8rem";
            btn.style.backgroundColor = "#ff6b6b";
            btn.style.color = "white";
            btn.style.border = "none";
            btn.style.borderRadius = "4px";
            btn.style.cursor = "pointer";
            btn.onclick = () => removerParticipante(uid);
            div.appendChild(btn);
        }

        lista.appendChild(div);
    });
}

window.convidarPorEmail = async () => {
    const email = document.getElementById("email-convite").value.trim();
    if (!email) return mostrarAviso("Atenção", "Insira um email válido.");
    
    const v = viagens.find(x => x.id === viagemAtivaId);
    if (!v) return mostrarAviso("Erro", "Viagem não encontrada.");
    
    mostrarAviso(
        "Convite Enviado",
        "Envie este código para o seu amigo:\n\n" + viagemAtivaId + 
        "\n\nEle deve colar esse código em 'Entrar em Viagem Coletiva'."
    );
    document.getElementById("email-convite").value = "";
};

window.removerParticipante = async (uidRemover) => {
    const v = viagens.find(x => x.id === viagemAtivaId);
    if (!v || v.criador !== usuarioAtual.uid) {
        mostrarAviso("Sem Permissão", "Apenas o criador pode remover participantes.");
        return;
    }

    try {
        // Filtrar removendo o participante pelo uid
        const novoArray = v.participantes.filter(p => {
            const uid = typeof p === 'string' ? p : p.uid;
            return uid !== uidRemover;
        });
        await updateDoc(doc(db, "viagens", viagemAtivaId), {
            participantes: novoArray
        });
        mostrarAviso("Sucesso", "Participante removido da viagem.");
    } catch (err) {
        mostrarAviso("Erro", "Erro ao remover participante: " + err.message);
    }
};

// =========================================
// 7. NAVEGAÇÃO E RENDERIZAÇÃO
// =========================================
function renderizarListaViagens() {
    const container = document.getElementById("container-listagem");
    if (!container) return;
    container.innerHTML = "";

    if (!viagens || viagens.length === 0) {
        const empty = document.createElement("p");
        empty.style.textAlign = "center";
        empty.style.color = "#666";
        empty.textContent = "Nenhuma viagem ainda. Crie uma nova!";
        container.appendChild(empty);
        return;
    }

    const viagensOrdenadas = [...viagens].sort((a, b) => (b.criadoEm || 0) - (a.criadoEm || 0));

    viagensOrdenadas.forEach(v => {
        // --- INÍCIO DA CORREÇÃO ---
        // Se v.gastos não existir (viagem nova), ele usa um array vazio []
        const listaGastos = v.gastos || [];
        // Soma os valores com segurança, tratando casos onde g.valor possa ser nulo
        const total = listaGastos.reduce((s, g) => s + (g.valor || 0), 0);
        // --- FIM DA CORREÇÃO ---

        const div = document.createElement("div");
        div.className = "box-viagem";
        div.style.marginBottom = "15px";
        
        const titulo = document.createElement("h1");
        titulo.textContent = v.nome;
        div.appendChild(titulo);
        
        const data = document.createElement("p");
        data.textContent = "Data: " + formatarData(v.data);
        div.appendChild(data);
        
        const status = document.createElement("p");
        status.innerHTML = "Status: <span>" + (v.status || "Em andamento") + "</span>";
        div.appendChild(status);
        
        const totalP = document.createElement("p");
        totalP.innerHTML = "Total: <strong>R$ " + total.toLocaleString('pt-BR', {minimumFractionDigits: 2}) + "</strong>";
        div.appendChild(totalP);
        
        const btn = document.createElement("button");
        btn.textContent = "ACESSAR DETALHES";
        btn.onclick = () => abrirDetalhes(v.id);
        div.appendChild(btn);
        
        container.appendChild(div);
    });
}

window.abrirDetalhes = (id) => {
    viagemAtivaId = id;
    const v = viagens.find(x => x.id === id);
    if (!v) return;
    
    // Esconde lista, mostra detalhes
    document.getElementById("tela-lista").classList.add("hidden");
    document.getElementById("tela-detalhes").classList.remove("hidden");
    
    // Preenche cabeçalho
    document.getElementById("detalhe-titulo").innerText = v.nome;
    document.getElementById("detalhe-data").innerText = "Data: " + formatarData(v.data);
    document.getElementById("status-viagem").value = v.status;

    // --- CORREÇÃO AQUI ---
    // Verifique se o elemento existe antes de tentar escrever nele
    const displayId = document.getElementById("viagem-id-display");
    if (displayId) displayId.innerText = id;
    // ---------------------

    // Configura permissões do criador
    const isCreator = v.criador === usuarioAtual.uid;
    const btnDelete = document.querySelector(".btn-excluir-viagem");
    if (btnDelete) btnDelete.style.display = isCreator ? "block" : "none";
    
    // Renderiza o conteúdo específico desta viagem
    renderizarParticipantes();
    renderizarGastos();
    window.scrollTo(0, 0);
};

window.voltarParaLista = () => {
    viagemAtivaId = null;
    document.getElementById("tela-detalhes").classList.add("hidden");
    document.getElementById("tela-lista").classList.remove("hidden");
    
    document.getElementById("btn-voltar-global")?.classList.add("hidden");
};

function renderizarGastos() {
    const v = viagens.find(x => x.id === viagemAtivaId);
    if (!v) return;

    const lista = document.getElementById("lista-gastos");
    const totalLabel = document.getElementById("total-valor");
    lista.innerHTML = "";
    
    let total = 0;
    if (!v.gastos || v.gastos.length === 0) {
        totalLabel.innerText = "R$ 0,00";
        return;
    }
    
    v.gastos.forEach(g => {
        if (!g || !g.id || !g.valor) return;
        
        total += g.valor;
        const div = document.createElement("div");
        div.className = "item-gasto";
        
        const infoDiv = document.createElement("div");
        
        const nome = document.createElement("strong");
        nome.textContent = g.nome || "Gasto sem nome";
        infoDiv.appendChild(nome);
        
        infoDiv.appendChild(document.createElement("br"));
        
        const info = document.createElement("small");
        const autorName = g.autor && g.autor.includes('@') ? g.autor.split('@')[0] : (g.autor || "Desconhecido");
        info.textContent = (g.data || "--/--/----") + " às " + (g.hora || "--:--") + " por " + autorName;
        infoDiv.appendChild(info);
        
        div.appendChild(infoDiv);
        
        const valorDiv = document.createElement("div");
        valorDiv.style.display = "flex";
        valorDiv.style.alignItems = "center";
        valorDiv.style.gap = "10px";
        
        const valor = document.createElement("strong");
        valor.textContent = "R$ " + g.valor.toLocaleString('pt-BR', {minimumFractionDigits: 2});
        valorDiv.appendChild(valor);
        
        const btn = document.createElement("button");
        btn.className = "btn-del-gasto";
        btn.textContent = "×";
        btn.onclick = () => solicitarExclusaoGasto(g.id);
        valorDiv.appendChild(btn);
        
        div.appendChild(valorDiv);
        lista.appendChild(div);
    });
    totalLabel.innerText = `R$ ${total.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
}

// =========================================
// 8. UTILITÁRIOS E MÁSCARAS
// =========================================
function formatarData(data) {
    if (!data) return "--/--/----";
    const [ano, mes, dia] = data.split("-");
    return `${dia}/${mes}/${ano}`;
}

function configurarMascaraMoeda() {
    const inputValor = document.getElementById("gasto-valor");
    if (!inputValor) return;
    inputValor.addEventListener("input", (e) => {
        let v = e.target.value.replace(/\D/g, "");
        v = (v / 100).toFixed(2).replace(".", ",");
        v = v.replace(/(\d)(\d{3}),/g, "$1.$2,");
        e.target.value = "R$ " + v;
    });
}

window.copiarCodigo = () => {
    const cod = document.getElementById("viagem-id-display").innerText;
    navigator.clipboard.writeText(cod);
    mostrarAviso("Sucesso", "Código copiado! Envie para seus amigos entrarem na viagem.");
};

// Funções de Exclusão (Modais)
window.abrirModal = () => document.getElementById("modal-exclusao")?.classList.remove("hidden");
window.fecharModal = () => document.getElementById("modal-exclusao")?.classList.add("hidden");

window.confirmarExclusao = async () => {
    const v = viagens.find(x => x.id === viagemAtivaId);
    
    if (v.criador !== usuarioAtual.uid) {
        mostrarAviso("Sem Permissão", "Apenas o criador pode deletar a viagem.");
        return;
    }
    
    try {
        await deleteDoc(doc(db, "viagens", viagemAtivaId));
        fecharModal();
        voltarParaLista();
    } catch (err) { mostrarAviso("Erro", "Erro ao excluir viagem."); }
};

window.solicitarExclusaoGasto = (id) => { 
    const v = viagens.find(x => x.id === viagemAtivaId);
    const g = v.gastos.find(x => x.id === id);
    
    if (g.autor !== usuarioAtual.email) {
        mostrarAviso("Sem Permissão", "Você só pode deletar gastos que criou.");
        return;
    }
    
    gastoAtivoId = id; 
    document.getElementById("modal-exclusao-gasto")?.classList.remove("hidden"); 
};

window.fecharModalGasto = () => document.getElementById("modal-exclusao-gasto")?.classList.add("hidden");

window.confirmarExclusaoGasto = async () => {
    const v = viagens.find(x => x.id === viagemAtivaId);
    if (!v) {
        mostrarAviso("Erro", "Viagem não encontrada.");
        return;
    }
    
    const g = v.gastos.find(x => x.id === gastoAtivoId);
    if (!g) {
        mostrarAviso("Erro", "Gasto não encontrado.");
        fecharModalGasto();
        return;
    }
    
    try {
        await updateDoc(doc(db, "viagens", viagemAtivaId), { 
            gastos: arrayRemove(g) 
        });
        mostrarAviso("Sucesso", "Gasto deletado com sucesso!");
        fecharModalGasto();
    } catch (err) {
        mostrarAviso("Erro", "Erro ao deletar gasto: " + err.message);
    }
};

window.atualizarStatusNoArray = async () => {
    const v = viagens.find(x => x.id === viagemAtivaId);
    
    if (v.criador !== usuarioAtual.uid) {
        mostrarAviso("Sem Permissão", "Apenas o criador pode alterar o status da viagem.");
        return;
    }
    
    try {
        const novoStatus = document.getElementById("status-viagem").value;
        await updateDoc(doc(db, "viagens", viagemAtivaId), { status: novoStatus });
        mostrarAviso("Sucesso", "Status atualizado com sucesso!");
    } catch (err) {
        mostrarAviso("Erro", "Erro ao atualizar status: " + err.message);
    }
};
