# U.S. Waterways Geography Quiz

A standalone Flask quiz for identifying 30 major waterways around the United States. Select a waterway on the map and type its name, or switch to locate mode and click a named waterway. Each waterway allows up to three attempts; answer capitalization is ignored.

## Run locally

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python run.py
```

Open `http://127.0.0.1:5000`.

## Deploy on Render

1. Push this repository to GitHub.
2. In Render, create or update the Blueprint connected to the repository root.
3. Deploy the `us-waterways-geography-quiz` service from the Blueprint.
4. Share its `https://...onrender.com` URL when the deploy is live.

The free Render plan can spin down when idle, so a first visit after a pause may take a little longer. The state outlines and web fonts load from public CDNs. The bundled Canada/Mexico outlines and waterway geometries are from Natural Earth, a public-domain map dataset.

## Tests

```powershell
python -m unittest discover -s tests
```