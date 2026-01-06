# Git linter
Aplikacja webowa do dla tworzenia prawidłowych commitów

## Szybki start

### Wymagania
- Docker 20+

### Uruchomienie
```bash
git clone https://github.com/reterrr/git-linter.git
cd git-linter
docker build -t git-linter .
docker run -p 5173:5173 git-linter
