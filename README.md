# Dashboard

Dashoard for loading webpages and tracking plannig.

## Opmaakoverzicht

De pagina is in logische blokken opgebouwd:

- **Header:** datum- en weekindicatie bovenaan de pagina.
- **Zoek- en filterbalk:** een zoekveld met import/export-knoppen, gevolgd door snelle tijdsfilters, een projectfilter en een QUICK.CAPTURE-balk voor snelle links/taken.
- **Invoerkaarten:** aparte formulieren voor nieuwe links en taken, inclusief project- en prioriteitsvelden, plus een compacte FOCUS.TIMER en een NOTES.PAD onder de tasklist.
- **Workspace:** drie hoofdpanelen — links per categorie, de tasklist (open/gedaan) met notes en daaronder de Gantt-planning met legend.
- **Terminal en footer:** een commandoregel onderaan, plus statusinformatie in de footer.

## Publiceren naar GitHub

Deze repo staat lokaal al onder versiebeheer, maar er is nog geen verwijzing
naar jouw GitHub‑project. Voeg die toe in de hoofdmap van de repo
(`/workspace/Dashboard`) met:

```bash
git remote add origin https://github.com/<jouw-account>/<repo>.git
```

Daarna kun je de huidige branch naar GitHub sturen:

```bash
git push -u origin work
```

Gebruik dezelfde map als hierboven wanneer je de commando's uitvoert; dan
weet Git automatisch over welke repository het gaat en plaatst het de juiste
remote-configuratie.
