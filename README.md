# Sistema Disciplinar (EECM)

Dashboard para gestão disciplinar escolar: alunos, medidas, relatórios e análises.

## Como rodar
1. Abra `index.html` em um navegador.
2. Configure seu Firebase em `assets/js/firebase-config.js` (substitua pelas suas chaves).
3. **Importante**: configure regras do Firestore exigindo autenticação.

## Publicação (GitHub Pages)
- Vá em *Settings → Pages → Source*: "Deploy from a branch".
- Branch `main`, pasta `/root` (se `index.html` estiver na raiz).
- Acesse a URL gerada para testar.

## Estrutura
- `assets/css` – estilos
- `assets/js` – scripts
- `assets/img` – imagens
- `pages/` – páginas internas
- `components/` – header/sidebar/footer (opcional)

## Segurança (Firestore)
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## Licença
MIT (adicione um arquivo `LICENSE` se desejar).
