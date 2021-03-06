'use strict'

import { web3 } from '../env'
import { assert } from 'chai'
import { EventStore } from './EventStore'
import { Persistence } from './Persistence'
import { ReadModel } from './ReadModel'
import {
  initialProjectState,
  projectReducer
} from './Mocks/reducer'
import {
  transmuteTestEvent,
  transmuteTestEventStream,
  expectedProjectState
} from './Mocks/data'

let es, startEventCount, maybeUpdatedReadModel, initialTestProjectState, expectedTestProjectState

describe('EventStore', () => {

  before(async () => {
    es = await EventStore.ES.deployed()
    startEventCount = (await es.eventCount()).toNumber()
    initialTestProjectState = Object.assign(initialProjectState, {
      ReadModelStoreKey: 'ProjectSummary' + '@' + es.address,
      ReadModelType: 'ProjectSummary',
      ContractAddress: es.address
    })
    expectedTestProjectState = Object.assign(expectedProjectState, {
      ReadModelStoreKey: 'ProjectSummary' + '@' + es.address,
      ReadModelType: 'ProjectSummary',
      ContractAddress: es.address
    })
  })

  describe('.writeEvent', () => {
    it('should return the event at the index', async () => {
      let transmuteEvents = await EventStore.writeEvent(es, transmuteTestEvent, web3.eth.accounts[0])
      assert.equal(transmuteEvents.length, 1)
      assert.equal(transmuteEvents[0].Type, transmuteTestEvent.Type)
      assert.equal(transmuteEvents[0].AddressValue, transmuteTestEvent.AddressValue)
      assert.equal(transmuteEvents[0].UIntValue, transmuteTestEvent.UIntValue)
      assert.equal(transmuteEvents[0].StringValue, transmuteTestEvent.StringValue)
    })
  })

  describe('.readEvent', () => {
    it('should return the event at the index', async () => {
      let transmuteEvent = await EventStore.readEvent(es, 0)
      assert.equal(transmuteEvent.Type, transmuteTestEvent.Type)
      assert.equal(transmuteEvent.AddressValue, transmuteTestEvent.AddressValue)
      assert.equal(transmuteEvent.UIntValue, transmuteTestEvent.UIntValue)
      assert.equal(transmuteEvent.StringValue, transmuteTestEvent.StringValue)
    })
  })

  describe('.writeEvents', () => {
    it('should return the events written to the event store', async () => {
      let transmuteEvents = await EventStore.writeEvents(es, transmuteTestEventStream, web3.eth.accounts[0])
      assert.equal(transmuteEvents.length, 3)
    })
  })

  describe('.readEvents', () => {
    it('should return the events in the contract starting with the index', async () => {
      let transmuteEvents = await EventStore.readEvents(es, startEventCount)
      assert.equal(transmuteEvents.length, 4)
    })
  })

  describe('.setItem', () => {
    it('should return the value when passed a valid key, after saving the value', async () => {
      Persistence.setItem(initialTestProjectState.ReadModelStoreKey, initialTestProjectState)
        .then((readModel) => {
          assert.equal(initialTestProjectState.ReadModelStoreKey, readModel.ReadModelStoreKey)
          assert.equal(initialTestProjectState.Name, readModel.Name)
        })
    })
  })

  describe('.getItem', () => {
    it('should return null for invalid key', async () => {
      Persistence.getItem('not-a-real-key')
        .then((readModel) => {
          assert.isNull(readModel)
        })
    })

    it('should return a readModel when passed valid readModelKey', async () => {
      Persistence.getItem(initialTestProjectState.ReadModelStoreKey)
        .then((readModel) => {
          assert.equal(initialTestProjectState.ReadModelStoreKey, readModel.ReadModelStoreKey)
          assert.equal(initialTestProjectState.Name, readModel.Name)
        })
    })
  })

  describe('.readModelGenerator', () => {
    it('should return the the initial reducer state when no events exist', async () => {
      let projectModel = ReadModel.readModelGenerator(initialTestProjectState, projectReducer, [])
      assert.equal(projectModel.ReadModelStoreKey, initialTestProjectState.ReadModelStoreKey)
      assert.equal(projectModel.EventCount, initialTestProjectState.EventCount)
      assert.equal(projectModel.Users, initialTestProjectState.Users)
      assert.equal(projectModel.Milestones, initialTestProjectState.Milestones)
    })

    it('should return the updated read model when passed events', async () => {
      let projectHistory = await EventStore.readEvents(es, startEventCount)
      let projectModel = ReadModel.readModelGenerator(initialTestProjectState, projectReducer, projectHistory)
      assert.equal(projectModel.ReadModelStoreKey, expectedTestProjectState.ReadModelStoreKey)
      assert.equal(projectModel.Name, expectedTestProjectState.Name)
      assert.isArray(projectModel.Users, expectedTestProjectState.Users)
      assert.isArray(projectModel.Milestones, expectedTestProjectState.Milestones)
    })
  })

  describe('maybeSyncReadModel', () => {
    it('should retrieve a read model and sync any missing events from the contract', async () => {
      let _maybeUpdatedReadModel = await ReadModel.maybeSyncReadModel(es, initialTestProjectState, projectReducer)
      maybeUpdatedReadModel = _maybeUpdatedReadModel
    })

    it('should return quickly if no new events exist', async () => {
      let sameReadModel = await ReadModel.maybeSyncReadModel(es, maybeUpdatedReadModel, projectReducer)
      assert.equal(sameReadModel.Name, maybeUpdatedReadModel.Name)
      assert.equal(sameReadModel.EventCount, maybeUpdatedReadModel.EventCount)
    })
  })
})
