export class Plano {
  #limite;
  #uso = [];

  constructor(tipo) {
    const limites = {
      free: 2,
      pro: 5,
      premium: Infinity
    };

    this.#limite = limites[tipo] ?? 0;

    Object.defineProperty(this, "tipo", {
      value: tipo,
      writable: false,
      configurable: false
    });
  }

  usar(recurso) {
    if (this.#uso.length >= this.#limite) {
      throw new Error("Limite do plano atingido");
    }

    this.#uso.push({
      recurso,
      data: new Date().toISOString()
    });
  }

  get historico() {
    return [...this.#uso];
  }
}
