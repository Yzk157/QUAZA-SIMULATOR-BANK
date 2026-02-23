import { Usuario } from "../core/users.js";
import { Account } from "../core/account.js";
import { Plano } from "../core/plano.js";

const usuario = new Usuario("Luccas", "1234");
const conta = new Account(1000);
const plano = new Plano("pro");

let logado = false;

export function login(senha) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      try {
        usuario.authenticate(senha);
        logado = true;
        resolve("✅ Login realizado com sucesso");
      } catch (e) {
        reject(e.message);
      }
    }, 800);
  });
}

export function sacar(valor) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      try {
        if (!logado) {
          throw new Error("Usuário não autenticado");
        }

        plano.usar("saque");
        conta.withdraw(valor);

        resolve({
          message: "💸 Saque realizado com sucesso",
          saldo: conta.getBalance()
        });
      } catch (e) {
        reject(e.message);
      }
    }, 800);
  });
}
