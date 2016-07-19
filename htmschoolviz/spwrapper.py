import os
import numpy as np
import json
import time

import redis

# storage keys
CON_SYN = "connectedSynapses"
PERMS = "permanences"
POT_POOLS = "potentialPools"
ACT_COL = "activeColumns"
OVERLAPS = "overlaps"


def compressBinarySdr(sdr):
  out = {
    "length": len(sdr)
  }
  indicesOut = []
  for i, bit in enumerate(sdr):
    if bit == 1 or bit == 1.0: indicesOut.append(i)
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
    self.redis = redis.Redis("localhost")


  def compute(self, inputArray, learn):
    sp = self._sp
    columns = np.zeros(sp._numColumns, dtype="uint32")
    sp.compute(inputArray, learn, columns)
    self._lastInput = compressBinarySdr(inputArray)
    self._lastActiveColumns = compressBinarySdr(columns)
    self._index += 1
    return self.getCurrentState()


  def getCurrentState(self, 
                      getPotentialPools=False, 
                      getConnectedSynapses=False,
                      getPermanences=False):

    currentState = dict()

    try:
      activeColumns = self.getActiveColumns()
      currentState[ACT_COL] = activeColumns
    except RuntimeError:
      activeColumns = None

    overlaps = self.getOverlaps()
    currentState[OVERLAPS] = overlaps

    if getPotentialPools:
      pools = self._calculatePotentialPools()
      currentState[POT_POOLS] = pools

    if getConnectedSynapses:
      synapses = self._calculateConnectedSynapses()
      currentState[CON_SYN] = synapses

    if getPermanences:
      perms = self._calculatePermanences()
      currentState[PERMS] = perms

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


  def saveStateToRedis(self):
    start = time.time()
    if self._lastInput is None:
      raise ValueError("Cannot save SP state because it has never seen input.")
    state = self.getCurrentState(
      getConnectedSynapses=True,
      getPermanences=True,
    )

    # Active columns and overlaps are small, and can be saved in one key for
    # each time step.
    for outType in [ACT_COL, OVERLAPS]:
      key = "{}_{}_{}".format(self._id, self._index, outType)
      payload = dict()
      payload[outType] = state[outType]
      self.redis.set(key, json.dumps(payload))

    # Connected synapses are big, and will be broken out and saved in one file
    # per column, so they can be retrieved more efficiently by column by the
    # client later.
    columnSynapses = state[CON_SYN]
    for columnIndex, connections in enumerate(columnSynapses):
      key = "{}_{}_col-{}_{}".format(self._id, self._index, columnIndex, CON_SYN)
      self.redis.set(key, json.dumps(columnSynapses[columnIndex]))

    # Permanences are also big, so same thing. 
    perms = state[PERMS]
    for columnIndex, permanences in enumerate(perms):
      key = "{}_{}_col-{}_{}".format(self._id, self._index, columnIndex, PERMS)
      self.redis.set(key, json.dumps(perms[columnIndex]))

    end = time.time()
    print("\tSP state serialization took %g seconds" % (end - start))



  def getConnectionHistoryForColumn(self, columnIndex):
    return self._getColumnHistory(columnIndex, CON_SYN)


  def getPermanenceHistoryForColumn(self, columnIndex):
    return self._getColumnHistory(columnIndex, PERMS)


  def _getColumnHistory(self, columnIndex, subject):
    searchString = "{}_*_col-{}_{}".format(self._id, columnIndex, subject)
    keys = self.redis.keys(searchString)
    columnsOut = []
    # Doing a range because the files need to be processed in the order the data
    # was processed, using the data cursor counting up from 0.
    for cursor in range(0, len(keys)):
      key = "{}_{}_col-{}_{}".format(
        self._id, cursor, columnIndex, subject
      )
      data = self.redis.get(key)
      if data is None:
        print "WARNING: Missing {} data for key: {}".format(subject, key)
        data = "[]"
      columnsOut.append(json.loads(data))
    return columnsOut


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
    if self._currentState is not None and CON_SYN in self._currentState:
      return self._currentState[CON_SYN]
    sp = self._sp
    colConnectedSynapses = []
    for colIndex in range(0, sp.getNumColumns()):
      connectedSynapses = np.zeros(shape=(sp.getInputDimensions(),))
      permIndices = []
      sp.getConnectedSynapses(colIndex, connectedSynapses)
      permIndices = np.nonzero(connectedSynapses)
      colConnectedSynapses.append(permIndices[0].tolist())
    return colConnectedSynapses


  def _calculatePermanences(self):
    if self._currentState is not None and PERMS in self._currentState:
      return self._currentState[PERMS]
    sp = self._sp
    colPerms = []
    for colIndex in range(0, sp.getNumColumns()):
      perms = np.zeros(shape=(sp.getInputDimensions(),))
      permIndices = []
      sp.getPermanence(colIndex, perms)
      colPerms.append([round(perm, 2) for perm in perms.tolist()])
    return colPerms


  def getHistory(self, cursor):
    length = len(self._history)
    if cursor > length:
      raise KeyError(
        "SP History for {} is out of range for current history with length {}."\
        .format(cursor, length)
      )
    return self._history[cursor]


