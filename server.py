import web
import requests

NUPIC_SERVER = "http://localhost:8000"
urls = (
  "/", "Index",
  "/client/(.+)", "Client",
  "/_proxy/(.+)", "Proxy",
)
app = web.application(urls, globals())
render = web.template.render("tmpl/")


def templateNameToTitle(name):
  if name == "index": return ""
  title = name
  if "-" in title:
    title = title.replace("-", " ")
  return title.title()



class Index:


  def GET(self):
    with open("html/index.html", "r") as indexFile:
      return render.layout(
        "index",
        "HTM School Visualizations",
        indexFile.read()
      )



class Client:


  def GET(self, file):
    name = file.split(".")[0]
    path = "html/{}".format(file)
    with open(path, "r") as htmlFile:
      return render.layout(
        name,
        templateNameToTitle(name),
        htmlFile.read()
      )


class Proxy:


  def GET(self, _):
    return self._proxy()


  def POST(self, _):
    return self._proxy()


  def PUT(self, _):
    return self._proxy()


  def _proxy(self):
    path = web.ctx.fullpath
    destinationUrl = path.replace("/_proxy", NUPIC_SERVER)
    method = web.ctx.method
    data = web.data()
    response = requests.request(method, destinationUrl, data=data)
    return response.text



if __name__ == "__main__":
  app.run()
