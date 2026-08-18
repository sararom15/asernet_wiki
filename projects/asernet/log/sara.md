# Log — asernet · sara

## [2026-08-18] tooling | il caso «senza rete» smette di travestirsi da altro
- Aggiornato: tools/vault-mcp/server.js — `vault_publish` distingue `OFFLINE` da `PUSH_FAILED` (nuova `isOffline`, riconoscimento per stringa che nel dubbio dice no); `vault_sync` non scarta più l'esito del `fetch` e restituisce `UNKNOWN` invece di `UP_TO_DATE`; `vault_status` espone `remote_check`
- Aggiornato: .claude/skills/pubblica/SKILL.md (riga `OFFLINE` negli esiti, `PUSH_FAILED` riformulata per distinguerle), .claude/skills/progetto/SKILL.md (riga `UNKNOWN`, campo `Sync` della conferma), CLAUDE.md (§12: nuovo capoverso sulla rete; riga di storico), .claude-plugin/plugin.json (1.3.2)
- Occasione: il `vault_publish` del commit ad1190a è finito in `PUSH_FAILED` per assenza di rete. La procedura associata a quell'esito — «qualcuno ha spinto fra il fetch e il push, ricomincia dal passo 1» — avrebbe fatto rifare un lavoro già committato e integro, sulla base di una causa mai esistita
- Difetto peggiore emerso cercando il primo: l'esito di `git fetch` veniva scartato in `vault_sync` e in `vault_status`. Senza rete il fetch fallisce in silenzio, `@{u}` resta fermo, e un vault mai sincronizzato viene riferito come allineato — da lì l'astensione falsa del §7, per una strada che non passa da nessuna decisione sbagliata
- Verificato: `isOffline` su cinque stderr reali, inclusa la discriminazione fra il 403 del proxy (rete assente → OFFLINE) e il 403 di permesso sul repository (il remoto ha risposto → non OFFLINE)
- Nota di metodo: voce scritta da Claude su istruzione esplicita di sara, come la precedente. Terzo commit di tooling in un giorno: il §8 continua a non prevederli
- Sync: non eseguito in questa sessione, e da questo ambiente non è eseguibile — è esattamente la condizione che questa modifica insegna a dichiarare

## [2026-08-18] tooling | vault_setup: il merge driver si imposta invece di segnalarsi
- Aggiunto: tools/vault-mcp/server.js — tool `vault_setup`, scrive `merge.ours.driver` in `--local` nel `.git/config` del clone; idempotente (ALREADY_OK se c'è già), rilegge il valore prima di dichiarare successo, FAILED visibile se `.git/config` non è scrivibile
- Aggiornato: CLAUDE.md (§7 riscritto — la premessa «è configurazione della macchina dell'utente, non del vault» valeva solo per `--global`, e l'errore è annotato invece che rimosso; §12 passa a sei tool; riga di storico), .claude/skills/progetto/SKILL.md (passo 0.3: chiama la tool invece di segnalare, nuovo campo di conferma), .claude/skills/pubblica/SKILL.md (nuovo passo 2-bis prima del merge, divieto 3 esteso a `git config` in scrittura), README.md (passo 3 dell'installazione: non c'è più niente da fare a mano), .claude-plugin/plugin.json (1.3.0 → 1.3.1, §12)
- Occasione: seconda identità bloccata al primo uso del plugin — scansione del vault ferma a un livello di profondità e driver mai impostato
- Verificato: su repository usa e getta, senza driver il merge di un index.md lascia i marcatori, con driver passa pulito tenendo la versione locale; `git config --global` resta vuota in entrambi i casi
- Nota di metodo: voce scritta da Claude su istruzione esplicita di sara, non dall'operazione stessa. È il secondo commit di tooling in un giorno che il §8 non sa dove collocare — la regola andrebbe estesa
- Sync: non eseguito in questa sessione (nessun /progetto); ahead 0, behind 0 all'ultimo vault_status

## [2026-08-18] lint
- 0 bloccanti, 22 da sanare, 5 da valutare, 3 corretti
- Corretto: creati sources/index.md, entities/index.md, concepts/index.md (derivati dal frontmatter); index.md di radice (sezioni ora linkate, rimosso il gap corrispondente)
- Fusioni silenziose: 4 pagine (merge 68d5b32 del 2026-08-06)

## [2026-08-06] ingest | datapyx.ai — sito (Home, Chi Siamo, Metodologia, Audit SEO)
- Fonte depositata: raw/2026-08-06-sito-datapyx-ai.md (cattura di 4 pagine, autorizzata esplicitamente in sessione in deroga al CLAUDE.md §0)
- Creato: sources/2026-08-06-sito-datapyx-ai.md, concepts/metodologia-datapyx.md, concepts/audit-seo-datapyx.md, concepts/data-genius.md
- Aggiornato: concepts/datapyx-ai.md (da strumento interno a business unit: definizione, listino, destinatari, moduli, contraddizione), entities/asernet.md (Datapyx.ai come business unit; Data Genius diventa link), _meta/glossary.md (Datapyx.ai, Data Genius, Beople), index.md (conteggi, 4 domande aperte, 3 gap), log.md (aggiunta la voce d'indice per log/sara.md, creato in questa operazione)
- Contraddizioni: 1 — Datapyx.ai strumento interno (asernet.it) contro prodotto autonomo (datapyx.ai), stessa data di recupero, non risolta
- Non fatto, per scelta: Datapyx.ai resta `type: Concept` (lo spostamento a `Entity` è una decisione aperta); gli `index.md` di sezione restano assenti, da rigenerare con /lint
- Sync: risincronizzato in fase A.1, nessuna novità
