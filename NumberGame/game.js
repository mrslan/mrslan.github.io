(() => {
  const records = window.NUMERAL_RECORDS.map((record, index) => ({
    ...record,
    period: index < 10 ? "modern" : "historical"
  }));

  const state = {
    period: "all",
    challenge: null,
    answered: false,
    selectedGuess: null,
    correct: false,
    score: 0,
    rounds: 0,
    streak: 0,
    best: 0
  };

  const ui = {
    systemsCount: document.querySelector("#systems-count"),
    challengeTotal: document.querySelector("#challenge-total"),
    score: document.querySelector("#score"),
    streak: document.querySelector("#streak"),
    best: document.querySelector("#best"),
    available: document.querySelector("#available"),
    badge: document.querySelector("#badge"),
    system: document.querySelector("#system"),
    glyph: document.querySelector("#glyph"),
    answers: document.querySelector("#answers"),
    feedback: document.querySelector("#feedback"),
    context: document.querySelector("#context"),
    periods: Array.from(document.querySelectorAll(".period")),
    reset: document.querySelector("#reset")
  };

  function challengePool() {
    return records
      .filter((record) => state.period === "all" || record.period === state.period)
      .flatMap((record) => record.numbers.map((number) => ({ record, number })));
  }

  function nextChallenge() {
    const pool = challengePool();
    const candidates = pool.filter((item) => {
      return !state.challenge ||
        item.record.sourceFile !== state.challenge.record.sourceFile ||
        item.number.value !== state.challenge.number.value;
    });
    const available = candidates.length ? candidates : pool;
    state.challenge = available[Math.floor(Math.random() * available.length)];
    state.answered = false;
    state.selectedGuess = null;
    state.correct = false;
    render();
  }

  function submitGuess(value) {
    if (state.answered || !state.challenge) {
      return;
    }
    state.answered = true;
    state.selectedGuess = value;
    state.rounds += 1;
    state.correct = value === state.challenge.number.value;
    if (state.correct) {
      state.score += 1;
      state.streak += 1;
      state.best = Math.max(state.best, state.streak);
    } else {
      state.streak = 0;
    }
    render();
  }

  function resetSession() {
    state.score = 0;
    state.rounds = 0;
    state.streak = 0;
    state.best = 0;
    nextChallenge();
  }

  function setPeriod(period) {
    state.period = period;
    resetSession();
  }

  function render() {
    const challenge = state.challenge;
    const count = challengePool().length;
    ui.systemsCount.textContent = records.length;
    ui.challengeTotal.textContent = records.length * 10;
    ui.available.textContent = count;
    ui.score.textContent = `${state.score}/${state.rounds}`;
    ui.streak.textContent = state.streak;
    ui.best.textContent = state.best;

    for (const button of ui.periods) {
      const selected = button.dataset.period === state.period;
      button.classList.toggle("selected", selected);
      button.setAttribute("aria-pressed", String(selected));
    }

    ui.badge.textContent = challenge.record.period;
    ui.badge.className = `badge ${challenge.record.period}`;
    ui.system.textContent = challenge.record.system;
    ui.glyph.textContent = challenge.number.notation;
    renderAnswers(challenge);
    renderFeedback(challenge);
    renderContext(challenge);
  }

  function renderAnswers(challenge) {
    const buttons = Array.from({ length: 10 }, (_, offset) => {
      const value = offset + 1;
      const classNames = ["answer"];
      if (state.answered) {
        if (value === challenge.number.value) {
          classNames.push("correct");
        } else if (!state.correct && value === state.selectedGuess) {
          classNames.push("incorrect");
        } else {
          classNames.push("dimmed");
        }
      }

      const button = document.createElement("button");
      button.type = "button";
      button.className = classNames.join(" ");
      button.disabled = state.answered;
      button.setAttribute("aria-label", `Guess ${value}`);
      button.innerHTML = `<strong>${value}</strong><small>key ${value === 10 ? "0" : value}</small>`;
      button.addEventListener("click", () => submitGuess(value));
      return button;
    });
    ui.answers.replaceChildren(...buttons);
  }

  function renderFeedback(challenge) {
    if (!state.answered) {
      ui.feedback.className = "feedback";
      ui.feedback.innerHTML = "<p>Choose a value above, or press a number key. Press <kbd>0</kbd> for ten.</p>";
      return;
    }

    ui.feedback.className = "feedback result";
    const title = state.correct ? "Correct" : "Not this time";
    const className = state.correct ? "correct" : "wrong";
    const answer = state.correct
      ? `${escapeText(challenge.number.notation)} represents ${challenge.number.value}.`
      : `The answer is ${challenge.number.value}: ${escapeText(challenge.number.notation)}`;
    ui.feedback.innerHTML = `
      <div class="feedback-text">
        <p class="feedback-title ${className}">${title}</p>
        <p class="feedback-answer">${answer}</p>
        <p class="feedback-note">${escapeText(challenge.record.note)}</p>
      </div>
      <button type="button" class="next" id="next">Next Number</button>
    `;
    document.querySelector("#next").addEventListener("click", nextChallenge);
  }

  function renderContext(challenge) {
    const label = challenge.record.period === "historical"
      ? "Historical Context"
      : "Origin & Number Facts";
    if (!state.answered) {
      ui.context.innerHTML = `
        <div class="locked">
          <p class="context-label">${label}</p>
          <svg class="map-icon" viewBox="0 0 44 44" aria-hidden="true">
            <path d="M5 10l11-4 12 4 11-4v27l-11 4-12-4-11 4z"/>
            <path d="M16 6v27M28 10v27"/>
          </svg>
          <h2>Answer to reveal the map and facts.</h2>
          <p>Each numeral has a representative origin pin and a short history lesson.</p>
        </div>
      `;
      return;
    }

    const origin = challenge.record.originMap;
    ui.context.innerHTML = `
      <p class="context-label">${label}</p>
      <h2>${escapeText(origin.region)}</h2>
      <p class="location">${escapeText(origin.modernLocation)}</p>
      ${worldMap(origin)}
      <ul class="facts">${challenge.record.facts.map((fact) => `<li>${escapeText(fact)}</li>`).join("")}</ul>
      <p class="caveat">The pin identifies a representative origin region, not an exact historical border.</p>
    `;
  }

  function worldMap(origin) {
    const x = ((origin.longitude + 180) / 360) * 280;
    const y = ((90 - origin.latitude) / 180) * 138;
    return `
      <div class="map" role="img" aria-label="Map showing ${escapeText(origin.region)}">
        <svg viewBox="0 0 280 138" aria-hidden="true">
          <path class="gridline" d="M0 34.5H280 M0 69H280 M0 103.5H280 M70 0V138 M140 0V138 M210 0V138"/>
          <path class="land" d="M15 30 L25 20 L53 19 L66 27 L59 37 L48 39 L44 51 L33 56 L24 48 L20 39 Z"/>
          <path class="land" d="M50 63 L63 63 L70 76 L66 91 L57 112 L49 107 L53 92 L45 79 Z"/>
          <path class="land" d="M119 28 L136 19 L160 21 L173 28 L195 27 L219 38 L252 43 L258 58 L240 63 L211 57 L197 66 L180 60 L162 52 L147 53 L137 46 L124 48 L112 39 Z"/>
          <path class="land" d="M133 58 L151 58 L160 73 L157 98 L146 118 L132 106 L126 83 Z"/>
          <path class="land" d="M214 88 L238 84 L253 93 L248 109 L226 111 L212 102 Z"/>
          <path class="land" d="M91 15 L108 10 L116 17 L103 25 L91 22 Z"/>
          <circle class="pin-ring" cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="9"/>
          <circle class="pin" cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="4.2"/>
        </svg>
      </div>
    `;
  }

  function escapeText(value) {
    return value
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  for (const button of ui.periods) {
    button.addEventListener("click", () => setPeriod(button.dataset.period));
  }
  ui.reset.addEventListener("click", resetSession);

  document.addEventListener("keydown", (event) => {
    if (event.metaKey || event.ctrlKey || event.altKey) {
      return;
    }
    if (/^[1-9]$/.test(event.key)) {
      submitGuess(Number(event.key));
    } else if (event.key === "0") {
      submitGuess(10);
    } else if (event.key === "Enter" && state.answered) {
      nextChallenge();
    }
  });

  nextChallenge();
})();
