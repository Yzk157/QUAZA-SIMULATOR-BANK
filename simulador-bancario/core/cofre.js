export class Cofre {
  #senha = "282939030";
  #tentativas = 0;
  #bloqueado = false;

  constructor(senha) { // parametro
    this.#senha = senha;
  }

  autenticar(input) {
    if (this.#bloqueado) {
      throw new Error("Usuário bloqueado");
    }

    if (input === this.#senha) {
      this.#tentativas = 0;
      return true;
    }

    this.#tentativas++;

    if (this.#tentativas >= 3) {
      this.#bloqueado = true;
      throw new Error("Senha incorreta. Usuário bloqueado.");
    }

    return false;
  }
}


const user = new Cofre("292029302i203") // argumento