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

## Limite d'uso di Bash

Bash è concesso **solo** per:

- `git fetch`, `git status`, `git diff`, `git log`, `git show`, `git merge-base`,
  `git merge-tree`, `git ls-files`
- `git config` in lettura
- `git add`, `git commit`, `git merge`, `git push`

Non usarlo per altro. In particolare sono **fuori dal tuo elenco**:
`reset`, `checkout`, `stash`, `rebase`, `revert`, `push --force`,
`commit --amend`, `clean`. Se una situazione sembra richiederne uno, quella è la
prova che devi fermarti e chiedere, non che ti serve un comando in più.

## Precondizioni

- Esiste un **progetto attivo** dichiarato in questa sessione? Se no, fermati e
  chiedi di lanciare `/progetto`.
- Sai qual è l'**identità attiva** (l'`id` di `/_meta/authors.md` stabilito da
  `/progetto`)? Se no, **fermati e chiedila**. Serve per il messaggio di commit e
  per sapere quale log leggere. Non dedurla dal nome dell'autore Git senza
  passare dal registro.
- C'è qualcosa da pubblicare? `git status --porcelain`. Se è vuoto e non ci sono
  commit locali non spinti, dillo e fermati: non è un errore, non c'è lavoro.

---

## 1. Fotografa il lavoro locale

Costruisci l'insieme **L** — i file che *tu* hai toccato e non hai ancora
pubblicato. Sono due componenti, servono entrambe:

```bash
git status --porcelain                      # non ancora committato
git diff --name-only origin/main...HEAD     # committato ma non spinto
```

L è l'unione dei due elenchi.

## 2. Verifica la coerenza col log

Leggi la voce in cima a `projects/<slug>/log/<id>.md` e confronta i file che
dichiara con **L**.

| Situazione | Cosa fai |
|---|---|
| Coincidono | Prosegui. Il messaggio di commit è il titolo della voce, senza le parentesi quadre: `ingest \| Titolo della fonte ingerita` |
| In L ci sono file che il log non nomina | **Fermati e chiedi.** O il log è incompleto — e §9.14 vieta di completarlo «dopo» — o c'è lavoro di un'altra operazione rimasto indietro |
| Il log nomina file che non sono in L | **Fermati e chiedi.** L'operazione dichiara scritture che sul disco non ci sono |

Questo controllo è il motivo per cui `/pubblica` è una skill e non un hook. Un
hook pubblica ciò che trova; qui si verifica prima che quello che stai per
pubblicare sia *l'operazione che dici di aver fatto*.

## 3. Scopri cosa è cambiato altrove

```bash
git fetch origin
```

`fetch` non tocca mai la working tree: è sempre sicuro, anche a lavoro non
committato.

Costruisci l'insieme **R** — i file cambiati su `origin/main` da quando i vostri
rami si sono separati:

```bash
git diff --name-only HEAD...origin/main
```

I tre punti non sono un refuso: `A...B` confronta **B con l'antenato comune**,
che è esattamente «cosa hanno fatto loro», non «cosa c'è di diverso fra noi».

Se R è vuoto, nessuno ha pubblicato nel frattempo: vai al passo 5.

## 4. Interseca — è il cuore della skill

Calcola **L ∩ R**: i file che tu hai modificato e che nel frattempo ha
modificato anche qualcun altro.

### Se l'intersezione è vuota

Prosegui al passo 5. Git fonderà i due lavori senza che si tocchino.

### Se l'intersezione NON è vuota: REPORT e STOP

**Non pubblicare. Non fondere. Non risolvere.** Prepara il report e fermati.

Per ogni file nell'intersezione raccogli:

```bash
# chi ha toccato il file dall'altra parte, e quando
git log --format='%an <%ae> · %ad · %s' HEAD..origin/main -- <file>

# cosa hanno cambiato loro
git diff HEAD...origin/main -- <file>

# cosa hai cambiato tu
git diff origin/main...HEAD -- <file>    # se committato
git diff -- <file>                        # se ancora nella working tree
```

Poi risali all'**identità** dell'altra persona: prendi l'email dell'autore del
commit, cercala in `/_meta/authors.md`, ricava l'`id`, e leggi la voce in cima al
suo log così come sta su remoto:

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

---

## 5. Pubblica

Solo se il passo 4 è passato pulito, o se l'utente ti ha detto come procedere e
tu hai applicato *quello che ha detto*.

```bash
git add -A -- <i file di L>
git commit -m "<messaggio dal passo 2>"
```

Committa **solo i file di L**. Se `git status` mostra altro, è roba che non
appartiene a questa operazione: chiedi prima di includerla.

Se **R** non era vuoto, prima di fondere verifica `git config --get
merge.ours.driver`. Se non è `true`, il driver `merge=ours` su `**/index.md`
(`.gitattributes`) non ha effetto su questa macchina: **fermati** e chiedi
all'utente di lanciare `git config merge.ours.driver true` prima di procedere.
È più economico fermarsi qui che disinnescare a mano dei marcatori di
conflitto dentro un file che CLAUDE.md §7 dice di non risolvere mai a mano.

Poi allinea e spingi:

```bash
git merge origin/main      # solo se R non era vuoto
git push
```

**Usa `merge`, non `rebase`.** Il `.gitattributes` del vault dichiara
`**/index.md merge=ours`, e in un rebase i lati si invertono: `ours` diventa il
ramo remoto, quindi il driver terrebbe l'`index.md` degli altri invece del tuo.
Il contenuto sarebbe comunque da rigenerare — §7 dice che quale delle due
versioni si tiene è indifferente — ma la configurazione del repository è scritta
per la semantica del merge, e non va sovvertita di nascosto da questa skill.

Se il merge tocca un `index.md`, **quel bundle va rigenerato**: dillo nella
conferma finale. Non rigenerarlo tu, non è il tuo compito.

Se `git push` fallisce perché qualcuno ha spinto fra il tuo `fetch` e il tuo
`push`, non insistere e **non usare `--force`**: ricomincia dal passo 3. La
finestra è di secondi, ma esiste.

## 6. Conferma con questo formato, e fermati

```
Pubblicato: <slug> · <id>
Commit    : <hash breve> — <messaggio>
File      : <n> (<elenco>)
Sync      : <nessuna novità | fuso con N commit di <id>>
Da fare   : <— | /lint per rigenerare gli index toccati dal merge>
```

---

## Divieti specifici di questa skill

1. Non pubblicare mai quando **L ∩ R** non è vuoto senza una risposta esplicita
   dell'utente in questa sessione.
2. Non risolvere una sovrapposizione da solo, nemmeno se una delle due versioni
   sembra chiaramente migliore, più recente o più completa.
3. Non usare `--force`, `--amend`, `reset`, `checkout`, `stash` o `rebase`.
4. Non scrivere nel log: la voce esiste già, l'ha scritta l'operazione. Se non
   esiste, è quella l'anomalia da segnalare.
5. Non committare file che il log non dichiara senza aver chiesto.
6. Non rigenerare gli `index.md`: segnala che serve `/lint` e fermati.
