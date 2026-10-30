"""Assets STAC autenticados e transporte HTTPS com destino IP fixado."""
import base64
import hashlib
import hmac
import http.client
import ipaddress
import json
import socket
import ssl
import time
from urllib.parse import urlsplit

from api.config import get_settings

MAX_ASSET_BYTES = 50 * 1024 * 1024
MAX_SECONDS = 60


def autorizar_asset(servico_id: str, origem: str, url: str) -> str:
    body = base64.urlsafe_b64encode(json.dumps(
        [servico_id, origem, url, int(time.time()) + 900], separators=(",", ":")
    ).encode()).decode()
    sig = hmac.new(get_settings().session_secret.encode(), body.encode(), hashlib.sha256).hexdigest()
    return body + "." + sig


def verificar_asset(ticket: str, servico_id: str, origem: str, url: str) -> None:
    try:
        body, sig = ticket.rsplit(".", 1)
        expected = hmac.new(get_settings().session_secret.encode(), body.encode(), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(sig, expected):
            raise ValueError()
        data = json.loads(base64.urlsafe_b64decode(body))
        if data[:3] != [servico_id, origem, url] or data[3] <= time.time():
            raise ValueError()
    except (ValueError, TypeError, IndexError):
        raise ValueError("Asset não autorizado ou pesquisa expirada. Pesquise novamente.") from None


def _destino(url: str) -> tuple[str, str, str]:
    try:
        parsed = urlsplit(url)
        if (parsed.scheme != "https" or not parsed.hostname or parsed.username is not None
                or parsed.password is not None or parsed.port not in (None, 443)
                or parsed.fragment or "%" in parsed.hostname or "\\" in url
                or any(ord(c) < 33 for c in url)):
            raise ValueError()
        host = parsed.hostname.encode("idna").decode("ascii")
        addresses = {item[4][0] for item in socket.getaddrinfo(host, 443, type=socket.SOCK_STREAM)}
        if not addresses:
            raise ValueError()
        for address in addresses:
            ip = ipaddress.ip_address(address)
            if not ip.is_global or ip.is_multicast or getattr(ip, "ipv4_mapped", None):
                raise ValueError()
        return host, sorted(addresses)[0], (parsed.path or "/") + ("?" + parsed.query if parsed.query else "")
    except (ValueError, UnicodeError, OSError):
        raise ValueError("O asset deve usar HTTPS público, sem credenciais, portas alternativas ou destinos internos.") from None


class _PinnedHTTPS(http.client.HTTPSConnection):
    def __init__(self, host: str, address: str):
        super().__init__(host, 443, timeout=10, context=ssl.create_default_context())
        self.address = address

    def connect(self):
        raw = socket.create_connection((self.address, 443), timeout=self.timeout)
        try:
            if ipaddress.ip_address(raw.getpeername()[0]) != ipaddress.ip_address(self.address):
                raise ValueError("Destino efetivo diferente do IP autorizado.")
            self.sock = self._context.wrap_socket(raw, server_hostname=self.host)
        except BaseException:
            raw.close()
            raise


def baixar_asset(url: str) -> bytes:
    host, address, path = _destino(url)
    deadline = time.monotonic() + MAX_SECONDS
    conn = _PinnedHTTPS(host, address)
    try:
        conn.request("GET", path, headers={"Accept": "image/tiff", "Accept-Encoding": "identity"})
        response = conn.getresponse()
        # Nenhum redirecionamento é seguido, nem mesmo para outro IP público.
        if response.status != 200 or response.getheader("Content-Encoding", "identity") != "identity":
            raise ValueError("Download recusado (redirecionamentos e conteúdo comprimido não são permitidos).")
        size = response.getheader("Content-Length")
        if size and (int(size) < 0 or int(size) > MAX_ASSET_BYTES):
            raise ValueError("Asset excede 50 MB. Selecione um produto menor.")
        data = bytearray()
        while True:
            if time.monotonic() > deadline:
                raise ValueError("Download excedeu 60 segundos.")
            chunk = response.read1(min(65536, MAX_ASSET_BYTES - len(data) + 1))
            if len(data) + len(chunk) > MAX_ASSET_BYTES:
                raise ValueError("Asset excede 50 MB.")
            if not chunk:
                break
            data.extend(chunk)
        if data[:4] not in (b"II*\x00", b"MM\x00*", b"II+\x00", b"MM\x00+"):
            raise ValueError("O asset não é um GeoTIFF.")
        return bytes(data)
    finally:
        conn.close()
