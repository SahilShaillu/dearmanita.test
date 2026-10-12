/* =========================================================
   private-gate.js
   Whole-page secret-code lock for manita.html. Like the other
   code windows, this is a front-end romantic touch, not real
   security — the code lives right here in plain JS.

   WHEN THE CODE IS ASKED
   - Opening manita.html directly (typed / pasted address, reload,
     or arriving from another site): always asked.
   - Browser Forward button onto manita.html: always asked.
   - Coming back to manita.html from the browser's cache: asked again.
   - Right after the 4-second heart hold + code on index.html: NOT
     asked a second time (index.html opens manita.html as a layer and
     tells it, once, that the code was just entered).
   ========================================================= */

(function () {
  "use strict";

  const GATE_CODE = "0520"; // change this to whatever code you'd like (also in js/main.js)

  const gate = document.getElementById("pageGate");
  const main = document.getElementById("main");
  const form = document.getElementById("pageGateForm");
  const input = document.getElementById("pageGateInput");
  const feedback = document.getElementById("pageGateFeedback");
  const lockIcon = document.getElementById("pageGateLockIcon");
  if (!gate || !main || !form || !input) return;

  // style.css gives .page-gate its own "display", which would override the HTML
  // "hidden" attribute; make sure hidden really hides both parts.
  const hideRule = document.createElement("style");
  hideRule.textContent = ".page-gate[hidden],#main[hidden]{display:none!important}";
  document.head.appendChild(hideRule);

  const panel = gate.querySelector(".page-gate__panel");
  const incorrectResponses = ["Nope 😂 Try again.", "Nice try, detective. ❤️", "Almost... but not quite. 😉"];
  let incorrectIndex = 0;

  /* Is this page the layer opened by index.html? Its window name says whether the
     code was just entered there. The name is read once and then cleared, so a
     reload or a later Forward never skips the code. */
  let embedded = false;
  try { embedded = window.top !== window; } catch (e) { embedded = true; }
  let preUnlocked = false;
  if (embedded) {
    preUnlocked = window.name === "vmp-unlocked";
    try { window.name = "vmp-embedded"; } catch (e) { /* ignore */ }

    // The "skip to content" link would add a history step inside the layer; just move focus instead.
    const skip = document.querySelector(".skip-link");
    if (skip) {
      skip.addEventListener("click", function (e) {
        e.preventDefault();
        if (!main.hidden) { main.setAttribute("tabindex", "-1"); main.focus(); }
      });
    }
  }

  function showContent() {
    gate.hidden = true;
    main.hidden = false;
  }

  function lock() {
    main.hidden = true;
    gate.hidden = false;
    gate.classList.remove("is-unlocking");
    if (lockIcon) lockIcon.classList.remove("is-unlocked");
    feedback.textContent = "";
    input.value = "";
    window.scrollTo(0, 0);
  }

  if (preUnlocked) showContent(); else lock();

  // Back to this page from the browser's back/forward cache: the code is needed again.
  window.addEventListener("pageshow", function (e) {
    if (e.persisted) lock();
  });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    const value = input.value.trim();

    if (value === GATE_CODE) {
      if (lockIcon) lockIcon.classList.add("is-unlocked");
      feedback.textContent = "";
      input.blur(); // dismiss the on-screen numeric keypad on touch devices
      setTimeout(function () {
        gate.classList.add("is-unlocking");
        setTimeout(function () {
          showContent();
          window.scrollTo(0, 0);
        }, 500);
      }, 500);
    } else {
      if (panel) {
        panel.classList.add("page-gate__panel--shake");
        setTimeout(function () { panel.classList.remove("page-gate__panel--shake"); }, 400);
      }
      feedback.textContent = incorrectResponses[incorrectIndex % incorrectResponses.length];
      incorrectIndex++;
      input.value = "";
      input.focus();
    }
  });
})();
