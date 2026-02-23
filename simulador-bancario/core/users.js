import { Cofre } from "./cofre.js";
import { Account } from "./account.js";
import { Plano } from "./plano.js";

export class Usuario {
  constructor(nome, senha, planoTipo) {
    this.nome = nome;
    this.cofre = new Cofre(senha);
    this.conta = new Account(1000);
    this.plano = new Plano(planoTipo);
  }
}
