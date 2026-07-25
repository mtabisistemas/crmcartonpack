# Microserviço em Python — Raspador B2B do Google Maps

Este microserviço em Python (FastAPI + Playwright) raspa resultados em tempo real do **Google Maps** sem necessidade de chave paga ou cartão de crédito no Google Cloud Platform.

---

## 🚀 Como Publicar Gratuito no Render.com (1 Clique)

1. Acesse o site do **[Render.com](https://render.com/)** e faça login com sua conta do GitHub.
2. Clique em **`New +`** ➔ escolha **`Web Service`**.
3. Conecte este repositório do GitHub.
4. Preencha as configurações:
   - **Name:** `cartonpack-google-scraper`
   - **Environment:** `Docker`
   - **Region:** `Oregon (US West)` ou qualquer uma
   - **Instance Type:** `Free` ($0/mês)
5. Clique em **`Create Web Service`**.

Em cerca de 2 minutos, o Render vai gerar a sua URL pública gratuita, por exemplo:
`https://cartonpack-google-scraper.onrender.com`

---

## 🔗 Como Conectar ao CRM Carton Pack

Adicione a URL gerada nas variáveis de ambiente do seu projeto no **Vercel**:

```env
GOOGLE_MAPS_SCRAPER_URL="https://cartonpack-google-scraper.onrender.com/search"
```

---

## 🧪 Testando Localmente

Para testar no seu computador:

```bash
cd microservice-google-maps-scraper
pip install -r requirements.txt
playwright install chromium
python main.py
```

Acesse no navegador:
`http://localhost:8000/search?q=siderurgica+cachoeirinha+rs`
