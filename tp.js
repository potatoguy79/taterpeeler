/* TaterPeeler web shell — WebGL / WebAudio / storage glue for the C game core (WebAssembly).
 * Made by Andres Campos. */
(function () {
  'use strict';
  const SAVE_KEY = 'taterpeeler.save.v1';
  const NOV2_UPDATE_KEY = 'seenNov2update';
  const NOV2_UPDATE_TARGET = new Date(2026, 10, 2, 8, 0, 0);
  const canvas = document.getElementById('game');
  const loader = document.getElementById('loader');
  const bar = document.getElementById('loader-bar');

  function readSave() { try { return localStorage.getItem(SAVE_KEY) || ''; } catch (e) { return ''; } }
  function writeSave(s) { try { localStorage.setItem(SAVE_KEY, s); } catch (e) { /* storage unavailable */ } }
  function readFlag(key, fallback) { try { const v = localStorage.getItem(key); return v == null ? fallback : v; } catch (e) { return fallback; } }
  function writeFlag(key, value) { try { localStorage.setItem(key, String(value)); } catch (e) { /* storage unavailable */ } }

  function formatNov2Countdown(ms) {
    const total = Math.max(0, Math.ceil(ms / 1000));
    const days = Math.floor(total / 86400);
    const hours = Math.floor((total % 86400) / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const seconds = total % 60;
    const parts = [
      { value: days, label: 'd' },
      { value: hours, label: 'h' },
      { value: minutes, label: 'm' },
      { value: seconds, label: 's' }
    ];
    return parts.map(part => `<span class="countdown-unit"><strong>${String(part.value).padStart(part.label === 'd' ? 1 : 2, '0')}</strong><span>${part.label}</span></span>`).join('');
  }

  function ensureNov2Banner() {
    if (document.getElementById('tp-nov2-banner')) return;
    const banner = document.createElement('div');
    banner.id = 'tp-nov2-banner';
    banner.innerHTML = `
      <span class="label">Update</span>
      <span class="text">Nov 2nd 8:00AM</span>
      <span class="time" id="tp-nov2-banner-time">--</span>
    `;
    document.body.appendChild(banner);
    const timeEl = banner.querySelector('#tp-nov2-banner-time');
    const tick = () => {
      const left = NOV2_UPDATE_TARGET.getTime() - Date.now();
      if (left <= 0) {
        timeEl.textContent = 'Live now';
        return;
      }
      timeEl.textContent = formatNov2Countdown(left).replace(/<[^>]+>/g, '');
    };
    tick();
    banner._tpCountdown = setInterval(tick, 1000);
  }

  function removeNov2Modal() {
    const style = document.getElementById('tp-nov2-update-style');
    if (style) style.remove();
    const overlay = document.getElementById('tp-nov2-update');
    if (overlay) overlay.remove();
  }

  function removeNov2Banner() {
    const banner = document.getElementById('tp-nov2-banner');
    if (banner) {
      if (banner._tpCountdown) clearInterval(banner._tpCountdown);
      banner.remove();
    }
  }

  function resetNov2UpdateSeen() {
    writeFlag(NOV2_UPDATE_KEY, 'false');
    removeNov2Modal();
    removeNov2Banner();
    ensureNov2Banner();
    showNov2Update();
  }
  window.TP_RESET_NOV2_UPDATE = resetNov2UpdateSeen;
  window.__tpResetNov2Update = resetNov2UpdateSeen;

  function showNov2Update() {
    if (document.getElementById('tp-nov2-update')) return;
    ensureNov2Banner();

    const style = document.createElement('style');
    style.id = 'tp-nov2-update-style';
    style.textContent = `
      #tp-nov2-update {
        position: fixed;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 22px;
        background: rgba(17, 17, 17, 0.34);
        backdrop-filter: blur(3px);
        z-index: 40;
        opacity: 0;
        pointer-events: none;
        transition: opacity .2s ease;
      }
      #tp-nov2-update.visible {
        opacity: 1;
        pointer-events: auto;
      }
      #tp-nov2-update .card {
        width: min(440px, 92vw);
        background: rgba(255,255,255,0.9);
        border: 1px solid var(--hair, #e6e1da);
        border-radius: 18px;
        box-shadow: 0 28px 60px rgba(0,0,0,0.18);
        padding: 22px 22px 18px;
        text-align: center;
        color: var(--ink, #26221e);
        font-family: -apple-system, "Segoe UI", Helvetica, Arial, sans-serif;
      }
      :root.dark #tp-nov2-update .card {
        background: rgba(38,34,30,0.94);
        border-color: #4a4139;
        color: var(--ink, #f1ede7);
      }
      #tp-nov2-update .eyebrow {
        display: inline-block;
        margin-bottom: 10px;
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.14em;
        color: var(--soft, #8a8279);
        font-weight: 800;
      }
      #tp-nov2-update h2 {
        margin: 0 0 8px;
        font-size: clamp(24px, 4vw, 34px);
        line-height: 1.08;
        letter-spacing: -0.05em;
      }
      #tp-nov2-update p {
        margin: 0 0 10px;
        font-size: 15px;
        line-height: 1.55;
        color: var(--soft, #8a8279);
      }
      #tp-nov2-update .countdown {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        margin: 0 0 18px;
        flex-wrap: wrap;
      }
      #tp-nov2-update .countdown-unit {
        display: inline-flex;
        align-items: flex-end;
        gap: 4px;
        min-width: 52px;
        padding: 8px 7px 7px;
        border-radius: 10px;
        background: rgba(120, 94, 52, 0.08);
        border: 1px solid rgba(120, 94, 52, 0.12);
        color: var(--ink, #26221e);
      }
      :root.dark #tp-nov2-update .countdown-unit {
        background: rgba(220, 184, 106, 0.12);
        border-color: rgba(220, 184, 106, 0.18);
        color: #f1ede7;
      }
      #tp-nov2-update .countdown-unit strong {
        font-size: 20px;
        line-height: 1;
        letter-spacing: -0.04em;
      }
      #tp-nov2-update .countdown-unit span {
        font-size: 10px;
        line-height: 1.2;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        opacity: 0.8;
        margin-bottom: 2px;
      }
      #tp-nov2-update button {
        appearance: none;
        border: 0;
        border-radius: 999px;
        background: var(--ink, #26221e);
        color: var(--bg, #ffffff);
        font: inherit;
        font-weight: 700;
        padding: 10px 18px;
        cursor: pointer;
      }
      :root.dark #tp-nov2-update button {
        background: #f1ede7;
        color: #1b1916;
      }
      #tp-nov2-banner {
        position: fixed;
        left: 50%;
        top: clamp(66px, 11vh, 110px);
        transform: translateX(-50%);
        z-index: 18;
        display: flex;
        align-items: center;
        gap: 10px;
        width: min(460px, 92vw);
        padding: 10px 14px;
        border-radius: 999px;
        background: rgba(255,255,255,0.86);
        border: 1px solid var(--hair, #e6e1da);
        box-shadow: 0 18px 40px rgba(0,0,0,0.12);
        backdrop-filter: blur(4px);
        color: var(--ink, #26221e);
        font-family: -apple-system, "Segoe UI", Helvetica, Arial, sans-serif;
      }
      :root.dark #tp-nov2-banner {
        background: rgba(38,34,30,0.9);
        border-color: #4a4139;
        color: var(--ink, #f1ede7);
      }
      #tp-nov2-banner .label {
        font-size: 10px;
        letter-spacing: 0.16em;
        text-transform: uppercase;
        font-weight: 800;
        color: var(--soft, #8a8279);
      }
      #tp-nov2-banner .text {
        font-size: 12px;
        line-height: 1.2;
        font-weight: 700;
      }
      #tp-nov2-banner .time {
        margin-left: auto;
        font-size: 12px;
        line-height: 1.2;
        font-weight: 800;
        letter-spacing: 0.04em;
      }
      @media (max-width: 520px) {
        #tp-nov2-banner {
          top: 82px;
          gap: 8px;
          padding: 10px 12px;
        }
        #tp-nov2-banner .label,
        #tp-nov2-banner .text,
        #tp-nov2-banner .time {
          font-size: 11px;
        }
      }
    `;
    document.head.appendChild(style);

    const overlay = document.createElement('div');
    overlay.id = 'tp-nov2-update';
    overlay.innerHTML = `
      <div class="card" role="dialog" aria-modal="true" aria-labelledby="tp-nov2-title">
        <div class="eyebrow">TaterPeeler</div>
        <h2 id="tp-nov2-title">Next update November 2nd</h2>
        <p>We’re polishing the next batch of fixes and additions. Keep peeling.</p>
        <div class="countdown" id="tp-nov2-countdown" aria-live="polite">--</div>
        <button type="button">Dismiss</button>
      </div>
    `;

    const countdown = overlay.querySelector('#tp-nov2-countdown');
    const tickCountdown = () => {
      const left = NOV2_UPDATE_TARGET.getTime() - Date.now();
      if (left <= 0) {
        countdown.innerHTML = '<span class="countdown-unit"><strong>Live</strong><span>now</span></span>';
        return;
      }
      countdown.innerHTML = formatNov2Countdown(left);
    };
    tickCountdown();
    const countdownTimer = setInterval(tickCountdown, 1000);

    const dismiss = overlay.querySelector('button');
    dismiss.addEventListener('click', () => {
      clearInterval(countdownTimer);
      overlay.classList.remove('visible');
      setTimeout(() => overlay.remove(), 180);
      // keep the menu banner visible; only hide the popup itself
    });

    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('visible'));
  }

  if (/dark=1/.test(readSave())) document.documentElement.classList.add('dark');
