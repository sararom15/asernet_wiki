---
name: pubblica
description: Pubblica su GitHub il lavoro dell'operazione appena conclusa. Prima verifica che nessun altro abbia toccato gli stessi file nel frattempo; se è successo si ferma e chiede all'utente. Non risolve mai una sovrapposizione da sola.
argument-hint: "[opzionale: messaggio di commit]"
allowed-tools: Read, Glob, Grep, Bash
disable-model-invocation: true
---

# Pubblica il lavoro

Messaggio proposto: `$ARGUMENTS` (se vuoto, lo ricavi dal log al passo 2)

Questa skill chiude un'operazione: la porta da «scritta sul disco» a «visibile
agli altri autori». Non scrive contenuto, non aggiorna `index.md`, non appende
voci di log — quelle cose le ha già fatte l'operazione che ti ha portato qui. Se
non le ha fatte, il posto per rimediare non è questo: **fermati e dillo.**

## Come si eseguono le operazioni git

La scrittura passa da **una sola tool**: `vault_publish`, esposta dal server MCP
del vault. Chiamala per nome corto — il nome pieno cambia col modo di
installazione (`mcp__vault-asernet__…` con la config manuale,
`mcp__plugin_asernet-wiki_vault__…` se il server arriva col plugin).

`vault_publish` fa da sé, e ti impedisce di sbagliarlo:

1. rifiuta se `git config user.email` è vuota — un commit firmato da nessuno;
2. costruisce **R** dall'antenato comune e calcola **L ∩ R**, escludendo
   `index.md` e `log/` che ogni operazione tocca;
3. se l'intersezione non è vuota **non scrive niente** e torna `OVERLAP`;
4. altrimenti committa i soli path passati, fonde con `merge` (non `rebase`) e
   spinge;
5. se il merge dà conflitti li lascia sul disco e **non** spinge.

Bash ti resta concesso **solo in lettura**, e serve a una cosa precisa:
arricchire il report di sovrapposizione al passo 4 con i diff e col log
dell'altra identità, che la tool non ti dà. Ammessi: `git status`, `git diff`,
`git log`, `git show`, `git merge-base`, `git merge-tree`, `git ls-files`,
`git config` in lettura.

Sono **fuori dal tuo elenco** e non li usi in nessuna circostanza: `add`,
`commit`, `merge`, `push` a mano — passano dalla tool — e poi `reset`,
`checkout`, `stash`, `rebase`, `revert`, `push --force`, `commit --amend`,
`clean`. Se una situazione sembra richiederne uno, quella è la prova che devi
fermarti e chiedere, non che ti serve un comando in più.

### Se la tool non c'è

Server non installato, plugin non aggiornato, processo morto. **Non pubblicare a
mano.** Fai i passi 1–4 in sola lettura, presenta il report, e poi passa
all'utente i comandi esatti da lanciare, fermandoti. La verifica L ∩ R vale
anche fatta a mano; è il push che non ti spetta.

## Precondizioni

- Esiste un **progetto attivo** dichiarato in questa sessione? Se no, fermati e
  chiedi di lanciare `/progetto`.
- Sai qual è l'**identità attiva** (l'`id` di `/_meta/authors.md` stabilito da
  `/progetto`)? Se no, **fermati e chiedila**. Serve per il messaggio di commit e
  per sapere quale log leggere. Non dedurla dal nome dell'autore Git senza
  passare dal registro.
- C'è qualcosa da pubblicare? Chiama `vault_status`. Se `untracked` e `modified`
  sono vuoti e `ahead` è 0, dillo e fermati: non è un errore, non c'è lavoro.

---

## 1. Fotografa il lavoro locale

Costruisci l'insieme **L** — i file che *tu* hai toccato e non hai ancora
pubblicato. Sono due componenti, servono entrambe:

- `vault_status` ti dà `untracked` e `modified`, cioè il non committato;
- `git diff --name-only origin/main...HEAD` ti dà il committato e non spinto.

L è l'unione dei due elenchi.

## 2. Verifica la coerenza col log

Leggi la voce in cima a `projects/<slug>/log/<id>.md` e confronta i file che
dichiara con **L**.

| Situazione | Cosa fai |
|---|---|
| Coincidono | Prosegui. Il messaggio di commit è il titolo della voce, senza le parentesi quadre: `ingest \| Titolo della fonte ingerita` |
| In L ci sono file che il log non nomina | **Fermati e chiedi.** O il log è incompleto — e §9.14 vieta di completarlo «dopo» — o c'è lavoro di un'altra operazione rimasto indietro |
| Il log nomina file che non sono in L | **Fermati e chiedi.** L'operazione dichiara scritture che sul disco non ci sono |

**Questo controllo è tuo e non della tool.** Il server sa quali file gli passi,
non quali file l'operazione *dichiarava* di toccare: il log è materiale di
dominio, e leggerlo è un lavoro di senso, non di git. È anche il motivo per cui
`/pubblica` è una skill e non un hook — un hook pubblica ciò che trova, qui si
verifica prima che quello che stai per pubblicare sia *l'operazione che dici di
aver fatto*.

## 3. Chiama la tool

```
vault_publish(files: <L>, message: "<messaggio dal passo 2>")
```

Passa **solo i file di L**. Se `vault_status` mostra altro, è roba che non
appartiene a questa operazione: chiedi prima di includerla.

Esiti:

| `result` | Cosa fai |
|---|---|
| `PUBLISHED` | Vai al passo 5 |
| `OVERLAP` | Vai al passo 4. **Niente è stato scritto** |
| `NO_IDENTITY` | `git config user.email` è vuota. Chiedi all'utente di impostarla e fermati |
| `MERGE_CONFLICT` | Il commit c'è, il push no, i conflitti sono sul disco. Riporta i file e fermati: risolverli è una decisione umana, e un `index.md` in conflitto **non si risolve leggendo** ma si rigenera con `/lint` (§7) |
| `PUSH_FAILED` | Qualcuno ha spinto fra il fetch e il push. Non insistere, non usare `--force`: ricomincia dal passo 1 |
| `FAILED` | Riporta `stderr`. Se c'è `cause: INDEX_LOCK`, chiedi all'utente se ha operazioni git in corso e solo in caso negativo chiama `vault_unlock` con `confirm: true` |

## 4. Se la tool torna `OVERLAP`: REPORT e STOP

**Non ripetere la chiamata con `confirm_overlap`.** Quel parametro esiste per un
solo caso: l'utente ha visto il report e ha detto esplicitamente come procedere.

La tool ti dà `overlap` (i file) e `other_side` (chi, quando, con che messaggio,
e se il contenuto dei due lati è identico o diverso). È lo scheletro. Ora
aggiungi con Bash in lettura ciò che serve a decidere:

```bash
git diff HEAD...origin/main -- <file>     # cosa hanno cambiato loro
git diff origin/main...HEAD -- <file>     # cosa hai cambiato tu, se committato
git diff -- <file>                        # se ancora nella working tree
```

I tre punti non sono un refuso: `A...B` confronta **B con l'antenato comune**,
cioè «cosa hanno fatto loro», non «cosa c'è di diverso fra noi».

Poi risali all'**identità** dell'altra persona: prendi l'email dall'`other_side`,
cercala in `/_meta/authors.md`, ricava l'`id`, e leggi la voce in cima al suo log
così come sta su remoto:

```bash
git show origin/main:projects/<slug>/log/<altro-id>.md | head -20
```

Il log dell'altro dice *cosa credeva di fare*. È l'informazione che serve
all'utente per decidere, e senza di essa il report è solo due diff affiancati.

Se disponibile, distingui i due tipi di sovrapposizione:

```bash
git merge-tree --write-tree HEAD origin/main
```

| Esito | Cosa significa | Come lo presenti |
|---|---|---|
| Segnala conflitto sul file | Avete toccato le stesse righe | Git si fermerebbe da solo. Rumoroso, ma visibile |
| Non segnala niente | Avete toccato righe diverse | **Git fonderebbe in silenzio.** È il caso pericoloso: segnalalo per primo e dillo esplicitamente |

Se il comando non è disponibile su questa versione di Git, non fa niente:
presenta comunque i due diff e ometti la classificazione.

### Formato del report

```
SOVRAPPOSIZIONE — <n> file toccati da entrambi. Non ho pubblicato niente.

<percorso/della/pagina.md>
  Tu        : <riassunto di una riga di cosa hai cambiato>
  <altro-id>: <riassunto> — <data> · <titolo della sua voce di log>
  Git       : fonderebbe in silenzio | segnalerebbe conflitto
  [i due diff]

Cosa vuoi fare?
```

Poi elenca le opzioni **senza sceglierne una**:

1. **Rifare il dry run.** Spesso è la risposta giusta e va detta per prima: la
   tua operazione è stata calcolata su un vault che nel frattempo è cambiato, e
   le sue conclusioni potrebbero non valere più.
2. **Integrare a mano.** L'utente legge entrambe le versioni e decide il testo
   finale. Tu applichi ciò che dice, niente di più.
3. **Registrare una contraddizione.** Se le due versioni affermano cose
   incompatibili sulla base di fonti diverse, non è un problema di merge: è una
   contraddizione, e `CLAUDE.md` §5.1 dice di **registrarla** in
   `## Contraddizioni aperte` citando entrambe le fonti, non di risolverla.
4. **Rinunciare per ora.** Il lavoro resta locale e non pubblicato. È legittimo.

**Non proporre mai** di sovrascrivere la versione dell'altro, né di scartare la
tua. Non esiste un'opzione «tieni la mia»: se le due versioni non sono
conciliabili, la forma corretta è la 3.

Dopo il report **fermati**. Non fare niente finché l'utente non risponde.

## 5. Conferma con questo formato, e fermati

Il campo `Sync` lo ricavi da `vault_status` dopo la pubblicazione. Se fra i file
fusi c'era un `index.md`, **quel bundle va rigenerato**: dillo. Non rigenerarlo
tu, non è il tuo compito.

```
Pubblicato: <slug> · <id>
Commit    : <hash breve> — <messaggio>
File      : <n> (<elenco>)
Sync      : <nessuna novità | fuso con N commit di <id>>
Da fare   : <— | /lint per rigenerare gli index toccati dal merge>
```

---

## Divieti specifici di questa skill

1. Non chiamare `vault_publish` con `confirm_overlap` senza una risposta
   esplicita dell'utente in questa sessione, data dopo aver visto il report.
2. Non risolvere una sovrapposizione da solo, nemmeno se una delle due versioni
   sembra chiaramente migliore, più recente o più completa.
3. Non eseguire `add`, `commit`, `merge` o `push` con Bash: passano dalla tool.
   E mai `--force`, `--amend`, `reset`, `checkout`, `stash`, `rebase`.
4. Non scrivere nel log: la voce esiste già, l'ha scritta l'operazione. Se non
   esiste, è quella l'anomalia da segnalare.
5. Non passare alla tool file che il log non dichiara senza aver chiesto.
6. Non rigenerare gli `index.md`: segnala che serve `/lint` e fermati.
7. Non chiamare `vault_unlock` senza aver prima chiesto all'utente se ha
   operazioni git in corso.
