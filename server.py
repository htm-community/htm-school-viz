import time
import json
import uuid

import web
import numpy as np

from nupic.research.spatial_pooler import SpatialPooler as SP

from htmschoolviz import SpWrapper

global spWrappers
spWrappers = {}

urls = (
  "/", "Index",
  "/client/(.+)", "Client",
  "/_sp/", "SPInterface",
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



class SPInterface:


  def POST(self):
    global spWrappers

    params = json.loads(web.data())
    sp = SP(**params)
    spId = str(uuid.uuid4()).split('-')[0]
    wrapper = SpWrapper(sp)
    spWrappers[spId] = wrapper
    web.header("Content-Type", "application/json")
    return json.dumps({"id": spId})


  def PUT(self):
    requestStart = time.time()
    requestInput = web.input()
    encoding = web.data()

    if "id" not in requestInput:
      print "Request must include a spatial pooler id."
      return web.badrequest()

    spId = requestInput["id"]
    sp = spWrappers[spId]

    learn = True
    if "learn" in requestInput:
      learn = requestInput["learn"] == "true"

    inputArray = np.array([int(bit) for bit in encoding.split(",")])

    print "Entering SP compute cycle...\n\tlearning on? {}".format(learn)

    sp.compute(inputArray, learn)

    web.header("Content-Type", "application/json")

    response = sp.getCurrentState(
      getConnectedSynapses=requestInput["getConnectedSynapses"] == "true",
      getPotentialPools=requestInput["getPotentialPools"] == "true"
    )

    jsonOut = json.dumps(response)
    requestEnd = time.time()
    print("\tSP compute cycle took %g seconds" % (requestEnd - requestStart))
    return jsonOut



if __name__ == "__main__":
  app.run()
