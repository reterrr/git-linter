# Git Linter

Narzędzie front-endowe do walidacji konfiguracji repozytoriów Git w przeglądarce.

---

## Szybki start

### Wymagania

- Docker 20+

### Uruchomienie

```bash
git clone https://github.com/reterrr/git-linter. git
cd git-linter
docker build -t git-linter .
docker run -p 5173:5173 git-linter
```

Aplikacja dostępna na `http://localhost:5173`.

---

## Komendy Docker

| Komenda | Opis |
|---------|------|
| `docker build -t git-linter .` | Buduje obraz |
| `docker run -p 5173:5173 git-linter` | Uruchamia kontener |
| `docker run -d -p 5173:5173 git-linter` | Uruchamia w tle |
| `docker stop $(docker ps -q --filter ancestor=git-linter)` | Zatrzymuje kontener |
