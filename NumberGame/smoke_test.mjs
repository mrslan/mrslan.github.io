import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

class Element {
  constructor({ dataset = {} } = {}) {
    this.dataset = dataset;
    this.className = "";
    this.disabled = false;
    this.innerHTML = "";
    this.textContent = "";
    this.attributes = {};
    this.children = [];
    this.listeners = {};
  }

  addEventListener(type, handler) {
    this.listeners[type] = handler;
  }

  click() {
    this.listeners.click?.();
  }

  setAttribute(name, value) {
    this.attributes[name] = value;
  }

  replaceChildren(...children) {
    this.children = children;
  }

  get classList() {
    return {
      toggle: (name, enabled) => {
        const names = new Set(this.className.split(" ").filter(Boolean));
        if (enabled) {
          names.add(name);
        } else {
          names.delete(name);
        }
        this.className = [...names].join(" ");
      }
    };
  }
}

const selectors = [
  "#systems-count", "#challenge-total", "#score", "#streak", "#best",
  "#available", "#badge", "#system", "#glyph", "#answers", "#feedback",
  "#context", "#reset", "#next"
];
const elements = Object.fromEntries(selectors.map((selector) => [selector, new Element()]));
const periods = ["all", "modern", "historical"].map(
  (period) => new Element({ dataset: { period } })
);

const document = {
  listeners: {},
  querySelector(selector) {
    return elements[selector];
  },
  querySelectorAll(selector) {
    return selector === ".period" ? periods : [];
  },
  createElement() {
    return new Element();
  },
  addEventListener(type, handler) {
    this.listeners[type] = handler;
  }
};

const sandbox = {
  document,
  window: {},
  Math,
  console
};
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(new URL("./records.js", import.meta.url), "utf8"), sandbox);
vm.runInContext(fs.readFileSync(new URL("./game.js", import.meta.url), "utf8"), sandbox);

assert.equal(elements["#available"].textContent, 500);
assert.match(elements["#context"].innerHTML, /Answer to reveal the map and facts/);
assert.equal(elements["#answers"].children.length, 10);

periods[2].click();
assert.equal(elements["#available"].textContent, 400);
assert.equal(elements["#badge"].textContent, "historical");

elements["#answers"].children[0].click();
assert.match(elements["#feedback"].className, /result/);
assert.match(elements["#context"].innerHTML, /class="map"/);
assert.match(elements["#context"].innerHTML, /class="facts"/);

document.listeners.keydown({ key: "Enter", metaKey: false, ctrlKey: false, altKey: false });
assert.match(elements["#context"].innerHTML, /Answer to reveal the map and facts/);

console.log("Web game smoke test passed: pools, guessing, and fact reveal behave correctly.");
