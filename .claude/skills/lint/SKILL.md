---
name: lint
description: Health check del progetto attivo. Produce un report di anomalie (staleness, orfani, duplicati, contraddizioni, fusioni silenziose, violazioni di isolamento). Non modifica contenuto.
argument-hint: "[opzionale: nome di un singolo controllo]"
allowed-tools: Read, Glob, Grep, Edit, Bash
disable-model-invocation: true
---

# Lint del bundle

Controllo richiesto: `$ARGUMENTS` (se vuoto, esegui tutti)

## Precondizione

Serve un progetto attivo. Il lint opera su **un solo bundle**.

Serve anche l'**identità attiva** (l'`id` di `/_meta/authors.md` stabilito da
`/progetto`): il report va firmato in `log/<id>.md`. Se non la sai, chiedila.

## Limite d'uso di Bash

Bash serve **solo** al controllo 16, che legge la cronologia di Git. È concesso
per: `git log`, `git diff`, `git show`, `git merge-base`, `git rev-list`.

Nient'altro. Nessun comando che scriva: né `commit`, né `push`, né `merge`, né
`checkout`, né `reset`.

## Regola fondamentale

Il lint **non modifica contenuto**. Produce un report.
L'unica cosa che può correggere in autonomia è la rottura meccanica:
link verso file rinominati, righe di `index.md` disallineate dal frontmatter.
Mai un'affermazione, mai una `description`, mai una struttura di pagina.

Preferisci `grep` sul frontmatter all'apertura dei file: costa meno contesto ed
è sufficiente per quasi tutti i controlli.

## Controlli

1. **Isolamento** — link o `refs` che escono dal bundle (escluso `_global/`);
   file il cui `project:` non coincide con lo slug della cartella.
   `grep -rn "\.\./\.\./" .` e `grep -rn "^project:" .`
2. **Conformità OKF** — file senza frontmatter; `type` assente o non presente
   nel vocabolario dello schema; `title` diverso dall'H1 del corpo; `okf_version`
   dell'`index.md` di radice diverso dal riferimento dichiarato in `CLAUDE.md`
   §10 (drift di versione OKF).
3. **Staleness via DAG** — per ogni pagina, se una delle sue `refs` ha
   `timestamp` più recente del suo, proponi `status: stale`.
4. **Orfani** — pagine senza alcun link entrante.
5. **Link morti** — link verso file inesistenti *(correggibile se è un
   rename)*; e path dentro `refs:` o `derived_from:` che non risolvono su
   disco *(solo segnalabile: un `refs` spento non è mai un rename ovvio)*. I
   due grafi di CLAUDE.md §3.2 si verificano entrambi, non solo quello
   semantico.
   `grep -rn "^refs:\|^derived_from:" .` e verifica ogni path elencato.
6. **Duplicati interni** — `title` semanticamente equivalenti; entità presenti
   con nomi diversi da quelli canonici del `glossary.md`.
7. **Sovrapposizione fra bundle** — confronta **solo** i `title` dell'`index.md`
   attivo con quelli degli `index.md` degli altri progetti. Non aprire nessun
   altro file (§1.1). Segnala come candidati a `_global/`, senza proporre azioni.
   I falsi positivi sono attesi e accettabili.
8. **Contraddizioni** — `## Contraddizioni aperte` non chiuse da oltre 30 giorni.
9. **Gap** — concetti citati in tre o più pagine di `sources/` che non hanno
   una pagina propria.
10. **Igiene degli index** — `description` oltre 120 caratteri; righe di index
    non allineate al frontmatter; sezioni oltre 30 voci senza `index.md` proprio.
11. **Deriva stilistica** — pagine oltre il doppio della lunghezza mediana del
    progetto; scostamenti dalle sezioni obbligatorie previste dallo schema.
12. **Identità ignota** — `authored_by` o `reviewed_by` con un id non registrato
    in `/_meta/authors.md`. **Errore.**
    `grep -h "^authored_by:\|^reviewed_by:" */*.md | sort -u`
13. **Revisione senza revisore** — `status: reviewed` senza `reviewed_by`.
    **Errore**: uno stato di validazione senza un responsabile non vale nulla.
14. **Autovalidazione di un agente** — `authored_by` e `reviewed_by` coincidono e
    quell'id è di tipo `agent` in `/_meta/authors.md`. **Errore bloccante.**
    È il più importante dei tre: è la forma meccanica del principio per cui il
    contenuto prodotto da un LLM richiede validazione umana. Fra due id di tipo
    `human` la coincidenza è invece legittima, solo poco utile.
15. **Fusioni silenziose** — pagine di contenuto fuse automaticamente da due rami
    diversi. **Da valutare, sempre a lettura umana.** Vedi sotto.
16. **Controlli specifici** definiti nella §7 dello `_meta/schema.md`.

**Sui controlli 12–14.** Leggono `/_meta/authors.md`, che sta alla radice del
vault, fuori dai bundle, ed è sempre leggibile.

Non confrontare **mai** `authored_by` con le pagine di `entities/`: sono spazi di
nomi distinti (CLAUDE.md §3.1). Che `entities/marco.md` esista e che `marco` sia
un id del registro sono due fatti indipendenti, e la coincidenza del nome proprio
**non è un duplicato**. Il controllo 6 non deve segnalarla.

---

## Il controllo 15 — fusioni silenziose

Quando due identità modificano **righe diverse della stessa pagina**, Git fonde
senza dire niente. Non restano marcatori, il file sembra sano, e la pagina può
affermare due cose incompatibili scritte da due persone che non si sono lette.

È la stessa cosa che `CLAUDE.md` §5.1 vieta all'agente — risolvere una
contraddizione in autonomia — fatta dal merge testuale, che unisce righe e non
affermazioni. Nessun altro controllo la intercetta: il frontmatter è a posto, i
link risolvono, l'index è allineato.

Non lascia traccia nel file, ma la lascia nella cronologia.

### Come si trova

Prendi i commit di merge dall'ultimo lint in poi — la data sta nella voce
`## [YYYY-MM-DD] lint` in cima a `log/<id>.md`; se non c'è, usa gli ultimi 30
giorni:

```bash
git log --merges --format='%H %ad %an' --since=<data>
```

Per ciascun merge `M`, prendi i due genitori e il loro antenato comune:

```bash
git rev-list --parents -n 1 <M>              # M P1 P2
git merge-base <P1> <P2>                     # B
git diff --name-only <B> <P1>                # toccati da un lato
git diff --name-only <B> <P2>                # toccati dall'altro
```

L'intersezione dei due elenchi sono le pagine toccate da entrambi. **Escludi
`index.md` e `log/`**: i primi sono derivati e si rigenerano, i secondi sono per
identità e non si sovrappongono mai davvero.

Ciò che resta va segnalato.

### Come si presenta

Per ogni pagina: il path, le due identità coinvolte — email dell'autore cercata
in `/_meta/authors.md` — la data del merge, e la voce di log di ciascuno.

**Non aprire il file per giudicare se le due versioni siano compatibili.** Non è
un giudizio che ti spetta: valutare se due affermazioni si contraddicono è
esattamente la decisione che il vault riserva a un umano. Segnala che la pagina
è stata fusa e che nessuno l'ha riletta da allora, e fermati.

La pagina va in **Da valutare**, mai in **Corretto in automatico**. Se l'utente
poi stabilisce che le due versioni confliggono, la forma corretta non è scegliere
la migliore: è aprire `## Contraddizioni aperte` citando entrambe le fonti.

Falsi positivi attesi: una fusione fra una modifica di sostanza e una correzione
di battitura risulta identica a una fra due affermazioni incompatibili. Va bene —
l'output è una segnalazione, non un'azione.

---

## Formato del report

```
# Lint <slug> — <data>
<n> pagine · <n> anomalie (<n> bloccanti)

## Bloccanti        (isolamento, conformità)
## Da sanare        (staleness, link morti, duplicati, contraddizioni scadute)
## Da valutare      (orfani, gap, sovrapposizioni, deriva, fusioni silenziose)
## Corretto in automatico
- <solo rotture meccaniche, elencate una per riga>
```

Per ogni voce: path, descrizione in una riga, azione proposta.
Ordina per gravità, non per cartella.

Poi **fermati**. Non applicare le correzioni proposte, nemmeno quelle ovvie:
l'utente decide cosa sanare e in quale ordine.

Appendi in cima a `log/<id>.md`, dove `<id>` è l'identità che ha lanciato il
lint. Se il file non esiste, crealo con l'intestazione `# Log — <slug> · <id>`.
Non scrivere mai in `log.md` alla radice del bundle: è solo l'indice dei log.

```
## [YYYY-MM-DD] lint
- <n> bloccanti, <n> da sanare, <n> da valutare, <n> corretti
- Fusioni silenziose: <n oppure nessuna>
```

Se il lint ha corretto qualcosa, quelle correzioni sono modifiche a tutti gli
effetti: ricorda all'utente di lanciare **`/pubblica`**.
