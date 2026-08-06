---
name: progetto
description: Sincronizza il vault, imposta il progetto attivo per questa sessione e carica il suo schema. Da eseguire come prima cosa in ogni sessione, prima di qualsiasi ingest, query o lint.
argument-hint: "[slug del progetto, oppure vuoto per l'elenco]"
allowed-tools: Read, Glob, Grep, Bash
---

# Imposta il progetto attivo

Argomento ricevuto: `$ARGUMENTS`

## Limite d'uso di Bash

Bash è concesso a questa skill **solo** per i comandi elencati qui sotto:

- `git pull --ff-only`, `git fetch`, `git status`, `git diff`, `git log`
  (incluso `git log -1 --format=%ae` del passo 0.1)
- `git config user.email`, `git config user.name` e
  `git config merge.ours.driver` (in lettura)
- il `grep` sui log del passo 5

Non usarlo per altro. In particolare: niente `git commit`, niente `git push`,
niente `git merge`, niente `git checkout`, niente `git reset`, nessuna scrittura
di file. Se serve un'operazione fuori da questo elenco, fermati e chiedila
all'utente.

Questa skill gira all'apertura di ogni sessione: è il punto del sistema in cui un
errore costa di più.

## Passo 0 — Sincronizza (sempre, anche senza argomento)

```
git pull --ff-only
```

Il pull non è igiene di sincronizzazione, è una **precondizione di correttezza**.
La query legge prima gli `index.md`: su un vault non aggiornato non sai che certe
pagine esistono e produci una soglia di astensione falsa — dichiari che la wiki
non copre un argomento che invece copre. Un'astensione sbagliata è peggio di un
errore, perché sembra prudenza.

**`--ff-only` non è opzionale.** Senza, il pull tenterebbe un merge su pagine di
contenuto senza che nessuno lo abbia chiesto, che è esattamente ciò che questo
vault vieta: il merge di Git è cieco al significato, unisce righe e non
affermazioni. Con `--ff-only` il pull o avanza pulito o fallisce, e non può mai
produrre marcatori di conflitto. **Nel vault esiste un solo punto in cui avviene
un vero merge, ed è il passo 5 di `/pubblica`**, dove qualcuno sta guardando.

Esito del pull:

| Situazione | Cosa fai |
|---|---|
| Già aggiornato | Prosegui |
| Avanzamento pulito | Prosegui, e riporta le novità al passo 0.2 |
| **Fallisce** | Hai commit locali non spinti: lavoro di un'operazione precedente mai pubblicato. Dillo, manda l'utente a **`/pubblica`**, e **fermati**. Non caricare lo schema, non proseguire |
| Fallisce per altro motivo | Riporta l'errore testuale e fermati. Non tentare rimedi: `merge`, `rebase`, `reset`, `checkout` e `stash` non sono nel tuo elenco |

## Passo 0.1 — Stabilisci l'identità attiva

Serve a sapere in quale `log/<id>.md` scriveranno `/ingest` e `/lint` più avanti
nella sessione. Interroga **due** fonti, in quest'ordine:

```
git config user.email        # A — chi firmerà il prossimo commit
git log -1 --format=%ae      # B — chi ha firmato l'ultimo
```

Cerca l'email in `/_meta/authors.md` e ricava l'`id` corrispondente.

| A | B | Cosa fai |
|---|---|---|
| presente | — | Usa **A**. È l'identità che firmerà ciò che scrivi in questa sessione |
| **vuota** | presente e nel registro | Usa **B**, e **dichiaralo nella conferma finale**: «identità dedotta dall'ultimo commit» |
| vuota | vuota o assente dal registro | **Chiedi all'utente chi sta lavorando** |
| presente | presente ma **diversa da A** | Riporta entrambe e **chiedi**: `/pubblica` firmerebbe con A, ma il repository è stato scritto da B |

**Una risposta vuota da A non significa che l'identità non sia configurata.**
Questo è il caso normale, non l'eccezione: il comando gira nella shell
dell'agente, che può avere un `HOME` proprio e non vedere il `.gitconfig`
globale della macchina dell'utente — è ciò che succede quando l'utente ha
configurato l'identità da GitHub Desktop o da un altro client grafico, che
scrive nel globale e non nel `.git/config` del repository. Fallire qui e chiedere
a ogni singola apertura di sessione è rumore che addestra l'utente a rispondere
senza leggere, il che è peggio del difetto che la domanda voleva prevenire.

**Perché B è evidenza e non un indovinello.** L'email dell'ultimo commit è la
configurazione che il repository ha *effettivamente usato* per firmare: è un
fatto registrato, non una somiglianza. Restano vietate le deduzioni che il
divieto originale colpiva, e vanno lette come vietate anche adesso: **non
dedurre un id dal nome della cartella, dal contenuto delle pagine, dal nome
dell'account sul sistema o da una somiglianza fra nomi propri.** Un id sbagliato
firma un'operazione a nome di qualcun altro.

Su un repository senza commit (bundle appena creato) B è vuota per costruzione:
si ricade nel terzo caso, e si chiede.

## Passo 0.2 — Cosa è cambiato da quando eri qui

Solo se il pull ha portato qualcosa.

```bash
git diff --name-only ORIG_HEAD HEAD
git log --format='%an <%ae> · %ad · %s' ORIG_HEAD..HEAD
```

Separa le **pagine di contenuto** dagli `index.md` e dai file di `log/`: i
secondi cambiano a ogni operazione e non dicono niente sul merito.

Per ogni identità che ha pubblicato, leggi la voce in cima al suo log e riportala
in una riga. Il log dice *cosa credeva di fare*, che è l'informazione utile;
l'elenco dei file da solo non lo è.

Questo passo esiste perché `/chiedi` non ha una fase in cui rifare il lavoro:
chi apre una sessione solo per interrogare la wiki non passerà mai dal controllo
di risincronizzazione di `/ingest`, e deve sapere qui che il terreno si è mosso.

Se fra i file arrivati c'è un `index.md`, segnala che potrebbe servire `/lint`
per rigenerarlo.

## Passo 0.3 — Verifica il merge driver locale

```
git config --get merge.ours.driver
```

Se il risultato non è `true`, il driver `merge=ours` su `**/index.md`
(`.gitattributes`, CLAUDE.md §7) non ha effetto su questa macchina: al primo
vero merge — dentro `/pubblica` — un `index.md` in conflitto produrrebbe
marcatori invece di essere risolto in automatico.

Non è bloccante per questa sessione: annota l'esito in `Sync:` nella conferma
finale (passo successivo) e indica il comando da lanciare —
`git config merge.ours.driver true` — senza eseguirlo tu: è configurazione
locale della macchina dell'utente, non del vault.

## Se l'argomento è vuoto

Elenca i progetti disponibili leggendo **solo** i titoli e le descrizioni dagli
`index.md` di radice in `projects/*/index.md`. Non aprire altri file. Presenta:

| Slug | Progetto | Pagine | Ultimo aggiornamento |
|---|---|---|---|

Poi chiedi quale attivare e fermati.

## Se l'argomento è uno slug

1. Verifica che `projects/$ARGUMENTS/` esista. Se non esiste, dillo ed elenca gli
   slug disponibili. **Non crearlo**: per quello c'è `/nuovo-progetto`.
2. Leggi `projects/$ARGUMENTS/_meta/schema.md` per intero.
3. Leggi `projects/$ARGUMENTS/index.md`.
4. Leggi `/_meta/authors.md` — sta alla radice del vault e vale per tutti i
   progetti, quindi leggerlo non viola l'isolamento.
5. Leggi gli ultimi 5 movimenti di tutte le identità:
   ```
   grep -h "^## \[" projects/$ARGUMENTS/log/*.md | sort -r | head -5
   ```
   Il `sort -r` è obbligatorio: senza, ottieni i primi 5 di *ciascun* file invece
   dei 5 più recenti in assoluto.
6. Leggi `projects/$ARGUMENTS/_meta/glossary.md`.

## Poi conferma con questo formato, e fermati

```
Progetto attivo: <slug> — <titolo>
Identità attiva: <id> <| dedotta dall'ultimo commit, se A era vuota>    Sync: <aggiornato | N commit ricevuti | index da rigenerare>
Merge driver: <ok | non impostato — lancia `git config merge.ours.driver true`>
Novità: <— oppure: <n> pagine di contenuto da <id>, <riga della sua voce di log>>
Lingua: <…>    Tipi ammessi: <elenco dal vocabolario dello schema>
Pagine: <n>    Ultimo movimento: <data, operazione e identità dal log>
Aperto: <domande aperte e gap dall'index, se presenti>
```

Da questo momento e per tutta la sessione vale la regola di isolamento §1 del
CLAUDE.md: nessun file di altri progetti, nessun link fuori dal bundle.
L'isolamento è **metodo, non sicurezza** (§1.2): vincola te, non chi ha accesso
al repository.

Se l'utente chiede di lavorare su un progetto diverso, non fare il passaggio in
autonomia: digli di rilanciare `/progetto` e ricomincia da capo.
