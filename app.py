"""Servidor do jogo (somente biblioteca padrão do Python, sem instalar nada).

Uso:  python app.py   ->  abra http://localhost:8000
"""
import json
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

PASTA = Path(__file__).parent
ESTATICOS = PASTA / "static"
ARQUIVO_PERSONAGEM = PASTA / "dados" / "personagem.json"
PADRAO = {"aba": 0, "genero": 0, "cabelo": None, "corCabelo": None, "acess": None, "top": 1, "bottom": 0,
          "sapato": 0, "corTop": None, "corBottom": None, "pele": None, "rosto": 0}


def ler_personagem():
    try:
        return json.loads(ARQUIVO_PERSONAGEM.read_text(encoding="utf-8"))
    except (FileNotFoundError, json.JSONDecodeError):
        return dict(PADRAO)


def salvar_personagem(dados):
    limpo = {}
    for chave, padrao in PADRAO.items():
        valor = dados.get(chave, padrao)
        limpo[chave] = None if valor is None else int(valor)
    ARQUIVO_PERSONAGEM.parent.mkdir(exist_ok=True)
    ARQUIVO_PERSONAGEM.write_text(json.dumps(limpo, ensure_ascii=False, indent=2), encoding="utf-8")
    return limpo


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ESTATICOS), **kwargs)

    def _json(self, dados, status=200):
        corpo = json.dumps(dados).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(corpo)))
        self.end_headers()
        self.wfile.write(corpo)

    def do_GET(self):
        if self.path == "/api/personagem":
            return self._json(ler_personagem())
        return super().do_GET()

    def do_POST(self):
        if self.path != "/api/personagem":
            return self._json({"erro": "rota não encontrada"}, 404)
        try:
            tamanho = int(self.headers.get("Content-Length", 0))
            dados = json.loads(self.rfile.read(tamanho))
            return self._json(salvar_personagem(dados))
        except (ValueError, TypeError, json.JSONDecodeError):
            return self._json({"erro": "dados inválidos"}, 400)


if __name__ == "__main__":
    servidor = ThreadingHTTPServer(("0.0.0.0", 8000), Handler)
    print("Jogo rodando em http://localhost:8000  (Ctrl+C para parar)")
    try:
        servidor.serve_forever()
    except KeyboardInterrupt:
        print("\nServidor encerrado.")
