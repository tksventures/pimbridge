import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import Pimbridge from '../../src/pimbridge';

let mock;
let pimcore;
let response;


function returnData(rType, data) {
  return ({
    data,
    success: true,
    msg: `${rType} request was made`,
  });
}

describe('Pimbridge', () => {
  beforeEach(() => {
    // We set mock env variables for the module
    response = '';
    // We create our pimcore adapter
    process.env.PIMCORE_URL = 'https://fake-pimcore.org';
    process.env.PIMCORE_API_KEY = 'fakekey';
    pimcore = Pimbridge();
    mock = new MockAdapter(axios);

    mock.onGet('/test').reply(200, returnData('GET'));
    mock.onPost('/test').reply(200, returnData('POST'));
    mock.onPut('/test').reply(200, returnData('PUT'));
    mock.onDelete('/test').reply(200, returnData('DELETE'));
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

  describe('connect', () => {
    it('should return make call to axios based on method, url and data given', async () => {
      response = await pimcore.connect('get', '/test');
      expect(response.msg).toBe('GET request was made');

      response = await pimcore.connect('post', '/test');
      expect(response.msg).toBe('POST request was made');

      response = await pimcore.connect('put', '/test');
      expect(response.msg).toBe('PUT request was made');

      response = await pimcore.connect('delete', '/test');
      expect(response.msg).toBe('DELETE request was made');
    });
  });
});
