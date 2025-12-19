import ssl
from http.server import SimpleHTTPRequestHandler, HTTPServer
import urllib.request

TARGET = "https://notebook.bohanssen.com"

# ⚠️ SSL context die ALTIJD wordt gebruikt
ssl_context = ssl._create_unverified_context()
https_handler = urllib.request.HTTPSHandler(context=ssl_context)
opener = urllib.request.build_opener(https_handler)

class ProxyHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path.startswith("/diagram"):
            self.proxy_request()
        else:
            super().do_GET()

    def proxy_request(self):
        url = TARGET + self.path

        try:
            print(url)
            req = urllib.request.Request(url)

            with opener.open(req) as resp:
                self.send_response(resp.status)

                for key, value in resp.getheaders():
                    if key.lower() not in (
                        "content-security-policy",
                        "x-frame-options",
                        "content-encoding",
                    ):
                        self.send_header(key, value)

                self.end_headers()
                self.wfile.write(resp.read())

        except Exception as e:
            self.send_error(502, str(e))

if __name__ == "__main__":
    server = HTTPServer(("localhost", 8282), ProxyHandler)
    print("Proxy running at http://localhost:8282")
    server.serve_forever()