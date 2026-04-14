;(function () {
  'use strict'

  var BASE_URL = 'https://webinars.plangrowdo.com'

  // Find the script tag that loaded this file
  var scriptEl = (function () {
    var scripts = document.querySelectorAll('script[src*="widget.js"]')
    return scripts[scripts.length - 1]
  })()

  if (!scriptEl) return

  var widgetId = scriptEl.getAttribute('data-widget-id')
  var widgetType = scriptEl.getAttribute('data-type') || 'exit-intent'

  if (!widgetId) return

  // ── CSS ──────────────────────────────────────────────────────────────────
  var css = [
    '.pgd-widget-overlay{position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:2147483640;display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity .25s;pointer-events:none;}',
    '.pgd-widget-overlay.pgd-visible{opacity:1;pointer-events:auto;}',
    '.pgd-widget-popup{background:#43165c;border-radius:16px;max-width:420px;width:calc(100% - 32px);padding:0;overflow:hidden;transform:translateY(12px);transition:transform .25s;box-shadow:0 24px 64px rgba(0,0,0,.5);}',
    '.pgd-widget-overlay.pgd-visible .pgd-widget-popup{transform:translateY(0);}',
    '.pgd-widget-thumb{width:100%;aspect-ratio:16/9;object-fit:cover;display:block;}',
    '.pgd-widget-body{padding:20px 24px 24px;}',
    '.pgd-widget-tag{font-size:11px;font-weight:700;color:#fbba00;letter-spacing:.08em;text-transform:uppercase;margin:0 0 6px;}',
    '.pgd-widget-title{font-size:18px;font-weight:700;color:#fff;margin:0 0 6px;line-height:1.3;}',
    '.pgd-widget-sub{font-size:13px;color:rgba(255,255,255,.55);margin:0 0 16px;line-height:1.5;}',
    '.pgd-widget-form{display:flex;flex-direction:column;gap:10px;}',
    '.pgd-widget-input{background:#6b2a8f;border:1px solid rgba(255,255,255,.12);border-radius:8px;padding:10px 14px;font-size:14px;color:#fff;outline:none;transition:border-color .15s;width:100%;box-sizing:border-box;}',
    '.pgd-widget-input::placeholder{color:rgba(255,255,255,.3);}',
    '.pgd-widget-input:focus{border-color:#fbba00;}',
    '.pgd-widget-btn{background:#fbba00;color:#43165c;font-weight:700;font-size:14px;border:none;border-radius:8px;padding:12px;cursor:pointer;transition:background .15s;width:100%;}',
    '.pgd-widget-btn:hover{background:#d9a200;}',
    '.pgd-widget-btn:disabled{opacity:.5;cursor:default;}',
    '.pgd-widget-close{position:absolute;top:12px;right:12px;background:rgba(255,255,255,.1);border:none;border-radius:50%;width:28px;height:28px;cursor:pointer;color:rgba(255,255,255,.6);font-size:16px;display:flex;align-items:center;justify-content:center;transition:background .15s;}',
    '.pgd-widget-close:hover{background:rgba(255,255,255,.2);}',
    '.pgd-widget-success{text-align:center;padding:8px 0 4px;}',
    '.pgd-widget-success-icon{font-size:32px;margin-bottom:8px;}',
    '.pgd-widget-success-title{color:#fff;font-weight:700;font-size:16px;margin:0 0 6px;}',
    '.pgd-widget-success-msg{color:rgba(255,255,255,.55);font-size:13px;margin:0;}',
    // Floating widget
    '.pgd-float-btn{position:fixed;z-index:2147483638;background:#fbba00;color:#43165c;font-weight:700;font-size:13px;border:none;border-radius:100px;padding:10px 18px;cursor:pointer;box-shadow:0 4px 20px rgba(0,0,0,.3);display:flex;align-items:center;gap:8px;transition:transform .2s,box-shadow .2s;}',
    '.pgd-float-btn:hover{transform:translateY(-2px);box-shadow:0 8px 28px rgba(0,0,0,.35);}',
    '.pgd-float-panel{position:fixed;z-index:2147483639;background:#43165c;border-radius:12px;width:300px;box-shadow:0 8px 40px rgba(0,0,0,.4);padding:20px;transform:scale(.95) translateY(8px);opacity:0;transition:all .2s;pointer-events:none;}',
    '.pgd-float-panel.pgd-open{transform:scale(1) translateY(0);opacity:1;pointer-events:auto;}',
    '.pgd-float-panel .pgd-widget-form{gap:8px;}',
    '.pgd-float-panel .pgd-widget-title{font-size:15px;}',
    '.pgd-float-panel .pgd-widget-btn{padding:10px;}',
  ].join('')

  var style = document.createElement('style')
  style.textContent = css
  document.head.appendChild(style)

  // ── State ─────────────────────────────────────────────────────────────────
  var config = null
  var showing = false

  var COOLDOWN_KEY = 'pgd_widget_' + widgetId + '_dismissed'

  function isCoolingDown(cooldownHours) {
    var ts = localStorage.getItem(COOLDOWN_KEY)
    if (!ts) return false
    return Date.now() - parseInt(ts, 10) < cooldownHours * 3600000
  }

  function markDismissed() {
    localStorage.setItem(COOLDOWN_KEY, String(Date.now()))
  }

  // ── API calls ─────────────────────────────────────────────────────────────
  function fetchConfig(cb) {
    fetch(BASE_URL + '/api/widget/' + widgetId)
      .then(function (r) { return r.ok ? r.json() : null })
      .then(function (data) { if (data) cb(data) })
      .catch(function () {})
  }

  function register(data, cb) {
    fetch(BASE_URL + '/api/widget/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
      .then(function (r) { return r.json() })
      .then(cb)
      .catch(function () { cb({ error: 'Network error' }) })
  }

  // ── Form HTML ─────────────────────────────────────────────────────────────
  function formHtml(cfg, compact) {
    var btnLabel = cfg.ctaLabel || 'Watch Now — It\'s Free'
    return (
      '<form class="pgd-widget-form" onsubmit="return false">' +
      (compact ? '' : '<input class="pgd-widget-input" type="text" name="name" placeholder="First name" />') +
      '<input class="pgd-widget-input" type="email" name="email" placeholder="Email address" required />' +
      '<button class="pgd-widget-btn" type="submit">' + escHtml(btnLabel) + '</button>' +
      '</form>'
    )
  }

  function successHtml() {
    return (
      '<div class="pgd-widget-success">' +
      '<div class="pgd-widget-success-icon">✅</div>' +
      '<p class="pgd-widget-success-title">You\'re in!</p>' +
      '<p class="pgd-widget-success-msg">Check your inbox — your access link is on its way.</p>' +
      '</div>'
    )
  }

  function escHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
  }

  // ── Form submit handler ───────────────────────────────────────────────────
  function bindForm(formEl, cfg, onSuccess) {
    formEl.addEventListener('submit', function (e) {
      e.preventDefault()
      var btn = formEl.querySelector('.pgd-widget-btn')
      var emailEl = formEl.querySelector('[name=email]')
      var nameEl = formEl.querySelector('[name=name]')
      if (!emailEl || !emailEl.value) return
      if (btn) btn.disabled = true
      register(
        {
          webinarId: cfg.webinar.id,
          email: emailEl.value,
          name: nameEl ? nameEl.value : '',
          widgetId: widgetId,
        },
        function (res) {
          if (res.success || res.accessToken) {
            onSuccess()
          } else {
            if (btn) btn.disabled = false
          }
        },
      )
    })
  }

  // ══════════════════════════════════════════════════════════════════════════
  // EXIT-INTENT popup
  // ══════════════════════════════════════════════════════════════════════════
  function initExitIntent(cfg) {
    if (isCoolingDown(cfg.cooldownHours || 24)) return

    var el = document.createElement('div')
    el.className = 'pgd-widget-overlay'
    el.setAttribute('role', 'dialog')
    el.setAttribute('aria-modal', 'true')

    var thumb = cfg.thumbnail
      ? '<img class="pgd-widget-thumb" src="' + escHtml(cfg.thumbnail) + '" alt="" />'
      : ''

    el.innerHTML =
      '<div class="pgd-widget-popup" style="position:relative">' +
      thumb +
      '<div class="pgd-widget-body">' +
      '<p class="pgd-widget-tag">Wait — before you go...</p>' +
      '<p class="pgd-widget-title">' + escHtml(cfg.headline || cfg.webinar.title) + '</p>' +
      (cfg.subheadline ? '<p class="pgd-widget-sub">' + escHtml(cfg.subheadline) + '</p>' : '') +
      formHtml(cfg, false) +
      '</div>' +
      '<button class="pgd-widget-close" aria-label="Close">✕</button>' +
      '</div>'

    document.body.appendChild(el)

    var closeBtn = el.querySelector('.pgd-widget-close')
    var form = el.querySelector('.pgd-widget-form')

    function close() {
      el.classList.remove('pgd-visible')
      markDismissed()
      showing = false
      setTimeout(function () { el.remove() }, 300)
    }

    closeBtn.addEventListener('click', close)
    el.addEventListener('click', function (e) { if (e.target === el) close() })
    document.addEventListener('keydown', function kd(e) {
      if (e.key === 'Escape') { close(); document.removeEventListener('keydown', kd) }
    })

    if (form) {
      bindForm(form, cfg, function () {
        var body = el.querySelector('.pgd-widget-body')
        if (body) body.innerHTML = successHtml()
        setTimeout(close, 3500)
      })
    }

    // Trigger
    var debounce = null
    function onMouseLeave(e) {
      if (showing || e.clientY > 10) return
      clearTimeout(debounce)
      debounce = setTimeout(function () {
        showing = true
        var delay = cfg.exitDelayMs || 0
        setTimeout(function () {
          el.classList.add('pgd-visible')
          document.removeEventListener('mouseleave', onMouseLeave)
        }, delay)
      }, 500)
    }

    document.addEventListener('mouseleave', onMouseLeave)
  }

  // ══════════════════════════════════════════════════════════════════════════
  // FLOATING button + panel
  // ══════════════════════════════════════════════════════════════════════════
  function initFloating(cfg) {
    var isRight = (cfg.floatPosition || 'BOTTOM_RIGHT') === 'BOTTOM_RIGHT'
    var offset = (cfg.floatOffsetPx || 24) + 'px'

    // Floating button
    var btn = document.createElement('button')
    btn.className = 'pgd-float-btn'
    btn.style[isRight ? 'right' : 'left'] = offset
    btn.style.bottom = offset
    btn.innerHTML = '▶ ' + escHtml(cfg.ctaLabel || ('Watch: ' + cfg.webinar.title))
    btn.style.background = cfg.accentColor || '#fbba00'

    // Panel
    var panel = document.createElement('div')
    panel.className = 'pgd-float-panel'
    panel.style[isRight ? 'right' : 'left'] = offset
    panel.style.bottom = (parseInt(offset) + 60) + 'px'
    panel.style.bottom = 'calc(' + offset + ' + 60px)'

    panel.innerHTML =
      '<p class="pgd-widget-title" style="margin:0 0 4px">' + escHtml(cfg.headline || cfg.webinar.title) + '</p>' +
      (cfg.subheadline ? '<p class="pgd-widget-sub" style="margin:0 0 12px">' + escHtml(cfg.subheadline) + '</p>' : '') +
      formHtml(cfg, true)

    document.body.appendChild(btn)
    document.body.appendChild(panel)

    var open = false

    function toggle() {
      open = !open
      panel.classList.toggle('pgd-open', open)
    }

    function closePanel() {
      open = false
      panel.classList.remove('pgd-open')
    }

    btn.addEventListener('click', function (e) { e.stopPropagation(); toggle() })

    document.addEventListener('click', function (e) {
      if (open && !panel.contains(e.target) && e.target !== btn) closePanel()
    })

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && open) closePanel()
    })

    var form = panel.querySelector('.pgd-widget-form')
    if (form) {
      bindForm(form, cfg, function () {
        panel.innerHTML = successHtml()
        setTimeout(closePanel, 3500)
      })
    }
  }

  // ── Init ──────────────────────────────────────────────────────────────────
  fetchConfig(function (cfg) {
    config = cfg
    if (widgetType === 'floating') {
      initFloating(cfg)
    } else {
      initExitIntent(cfg)
    }
  })
})()
