import numpy as np


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


  def __init__(self, sp):
    self._sp = sp
    self._potentialPools = None
    self._history = []
    self._lastInput = None
    self._lastActiveColumns = None


  def compute(self, inputArray, learn):
    sp = self._sp
    columns = np.zeros(sp._numColumns, dtype="uint32")
    sp.compute(inputArray, learn, columns)
    self._lastInput = compressBinarySdr(inputArray)
    self._lastActiveColumns = compressBinarySdr(columns)


  def getLastInput(self):
    return self._lastInput


  def getActiveColumns(self):
    if self._lastActiveColumns is None:
      raise RuntimeError("Cannot get active columns because SP has not run.")
    return self._lastActiveColumns


  def getOverlaps(self):
    return self._sp.getOverlaps().tolist()


  def calculatePotentialPools(self):
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


  def calculateConnectedSynapses(self):
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


  def getCurrentState(self, getPotentialPools=False, getConnectedSynapses=False):
    out = {
      "overlaps": self.getOverlaps(),
      "activeColumns": self.getActiveColumns(),
    }
    if getPotentialPools:
      out["potentialPools"] = self.calculatePotentialPools()
    if getConnectedSynapses:
      out["connectedSynapses"] = self.calculateConnectedSynapses()
    return out


  def saveStateToHistory(self):
    if self._lastInput is None:
      raise ValueError("Cannot save SP state because it has never seen input.")

    payload = self.getCurrentState()

    self._history.append(payload)


  def getHistory(self, cursor):
    length = len(self._history)
    if cursor > length:
      raise KeyError(
        "SP History for {} is out of range for current history with length {}."\
        .format(cursor, length)
      )
    return self._history[cursor]


