export class Account {
  #saldo = 0;

  constructor(valorInicial = 0) {
    this.#saldo = valorInicial;
  }

  depositar(valor) { // parametro
    if (valor <= 0) throw new Error("Valor inválido");
    this.#saldo += valor;
  }

  sacar(valor) {
    if (valor <= 0) throw new Error("Valor inválido");
    if (valor > this.#saldo) throw new Error("Saldo insuficiente");
    this.#saldo -= valor;
  }

  get saldo() {
    return this.#saldo;
  }
}



