# Registro identità

Registro delle identità che scrivono in questo vault. Vive alla radice, non
dentro i progetti: le persone attraversano i progetti, gli schemi no.

L'`id` è in kebab-case ed è **stabile**: cambiano nome ed email, non l'id.
È l'id che compare in `authored_by`, in `reviewed_by` e nel nome dei file di
`log/`.

## Identità

> **Da compilare alla nascita del vault.** Finché questa tabella è vuota, ogni
> `authored_by` è un errore di lint (§5.3 punto 12) e `/ingest` non sa in quale
> `log/<id>.md` scrivere. Registra almeno la tua identità umana e l'agente.
>
> L'`id` dell'agente non è cosmetico: serve a rendere il controllo 14 del lint
> — «un agente non valida il proprio lavoro» — verificabile da un `grep`.
> Un agente registrato come `human` disattiva silenziosamente quel controllo.

| id | tipo | nome | email git |
|---|---|---|---|
| `<tuo-id>` | human | Nome Cognome | tu@example.com |
| `claude-ingest` | agent | Claude — operazioni di `/ingest` sul vault | — |

## Regola di disambiguazione

- **`authored_by`** = chi ha prodotto il testo. Se l'ha scritto un LLM è
  l'agente, anche se un umano ha approvato.
- **File di log** (`log/<id>.md`) = chi ha eseguito e approvato l'operazione,
  quindi l'umano. Un agente ha un log proprio solo quando gira in autonomia con
  credenziali sue.

Il log risponde a *chi ha deciso*, il frontmatter a *chi ha scritto*. Sono
domande diverse.

## Separazione dai contenuti dei bundle

Questo registro e le pagine `Entity` dei progetti sono **due spazi di nomi
distinti**, anche quando contengono lo stesso nome proprio.

- Un `id` qui dentro identifica **chi scrive nel vault**. Vale a livello di
  vault, attraversa i progetti, e compare solo in `authored_by`, `reviewed_by` e
  nei nomi dei file di `log/`.
- Una pagina in `entities/` identifica **un soggetto documentato da una fonte**.
  Vale dentro un solo bundle, ha `derived_from` e `refs`, e dice ciò che le
  fonti affermano di quella persona.

Che una persona scriva nel vault e che esista `entities/quella-persona.md` sono
due fatti indipendenti. Il secondo resta vero anche se quella persona smette di
avere accesso al repository; il primo resta vero anche in un progetto dove
quella persona non è mai citata da nessuna fonte.

Conseguenze operative:

1. **Non creare link fra i due.** Una pagina `Entity` non linka `_meta/`, e
   questo registro non linka nessun bundle. Sarebbe per giunta un link che esce
   dal bundle, vietato dal `CLAUDE.md` §1.
2. **Non unificarli e non deduplicarli.** La coincidenza di nome non è un
   duplicato: il controllo 6 del lint (`duplicati interni`) opera *dentro* un
   bundle e non deve mai confrontare `entities/` con questo file.
3. **Non dedurre l'uno dall'altro.** Che una persona compaia in `entities/` non
   le dà un `id` qui; che abbia un `id` qui non giustifica una pagina in
   `entities/`, che nasce solo da una fonte.

## Storico

| Data | Modifica |
|---|---|
| AAAA-MM-GG | Creazione del vault da template. |
