#!/usr/bin/env node
'use strict';

/**
 * vault-mcp — server MCP locale per un vault wiki multi-progetto.
 *
 * Espone QUATTRO operazioni git con nomi propri. Non espone una shell.
 * Ciò che non è una tool qui dentro non è eseguibile: l'elenco di comandi
 * ammessi delle skill smette di essere una regola scritta in italiano e
 * diventa la superficie del server.
 *
 * Invarianti che il server impone da sé, non per fiducia nel chiamante:
 *   - opera solo dentro VAULT_PATH, che è fissato nella config, non passato
 *     come argomento da chi chiama;
 *   - ogni pull è --ff-only: mai un merge non richiesto su pagine di contenuto;
 *   - un solo punto fa un vero merge, vault_publish, e solo dopo aver
 *     verificato che L ∩ R sia vuoto;
 *   - non distrugge mai uno stash: `drop` e `clear` non esistono qui;
 *   - niente --force, --amend, reset, checkout, rebase. Non sono implementati,
 *     quindi non sono raggiungibili.
 *
 * Config (in claude_desktop_config.json):
 *   "vault-asernet": {
 *     "command": "node",
 *     "args": ["C:\\percorso\\vault-mcp\\server.js"],
 *     "env": { "VAULT_PATH": "C:\\Users\\sarar\\Documents\\GitHub\\asernet_wiki" }
 *   }
 */

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------- config

const VAULT_PATH = process.env.VAULT_PATH;

function assertVault() {
  if (!VAULT_PATH) {
    throw new Error('VAULT_PATH non è impostata nella config del server MCP.');
  }
  if (!fs.existsSync(path.join(VAULT_PATH, '.git'))) {
    throw new Error(`VAULT_PATH non è un repository git: ${VAULT_PATH}`);
  }
  if (!fs.existsSync(path.join(VAULT_PATH, 'CLAUDE.md'))) {
    throw new Error(`VAULT_PATH non sembra un vault (manca CLAUDE.md): ${VAULT_PATH}`);
  }
}

// ------------------------------------------------------------------ git

function git(args, opts = {}) {
  try {
    const out = execFileSync('git', args, {
      cwd: VAULT_PATH,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: opts.timeout || 120000,
    });
    return { ok: true, stdout: (out || '').trim(), stderr: '' };
  } catch (e) {
    return {
      ok: false,
      stdout: (e.stdout || '').trim(),
      stderr: (e.stderr || e.message || '').trim(),
    };
  }
}

function gitOrThrow(args) {
  const r = git(args);
  if (!r.ok) throw new Error(`git ${args.join(' ')}\n${r.stderr}`);
  return r.stdout;
}

function lines(s) {
  return s.split('\n').map((l) => l.trim()).filter(Boolean);
}

/** Un path è accettabile solo se resta dentro il vault. */
function safeRelPath(p) {
  const norm = p.replace(/\\/g, '/').replace(/^\.\//, '');
  if (norm.startsWith('/') || /^[A-Za-z]:/.test(norm) || norm.split('/').includes('..')) {
    throw new Error(`Path rifiutato (deve essere relativo e dentro il vault): ${p}`);
  }
  const abs = path.resolve(VAULT_PATH, norm);
  if (!abs.startsWith(path.resolve(VAULT_PATH) + path.sep)) {
    throw new Error(`Path rifiutato (esce dal vault): ${p}`);
  }
  return norm;
}

/** index.md e log/ cambiano a ogni operazione: non contano come sovrapposizione. */
function isNoise(p) {
  return p.endsWith('index.md') || /(^|\/)log\//.test(p) || p.endsWith('/log.md');
}

function upstream() {
  const r = git(['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}']);
  if (!r.ok) throw new Error('Il branch corrente non ha un upstream configurato.');
  return r.stdout;
}

function aheadBehind() {
  const out = gitOrThrow(['rev-list', '--left-right', '--count', 'HEAD...@{u}']);
  const [ahead, behind] = out.split(/\s+/).map(Number);
  return { ahead, behind };
}

function blobHash(rev, relPath) {
  const r = git(['rev-parse', `${rev}:${relPath}`]);
  return r.ok ? r.stdout : null;
}

/** Estrae i path che git elenca come bloccanti in un errore di checkout. */
function parseBlockingPaths(stderr) {
  const out = [];
  for (const raw of stderr.split('\n')) {
    if (/^\s+\S/.test(raw) && !/^\s*(error|warning|fatal|hint):/i.test(raw)) {
      const p = raw.trim();
      if (p && !p.endsWith(':') && !/\s/.test(p)) out.push(p);
    }
  }
  return [...new Set(out)];
}

// ---------------------------------------------------------------- tools

function vaultStatus() {
  assertVault();
  const branch = gitOrThrow(['rev-parse', '--abbrev-ref', 'HEAD']);
  const up = upstream();
  git(['fetch', '--quiet']);
  const { ahead, behind } = aheadBehind();
  const porcelain = lines(gitOrThrow(['status', '--porcelain']));
  const untracked = porcelain.filter((l) => l.startsWith('??')).map((l) => l.slice(3));
  const modified = porcelain.filter((l) => !l.startsWith('??')).map((l) => l.slice(3));
  const driver = git(['config', '--get', 'merge.ours.driver']).stdout;
  const email = git(['config', 'user.email']).stdout;
  const lastEmail = git(['log', '-1', '--format=%ae']).stdout;
  const stashes = lines(git(['stash', 'list']).stdout);

  return {
    vault: VAULT_PATH,
    branch,
    upstream: up,
    ahead,
    behind,
    untracked,
    modified,
    stashes,
    index_lock: lockInfo(),
    merge_ours_driver: driver === 'true' ? 'ok' : 'NON IMPOSTATO — lancia: git config merge.ours.driver true',
    identity_config: email || null,
    identity_last_commit: lastEmail || null,
  };
}

/**
 * Fast-forward, con auto-stash guardato se il working tree è di ostacolo.
 *
 * La guardia: dopo il ff, prima di riapplicare lo stash, confronta i file
 * messi via con quelli che il pull ha portato. Se non si intersecano, `pop`.
 * Se si intersecano, NON fa il pop — un pop su una pagina di contenuto che il
 * pull ha appena cambiato è una fusione automatica senza nessuno che guardi,
 * che è esattamente ciò che il vault vieta. Lo stash resta intatto e la
 * decisione torna all'utente.
 */
function vaultSync() {
  assertVault();
  const report = { steps: [] };

  git(['fetch', '--quiet']);
  const { ahead, behind } = aheadBehind();
  report.ahead = ahead;
  report.behind = behind;

  if (ahead > 0 && behind > 0) {
    report.result = 'DIVERGED';
    report.message =
      'Cronologia divergente: hai commit locali e il remoto ne ha altri. ' +
      'Non è un caso da fast-forward: usa vault_publish, che verifica L ∩ R prima di fondere.';
    return report;
  }
  if (ahead > 0) {
    report.result = 'AHEAD';
    report.message =
      `Hai ${ahead} commit locali non spinti: lavoro di un'operazione precedente mai pubblicato. ` +
      'Chiudila con vault_publish prima di sincronizzare.';
    return report;
  }
  if (behind === 0) {
    report.result = 'UP_TO_DATE';
    report.head = gitOrThrow(['rev-parse', '--short', 'HEAD']);
    return report;
  }

  const before = gitOrThrow(['rev-parse', 'HEAD']);
  let ff = git(['merge', '--ff-only', '@{u}']);
  report.steps.push({ cmd: 'git merge --ff-only @{u}', ok: ff.ok });

  let stashRef = null;
  if (!ff.ok) {
    const blocking = parseBlockingPaths(ff.stderr);
    const isWorktreeBlock =
      /would be overwritten by merge|local changes to the following files/i.test(ff.stderr);

    if (!isWorktreeBlock || blocking.length === 0) {
      report.result = 'FAILED';
      report.stderr = ff.stderr;
      report.message =
        'Il fast-forward è fallito per un motivo che non è il working tree. ' +
        'Non tento rimedi: reset, checkout e rebase non esistono in questo server.';
      return report;
    }

    report.blocking = blocking;
    const stash = git(['stash', 'push', '-u', '-m', `vault_sync ${new Date().toISOString()}`, '--', ...blocking]);
    report.steps.push({ cmd: 'git stash push -u -- <bloccanti>', ok: stash.ok });
    if (!stash.ok) {
      report.result = 'FAILED';
      report.stderr = stash.stderr;
      return report;
    }
    stashRef = 'stash@{0}';

    ff = git(['merge', '--ff-only', '@{u}']);
    report.steps.push({ cmd: 'git merge --ff-only @{u} (dopo stash)', ok: ff.ok });
    if (!ff.ok) {
      report.result = 'FAILED';
      report.stderr = ff.stderr;
      report.message =
        'Il fast-forward è fallito anche col working tree libero. Lo stash è intatto ' +
        `(${stashRef}): non lo tocco. Guardalo prima di fare qualsiasi altra cosa.`;
      return report;
    }
  }

  const after = gitOrThrow(['rev-parse', 'HEAD']);
  const brought = lines(gitOrThrow(['diff', '--name-only', before, after]));
  report.received = {
    commits: lines(gitOrThrow(['log', '--format=%h · %an <%ae> · %ad · %s', `${before}..${after}`])),
    content_pages: brought.filter((p) => !isNoise(p)),
    index_and_log: brought.filter(isNoise),
  };

  // --- la guardia ---
  if (stashRef) {
    const stashed = report.blocking;
    const overlap = stashed.filter((p) => brought.includes(p) && !isNoise(p));
    const noiseOverlap = stashed.filter((p) => brought.includes(p) && isNoise(p));

    if (overlap.length === 0) {
      const pop = git(['stash', 'pop']);
      report.steps.push({ cmd: 'git stash pop', ok: pop.ok });
      if (pop.ok) {
        report.result = 'OK_STASH_REAPPLIED';
        report.guard = {
          verdict: 'nessuna sovrapposizione fra ciò che avevi in locale e ciò che è arrivato',
          index_and_log_ignored: noiseOverlap,
        };
      } else {
        report.result = 'STASH_POP_FAILED';
        report.stderr = pop.stderr;
        report.message =
          `Il pop è fallito e lo stash resta intatto (${stashRef}). Non forzo nulla.`;
      }
    } else {
      report.result = 'OK_STASH_HELD';
      report.guard = {
        verdict:
          'GUARDIA ATTIVATA: lo stash tocca pagine di contenuto che il pull ha cambiato. ' +
          'Non ho fatto il pop: sarebbe una fusione automatica senza nessuno che guarda.',
        stash: stashRef,
        files: overlap.map((p) => {
          const localBlob = blobHash(`${stashRef}^3`, p) || blobHash(stashRef, p);
          const remoteBlob = blobHash('HEAD', p);
          return {
            path: p,
            local_blob: localBlob,
            incoming_blob: remoteBlob,
            verdict:
              localBlob && remoteBlob && localBlob === remoteBlob
                ? 'IDENTICO — la tua copia è un duplicato esatto di ciò che è arrivato: scartarla non perde niente'
                : 'DIVERSO — contenuto locale che il remoto non ha. Decisione tua: rifare il dry run, integrare a mano, o registrare una contraddizione',
          };
        }),
        next:
          'Se tutti sono IDENTICO puoi scartare lo stash con `git stash drop`. ' +
          'Questo server non lo fa mai da sé: uno stash scartato non è più recuperabile.',
      };
    }
  } else {
    report.result = 'OK';
  }

  const driver = git(['config', '--get', 'merge.ours.driver']).stdout;
  if (driver !== 'true') {
    report.warning_merge_driver =
      'merge.ours.driver non è true su questa macchina: al primo vero merge un index.md ' +
      'in conflitto produrrebbe marcatori. Lancia: git config merge.ours.driver true';
  }
  if (report.received.index_and_log.some((p) => p.endsWith('index.md'))) {
    report.note_lint = 'Sono arrivati degli index.md: potrebbe servire /lint per rigenerarli.';
  }
  return report;
}

/**
 * Chiude un'operazione: verifica L ∩ R, poi committa, fonde e spinge.
 * Se L ∩ R non è vuoto NON scrive niente e restituisce il referto.
 */
function vaultPublish({ files, message, confirm_overlap }) {
  assertVault();
  if (!Array.isArray(files) || files.length === 0) {
    throw new Error('files è obbligatorio: i path che questa operazione ha toccato.');
  }
  if (!message || !String(message).trim()) {
    throw new Error('message è obbligatorio: la voce di log di questa operazione.');
  }

  const L = files.map(safeRelPath);
  for (const p of L) {
    if (!fs.existsSync(path.resolve(VAULT_PATH, p))) {
      throw new Error(`File inesistente: ${p}`);
    }
  }

  const email = git(['config', 'user.email']).stdout;
  if (!email) {
    return {
      result: 'NO_IDENTITY',
      message:
        'git config user.email è vuota: il commit sarebbe firmato da nessuno. ' +
        'Impostala prima di pubblicare.',
    };
  }

  git(['fetch', '--quiet']);
  const base = git(['merge-base', 'HEAD', '@{u}']);
  const R = base.ok ? lines(gitOrThrow(['diff', '--name-only', `${base.stdout}..@{u}`])) : [];
  const overlap = L.filter((p) => R.includes(p) && !isNoise(p));

  if (overlap.length > 0 && !confirm_overlap) {
    const other = {};
    for (const p of overlap) {
      const c = git(['log', '-1', '--format=%an <%ae> · %ad · %s', `${base.stdout}..@{u}`, '--', p]);
      other[p] = c.stdout || '(sconosciuto)';
      const localBlob = blobHash('HEAD', p) || null;
      const remoteBlob = blobHash('@{u}', p);
      other[p] += localBlob === remoteBlob ? ' [contenuto identico]' : ' [contenuto diverso]';
    }
    return {
      result: 'OVERLAP',
      identity: email,
      overlap,
      other_side: other,
      message:
        'Sovrapposizione: questi file sono stati toccati anche dall\'altra identità. ' +
        'Non pubblico niente. Le opzioni sono: rifare il dry run, integrare a mano, ' +
        'registrare una contraddizione. Non esiste «tieni la mia».',
      note:
        'Attenzione al caso peggiore: se le righe toccate sono distinte, git fonderebbe ' +
        'in silenzio senza segnalare nulla. È il motivo per cui questo controllo esiste.',
    };
  }

  const add = git(['add', '--', ...L]);
  if (!add.ok) return lockHint({ result: 'FAILED', step: 'add', stderr: add.stderr });

  const commit = git(['commit', '-m', String(message)]);
  if (!commit.ok) return lockHint({ result: 'FAILED', step: 'commit', stderr: commit.stderr });
  const sha = gitOrThrow(['rev-parse', '--short', 'HEAD']);

  const { behind } = aheadBehind();
  if (behind > 0) {
    const merge = git(['merge', '--no-edit', '@{u}']);
    if (!merge.ok) {
      return {
        result: 'MERGE_CONFLICT',
        commit: sha,
        stderr: merge.stderr,
        message:
          'Il commit è fatto, il merge ha prodotto conflitti e li lascio sul disco: ' +
          'risolverli è una decisione umana. Un index.md in conflitto non si risolve ' +
          'leggendo, si rigenera con /lint. Nessun push eseguito.',
      };
    }
  }

  const push = git(['push']);
  if (!push.ok) return { result: 'PUSH_FAILED', commit: sha, stderr: push.stderr };

  return {
    result: 'PUBLISHED',
    commit: sha,
    identity: email,
    files: L,
    message: String(message),
  };
}

/**
 * Se un fallimento è dovuto a un index.lock, dillo invece di lasciare che
 * l'agente interpreti uno stderr di git. Un lock orfano è la causa più
 * probabile di uno stop inaspettato, e ha un rimedio preciso.
 */
function lockHint(report) {
  if (!/index\.lock/.test(report.stderr || '')) return report;
  const info = lockInfo();
  return {
    ...report,
    cause: 'INDEX_LOCK',
    lock: info,
    hint:
      'Un .git/index.lock blocca le scritture sull\'indice. Se nessun client git ' +
      'sta lavorando sul repository in questo momento, è un lock abbandonato: ' +
      'chiedi conferma all\'utente e chiama vault_unlock con confirm: true.',
  };
}

/** Stato del lock dell'indice: esiste? da quanto? */
function lockInfo() {
  const lock = path.join(VAULT_PATH, '.git', 'index.lock');
  if (!fs.existsSync(lock)) return null;
  const st = fs.statSync(lock);
  return {
    path: lock,
    age_seconds: Math.round((Date.now() - st.mtimeMs) / 1000),
    size: st.size,
  };
}

const LOCK_MIN_AGE = 60; // sotto questa soglia un'operazione git potrebbe essere viva

/**
 * Mette da parte un `.git/index.lock` abbandonato.
 *
 * Un lock orfano — tipicamente lasciato da un processo git morto a metà —
 * blocca ogni scrittura sull'indice, quindi vault_publish non parte nemmeno.
 * Ma un lock può anche essere legittimo: se un altro processo git lo tiene in
 * mano *adesso*, toglierlo corrompe l'indice.
 *
 * Il server non può chiedere niente all'utente, quindi non decide: pretende un
 * `confirm` esplicito, che l'agente ottiene solo dopo aver chiesto. E rifiuta
 * comunque se il lock è più giovane di LOCK_MIN_AGE secondi, perché in quella
 * finestra un'operazione normale può averlo preso da poco.
 *
 * Non cancella: rinomina. Un lock spostato non è più visto da git ma resta sul
 * disco, e se si scopre di aver sbagliato si rimette al suo posto.
 */
function vaultUnlock({ confirm }) {
  assertVault();
  const info = lockInfo();

  if (!info) {
    return { result: 'NO_LOCK', message: 'Nessun index.lock presente: non c\'è niente da sbloccare.' };
  }
  if (!confirm) {
    return {
      result: 'NEEDS_CONFIRM',
      lock: info,
      message:
        `Trovato .git/index.lock, fermo da ${info.age_seconds} secondi. ` +
        'Non lo tocco senza una conferma esplicita: se in questo momento GitHub Desktop ' +
        'o un altro client sta facendo un\'operazione, quel lock è legittimo e rimuoverlo ' +
        'corrompe l\'indice. Chiedi all\'utente se ha operazioni git in corso, e richiama ' +
        'questa tool con confirm: true solo se la risposta è no.',
    };
  }
  if (info.age_seconds < LOCK_MIN_AGE) {
    return {
      result: 'TOO_YOUNG',
      lock: info,
      message:
        `Il lock ha solo ${info.age_seconds} secondi: troppo recente per dirlo abbandonato. ` +
        `Aspetta che superi i ${LOCK_MIN_AGE} secondi e riprova, oppure verifica che nessun ` +
        'client git stia lavorando sul repository.',
    };
  }

  const parked = `${info.path}.abbandonato-${Date.now()}`;
  try {
    fs.renameSync(info.path, parked);
  } catch (e) {
    return { result: 'FAILED', lock: info, stderr: e.message };
  }
  return {
    result: 'UNLOCKED',
    was: info,
    parked_at: parked,
    message:
      'Lock spostato, non cancellato: git non lo vede più e le scritture sono di nuovo ' +
      'possibili. Il file resta sul disco, quindi se si scopre che serviva si rimette a posto.',
  };
}

function vaultStashList() {
  assertVault();
  const list = lines(git(['stash', 'list']).stdout);
  const detail = list.map((entry, i) => {
    const ref = `stash@{${i}}`;
    const tracked = lines(git(['stash', 'show', '--name-only', ref]).stdout);
    const untracked = lines(git(['show', '--name-only', '--format=', `${ref}^3`]).stdout);
    return { ref, entry, tracked, untracked };
  });
  return {
    count: list.length,
    stashes: detail,
    note:
      'Questo server non scarta mai uno stash. Se vuoi eliminarne uno, lancia tu ' +
      '`git stash drop <ref>`: dopo non è più recuperabile.',
  };
}

// ------------------------------------------------------------- protocollo

const TOOLS = [
  {
    name: 'vault_status',
    description:
      'Stato del vault: branch, quanti commit avanti/indietro rispetto al remoto, file non tracciati e modificati, stash presenti, identità git configurata, stato del merge driver. Sola lettura, non modifica niente.',
    inputSchema: { type: 'object', properties: {} },
    handler: vaultStatus,
  },
  {
    name: 'vault_sync',
    description:
      'Sincronizza il vault con git pull --ff-only. Se il working tree blocca il fast-forward, mette via i soli file bloccanti con git stash push -u, rifà il ff, e poi applica una guardia: riapplica lo stash solo se non tocca pagine di contenuto che il pull ha cambiato; altrimenti lascia lo stash intatto e restituisce il referto. Non fa mai un merge non richiesto e non scarta mai uno stash.',
    inputSchema: { type: 'object', properties: {} },
    handler: vaultSync,
  },
  {
    name: 'vault_publish',
    description:
      'Chiude un\'operazione: verifica che i file passati non siano stati toccati anche dall\'altra identità (L ∩ R), e solo se la verifica passa committa, fonde e spinge. Se rileva sovrapposizione non scrive niente e restituisce il referto.',
    inputSchema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: { type: 'string' },
          description: 'Path relativi al vault che questa operazione ha toccato.',
        },
        message: { type: 'string', description: 'Messaggio di commit, nella forma della voce di log.' },
        confirm_overlap: {
          type: 'boolean',
          description: 'Solo se l\'utente ha esplicitamente deciso di procedere nonostante la sovrapposizione già mostrata.',
        },
      },
      required: ['files', 'message'],
    },
    handler: vaultPublish,
  },
  {
    name: 'vault_unlock',
    description:
      'Mette da parte un .git/index.lock abbandonato, che blocca ogni scrittura sull\'indice e impedisce a vault_publish di partire. Rinomina il lock, non lo cancella. Senza confirm non fa niente e restituisce NEEDS_CONFIRM: la conferma va chiesta all\'utente, verificando che nessun client git stia lavorando sul repository. Rifiuta comunque se il lock è più recente di 60 secondi.',
    inputSchema: {
      type: 'object',
      properties: {
        confirm: {
          type: 'boolean',
          description: 'True solo dopo che l\'utente ha confermato di non avere operazioni git in corso.',
        },
      },
    },
    handler: vaultUnlock,
  },
  {
    name: 'vault_stash_list',
    description:
      'Elenca gli stash presenti e i file dentro ciascuno, tracciati e non tracciati. Serve a ispezionare quello che una guardia di vault_sync ha lasciato indietro. Sola lettura.',
    inputSchema: { type: 'object', properties: {} },
    handler: vaultStashList,
  },
];

function send(msg) {
  process.stdout.write(JSON.stringify(msg) + '\n');
}

function handle(req) {
  const { id, method, params } = req;

  if (method === 'initialize') {
    return send({
      jsonrpc: '2.0',
      id,
      result: {
        protocolVersion: (params && params.protocolVersion) || '2024-11-05',
        capabilities: { tools: {} },
        serverInfo: { name: 'vault-mcp', version: '1.0.0' },
      },
    });
  }

  if (method === 'tools/list') {
    return send({
      jsonrpc: '2.0',
      id,
      result: {
        tools: TOOLS.map(({ name, description, inputSchema }) => ({ name, description, inputSchema })),
      },
    });
  }

  if (method === 'tools/call') {
    const tool = TOOLS.find((t) => t.name === params.name);
    if (!tool) {
      return send({ jsonrpc: '2.0', id, error: { code: -32601, message: `Tool ignota: ${params.name}` } });
    }
    try {
      const result = tool.handler(params.arguments || {});
      return send({
        jsonrpc: '2.0',
        id,
        result: { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] },
      });
    } catch (e) {
      return send({
        jsonrpc: '2.0',
        id,
        result: { content: [{ type: 'text', text: `ERRORE: ${e.message}` }], isError: true },
      });
    }
  }

  if (id !== undefined && method !== undefined) {
    send({ jsonrpc: '2.0', id, error: { code: -32601, message: `Metodo non gestito: ${method}` } });
  }
}

let buf = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => {
  buf += chunk;
  let nl;
  while ((nl = buf.indexOf('\n')) !== -1) {
    const line = buf.slice(0, nl).trim();
    buf = buf.slice(nl + 1);
    if (!line) continue;
    try {
      handle(JSON.parse(line));
    } catch (e) {
      // JSON illeggibile: ignora la riga, non abbattere il server.
    }
  }
});
process.stdin.on('end', () => process.exit(0));
