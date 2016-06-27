import random
import json

import web
import numpy as np

from nupic.research.spatial_pooler import SpatialPooler as SP

global sp

urls = (
  "/", "Index",
  "/client/(.+)", "Client",
  "/_sp/", "SPInterface",
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

class SPInterface:

  def POST(self):
    global sp
    params = json.loads(web.data())
    sp = SP(**params)
    web.header("Content-Type", "application/json")
    return json.dumps({"result": "success"})

  def PUT(self):
    input = web.data()
    activeCols = np.zeros(sp._numColumns, dtype="uint32")
    inputArray = np.array([int(bit) for bit in input.split(",")])
    sp.compute(inputArray, False, activeCols)
    web.header("Content-Type", "application/json")

    overlaps = sp.getOverlaps()

    # colConnectedSynapses = []
    # colPotentialPools = []
    # for colIndex in range(0, sp.getNumColumns()):
    #   connectedSynapses = []
    #   connectedSynapseIndices = []
    #   sp.getConnectedSynapses(colIndex, connectedSynapses)
    #   # potentialPool = []
    #   # potentialPoolIndices = []
    #   # sp.getPotential(colIndex, potentialPool)
    #   for i, synapse in enumerate(connectedSynapses):
    #     if np.asscalar(synapse) == 1.0:
    #       connectedSynapseIndices.append(i)
    #     # if np.asscalar(potentialPool[i]) == 1.0:
    #     #   potentialPoolIndices.append(i)
    #   colConnectedSynapses.append(connectedSynapseIndices)
    #   # colPotentialPools.append(potentialPoolIndices)

    response = {
      "activeColumns": [int(bit) for bit in activeCols.tolist()],
      "overlaps": overlaps.tolist(),
      # "connectedSynapses": colConnectedSynapses,
      # "potentialPool": colPotentialPools,
    }

    return json.dumps(response)


if __name__ == "__main__":
  app.run()
