---
name: progetto
description: Sincronizza il vault, imposta il progetto attivo per questa sessione e carica il suo schema. Da eseguire come prima cosa in ogni sessione, prima di qualsiasi ingest, query o lint.
argument-hint: "[slug del progetto, oppure vuoto per l'elenco]"
allowed-tools: Read, Glob, Grep, Bash
---

# Imposta il progetto attivo

Argomento ricevuto: `$ARGUMENTS`

## Come si eseguono le operazioni git

Il vault porta con sé un **server MCP** (`tools/vault-mcp/server.js`) che espone
le operazioni git come tool con nomi propri. **Usa quelle, non Bash.**

| Tool | A cosa serve |
|---|---|
| `vault_status` | stato: branch, avanti/indietro, untracked, stash, identità, merge driver, lock |
| `vault_sync` | `git pull --ff-only`, con auto-stash guardato se il working tree è d'ostacolo |
| `vault_unlock` | mette da parte un `.git/index.lock` abbandonato, solo con conferma |
| `vault_publish` | usata da `/pubblica`, non da qui |

**Chiamale per nome corto.** Il nome pieno cambia col modo di installazione — è
`mcp__vault-asernet__vault_sync` se il server è configurato a mano, e
`mcp__plugin_asernet-vault_vault__vault_sync` se arriva col plugin. Cerca fra le
tool disponibili quella che finisce col nome corto.

Perché passare da lì e non da Bash: il server **è** l'elenco di comandi ammessi,
reso meccanico. Ciò che non è una tool non è eseguibile — `--force`, `reset`,
`checkout`, `rebase`, `stash drop` non esistono in quel processo. Un elenco
scritto in italiano lo rispetti se lo leggi bene; questo lo rispetti per
costruzione.

### Se le tool non ci sono

Possono mancare: server non installato, plugin non aggiornato, processo morto.
In quel caso **non improvvisare le scritture**. Bash ti resta concesso solo per
i comandi in **sola lettura** — `git fetch`, `git status`, `git diff`,
`git log`, `git config` in lettura — e per il `grep` sui log del passo 5.

Tutto ciò che tocca il working tree — `pull`, `stash`, `commit`, `merge`,
`push` — lo **passi all'utente da lanciare a mano**, con il comando esatto, e ti
fermi. Non usare `git pull` senza `--ff-only`, non usare `stash` fuori dalla
tool, e non usare mai `merge`, `rebase`, `reset`, `checkout`, `--force`,
`--amend`: quelli restano vietati in ogni circostanza (CLAUDE.md §9.21).

Questa skill gira all'apertura di ogni sessione: è il punto del sistema in cui un
errore costa di più.

## Passo 0 — Sincronizza (sempre, anche senza argomento)

Chiama **`vault_sync`**.

Il pull non è igiene di sincronizzazione, è una **precondizione di correttezza**.
La query legge prima gli `index.md`: su un vault non aggiornato non sai che certe
pagine esistono e produci una soglia di astensione falsa — dichiari che la wiki
non copre un argomento che invece copre. Un'astensione sbagliata è peggio di un
errore, perché sembra prudenza.

**Il pull è sempre `--ff-only`, e la tool non ti dà modo di farlo diversamente.**
Un pull normale tenterebbe un merge su pagine di contenuto senza che nessuno lo
abbia chiesto, che è ciò che questo vault vieta: il merge di Git è cieco al
significato, unisce righe e non affermazioni. **Nel vault esiste un solo punto in
cui avviene un vero merge, ed è dentro `/pubblica`**, dove qualcuno sta guardando.

Esiti di `vault_sync`:

| `result` | Cosa fai |
|---|---|
| `UP_TO_DATE` | Prosegui |
| `OK` | Prosegui, e riporta le novità al passo 0.2 leggendole dal campo `received` |
| `OK_STASH_REAPPLIED` | Prosegui. Il working tree era d'ostacolo, la guardia ha verificato che non ci fosse sovrapposizione e ha rimesso a posto le tue modifiche. Dillo in una riga |
| `OK_STASH_HELD` | **Il vault è aggiornato ma il tuo lavoro è in uno stash.** Vedi sotto |
| `AHEAD` | Hai commit non spinti: lavoro di un'operazione precedente mai pubblicato. Manda l'utente a **`/pubblica`** e **fermati** |
| `DIVERGED` | Cronologia divergente. Manda a `/pubblica`, che ha la verifica L ∩ R, e **fermati** |
| `STASH_POP_FAILED` | Il vault è aggiornato, lo stash è intatto. Riportalo e **fermati** |
| `FAILED` | Riporta `stderr` e **fermati**. Se c'è il campo `cause: INDEX_LOCK`, vedi il passo 0.0 |

### Passo 0.0 — Lock abbandonato

Se un esito porta `cause: INDEX_LOCK`, un `.git/index.lock` sta bloccando ogni
scrittura sull'indice. Succede quando un processo git muore a metà.

Non chiamare `vault_unlock` di iniziativa. **Chiedi prima all'utente se ha
un'operazione git in corso** — GitHub Desktop, un altro terminale, un client
grafico — perché in quel caso il lock è legittimo e toglierlo corrompe l'indice.
Solo se la risposta è no, chiama `vault_unlock` con `confirm: true`.

La tool rifiuta comunque i lock più giovani di 60 secondi, e non cancella: sposta.

### `OK_STASH_HELD` — la guardia si è attivata

Significa che le modifiche che avevi sul disco toccano pagine di contenuto che il
pull ha appena cambiato, e riapplicarle sarebbe una fusione automatica senza
nessuno che guardi. La tool non l'ha fatta.

Riporta all'utente il campo `guard.files`, che per ogni file dice:

- `IDENTICO` — la copia locale è un duplicato esatto di ciò che è arrivato.
  Scartarla non perde niente, ma **è l'utente a decidere**: lo `stash drop` non
  esiste fra le tool, perché uno stash scartato non è recuperabile.
- `DIVERSO` — c'è contenuto locale che il remoto non ha. Le opzioni sono quelle
  di §5.5 del CLAUDE.md: rifare il dry run, integrare a mano, registrare una
  contraddizione. Non esiste «tieni la mia».

Puoi proseguire col caricamento dello schema — il vault *è* aggiornato — ma dillo
in modo visibile nella conferma finale: c'è lavoro parcheggiato che nessuno vede.

## Passo 0.1 — Stabilisci l'identità attiva

Serve a sapere in quale `log/<id>.md` scriveranno `/ingest` e `/lint` più avanti
nella sessione. `vault_status` te la dà già in due campi:

- `identity_config` — chi firmerà il prossimo commit (`git config user.email`)
- `identity_last_commit` — chi ha firmato l'ultimo

Cerca l'email in `/_meta/authors.md` e ricava l'`id` corrispondente.

| `identity_config` | `identity_last_commit` | Cosa fai |
|---|---|---|
| presente | — | Usa la prima. È l'identità che firmerà ciò che scrivi in questa sessione |
| **null** | presente e nel registro | Usa la seconda, e **dichiaralo nella conferma finale**: «identità dedotta dall'ultimo commit» |
| null | null o assente dal registro | **Chiedi all'utente chi sta lavorando** |
| presente | presente ma **diversa** | Riporta entrambe e **dillo**, senza fermarti: in un vault a più mani è la norma, non un errore. `/pubblica` firmerà con la prima |

**`identity_config` null non significa che l'identità non sia configurata.**
Quando il server gira nella sandbox di un agente, quel processo può avere un
`HOME` proprio e non vedere il `.gitconfig` globale della macchina — è ciò che
succede quando l'identità è stata impostata da GitHub Desktop o da un altro
client grafico. Il server MCP locale invece gira con l'ambiente dell'utente e di
norma la vede.

**Perché il secondo campo è evidenza e non un indovinello.** L'email dell'ultimo
commit è la configurazione che il repository ha *effettivamente usato* per
firmare: è un fatto registrato, non una somiglianza. Restano vietate le deduzioni
che il divieto originale colpiva: **non dedurre un id dal nome della cartella,
dal contenuto delle pagine, dal nome dell'account sul sistema o da una
somiglianza fra nomi propri.** Un id sbagliato firma un'operazione a nome di
qualcun altro.

Su un repository senza commit (bundle appena creato) il secondo campo è null per
costruzione: si ricade nel terzo caso, e si chiede.

## Passo 0.2 — Cosa è cambiato da quando eri qui

Solo se `vault_sync` ha portato qualcosa. Il campo `received` è già separato per
te:

- `received.content_pages` — le **pagine di contenuto**, l'unica cosa che dice
  qualcosa sul merito;
- `received.index_and_log` — `index.md` e file di `log/`, che cambiano a ogni
  operazione e non dicono niente;
- `received.commits` — chi ha pubblicato, quando, con che messaggio.

Per ogni identità che ha pubblicato, leggi la voce in cima al suo log e riportala
in una riga. Il log dice *cosa credeva di fare*, che è l'informazione utile;
l'elenco dei file da solo non lo è.

Questo passo esiste perché `/chiedi` non ha una fase in cui rifare il lavoro:
chi apre una sessione solo per interrogare la wiki non passerà mai dal controllo
di risincronizzazione di `/ingest`, e deve sapere qui che il terreno si è mosso.

Se `vault_sync` riporta `note_lint`, segnalalo: sono arrivati degli `index.md` e
potrebbe servire `/lint` per rigenerarli.

## Passo 0.3 — Verifica il merge driver locale

`vault_status` riporta `merge_ours_driver`. Se non è `ok`, il driver
`merge=ours` su `**/index.md` (`.gitattributes`, CLAUDE.md §7) non ha effetto su
questa macchina: al primo vero merge — dentro `/pubblica` — un `index.md` in
conflitto produrrebbe marcatori invece di essere risolto in automatico.

Non è bloccante per questa sessione: annota l'esito in `Sync:` nella conferma
finale e indica il comando da lanciare — `git config merge.ours.driver true` —
senza eseguirlo tu. È configurazione della macchina dell'utente, non del vault,
e per questo non esiste una tool che la imposti.

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
Identità attiva: <id> <| dedotta dall'ultimo commit, se identity_config era null>    Sync: <esito di vault_sync>
Merge driver: <ok | non impostato — lancia `git config merge.ours.driver true`>
Novità: <— oppure: <n> pagine di contenuto da <id>, <riga della sua voce di log>>
Parcheggiato: <— oppure: <n> file in stash, la guardia non li ha riapplicati>
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
