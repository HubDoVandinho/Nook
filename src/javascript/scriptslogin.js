
// Lógica de navegação temporária (será substituída pela lógica do Firebase)
function irParaLogin() {
    document.getElementById("tela-intro").classList.add("hidden");
    document.getElementById("box-login").classList.remove("hidden");
}

function alternarAuth(tipo) {
    if (tipo === 'cadastro') {
        document.getElementById("box-login").classList.add("hidden");
        document.getElementById("box-cadastro").classList.remove("hidden");
    } else {
        document.getElementById("box-cadastro").classList.add("hidden");
        document.getElementById("box-login").classList.remove("hidden");
    }
}

function irParaLogin() {
    document.getElementById("tela-intro").classList.add("hidden");
    document.getElementById("box-login").classList.remove("hidden");
    window.scrollTo(0, 0); // Garante que a tela comece no topo
}

// Volta do Login para a Intro
function voltarParaIntro() {
    document.getElementById("box-login").classList.add("hidden");
    document.getElementById("tela-intro").classList.remove("hidden");
    window.scrollTo(0, 0);
}

// Alterna entre Login e Cadastro
function alternarAuth(tipo) {
    if (tipo === 'cadastro') {
        document.getElementById("box-login").classList.add("hidden");
        document.getElementById("box-cadastro").classList.remove("hidden");
    } else {
        document.getElementById("box-cadastro").classList.add("hidden");
        document.getElementById("box-login").classList.remove("hidden");
    }
    window.scrollTo(0, 0);
}
