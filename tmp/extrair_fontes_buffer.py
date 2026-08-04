from pathlib import Path

from pypdf import PdfReader


root = Path(__file__).resolve().parents[1] / "data" / "fundamentacao_bibliografica"
queries = {
    "terra_indigena_quilombola_portaria_interministerial_60_2015.pdf": ("10 km", "5 km", "8 km", "rodovia"),
    "cavidades_instrucao_normativa_mma_02_2017.pdf": ("250", "area de influencia", "influencia"),
    "sitio_arqueologico_instrucao_normativa_iphan_001_2015.pdf": ("area de influencia", "500", "AID"),
    "uc_zona_amortecimento_resolucao_conama_428_2010.pdf": ("3 km", "zona de amortecimento", "2015"),
}

for filename, terms in queries.items():
    reader = PdfReader(root / filename)
    print(f"\n## {filename}")
    for page_number, page in enumerate(reader.pages, start=1):
        text = page.extract_text() or ""
        normalized = text.casefold()
        if any(term.casefold() in normalized for term in terms):
            print(f"PAGE {page_number}: {text[:1800].replace(chr(10), ' ')}")