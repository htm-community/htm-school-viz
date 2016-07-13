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
    sp = spWrappers[spId].getSp()

    learn = True
    if "learn" in requestInput:
      learn = requestInput["learn"] == "true"

    getConnectedSynapses = False
    if "getConnectedSynapses" in requestInput:
      getConnectedSynapses = requestInput["getConnectedSynapses"] == "true"

    getPotentialPools = False
    if "getPotentialPools" in requestInput:
      getPotentialPools = requestInput["getPotentialPools"] == "true"

    activeCols = np.zeros(sp._numColumns, dtype="uint32")
    inputArray = np.array([int(bit) for bit in encoding.split(",")])

    print "Entering SP compute cycle...\n\tlearning on? {}".format(learn)

    sp.compute(inputArray, learn, activeCols)
    web.header("Content-Type", "application/json")

    # Overlaps are cheap, so always return them.
    overlaps = sp.getOverlaps()

    response = {
      "activeColumns": [int(bit) for bit in activeCols.tolist()],
      "overlaps": overlaps.tolist(),
    }

    # Connected synapses are not cheap, so only return when asked.
    if getConnectedSynapses:
      print "\tgetting connected synapses"
      colConnectedSynapses = []
      for colIndex in range(0, sp.getNumColumns()):
        connectedSynapses = []
        connectedSynapseIndices = []
        sp.getConnectedSynapses(colIndex, connectedSynapses)
        for i, synapse in enumerate(connectedSynapses):
          if np.asscalar(synapse) == 1.0:
            connectedSynapseIndices.append(i)
        colConnectedSynapses.append(connectedSynapseIndices)
      response["connectedSynapses"] = colConnectedSynapses

    # Potential pools are not cheap either.
    if getPotentialPools:
      print "\tgetting potential pools"
      colPotentialPools = []
      for colIndex in range(0, sp.getNumColumns()):
        potentialPools = []
        potentialPoolsIndices = []
        sp.getPotential(colIndex, potentialPools)
        for i, pool in enumerate(potentialPools):
          if np.asscalar(pool) == 1.0:
            potentialPoolsIndices.append(i)
        colPotentialPools.append(potentialPoolsIndices)
      response["potentialPools"] = colPotentialPools

    jsonOut = json.dumps(response)

    requestEnd = time.time()
    print("\tSP compute cycle took %g seconds" % (requestEnd - requestStart))

    return jsonOut



if __name__ == "__main__":
  app.run()
