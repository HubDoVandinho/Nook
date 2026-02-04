import { auth } from './firebase-config.js';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// =========================================
// FUNÇÕES DE AVISO/MODAL CUSTOMIZADO
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
// LÓGICA DE CADASTRO
// =========================================
document.getElementById('form-cadastro')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('cad-email').value;
    const emailConfirm = document.getElementById('cad-email-confirm').value;
    const senha = document.getElementById('cad-senha').value;
    const senhaConfirm = document.getElementById('cad-senha-confirm').value;

    // Validações
    if (email !== emailConfirm) {
        mostrarAviso("Atenção", "Os e-mails não coincidem!");
        return;
    }
    if (senha !== senhaConfirm) {
        mostrarAviso("Atenção", "As senhas não coincidem!");
        return;
    }
    if (senha.length < 6) {
        mostrarAviso("Atenção", "A senha deve ter pelo menos 6 caracteres.");
        return;
    }

    try {
        const nome = document.getElementById('cad-nome').value;
        const userCredential = await createUserWithEmailAndPassword(auth, email, senha);
        // Salvar o nome no Profile do usuário
        await updateProfile(userCredential.user, {
            displayName: nome
        });
        window.location.href = 'dashboard.html'; // Redireciona para a tela principal
    } catch (error) {
        mostrarAviso("Erro ao cadastrar", error.message);
    }
});

// =========================================
// LÓGICA DE LOGIN
// =========================================
document.getElementById('form-login')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const senha = document.getElementById('login-senha').value;
    
    try {
        await signInWithEmailAndPassword(auth, email, senha);
        window.location.href = 'dashboard.html';
    } catch (error) {
        mostrarAviso("Erro ao entrar", "Verifique e-mail e senha.");
    }
});