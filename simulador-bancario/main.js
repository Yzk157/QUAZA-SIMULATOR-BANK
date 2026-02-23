import { Usuario } from "./core/users.js";

const PLAN_LIMITS = {
  free: 2,
  pro: 5,
  premium: Number.POSITIVE_INFINITY
};

const PLAN_LABELS = {
  free: "Free",
  pro: "Pro",
  premium: "Premium"
};

const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL"
});

const DATETIME = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "medium",
  timeStyle: "medium"
});

const CLOCK = new Intl.DateTimeFormat("pt-BR", {
  weekday: "long",
  day: "2-digit",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit"
});

const state = {
  user: null,
  authenticated: false,
  failedAttempts: 0,
  goalTarget: 2500,
  goalSaved: 0,
  goalReached: false,
  bonusClaimed: false,
  statement: []
};

const ui = {
  userName: document.getElementById("userName"),
  userPlan: document.getElementById("userPlan"),
  accountPin: document.getElementById("accountPin"),
  loginPin: document.getElementById("loginPin"),
  createAccountBtn: document.getElementById("createAccountBtn"),
  loginBtn: document.getElementById("loginBtn"),
  logoutBtn: document.getElementById("logoutBtn"),
  authStatus: document.getElementById("authStatus"),
  attemptStatus: document.getElementById("attemptStatus"),
  clockDate: document.getElementById("clockDate"),
  balanceValue: document.getElementById("balanceValue"),
  savedValue: document.getElementById("savedValue"),
  planValue: document.getElementById("planValue"),
  opsLeftValue: document.getElementById("opsLeftValue"),
  goalAmount: document.getElementById("goalAmount"),
  setGoalBtn: document.getElementById("setGoalBtn"),
  goalProgressTrack: document.querySelector(".goal-progress"),
  goalProgressBar: document.getElementById("goalProgressBar"),
  goalProgressText: document.getElementById("goalProgressText"),
  perkText: document.getElementById("perkText"),
  claimBonusBtn: document.getElementById("claimBonusBtn"),
  bonusStatus: document.getElementById("bonusStatus"),
  operationsPanel: document.getElementById("operationsPanel"),
  depositForm: document.getElementById("depositForm"),
  withdrawForm: document.getElementById("withdrawForm"),
  transferForm: document.getElementById("transferForm"),
  reserveForm: document.getElementById("reserveForm"),
  depositAmount: document.getElementById("depositAmount"),
  withdrawAmount: document.getElementById("withdrawAmount"),
  transferAmount: document.getElementById("transferAmount"),
  transferTarget: document.getElementById("transferTarget"),
  reserveAmount: document.getElementById("reserveAmount"),
  actionStatus: document.getElementById("actionStatus"),
  clearStatementBtn: document.getElementById("clearStatementBtn"),
  statementList: document.getElementById("statementList")
};

const lockableElements = document.querySelectorAll("[data-lock]");
const authGatedContainers = document.querySelectorAll(".requires-auth");

function formatMoney(value) {
  return BRL.format(value);
}

function parsePositiveAmount(rawValue, fieldName) {
  const normalized = String(rawValue).trim().replace(",", ".");
  const amount = Number(normalized);

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error(`${fieldName} precisa ser maior que zero.`);
  }

  return amount;
}

function setStatus(element, message, type = "info") {
  element.textContent = message;
  element.className = `status ${type}`;
}

function addStatement(title, detail) {
  state.statement.unshift({
    title,
    detail,
    timestamp: new Date()
  });

  if (state.statement.length > 24) {
    state.statement.length = 24;
  }

  renderStatement();
}

function renderStatement() {
  ui.statementList.innerHTML = "";

  if (!state.statement.length) {
    const empty = document.createElement("li");
    empty.className = "empty-state";
    empty.textContent = "Nenhuma movimentacao registrada.";
    ui.statementList.append(empty);
    return;
  }

  for (const item of state.statement) {
    const row = document.createElement("li");
    row.className = "statement-item";

    const title = document.createElement("strong");
    title.textContent = item.title;

    const detail = document.createElement("p");
    detail.textContent = item.detail;

    const timestamp = document.createElement("time");
    timestamp.textContent = DATETIME.format(item.timestamp);

    row.append(title, detail, timestamp);
    ui.statementList.append(row);
  }
}

function getPlanMetrics() {
  if (!state.user) {
    return {
      label: "--",
      used: 0,
      leftLabel: "--"
    };
  }

  const type = state.user.plano.tipo;
  const used = state.user.plano.historico.length;
  const limit = Object.prototype.hasOwnProperty.call(PLAN_LIMITS, type) ? PLAN_LIMITS[type] : 0;

  if (!Number.isFinite(limit)) {
    return {
      label: Object.prototype.hasOwnProperty.call(PLAN_LABELS, type) ? PLAN_LABELS[type] : type,
      used,
      leftLabel: "Ilimitado"
    };
  }

  const left = Math.max(limit - used, 0);

  return {
    label: Object.prototype.hasOwnProperty.call(PLAN_LABELS, type) ? PLAN_LABELS[type] : type,
    used,
    leftLabel: `${left} / ${limit}`
  };
}

function updateAttemptStatus() {
  const remaining = Math.max(3 - state.failedAttempts, 0);

  if (state.authenticated) {
    ui.attemptStatus.textContent = "Cofre aberto com sucesso.";
    return;
  }

  if (remaining === 0) {
    ui.attemptStatus.textContent = "Conta bloqueada. Crie uma nova conta simulada para resetar.";
    return;
  }

  ui.attemptStatus.textContent = `Tentativas restantes: ${remaining}`;
}

function updatePerkText() {
  if (!state.user) {
    ui.perkText.textContent = "Vantagem do plano: sem bonus ativo.";
    return;
  }

  if (state.user.plano.tipo === "premium") {
    ui.perkText.textContent = "Vantagem premium: deposito recebe cashback de 2% (maximo R$ 20).";
    return;
  }

  ui.perkText.textContent = "Vantagem do plano: foco em operacoes essenciais.";
}

function updateBonusStatus() {
  if (!state.authenticated) {
    ui.bonusStatus.textContent = "Bonus diario disponivel apos login.";
    return;
  }

  if (state.bonusClaimed) {
    ui.bonusStatus.textContent = "Bonus diario ja resgatado nesta sessao.";
    return;
  }

  ui.bonusStatus.textContent = "Bonus pronto para resgate.";
}

function updateGoalProgress() {
  const goal = state.goalTarget;
  const saved = state.goalSaved;
  const progress = goal > 0 ? Math.min((saved / goal) * 100, 100) : 0;

  ui.goalProgressBar.style.width = `${progress.toFixed(2)}%`;
  ui.goalProgressTrack.setAttribute("aria-valuenow", progress.toFixed(0));
  ui.goalProgressText.textContent = `${progress.toFixed(0)}% da meta atingida`;
}

function syncLockState() {
  const locked = !state.authenticated;

  for (const element of lockableElements) {
    element.disabled = locked;
  }

  for (const container of authGatedContainers) {
    container.classList.toggle("locked", locked);
  }
}

function updateDashboard() {
  const balance = state.user ? state.user.conta.saldo : 0;
  const plan = getPlanMetrics();

  ui.balanceValue.textContent = formatMoney(balance);
  ui.savedValue.textContent = formatMoney(state.goalSaved);
  ui.planValue.textContent = plan.label;
  ui.opsLeftValue.textContent = plan.leftLabel;

  updateAttemptStatus();
  updatePerkText();
  updateBonusStatus();
  updateGoalProgress();
  syncLockState();
  ui.operationsPanel.setAttribute("data-locked", String(!state.authenticated));
}

function assertAuthenticated() {
  if (!state.authenticated) {
    throw new Error("Faca login para executar operacoes.");
  }
}

function assertPlanRoom() {
  if (!state.user) {
    throw new Error("Crie uma conta antes de operar.");
  }

  const type = state.user.plano.tipo;
  const limit = Object.prototype.hasOwnProperty.call(PLAN_LIMITS, type) ? PLAN_LIMITS[type] : 0;

  if (!Number.isFinite(limit)) {
    return;
  }

  if (state.user.plano.historico.length >= limit) {
    throw new Error("Limite do plano atingido. Atualize para Premium para operacoes ilimitadas.");
  }
}

function executeOperation(resource, actionFn, successMessage) {
  let succeeded = false;

  try {
    assertAuthenticated();
    assertPlanRoom();
    actionFn();
    state.user.plano.usar(resource);
    addStatement(resource, successMessage);
    setStatus(ui.actionStatus, successMessage, "success");
    succeeded = true;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro inesperado ao executar operacao.";
    setStatus(ui.actionStatus, message, "error");
  } finally {
    updateDashboard();
  }

  return succeeded;
}

function createAccount() {
  const name = ui.userName.value.trim() || "Cliente QUAZA";
  const planType = ui.userPlan.value;
  const pin = ui.accountPin.value.trim();

  if (pin.length < 4) {
    setStatus(ui.authStatus, "PIN precisa ter pelo menos 4 digitos.", "error");
    return;
  }

  state.user = new Usuario(name, pin, planType);
  state.user.conta.depositar(500);
  state.authenticated = false;
  state.failedAttempts = 0;
  state.goalTarget = 2500;
  state.goalSaved = 0;
  state.goalReached = false;
  state.bonusClaimed = false;
  state.statement = [];

  ui.goalAmount.value = String(state.goalTarget);
  ui.loginPin.value = "";

  addStatement("Conta criada", `${name} iniciou com saldo ${formatMoney(state.user.conta.saldo)} no plano ${PLAN_LABELS[planType]}.`);
  setStatus(ui.authStatus, "Conta simulada criada. Entre com seu PIN para abrir o cofre.", "success");
  setStatus(ui.actionStatus, "Aguardando operacao.", "info");
  updateDashboard();
}

function handleLogin() {
  if (!state.user) {
    setStatus(ui.authStatus, "Crie uma conta antes de fazer login.", "error");
    return;
  }

  const pin = ui.loginPin.value.trim();

  if (!pin) {
    setStatus(ui.authStatus, "Digite seu PIN para abrir o cofre.", "error");
    return;
  }

  try {
    const isValid = state.user.cofre.autenticar(pin);

    if (isValid) {
      state.authenticated = true;
      state.failedAttempts = 0;
      setStatus(ui.authStatus, `Login aprovado. Bem-vindo, ${state.user.nome}.`, "success");
      setStatus(ui.actionStatus, "Operacoes liberadas.", "info");
      addStatement("Login", "Acesso autenticado no cofre QUAZA.");
    } else {
      state.authenticated = false;
      state.failedAttempts += 1;
      const left = Math.max(3 - state.failedAttempts, 0);
      setStatus(ui.authStatus, `PIN invalido. Restam ${left} tentativa(s).`, "error");
    }
  } catch (error) {
    state.authenticated = false;
    state.failedAttempts = 3;
    const message = error instanceof Error ? error.message : "Conta bloqueada.";
    setStatus(ui.authStatus, message, "error");
    setStatus(ui.actionStatus, "Conta bloqueada. Crie uma nova conta simulada para resetar.", "warning");
  } finally {
    updateDashboard();
  }
}

function handleLogout() {
  if (!state.authenticated) {
    return;
  }

  state.authenticated = false;
  ui.loginPin.value = "";
  setStatus(ui.authStatus, "Sessao encerrada com seguranca.", "info");
  setStatus(ui.actionStatus, "Login necessario para novas operacoes.", "warning");
  addStatement("Logout", "Sessao encerrada pelo usuario.");
  updateDashboard();
}

function handleSetGoal() {
  try {
    assertAuthenticated();
    state.goalTarget = parsePositiveAmount(ui.goalAmount.value, "Meta");
    state.goalReached = state.goalSaved >= state.goalTarget;
    addStatement("Meta atualizada", `Nova meta definida em ${formatMoney(state.goalTarget)}.`);
    setStatus(ui.actionStatus, "Meta atualizada com sucesso.", "success");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Nao foi possivel atualizar a meta.";
    setStatus(ui.actionStatus, message, "error");
  } finally {
    updateDashboard();
  }
}

function handleBonus() {
  try {
    assertAuthenticated();

    if (state.bonusClaimed) {
      setStatus(ui.actionStatus, "Bonus diario ja resgatado.", "warning");
      return;
    }

    state.user.conta.depositar(25);
    state.bonusClaimed = true;
    addStatement("Bonus diario", "Credito de R$ 25 aplicado no saldo principal.");
    setStatus(ui.actionStatus, "Bonus diario resgatado com sucesso.", "success");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao resgatar bonus.";
    setStatus(ui.actionStatus, message, "error");
  } finally {
    updateDashboard();
  }
}

function handleDeposit(event) {
  event.preventDefault();

  let amount;

  try {
    amount = parsePositiveAmount(ui.depositAmount.value, "Deposito");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Valor de deposito invalido.";
    setStatus(ui.actionStatus, message, "error");
    return;
  }

  const isPremium = state.user && state.user.plano && state.user.plano.tipo === "premium";
  const cashback = isPremium ? Math.min(amount * 0.02, 20) : 0;
  const success = executeOperation("deposito", () => {
    state.user.conta.depositar(amount);

    if (cashback > 0) {
      state.user.conta.depositar(cashback);
    }
  }, cashback > 0
    ? `Deposito de ${formatMoney(amount)} confirmado com cashback de ${formatMoney(cashback)}.`
    : `Deposito de ${formatMoney(amount)} confirmado.`);

  if (success) {
    ui.depositForm.reset();
  }
}

function handleWithdraw(event) {
  event.preventDefault();

  let amount;

  try {
    amount = parsePositiveAmount(ui.withdrawAmount.value, "Saque");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Valor de saque invalido.";
    setStatus(ui.actionStatus, message, "error");
    return;
  }

  const success = executeOperation("saque", () => {
    state.user.conta.sacar(amount);
  }, `Saque de ${formatMoney(amount)} realizado.`);

  if (success) {
    ui.withdrawForm.reset();
  }
}

function handleTransfer(event) {
  event.preventDefault();

  const target = ui.transferTarget.value.trim();
  let amount;

  if (!target) {
    setStatus(ui.actionStatus, "Informe um destino para transferencia.", "error");
    return;
  }

  try {
    amount = parsePositiveAmount(ui.transferAmount.value, "Transferencia");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Valor de transferencia invalido.";
    setStatus(ui.actionStatus, message, "error");
    return;
  }

  const success = executeOperation("transferencia", () => {
    state.user.conta.sacar(amount);
  }, `Transferencia de ${formatMoney(amount)} enviada para ${target}.`);

  if (success) {
    ui.transferForm.reset();
  }
}

function handleReserve(event) {
  event.preventDefault();

  let amount;

  try {
    amount = parsePositiveAmount(ui.reserveAmount.value, "Reserva");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Valor de reserva invalido.";
    setStatus(ui.actionStatus, message, "error");
    return;
  }

  const wasGoalReached = state.goalReached;
  const success = executeOperation("reserva", () => {
    state.user.conta.sacar(amount);
    state.goalSaved += amount;
    state.goalReached = state.goalSaved >= state.goalTarget;
  }, `Reserva de ${formatMoney(amount)} enviada para sua meta.`);

  if (success && !wasGoalReached && state.goalReached) {
    setStatus(ui.actionStatus, "Meta concluida. Excelente disciplina financeira.", "success");
    addStatement("Meta concluida", `Voce atingiu ${formatMoney(state.goalSaved)} de reserva.`);
    updateDashboard();
  }

  if (success) {
    ui.reserveForm.reset();
  }
}

function clearStatement() {
  state.statement = [];
  renderStatement();
  setStatus(ui.actionStatus, "Extrato limpo.", "info");
}

function bindEvents() {
  ui.createAccountBtn.addEventListener("click", createAccount);
  ui.loginBtn.addEventListener("click", handleLogin);
  ui.logoutBtn.addEventListener("click", handleLogout);
  ui.setGoalBtn.addEventListener("click", handleSetGoal);
  ui.claimBonusBtn.addEventListener("click", handleBonus);
  ui.depositForm.addEventListener("submit", handleDeposit);
  ui.withdrawForm.addEventListener("submit", handleWithdraw);
  ui.transferForm.addEventListener("submit", handleTransfer);
  ui.reserveForm.addEventListener("submit", handleReserve);
  ui.clearStatementBtn.addEventListener("click", clearStatement);
}

function updateClock() {
  ui.clockDate.textContent = CLOCK.format(new Date());
}

function init() {
  bindEvents();
  updateClock();
  createAccount();
  setInterval(updateClock, 1000);
}

init();
