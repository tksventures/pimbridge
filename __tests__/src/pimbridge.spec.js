import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import Pimbridge from '../../src/pimbridge';

let mock;
let pimcore;
let response;

let callCounter = 0;

function returnData(config, data = { id: 'something', type: 'folder' }, directReturn = false) {
  const rType = config.method.toUpperCase();
  let returnObject;

  if (directReturn) {
    returnObject = data;
  } else {
    returnObject = {
      data,
      request: config,
      success: true,
      msg: `${rType} request was made`,
    };
  }
  callCounter += 1;

  return ([200, returnObject]);
}

function callbackFunction(pimcoreRes) {
  return ({ callbackMade: true, response: pimcoreRes });
}

const copyReturnData = {
  path: '/products/categories/',
  childs: [{
    id: 97,
    type: 'object',
  }, {
    id: 69,
    type: 'object',
  }],
  elements: [],
  className: 'ProductCategory',
  id: 45,
  parentId: 987,
  key: 'products',
  type: 'object',
};

describe('Pimbridge', () => {
  beforeEach(() => {
    // We set mock env variables for the module
    response = '';
    // We create our pimcore adapter
    process.env.PIMCORE_URL = 'https://fake-pimcore.org';
    process.env.PIMCORE_API_KEY = 'fakekey';
    pimcore = Pimbridge();
    mock = new MockAdapter(axios);

    mock.onAny().reply(config => returnData(config));
    callCounter = 0;
  });

  describe('pimURL', () => {
    it('should return a url for Pimcore from env variables and params entered', () => {
      response = pimcore.pimURL('object/id/1281');
      expect(response).toBe('https://fake-pimcore.org/webservice/rest/object/id/1281?apikey=fakekey');

      process.env.PIMCORE_API_KEY = 'newFakeKey';
      response = pimcore.pimURL('object/id/1281');
      expect(response).toBe('https://fake-pimcore.org/webservice/rest/object/id/1281?apikey=newFakeKey');
    });

    it('should return url with values given as params when calling the data bridge', () => {
      pimcore = Pimbridge({
        url: 'https://fake-pimcore-2.org',
        apikey: 'personalKey',
      });

      response = pimcore.pimURL('object/id/1281');
      expect(response).toBe('https://fake-pimcore-2.org/webservice/rest/object/id/1281?apikey=personalKey');
    });

    it('should allow for different api key to be declared in method', () => {
      response = pimcore.pimURL('object/id/1281', { apikey: 'alternateApiKey' });
      expect(response).toBe('https://fake-pimcore.org/webservice/rest/object/id/1281?apikey=alternateApiKey');

      response = pimcore.pimURL('object/id/1281', { apikey: 'alternateApiKey2' });
      expect(response).toBe('https://fake-pimcore.org/webservice/rest/object/id/1281?apikey=alternateApiKey2');
    });
  });

  describe('getUser', () => {
    it('should make request to proper Pimcore api endpoint', async () => {
      response = await pimcore.getUser();
      expect(response.request.url).toBe('https://fake-pimcore.org/webservice/rest/user?apikey=fakekey');
    });

    it('should use given api key if provided when making request', async () => {
      response = await pimcore.getUser('alternativeKey');
      expect(response.request.url).toBe('https://fake-pimcore.org/webservice/rest/user?apikey=alternativeKey');
    });

    it('should return callback function response if provided as parameter', async () => {
      response = await pimcore.getUser('alternativeKey', callbackFunction);
      expect(response.callbackMade).toBe(true);
      expect(response.response.request.url).toBe('https://fake-pimcore.org/webservice/rest/user?apikey=alternativeKey');
    });
  });

  describe('serverInfo', () => {
    it('should make request to proper Pimcore api endpoint', async () => {
      response = await pimcore.serverInfo();
      expect(response.request.url).toBe('https://fake-pimcore.org/webservice/rest/server-info?apikey=fakekey');
    });

    it('should return callback function response if provided as parameter', async () => {
      response = await pimcore.serverInfo(callbackFunction);
      expect(response.callbackMade).toBe(true);
      expect(response.response.request.url).toBe('https://fake-pimcore.org/webservice/rest/server-info?apikey=fakekey');
    });
  });

  describe('get', () => {
    it('should make a get request to pimcore server', async () => {
      response = await pimcore.get('classificationstore-definition');
      expect(response.request.url).toBe('https://fake-pimcore.org/webservice/rest/classificationstore-definition?apikey=fakekey');
      expect(response.request.method).toBe('get');
    });

    it('should make a get request to Pimcore based on resource', async () => {
      response = await pimcore.get('field-collections');
      expect(response.request.url).toBe('https://fake-pimcore.org/webservice/rest/field-collections?apikey=fakekey');

      response = await pimcore.get('object-bricks');
      expect(response.request.url).toBe('https://fake-pimcore.org/webservice/rest/object-bricks?apikey=fakekey');
    });

    it('should make a request for resource based on id if provided as a param and resource is singular', async () => {
      response = await pimcore.get('object', 1456);
      expect(response.request.url).toBe('https://fake-pimcore.org/webservice/rest/object/id/1456?apikey=fakekey');
    });

    it('should include inheritance in url if resource is object and it is included in the parameters', async () => {
      response = await pimcore.get('asset', 1456, { inheritance: 1 });
      expect(response.request.url).toBe('https://fake-pimcore.org/webservice/rest/asset/id/1456?apikey=fakekey');

      response = await pimcore.get('object', 1456, { inheritance: 1 });
      expect(response.request.url).toBe('https://fake-pimcore.org/webservice/rest/object/id/1456?apikey=fakekey&inheritance=1');
    });

    it('should include light in url if resource is asset and it is included in the parameters', async () => {
      response = await pimcore.get('object', 1456, { light: 1 });
      expect(response.request.url).toBe('https://fake-pimcore.org/webservice/rest/object/id/1456?apikey=fakekey');

      response = await pimcore.get('asset', 1456, { light: 1 });
      expect(response.request.url).toBe('https://fake-pimcore.org/webservice/rest/asset/id/1456?apikey=fakekey&light=1');
    });

    it('should return callback function response if provided as parameter', async () => {
      response = await pimcore.get('asset', 1456, { light: 1 }, callbackFunction);
      expect(response.callbackMade).toBe(true);
      expect(response.response.request.url).toBe('https://fake-pimcore.org/webservice/rest/asset/id/1456?apikey=fakekey&light=1');
    });
  });

  describe('create', () => {
    it('should make a post request to Pimcore based on given params', async () => {
      response = await pimcore.create('object', {
        parentId: 1,
        type: 'folder',
      });

      const requestParams = JSON.parse(response.request.data);
      expect(response.request.url).toBe('https://fake-pimcore.org/webservice/rest/object?apikey=fakekey');
      expect(response.request.method).toBe('post');
      expect(requestParams.parentId).toBe(1);
      expect(requestParams.type).toBe('folder');
    });

    it('should return callback function response if provided as parameter', async () => {
      response = await pimcore.create('object', {
        parentId: 1,
        type: 'folder',
      }, callbackFunction);
      expect(response.callbackMade).toBe(true);
      expect(response.response.request.url).toBe('https://fake-pimcore.org/webservice/rest/object?apikey=fakekey');
    });
  });

  describe('update', () => {
    it('should make a call for object data prior to making put call to Pimcore', async () => {
      response = await pimcore.update('object', {
        id: 45,
        type: 'class',
      });

      expect(callCounter).toBe(2);
      expect(response.success).toBe(true);
      expect(response.request.url).toBe('https://fake-pimcore.org/webservice/rest/object?apikey=fakekey');
      expect(response.request.method).toBe('put');
    });

    it('should return error message if no id is provided or if only id is provided', async () => {
      response = await pimcore.update('object', {
        type: 'class',
      });
      expect(response.success).toBe(undefined);
      expect(response).toBe('No id provided');

      response = await pimcore.update('object', {
        id: 1455,
      });
      expect(response.success).toBe(undefined);
      expect(response).toBe('Nothing to update');
    });


    it('should return callback function response if provided as parameter', async () => {
      response = await pimcore.update('object', {
        id: 45,
        type: 'class',
      }, callbackFunction);
      expect(response.callbackMade).toBe(true);
      expect(response.response.request.url).toBe('https://fake-pimcore.org/webservice/rest/object?apikey=fakekey');
    });
  });

  describe('remove', () => {
    it('should make a delete call to Pimcore', async () => {
      response = await pimcore.remove('object', 45);

      expect(response.success).toBe(true);
      expect(response.request.url).toBe('https://fake-pimcore.org/webservice/rest/object/id/45?apikey=fakekey');
      expect(response.request.method).toBe('delete');
    });

    it('should return callback function response if provided as parameter', async () => {
      response = await pimcore.remove('object', 45, callbackFunction);

      expect(response.callbackMade).toBe(true);
      expect(response.response.request.url).toBe('https://fake-pimcore.org/webservice/rest/object/id/45?apikey=fakekey');
    });
  });

  describe('exists', () => {
    it('should make a get call to Pimcore to the correct Pimcore enpoint with the required data', async () => {
      response = await pimcore.exists('object', [1256, 1257, 1258]);

      expect(response.success).toBe(true);
      expect(response.request.url).toBe('https://fake-pimcore.org/webservice/rest/object-inquire?apikey=fakekey&ids=1256,1257,1258&condense=0');
      expect(response.request.method).toBe('get');
    });

    it('should return callback function response if provided as parameter', async () => {
      response = await pimcore.exists('object', [1256, 1257, 1258], 0, callbackFunction);

      expect(response.callbackMade).toBe(true);
      expect(response.response.request.url).toBe('https://fake-pimcore.org/webservice/rest/object-inquire?apikey=fakekey&ids=1256,1257,1258&condense=0');
    });
  });


  describe('search', () => {
    it('should make a get call to Pimcore to the correct Pimcore enpoint with the required data', async () => {
      response = await pimcore.search('object', {
        limit: 45,
        offset: 97,
      });

      expect(response.success).toBe(true);
      expect(response.request.url).toBe('https://fake-pimcore.org/webservice/rest/object-list?apikey=fakekey&limit=45&offset=97');
      expect(response.request.method).toBe('get');
    });

    it('should return callback function response if provided as parameter', async () => {
      response = await pimcore.search('object', {
        limit: 45,
        offset: 97,
      }, 'list', callbackFunction);

      expect(response.callbackMade).toBe(true);
      expect(response.response.request.url).toBe('https://fake-pimcore.org/webservice/rest/object-list?apikey=fakekey&limit=45&offset=97');
    });
  });


  describe('shallowCopy', () => {
    beforeEach(() => {
      mock.onGet().reply(config => returnData(config, copyReturnData));

      mock.onPost().reply(config => returnData(config, {
        success: true,
        id: 123456,
      }, true));
    });

    it('should return id of new object created along with copy of original item', async () => {
      response = await pimcore.shallowCopy('object', {
        id: 45,
        parentId: 1068,
      });

      expect(response.success).toBe(true);
      expect(response.id).toBe(123456);
      expect(response.original.id).toBe(45);
      expect(response.original.parentId).toBe(987);
      expect(response.original.childs.length).toBe(2);
    });

    it('should return copy if preview or addChildre param is provided', async () => {
      response = await pimcore.shallowCopy('object', {
        id: 45,
        parentId: 1068,
        preview: true,
      });

      expect(response.success).toBe(true);
      expect(response.copy.id).toBe(undefined);
      expect(response.copy.parentId).toBe(1068);
      expect(response.copy.childs.length).toBe(2);

      response = await pimcore.shallowCopy('object', {
        id: 45,
        parentId: 1068,
        preview: true,
      });
    });


    it('should return error if not provided with id or parentId param', async () => {
      response = await pimcore.shallowCopy('object', {
        id: 45,
      });

      expect(response.error).toBe(true);

      response = await pimcore.shallowCopy('object', {
        parentId: 45,
      });

      expect(response.error).toBe(true);
    });
  });

  describe('copy', () => {
    beforeEach(() => {
      mock.onGet().reply(config => returnData(config, copyReturnData));

      mock.onPost().reply(config => returnData(config, {
        success: true,
        id: 123456,
      }, true));
    });

    it('should call return success/error keys if called and correct parentId', async () => {
      response = await pimcore.copy('object', {
        id: 45,
        parentId: 1068,
      });

      expect(response.success).toBe(true);
      expect(response.id).toBe(123456);
      expect(response.original.id).toBe(45);

      response = await pimcore.copy('object', {
        id: 45,
        parentId: 1068,
        children: true,
      });

      expect(response.success_total).toBe(2);
      expect(response.errors_total).toBe(0);
      expect(response.id).toBe(123456); // Should be generated id

      response = await pimcore.copy('object', {
        id: 45,
        parentId: 1068,
        addChildren: true,
      });

      expect(response.success_total).toBe(2);
      expect(response.errors_total).toBe(0);
      expect(response.id).toBe(1068); // Should be id in param given
    });

    it('should return callback function result if callback provided', async () => {
      function callFunc(resp) {
        const returnValue = resp;
        returnValue.id = resp.id * 2;

        return returnValue;
      }
      response = await pimcore.copy('object', {
        id: 45,
        parentId: 1068,
      }, callFunc);
      expect(response.id).toBe(246912);

      response = await pimcore.copy('object', {
        id: 45,
        parentId: 1068,
        children: true,
      }, callFunc);
      expect(response.id).toBe(246912); // Should be generated id

      response = await pimcore.copy('object', {
        id: 45,
        parentId: 1068,
        addChildren: true,
      }, callFunc);
      expect(response.id).toBe(2136); // Should be id in param given
    });

    it('should return error if not provided with id or parentId param', async () => {
      response = await pimcore.copy('object', {
        id: 45,
      });

      expect(response.error).toBe(true);

      response = await pimcore.copy('object', {
        parentId: 45,
      });

      expect(response.error).toBe(true);
    });
  });
});
