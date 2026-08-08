/**
 * CRICRI · denúncia — validação com Zod (ES module)
 * E-mail de destino NUNCA neste arquivo.
 */
import { z } from 'https://cdn.jsdelivr.net/npm/zod@3.23.8/+esm';

const TIPOS = ['assedio', 'violencia', 'furto', 'estrutura', 'outro'];

const DenunciaSchema = z
  .object({
    tipo: z.enum(TIPOS, {
      errorMap: () => ({ message: 'Escolha um tipo válido.' }),
    }),
    relato: z
      .string({ required_error: 'Descreva o que aconteceu.' })
      .trim()
      .min(10, 'Mínimo 10 caracteres.')
      .max(2000, 'Máximo 2000 caracteres.')
      .refine((v) => !/^(.)\1{9,}$/.test(v), {
        message: 'Escreva um relato com sentido.',
      }),
    local: z.string().trim().max(120, 'Local: máximo 120 caracteres.').default(''),
    contato: z.string().trim().max(120, 'Contato: máximo 120 caracteres.').default(''),
    anonimo: z.boolean().default(true),
  })
  .superRefine((data, ctx) => {
    if (data.anonimo) return;
    const c = data.contato || '';
    if (!c) return;
    if (c.includes('@')) {
      if (!z.string().email().safeParse(c).success) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['contato'],
          message: 'E-mail de contato inválido.',
        });
      }
      return;
    }
    const digits = c.replace(/\D/g, '');
    const looksPhone = /^[\d\s()+-]+$/.test(c) && digits.length > 0;
    if (looksPhone && (digits.length < 8 || digits.length > 13)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['contato'],
        message: 'Telefone parece incompleto.',
      });
    }
  });

const form = document.getElementById('denuncia-form');
if (form) {
  const msg = document.getElementById('denuncia-msg');
  const btn = document.getElementById('denuncia-submit');
  const tipoEl = document.getElementById('denuncia-tipo');
  const relatoEl = document.getElementById('denuncia-relato');
  const localEl = document.getElementById('denuncia-local');
  const contatoEl = document.getElementById('denuncia-contato');
  const anonEl = document.getElementById('denuncia-anon');
  const hpEl = document.getElementById('denuncia-hp');

  const fieldEls = {
    tipo: tipoEl,
    relato: relatoEl,
    local: localEl,
    contato: contatoEl,
  };

  function endpoint() {
    const base = (window.FASC_CONFIG && window.FASC_CONFIG.supabaseUrl) || '';
    if (!base) return '';
    return base.replace(/\/$/, '') + '/functions/v1/denuncia';
  }

  function showMsg(text, ok) {
    if (!msg) return;
    msg.hidden = !text;
    msg.textContent = text || '';
    msg.classList.toggle('is-ok', !!ok);
    msg.classList.toggle('is-err', !ok && !!text);
  }

  function fieldWrap(el) {
    return el ? el.closest('.denuncia-field') : null;
  }

  function setFieldError(el, errorText) {
    const wrap = fieldWrap(el);
    if (!wrap) return;
    wrap.classList.toggle('has-error', !!errorText);
    wrap.classList.toggle('is-valid', !errorText && el && String(el.value || '').trim());
    let err = wrap.querySelector('.denuncia-field-error');
    if (!err) {
      err = document.createElement('p');
      err.className = 'denuncia-field-error';
      err.setAttribute('role', 'alert');
      wrap.appendChild(err);
    }
    err.textContent = errorText || '';
    err.hidden = !errorText;
    if (el) {
      if (errorText) el.setAttribute('aria-invalid', 'true');
      else el.removeAttribute('aria-invalid');
    }
  }

  function clearFieldStyles() {
    Object.values(fieldEls).forEach((el) => {
      setFieldError(el, '');
      const wrap = fieldWrap(el);
      if (wrap) wrap.classList.remove('is-valid', 'has-error');
    });
  }

  function readData() {
    return {
      tipo: (tipoEl && tipoEl.value) || '',
      relato: (relatoEl && relatoEl.value) || '',
      local: (localEl && localEl.value) || '',
      contato: (contatoEl && contatoEl.value) || '',
      anonimo: !!(anonEl && anonEl.checked),
    };
  }

  function applyZodErrors(zodError, onlyTouched) {
    const fields = {};
    for (const issue of zodError.issues) {
      const key = String(issue.path[0] || '');
      if (key && !fields[key]) fields[key] = issue.message;
    }
    Object.keys(fieldEls).forEach((key) => {
      const el = fieldEls[key];
      if (!el) return;
      if (onlyTouched && !el.dataset.touched) {
        // ainda assim limpa erro se ficou válido
        if (!fields[key]) setFieldError(el, '');
        return;
      }
      setFieldError(el, fields[key] || '');
    });
    return fields;
  }

  function validate(onlyTouched) {
    const parsed = DenunciaSchema.safeParse(readData());
    if (parsed.success) {
      // marca válidos tocados
      Object.keys(fieldEls).forEach((key) => {
        const el = fieldEls[key];
        if (!el) return;
        if (!onlyTouched || el.dataset.touched) setFieldError(el, '');
        const wrap = fieldWrap(el);
        if (wrap && String(el.value || '').trim()) wrap.classList.add('is-valid');
      });
      return { ok: true, data: parsed.data };
    }
    applyZodErrors(parsed.error, onlyTouched);
    return { ok: false, error: parsed.error };
  }

  function updateRelatoCounter() {
    if (!relatoEl) return;
    const wrap = fieldWrap(relatoEl);
    if (!wrap) return;
    let counter = wrap.querySelector('.denuncia-counter');
    if (!counter) {
      counter = document.createElement('span');
      counter.className = 'denuncia-counter';
      counter.setAttribute('aria-live', 'polite');
      wrap.appendChild(counter);
    }
    const n = String(relatoEl.value || '').trim().length;
    counter.textContent = n + ' / 2000';
    counter.classList.toggle('is-low', n > 0 && n < 10);
    counter.classList.toggle('is-ok', n >= 10 && n <= 2000);
  }

  Object.values(fieldEls).forEach((el) => {
    if (!el) return;
    el.addEventListener('blur', () => {
      el.dataset.touched = '1';
      validate(true);
    });
    el.addEventListener('input', () => {
      if (el === relatoEl) updateRelatoCounter();
      if (el.dataset.touched) validate(true);
    });
    el.addEventListener('change', () => {
      el.dataset.touched = '1';
      validate(true);
    });
  });

  if (anonEl) {
    anonEl.addEventListener('change', () => {
      if (contatoEl) {
        contatoEl.disabled = !!anonEl.checked;
        if (anonEl.checked) setFieldError(contatoEl, '');
        else if (contatoEl.dataset.touched) validate(true);
      }
    });
    if (contatoEl && anonEl.checked) contatoEl.disabled = true;
  }

  updateRelatoCounter();

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (hpEl && hpEl.value) {
      showMsg('Enviado.', true);
      form.reset();
      return;
    }

    Object.values(fieldEls).forEach((el) => {
      if (el) el.dataset.touched = '1';
    });

    const result = validate(false);
    if (!result.ok) {
      showMsg('Confira os campos marcados em vermelho.', false);
      const firstErr = form.querySelector('.denuncia-field.has-error [id]');
      if (firstErr && firstErr.focus) firstErr.focus();
      return;
    }

    const url = endpoint();
    if (!url) {
      showMsg('Canal indisponível no momento. Em emergência use 190 / 192 / 193.', false);
      return;
    }

    const data = result.data;
    const payload = {
      tipo: data.tipo,
      relato: data.relato,
      local: data.local,
      contato: data.anonimo ? '' : data.contato,
      anonimo: data.anonimo,
      ua: (navigator.userAgent || '').slice(0, 160),
      path: location.pathname,
      recaptchaToken: '',
    };

    if (btn) btn.disabled = true;
    showMsg('Enviando…', true);

    try {
      if (window.CricriRecaptcha && window.CricriRecaptcha.getToken) {
        try {
          payload.recaptchaToken = await window.CricriRecaptcha.getToken('denuncia');
        } catch (_) {}
      }

      const headers = { 'Content-Type': 'application/json' };
      const anonKey = (window.FASC_CONFIG && window.FASC_CONFIG.supabaseAnonKey) || '';
      if (anonKey) {
        headers['Authorization'] = 'Bearer ' + anonKey;
        headers['apikey'] = anonKey;
      }

      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      let body = null;
      try {
        body = await res.json();
      } catch (_) {}

      if (!res.ok) {
        if (body && body.fields) {
          Object.keys(body.fields).forEach((k) => {
            if (fieldEls[k]) setFieldError(fieldEls[k], body.fields[k]);
          });
        }
        if (body && body.error === 'captcha') throw new Error('Não passou na verificação anti-spam. Tente de novo.');
        throw new Error((body && (body.error || body.message)) || 'Falha ' + res.status);
      }

      showMsg('Recebemos. Obrigado por falar. Se estiver em risco, ligue 190 ou 192.', true);
      form.reset();
      clearFieldStyles();
      updateRelatoCounter();
      if (anonEl) anonEl.checked = true;
      if (contatoEl) contatoEl.disabled = true;
      Object.values(fieldEls).forEach((el) => {
        if (el) delete el.dataset.touched;
      });
    } catch (err) {
      console.warn('[CRICRI denuncia]', err.message || err);
      showMsg(
        err && err.message && err.message.length < 120
          ? err.message
          : 'Não deu pra enviar agora. Em emergência: 190, 192, 193, 180, 188.',
        false
      );
    } finally {
      if (btn) btn.disabled = false;
    }
  });
}
