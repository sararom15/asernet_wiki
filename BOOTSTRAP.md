# Bootstrap — da template a vault

Questo file esiste solo finché il vault non è nato. **Quando hai finito,
cancellalo**: un vault vivo non ha una checklist di nascita nella sua radice.

Il template contiene la macchina — costituzione, sei comandi, moduli in bianco —
e nessun contenuto. Non contiene progetti, non contiene identità, e i due file in
`.claude-plugin/` sono segnaposto: così com'è, il plugin non si installa.

---

## 1. Crea il repository

Su GitHub, dal repo `okf-vault-template`, premi **Use this template** →
**Create a new repository**.

Scegli lo slug ora e non cambiarlo più: finisce nel nome del plugin, nel nome
della marketplace e negli URL. `kebab-case` o `snake_case`, senza date.

**Privato o pubblico è una decisione di merito, non un dettaglio.** Un vault
separato è la risposta corretta a un problema di riservatezza — CLAUDE.md §1.2 e
§9.18 — e probabilmente è il motivo per cui ne stai creando uno. Se è così,
privato, e i collaboratori si aggiungono uno a uno.

## 2. Compila i tre file segnaposto

Sono gli unici file del template che **devono** cambiare. Cercali con:

```bash
grep -rn "SLUG-VAULT\|NOME COGNOME\|UTENTE-GITHUB\|<VAULT>\|<tuo-id>" .
```

| File | Cosa scrivere |
|---|---|
| `.claude-plugin/plugin.json` | `name` (lo slug + `-wiki`), `author`, `repository` |
| `.claude-plugin/marketplace.json` | `name` (lo slug), `owner`, e il `name` del plugin, **identico** a quello sopra |
| `_meta/authors.md` | La tabella delle identità: almeno la tua, umana, con l'email con cui firmi i commit |

Nel `README.md` restano `<VAULT>` e `<UTENTE-GITHUB>`: sostituiscili, sono
istruzioni che qualcuno leggerà.

**Sull'agente in `_meta/authors.md`.** La riga `claude-ingest` con `tipo: agent`
non è cosmetica. Il controllo 14 del lint — «un agente non valida il proprio
lavoro» — è un errore bloccante che si verifica confrontando `authored_by` e
`reviewed_by` con la colonna `tipo` di quel file. Registrare l'agente come
`human` disattiva il controllo in silenzio, che è il modo peggiore in cui una
regola può smettere di valere.

**Sul nome del plugin.** Se hai già un altro vault installato, i due plugin
convivono e i comandi si distinguono per prefisso: `/vault-a-wiki:progetto` e
`/vault-b-wiki:progetto`. Funziona, ma con dodici skill installate la
disambiguazione è tua. Se lavori su un vault alla volta, disinstalla l'altro.

## 3. Clona e configura la macchina

Segui `README.md` → *Primo avvio*, punti 1–3. In sintesi, e nessuno dei tre è
saltabile:

```bash
git clone https://github.com/<UTENTE-GITHUB>/<VAULT>.git
cd <VAULT>
git config user.email "la-tua@email"      # deve stare in _meta/authors.md
git config merge.ours.driver true         # non viaggia col repository
```

Il terzo è quello che si dimentica sempre. Senza, la dichiarazione
`**/index.md merge=ours` del `.gitattributes` non ha effetto, e al primo merge
trovi marcatori di conflitto dentro un file che CLAUDE.md §7 vieta di risolvere
a mano.

## 4. Installa il plugin

`README.md` → *Primo avvio*, punto 4. Da Cowork si aggiunge la marketplace
puntando al repository su GitHub; da Claude Code si punta al percorso locale.

## 5. Verifica prima di scrivere

Apri una sessione e lancia `/lint`. Su un vault vuoto deve girare senza errori e
senza trovare niente. Se protesta sulle identità, il passo 2 non è finito.

Poi `/progetto` senza argomenti: deve dirti che non ci sono progetti. Se invece
fallisce sul `git pull`, mancano le credenziali nell'ambiente — è il punto 5 del
README, ed è opzionale: puoi sincronizzare con GitHub Desktop.

## 6. Crea il primo progetto

```
/nuovo-progetto <slug>
```

Copia il template dello schema e **ti intervista sezione per sezione**. Non
riempie le sezioni per conto suo: un campo lasciato `…` è meglio di un campo
inventato, e uno schema plausibile ma non tuo è il modo più efficace per
sabotare un vault il primo giorno.

La prima fonte si ingerisce in una sessione successiva, non in questa.

## 7. Cancella questo file

```bash
git rm BOOTSTRAP.md && git commit -m "bootstrap completato" && git push
```

---

## Cosa il template non ti dà

**Non ti dà uno schema.** `_TEMPLATES/schema.template.md` è un modulo in bianco,
e CLAUDE.md §9.6 vieta di trattarlo come configurazione attiva. La tassonomia di
un dominio si decide guardando il dominio, non copiandola da un altro — è la
stessa regola di isolamento (§1 punto 4) applicata fra vault invece che fra
bundle.

**Non ti dà un `_global/`.** È raro e opt-in: si crea quando serve davvero, e
solo su richiesta esplicita.

**Non ti dà aggiornamenti.** Le skill qui dentro sono una copia congelata al
momento del clone. Come recepire le correzioni del template è spiegato in
`README.md` → *Rapporto col template*; il riassunto è che nessuno lo fa per te.
