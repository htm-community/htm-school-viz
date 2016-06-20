import web

urls = (
  "/", "Index",
  "/client/(.+)", "Client",
)
app = web.application(urls, globals())
render = web.template.render('tmpl/')


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
    print file
    name = file.split(".")[0]
    path = "html/{}".format(file)
    with open(path, "r") as htmlFile:
      return render.layout(
        name,
        templateNameToTitle(name),
        htmlFile.read()
      )


if __name__ == "__main__":
  app.run()
