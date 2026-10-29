/* DOOM — audio procedural con Web Audio API (sonidos 100% originales) */
(function (D) {
  'use strict';

  var ctx = null;
  var master = null, sfxGain = null, musicGain = null;
  var noiseBuf = null;
  var musicTimer = null;
  var droneNodes = null;

  function ensureCtx() {
    if (ctx) return ctx;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.8;
    master.connect(ctx.destination);
    sfxGain = ctx.createGain();
    sfxGain.gain.value = 0.9;
    sfxGain.connect(master);
    musicGain = ctx.createGain();
    musicGain.gain.value = 0.55;
    musicGain.connect(master);

    /* buffer de ruido reutilizable (0.9 s) */
    var len = (ctx.sampleRate * 0.9) | 0;
    noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    var ch = noiseBuf.getChannelData(0);
    for (var i = 0; i < len; i++) ch[i] = Math.random() * 2 - 1;

    return ctx;
  }

  function noise(dur, filterType, freqStart, freqEnd, gain, when) {
    if (!ctx) return;
    var t = when || ctx.currentTime;
    var src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    var flt = ctx.createBiquadFilter();
    flt.type = filterType || 'lowpass';
    flt.frequency.setValueAtTime(freqStart || 1000, t);
    if (freqEnd) flt.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), t + dur);
    var g = ctx.createGain();
    g.gain.setValueAtTime(gain || 0.3, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(flt); flt.connect(g); g.connect(sfxGain);
    src.start(t);
    src.stop(t + dur + 0.05);
  }

  function tone(type, fStart, fEnd, dur, gain, when) {
    if (!ctx) return;
    var t = when || ctx.currentTime;
    var o = ctx.createOscillator();
    o.type = type || 'square';
    o.frequency.setValueAtTime(fStart, t);
    if (fEnd && fEnd !== fStart) o.frequency.exponentialRampToValueAtTime(Math.max(15, fEnd), t + dur);
    var g = ctx.createGain();
    g.gain.setValueAtTime(gain || 0.2, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(sfxGain);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  var sfx = {
    shootPistol: function () {
      noise(0.22, 'bandpass', 1900, 700, 0.5);
      noise(0.12, 'lowpass', 900, 200, 0.35);
      tone('square', 190, 60, 0.12, 0.22);
    },
    shootShotgun: function () {
      noise(0.45, 'lowpass', 1100, 180, 0.65);
      tone('square', 130, 42, 0.2, 0.3);
      noise(0.18, 'highpass', 2400, 1200, 0.18);
    },
    empty: function () {
      noise(0.05, 'bandpass', 3200, 2200, 0.25);
    },
    switchWeapon: function () {
      noise(0.07, 'bandpass', 1500, 900, 0.28);
    },
    impSight: function () {
      tone('sawtooth', 170, 65, 0.38, 0.24);
      noise(0.3, 'bandpass', 600, 250, 0.16);
    },
    impAttack: function () {
      tone('square', 230, 95, 0.2, 0.22);
      noise(0.14, 'bandpass', 1100, 500, 0.2);
    },
    fireball: function () {
      noise(0.3, 'bandpass', 900, 300, 0.2);
    },
    pain: function () {
      tone('square', 330, 140, 0.18, 0.24);
      noise(0.12, 'bandpass', 800, 350, 0.16);
    },
    enemyDeath: function () {
      noise(0.55, 'lowpass', 1200, 180, 0.4);
      tone('sawtooth', 110, 38, 0.5, 0.26);
    },
    explosion: function () {
      noise(0.9, 'lowpass', 500, 60, 0.75);
      tone('sine', 70, 28, 0.7, 0.5);
    },
    playerHurt: function () {
      tone('square', 210, 90, 0.26, 0.3);
      noise(0.14, 'lowpass', 700, 250, 0.22);
    },
    pickup: function () {
      tone('sine', 620, 620, 0.07, 0.25);
      tone('sine', 940, 940, 0.1, 0.22, ctx ? ctx.currentTime + 0.07 : 0);
    },
    door: function () {
      noise(0.7, 'lowpass', 320, 120, 0.3);
      tone('sawtooth', 58, 42, 0.7, 0.14);
    },
    switchOn: function () {
      tone('square', 440, 440, 0.08, 0.22);
      tone('square', 660, 660, 0.08, 0.22, ctx ? ctx.currentTime + 0.09 : 0);
      tone('square', 880, 880, 0.14, 0.24, ctx ? ctx.currentTime + 0.18 : 0);
    }
  };

  D.audio = {
    muted: false,

    /* Llamar desde un gesto del usuario */
    unlock: function () {
      ensureCtx();
      if (ctx && ctx.state === 'suspended') ctx.resume();
    },

    play: function (name) {
      if (D.audio.muted) return;
      ensureCtx();
      if (!ctx || !sfx[name]) return;
      if (ctx.state === 'suspended') ctx.resume();
      try { sfx[name](); } catch (e) { /* ignorar errores de audio */ }
    },

    toggleMute: function () {
      D.audio.muted = !D.audio.muted;
      if (master) master.gain.value = D.audio.muted ? 0 : 0.8;
      return D.audio.muted;
    },

    /* Música ambiental generativa: drone grave + notas espaciadas */
    startMusic: function () {
      ensureCtx();
      if (!ctx || droneNodes) return;

      var t = ctx.currentTime;
      var filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 190;
      filter.Q.value = 2.5;

      var g = ctx.createGain();
      g.gain.value = 0.06;
      filter.connect(g);
      g.connect(musicGain);

      var o1 = ctx.createOscillator();
      o1.type = 'sawtooth';
      o1.frequency.value = 55;
      var o2 = ctx.createOscillator();
      o2.type = 'sawtooth';
      o2.frequency.value = 55.6;
      o1.connect(filter);
      o2.connect(filter);
      o1.start(t); o2.start(t);

      /* LFO lento sobre el filtro */
      var lfo = ctx.createOscillator();
      lfo.frequency.value = 0.07;
      var lfoGain = ctx.createGain();
      lfoGain.gain.value = 70;
      lfo.connect(lfoGain);
      lfoGain.connect(filter.frequency);
      lfo.start(t);

      droneNodes = { o1: o1, o2: o2, lfo: lfo, g: g };

      /* notas espaciadas (escala pentatónica menor oscura) */
      var notes = [110, 130.8, 146.8, 174.6, 196, 220];
      musicTimer = setInterval(function () {
        if (!ctx || D.audio.muted) return;
        var f = notes[(Math.random() * notes.length) | 0];
        var tt = ctx.currentTime;
        tone('triangle', f, f * 0.99, 1.6, 0.05, tt);
        if (Math.random() < 0.35) {
          tone('sine', f * 1.5, f * 1.5, 2.2, 0.03, tt + 0.4);
        }
        if (Math.random() < 0.18) {
          noise(1.2, 'bandpass', 300, 120, 0.03, tt);
        }
      }, 3200);
    },

    stopMusic: function () {
      if (musicTimer) { clearInterval(musicTimer); musicTimer = null; }
      if (droneNodes && ctx) {
        try {
          droneNodes.o1.stop();
          droneNodes.o2.stop();
          droneNodes.lfo.stop();
        } catch (e) { /* ya detenido */ }
        droneNodes = null;
      }
    }
  };

})(window.DOOM = window.DOOM || {});
