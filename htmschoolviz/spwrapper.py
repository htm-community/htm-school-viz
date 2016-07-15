import os
import numpy as np
import json
import time

# storage keys
CON_SYN = "connectedSynapses"
POT_POOLS = "potentialPools"
ACT_COL = "activeColumns"
OVERLAPS = "overlaps"


def compressBinarySdr(sdr):
  out = {
    "length": len(sdr)
  }
  indicesOut = []
  for i, bit in enumerate(sdr):
    if bit == 1: indicesOut.append(i)
  out["indices"] = indicesOut
  return out


class SpWrapper:


  def __init__(self, id, sp):
    self._id = id
    self._sp = sp
    self._potentialPools = None
    self._lastInput = None
    self._lastActiveColumns = None
    self._index = -1
    self._currentState = None


  def compute(self, inputArray, learn):
    sp = self._sp
    columns = np.zeros(sp._numColumns, dtype="uint32")
    sp.compute(inputArray, learn, columns)
    self._lastInput = compressBinarySdr(inputArray)
    self._lastActiveColumns = compressBinarySdr(columns)
    self._index += 1
    return self.getCurrentState()


  def getCurrentState(self, getPotentialPools=False, getConnectedSynapses=False):
    overlaps = self.getOverlaps()
    activeColumns = self.getActiveColumns()
    currentState = dict()
    currentState[OVERLAPS] = overlaps
    currentState[ACT_COL] = activeColumns
    if getPotentialPools:
      pools = self._calculatePotentialPools()
      currentState[POT_POOLS] = pools
    if getConnectedSynapses:
      synapses = self._calculateConnectedSynapses()
      currentState[CON_SYN] = synapses
    self._currentState = currentState
    return currentState


  def getLastInput(self):
    return self._lastInput


  def getActiveColumns(self):
    if self._lastActiveColumns is None:
      raise RuntimeError("Cannot get active columns because SP has not run.")
    return self._lastActiveColumns


  def getOverlaps(self):
    return self._sp.getOverlaps().tolist()


  def saveStateToHistory(self):
    if self._lastInput is None:
      raise ValueError("Cannot save SP state because it has never seen input.")
    start = time.time()
    state = self.getCurrentState(
      getConnectedSynapses=True,
    )
    dirName = 'sp_' + self._id
    dirPath = os.path.join(
      os.path.dirname(os.path.realpath(__file__)), 'cache', dirName
    )
    if not os.path.exists(dirPath):
      os.makedirs(dirPath)

    # Active columns and overlaps are small, and can be saved in one file for
    # each time step.
    for outType in [ACT_COL, OVERLAPS]:
      fileName = "{}_{}".format(self._index, outType)
      filePath = os.path.join(dirPath, "{}.json".format(fileName))
      with open(filePath, "wb") as fileOut:
        payload = dict()
        payload[outType] = state[outType]
        fileOut.write(json.dumps(payload))

    # Connected synapses are big, and will be broken out and saved in one file
    # per column, so they can be retrieved more efficiently by column by the
    # client later.
    columnSynapses = state[CON_SYN]
    for columnIndex, connections in enumerate(columnSynapses):
      fileName = "{}_col-{}_{}".format(self._index, columnIndex, CON_SYN)
      filePath = os.path.join(dirPath, "{}.json".format(fileName))
      with open(filePath, "wb") as fileOut:
        payload = dict()
        payload[CON_SYN] = columnSynapses[columnIndex]
        fileOut.write(json.dumps(payload))

    end = time.time()
    print("\tSP state serialization took %g seconds" % (end - start))




  def _calculatePotentialPools(self):
    if self._potentialPools is None:
      sp = self._sp
      self._potentialPools = []
      for colIndex in range(0, sp.getNumColumns()):
        potentialPools = []
        potentialPoolsIndices = []
        sp.getPotential(colIndex, potentialPools)
        for i, pool in enumerate(potentialPools):
          if np.asscalar(pool) == 1.0:
            potentialPoolsIndices.append(i)
        self._potentialPools.append(potentialPoolsIndices)
    return self._potentialPools


  def _calculateConnectedSynapses(self):
    if CON_SYN in self._currentState:
      return self._currentState[CON_SYN]
    sp = self._sp
    colConnectedSynapses = []
    for colIndex in range(0, sp.getNumColumns()):
      connectedSynapses = []
      connectedSynapseIndices = []
      sp.getConnectedSynapses(colIndex, connectedSynapses)
      for i, synapse in enumerate(connectedSynapses):
        if np.asscalar(synapse) == 1.0:
          connectedSynapseIndices.append(i)
      colConnectedSynapses.append(connectedSynapseIndices)
    return colConnectedSynapses


  def getHistory(self, cursor):
    length = len(self._history)
    if cursor > length:
      raise KeyError(
        "SP History for {} is out of range for current history with length {}."\
        .format(cursor, length)
      )
    return self._history[cursor]


